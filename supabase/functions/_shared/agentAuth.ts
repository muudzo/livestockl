// Shared auth helper for agent edge functions (buyer, seller, sniper,
// market-intel). Accepts EITHER:
//   - A CRON_SECRET Bearer token (used by scheduled cron jobs); OR
//   - A Supabase user JWT whose auth.uid matches agents.user_id for the
//     agentId being operated on. Lets authenticated owners manually trigger
//     their own agents from the UI without sharing CRON_SECRET to the browser.
//
// Usage:
//   const body = await req.json();
//   const auth = await authorizeAgent(req, body.agentId);
//   if (!auth.ok) return new Response(auth.error, { status: auth.status });
//   // continue...

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type AgentAuthResult =
  | { ok: true; mode: "cron" }
  | { ok: true; mode: "owner"; userId: string }
  | { ok: false; status: number; error: string };

export async function authorizeAgent(req: Request, agentId: string | undefined): Promise<AgentAuthResult> {
  const authHeader = req.headers.get("authorization") ?? "";

  // Path A: cron
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return { ok: true, mode: "cron" };
  }

  // Path B: authenticated owner
  if (!authHeader.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  if (!agentId) {
    return { ok: false, status: 400, error: "Missing agentId" };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    return { ok: false, status: 500, error: "Server misconfigured" };
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  // Look up agent ownership using service role (bypasses RLS)
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) {
    return { ok: false, status: 500, error: "Server misconfigured" };
  }
  const admin = createClient(supabaseUrl, serviceKey);
  const { data: agent, error: lookupError } = await admin
    .from("agents")
    .select("user_id")
    .eq("id", agentId)
    .maybeSingle();

  if (lookupError || !agent) {
    return { ok: false, status: 404, error: "Agent not found" };
  }
  if (agent.user_id !== user.id) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true, mode: "owner", userId: user.id };
}
