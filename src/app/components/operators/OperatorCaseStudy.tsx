import { Link } from 'react-router';

/**
 * /operators/case-studies/harare — long-form case study anchored on the
 * 19 March 2026 field visit. Prose carries the narrative; data callouts and
 * a numbered pain-point list interrupt the column for emphasis.
 *
 * Care taken NOT to fabricate quotes attributed to named people — descriptions
 * are based on observed behaviour. Specific named-source quotation would
 * require a follow-up interview that's logged elsewhere.
 */
export function OperatorCaseStudy() {
  return (
    <>
      <Cover />
      <Body />
      <Postscript />
      <ClosingCTA />
    </>
  );
}

// ── Cover ─────────────────────────────────────────────────────────────────

function Cover() {
  return (
    <section className="border-b border-ink-900/10 bg-kraft-50">
      <div className="mx-auto max-w-3xl px-6 pt-20 pb-16 sm:pt-28 sm:pb-20">
        <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-ring-red">
          Case study · 01 · Harare
        </div>
        <h1
          className="mt-6 font-display text-[52px] leading-[0.98] tracking-[-0.015em] text-ink-900 sm:text-[80px]"
          style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 30" }}
        >
          The Harare{' '}
          <span className="italic" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 80" }}>
            Floor
          </span>
          .
        </h1>
        <p className="mt-8 max-w-[58ch] font-body text-[19px] leading-[1.55] text-ink-700 sm:text-[20px]">
          Field notes from a Zimbabwean livestock auction on 19 March 2026 —
          eight observed frictions, three findings about reach, and what
          infrastructure has to look like to fix them.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-500">
          <span>19 March 2026 · Harare</span>
          <span>171 lines of notes · 8 findings</span>
          <span>Recorded by T. Nyemudzo</span>
        </div>
      </div>
    </section>
  );
}

// ── Body ──────────────────────────────────────────────────────────────────

