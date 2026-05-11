import { Fragment, useState } from 'react';
import { Link } from 'react-router';
import { ChevronDown, Check, Minus } from 'lucide-react';

/**
 * /operators/pricing — three tiers, comparison table, FAQ.
 *
 * Setup fee + monthly + transaction %. Each tier discloses what's included,
 * what's not, and the SLA tier. The point is to make pricing legible enough
 * that an operator can budget BEFORE the discovery call, not after.
 */
export function OperatorPricing() {
  return (
    <>
      <PricingHeader />
      <TierCards />
      <ComparisonTable />
      <FAQ />
      <ClosingCTA />
    </>
  );
}

function PricingHeader() {
  return (
    <section className="border-b border-ink-900/10">
      <div className="mx-auto max-w-6xl px-6 pt-20 pb-16 sm:pt-28 sm:pb-20">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-500">
          Pricing · MMXXVI
        </div>
        <h1
          className="mt-4 max-w-[18ch] font-display text-[48px] leading-[1.02] tracking-[-0.015em] text-ink-900 sm:text-[72px]"
          style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 30" }}
        >
          Three tiers. <span className="italic">No surprises.</span>
        </h1>
        <p className="mt-8 max-w-[58ch] text-[18px] leading-[1.6] text-ink-700">
          A one-time setup fee, a monthly subscription, and a share of each
          transaction. Setup includes the discovery call, configuration of
          your tenant, training for two operators, and a go-live week with
          us on the floor.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">
          <span>All prices in US$</span>
          <span>Annual contracts available with discount</span>
          <span className="hidden sm:inline">Setup waived for 2026 pilot tenants</span>
        </div>
      </div>
    </section>
  );
}

// ── Tier cards ────────────────────────────────────────────────────────────

interface Tier {
  name: string;
  tagline: string;
  setup: string;
  monthly: string;
  txn: string;
  bestFor: string;
  highlights: string[];
  recommended?: boolean;
}

const TIERS: Tier[] = [
  {
    name: 'Starter',
    tagline: 'For a first digital floor.',
    setup: 'US$ 500',
    monthly: 'US$ 200',
    txn: '1.5%',
    bestFor: 'Single auction floor, < 50 lots/week, 1–3 operators.',
    highlights: [
      '1 admin + 3 operator accounts',
      'EcoCash · OneMoney · Card',
      'Standard config UI (commission, dispute window, lot fee)',
      'Audit log + RLS isolation',
      'Email support, 48h response',
      '99.5% uptime SLA',
    ],
  },
  {
    name: 'Growth',
    tagline: 'Where most operators land.',
    setup: 'US$ 1,200',
    monthly: 'US$ 500',
    txn: '1.2%',
    bestFor: '100+ lots/week, multiple operators, contested lots common.',
    highlights: [
      'Everything in Starter',
      '3 admin + 10 operator accounts',
      'BillPay cash collection at agent kiosks',
      'Bisafe escrow on disputed lots',
      'WhatsApp Business support, 4h response',
      '99.9% uptime SLA',
      'Monthly business review with us',
    ],
    recommended: true,
  },
  {
    name: 'Enterprise',
    tagline: 'For co-ops & multi-site.',
    setup: 'Custom',
    monthly: 'from US$ 1,200',
    txn: 'custom',
    bestFor: 'Livestock unions, cooperatives, multi-yard operators.',
    highlights: [
      'Everything in Growth',
      'Unlimited admin + operator accounts',
      'Custom subdomain + branding',
      'Public REST API + webhooks',
      'Dedicated customer success manager',
      '99.95% SLA with service credits',
      'Custom integrations on request',
    ],
  },
];

