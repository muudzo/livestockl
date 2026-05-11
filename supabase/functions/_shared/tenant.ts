// Shared tenant helpers for edge functions that do service-role inserts on
// tenant-scoped tables (multi-tenancy added 2026-05-11). Service-role bypasses
// the column-default resolver, so every insert site must stamp tenant_id
// explicitly or it'll fail the NOT NULL constraint.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Look up a user's primary tenant (their oldest membership).
 * Returns null if the user has no membership — caller should treat as a
 * hard error rather than insert a NULL.
 */
export async function getUserPrimaryTenant(
  client: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data } = await client
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as { tenant_id: string } | null)?.tenant_id ?? null;
}

/**
 * Read a listing's tenant. For child rows (bids, payments, notifications about
 * the listing) we stamp the listing's tenant so the child stays in the same
 * tenant as its parent — critical when a buyer is a member of multiple tenants.
 */
export async function getLivestockTenant(
  client: SupabaseClient,
  livestockId: string,
): Promise<string | null> {
  const { data } = await client
    .from("livestock_items")
    .select("tenant_id")
    .eq("id", livestockId)
    .maybeSingle();
  return (data as { tenant_id: string } | null)?.tenant_id ?? null;
}
