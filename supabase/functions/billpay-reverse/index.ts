import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * BillPay Reverse/Refund Edge Function
 * Paynow BillPay Vendor API v1.33
 *
 * POST /api/payment/reverse
 * Only a limited set of billers support reversals.
 *
 * Error codes: 0=success, 1=not found, 2=duplicate ref,
 *              3=biller failed, 4=not supported, 5=already refunded, 99=general
 */

import { getCorsHeaders } from "../_shared/cors.ts";

let _currentReq: Request | null = null;

function json(data: Record<string, unknown>, status = 200) {
  const cors = _currentReq ? getCorsHeaders(_currentReq) : {};
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

const BILLPAY_API_BASE = (Deno.env.get("BILLPAY_API_BASE_URL") ?? "https://billpay.paynow.co.zw").replace(/\/$/, "");
const REVERSE_URL = `${BILLPAY_API_BASE}/api/payment/reverse`;
const API_TIMEOUT_MS = 60_000;

const REVERSAL_ERRORS: Record<number, string> = {
  0: "Reversal was successful",
  1: "Original payment not found",
  2: "Duplicate vendor reversal reference",
  3: "Biller failed to reverse payment",
  4: "Biller does not support reversals",
  5: "Original payment is already refunded",
  99: "General error",
};

Deno.serve(async (req) => {
  _currentReq = req;
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
    const { reference, reason } = body || {};

    if (!reference) return json({ error: "reference is required" }, 400);

    // Authenticate user
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Not authenticated" }, 401);

    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Look up original payment
    const { data: payment, error: lookupError } = await svc
      .from("bill_payments")
      .select("*")
      .eq("reference", reference)
      .eq("user_id", user.id)
      .single();

    if (lookupError || !payment) {
      return json({ error: "Payment not found" }, 404);
    }

    // Only allow reversal of paid or flagged payments
    if (!["paid", "flagged"].includes(payment.status)) {
      return json({
        error: `Cannot reverse a payment with status '${payment.status}'. Only 'paid' or 'flagged' payments can be reversed.`,
      }, 400);
    }

    const billpayUser = Deno.env.get("BILLPAY_USERNAME");
    const billpayPass = Deno.env.get("BILLPAY_PASSWORD");

    // Generate unique reversal reference
    const reversalRef = `ZL-REV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    // ── Simulation mode ──
    if (!billpayUser || !billpayPass) {
      await svc.from("bill_payments").update({
        status: "reversed",
        narration: reason || "Simulated reversal",
      }).eq("reference", reference);

      return json({
        status: "ok",
        simulation: true,
        action: "reverse",
        originalReference: reference,
        reversalReference: reversalRef,
        errorCode: 0,
        message: "Simulated: Reversal successful",
      });
    }

    // ── LIVE REVERSAL ──
    const basicAuth = btoa(`${billpayUser}:${billpayPass}`);
    const apiRequest = {
      OriginalReference: reference,
      Reference: reversalRef,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    let apiRes;
    try {
      apiRes = await fetch(REVERSE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${basicAuth}`,
        },
        body: JSON.stringify(apiRequest),
        signal: controller.signal,
      });
    } catch {
      clearTimeout(timeout);
      return json({
        status: "error",
        action: "reverse",
        error: "Network error during reversal request",
      }, 500);
    } finally {
      clearTimeout(timeout);
    }

    const apiData = await apiRes.json();

    if (apiData.ErrorCode === 0) {
      // Reversal successful
      await svc.from("bill_payments").update({
        status: "reversed",
        narration: reason || "Payment reversed",
      }).eq("reference", reference);

      // Notification
      await svc.from("notifications").insert({
        user_id: user.id,
        type: "payment",
        title: "Bill Payment Reversed",
        message: `US$${payment.amount} payment to ${payment.biller_code} for account ${payment.account_number} has been reversed.`,
        priority: "high",
      });

      return json({
        status: "ok",
        action: "reverse",
        originalReference: reference,
        reversalReference: reversalRef,
        errorCode: 0,
        billpayReference: apiData.BillpayReference,
        billerReference: apiData.BillerReference,
        message: "Payment reversed successfully",
      });
    }

    // Reversal failed — return specific error
    const errorMessage = REVERSAL_ERRORS[apiData.ErrorCode] || apiData.Narration || "Reversal failed";
    console.error("BillPay reversal failed:", apiData.TechnicalNarration || errorMessage);

    return json({
      status: "error",
      action: "reverse",
      originalReference: reference,
      reversalReference: reversalRef,
      errorCode: apiData.ErrorCode,
      error: errorMessage,
    }, 400);

  } catch (err) {
    console.error("BillPay Reverse error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
