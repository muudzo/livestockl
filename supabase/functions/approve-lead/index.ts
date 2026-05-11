// approve-lead
// ------------
// Super-admin approves a lead → generates a one-time onboard_token, marks the
// lead status='qualified' (or leaves it alone if already qualified —
// idempotent), and emails the operator the onboarding URL.
//
// The token becomes the auth gate for Slice 4's onboarding wizard at
// /operators/onboard?token=<uuid>.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireSuperAdmin } from "../_shared/superAdmin.ts";
import { createLogger } from "../_shared/logger.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const log = createLogger("approve-lead");

interface ApproveBody {
  lead_id?: string;
  /** If true, regenerate token even if one exists. Default false. */
  regenerate?: boolean;
  /** If true, skip the operator notification email. Default false. */
  skip_email?: boolean;
}

async function emailOperator(args: {
  contactEmail: string;
  contactName: string;
  auctionHouse: string;
  onboardUrl: string;
}) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    log.info("approval email skipped — RESEND_API_KEY not set");
    return { sent: false, reason: "RESEND_API_KEY not set" };
  }

  const from = Deno.env.get("NOTIFY_LEADS_FROM") || "ZimLivestock <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: args.contactEmail,
      subject: `ZimLivestock — your onboarding link for ${args.auctionHouse}`,
      text: [
        `Hi ${args.contactName},`,
        ``,
        `Thank you for your interest in ZimLivestock. We've reviewed your`,
        `submission for ${args.auctionHouse} and would like to invite you to`,
        `set up your tenant.`,
        ``,
        `Use this one-time link to start the onboarding wizard. It expires`,
        `in 14 days.`,
        ``,
        args.onboardUrl,
        ``,
        `The wizard takes about 10 minutes. You'll choose your tenant's`,
        `slug, configure auction mechanics (commission split, dispute`,
        `window, lot fee, anti-shill rules), and create your first admin`,
        `account. If you'd rather we walk you through it on a call, just`,
        `reply to this email.`,
        ``,
        `Best,`,
        `Tatenda Nyemudzo`,
        `ZimLivestock · tatenda@paynow.co.zw`,
      ].join("\n"),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    log.warn("Resend non-2xx", { status: res.status, body });
    return { sent: false, reason: `Resend ${res.status}` };
  }

  return { sent: true };
}

function appOrigin(req: Request): string {
  // Prefer the configured ALLOWED_ORIGIN; fall back to the request origin or
  // the production Vercel URL.
  const allowed = (Deno.env.get("ALLOWED_ORIGIN") || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (allowed.length > 0) return allowed[0];
  const origin = req.headers.get("origin");
  if (origin) return origin;
  return "https://app-nine-sigma-jgoqp90f2p.vercel.app";
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const guard = await requireSuperAdmin(req, jsonResponse);
  if (!guard.ok) return guard.response;

  let body: ApproveBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  if (!body.lead_id) return jsonResponse({ error: "Missing lead_id" }, 400);

  const { data: lead, error: readErr } = await supabase
    .from("leads")
    .select("id, auction_house_name, contact_name, contact_email, status, onboard_token, approved_at")
    .eq("id", body.lead_id)
    .maybeSingle();

  if (readErr || !lead) {
    return jsonResponse({ error: "Lead not found" }, 404);
  }

  if (lead.status === "onboarded") {
    return jsonResponse({ error: "Lead is already onboarded (tenant exists)" }, 409);
  }

  // Idempotent: existing token is returned unless explicit regenerate=true
  let token = lead.onboard_token as string | null;
  const shouldGenerate = !token || body.regenerate;

  if (shouldGenerate) {
    token = crypto.randomUUID();
    const { error: updateErr } = await supabase
      .from("leads")
      .update({
        status: "qualified",
        approved_at: lead.approved_at ?? new Date().toISOString(),
        onboard_token: token,
      })
      .eq("id", body.lead_id);

    if (updateErr) {
      log.error("approve-lead update failed", { admin: guard.user.email, lead_id: body.lead_id, error: updateErr.message });
      return jsonResponse({ error: "Failed to mark lead approved" }, 500);
    }
  }

  const onboardUrl = `${appOrigin(req)}/operators/onboard?token=${token}`;

  let emailResult: { sent: boolean; reason?: string } = { sent: false, reason: "skipped" };
  if (!body.skip_email) {
    emailResult = await emailOperator({
      contactEmail: lead.contact_email,
      contactName: lead.contact_name,
      auctionHouse: lead.auction_house_name,
      onboardUrl,
    }).catch((err) => ({ sent: false, reason: (err as Error).message }));
  }

  log.info("lead approved", {
    admin: guard.user.email,
    lead_id: body.lead_id,
    house: lead.auction_house_name,
    regenerated: shouldGenerate && lead.onboard_token != null,
    email_sent: emailResult.sent,
  });

  return jsonResponse({
    ok: true,
    onboard_url: onboardUrl,
    token,
    email_sent: emailResult.sent,
    email_reason: emailResult.reason,
  });
});
