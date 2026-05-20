// submit-lead
// -----------
// Public, anonymous endpoint behind /operators/request-access. Validates the
// submission server-side (CHECK constraints + format checks + honeypot),
// inserts into public.leads, and best-effort sends a notification email to
// NOTIFY_LEADS_EMAIL via Resend if RESEND_API_KEY is configured.
//
// Anonymous insert is gated by RLS — see migrations/20260512000000_leads.sql.
// We use the service_role client so failures surface as 5xx instead of being
// silently filtered by the RLS policy.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const log = createLogger("submit-lead");

const LOTS_PER_WEEK = new Set(["under_50", "50_to_200", "200_plus", "unsure"]);
const PAYMENT_RAIL = new Set(["cash_only", "cash_and_eft", "paynow", "other_platform", "mixed"]);

interface LeadPayload {
  auction_house_name?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  town?: string;
  lots_per_week?: string;
  current_payment_rail?: string;
  biggest_friction?: string;
  // Honeypot — bots fill it, humans don't see it.
  website?: string;
}

function jsonResponse(req: Request, body: unknown, status = 200) {
  const cors = getCorsHeaders(req);
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Content-Type": "application/json",
    },
  });
}

function normalizePhone(raw: string): string {
  // Accept +263..., 0..., or raw 9-digit local. Strip everything non-digit,
  // then standardise to +263... form when it looks like a ZW number.
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("263")) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10) return `+263${digits.slice(1)}`;
  if (digits.length === 9) return `+263${digits}`;
  return raw.trim();
}

function validate(p: LeadPayload): { ok: true; data: Required<Omit<LeadPayload, 'website' | 'town'>> & { town: string | null } } | { ok: false; error: string } {
  const required = ['auction_house_name', 'contact_name', 'contact_phone', 'contact_email', 'lots_per_week', 'current_payment_rail', 'biggest_friction'] as const;
  for (const k of required) {
    if (!p[k] || typeof p[k] !== 'string' || (p[k] as string).trim().length === 0) {
      return { ok: false, error: `Missing required field: ${k}` };
    }
  }
  if (!LOTS_PER_WEEK.has(p.lots_per_week!)) return { ok: false, error: "Invalid lots_per_week" };
  if (!PAYMENT_RAIL.has(p.current_payment_rail!)) return { ok: false, error: "Invalid current_payment_rail" };

  const email = p.contact_email!.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: "Invalid email" };
  }

  const phone = normalizePhone(p.contact_phone!);
  if (phone.length < 6 || phone.length > 32) {
    return { ok: false, error: "Invalid phone" };
  }

  const friction = p.biggest_friction!.trim();
  if (friction.length < 10) return { ok: false, error: "Friction description too short (min 10 chars)" };
  if (friction.length > 1200) return { ok: false, error: "Friction description too long (max 1200 chars)" };

  return {
    ok: true,
    data: {
      auction_house_name: p.auction_house_name!.trim(),
      contact_name: p.contact_name!.trim(),
      contact_phone: phone,
      contact_email: email.toLowerCase(),
      town: p.town?.trim() || null,
      lots_per_week: p.lots_per_week!,
      current_payment_rail: p.current_payment_rail!,
      biggest_friction: friction,
    },
  };
}

async function sendEmail(args: { to: string; subject: string; text: string }): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return;
  const from = Deno.env.get("NOTIFY_LEADS_FROM") || "ZimLivestock <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, ...args }),
    });
    if (!res.ok) {
      const txt = await res.text();
      log.warn("Resend non-2xx", { status: res.status, body: txt });
    }
  } catch (err) {
    log.error("Resend dispatch failed", { error: (err as Error).message });
  }
}

async function notifyByEmail(lead: Record<string, unknown>) {
  const to = Deno.env.get("NOTIFY_LEADS_EMAIL");
  if (!to) {
    log.info("lead notification skipped — NOTIFY_LEADS_EMAIL not set");
    return;
  }
  await sendEmail({
    to,
    subject: `New SaPS lead — ${lead.auction_house_name}`,
    text: [
      `Auction house: ${lead.auction_house_name}`,
      `Contact: ${lead.contact_name} <${lead.contact_email}>`,
      `Phone: ${lead.contact_phone}`,
      `Town: ${lead.town || "—"}`,
      `Lots/week: ${lead.lots_per_week}`,
      `Payment rail: ${lead.current_payment_rail}`,
      ``,
      `Biggest friction:`,
      `${lead.biggest_friction}`,
    ].join("\n"),
  });
}

async function confirmOperator(lead: Record<string, unknown>) {
  const to = lead.contact_email as string;
  const name = (lead.contact_name as string).split(" ")[0];
  await sendEmail({
    to,
    subject: `We've received your ZimLivestock application — ${lead.auction_house_name}`,
    text: [
      `Hi ${name},`,
      ``,
      `We've received your application for ${lead.auction_house_name}.`,
      ``,
      `Here's what happens next:`,
      ``,
      `01  One of us reads your submission within one business day.`,
      `02  We reach out by email or WhatsApp to set up a 30-minute discovery call.`,
      `03  If we're a fit, we provision your tenant, waive setup fees, and walk your team through the first auction day.`,
      ``,
      `If you don't hear from us within two working days, reply to this email directly.`,
      ``,
      `— The ZimLivestock team`,
    ].join("\n"),
  });
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }
  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Method not allowed" }, 405);
  }

  let payload: LeadPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(req, { error: "Invalid JSON" }, 400);
  }

  // Honeypot: bots fill any field they see; the form never renders this.
  // If it's non-empty, silently accept (return 200) so spam doesn't get
  // feedback on what triggered the block.
  if (payload.website && payload.website.trim().length > 0) {
    log.info("honeypot triggered", { ua: req.headers.get("user-agent") });
    return jsonResponse(req, { ok: true });
  }

  const v = validate(payload);
  if (!v.ok) {
    return jsonResponse(req, { error: v.error }, 400);
  }

  const { data, error } = await supabase
    .from("leads")
    .insert({
      ...v.data,
      user_agent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
      submitted_via: "web_form",
    })
    .select("id")
    .single();

  if (error || !data) {
    log.error("lead insert failed", { error: error?.message });
    return jsonResponse(req, { error: "Failed to record lead. Please email tatenda@paynow.co.zw directly." }, 500);
  }

  log.info("lead recorded", { id: data.id, house: v.data.auction_house_name });

  // Fire-and-forget — don't block the form response on email delivery.
  notifyByEmail(v.data).catch(() => {});
  confirmOperator(v.data).catch(() => {});

  return jsonResponse(req, { ok: true, id: data.id });
});
