import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import {
  submitLead,
  LOTS_OPTIONS,
  PAYMENT_OPTIONS,
  type LeadSubmission,
  type LotsPerWeek,
  type PaymentRail,
} from '../../../lib/leads';

/**
 * /operators/request-access — the real lead form (replaces RequestAccessStub).
 *
 * Editorial design matching the rest of the operators surface. Single-column,
 * generous spacing, no card. Submit fires the submit-lead edge function which
 * inserts into public.leads + sends a notification email if Resend is wired.
 *
 * Honeypot field "website" is hidden from real users via sr-only positioning
 * but bots will fill it; the server silently 200s on those submissions.
 */
export function LeadForm() {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return <Confirmation />;
  }

  return <Form onSuccess={() => setSubmitted(true)} />;
}

function Form({ onSuccess }: { onSuccess: () => void }) {
  const [auction_house_name, setHouseName] = useState('');
  const [town, setTown] = useState('');
  const [contact_name, setContactName] = useState('');
  const [contact_phone, setContactPhone] = useState('');
  const [contact_email, setContactEmail] = useState('');
  const [lots_per_week, setLots] = useState<LotsPerWeek | ''>('');
  const [current_payment_rail, setRail] = useState<PaymentRail | ''>('');
  const [biggest_friction, setFriction] = useState('');
  const [website, setWebsite] = useState(''); // honeypot

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (!lots_per_week || !current_payment_rail) {
      setError('Please pick a lots-per-week and a current payment method.');
      return;
    }

    const payload: LeadSubmission = {
      auction_house_name,
      contact_name,
      contact_phone,
      contact_email,
      town: town || undefined,
      lots_per_week,
      current_payment_rail,
      biggest_friction,
      website: website || undefined,
    };

    setSubmitting(true);
    const result = await submitLead(payload);
    setSubmitting(false);

    if (result.ok) {
      onSuccess();
    } else {
      setError(result.error);
    }
  };

  return (
    <section className="bg-kraft-100">
      <div className="mx-auto max-w-3xl px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-ring-red">
          By invitation · 2026 pilot cohort
        </div>
        <h1
          className="mt-6 font-display text-[44px] leading-[1.02] tracking-[-0.015em] text-ink-900 sm:text-[68px]"
          style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 40" }}
        >
          Tell us about{' '}
          <span className="italic" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 90" }}>
            your floor.
          </span>
        </h1>
        <p className="mt-8 max-w-[58ch] text-[18px] leading-[1.6] text-ink-700">
          A short form. Six fields plus your story. We read every submission
          and reply within two working days. No bots, no nurture sequences —
          one of us will write back.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-14 space-y-12 border-t border-ink-900/15 pt-12"
          noValidate
        >
          {/* Honeypot — visually hidden, accessible to bots */}
          <div
            aria-hidden
            className="absolute -left-[9999px] h-px w-px overflow-hidden"
            tabIndex={-1}
          >
            <label>
              Website
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </label>
          </div>

          <Group eyebrow="01 · The yard">
            <Field
              label="Auction house name"
              required
              value={auction_house_name}
              onChange={setHouseName}
              placeholder="e.g. Mvurwi Livestock Sales"
              maxLength={200}
            />
            <Field
              label="Town or district"
              value={town}
              onChange={setTown}
              placeholder="e.g. Mvurwi, Mashonaland Central"
              maxLength={80}
            />
          </Group>

          <Group eyebrow="02 · The contact">
            <Field
              label="Your name"
              required
              value={contact_name}
              onChange={setContactName}
              placeholder="Full name"
              maxLength={120}
              autoComplete="name"
            />
            <Field
              label="Phone"
              required
              type="tel"
              value={contact_phone}
              onChange={setContactPhone}
              placeholder="+263 77 123 4567 — WhatsApp preferred"
              maxLength={32}
              autoComplete="tel"
              inputMode="tel"
            />
            <Field
              label="Email"
              required
              type="email"
              value={contact_email}
              onChange={setContactEmail}
              placeholder="you@yourhouse.co.zw"
              maxLength={200}
              autoComplete="email"
              inputMode="email"
            />
          </Group>

          <Group eyebrow="03 · Your operation">
            <RadioField
              label="How many lots a week, typically?"
              options={LOTS_OPTIONS}
              value={lots_per_week}
              onChange={(v) => setLots(v as LotsPerWeek)}
            />
            <RadioField
              label="How do you take payment today?"
              options={PAYMENT_OPTIONS}
              value={current_payment_rail}
              onChange={(v) => setRail(v as PaymentRail)}
            />
          </Group>

          <Group eyebrow="04 · Your story">
            <TextareaField
              label="What's the single biggest friction on your floor today?"
              helper="Write as much or as little as you like. The more specific, the better the call we have."
              required
              value={biggest_friction}
              onChange={setFriction}
              maxLength={1200}
              placeholder="e.g. We lose half our potential bidders at the deposit gate. Cash handling at cash-out is a daily headache. Buyers in Mutare can't reach us."
              rows={6}
            />
          </Group>

          {error && (
            <div
              role="alert"
              className="border border-ring-red/40 bg-ring-red/[0.04] px-4 py-3 font-mono text-[12px] text-ring-red"
            >
              {error}
            </div>
          )}

          <div className="flex items-baseline justify-between gap-6 border-t border-ink-900/15 pt-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">
              We reply within two working days.
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 bg-ink-900 px-6 py-3.5 font-mono text-[12px] uppercase tracking-[0.18em] text-kraft-50 transition-colors hover:bg-ring-red focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring-red disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Sending
                </>
              ) : (
                <>
                  Send request <span aria-hidden>→</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function Confirmation() {
  return (
    <section className="bg-kraft-100">
      <div className="mx-auto max-w-3xl px-6 pt-24 pb-32 sm:pt-32">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-ring-red">
          Received · thank you
        </div>
        <h1
          className="mt-6 font-display text-[44px] leading-[1.02] tracking-[-0.015em] text-ink-900 sm:text-[64px]"
          style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 40" }}
        >
          We'll be in touch{' '}
          <span className="italic" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 90" }}>
            within two working days.
          </span>
        </h1>

        <div className="mt-12 space-y-6 border-y border-ink-900/15 py-12">
          <Step n="01" title="We read your submission">
            One of us — not a sales bot — reads what you sent within a business day.
          </Step>
          <Step n="02" title="We reply, by email or WhatsApp">
            We propose a 30-minute discovery call. You pick the channel. Same outcome either way.
          </Step>
          <Step n="03" title="If we're a fit, you become a pilot tenant">
            We waive setup, configure your tenant in your name, and walk your operators through the first auction day.
          </Step>
        </div>

        <p className="mt-10 max-w-[58ch] text-[15px] leading-[1.7] text-ink-700">
          If you don't hear from us in two working days, email{' '}
          <a
            href="mailto:tatenda@paynow.co.zw"
            className="text-ink-900 underline decoration-ring-red/60 decoration-1 underline-offset-3 hover:decoration-ring-red"
          >
            tatenda@paynow.co.zw
          </a>{' '}
          directly. The form is new — bugs are possible.
        </p>
      </div>
    </section>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-5">
      <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-500">{n}</span>
      <div>
        <h3 className="font-display text-[20px] leading-[1.3] text-ink-900">{title}</h3>
        <p className="mt-1.5 max-w-[58ch] text-[14px] leading-[1.65] text-ink-700">{children}</p>
      </div>
    </div>
  );
}

// ── Form primitives ───────────────────────────────────────────────────────

function Group({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-6">
      <legend className="mb-2 font-mono text-[10px] uppercase tracking-[0.24em] text-ring-red">
        {eyebrow}
      </legend>
      {children}
    </fieldset>
  );
}

function Field({
  label,
  value,
  onChange,
  required = false,
  type = 'text',
  placeholder,
  maxLength,
  autoComplete,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
  maxLength?: number;
  autoComplete?: string;
  inputMode?: 'text' | 'tel' | 'email' | 'numeric' | 'decimal';
}) {
  return (
    <label className="block">
      <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">
        {label}
        {!required && <span className="ml-1 normal-case tracking-normal text-ink-500/70">(optional)</span>}
      </span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete={autoComplete}
        inputMode={inputMode}
        className="mt-2 block w-full border-b border-ink-900/25 bg-transparent py-3 font-body text-[18px] text-ink-900 placeholder:text-ink-500/50 focus:border-ring-red focus:outline-none"
      />
    </label>
  );
}

function TextareaField({
  label,
  helper,
  value,
  onChange,
  required = false,
  placeholder,
  maxLength,
  rows = 4,
}: {
  label: string;
  helper?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
}) {
  const remaining = maxLength != null ? Math.max(0, maxLength - value.length) : null;
  return (
    <label className="block">
      <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">{label}</span>
      {helper && (
        <span className="mt-1.5 block max-w-[60ch] text-[13px] leading-[1.55] text-ink-700">
          {helper}
        </span>
      )}
      <textarea
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        className="mt-3 block w-full border border-ink-900/20 bg-kraft-50 px-4 py-3 font-body text-[17px] leading-[1.55] text-ink-900 placeholder:text-ink-500/50 focus:border-ring-red focus:outline-none"
      />
      {remaining != null && (
        <span
          className={`mt-1 block text-right font-mono text-[10px] ${
            remaining < 50 ? 'text-ring-red' : 'text-ink-500'
          }`}
        >
          {remaining} characters left
        </span>
      )}
    </label>
  );
}

function RadioField<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ value: T; label: string }>;
  value: T | '';
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">
        {label}
      </legend>
      <div className="mt-3 grid grid-cols-1 gap-px overflow-hidden border border-ink-900/15 bg-ink-900/15 sm:grid-cols-2">
        {options.map((opt) => {
          const checked = value === opt.value;
          return (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-center gap-3 bg-kraft-50 px-4 py-3.5 transition-colors hover:bg-kraft-100 ${
                checked ? 'bg-kraft-100' : ''
              }`}
            >
              <input
                type="radio"
                name={label}
                value={opt.value}
                checked={checked}
                onChange={() => onChange(opt.value)}
                className="h-3.5 w-3.5 accent-ring-red"
              />
              <span className={`text-[14px] leading-[1.4] ${checked ? 'font-medium text-ink-900' : 'text-ink-700'}`}>
                {opt.label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export default LeadForm;
