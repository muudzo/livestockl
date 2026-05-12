// billpay-biller-pay
// ------------------
// BillPay biller PAY endpoint. Paynow calls this to settle an auction
// reference once the buyer has paid via BillPay.
//
// Request:
//   POST /functions/v1/billpay-biller-pay
//   Authorization: Basic <BILLPAY_BILLER_USERNAME:BILLPAY_BILLER_PASSWORD>
//   {
//     "member":          "AUCT-XYZ-001",
//     "amount":          1150.00,
//     "currency":        "USD",
//     "paynowReference": "PNW-9381"
//   }
//
// Idempotency: anchored on paynowReference. A retry with the same
// paynowReference returns byte-identical output to the first successful
// response. Enforced at two layers — the application short-circuit below,
// AND the partial unique index on payments.paynow_reference WHERE
// method='BillPay' (migration 20260508060000_billpay_biller_inbound.sql).
//
// Response shapes:
//   200 Paid:        { status, reference, billerReference, amountPaid, currency }
//   400 Failed:      { status, error, ... }      ← missing field, bad currency, amount mismatch
//   404 NonExistent: { status, error }
//   409 AlreadyPaid: { status, error }            ← settled by a different Paynow reference
//   401 Unauthorized
//
// Currency: only "USD" is accepted. Anything else returns 400 with a clear
// message rather than silently coercing.

import {
  getServiceClient,
  jsonResponse,
  logInbound,
  requireBillerAuth,
} from "../_shared/billpay.ts";

