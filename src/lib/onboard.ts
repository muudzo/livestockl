// Client helpers for the SaPS onboarding wizard.
// Wraps the verify-onboard-token and provision-tenant edge functions.

import { supabase, isSupabaseConfigured } from './supabase';

export interface VerifiedLead {
  id: string;
  auction_house_name: string;
  town: string | null;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  lots_per_week: string;
  current_payment_rail: string;
  biggest_friction: string;
}

export type VerifyError =
  | 'missing_token'
  | 'invalid_token'
  | 'token_expired'
  | 'already_onboarded'
  | 'lead_dropped'
  | 'network';

export interface VerifyResult {
  ok: boolean;
  lead?: VerifiedLead;
  error?: VerifyError;
}

export async function verifyOnboardToken(token: string): Promise<VerifyResult> {
  if (!token) return { ok: false, error: 'missing_token' };
  if (!isSupabaseConfigured) {
    // Demo mode: synthesise a believable lead so the wizard renders.
    return {
      ok: true,
      lead: {
        id: 'demo-lead',
        auction_house_name: 'Demo Auction House',
        town: 'Harare',
        contact_name: 'Demo Operator',
        contact_phone: '+263770000000',
        contact_email: 'demo@example.com',
        lots_per_week: 'under_50',
        current_payment_rail: 'cash_only',
        biggest_friction: 'Demo mode — no real friction recorded.',
      },
    };
  }

  const { data, error } = await supabase.functions.invoke('verify-onboard-token', {
    body: { token },
  });

  if (error) {
    const serverError = (data as { error?: string } | null)?.error;
    if (serverError && isVerifyError(serverError)) {
      return { ok: false, error: serverError };
    }
    return { ok: false, error: 'network' };
  }
  if (!data || !('lead' in (data as object))) {
    return { ok: false, error: 'invalid_token' };
  }
  return { ok: true, lead: (data as { lead: VerifiedLead }).lead };
}

function isVerifyError(s: string): s is VerifyError {
  return ['missing_token', 'invalid_token', 'token_expired', 'already_onboarded', 'lead_dropped'].includes(s);
}

// ─────────────────────────────────────────────────────────────────────────
// Provision
// ─────────────────────────────────────────────────────────────────────────

export interface ProvisionPayload {
  token: string;
  slug: string;
  tenant_name: string;
  config: {
    commission_seller_pct: number;
    commission_buyer_pct: number;
    reserve_required: boolean;
    dispute_window_days: number;
    lot_fee_usd: number;
    anti_shill_window_seconds: number;
    default_currency: string;
  };
  admin_email: string;
  admin_password: string;
  admin_first_name: string;
  admin_last_name: string;
  admin_phone: string;
}

export interface ProvisionResult {
  tenant_id: string;
  slug: string;
  admin_email: string;
  redirect: string;
}

export async function provisionTenant(payload: ProvisionPayload): Promise<{ ok: true; data: ProvisionResult } | { ok: false; error: string; details?: unknown }> {
  if (!isSupabaseConfigured) {
    await new Promise((r) => setTimeout(r, 500));
    return { ok: true, data: { tenant_id: 'demo-tenant', slug: payload.slug, admin_email: payload.admin_email, redirect: `/t/${payload.slug}/settings` } };
  }

  const { data, error } = await supabase.functions.invoke('provision-tenant', {
    body: payload,
  });

  if (error) {
    const serverMsg = (data as { error?: string } | null)?.error;
    return { ok: false, error: serverMsg || error.message };
  }
  if (data && typeof data === 'object' && 'error' in data) {
    return { ok: false, error: (data as { error: string }).error, details: data };
  }
  return { ok: true, data: data as ProvisionResult };
}

// ─────────────────────────────────────────────────────────────────────────
// Slug helpers
// ─────────────────────────────────────────────────────────────────────────

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]{2,64}$/.test(slug);
}
