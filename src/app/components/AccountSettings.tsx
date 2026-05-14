import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Loader2, Save, ArrowLeft, Wallet } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

interface ProfileDraft {
  first_name: string;
  last_name: string;
  phone: string;
  paynow_merchant_id: string;
}

const EMPTY_DRAFT: ProfileDraft = {
  first_name: '',
  last_name: '',
  phone: '',
  paynow_merchant_id: '',
};

export function AccountSettings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user?.id && isSupabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone, email, paynow_merchant_id')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const [draft, setDraft] = useState<ProfileDraft>(EMPTY_DRAFT);
  const [merchantIdError, setMerchantIdError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setDraft({
        first_name: profile.first_name ?? '',
        last_name: profile.last_name ?? '',
        phone: profile.phone ?? '',
        paynow_merchant_id: profile.paynow_merchant_id ?? '',
      });
    }
  }, [profile]);

  const dirty = profile
    ? draft.first_name !== (profile.first_name ?? '') ||
      draft.last_name !== (profile.last_name ?? '') ||
      draft.phone !== (profile.phone ?? '') ||
      draft.paynow_merchant_id !== (profile.paynow_merchant_id ?? '')
    : false;

  const validateMerchantId = (value: string): string | null => {
    if (!value) return null;
    if (!/^[0-9]{1,12}$/.test(value)) {
      return 'Must be a digit string up to 12 characters (e.g. 23997).';
    }
    return null;
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const err = validateMerchantId(draft.paynow_merchant_id);
      if (err) throw new Error(err);
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: draft.first_name.trim(),
          last_name: draft.last_name.trim(),
          phone: draft.phone.trim(),
          paynow_merchant_id: draft.paynow_merchant_id.trim() || null,
        } as never)
        .eq('id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Account saved');
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Save failed');
    },
  });

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleMerchantIdChange = (value: string) => {
    setDraft((d) => ({ ...d, paynow_merchant_id: value }));
    setMerchantIdError(validateMerchantId(value));
  };

  return (
    <div className="p-4 pb-24 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="w-9 h-9 flex items-center justify-center rounded hover:bg-foreground/[0.04] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight leading-tight truncate">
            Account
          </h1>
          <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mt-0.5">
            {profile.email}
          </p>
        </div>
      </div>

      {/* Identity */}
      <Section title="Identity">
        <Field label="First name" htmlFor="first-name">
          <Input
            id="first-name"
            value={draft.first_name}
            onChange={(e) => setDraft((d) => ({ ...d, first_name: e.target.value }))}
            maxLength={80}
          />
        </Field>
        <Field label="Last name" htmlFor="last-name">
          <Input
            id="last-name"
            value={draft.last_name}
            onChange={(e) => setDraft((d) => ({ ...d, last_name: e.target.value }))}
            maxLength={80}
          />
        </Field>
        <Field label="Phone" htmlFor="phone">
          <Input
            id="phone"
            value={draft.phone}
            onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
            inputMode="tel"
            maxLength={32}
          />
        </Field>
        <Field label="Email">
          <Input value={profile.email} disabled />
          <p className="text-[10px] text-muted-foreground mt-1">
            Contact support to change email.
          </p>
        </Field>
      </Section>

      {/* Payout */}
      <Section title="Payout">
        <div className="flex items-start gap-2 p-3 rounded border border-foreground/10 bg-foreground/[0.02]">
          <Wallet className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            Sellers receive payouts via Paynow merchant-transfer. Set your
            Paynow merchant ID so settlement can route directly to your
            Paynow account — no bank details needed, no funds held on
            platform.
          </p>
        </div>
        <Field label="Paynow merchant ID" htmlFor="merchant-id">
          <Input
            id="merchant-id"
            value={draft.paynow_merchant_id}
            onChange={(e) => handleMerchantIdChange(e.target.value)}
            placeholder="e.g. 23997"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={12}
            className="font-mono"
            aria-invalid={!!merchantIdError}
            aria-describedby={merchantIdError ? 'merchant-id-error' : 'merchant-id-help'}
          />
          {merchantIdError ? (
            <p id="merchant-id-error" className="text-[10px] text-red-700 mt-1">
              {merchantIdError}
            </p>
          ) : (
            <p id="merchant-id-help" className="text-[10px] text-muted-foreground mt-1">
              Find this in your Paynow merchant dashboard under Integrations.
              Leave blank if you don't sell yet — you can fill it later.
            </p>
          )}
        </Field>
      </Section>

      {/* Save bar */}
      <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-background border-t border-foreground/5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">
            {dirty ? 'Unsaved changes' : 'No changes'}
          </p>
          <Button
            onClick={() => saveMut.mutate()}
            disabled={!dirty || saveMut.isPending || !!merchantIdError}
            size="sm"
          >
            {saveMut.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground border-b border-foreground/5 pb-1.5">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-[11px] font-medium">
        {label}
      </Label>
      {children}
    </div>
  );
}

export default AccountSettings;
