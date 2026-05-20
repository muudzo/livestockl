// Client-side helper for the SaPS discovery lead form. The form is anonymous
// (no auth required) and posts via the submit-lead edge function.

import { supabase, isSupabaseConfigured } from './supabase';

export type LotsPerWeek = 'under_50' | '50_to_200' | '200_plus' | 'unsure';
export type PaymentRail = 'cash_only' | 'cash_and_eft' | 'paynow' | 'other_platform' | 'mixed';

export interface LeadSubmission {
  auction_house_name: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  town?: string;
  lots_per_week: LotsPerWeek;
  current_payment_rail: PaymentRail;
  biggest_friction: string;
  /** Honeypot — never filled by humans. */
  website?: string;
}

export const LOTS_OPTIONS: Array<{ value: LotsPerWeek; label: string }> = [
  { value: 'under_50',   label: 'Under 50 lots a week' },
  { value: '50_to_200',  label: '50 to 200 lots a week' },
  { value: '200_plus',   label: 'More than 200 lots a week' },
  { value: 'unsure',     label: 'Not sure yet' },
];

export const PAYMENT_OPTIONS: Array<{ value: PaymentRail; label: string }> = [
  { value: 'cash_only',     label: 'Cash only' },
  { value: 'cash_and_eft',  label: 'Cash + bank transfer / EFT' },
  { value: 'paynow',        label: 'Paynow (EcoCash / OneMoney / card)' },
  { value: 'other_platform', label: 'Another digital platform' },
  { value: 'mixed',         label: 'Mixed — depends on the buyer' },
];

export async function submitLead(payload: LeadSubmission): Promise<{ ok: true; id?: string } | { ok: false; error: string }> {
  if (!isSupabaseConfigured) {
    await new Promise((r) => setTimeout(r, 400));
    return { ok: true };
  }

  const { data, error } = await supabase.functions.invoke('submit-lead', {
    body: payload,
  });

  if (error) {
    const serverMsg = (data as { error?: string } | null)?.error;
    return { ok: false, error: serverMsg || error.message || 'Submission failed' };
  }

  if (data && typeof data === 'object' && 'error' in data) {
    return { ok: false, error: (data as { error: string }).error };
  }

  return { ok: true, id: (data as { id?: string } | null)?.id };
}
