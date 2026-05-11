/**
 * Placeholder for /operators/request-access until Slice 2 (lead capture form)
 * lands. Today: a coherent "talk to us" page with a mailto fallback so every
 * CTA on the marketing surface resolves to *something* rather than a 404.
 *
 * Replace contents with <LeadForm /> in Slice 2.
 */
export function RequestAccessStub() {
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
          Talk to us{' '}
          <span className="italic" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 90" }}>
            about your floor.
          </span>
        </h1>
        <p className="mt-8 max-w-[58ch] text-[18px] leading-[1.6] text-ink-700">
          We're choosing six pilot auction houses for 2026 and we work
          closely with each. The full request form lands here next week.
          Until then, email us — same outcome, faster.
        </p>

        <div className="mt-12 border-y border-ink-900/15 py-10">
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink-500">
            Email
          </div>
          <a
            href="mailto:dev@paynow.co.zw?subject=ZimLivestock%20%E2%80%93%20pilot%20auction%20house%20enquiry&body=Auction%20house%20name%3A%0AContact%20person%3A%0APhone%3A%0AAverage%20lots%20per%20week%3A%0ACurrent%20payment%20method%3A%0ABiggest%20friction%20today%3A"
            className="mt-3 inline-block font-display text-[28px] tracking-[-0.005em] text-ink-900 underline decoration-ring-red decoration-2 underline-offset-6 transition-colors hover:text-ring-red sm:text-[36px]"
          >
            dev@paynow.co.zw
          </a>
          <p className="mt-5 max-w-[56ch] text-[14px] leading-[1.65] text-ink-700">
            Useful to include: your auction house name, town, average lots
            per week, current payment method, and the single biggest
            friction on your floor today. We reply within two working days.
          </p>
        </div>

        <p className="mt-8 max-w-[58ch] text-[13px] leading-[1.6] text-ink-500">
          What happens next: a 30-minute discovery call, on Google Meet or
          WhatsApp video, with one of us. We walk through your auction
          mechanics, the rules you want enforced, and what a configured
          ZimLivestock tenant for you would look like. No commitment.
        </p>
      </div>
    </section>
  );
}

export default RequestAccessStub;
