// Super-admin gating for /admin/* edge functions.
//
// Identity model: an email allowlist in the SUPER_ADMIN_EMAILS env var
// (comma-separated). Solo-developer-friendly for v0. Later this becomes
// a super_admins table keyed by user_id with audit trail.
//
// Pattern in callers:
//   const guard = await requireSuperAdmin(req);
//   if (!guard.ok) return guard.response;
//   const user = guard.user;

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface SuperAdminGuardSuccess {
  ok: true;
  user: { id: string; email: string };
}
export interface SuperAdminGuardFailure {
  ok: false;
  response: Response;
}

export async function requireSuperAdmin(
  req: Request,
  buildResponse: (body: unknown, status: number) => Response,
): Promise<SuperAdminGuardSuccess | SuperAdminGuardFailure> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { ok: false, response: buildResponse({ error: "Not authenticated" }, 401) };
  }

  // Verify the caller's JWT using the anon client + their Bearer header.
  // This pattern matches how Supabase recommends user-context calls inside
  // service-role-using functions.
  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error } = await anonClient.auth.getUser();
  if (error || !user || !user.email) {
    return { ok: false, response: buildResponse({ error: "Not authenticated" }, 401) };
  }

  const allowlist = (Deno.env.get("SUPER_ADMIN_EMAILS") || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (allowlist.length === 0) {
    // Safer to deny by default — an unset env var is misconfiguration, not
    // an open door.
    return {
      ok: false,
      response: buildResponse({ error: "Admin endpoints not configured" }, 503),
    };
  }

  if (!allowlist.includes(user.email.toLowerCase())) {
    return { ok: false, response: buildResponse({ error: "Forbidden" }, 403) };
  }

  return { ok: true, user: { id: user.id, email: user.email } };
}
