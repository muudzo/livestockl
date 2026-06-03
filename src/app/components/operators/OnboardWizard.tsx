import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Loader2, ArrowRight, ArrowLeft, Check, ShieldAlert } from 'lucide-react';
import {
  verifyOnboardToken,
  provisionTenant,
  slugify,
  isValidSlug,
  type VerifiedLead,
  type VerifyError,
  type ProvisionPayload,
} from '../../../lib/onboard';

/**
 * /operators/onboard?token=<uuid>
 *
 * The wizard that converts an approved lead into a live tenant. 5 steps:
 *   01 Welcome / confirm   — show what was submitted, confirm you're the right person
 *   02 Tenant identity     — display name + URL slug
 *   03 Auction mechanics   — commission, reserve, dispute window, lot fee, anti-shill
 *   04 Admin account       — email, password, name, phone (prefilled from lead)
 *   05 Review + submit     — final summary, single button to provision
 *
 * The token in the URL gates everything; we verify it on mount and refuse to
 * render the form until the lead is loaded. On submit, provision-tenant
 * creates the auth user + tenant + membership + closes the lead. We then
 * redirect to /auth with a hint to sign in.
 */
export function OnboardWizard() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const [loading, setLoading] = useState(true);
  const [verifyError, setVerifyError] = useState<VerifyError | null>(null);
  const [lead, setLead] = useState<VerifiedLead | null>(null);
  const [success, setSuccess] = useState<{ slug: string; admin_email: string; redirect: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setVerifyError('missing_token');
      setLoading(false);
      return;
    }
    verifyOnboardToken(token).then((r) => {
      if (cancelled) return;
      if (r.ok && r.lead) {
        setLead(r.lead);
      } else {
        setVerifyError(r.error ?? 'invalid_token');
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [token]);

  if (loading) {
    return (
      <section className="bg-kraft-100">
        <div className="mx-auto max-w-3xl px-6 py-32 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-ink-700" />
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-500">
            Verifying invitation
          </p>
        </div>
      </section>
    );
  }

  if (verifyError || !lead) {
    return <VerifyFailure error={verifyError ?? 'invalid_token'} />;
  }

  if (success) {
    return <SuccessScreen {...success} />;
  }

  return (
    <Wizard
      lead={lead}
      token={token}
      onSuccess={(result) => setSuccess(result)}
    />
  );
}

// ── Success ───────────────────────────────────────────────────────────────

function SuccessScreen({ slug, admin_email, redirect }: { slug: string; admin_email: string; redirect: string }) {
  return (
    <section className="bg-kraft-100">
      <div className="mx-auto max-w-3xl px-6 pt-20 pb-32 sm:pt-28">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-ring-red">
          Tenant created · welcome to ZimLivestock
        </div>
        <h1
          className="mt-6 max-w-[14ch] font-display text-[48px] leading-[1.02] tracking-[-0.015em] text-ink-900 sm:text-[72px]"
          style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 40" }}
        >
          You're live.
        </h1>
        <p className="mt-8 max-w-[58ch] text-[18px] leading-[1.6] text-ink-700">
          Your tenant is provisioned. Sign in below with the admin credentials
          you just set up and you'll land on your tenant settings page, where
          you can invite operators, tune mechanics, or start listing lots.
        </p>

        <div className="mt-12 space-y-3 border-y border-ink-900/15 py-8 font-mono text-[13px]">
          <Line label="Tenant URL"><span className="text-ink-900">/t/{slug}</span></Line>
          <Line label="Admin email"><span className="text-ink-900">{admin_email}</span></Line>
          <Line label="Lands you on"><span className="text-ink-900">{redirect}</span></Line>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 bg-ink-900 px-6 py-3.5 font-mono text-[12px] uppercase tracking-[0.18em] text-kraft-50 transition-colors hover:bg-ring-red"
          >
            Sign in to your tenant <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            to="/operators"
            className="font-body text-[14px] text-ink-700 underline decoration-ink-500/40 decoration-1 underline-offset-4 hover:text-ring-red"
          >
            Back to operators
          </Link>
        </div>
      </div>
    </section>
  );
}

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 tabular-nums">
      <span className="text-[10px] uppercase tracking-[0.22em] text-ink-500">{label}</span>
      <span>{children}</span>
    </div>
  );
}