function TierCards() {
  return (
    <section className="border-b border-ink-900/10 bg-kraft-50">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <ul className="grid grid-cols-1 gap-px overflow-hidden border border-ink-900/15 bg-ink-900/15 lg:grid-cols-3">
          {TIERS.map((tier) => (
            <li
              key={tier.name}
              className={`relative flex flex-col bg-kraft-50 p-8 transition-colors hover:bg-kraft-100 ${
                tier.recommended ? 'lg:bg-kraft-100' : ''
              }`}
            >
              {tier.recommended && (
                <div className="absolute -top-px right-6 bg-ring-red px-2 py-1 font-mono text-[9px] uppercase tracking-[0.22em] text-kraft-50">
                  Most chosen
                </div>
              )}

              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-500">
                {tier.name}
              </div>
              <h3 className="mt-3 font-display text-[26px] leading-[1.15] text-ink-900">
                {tier.tagline}
              </h3>

              <div className="mt-8 space-y-1 border-y border-ink-900/15 py-6">
                <Row label="Setup" value={tier.setup} />
                <Row label="Monthly" value={tier.monthly} large />
                <Row label="Transaction" value={tier.txn} />
              </div>

              <p className="mt-6 max-w-[36ch] text-[13px] leading-[1.6] text-ink-700">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">
                  Best for ·{' '}
                </span>
                {tier.bestFor}
              </p>

              <ul className="mt-6 flex-1 space-y-2.5 border-t border-ink-900/10 pt-6">
                {tier.highlights.map((line) => (
                  <li key={line} className="flex items-start gap-2 text-[13px] leading-[1.55] text-ink-700">
                    <Check className="mt-1 h-3 w-3 shrink-0 text-ring-red" strokeWidth={2.5} />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>

              <Link
                to="/operators/request-access"
                className={`mt-8 inline-flex items-center justify-center gap-2 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring-red ${
                  tier.recommended
                    ? 'bg-ink-900 text-kraft-50 hover:bg-ring-red'
                    : 'border border-ink-900 text-ink-900 hover:bg-ink-900 hover:text-kraft-50'
                }`}
              >
                Request access <span aria-hidden>→</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Row({ label, value, large = false }: { label: string; value: string; large?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">
        {label}
      </span>
      <span
        className={`font-mono text-ink-900 tabular-nums ${
          large ? 'text-[24px] sm:text-[28px]' : 'text-[14px]'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

// ── Comparison table ──────────────────────────────────────────────────────

interface Capability {
  group: string;
  feature: string;
  starter: boolean | string;
  growth: boolean | string;
  enterprise: boolean | string;
}

const COMPARISON: Capability[] = [
  // Limits
  { group: 'Accounts', feature: 'Admin accounts', starter: '1', growth: '3', enterprise: 'Unlimited' },
  { group: 'Accounts', feature: 'Operator accounts', starter: '3', growth: '10', enterprise: 'Unlimited' },
  { group: 'Accounts', feature: 'Branded subdomain', starter: false, growth: false, enterprise: true },

  // Payments
  { group: 'Payments', feature: 'EcoCash · OneMoney · Card', starter: true, growth: true, enterprise: true },
  { group: 'Payments', feature: 'BillPay cash kiosk collection', starter: false, growth: true, enterprise: true },
  { group: 'Payments', feature: 'Bisafe escrow on contested lots', starter: false, growth: true, enterprise: true },
  { group: 'Payments', feature: 'Multi-currency (USD + ZWG)', starter: 'USD only', growth: 'USD only', enterprise: 'Custom' },

  // Operations
  { group: 'Operations', feature: 'Settings UI (commission, dispute, lot fee)', starter: true, growth: true, enterprise: true },
  { group: 'Operations', feature: 'Anti-shill rules', starter: true, growth: true, enterprise: true },
  { group: 'Operations', feature: 'Audit log (immutable)', starter: true, growth: true, enterprise: true },
  { group: 'Operations', feature: 'Public REST API + webhooks', starter: false, growth: false, enterprise: true },

  // Support
  { group: 'Support', feature: 'Channel', starter: 'Email', growth: 'WhatsApp + email', enterprise: 'CSM + WhatsApp' },
  { group: 'Support', feature: 'Response time (business hours)', starter: '48h', growth: '4h', enterprise: '1h' },
  { group: 'Support', feature: 'Uptime SLA', starter: '99.5%', growth: '99.9%', enterprise: '99.95% + credits' },
  { group: 'Support', feature: 'Monthly business review', starter: false, growth: true, enterprise: true },
];

function ComparisonTable() {
  // Group rows by section for visual scanning
  const groups = COMPARISON.reduce((acc, row) => {
    if (!acc[row.group]) acc[row.group] = [];
    acc[row.group].push(row);
    return acc;
  }, {} as Record<string, Capability[]>);

  return (
    <section className="border-b border-ink-900/10">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-500">
          Compared, line by line
        </div>
        <h2
          className="mt-4 max-w-[20ch] font-display text-[32px] leading-[1.1] text-ink-900 sm:text-[42px]"
          style={{ fontVariationSettings: "'opsz' 72" }}
        >
          What sits inside each tier.
        </h2>

        <div className="mt-12 overflow-x-auto">
          <table className="min-w-[640px] w-full border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-ink-900/30">
                <th className="py-4 pr-4 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-500">
                  Capability
                </th>
                <th className="py-4 px-4 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-ink-900">
                  Starter
                </th>
                <th className="py-4 px-4 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-ring-red">
                  Growth
                </th>
                <th className="py-4 pl-4 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-ink-900">
                  Enterprise
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groups).map(([group, rows]) => (
                <Fragment key={group}>
                  <tr className="border-t border-ink-900/10">
                    <td colSpan={4} className="pt-8 pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ring-red">
                      {group}
                    </td>
                  </tr>
                  {rows.map((row) => (
                    <tr key={`${group}-${row.feature}`} className="border-t border-ink-900/10">
                      <td className="py-3.5 pr-4 text-[14px] leading-[1.5] text-ink-700">
                        {row.feature}
                      </td>
                      <Cell value={row.starter} />
                      <Cell value={row.growth} highlight />
                      <Cell value={row.enterprise} />
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Cell({ value, highlight = false }: { value: boolean | string; highlight?: boolean }) {
  const bg = highlight ? 'bg-kraft-50' : '';
  if (typeof value === 'boolean') {
    return (
      <td className={`py-3.5 px-4 text-center ${bg}`}>
        {value ? (
          <Check className="mx-auto h-3.5 w-3.5 text-ring-red" strokeWidth={2.5} />
        ) : (
          <Minus className="mx-auto h-3.5 w-3.5 text-ink-500/50" strokeWidth={1.5} />
        )}
      </td>
    );
  }
  return (
    <td className={`py-3.5 px-4 text-center font-mono text-[12px] tabular-nums text-ink-900 ${bg}`}>
      {value}
    </td>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: 'How long does setup take?',
    a: 'A discovery call, then 5–7 working days from the moment we agree on your config to your operators logging in. The Growth tier go-live includes one of us on the floor with you for the first auction day.',
  },
  {
    q: 'Do you hold our money?',
    a: 'No. Funds settle directly into your Paynow merchant account. We never touch them. Bisafe escrow (Growth/Enterprise) is a Paynow product — we wire the integration; Paynow holds the funds.',
  },
  {
    q: 'What happens if Paynow has an outage?',
    a: 'Bidding continues on-platform; payment initiation falls through to a manual confirmation flow. The audit log and ledger remain intact. This is the same model Paynow recommends for its own merchant tools.',
  },
  {
    q: 'Can we migrate from another platform?',
    a: 'Yes. We import listings, bidder profiles, and historical settlements via CSV. Audit-log preservation is a one-time pre-go-live engagement, billed at setup.',
  },
  {
    q: 'Is there a long-term contract?',
    a: 'Month-to-month by default. Annual contracts get a 15% discount but are not required. No early-termination penalty on monthly plans.',
  },
  {
    q: 'Can we white-label it entirely?',
    a: 'On Enterprise, yes — your domain, your branding, your name. On Starter and Growth, your tenant lives at app.zimlivestock.co.zw/t/your-yard with your config and operators, but the platform name stays visible in the footer.',
  },
];

function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section className="border-b border-ink-900/10 bg-kraft-50">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-500">
          Questions we get
        </div>
        <h2
          className="mt-4 max-w-[24ch] font-display text-[32px] leading-[1.1] text-ink-900 sm:text-[42px]"
          style={{ fontVariationSettings: "'opsz' 72" }}
        >
          Before you book the call.
        </h2>

        <ul className="mt-12 divide-y divide-ink-900/15 border-y border-ink-900/15">
          {FAQ_ITEMS.map((item, i) => {
            const open = openIdx === i;
            return (
              <li key={item.q}>
                <button
                  onClick={() => setOpenIdx(open ? null : i)}
                  aria-expanded={open}
                  className="flex w-full items-baseline justify-between gap-6 py-6 text-left transition-colors hover:text-ring-red"
                >
                  <span className="font-display text-[19px] leading-[1.35] text-ink-900 sm:text-[22px]">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`mt-1 h-4 w-4 shrink-0 text-ink-700 transition-transform ${
                      open ? 'rotate-180' : ''
                    }`}
                    strokeWidth={1.5}
                  />
                </button>
                {open && (
                  <div className="pb-6">
                    <p className="max-w-[60ch] text-[16px] leading-[1.7] text-ink-700">{item.a}</p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

// ── Closing CTA ───────────────────────────────────────────────────────────

function ClosingCTA() {
  return (
    <section className="bg-ink-900 text-kraft-50">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-6 py-24 sm:flex-row sm:items-end sm:justify-between sm:py-28">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-kraft-200">
            One more thing
          </div>
          <h2
            className="mt-4 max-w-[18ch] font-display text-[36px] leading-[1.05] tracking-[-0.01em] sm:text-[48px]"
            style={{ fontVariationSettings: "'opsz' 96, 'SOFT' 50" }}
          >
            Setup is{' '}
            <span className="italic" style={{ fontVariationSettings: "'opsz' 96, 'SOFT' 90" }}>
              waived
            </span>{' '}
            for 2026 pilot tenants.
          </h2>
          <p className="mt-5 max-w-[44ch] text-[15px] leading-[1.6] text-kraft-200">
            We're choosing the first 6 auction houses we work with. If
            you're one of them, you skip the setup fee — and we pay close
            attention.
          </p>
        </div>

        <Link
          to="/operators/request-access"
          className="inline-flex items-center gap-2 bg-kraft-50 px-6 py-3.5 font-mono text-[12px] uppercase tracking-[0.18em] text-ink-900 transition-colors hover:bg-ring-red hover:text-kraft-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-kraft-50"
        >
          Request access <span aria-hidden>→</span>
        </Link>
      </div>
    </section>
  );
}

export default OperatorPricing;
