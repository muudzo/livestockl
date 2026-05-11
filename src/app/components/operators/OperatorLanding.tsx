import { Link } from 'react-router';

/**
 * Public landing page at /operators — the SaPS pitch.
 *
 * Audience: Zimbabwean auction-house operators. Story arc:
 *   1. Hero ("auction infrastructure for the way Zim sells")
 *   2. The reality (3 numbers from field research)
 *   3. What SaPS is (thesis)
 *   4. Who it's for (3 archetypes)
 *   5. What you get (4 capability rows)
 *   6. Pricing preview
 *   7. Closing CTA
 *
 * Editorial restraint per the design specs — Fraunces display, Newsreader body,
 * Plex Mono callouts. No scroll animations. Hairline rules instead of background
 * changes between sections.
 */
export function OperatorLanding() {
  return (
    <>
      <Hero />
      <RealityBand />
      <ThesisSection />
      <WhoItsFor />
      <WhatYouGet />
      <PricingPreviewStrip />
      <ClosingCTA />
    </>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="border-b border-ink-900/10">
      <div className="mx-auto max-w-6xl px-6 pt-20 pb-24 sm:pt-28 sm:pb-32 lg:pt-36 lg:pb-44">
        <div className="flex items-baseline gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-500">
          <span className="inline-block h-px w-8 bg-ink-900/40" />
          For Zim auction houses · By invitation
        </div>

        <h1
          className="mt-10 max-w-[12ch] font-display text-[56px] leading-[0.95] tracking-[-0.015em] text-ink-900 sm:max-w-[14ch] sm:text-[88px] lg:max-w-[15ch] lg:text-[112px]"
          style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 30" }}
        >
          Auction
          <br />
          infrastructure
          <br />
          <span className="italic" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 80" }}>
            for the way
          </span>{' '}
          Zim sells.
        </h1>

        <p className="mt-10 max-w-[44ch] text-[19px] leading-[1.55] text-ink-700 sm:text-[20px]">
          From paddle to payment, in your name, on your floor. Modern rails,
          traditional mechanics. Built on Paynow, configured by you, run by
          your operators — not ours.
        </p>

        <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-4">
          <Link
            to="/operators/request-access"
            className="inline-flex items-center gap-2 bg-ink-900 px-6 py-3.5 font-mono text-[12px] uppercase tracking-[0.18em] text-kraft-50 transition-colors hover:bg-ring-red focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring-red"
          >
            Request access <span aria-hidden>→</span>
          </Link>
          <Link
            to="/operators/case-studies/harare"
            className="font-body text-[15px] text-ink-700 underline decoration-ink-500/40 decoration-1 underline-offset-4 transition-colors hover:text-ring-red hover:decoration-ring-red"
          >
            Read the Harare case study →
          </Link>
        </div>

        <div className="mt-16 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-ink-900/10 pt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">
          <span>Paynow Integration <span className="text-ink-900">#23997</span></span>
          <span>EcoCash · OneMoney · Card · BillPay</span>
          <span className="hidden sm:inline">Audited <span className="text-ink-900">2026-04-13</span></span>
        </div>
      </div>
    </section>
  );
}

// ── Reality stat band ─────────────────────────────────────────────────────

const REALITY_STATS: Array<{ figure: string; label: string; gloss: string }> = [
  {
    figure: 'US$1,000',
    label: 'Buyer deposit',
    gloss:
      'Cash deposit demanded at the gate of most physical auction houses. Prices out an estimated 90% of would-be bidders before the first lot.',
  },
  {
    figure: '12%',
    label: 'Combined commission',
    gloss:
      '5% to the seller side, 7% to the buyer side. Often invisible until cash-out, regularly contested at the floor.',
  },
  {
    figure: '45 / 90s',
    label: 'Bidders per session, seconds per lot',
    gloss:
      'Capacity ceiling of a typical paddle-driven Zim auction room. Lots clear in 90 seconds; missing a lot means waiting a week.',
  },
];

