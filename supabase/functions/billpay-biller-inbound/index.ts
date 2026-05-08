// BillPay biller-inbound API — ZimLivestock acting AS a biller in Paynow's
// BillPay catalog. Paynow calls these endpoints when a buyer pays us via
// their BillPay menu (USSD, EcoCash app, etc.).
//
// Three actions:
//   GET  ?action=member&member=<auction_ref>           → member lookup
//   POST {action:'pay', member, amount, paynowReference} → settle
//   GET  ?action=status&reference=<our_ref>            → status poll
//
// Auth: HTTP Basic via BILLPAY_BILLER_USERNAME / BILLPAY_BILLER_PASSWORD.
//       Optional IP allowlist via BILLPAY_BILLER_ALLOWED_IPS (comma list).
//
// Idempotency: paynow_reference is the anchor. Retries with the same value
// are short-circuited to the original response. Unique partial index on
// payments.paynow_reference WHERE method='BillPay' enforces this at the DB.
//
// Public-error contract (per CLAUDE.md): no `stack` field, malformed JSON
// returns 400, never 500.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const USERNAME = Deno.env.get("BILLPAY_BILLER_USERNAME") || "";
const PASSWORD = Deno.env.get("BILLPAY_BILLER_PASSWORD") || "";
const ALLOWED_IPS = (Deno.env.get("BILLPAY_BILLER_ALLOWED_IPS") || "")
  .split(",").map((s) => s.trim()).filter(Boolean);

interface InboundLog {
  action: "member" | "pay" | "status" | "auth" | "unknown";
  member?: string | null;
  paynowReference?: string | null;
  request: unknown;
  response: unknown;
  statusCode: number;
  remoteIp: string | null;
}

function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

function checkBasicAuth(req: Request): boolean {
  if (!USERNAME || !PASSWORD) return false;
  const header = req.headers.get("Authorization") || "";
  if (!header.startsWith("Basic ")) return false;
  try {
    const decoded = atob(header.slice(6));
    const idx = decoded.indexOf(":");
    if (idx < 0) return false;
    return decoded.slice(0, idx) === USERNAME && decoded.slice(idx + 1) === PASSWORD;
  } catch {
    return false;
  }
}

function checkIp(req: Request): { ok: boolean; ip: string | null } {
  const fwd = req.headers.get("x-forwarded-for") || "";
  const ip = fwd.split(",")[0].trim() || null;
  if (ALLOWED_IPS.length === 0) return { ok: true, ip };
  return { ok: ip !== null && ALLOWED_IPS.includes(ip), ip };
}

async function logInbound(supabase: SupabaseClient, entry: InboundLog) {
  await supabase.from("billpay_inbound_log").insert({
    action: entry.action,
    member: entry.member ?? null,
    paynow_reference: entry.paynowReference ?? null,
    request_payload: entry.request,
    response_payload: entry.response,
    status_code: entry.statusCode,
    remote_ip: entry.remoteIp,
  });
}

Deno.serve(async (req) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { ok: ipOk, ip: remoteIp } = checkIp(req);
  const url = new URL(req.url);

  if (!checkBasicAuth(req) || !ipOk) {
    const resp = { status: "Failed", error: "Unauthorized" };
    await logInbound(supabase, {
      action: "auth", request: { url: req.url, ip: remoteIp }, response: resp,
      statusCode: 401, remoteIp,
    });
    return jsonResponse(resp, 401, { "WWW-Authenticate": 'Basic realm="ZimLivestock BillPay"' });
  }

  let body: Record<string, unknown> = {};
  if (req.method === "POST") {
    try {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    } catch {
      const resp = { status: "Failed", error: "Malformed JSON body" };
      await logInbound(supabase, {
        action: "unknown", request: { url: req.url }, response: resp,
        statusCode: 400, remoteIp,
      });
      return jsonResponse(resp, 400);
    }
  }

  const action = (url.searchParams.get("action") || (body.action as string) || "").toLowerCase();

  try {
    if (action === "member") {
      const member = url.searchParams.get("member") || (body.member as string) || "";
      return await handleMember(supabase, member, remoteIp);
    }
    if (action === "pay") {
      return await handlePay(supabase, body, remoteIp);
    }
    if (action === "status") {
      const reference = url.searchParams.get("reference") || (body.reference as string) || "";
      return await handleStatus(supabase, reference, remoteIp);
    }
    const resp = { status: "Failed", error: "Unknown action. Expected member|pay|status." };
    await logInbound(supabase, {
      action: "unknown", request: { url: req.url, body }, response: resp,
      statusCode: 400, remoteIp,
    });
    return jsonResponse(resp, 400);
  } catch (err) {
    const resp = { status: "Failed", error: "Internal" };
    await logInbound(supabase, {
      action: (action as InboundLog["action"]) || "unknown",
      request: { url: req.url, body, errorMessage: (err as Error).message },
      response: resp, statusCode: 500, remoteIp,
    });
    return jsonResponse(resp, 500);
  }
});

async function handleMember(supabase: SupabaseClient, member: string, remoteIp: string | null) {
  if (!member) {
    const resp = { status: "Failed", error: "Missing member" };
    await logInbound(supabase, { action: "member", request: { member }, response: resp, statusCode: 400, remoteIp });
    return jsonResponse(resp, 400);
  }

  const { data: payment } = await supabase
    .from("payments")
    .select("amount, status, livestock_id, livestock_items!inner(title)")
    .eq("reference", member)
    .maybeSingle();

  if (!payment) {
    const resp = { status: "NonExistent", member, error: "Reference not found" };
    await logInbound(supabase, { action: "member", member, request: { member }, response: resp, statusCode: 404, remoteIp });
    return jsonResponse(resp, 404);
  }

  const title = (payment.livestock_items as unknown as { title: string }).title;
  if (payment.status === "paid") {
    const resp = { status: "AlreadyPaid", member, name: title, amountDue: 0, currency: "USD" };
    await logInbound(supabase, { action: "member", member, request: { member }, response: resp, statusCode: 200, remoteIp });
    return jsonResponse(resp, 200);
  }

  const resp = {
    status: "Authorized",
    member,
    name: title,
    amountDue: Number(payment.amount),
    currency: "USD",
  };
  await logInbound(supabase, { action: "member", member, request: { member }, response: resp, statusCode: 200, remoteIp });
  return jsonResponse(resp, 200);
}

