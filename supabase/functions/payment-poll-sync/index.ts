// payment-poll-sync
// -----------------
// Client-triggered fallback for delayed/missed Paynow webhooks.
// Fetches the Paynow pollurl for a given payment reference, verifies the
// response hash, and applies the same state-transition logic the webhook
// would have applied. Safe to call repeatedly (idempotent via the
// .eq("status", "pending") guard on the UPDATE).
//
// Called every ~20s by usePaynowPoll() on the PaymentStatus screen.
// If the webhook has already fired, this is a cheap no-op. If the
// webhook was dropped by Paynow or blocked by Cloudflare, this is the
// only way the UI learns the payment completed.
//
// TODO: extract parsePaynowBody / verifyPaynowHash / completePayment /
// failPayment into _shared/paynow.ts. Webhook and this function both
// duplicate them today.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Per-request closure so jsonResponse can derive CORS from the current req
let _currentReq: Request | null = null;
function jsonResponse(body: unknown, status = 200) {
  const cors = _currentReq ? getCorsHeaders(_currentReq) : {};
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json" },
  });
}

function parsePaynowBody(body: string): Record<string, string> {
  const params: Record<string, string> = {};
  for (const pair of body.split("&")) {
    const [key, ...rest] = pair.split("=");
    if (!key) continue;
    params[decodeURIComponent(key)] = decodeURIComponent(rest.join("="));
  }
  return params;
}

async function verifyPaynowHash(params: Record<string, string>, integrationKey: string): Promise<boolean> {
  const receivedHash = params.hash;
  if (!receivedHash) return false;

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

async function completePayment(reference: string, providerRef: string, log: ReturnType<typeof createLogger>) {
  const { data: updated, error } = await supabase
    .from("payments")
    .update({
      status: "paid",
      paynow_reference: providerRef,
      updated_at: new Date().toISOString(),
    })
    .eq("reference", reference)
    .eq("status", "pending")
    .select("livestock_id, user_id, amount")
    .maybeSingle();

  if (error) {
    log.error("poll-sync failed to update payment", { reference, error: error.message });
    return false;
  }
  if (!updated) {
    // Already processed (either by webhook or a prior poll) — idempotent skip
    return true;
  }

  log.info("poll-sync marked payment as paid", { reference, providerRef, amount: updated.amount });

  const [, , sellerResult] = await Promise.all([
    updated.livestock_id
      ? supabase.from("livestock_items").update({ status: "sold" }).eq("id", updated.livestock_id)
      : Promise.resolve(),
    supabase.from("notifications").insert({
      user_id: updated.user_id,
      type: "payment",
      title: "Payment Confirmed",
      message: `Your payment of US$${updated.amount} has been confirmed.`,
      priority: "high",
    }),
    updated.livestock_id
      ? supabase.from("livestock_items").select("seller_id, title").eq("id", updated.livestock_id).single()
      : Promise.resolve({ data: null }),
  ]);

  const item = (sellerResult as { data: { seller_id: string; title: string } | null })?.data;
  if (item) {
    await supabase.from("notifications").insert({
      user_id: item.seller_id,
      type: "payment",
      title: "Payment Received",
      message: `Payment of US$${updated.amount} received for ${item.title}.`,
      priority: "high",
    });
  }
  return true;
}

async function failPayment(reference: string, log: ReturnType<typeof createLogger>) {
  log.warn("poll-sync marked payment as failed", { reference });
  await supabase
    .from("payments")
    .update({ status: "failed", updated_at: new Date().toISOString() })
    .eq("reference", reference)
    .eq("status", "pending");
}

Deno.serve(async (req) => {
  _currentReq = req;
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const log = createLogger("payment-poll-sync", req);

  try {
    // ─── Auth: the owning user must be logged in ───
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Missing Authorization header" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return jsonResponse({ error: "Not authenticated" }, 401);

    let body: { reference?: string };
    try {
      body = (await req.json()) as { reference?: string };
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }
    const { reference } = body || {};
    if (!reference) return jsonResponse({ error: "Missing reference" }, 400);

    // ─── Look up payment, verify ownership, extract pollurl ───
    const { data: payment, error: lookupErr } = await supabase
      .from("payments")
      .select("reference, user_id, status, paynow_reference, method")
      .eq("reference", reference)
      .maybeSingle();

    if (lookupErr || !payment) return jsonResponse({ error: "Payment not found" }, 404);
    if (payment.user_id !== user.id) return jsonResponse({ error: "Forbidden" }, 403);

    // Already terminal — no work needed
    if (payment.status === "paid" || payment.status === "failed") {
      return jsonResponse({ status: payment.status, source: "db" });
    }

    // Only Paynow methods have pollurls; Stripe uses its own webhook
    if (payment.method !== "EcoCash" && payment.method !== "OneMoney" && payment.method !== "Card") {
      return jsonResponse({ status: "pending", source: "skip_non_paynow" });
    }

    const pollUrl = payment.paynow_reference;
    if (!pollUrl || !pollUrl.startsWith("http")) {
      // No pollurl stored (e.g. payment never successfully initiated with Paynow)
      return jsonResponse({ status: "pending", source: "no_pollurl" });
    }

    // ─── Hit Paynow's poll endpoint server-side ───
    const integrationKey = Deno.env.get("PAYNOW_INTEGRATION_KEY");
    if (!integrationKey) {
      log.error("PAYNOW_INTEGRATION_KEY not configured");
      return jsonResponse({ error: "Server misconfigured" }, 500);
    }

    let paynowParams: Record<string, string>;
    try {
      const paynowRes = await fetch(pollUrl, { method: "POST" });
      const paynowBody = await paynowRes.text();
      paynowParams = parsePaynowBody(paynowBody);
    } catch (fetchErr) {
      log.error("poll-sync failed to reach Paynow", { reference, error: (fetchErr as Error).message });
      // Transient — client will try again
      return jsonResponse({ status: "pending", source: "poll_unreachable" });
    }

    // ─── Verify hash before trusting the body ───
    const valid = await verifyPaynowHash(paynowParams, integrationKey);
    if (!valid) {
      log.error("poll-sync Paynow hash verification failed", { reference });
      return jsonResponse({ error: "Invalid response signature" }, 502);
    }

    const paynowStatus = (paynowParams.status || "").toLowerCase();
    const paynowRef = paynowParams.paynowreference || "";

    log.info("poll-sync paynow response", { reference, paynowStatus });

    if (paynowStatus === "paid" || paynowStatus === "delivered") {
      await completePayment(reference, paynowRef, log);
      return jsonResponse({ status: "paid", source: "poll" });
    }

    if (paynowStatus === "cancelled" || paynowStatus === "failed" || paynowStatus === "disputed") {
      await failPayment(reference, log);
      return jsonResponse({ status: "failed", source: "poll" });
    }

    // Non-terminal (sent / awaiting delivery / created) — still pending
    return jsonResponse({ status: "pending", source: "poll", paynowStatus });
  } catch (err) {
    log.error("poll-sync error", { error: (err as Error).message });
    return jsonResponse({ error: "Internal error" }, 500);
  }
});