// ── Verify failure states ─────────────────────────────────────────────────

function VerifyFailure({ error }: { error: VerifyError }) {
  const { title, body } = useMemo(() => {
    switch (error) {
      case 'missing_token':
        return { title: 'No invitation in this link', body: 'The onboarding URL is missing its token. If you arrived here from an email, the link may be malformed — please try clicking it again.' };
      case 'token_expired':
        return { title: 'This invitation has expired', body: 'Onboarding links are valid for 14 days. Email us and we\'ll send a fresh one.' };
      case 'already_onboarded':
        return { title: 'This invitation has already been used', body: 'A tenant has already been created from this link. Sign in with the admin email you set up.' };
      case 'lead_dropped':
        return { title: 'This invitation is no longer active', body: 'We\'ve archived this lead. If you\'d still like to onboard, email us and we\'ll restart the conversation.' };
      case 'network':
        return { title: 'Couldn\'t reach the server', body: 'Check your connection and refresh. If the problem persists, email us.' };
      default:
        return { title: 'This invitation isn\'t valid', body: 'The token in this link wasn\'t recognised. Please use the most recent link from your email, or contact us.' };
    }
  }, [error]);

  return (
    <section className="bg-kraft-100">
      <div className="mx-auto max-w-3xl px-6 py-32 text-center">
        <ShieldAlert className="mx-auto h-7 w-7 text-ring-red" strokeWidth={1.5} />
        <h1 className="mt-6 font-display text-[36px] leading-[1.1] text-ink-900 sm:text-[48px]" style={{ fontVariationSettings: "'opsz' 96" }}>
          {title}
        </h1>
        <p className="mt-5 mx-auto max-w-[46ch] text-[16px] leading-[1.65] text-ink-700">
          {body}
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <a
            href="mailto:tatenda@paynow.co.zw?subject=Onboarding%20link%20issue"
            className="inline-flex items-center gap-2 bg-ink-900 px-5 py-3 font-mono text-[12px] uppercase tracking-[0.18em] text-kraft-50 transition-colors hover:bg-ring-red"
          >
            Email us
          </a>
          <Link
            to="/operators"
            className="inline-flex items-center font-body text-[14px] text-ink-700 underline decoration-ink-500/40 decoration-1 underline-offset-4 hover:text-ring-red"
          >
            Back to operators →
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Wizard ────────────────────────────────────────────────────────────────

type Step = 0 | 1 | 2 | 3 | 4;
const STEP_LABELS = ['Welcome', 'Identity', 'Mechanics', 'Admin', 'Review'];

interface WizardState {
  // Identity
  tenant_name: string;
  slug: string;
  slugTouched: boolean;
  // Mechanics
  commission_seller_pct: number;
  commission_buyer_pct: number;
  reserve_required: boolean;
  dispute_window_days: number;
  lot_fee_usd: number;
  anti_shill_window_seconds: number;
  // Admin
  admin_email: string;
  admin_password: string;
  admin_first_name: string;
  admin_last_name: string;
  admin_phone: string;
}

function initialState(lead: VerifiedLead): WizardState {
  const [first, ...rest] = (lead.contact_name || '').split(' ');
  return {
    tenant_name: lead.auction_house_name,
    slug: slugify(lead.auction_house_name),
    slugTouched: false,
    commission_seller_pct: 5,
    commission_buyer_pct: 7,
    reserve_required: false,
    dispute_window_days: 3,
    lot_fee_usd: 0,
    anti_shill_window_seconds: 5,
    admin_email: lead.contact_email,
    admin_password: '',
    admin_first_name: first || '',
    admin_last_name: rest.join(' '),
    admin_phone: lead.contact_phone,
  };
}

function Wizard({
  lead,
  token,
  onSuccess,
}: {
  lead: VerifiedLead;
  token: string;
  onSuccess: (result: { slug: string; admin_email: string; redirect: string }) => void;
}) {
  const [step, setStep] = useState<Step>(0);
  const [state, setState] = useState<WizardState>(() => initialState(lead));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-update slug from tenant_name until user explicitly edits the slug
  useEffect(() => {
    if (!state.slugTouched) {
      setState((s) => ({ ...s, slug: slugify(s.tenant_name) }));
    }
  }, [state.tenant_name, state.slugTouched]);

  const set = <K extends keyof WizardState>(key: K, value: WizardState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const canAdvance = (s: Step): boolean => {
    if (s === 1) return state.tenant_name.trim().length >= 2 && isValidSlug(state.slug);
    if (s === 2) return (
      state.commission_seller_pct >= 0 && state.commission_seller_pct <= 100 &&
      state.commission_buyer_pct >= 0 && state.commission_buyer_pct <= 100 &&
      state.dispute_window_days >= 0 && state.dispute_window_days <= 30 &&
      state.lot_fee_usd >= 0 && state.lot_fee_usd <= 10000 &&
      state.anti_shill_window_seconds >= 0 && state.anti_shill_window_seconds <= 60
    );
    if (s === 3) return (
      state.admin_email.includes('@') &&
      state.admin_password.length >= 8 &&
      state.admin_first_name.trim().length > 0 &&
      state.admin_last_name.trim().length > 0 &&
      state.admin_phone.trim().length >= 6
    );
    return true;
  };

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    const payload: ProvisionPayload = {
      token,
      slug: state.slug,
      tenant_name: state.tenant_name.trim(),
      config: {
        commission_seller_pct: state.commission_seller_pct,
        commission_buyer_pct: state.commission_buyer_pct,
        reserve_required: state.reserve_required,
        dispute_window_days: state.dispute_window_days,
        lot_fee_usd: state.lot_fee_usd,
        anti_shill_window_seconds: state.anti_shill_window_seconds,
        default_currency: 'USD',
      },
      admin_email: state.admin_email.trim().toLowerCase(),
      admin_password: state.admin_password,
      admin_first_name: state.admin_first_name.trim(),
      admin_last_name: state.admin_last_name.trim(),
      admin_phone: state.admin_phone.trim(),
    };

    const result = await provisionTenant(payload);
    setSubmitting(false);

    if (result.ok) {
      onSuccess({ slug: result.data.slug, admin_email: result.data.admin_email, redirect: result.data.redirect });
    } else {
      setError(humanizeProvisionError(result.error));
    }
  };

  return (
    <section className="bg-kraft-100">
      <div className="mx-auto max-w-3xl px-6 pt-16 pb-24 sm:pt-20">
        <ProgressBar step={step} />

        <div className="mt-12">
          {step === 0 && <StepWelcome lead={lead} />}
          {step === 1 && <StepIdentity state={state} set={set} />}
          {step === 2 && <StepMechanics state={state} set={set} />}
          {step === 3 && <StepAdmin state={state} set={set} />}
          {step === 4 && <StepReview state={state} lead={lead} />}
        </div>

        {error && (
          <div role="alert" className="mt-8 border border-ring-red/40 bg-ring-red/[0.04] px-4 py-3 font-mono text-[12px] text-ring-red">
            {error}
          </div>
        )}

        <div className="mt-12 flex items-center justify-between gap-4 border-t border-ink-900/15 pt-6">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1) as Step)}
            disabled={step === 0 || submitting}
            className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-700 underline decoration-ink-500/40 decoration-1 underline-offset-4 transition-colors hover:text-ring-red disabled:opacity-30 disabled:cursor-not-allowed disabled:no-underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(4, s + 1) as Step)}
              disabled={!canAdvance(step)}
              className="inline-flex items-center gap-2 bg-ink-900 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-kraft-50 transition-colors hover:bg-ring-red disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 bg-ring-red px-6 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-kraft-50 transition-colors hover:bg-ring-red-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Provisioning
                </>
              ) : (
                <>
                  Create tenant
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function humanizeProvisionError(code: string): string {
  switch (code) {
    case 'slug_taken': return 'That URL slug is already used by another tenant. Pick a different one in step 02.';
    case 'email_already_registered': return 'That admin email already has an account on the platform. Use a different email for the new admin, or contact us.';
    case 'invalid_token': return 'The invitation token is no longer valid. Email us for a fresh link.';
    case 'token_expired': return 'This invitation expired. Email us for a fresh link.';
    case 'already_onboarded': return 'A tenant has already been created from this invitation.';
    default: return code;
  }
}

// ── Progress bar ──────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: Step }) {
  return (
    <div className="space-y-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-500">
        Step {step + 1} of {STEP_LABELS.length} · {STEP_LABELS[step]}
      </div>
      <div className="grid grid-cols-5 gap-1">
        {STEP_LABELS.map((_, i) => (
          <div
            key={i}
            className={`h-[3px] ${i <= step ? 'bg-ring-red' : 'bg-ink-900/15'}`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Step 0: Welcome ───────────────────────────────────────────────────────

function StepWelcome({ lead }: { lead: VerifiedLead }) {
  return (
    <div>
      <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-ring-red">
        Welcome · let's set up your tenant
      </div>
      <h1
        className="mt-4 max-w-[18ch] font-display text-[44px] leading-[1.02] tracking-[-0.015em] text-ink-900 sm:text-[64px]"
        style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 40" }}
      >
        About 10 minutes. <span className="italic">No call needed.</span>
      </h1>
      <p className="mt-6 max-w-[58ch] text-[17px] leading-[1.65] text-ink-700">
        This wizard turns your submission into a live tenant on ZimLivestock.
        Here's what we have on file. If anything's wrong, email us before you
        continue — it's much easier to fix now than after we provision.
      </p>

      <dl className="mt-12 grid grid-cols-1 gap-y-5 border-y border-ink-900/15 py-8 sm:grid-cols-[12rem_1fr]">
        <Row label="Auction house">{lead.auction_house_name}</Row>
        {lead.town && <Row label="Town">{lead.town}</Row>}
        <Row label="Contact">{lead.contact_name}</Row>
        <Row label="Email">{lead.contact_email}</Row>
        <Row label="Phone">{lead.contact_phone}</Row>
      </dl>

      <p className="mt-8 max-w-[58ch] text-[14px] leading-[1.6] text-ink-500">
        We'll ask you to: (1) confirm a display name and URL slug, (2) tune
        the auction mechanics, (3) set up your admin account, (4) review,
        and finally create the tenant.
      </p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-500">{label}</dt>
      <dd className="text-[15px] text-ink-900">{children}</dd>
    </>
  );
}

// ── Step 1: Identity ──────────────────────────────────────────────────────

function StepIdentity({ state, set }: { state: WizardState; set: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void }) {
  const slugValid = isValidSlug(state.slug);
  return (
    <div>
      <StepHeader eyebrow="Step 02 · Identity" title="Your tenant's name and URL." />
      <p className="mt-4 max-w-[58ch] text-[15px] leading-[1.65] text-ink-700">
        The display name shows up everywhere — receipts, emails, the operator
        dashboard. The slug becomes part of the URL: <span className="font-mono">app.zimlivestock.co.zw/t/<span className="text-ring-red">{state.slug || 'your-slug'}</span></span>
      </p>

      <div className="mt-10 space-y-8">
        <FieldText
          label="Display name"
          value={state.tenant_name}
          onChange={(v) => set('tenant_name', v)}
          placeholder="e.g. Mvurwi Livestock Sales"
          maxLength={120}
          required
        />
        <FieldText
          label="URL slug"
          value={state.slug}
          onChange={(v) => {
            set('slug', v.toLowerCase().replace(/[^a-z0-9-]/g, ''));
            set('slugTouched', true);
          }}
          placeholder="mvurwi-livestock-sales"
          maxLength={64}
          required
          helper="Lowercase letters, digits, hyphens. 2–64 characters. Cannot be changed later."
        />
        {!slugValid && state.slug.length > 0 && (
          <p className="text-[12px] text-ring-red font-mono">
            Slug must be 2–64 lowercase letters, digits, or hyphens.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Step 2: Mechanics ─────────────────────────────────────────────────────

function StepMechanics({ state, set }: { state: WizardState; set: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void }) {
  return (
    <div>
      <StepHeader eyebrow="Step 03 · Auction mechanics" title="How your floor will run." />
      <p className="mt-4 max-w-[58ch] text-[15px] leading-[1.65] text-ink-700">
        Sensible defaults are pre-filled from physical Zim auction floor norms.
        Tune them now — or accept the defaults and adjust later from the tenant
        settings page.
      </p>

      <div className="mt-10 space-y-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <FieldNumber
            label="Seller commission %"
            value={state.commission_seller_pct}
            onChange={(v) => set('commission_seller_pct', v)}
            min={0} max={100} step={0.5} suffix="%"
            helper="Default 5%."
          />
          <FieldNumber
            label="Buyer commission %"
            value={state.commission_buyer_pct}
            onChange={(v) => set('commission_buyer_pct', v)}
            min={0} max={100} step={0.5} suffix="%"
            helper="Default 7%."
          />
        </div>

        <FieldNumber
          label="Lot fee (US$)"
          value={state.lot_fee_usd}
          onChange={(v) => set('lot_fee_usd', v)}
          min={0} max={10000} step={1} prefix="US$"
          helper="Flat fee per lot listed. Set to 0 if you don't charge."
        />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <FieldNumber
            label="Dispute window (days)"
            value={state.dispute_window_days}
            onChange={(v) => set('dispute_window_days', v)}
            min={0} max={30} step={1}
            helper="How long buyers can contest a settlement."
          />
          <FieldNumber
            label="Anti-shill window (seconds)"
            value={state.anti_shill_window_seconds}
            onChange={(v) => set('anti_shill_window_seconds', v)}
            min={0} max={60} step={1}
            helper="Minimum gap between bids by the same user."
          />
        </div>

        <FieldToggle
          label="Require sellers to set a reserve price"
          checked={state.reserve_required}
          onChange={(v) => set('reserve_required', v)}
          helper="When on, every listing must declare a minimum acceptable price."
        />
      </div>
    </div>
  );
}

// ── Step 3: Admin ─────────────────────────────────────────────────────────

function StepAdmin({ state, set }: { state: WizardState; set: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void }) {
  const passOk = state.admin_password.length >= 8;
  return (
    <div>
      <StepHeader eyebrow="Step 04 · Admin account" title="Your first login." />
      <p className="mt-4 max-w-[58ch] text-[15px] leading-[1.65] text-ink-700">
        This is your tenant's first admin account. You can add more operators
        and admins later from the tenant settings page. Email and phone come
        from your submission — change them now if you prefer different credentials.
      </p>

      <div className="mt-10 space-y-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <FieldText label="First name" value={state.admin_first_name} onChange={(v) => set('admin_first_name', v)} required autoComplete="given-name" />
          <FieldText label="Last name" value={state.admin_last_name} onChange={(v) => set('admin_last_name', v)} required autoComplete="family-name" />
        </div>
        <FieldText label="Email" value={state.admin_email} onChange={(v) => set('admin_email', v)} type="email" required autoComplete="email" inputMode="email" />
        <FieldText label="Phone" value={state.admin_phone} onChange={(v) => set('admin_phone', v)} type="tel" required autoComplete="tel" inputMode="tel" helper="WhatsApp preferred. Format: +263 77 123 4567." />
        <FieldText
          label="Password"
          value={state.admin_password}
          onChange={(v) => set('admin_password', v)}
          type="password"
          required
          autoComplete="new-password"
          helper={passOk ? 'Looks good.' : 'At least 8 characters.'}
        />
      </div>
    </div>
  );
}

// ── Step 4: Review ────────────────────────────────────────────────────────

function StepReview({ state, lead }: { state: WizardState; lead: VerifiedLead }) {
  return (
    <div>
      <StepHeader eyebrow="Step 05 · Review" title="One last look before we create it." />
      <p className="mt-4 max-w-[58ch] text-[15px] leading-[1.65] text-ink-700">
        Hit <span className="font-mono">Create tenant</span> when you're happy.
        After that, the tenant is live — sign in with your new admin credentials.
      </p>

      <div className="mt-10 space-y-10 border-y border-ink-900/15 py-10">
        <ReviewBlock heading="Identity">
          <ReviewLine label="Lead">{lead.auction_house_name}</ReviewLine>
          <ReviewLine label="Display name">{state.tenant_name}</ReviewLine>
          <ReviewLine label="URL">
            <span className="font-mono">/t/{state.slug}</span>
          </ReviewLine>
        </ReviewBlock>

        <ReviewBlock heading="Mechanics">
          <ReviewLine label="Commission">
            {state.commission_seller_pct}% seller · {state.commission_buyer_pct}% buyer
          </ReviewLine>
          <ReviewLine label="Lot fee">US$ {state.lot_fee_usd}</ReviewLine>
          <ReviewLine label="Dispute window">{state.dispute_window_days} days</ReviewLine>
          <ReviewLine label="Anti-shill window">{state.anti_shill_window_seconds} seconds</ReviewLine>
          <ReviewLine label="Reserve required">{state.reserve_required ? 'Yes' : 'No'}</ReviewLine>
        </ReviewBlock>

        <ReviewBlock heading="Admin account">
          <ReviewLine label="Name">{state.admin_first_name} {state.admin_last_name}</ReviewLine>
          <ReviewLine label="Email">{state.admin_email}</ReviewLine>
          <ReviewLine label="Phone">{state.admin_phone}</ReviewLine>
          <ReviewLine label="Password">••••••••</ReviewLine>
        </ReviewBlock>
      </div>
    </div>
  );
}

function ReviewBlock({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-ring-red">{heading}</h3>
      <dl className="mt-3 grid grid-cols-1 gap-y-2 sm:grid-cols-[10rem_1fr]">{children}</dl>
    </div>
  );
}

function ReviewLine({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-500">{label}</dt>
      <dd className="text-[14px] text-ink-900">{children}</dd>
    </>
  );
}

// ── Step header (shared) ──────────────────────────────────────────────────

function StepHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <>
      <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-ring-red">
        {eyebrow}
      </div>
      <h2
        className="mt-3 max-w-[22ch] font-display text-[36px] leading-[1.05] tracking-[-0.01em] text-ink-900 sm:text-[52px]"
        style={{ fontVariationSettings: "'opsz' 96" }}
      >
        {title}
      </h2>
    </>
  );
}

// ── Field primitives ──────────────────────────────────────────────────────

function FieldText({
  label,
  value,
  onChange,
  type = 'text',
  required,
  placeholder,
  maxLength,
  autoComplete,
  inputMode,
  helper,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  autoComplete?: string;
  inputMode?: 'text' | 'tel' | 'email' | 'numeric' | 'decimal';
  helper?: string;
}) {
  return (
    <label className="block">
      <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete={autoComplete}
        inputMode={inputMode}
        className="mt-2 block w-full border-b-2 border-ink-900/25 bg-transparent py-3 font-body text-[18px] text-ink-900 placeholder:text-ink-500/50 focus:border-ring-red focus:outline-none focus-visible:ring-2 focus-visible:ring-ring-red/40"
      />
      {helper && <p className="mt-2 text-[12px] leading-[1.5] text-ink-500">{helper}</p>}
    </label>
  );
}

function FieldNumber({
  label,
  value,
  onChange,
  min,
  max,
  step,
  prefix,
  suffix,
  helper,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  prefix?: string;
  suffix?: string;
  helper?: string;
}) {
  return (
    <label className="block">
      <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">{label}</span>
      <div className="mt-2 flex items-baseline gap-2 border-b border-ink-900/25 py-3">
        {prefix && <span className="font-mono text-[14px] text-ink-500">{prefix}</span>}
        <input
          type="number"
          inputMode="decimal"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)));
          }}
          className="flex-1 bg-transparent font-mono text-[18px] text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring-red/40 rounded-sm"
        />
        {suffix && <span className="font-mono text-[14px] text-ink-500">{suffix}</span>}
      </div>
      {helper && <p className="mt-2 text-[12px] leading-[1.5] text-ink-500">{helper}</p>}
    </label>
  );
}

function FieldToggle({
  label,
  checked,
  onChange,
  helper,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  helper?: string;
}) {
  return (
    <div className="border-b border-ink-900/25 pb-4">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <span>
          <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">{label}</span>
          {helper && <span className="mt-1.5 block text-[12px] leading-[1.5] text-ink-700">{helper}</span>}
        </span>
        <span
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
            checked ? 'bg-ring-red border-ring-red' : 'bg-kraft-50 border-ink-900/30'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-kraft-50 shadow transition-transform ${
              checked ? 'translate-x-6 bg-kraft-50' : 'translate-x-1'
            }`}
          />
          {checked && <Check className="absolute left-1.5 h-3 w-3 text-kraft-50" strokeWidth={3} />}
        </span>
      </button>
    </div>
  );
}

export default OnboardWizard;
