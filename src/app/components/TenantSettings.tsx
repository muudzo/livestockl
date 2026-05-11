import { useEffect, useState } from 'react';
import { Loader2, Save, ShieldAlert, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useTenant } from '../../hooks/useTenant';
import { useTenantUpdate } from '../../hooks/useTenantUpdate';
import type { TenantConfig } from '../../lib/tenant';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Button } from './ui/button';

const FIELD_LIMITS: Record<keyof TenantConfig, { min: number; max: number; step: number }> = {
  commission_seller_pct:      { min: 0, max: 100,  step: 0.5 },
  commission_buyer_pct:       { min: 0, max: 100,  step: 0.5 },
  reserve_required:           { min: 0, max: 1,    step: 1   },
  dispute_window_days:        { min: 0, max: 30,   step: 1   },
  lot_fee_usd:                { min: 0, max: 1000, step: 1   },
  anti_shill_window_seconds:  { min: 0, max: 60,   step: 1   },
  default_currency:           { min: 0, max: 0,    step: 0   },
};

/**
 * Per-tenant settings page. Operators see editable form; everyone else gets
 * a read-only view of the same data. Replaces the SQL editor for the most
 * common operational changes: commission %, lot fee, dispute window,
 * anti-shill rules.
 */
export function TenantSettings() {
  const navigate = useNavigate();
  const { tenant, role, loading } = useTenant();
  const updateMut = useTenantUpdate();

  const canEdit = role === 'admin' || role === 'operator';
  const isAdmin = role === 'admin';

  const [draftConfig, setDraftConfig] = useState<TenantConfig | null>(null);
  const [draftName, setDraftName] = useState('');
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    if (tenant) {
      setDraftConfig(tenant.config);
      setDraftName(tenant.name);
    }
  }, [tenant?.id]);

  if (loading || !tenant || !draftConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const dirty =
    JSON.stringify(draftConfig) !== JSON.stringify(tenant.config) ||
    (isAdmin && draftName !== tenant.name);

  const handleSave = async () => {
    const patch: Parameters<typeof updateMut.mutateAsync>[0] = {
      tenantId: tenant.id,
      config: draftConfig,
    };
    if (isAdmin && draftName !== tenant.name) patch.name = draftName;
    await updateMut.mutateAsync(patch);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  const updateConfig = <K extends keyof TenantConfig>(key: K, value: TenantConfig[K]) => {
    setDraftConfig((cur) => (cur ? { ...cur, [key]: value } : cur));
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
            Tenant settings
          </h1>
          <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mt-0.5">
            {tenant.slug} · {role ?? 'guest'}
          </p>
        </div>
      </div>

      {!canEdit && (
        <div className="flex items-start gap-2 p-3 rounded border border-foreground/10 bg-foreground/[0.02]">
          <ShieldAlert className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
          <p className="text-[12px] text-muted-foreground">
            View-only. Only tenant operators and admins can edit auction mechanics.
          </p>
        </div>
      )}

      {/* Identity */}
      <Section title="Identity">
        <Field label="Display name" htmlFor="tenant-name">
          <Input
            id="tenant-name"
            value={isAdmin ? draftName : tenant.name}
            onChange={(e) => setDraftName(e.target.value)}
            disabled={!isAdmin}
            maxLength={120}
          />
          {!isAdmin && (
            <p className="text-[10px] text-muted-foreground mt-1">Admin-only field.</p>
          )}
        </Field>
        <Field label="Slug (URL identifier)">
          <Input value={tenant.slug} disabled />
          <p className="text-[10px] text-muted-foreground mt-1">
            Immutable. Contact support to change.
          </p>
        </Field>
      </Section>

      {/* Commission */}
      <Section title="Commission split">
        <Field label="Seller commission %" htmlFor="seller-pct">
          <NumberInput
            id="seller-pct"
            value={draftConfig.commission_seller_pct}
            onChange={(v) => updateConfig('commission_seller_pct', v)}
            disabled={!canEdit}
            limits={FIELD_LIMITS.commission_seller_pct}
            suffix="%"
          />
        </Field>
        <Field label="Buyer commission %" htmlFor="buyer-pct">
          <NumberInput
            id="buyer-pct"
            value={draftConfig.commission_buyer_pct}
            onChange={(v) => updateConfig('commission_buyer_pct', v)}
            disabled={!canEdit}
            limits={FIELD_LIMITS.commission_buyer_pct}
            suffix="%"
          />
        </Field>
      </Section>

      {/* Operational rules */}
      <Section title="Auction mechanics">
        <Field label="Lot fee" htmlFor="lot-fee">
          <NumberInput
            id="lot-fee"
            value={draftConfig.lot_fee_usd}
            onChange={(v) => updateConfig('lot_fee_usd', v)}
            disabled={!canEdit}
            limits={FIELD_LIMITS.lot_fee_usd}
            prefix="US$"
          />
        </Field>
        <Field label="Dispute window (days)" htmlFor="dispute">
          <NumberInput
            id="dispute"
            value={draftConfig.dispute_window_days}
            onChange={(v) => updateConfig('dispute_window_days', v)}
            disabled={!canEdit}
            limits={FIELD_LIMITS.dispute_window_days}
          />
        </Field>
        <Field label="Anti-shill window (seconds)" htmlFor="shill">
          <NumberInput
            id="shill"
            value={draftConfig.anti_shill_window_seconds}
            onChange={(v) => updateConfig('anti_shill_window_seconds', v)}
            disabled={!canEdit}
            limits={FIELD_LIMITS.anti_shill_window_seconds}
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            Minimum gap between bids by the same user.
          </p>
        </Field>
        <Field label="Reserve required" htmlFor="reserve">
          <div className="flex items-center gap-3">
            <Switch
              id="reserve"
              checked={draftConfig.reserve_required}
              onCheckedChange={(v) => updateConfig('reserve_required', v)}
              disabled={!canEdit}
            />
            <span className="text-[12px] text-muted-foreground">
              {draftConfig.reserve_required ? 'Sellers must set a reserve price' : 'Reserve is optional'}
            </span>
          </div>
        </Field>
      </Section>

      {/* Save bar */}
      {canEdit && (
        <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-background border-t border-foreground/5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground">
              {dirty ? 'Unsaved changes' : 'No changes'}
            </p>
            <div className="flex items-center gap-2">
              {savedToast && (
                <span className="text-[11px] font-bold text-emerald-700">Saved</span>
              )}
              {updateMut.isError && (
                <span className="text-[11px] font-bold text-red-700">
                  {(updateMut.error as Error)?.message ?? 'Save failed'}
                </span>
              )}
              <Button
                onClick={handleSave}
                disabled={!dirty || updateMut.isPending}
                size="sm"
              >
                {updateMut.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save changes
              </Button>
            </div>
          </div>
        </div>
      )}
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

function NumberInput({
  id,
  value,
  onChange,
  disabled,
  limits,
  prefix,
  suffix,
}: {
  id?: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  limits: { min: number; max: number; step: number };
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {prefix && (
        <span className="text-[11px] font-mono text-muted-foreground">{prefix}</span>
      )}
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        value={value}
        min={limits.min}
        max={limits.max}
        step={limits.step}
        disabled={disabled}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) {
            onChange(Math.min(limits.max, Math.max(limits.min, v)));
          }
        }}
        className="font-mono"
      />
      {suffix && (
        <span className="text-[11px] font-mono text-muted-foreground">{suffix}</span>
      )}
    </div>
  );
}

export default TenantSettings;
