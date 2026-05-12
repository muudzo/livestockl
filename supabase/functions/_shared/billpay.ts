// Shared helpers for the BillPay biller-inbound endpoints. ZimLivestock acts
// AS a biller inside Paynow's BillPay catalog: a buyer in the BillPay menu
// (USSD / EcoCash app / etc.) pays us, and Paynow calls our endpoints to
// (1) verify the auction reference + look up the member, and (2) post the
// payment.
//
// Two endpoints, two URLs:
//   GET|POST  /functions/v1/billpay-biller-auth   → member lookup
//   POST      /functions/v1/billpay-biller-pay    → settle (idempotent)
//
// Auth: HTTP Basic via BILLPAY_BILLER_USERNAME + BILLPAY_BILLER_PASSWORD.
// Optional IP allowlist via BILLPAY_BILLER_ALLOWED_IPS (comma-separated).
//
// Both endpoints log every inbound call (request, response, status, IP) to
// public.billpay_inbound_log for reconciliation + audit.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const USERNAME = Deno.env.get("BILLPAY_BILLER_USERNAME") || "";
const PASSWORD = Deno.env.get("BILLPAY_BILLER_PASSWORD") || "";
const ALLOWED_IPS = (Deno.env.get("BILLPAY_BILLER_ALLOWED_IPS") || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function getServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
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

export type InboundAction = "member" | "pay" | "status" | "auth" | "unknown";

export interface InboundLogEntry {
  action: InboundAction;
  member?: string | null;
  paynowReference?: string | null;
  request: unknown;
  response: unknown;
  statusCode: number;
  remoteIp: string | null;
}

export async function logInbound(supabase: SupabaseClient, entry: InboundLogEntry): Promise<void> {
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

/**
 * Verifies Basic auth + IP allowlist on the inbound request. Returns
 * { ok: true, ip } when authorised; otherwise builds and returns the 401
 * response (already logged as action='auth') so the caller can just
 * `return guard.response`.
 */
export async function requireBillerAuth(
  req: Request,
  supabase: SupabaseClient,
): Promise<{ ok: true; ip: string | null } | { ok: false; response: Response }> {
  const { ok: ipOk, ip } = checkIp(req);
  if (!checkBasicAuth(req) || !ipOk) {
    const resp = { status: "Failed", error: "Unauthorized" };
    await logInbound(supabase, {
      action: "auth",
      request: { url: req.url, ip },
      response: resp,
      statusCode: 401,
      remoteIp: ip,
    });
    return {
      ok: false,
      response: jsonResponse(resp, 401, { "WWW-Authenticate": 'Basic realm="ZimLivestock BillPay"' }),
    };
  }
  return { ok: true, ip };
}
