// provision-tenant
// ----------------
// Anonymous POST. Final step of the SaPS onboarding flow. Takes the wizard
// payload + the onboard token, creates the new admin's auth user, and then
// atomically writes (tenant, tenant_members, lead-update) via the
// provision_tenant RPC.
//
// Order matters: the auth user is created BEFORE the RPC because the RPC
// needs the user_id. If the RPC then fails, we attempt cleanup by deleting
// the orphan auth user — best-effort, logged on failure.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const log = createLogger("provision-tenant");

const TOKEN_TTL_DAYS = 14;
const SLUG_RE = /^[a-z0-9-]{2,64}$/;

interface ProvisionPayload {
  token?: string;
  slug?: string;
  tenant_name?: string;
  config?: Record<string, unknown>;
  admin_email?: string;
  admin_password?: string;
  admin_first_name?: string;
  admin_last_name?: string;
  admin_phone?: string;
}

interface AdminUserResult {
  user?: { id: string; email?: string };
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

  let body: ProvisionPayload;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  // ── Validate payload ──
  const errors: string[] = [];
  if (!body.token) errors.push("token");
  if (!body.slug) errors.push("slug");
  if (!body.tenant_name || body.tenant_name.trim().length < 2) errors.push("tenant_name");
  if (!body.config || typeof body.config !== "object") errors.push("config");
  if (!body.admin_email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.admin_email)) errors.push("admin_email");
  if (!body.admin_password || body.admin_password.length < 8) errors.push("admin_password");
  if (!body.admin_first_name) errors.push("admin_first_name");
  if (!body.admin_last_name) errors.push("admin_last_name");
  if (!body.admin_phone) errors.push("admin_phone");
  if (errors.length > 0) {
    return jsonResponse({ error: "Invalid payload", missing_or_invalid: errors }, 400);
  }

  const slug = body.slug!.trim().toLowerCase();
  if (!SLUG_RE.test(slug)) {
    return jsonResponse({ error: "Invalid slug. Use 2–64 lowercase letters, digits, or hyphens." }, 400);
  }

  // ── Read the lead by token, validate ──
  const { data: lead, error: readErr } = await admin
    .from("leads")
    .select("id, status, onboard_token, approved_at")
    .eq("onboard_token", body.token)
    .maybeSingle();

  if (readErr) {
    log.error("lead read failed", { error: readErr.message });
    return jsonResponse({ error: "Server error" }, 500);
  }
  if (!lead) return jsonResponse({ error: "invalid_token" }, 404);
  if (lead.status === "onboarded") return jsonResponse({ error: "already_onboarded" }, 409);
  if (lead.status === "dropped") return jsonResponse({ error: "lead_dropped" }, 410);
  if (lead.approved_at) {
    const ageDays = (Date.now() - new Date(lead.approved_at).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays > TOKEN_TTL_DAYS) return jsonResponse({ error: "token_expired" }, 410);
  }

  // ── Pre-check slug availability so we don't burn an auth user on a clash ──
  const { data: clash } = await admin.from("tenants").select("id").eq("slug", slug).maybeSingle();
  if (clash) {
    return jsonResponse({ error: "slug_taken", slug }, 409);
  }

  // ── Create auth user ──
  const createRes = await admin.auth.admin.createUser({
    email: body.admin_email!.toLowerCase(),
    password: body.admin_password!,
    email_confirm: true, // operator already proved email control by clicking the link
    user_metadata: {
      first_name: body.admin_first_name,
      last_name: body.admin_last_name,
      phone: body.admin_phone,
    },
  });

  if (createRes.error || !createRes.data?.user) {
    const msg = createRes.error?.message ?? "Failed to create user";
    if (msg.toLowerCase().includes("already")) {
      return jsonResponse({ error: "email_already_registered", admin_email: body.admin_email }, 409);
    }
    log.error("createUser failed", { error: msg });
    return jsonResponse({ error: msg }, 500);
  }

  const newUserId = createRes.data.user.id;

  // ── Atomic provisioning via RPC ──
  const { data: tenantId, error: rpcErr } = await admin.rpc("provision_tenant", {
    p_lead_id: lead.id,
    p_user_id: newUserId,
    p_slug: slug,
    p_name: body.tenant_name!.trim(),
    p_config: body.config,
  });

  if (rpcErr) {
    log.error("provision_tenant RPC failed — attempting auth user cleanup", { error: rpcErr.message, user_id: newUserId });
    // Best-effort cleanup. If it fails the operator can retry; the email is
    // unique so a second attempt with the same email will fail at createUser
    // with email_already_registered.
    const delRes = await admin.auth.admin.deleteUser(newUserId);
    if (delRes.error) {
      log.error("orphan auth user cleanup failed", { error: delRes.error.message, user_id: newUserId });
    }
    return jsonResponse({ error: rpcErr.message }, 500);
  }

  log.info("tenant provisioned", { tenant_id: tenantId, slug, lead_id: lead.id, admin_email: body.admin_email });

  return jsonResponse({
    ok: true,
    tenant_id: tenantId,
    slug,
    admin_email: body.admin_email,
    redirect: `/t/${slug}/settings`,
  });
});