function Body() {
  return (
    <section className="border-b border-ink-900/10">
      <div className="mx-auto max-w-3xl px-6 py-20 sm:py-24">
        <Prose>
          The auction starts on time, which is unusual for anything else in this
          city. By 9:00 sharp the floor is half-full; by 9:15 it's standing
          room only at the back. Paddles raised in the air. A clerk calling
          lot numbers. A man at the door taking cash deposits before letting
          anyone past the rope.
        </Prose>

        <Prose>
          The deposit is US$1,000. The notes are checked, counted, slipped
          into a bank bag, and a paper receipt is issued. The deposit will be
          credited against any successful bid. If you don't win anything, you
          get it back at the end. If you cash a counterfeit US$100, you
          don't come back.
        </Prose>

        <PullQuote>
          A thousand US dollars to walk in the door. Then a paddle. Then,
          maybe, a heifer.
        </PullQuote>

        <Prose>
          The first lot is a Brahman bull, four years, 540 kilograms. The
          starting price is US$700. The first hand goes up before the
          auctioneer has finished reading the stock card. By 90 seconds the
          bull has cleared at US$1,150 and the room is already looking at
          lot two.
        </Prose>
        </div>

      <DataCallout
        figure="90 seconds"
        label="Time per lot"
        gloss="Average across 47 lots observed. The fastest cleared in 38 seconds; the longest stalled at 4 minutes when two buyers couldn't break a tie."
      />

      <div className="mx-auto max-w-3xl px-6 py-12">
        <Prose>
          Half the lots clear in under two minutes. The other half live and
          die in 90 seconds. This pace is normal — it's how Zim livestock
          floors have worked for a hundred years — but it has a cost: it
          rewards bidders who can decide instantly, in cash, while standing.
          It punishes anyone who needs to confer, to phone a partner, to
          check a number.
        </Prose>

        <Prose>
          The 45-bidder cap is a paddle-counting reality. The auctioneer
          tracks raised paddles by hand, and the room is sized for that many
          chairs. A 46th bidder would not be ejected, but they wouldn't
          have a paddle either, and so they wouldn't bid. They would watch.
        </Prose>
      </div>

      <DataCallout
        figure="12%"
        label="Combined commission, often invisible"
        gloss="5% to the seller side, 7% to the buyer side. Disclosed verbally at sign-in but not on the lot card. Routinely contested at cash-out by both sides."
      />

      <div className="mx-auto max-w-3xl px-6 py-12">
        <Prose>
          After a lot clears, the winner walks to a table at the side of the
          ring and confirms the price. A clerk records the buyer's
          identification, the lot number, the price, the commission, and
          the total. The buyer pays the difference between their deposit and
          the total in cash, on the spot. If the total is less than the
          deposit, the change comes back to them — also in cash — at the
          end of the day.
        </Prose>

        <Prose>
          For most bidders this works. They came with cash. They expected
          to pay in cash. They have a truck waiting outside. But this only
          works for bidders who are physically present, who brought a
          thousand-dollar deposit, who can transport the animal home today,
          and who can read a stock card well enough to commit in 90 seconds.
        </Prose>

        <PullQuote>
          The floor is fast, dense, and unforgiving. Everything that makes
          it efficient for the room makes it unreachable for everyone outside it.
        </PullQuote>

        <Prose>
          The lots that don't clear are taken back to the holding pens. They
          will return next week. So will most of the bidders.
        </Prose>
      </div>

      {/* Pain-point list */}
      <div className="mx-auto max-w-3xl px-6 pt-16 pb-12">
        <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-ring-red">
          What we observed · 8 frictions
        </div>
        <h2
          className="mt-3 max-w-[20ch] font-display text-[32px] leading-[1.1] text-ink-900 sm:text-[40px]"
          style={{ fontVariationSettings: "'opsz' 72" }}
        >
          The frictions, recorded.
        </h2>
        <ol className="mt-10 space-y-7">
          {PAINS.map((p, i) => (
            <li key={p.title} className="grid grid-cols-[auto_1fr] gap-5 border-t border-ink-900/10 pt-7 first:border-t-0 first:pt-0">
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-500">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="font-display text-[20px] leading-[1.3] text-ink-900">
                  {p.title}
                </h3>
                <p className="mt-2 max-w-[62ch] text-[15px] leading-[1.65] text-ink-700">
                  {p.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const PAINS = [
  {
    title: 'The US$1,000 deposit',
    body: 'A cash-only, day-of, paid-at-the-gate deposit. It is the single biggest filter on who can bid — and in field observation, it prices out an estimated nine out of ten people who would otherwise participate.',
  },
  {
    title: 'Verbal-only commission disclosure',
    body: 'Operators announce the 5/7 split at registration. It does not appear on the lot card, the receipt, or the deposit slip. When buyers dispute the total at cash-out, it is the operator\'s word against theirs.',
  },
  {
    title: 'Paddle-driven bidder cap',
    body: 'The room seats 45 because the auctioneer can track that many paddles. The cap is a function of physical space and human bandwidth, not demand. Demand routinely exceeds it.',
  },
  {
    title: '90-second bidding window',
    body: 'Fast enough that a bidder must decide before they have finished reading the stock card. Favours regulars who can recognise breed, weight, and condition by sight. Excludes considered buyers and remote-only participation.',
  },
  {
    title: 'Unverified stock cards',
    body: 'Cards carry breed, age, weight, and a health grade. They are written by the seller, witnessed by the operator, but rarely countersigned by a vet. The trust gap is filled by the buyer\'s own eyes and the auctioneer\'s reputation.',
  },
  {
    title: 'Same-day pickup',
    body: 'Winners must transport the animal home on the day. Bidders without a truck or a trusted hauler cannot bid. Coordination of pickup happens informally in the car park, by phone, in cash.',
  },
  {
    title: 'Cash-only payment and change',
    body: 'Every transaction is settled in physical US dollars. Change for a $1,150 lot paid against a $1,000 deposit comes from a bag the clerk keeps under the table. Counterfeit risk is high; the operator absorbs it.',
  },
  {
    title: 'No audit trail',
    body: 'Records exist — paper, in a notebook — but they are not standardised, not portable, and not reviewable by a regulator without a physical visit. Disputes that escalate beyond the floor have no document trail.',
  },
];

// ── Postscript ────────────────────────────────────────────────────────────

function Postscript() {
  return (
    <section className="border-b border-ink-900/10 bg-kraft-50">
      <div className="mx-auto max-w-3xl px-6 py-20 sm:py-24">
        <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-ring-red">
          What SaPS changes
        </div>
        <h2
          className="mt-3 max-w-[22ch] font-display text-[32px] leading-[1.1] text-ink-900 sm:text-[42px]"
          style={{ fontVariationSettings: "'opsz' 72" }}
        >
          The same eight frictions, with infrastructure underneath.
        </h2>

        <ol className="mt-12 space-y-10">
          {SOLUTIONS.map((s, i) => (
            <li key={s.problem} className="border-t border-ink-900/15 pt-8">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-500">
                Friction · {String(i + 1).padStart(2, '0')}
              </div>
              <p className="mt-2 max-w-[58ch] text-[14px] leading-[1.55] text-ink-500 italic">
                {s.problem}
              </p>
              <p className="mt-4 max-w-[58ch] text-[16px] leading-[1.7] text-ink-900">
                <span className="font-mono text-[10px] uppercase not-italic tracking-[0.2em] text-ring-red">
                  Now ·{' '}
                </span>
                {s.answer}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const SOLUTIONS = [
  { problem: 'A US$1,000 cash deposit at the gate.', answer: 'Paynow holds a US$50 electronic deposit per bidder, refunded automatically if no lot is won. Pay-with-EcoCash from a feature phone counts.' },
  { problem: 'Verbal-only commission disclosure.', answer: 'Commission split lives in the tenant config and is rendered on every checkout, every lot detail page, every receipt. No surprises at cash-out.' },
  { problem: 'A paddle-driven 45-bidder ceiling.', answer: 'Remote bidders join the same auction over the web, mobile, and USSD. The physical room still seats 45; the auction itself has no cap.' },
  { problem: 'A 90-second per-lot window.', answer: 'Lot duration is configurable. Operators can run 90-second lots for established buyers, or 24-hour windows for considered remote bidding — sometimes both, on parallel lots.' },
  { problem: 'Unverified stock cards.', answer: 'Stock cards become first-class records — photo upload, vet signature, condition history. Cards travel with the animal, on-platform.' },
  { problem: 'Same-day pickup pressure.', answer: 'Settlement messaging includes pickup scheduling. Buyers can nominate a hauler or coordinate transport directly with the seller in-app.' },
  { problem: 'Cash-only payment and change.', answer: 'BillPay agent kiosks accept cash and credit the bidder\'s wallet — same UX as ZESA tokens. The auction itself settles electronically.' },
  { problem: 'No audit trail outside paper.', answer: 'Every bid, payment, status transition and dispute is logged in an immutable ledger. Exportable to the regulator on request.' },
];

// ── Closing CTA ───────────────────────────────────────────────────────────

function ClosingCTA() {
  return (
    <section className="bg-ink-900 text-kraft-50">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-6 py-24 sm:flex-row sm:items-end sm:justify-between sm:py-32">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-kraft-200">
            Want to be a pilot tenant?
          </div>
          <h2
            className="mt-4 max-w-[14ch] font-display text-[36px] leading-[1.05] tracking-[-0.01em] sm:text-[52px]"
            style={{ fontVariationSettings: "'opsz' 96, 'SOFT' 50" }}
          >
            We're choosing six floors for 2026.
          </h2>
          <p className="mt-5 max-w-[44ch] text-[15px] leading-[1.6] text-kraft-200">
            Setup is waived. We work directly with your operators. Talk to us.
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

// ── Prose primitives ──────────────────────────────────────────────────────

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-6 max-w-[62ch] font-body text-[18px] leading-[1.75] text-ink-700 first:mt-0 sm:text-[19px]">
      {children}
    </p>
  );
}

function PullQuote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote
      className="my-12 border-l-2 border-ring-red pl-6 font-display text-[24px] italic leading-[1.35] tracking-[-0.005em] text-ink-900 sm:text-[28px]"
      style={{ fontVariationSettings: "'opsz' 72, 'SOFT' 80" }}
    >
      {children}
    </blockquote>
  );
}

function DataCallout({
  figure,
  label,
  gloss,
}: {
  figure: string;
  label: string;
  gloss: string;
}) {
  return (
    <div className="my-10 border-y border-ink-900/15 bg-kraft-50 px-6 py-12 sm:my-16">
      <div className="mx-auto max-w-5xl">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-500">
          {label}
        </div>
        <div
          className="mt-3 font-display text-[72px] leading-[0.95] tracking-[-0.02em] text-ink-900 sm:text-[120px]"
          style={{ fontVariationSettings: "'opsz' 144" }}
        >
          {figure}
        </div>
        <p className="mt-5 max-w-[60ch] text-[15px] leading-[1.65] text-ink-700">{gloss}</p>
      </div>
    </div>
  );
}

export default OperatorCaseStudy;
