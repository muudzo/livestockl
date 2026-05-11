// Tenant types + fetch helpers for the SaPS pivot (multi-tenancy added 2026-05-11).
// Each auction house / cooperative / processor is a tenant with its own
// configured deployment. A user can be a member of multiple tenants in
// different roles (admin / operator / seller / buyer).

import { supabase, isSupabaseConfigured } from './supabase';

export type TenantRole = 'admin' | 'operator' | 'seller' | 'buyer';

export interface TenantConfig {
  commission_seller_pct: number;
  commission_buyer_pct: number;
  reserve_required: boolean;
  dispute_window_days: number;
  lot_fee_usd: number;
  anti_shill_window_seconds: number;
  default_currency: string;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  config: TenantConfig;
  status: 'active' | 'suspended' | 'archived';
}

export interface TenantMembership {
  tenant: Tenant;
  role: TenantRole;
}

// Demo-mode fallback used when Supabase isn't configured. Mirrors the
// default tenant seeded by the migration so the UI renders identical
// values whether or not the live DB is reachable.
export const DEMO_TENANT: Tenant = {
  id: '00000000-0000-0000-0000-000000000001',
  slug: 'zimlivestock-demo',
  name: 'ZimLivestock Demo',
  config: {
    commission_seller_pct: 5,
    commission_buyer_pct: 7,
    reserve_required: false,
    dispute_window_days: 3,
    lot_fee_usd: 0,
    anti_shill_window_seconds: 5,
    default_currency: 'USD',
  },
  status: 'active',
};

/**
 * Fetch every tenant the current user belongs to. Returns roles too so the
 * UI can branch on operator/admin capabilities.
 */
export async function fetchUserMemberships(userId: string): Promise<TenantMembership[]> {
  if (!isSupabaseConfigured) {
    return [{ tenant: DEMO_TENANT, role: 'buyer' }];
  }

  const { data, error } = await supabase
    .from('tenant_members')
    .select('role, tenant:tenants(*)')
    .eq('user_id', userId)
    .order('joined_at', { ascending: true });

  if (error || !data) return [];

  return (data as unknown as Array<{ role: TenantRole; tenant: Tenant | null }>)
    .filter((m) => m.tenant !== null)
    .map((m) => ({ tenant: m.tenant as Tenant, role: m.role }));
}

/**
 * Resolve a tenant by its URL slug. Returns null if the slug doesn't exist
 * or RLS hides it from the caller (not a member).
 */
export async function fetchTenantBySlug(slug: string): Promise<Tenant | null> {
  if (!isSupabaseConfigured) {
    return slug === DEMO_TENANT.slug ? DEMO_TENANT : null;
  }

  const { data } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  return (data as Tenant | null) ?? null;
}