function RealityBand() {
  return (
    <section className="border-b border-ink-900/10 bg-kraft-50">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-ring-red">
          The reality, as recorded
        </div>
        <h2
          className="mt-4 max-w-[22ch] font-display text-[34px] leading-[1.1] tracking-[-0.01em] text-ink-900 sm:text-[42px]"
          style={{ fontVariationSettings: "'opsz' 72" }}
        >
          You already know these numbers. Your buyers do too.
        </h2>
        <p className="mt-5 max-w-[58ch] text-[17px] leading-[1.6] text-ink-700">
          Field-measured at a Harare auction floor, 19 March 2026. Same
          friction shows up in Mvurwi, Marondera, and Bulawayo.
        </p>

        <ul className="mt-12 grid grid-cols-1 gap-10 border-t border-ink-900/15 pt-10 sm:grid-cols-3">
          {REALITY_STATS.map(({ figure, label, gloss }) => (
            <li key={figure}>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-500">
                {label}
              </div>
              <div
                className="mt-3 font-display text-[52px] leading-none tracking-[-0.02em] text-ink-900 sm:text-[64px]"
                style={{ fontVariationSettings: "'opsz' 96" }}
              >
                {figure}
              </div>
              <p className="mt-4 max-w-[28ch] text-[14px] leading-[1.6] text-ink-700">
                {gloss}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ── Thesis ────────────────────────────────────────────────────────────────

function ThesisSection() {
  return (
    <section className="border-b border-ink-900/10">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-500">
              What ZimLivestock is, for an operator
            </div>
            <h2
              className="mt-5 max-w-[16ch] font-display text-[40px] leading-[1.05] tracking-[-0.01em] text-ink-900 sm:text-[56px]"
              style={{ fontVariationSettings: "'opsz' 96" }}
            >
              Software that runs your auction house, not just{' '}
              <span className="italic">sells tickets to it</span>.
            </h2>
          </div>

          <div className="space-y-5 text-[17px] leading-[1.7] text-ink-700">
            <p>
              ZimLivestock isn't a marketplace you list on. It's a configured
              deployment in your name — your subdomain or path, your rules,
              your rates, your operators.
            </p>
            <p>
              Lots get listed. Bids get placed in real time, atomically,
              against anti-shill rules you set. Payments settle through
              Paynow rails you already trust. Disputes get logged with the
              audit trail you can show a regulator.
            </p>
            <p>
              We handle the rails and the floor mechanics. You run the
              auction.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Who it's for ──────────────────────────────────────────────────────────

const ARCHETYPES = [
  {
    label: '01',
    title: 'Established saleyards',
    body:
      'Mvurwi, Marondera, Gweru, Bulawayo — floors moving 100+ lots a week looking to add a digital ring without ceding the physical one. Bidders attend in-person; remote buyers join via mobile.',
  },
  {
    label: '02',
    title: 'Cooperatives & livestock unions',
    body:
      'Member-owned floors that need transparent settlement, configurable commission split, and an auditable ledger every member can see.',
  },
  {
    label: '03',
    title: 'Mobile & regional operators',
    body:
      'Pop-up auctions in rural districts that need bidder vetting, payment rails, and reach without a fixed venue. EcoCash + USSD bidding for feature-phone buyers.',
  },
];

function WhoItsFor() {
  return (
    <section className="border-b border-ink-900/10 bg-kraft-50">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-500">
          Who it's built for
        </div>
        <h2
          className="mt-4 max-w-[20ch] font-display text-[34px] leading-[1.1] tracking-[-0.01em] text-ink-900 sm:text-[42px]"
          style={{ fontVariationSettings: "'opsz' 72" }}
        >
          Three kinds of operator, one platform.
        </h2>

        <ul className="mt-12 grid grid-cols-1 gap-px overflow-hidden border border-ink-900/15 bg-ink-900/15 sm:grid-cols-3">
          {ARCHETYPES.map(({ label, title, body }) => (
            <li
              key={label}
              className="flex flex-col gap-4 bg-kraft-50 p-8 transition-colors hover:bg-kraft-100"
            >
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-ring-red">
                {label}
              </div>
              <h3 className="font-display text-[22px] leading-[1.2] text-ink-900">
                {title}
              </h3>
              <p className="text-[15px] leading-[1.65] text-ink-700">{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ── What you get ──────────────────────────────────────────────────────────

const CAPABILITIES = [
  {
    eyebrow: 'Capability · 01',
    title: 'Branded tenant',
    body:
      'Your name on the URL, your config in the database. Commission split, dispute window, lot fee, anti-shill window, reserve handling — every operational rule lives in a settings UI your operators can tune. No SQL, no support ticket.',
    figure: '7%',
    figureLabel: 'Default buyer commission · editable per tenant',
  },
  {
    eyebrow: 'Capability · 02',
    title: 'Modern payment rails',
    body:
      'EcoCash, OneMoney, card, cash via BillPay agent kiosks. Funds route to your Paynow merchant ID — never held by us. Bisafe escrow available on Growth and Enterprise tiers, for high-value or contested lots.',
    figure: '4 rails',
    figureLabel: 'EcoCash · OneMoney · Card · BillPay',
  },
  {
    eyebrow: 'Capability · 03',
    title: 'Bidder vetting & anti-shill',
    body:
      'Identity tied to Paynow KYC. Configurable minimum-gap rule between same-bidder bids. Bidder history visible to operators. Block lists per tenant. Idempotency on every bid — double-clicks and stuck spinners don\'t double-bid.',
    figure: 'Atomic',
    figureLabel: 'Every bid via SECURITY DEFINER RPC · race-safe',
  },
  {
    eyebrow: 'Capability · 04',
    title: 'Audit, dispute, settlement',
    body:
      'Every bid, payment, status transition, and resolution lives in an immutable ledger. Dispute window configurable per tenant. The settlement ledger is exportable; you can show it to a buyer, a seller, or the regulator.',
    figure: '11 / 11',
    figureLabel: 'RLS isolation tests passing · audited 2026-04-13',
  },
];

function WhatYouGet() {
  return (
    <section className="border-b border-ink-900/10">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-500">
          What you get
        </div>
        <h2
          className="mt-4 max-w-[24ch] font-display text-[34px] leading-[1.1] tracking-[-0.01em] text-ink-900 sm:text-[42px]"
          style={{ fontVariationSettings: "'opsz' 72" }}
        >
          The capabilities, in plain language.
        </h2>

        <ol className="mt-16 space-y-20">
          {CAPABILITIES.map((cap, i) => (
            <li
              key={cap.title}
              className={`grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16 ${
                i % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''
              }`}
            >
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ring-red">
                  {cap.eyebrow}
                </div>
                <h3
                  className="mt-3 font-display text-[28px] leading-[1.15] tracking-[-0.005em] text-ink-900 sm:text-[34px]"
                  style={{ fontVariationSettings: "'opsz' 72" }}
                >
                  {cap.title}
                </h3>
                <p className="mt-5 max-w-[44ch] text-[16px] leading-[1.7] text-ink-700">
                  {cap.body}
                </p>
              </div>

              <div className="flex flex-col items-start justify-center border-l border-ink-900/15 pl-8 sm:pl-10">
                <div
                  className="font-display text-[56px] leading-[0.95] tracking-[-0.02em] text-ink-900 sm:text-[80px]"
                  style={{ fontVariationSettings: "'opsz' 96" }}
                >
                  {cap.figure}
                </div>
                <div className="mt-3 max-w-[28ch] font-mono text-[11px] uppercase tracking-[0.18em] leading-[1.6] text-ink-500">
                  {cap.figureLabel}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ── Pricing preview ───────────────────────────────────────────────────────

const PRICE_PREVIEW = [
  { tier: 'Starter', monthly: 'US$ 200', txn: '+ 1.5%', tagline: 'For a first floor.' },
  { tier: 'Growth', monthly: 'US$ 500', txn: '+ 1.2%', tagline: 'Most operators land here.', recommended: true },
  { tier: 'Enterprise', monthly: 'from US$ 1,200', txn: 'custom', tagline: 'Multi-site or co-op.' },
];

function PricingPreviewStrip() {
  return (
    <section className="border-b border-ink-900/10 bg-kraft-50">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <div className="flex items-end justify-between gap-6 border-b border-ink-900/15 pb-6">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-500">
              Pricing, at a glance
            </div>
            <h2
              className="mt-3 font-display text-[28px] leading-[1.1] text-ink-900 sm:text-[36px]"
              style={{ fontVariationSettings: "'opsz' 72" }}
            >
              Setup, monthly, and a transaction share.
            </h2>
          </div>
          <Link
            to="/operators/pricing"
            className="hidden font-body text-[14px] text-ink-700 underline decoration-ink-500/40 decoration-1 underline-offset-4 transition-colors hover:text-ring-red hover:decoration-ring-red sm:inline"
          >
            See the full tiers →
          </Link>
        </div>

        <ul className="mt-10 grid grid-cols-1 gap-px overflow-hidden border border-ink-900/15 bg-ink-900/15 sm:grid-cols-3">
          {PRICE_PREVIEW.map(({ tier, monthly, txn, tagline, recommended }) => (
            <li
              key={tier}
              className={`relative flex flex-col gap-3 p-8 transition-colors ${
                recommended ? 'bg-kraft-100 hover:bg-kraft-200/60' : 'bg-kraft-50 hover:bg-kraft-100'
              }`}
            >
              {recommended && (
                <div className="absolute -top-px right-6 bg-ring-red px-2 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-kraft-50">
                  Most chosen
                </div>
              )}
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-500">
                {tier}
              </div>
              <div
                className="font-display text-[36px] leading-none tracking-[-0.015em] text-ink-900 sm:text-[44px]"
                style={{ fontVariationSettings: "'opsz' 96" }}
              >
                {monthly}
              </div>
              <div className="font-mono text-[12px] text-ink-700">{txn} / transaction</div>
              <p className="mt-2 text-[14px] leading-[1.55] text-ink-700">{tagline}</p>
            </li>
          ))}
        </ul>

        <div className="mt-6 sm:hidden">
          <Link
            to="/operators/pricing"
            className="font-body text-[14px] text-ink-700 underline decoration-ink-500/40 decoration-1 underline-offset-4 hover:text-ring-red hover:decoration-ring-red"
          >
            See the full tiers →
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Closing CTA ───────────────────────────────────────────────────────────

function ClosingCTA() {
  return (
    <section className="bg-ink-900 text-kraft-50">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-6 py-24 sm:flex-row sm:items-end sm:justify-between sm:py-32">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-kraft-200">
            Next step
          </div>
          <h2
            className="mt-4 max-w-[14ch] font-display text-[40px] leading-[1.05] tracking-[-0.01em] sm:text-[56px]"
            style={{ fontVariationSettings: "'opsz' 96, 'SOFT' 50" }}
          >
            Talk to us.
            <br />
            <span className="italic" style={{ fontVariationSettings: "'opsz' 96, 'SOFT' 90" }}>
              By invitation, for now.
            </span>
          </h2>
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

export default OperatorLanding;
