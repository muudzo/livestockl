// list-leads
// ----------
// Super-admin-only paginated read of the SaPS lead pipeline. Filters by status,
// orders by created_at desc, hard caps at 100 rows.
//
// Identity comes from the caller's JWT — verified via _shared/superAdmin.ts.
// Reads happen with the service-role client, bypassing RLS on the leads table
// (which has no auth-SELECT policy by design — Slice 2's leads migration).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireSuperAdmin } from "../_shared/superAdmin.ts";
import { createLogger } from "../_shared/logger.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const log = createLogger("list-leads");

const VALID_STATUSES = new Set(["new", "contacted", "qualified", "onboarded", "dropped"]);

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Access-Control-Allow-Methods": "GET, OPTIONS", "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET") return jsonResponse({ error: "Method not allowed" }, 405);

  const guard = await requireSuperAdmin(req, jsonResponse);
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const statusFilter = url.searchParams.get("status");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10) || 50, 100);

  let query = supabase
    .from("leads")
    .select(
      "id, auction_house_name, town, contact_name, contact_phone, contact_email, lots_per_week, current_payment_rail, biggest_friction, status, notes, approved_at, onboard_token, created_at, updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (statusFilter && VALID_STATUSES.has(statusFilter)) {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    log.error("list-leads query failed", { admin: guard.user.email, error: error.message });
    return jsonResponse({ error: "Failed to fetch leads" }, 500);
  }

  log.info("leads listed", { admin: guard.user.email, count: data?.length ?? 0, statusFilter });

  return jsonResponse({ leads: data ?? [] });
});