async function handlePay(supabase: SupabaseClient, body: Record<string, unknown>, remoteIp: string | null) {
  const member = String(body.member || "");
  const amount = Number(body.amount || 0);
  const paynowRef = String(body.paynowReference || body.paynow_reference || "");

  if (!member || !amount || !paynowRef) {
    const resp = { status: "Failed", error: "Missing member, amount, or paynowReference" };
    await logInbound(supabase, {
      action: "pay", member: member || null, paynowReference: paynowRef || null,
      request: body, response: resp, statusCode: 400, remoteIp,
    });
    return jsonResponse(resp, 400);
  }

  const { data: existing } = await supabase
    .from("payments")
    .select("reference, amount, status, paynow_reference, livestock_id")
    .eq("reference", member)
    .maybeSingle();

  if (!existing) {
    const resp = { status: "NonExistent", error: "Reference not found" };
    await logInbound(supabase, { action: "pay", member, paynowReference: paynowRef, request: body, response: resp, statusCode: 404, remoteIp });
    return jsonResponse(resp, 404);
  }

  // Idempotent retry — same paynow_reference re-hits → original result
  if (existing.status === "paid" && existing.paynow_reference === paynowRef) {
    const resp = { status: "Paid", reference: existing.reference, billerReference: existing.paynow_reference };
    await logInbound(supabase, { action: "pay", member, paynowReference: paynowRef, request: body, response: resp, statusCode: 200, remoteIp });
    return jsonResponse(resp, 200);
  }

  // Already settled by a different transaction — conflict
  if (existing.status === "paid" && existing.paynow_reference !== paynowRef) {
    const resp = { status: "AlreadyPaid", error: "Reference already settled by a different transaction" };
    await logInbound(supabase, { action: "pay", member, paynowReference: paynowRef, request: body, response: resp, statusCode: 409, remoteIp });
    return jsonResponse(resp, 409);
  }

  // Amount sanity check (1¢ tolerance for rounding drift)
  if (Math.abs(Number(existing.amount) - amount) > 0.01) {
    const resp = {
      status: "Failed", error: "Amount mismatch",
      expected: Number(existing.amount), got: amount,
    };
    await logInbound(supabase, { action: "pay", member, paynowReference: paynowRef, request: body, response: resp, statusCode: 400, remoteIp });
    return jsonResponse(resp, 400);
  }

  // Atomic settle. The .eq('status','pending').is('paynow_reference', null) clause
  // makes this a check-then-act in one round-trip — only the first concurrent
  // request wins; the rest fall to the re-read branch below.
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
    // Race: another transaction grabbed it first. Re-read.
    const { data: reread } = await supabase
      .from("payments")
      .select("reference, status, paynow_reference")
      .eq("reference", member)
      .maybeSingle();
    if (reread?.status === "paid" && reread.paynow_reference === paynowRef) {
      const resp = { status: "Paid", reference: reread.reference, billerReference: reread.paynow_reference };
      await logInbound(supabase, { action: "pay", member, paynowReference: paynowRef, request: body, response: resp, statusCode: 200, remoteIp });
      return jsonResponse(resp, 200);
    }
    const resp = { status: "Failed", error: "Settlement race — payment in unexpected state" };
    await logInbound(supabase, { action: "pay", member, paynowReference: paynowRef, request: body, response: resp, statusCode: 409, remoteIp });
    return jsonResponse(resp, 409);
  }

  // Mark the auction sold (best-effort; SMS fan-out lives in end-auctions, not here)
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
  await logInbound(supabase, { action: "pay", member, paynowReference: paynowRef, request: body, response: resp, statusCode: 200, remoteIp });
  return jsonResponse(resp, 200);
}

async function handleStatus(supabase: SupabaseClient, reference: string, remoteIp: string | null) {
  if (!reference) {
    const resp = { status: "Failed", error: "Missing reference" };
    await logInbound(supabase, { action: "status", request: { reference }, response: resp, statusCode: 400, remoteIp });
    return jsonResponse(resp, 400);
  }

  const { data: payment } = await supabase
    .from("payments")
    .select("reference, status, paynow_reference, amount, updated_at")
    .eq("reference", reference)
    .maybeSingle();

  if (!payment) {
    const resp = { status: "NonExistent", reference };
    await logInbound(supabase, { action: "status", member: reference, request: { reference }, response: resp, statusCode: 404, remoteIp });
    return jsonResponse(resp, 404);
  }

  const map: Record<string, string> = { pending: "Pending", paid: "Paid", failed: "Failed" };
  const resp = {
    status: map[payment.status] || "Unknown",
    reference: payment.reference,
    billerReference: payment.paynow_reference || null,
    amount: Number(payment.amount),
    currency: "USD",
    updatedAt: payment.updated_at,
  };
  await logInbound(supabase, {
    action: "status", member: reference, paynowReference: payment.paynow_reference,
    request: { reference }, response: resp, statusCode: 200, remoteIp,
  });
  return jsonResponse(resp, 200);
}
