import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simulated Paynow payment behavior
// Models real-world Zimbabwe payment failure rates and latency
function simulatePaynowPayment(method: string, attempt: number): {
  success: boolean;
  delay: number;
  error: string | null;
  reference: string | null;
} {
  const ref = `PN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  // Real-world failure rates for Zimbabwe payments
  // EcoCash: ~70% first-attempt success (USSD timeouts, network issues)
  // OneMoney: ~60% (smaller network, more timeouts)
  // Card: ~80% (when Paynow is reachable)
  const successRates: Record<string, number> = {
    ecocash: 0.70,
    onemoney: 0.60,
    card: 0.80,
  };

  // Retry improves success rate (user's phone is ready, network stabilized)
  const retryBoost = Math.min(attempt * 0.10, 0.20);
  const rate = (successRates[method] || 0.65) + retryBoost;

  const success = Math.random() < rate;

  // Simulate realistic delays
  const delays: Record<string, number> = {
    ecocash: 3000 + Math.random() * 5000,   // 3-8s (USSD prompt + user action)
    onemoney: 4000 + Math.random() * 6000,  // 4-10s (slower network)
    card: 2000 + Math.random() * 3000,       // 2-5s (redirect flow)
  };

  const errors = {
    ecocash: [
      "USSD prompt timed out — subscriber did not respond",
      "Insufficient balance in EcoCash wallet",
      "Network timeout — mobile money service unreachable",
      "Transaction declined — daily limit exceeded",
    ],
    onemoney: [
      "OneMoney service temporarily unavailable",
      "Subscriber not registered for OneMoney",
      "Network timeout — USSD gateway unresponsive",
    ],
    card: [
      "Card declined — insufficient funds",
      "3D Secure verification failed",
      "Connection reset by peer (Cloudflare)",
      "Payment gateway timeout",
    ],
  };

  const methodErrors = errors[method as keyof typeof errors] || errors.ecocash;

  return {
    success,
    delay: delays[method] || 4000,
    error: success ? null : methodErrors[Math.floor(Math.random() * methodErrors.length)],
    reference: success ? ref : null,
  };
}

// Fallback order: EcoCash → OneMoney → Card
const FALLBACK_CHAIN = ["ecocash", "onemoney", "card"];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("authorization");
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const log = createLogger('payment-orchestrator', req);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, paymentOrderId, agentId, livestockId, amount } = await req.json();
    log.info("Orchestrator action received", { action, paymentOrderId, agentId, livestockId, amount });

    if (action === "initiate_payment") {
      // Create a payment order from an auction win
      if (!agentId || !livestockId || !amount) {
        return new Response(JSON.stringify({ error: "Missing agentId, livestockId, or amount" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get agent
      const { data: agent } = await supabase
        .from("agents")
        .select("*")
        .eq("id", agentId)
        .single();

      if (!agent) {
        return new Response(JSON.stringify({ error: "Agent not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Resolve the phone for EcoCash Express. Agent config overrides the
      // owner's profile phone so operators can demo with a burner number
      // without touching their main account.
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone")
        .eq("id", agent.user_id)
        .single();

      const payerPhone: string | null = agent.config?.payment_phone || profile?.phone || null;

      // Create the payment order
      const { data: order, error: orderError } = await supabase
        .from("agent_payment_orders")
        .insert({
          agent_id: agentId,
          livestock_id: livestockId,
          user_id: agent.user_id,
          amount,
          method: "ecocash", // start with EcoCash
          status: "pending",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      log.info("Payment order created", { paymentOrderId: order.id, agentId, livestockId, amount, method: "ecocash", payerPhone });

      // Log to settlement ledger
      await supabase.from("settlement_ledger").insert({
        payment_order_id: order.id,
        event: "order_created",
        details: { agent_id: agentId, livestock_id: livestockId, amount, payer_phone: payerPhone },
      });

      // Log agent activity
      const expressCheckoutMsg = payerPhone
        ? `EcoCash Express checkout initiated for US$${amount} on ${payerPhone}`
        : `Payment order created for US$${amount} — starting with EcoCash (no phone on file)`;
      await supabase.from("agent_activity_log").insert({
        agent_id: agentId,
        event_type: "payment_initiated",
        message: expressCheckoutMsg,
        metadata: { payment_order_id: order.id, amount, method: "ecocash", payer_phone: payerPhone },
      });

      // Now execute the payment (with retries and fallback)
      return await executePayment(supabase, order, agent, log, payerPhone);
    }

    if (action === "retry_payment") {
      if (!paymentOrderId) {
        return new Response(JSON.stringify({ error: "Missing paymentOrderId" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: order } = await supabase
        .from("agent_payment_orders")
        .select("*")
        .eq("id", paymentOrderId)
        .in("status", ["failed", "retrying"])
        .single();

      if (!order) {
        return new Response(JSON.stringify({ error: "Payment order not found or not retryable" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: agent } = await supabase
        .from("agents")
        .select("*")
        .eq("id", order.agent_id)
        .single();

      const { data: profile } = await supabase
        .from("profiles")
        .select("phone")
        .eq("id", agent.user_id)
        .single();
      const payerPhone: string | null = agent.config?.payment_phone || profile?.phone || null;

      log.info("Retrying payment order", { paymentOrderId, agentId: order.agent_id, payerPhone });
      return await executePayment(supabase, order, agent, log, payerPhone);
    }

    // Get payment status and ledger for an order
    if (action === "get_status") {
      const { data: order } = await supabase
        .from("agent_payment_orders")
        .select("*")
        .eq("id", paymentOrderId)
        .single();

      const { data: ledger } = await supabase
        .from("settlement_ledger")
        .select("*")
        .eq("payment_order_id", paymentOrderId)
        .order("created_at", { ascending: true });

      return new Response(JSON.stringify({ order, ledger }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    log.error("Orchestrator error", { error: err.message, stack: err.stack });
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function executePayment(supabase: any, order: any, agent: any, log: import("../_shared/logger.ts").Logger, payerPhone: string | null = null) {
  let currentMethod = order.method;
  let attempt = order.attempt_count;
  let lastError: string | null = null;
  let paid = false;
  let paynowRef: string | null = null;
  const maxAttempts = order.max_attempts;

  // Try current method, then fallback chain
  const methodsToTry = FALLBACK_CHAIN.slice(FALLBACK_CHAIN.indexOf(currentMethod));
  log.info("Executing payment", { paymentOrderId: order.id, startMethod: currentMethod, methodsToTry, maxAttempts });

  for (const method of methodsToTry) {
    if (paid) break;

    // Update to current method
    await supabase
      .from("agent_payment_orders")
      .update({ method, status: "processing" })
      .eq("id", order.id);

    if (method !== currentMethod) {
      log.warn("Falling back to next payment method", { paymentOrderId: order.id, from: currentMethod, to: method, reason: lastError });

      await supabase.from("settlement_ledger").insert({
        payment_order_id: order.id,
        event: "fallback_method",
        method,
        details: { previous_method: currentMethod, reason: lastError },
      });

      await supabase.from("agent_activity_log").insert({
        agent_id: order.agent_id,
        event_type: "payment_initiated",
        message: `Falling back to ${method.toUpperCase()} after ${currentMethod} failed: ${lastError}`,
        metadata: { payment_order_id: order.id, method, previous_error: lastError },
      });
    }

    // Attempt payment (up to max retries per method)
    const attemptsForMethod = method === currentMethod ? maxAttempts - attempt : 2;

    for (let i = 0; i < attemptsForMethod; i++) {
      attempt++;

      await supabase.from("settlement_ledger").insert({
        payment_order_id: order.id,
        event: i === 0 && method === currentMethod ? "payment_initiated" : "retry_attempted",
        method,
        attempt_number: attempt,
        details: { amount: order.amount },
      });

      log.info("Payment attempt starting", { paymentOrderId: order.id, method, attempt, amount: order.amount });

      // Simulate the payment call
      const result = simulatePaynowPayment(method, attempt);

      // Simulate network delay (capped for Edge Function timeout)
      await new Promise(resolve => setTimeout(resolve, Math.min(result.delay, 2000)));

      if (result.success) {
        paid = true;
        paynowRef = result.reference;
        log.info("Payment attempt succeeded", { paymentOrderId: order.id, method, attempt, reference: paynowRef, amount: order.amount });

        // Update order
        await supabase
          .from("agent_payment_orders")
          .update({
            status: "paid",
            paynow_reference: paynowRef,
            attempt_count: attempt,
            paid_at: new Date().toISOString(),
          })
          .eq("id", order.id);

        // Settlement ledger
        await supabase.from("settlement_ledger").insert({
          payment_order_id: order.id,
          event: "payment_succeeded",
          method,
          attempt_number: attempt,
          details: { reference: paynowRef, amount: order.amount },
        });

        await supabase.from("settlement_ledger").insert({
          payment_order_id: order.id,
          event: "settlement_complete",
          method,
          details: { reference: paynowRef, total_attempts: attempt },
        });

        // Mark livestock as sold
        await supabase
          .from("livestock_items")
          .update({ status: "sold" })
          .eq("id", order.livestock_id);

        // Update agent stats
        const currentStats = agent.stats || {};
        await supabase
          .from("agents")
          .update({
            stats: {
              ...currentStats,
              total_spent: (currentStats.total_spent || 0) + order.amount,
              total_actions: (currentStats.total_actions || 0) + 1,
              wins: (currentStats.wins || 0) + 1,
            },
          })
          .eq("id", order.agent_id);

        // Agent activity
        const phoneSuffix = payerPhone && method === "ecocash" ? ` → ${payerPhone}` : "";
        await supabase.from("agent_activity_log").insert({
          agent_id: order.agent_id,
          event_type: "payment_completed",
          message: `Payment of US$${order.amount} completed via ${method.toUpperCase()}${phoneSuffix} (attempt ${attempt}). Ref: ${paynowRef}`,
          metadata: { payment_order_id: order.id, reference: paynowRef, method, attempts: attempt, payer_phone: payerPhone },
        });

        break;
      } else {
        lastError = result.error;
        log.warn("Payment attempt failed", { paymentOrderId: order.id, method, attempt, error: result.error });

        await supabase.from("settlement_ledger").insert({
          payment_order_id: order.id,
          event: "payment_failed",
          method,
          attempt_number: attempt,
          details: { error: result.error },
        });

        // Schedule retry if not last attempt
        if (i < attemptsForMethod - 1) {
          await supabase.from("settlement_ledger").insert({
            payment_order_id: order.id,
            event: "retry_scheduled",
            method,
            details: { next_attempt: attempt + 1, delay_ms: 2000 },
          });

          await supabase
            .from("agent_payment_orders")
            .update({ status: "retrying", attempt_count: attempt, last_error: lastError })
            .eq("id", order.id);

          // Brief delay before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    currentMethod = method;
  }

  // If all methods exhausted
  if (!paid) {
    log.error("Payment failed after all methods exhausted", { paymentOrderId: order.id, totalAttempts: attempt, lastError, agentId: order.agent_id });

    await supabase
      .from("agent_payment_orders")
      .update({ status: "failed", attempt_count: attempt, last_error: lastError })
      .eq("id", order.id);

    await supabase.from("agent_activity_log").insert({
      agent_id: order.agent_id,
      event_type: "payment_failed",
      message: `Payment of US$${order.amount} failed after ${attempt} attempts across all methods. Last error: ${lastError}`,
      metadata: { payment_order_id: order.id, attempts: attempt, last_error: lastError },
    });
  }

  // Compute metrics
  const { data: allOrders } = await supabase
    .from("agent_payment_orders")
    .select("status, attempt_count")
    .eq("agent_id", order.agent_id);

  const total = allOrders?.length || 0;
  const paidCount = allOrders?.filter((o: any) => o.status === "paid").length || 0;
  const firstAttemptPaid = allOrders?.filter((o: any) => o.status === "paid" && o.attempt_count === 1).length || 0;
  const retryRecovered = paidCount - firstAttemptPaid;

  log.info("Payment orchestration complete", {
    paymentOrderId: order.id,
    status: paid ? "paid" : "failed",
    method: currentMethod,
    totalAttempts: attempt,
    metrics: { total, paidCount, firstAttemptPaid, retryRecovered },
  });

  return new Response(JSON.stringify({
    payment_order_id: order.id,
    status: paid ? "paid" : "failed",
    method: currentMethod,
    attempts: attempt,
    reference: paynowRef,
    error: paid ? null : lastError,
    metrics: {
      total_orders: total,
      paid: paidCount,
      failed: total - paidCount,
      first_attempt_success_rate: total > 0 ? `${Math.round((firstAttemptPaid / total) * 100)}%` : "N/A",
      with_retry_success_rate: total > 0 ? `${Math.round((paidCount / total) * 100)}%` : "N/A",
      retry_recovered: retryRecovered,
    },
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
