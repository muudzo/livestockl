// verify-onboard-token
// --------------------
// Anonymous POST endpoint that reads a lead by onboard_token and returns the
// minimal data the wizard needs to prefill: auction house name, contact
// details, town, friction summary.
//
// Tokens expire 14 days after lead.approved_at — surface that as a specific
// 'expired' error so the UI can prompt the operator to contact us for a
// fresh link rather than show a generic "not found".

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const log = createLogger("verify-onboard-token");

const TOKEN_TTL_DAYS = 14;

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const token = body.token?.trim();
  if (!token) return jsonResponse({ error: "Missing token" }, 400);

  const { data: lead, error } = await supabase
    .from("leads")
    .select(
      "id, auction_house_name, town, contact_name, contact_phone, contact_email, lots_per_week, current_payment_rail, biggest_friction, status, approved_at",
    )
    .eq("onboard_token", token)
    .maybeSingle();

  if (error) {
    log.error("verify-onboard-token query failed", { error: error.message });
    return jsonResponse({ error: "Server error" }, 500);
  }

  if (!lead) {
    return jsonResponse({ error: "invalid_token" }, 404);
  }

  if (lead.status === "onboarded") {
    return jsonResponse({ error: "already_onboarded" }, 409);
  }

  if (lead.status === "dropped") {
    return jsonResponse({ error: "lead_dropped" }, 410);
  }

  // Expiry check
  if (lead.approved_at) {
    const approvedAt = new Date(lead.approved_at).getTime();
    const ageDays = (Date.now() - approvedAt) / (1000 * 60 * 60 * 24);
    if (ageDays > TOKEN_TTL_DAYS) {
      return jsonResponse({ error: "token_expired", expired_days_ago: Math.floor(ageDays - TOKEN_TTL_DAYS) }, 410);
    }
  }

  return jsonResponse({
    lead: {
      id: lead.id,
      auction_house_name: lead.auction_house_name,
      town: lead.town,
      contact_name: lead.contact_name,
      contact_phone: lead.contact_phone,
      contact_email: lead.contact_email,
      lots_per_week: lead.lots_per_week,
      current_payment_rail: lead.current_payment_rail,
      biggest_friction: lead.biggest_friction,
    },
  });
});