const SUPPORTED_CURRENCIES = new Set(["USD"]);

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ status: "Failed", error: "Method not allowed" }, 405);
  }

  const supabase = getServiceClient();

  const guard = await requireBillerAuth(req, supabase);
  if (!guard.ok) return guard.response;
  const remoteIp = guard.ip;

  // Parse body
  let body: Record<string, unknown> = {};
  try {
    const text = await req.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    const resp = { status: "Failed", error: "Malformed JSON body" };
    await logInbound(supabase, {
      action: "pay",
      request: { url: req.url },
      response: resp,
      statusCode: 400,
      remoteIp,
    });
    return jsonResponse(resp, 400);
  }

  const member = String(body.member || "");
  const amount = Number(body.amount || 0);
  const currencyRaw = (body.currency != null ? String(body.currency) : "USD").toUpperCase();
  const paynowRef = String(body.paynowReference || body.paynow_reference || "");

  // Required fields
  if (!member || !amount || !paynowRef) {
    const resp = {
      status: "Failed",
      error: "Missing required field(s): member, amount, paynowReference",
    };
    await logInbound(supabase, {
      action: "pay",
      member: member || null,
      paynowReference: paynowRef || null,
      request: body,
      response: resp,
      statusCode: 400,
      remoteIp,
    });
    return jsonResponse(resp, 400);
  }

  // Currency validation — only USD is supported. Reject anything else
  // explicitly rather than silently coercing.
  if (!SUPPORTED_CURRENCIES.has(currencyRaw)) {
    const resp = {
      status: "Failed",
      error: `Unsupported currency: ${currencyRaw}. Only USD is accepted.`,
      supported: Array.from(SUPPORTED_CURRENCIES),
    };
    await logInbound(supabase, {
      action: "pay",
      member,
      paynowReference: paynowRef,
      request: body,
      response: resp,
      statusCode: 400,
      remoteIp,
    });
    return jsonResponse(resp, 400);
  }

  // Look up the existing payment row
  const { data: existing } = await supabase
    .from("payments")
    .select("reference, amount, status, paynow_reference, livestock_id")
    .eq("reference", member)
    .maybeSingle();

  if (!existing) {
    const resp = { status: "NonExistent", error: "Reference not found" };
    await logInbound(supabase, {
      action: "pay",
      member,
      paynowReference: paynowRef,
      request: body,
      response: resp,
      statusCode: 404,
      remoteIp,
    });
    return jsonResponse(resp, 404);
  }

  // Idempotent retry — same paynowReference re-hit returns the original
  // response (byte-identical when callers compare).
  if (existing.status === "paid" && existing.paynow_reference === paynowRef) {
    const resp = {
      status: "Paid",
      reference: existing.reference,
      billerReference: existing.paynow_reference,
      amountPaid: Number(existing.amount),
      currency: "USD",
    };
    await logInbound(supabase, {
      action: "pay",
      member,
      paynowReference: paynowRef,
      request: body,
      response: resp,
      statusCode: 200,
      remoteIp,
    });
    return jsonResponse(resp, 200);
  }

  // Already settled by a *different* Paynow reference — conflict, not idempotent.
  if (existing.status === "paid" && existing.paynow_reference !== paynowRef) {
    const resp = {
      status: "AlreadyPaid",
      error: "Reference already settled by a different transaction",
    };
    await logInbound(supabase, {
      action: "pay",
      member,
      paynowReference: paynowRef,
      request: body,
      response: resp,
      statusCode: 409,
      remoteIp,
    });
    return jsonResponse(resp, 409);
  }

  // Amount sanity check — 1 cent tolerance for rounding drift between rails.
  if (Math.abs(Number(existing.amount) - amount) > 0.01) {
    const resp = {
      status: "Failed",
      error: "Amount mismatch",
      expected: Number(existing.amount),
      got: amount,
    };
    await logInbound(supabase, {
      action: "pay",
      member,
      paynowReference: paynowRef,
      request: body,
      response: resp,
      statusCode: 400,
      remoteIp,
    });
    return jsonResponse(resp, 400);
  }

  // Atomic settle. The .eq('status','pending').is('paynow_reference', null)
  // clause makes this a check-then-act in one round-trip — only the first
  // concurrent request wins; the rest fall through to the re-read branch.
  const { data: updated, error: updateErr } = await supabase
    .from("payments")
    .update({
      status: "paid",
      method: "BillPay",
      paynow_reference: paynowRef,
      updated_at: new Date().toISOString(),
    })
    .eq("reference", member)
    .eq("status", "pending")
    .is("paynow_reference", null)
    .select("reference, amount, paynow_reference")
    .maybeSingle();

  if (updateErr || !updated) {
    // Race: another transaction grabbed the row first. Re-read and respond
    // idempotently if it was the same paynowReference (which it should be
    // for a legitimate retry).
    const { data: reread } = await supabase
      .from("payments")
      .select("reference, status, paynow_reference, amount")
      .eq("reference", member)
      .maybeSingle();
    if (reread?.status === "paid" && reread.paynow_reference === paynowRef) {
      const resp = {
        status: "Paid",
        reference: reread.reference,
        billerReference: reread.paynow_reference,
        amountPaid: Number(reread.amount),
        currency: "USD",
      };
      await logInbound(supabase, {
        action: "pay",
        member,
        paynowReference: paynowRef,
        request: body,
        response: resp,
        statusCode: 200,
        remoteIp,
      });
      return jsonResponse(resp, 200);
    }
    const resp = { status: "Failed", error: "Settlement race — payment in unexpected state" };
    await logInbound(supabase, {
      action: "pay",
      member,
      paynowReference: paynowRef,
      request: body,
      response: resp,
      statusCode: 409,
      remoteIp,
    });
    return jsonResponse(resp, 409);
  }

  // Mark the auction sold (best-effort; SMS / end-of-auction notifications
  // live in end-auctions, not here).
  await supabase
    .from("livestock_items")
    .update({ status: "sold" })
    .eq("id", existing.livestock_id);

  const resp = {
    status: "Paid",
    reference: updated.reference,
    billerReference: updated.paynow_reference,
    amountPaid: Number(updated.amount),
    currency: "USD",
  };
  await logInbound(supabase, {
    action: "pay",
    member,
    paynowReference: paynowRef,
    request: body,
    response: resp,
    statusCode: 200,
    remoteIp,
  });
  return jsonResponse(resp, 200);
});
