// Super-admin gating for the frontend. Mirror of supabase/functions/_shared/superAdmin.ts:
// email-allowlist driven, env-var configured, no DB lookup. This is intentionally
// the same trust model on both sides so revoking access means one env-var change.
//
// To gate a route, use `isSuperAdmin(user)`. The edge functions enforce the
// same check server-side — the frontend gate is UX, not security.

import { supabase, isSupabaseConfigured } from './supabase';

export interface AuthorizedUser {
  email: string;
}

function getAllowlist(): string[] {
  const raw = (import.meta.env.VITE_SUPER_ADMIN_EMAILS as string | undefined) ?? '';
  return raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
}

export function isSuperAdmin(user: AuthorizedUser | null | undefined): boolean {
  if (!user?.email) return false;
  return getAllowlist().includes(user.email.toLowerCase());
}

// ─────────────────────────────────────────────────────────────────────────
// Leads
// ─────────────────────────────────────────────────────────────────────────

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'onboarded' | 'dropped';

export interface AdminLead {
  id: string;
  auction_house_name: string;
  town: string | null;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  lots_per_week: string;
  current_payment_rail: string;
  biggest_friction: string;
  status: LeadStatus;
  notes: string | null;
  approved_at: string | null;
  onboard_token: string | null;
  created_at: string;
  updated_at: string;
}

export async function listLeads(status?: LeadStatus): Promise<AdminLead[]> {
  if (!isSupabaseConfigured) return [];

  const url = new URL('list-leads', 'https://placeholder');
  if (status) url.searchParams.set('status', status);

  // We use raw fetch to control the query string — supabase.functions.invoke
  // doesn't expose a clean way to pass GET params.
  const session = (await supabase.auth.getSession()).data.session;
  const token = session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '';
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';
  const fnUrl = `${supabaseUrl}/functions/v1/list-leads${status ? `?status=${status}` : ''}`;

  const res = await fetch(fnUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: anonKey,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`list-leads ${res.status}: ${body}`);
  }
  const data = await res.json();
  return data.leads as AdminLead[];
}

export interface ApproveResult {
  onboard_url: string;
  token: string;
  email_sent: boolean;
  email_reason?: string;
}

export async function approveLead(leadId: string, opts: { regenerate?: boolean; skipEmail?: boolean } = {}): Promise<ApproveResult> {
  if (!isSupabaseConfigured) throw new Error('Approval disabled in demo mode');

  const { data, error } = await supabase.functions.invoke('approve-lead', {
    body: {
      lead_id: leadId,
      regenerate: opts.regenerate ?? false,
      skip_email: opts.skipEmail ?? false,
    },
  });

  if (error) {
    const serverMsg = (data as { error?: string } | null)?.error;
    throw new Error(serverMsg || error.message);
  }
  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error((data as { error: string }).error);
  }
  return data as ApproveResult;
}
