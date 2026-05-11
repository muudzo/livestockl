import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import { createLogger } from "../_shared/logger.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

/**
 * Marks a payment as paid, updates listing to sold, and notifies both parties.
 */
async function completePayment(reference: string, providerRef: string, log: import("../_shared/logger.ts").Logger) {
  const { data: updated, error } = await supabase
    .from("payments")
    .update({
      status: "paid",
      paynow_reference: providerRef,
      updated_at: new Date().toISOString(),
    })
    .eq("reference", reference)
    .eq("status", "pending")
    .select("livestock_id, user_id, amount, tenant_id")
    .maybeSingle();

  if (error) {
    log.error("Failed to update payment", { reference, providerRef, error: error.message });
    return;
  }
  if (!updated) {
    log.info("Payment already processed (idempotent skip)", { reference });
    return;
  }

  log.info("Payment marked as paid", { reference, providerRef, amount: updated.amount, userId: updated.user_id });

  // Mark item as sold + notify buyer + get seller info — all in parallel
  const [, , sellerResult] = await Promise.all([
    updated.livestock_id
      ? supabase.from("livestock_items").update({ status: "sold" }).eq("id", updated.livestock_id)
      : Promise.resolve(),
    supabase.from("notifications").insert({
      user_id: updated.user_id,
      tenant_id: updated.tenant_id,
      type: "payment",
      title: "Payment Confirmed",
      message: `Your payment of US$${updated.amount} has been confirmed.`,
      priority: "high",
    }),
    updated.livestock_id
      ? supabase.from("livestock_items").select("seller_id, title").eq("id", updated.livestock_id).single()
      : Promise.resolve({ data: null }),
  ]);

  // Notify seller
  const item = sellerResult?.data;
  if (item) {
    await supabase.from("notifications").insert({
      user_id: item.seller_id,
      tenant_id: updated.tenant_id,
      type: "payment",
      title: "Payment Received",
      message: `Payment of US$${updated.amount} received for ${item.title}.`,
      priority: "high",
    });
  }
}

/**
 * Marks a payment as failed.
 */
async function failPayment(reference: string, log: import("../_shared/logger.ts").Logger) {
  log.warn("Payment marked as failed", { reference });
  await supabase
    .from("payments")
    .update({ status: "failed", updated_at: new Date().toISOString() })
    .eq("reference", reference)
    .eq("status", "pending");
}

/**
 * Parse Paynow URL-encoded callback body.
 * Paynow sends: reference=ZL-xxx&paynowreference=12345&amount=1200.00&status=Paid&...&hash=ABC123
 */
function parsePaynowBody(body: string): Record<string, string> {
  const params: Record<string, string> = {};
  for (const pair of body.split("&")) {
    const [key, ...rest] = pair.split("=");
    params[decodeURIComponent(key)] = decodeURIComponent(rest.join("="));
  }
  return params;
}

/**
 * Verify Paynow hash: concatenate all values except hash + integration key → SHA-512.
 */
async function verifyPaynowHash(params: Record<string, string>, integrationKey: string): Promise<boolean> {
  const receivedHash = params.hash;
  if (!receivedHash) return false;

  // Build hash string from all values except 'hash' in received order
  const values = Object.entries(params)
    .filter(([key]) => key.toLowerCase() !== "hash")
    .map(([, val]) => val);
  const hashString = values.join("") + integrationKey;

  const data = new TextEncoder().encode(hashString);
  const hashBuffer = await crypto.subtle.digest("SHA-512", data);
  const computed = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();

  return computed === receivedHash.toUpperCase();
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const log = createLogger('payment-webhook', req);

  try {
    const contentType = req.headers.get("content-type") || "";
    const body = await req.text();

    // ─── PAYNOW CALLBACK ───
    // Paynow sends application/x-www-form-urlencoded with status updates
    if (contentType.includes("x-www-form-urlencoded") || (!contentType.includes("json") && body.includes("paynowreference"))) {
      const params = parsePaynowBody(body);
      log.info("Paynow callback received", { reference: params.reference, status: params.status, provider: "paynow" });

      const integrationKey = Deno.env.get("PAYNOW_INTEGRATION_KEY");
      if (!integrationKey) {
        log.error("PAYNOW_INTEGRATION_KEY not configured — refusing to process unverified webhook");
        return new Response("Webhook verification not configured", { status: 500 });
      }

      const valid = await verifyPaynowHash(params, integrationKey);
      if (!valid) {
        log.error("Paynow hash verification failed", { reference: params.reference });
        return new Response("Invalid hash", { status: 403 });
      }

      const reference = params.reference;
      const paynowRef = params.paynowreference || "";
      const status = (params.status || "").toLowerCase();

      if (!reference) {
        log.warn("Paynow callback missing reference");
        return new Response("Missing reference", { status: 400 });
      }

      // Terminal-success per Paynow spec: Paid, AwaitingDelivery, Delivered.
      // AwaitingDelivery means funds settled to merchant wallet — buyer paid, no
      // further user action. For digital/auction goods we treat it as paid.
      if (status === "paid" || status === "awaiting delivery" || status === "delivered") {
        await completePayment(reference, paynowRef, log);
      } else if (status === "cancelled" || status === "failed" || status === "disputed") {
        await failPayment(reference, log);
      } else {
        log.info("Paynow callback non-terminal status, no action", { reference, status });
      }
      // "sent", "created" — no action, still pending

      return new Response("OK", { status: 200 });
    }

    // ─── STRIPE WEBHOOK ───
    // Stripe sends application/json with signature header
    const signature = req.headers.get("stripe-signature");
    if (signature) {
      const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
      if (!endpointSecret) {
        log.error("STRIPE_WEBHOOK_SECRET not configured");
        return new Response("Webhook secret not configured", { status: 500 });
      }

      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
        apiVersion: "2024-12-18.acacia",
      });

      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
      } catch (err) {
        log.error("Stripe signature verification failed", { error: (err as Error).message });
        return new Response("Invalid signature", { status: 403 });
      }

      log.info("Stripe webhook event received", { eventType: event.type, provider: "stripe" });

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const reference = session.metadata?.reference;
        if (reference) {
          await completePayment(reference, session.id, log);
        }
      }

      if (event.type === "checkout.session.expired") {
        const session = event.data.object as Stripe.Checkout.Session;
        const reference = session.metadata?.reference;
        if (reference) {
          await failPayment(reference, log);
        }
      }

      return new Response("OK", { status: 200 });
    }

    // Unknown callback format
    log.error("Unknown webhook format", { contentType });
    return new Response("Unknown webhook format", { status: 400 });
  } catch (err) {
    log.error("Webhook error", { error: (err as Error).message });
    return new Response("Internal error", { status: 500 });
  }
});
