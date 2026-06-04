# Go-to-Market — Demo Brief

> **Product:** ZimLivestock — software-as-a-professional-service for Zimbabwean livestock auction houses
> **Status:** v2.0  ·  **Date:** 2026-06-04  ·  **Companion:** [`gtm-strategy.md`](gtm-strategy.md) (full)

**One line:** ZimLivestock is the vertical software-and-service layer that runs a Zimbabwean auction floor — and routes every settlement onto Paynow's rails.

This is a SaPS (software-as-a-professional-service) business, not a SaaS one: customers are found at livestock-association meetings and won on a discovery conversation, not a self-serve signup. Growth is deliberately throttled to operations capacity — the ceiling is how many houses we can *run* well, not how many we can sign.

---

## The market

Zimbabwe has roughly **40–60 livestock auction houses** running regular sales, concentrated in Mashonaland, Matabeleland, and the Midlands. We are prying open a manual, cash-based, relationship-driven legacy system — so the constraint isn't demand, it's the difficulty of converting an incumbent and the human cost of running each house well. That makes this SaPS, not SaaS: 30–50 high-touch customers at high ACV, not 10,000 self-serve seats. Sales velocity is gated by ops capacity, by design.

---

## How we sell

**Year-1 acquisition channels, in priority order:**
1. **Founder-led BD** — Saturday on-floor visits to Tier A/B houses; one discovery call/week; 20% close. Year-1 target: **one paying house, deployed well, used as the reference** (not three signings).
2. **Paynow channel partnership** — positioned as Paynow's livestock vertical; Paynow BD refers prospects asking about EcoCash settlement. 5% rev-share on engagement + first-year retainer.
3. **ZLPA conference** — sponsor/speak on "digital infrastructure for the modern auction floor"; target 5 warm leads per appearance.

**Multi-channel reach is the accessibility answer** (and the moat vs. WhatsApp-group competitors). We meet the buyer wherever they are, with Paynow settlement behind every surface:

| Channel | Reaches | Status |
|---|---|---|
| **Web / PWA** | Smartphone buyers, diaspora, sellers | Live |
| **WhatsApp bot** (0773819300) | The buyer who lives in WhatsApp | Live |
| **USSD simulator** | Feature-phone bidders, no data | Live |
| **BillPay-as-biller** | Anyone on the Paynow/EcoCash biller menu | AUTH live; PAY pending Paynow registration |

A competitor has one channel and no settlement; we have four-plus channels, all funnelling GMV onto Paynow.

---

## Pricing at a glance

We don't publish a price list — quotes are bespoke after discovery. Lead with the engagement; never discount the retainer (it sets the future anchor).

| Tier | Engagement (one-off) | Retainer (monthly) | Sale-day GMV |
|---|---:|---:|---:|
| **A — Anchor house** | US$8,000 | US$1,500 | US$80–120k |
| **B — Mid-market** | US$6,000 | US$1,200 | US$40–80k |
| **C — Small / regional** | US$4,000 | US$900 | US$10–30k |
| **Pilot (any tier)** | US$5,000 *(disc.)* | US$1,000 for 90 days → tier rate | varies |

Across all tiers: **0.75% transaction surcharge** on settled GMV (on top of Paynow's fee), 12-month renewable commitment. Transport delivery is a new, base-case-excluded revenue surface.

---

## The honest numbers

This is a bootstrap, not a financed startup — there is no funding round to raise in Zimbabwe, and USD is scarce. So there is no founder salary line: the founder is an owner-operator whose **income is the operating surplus**. Conservative by necessity, not choice.

| | Year 1 | Year 2 | Year 3 | 3-year |
|---|---:|---:|---:|---:|
| Houses live (end of year) | 1 | 2 | 3 | — |
| Revenue | US$12,321 | US$28,071 | US$48,987 | US$89,379 |
| Operating cost | US$6,240 | US$10,480 | US$16,720 | — |
| **Founder income** (= surplus, no salary drawn) | **+US$6,081** | **+US$17,591** | **+US$32,267** | **+US$55,939** |
| GMV onto Paynow rails | US$43,200 | US$223,200 | US$545,400 | — |

**Cash-positive from the first live house (month 6). External capital required: US$0.** The deepest the founder is ever out of pocket is **~US$2,250** in the pre-launch months — self-financed, and recovered once house #1 settles its first sale. Revenue is retainer-led (Year-3: US$36,900 retainer of US$48,987); at a 15% adoption assumption a mature house contributes ~US$21,420/yr (Tier A) or ~US$15,390/yr (Tier B).

**The insight to take away:** the binding constraint is **operator capacity, not adoption.** Each mature house adds US$15–21k of income; doubling adoption 15%→30% adds only ~US$200/month. The ceiling is simply how many houses one owner-operator plus cheap part-time help can run *well*. **GMV routed onto Paynow's rails is the fastest-growing line we produce: US$43,200 → US$223,200 → US$545,400.**

**Growth is self-funded:** each house's surplus funds the next one. There is no funding round because there is nowhere to raise one — and that is fine. The path is slow, durable, and cash-positive the whole way.

**The Zimbabwe-specific risks we manage to:** USD scarcity and entrenched cash habits on the floor; currency volatility (we price and settle in USD to neutralise it); no capital cushion, so a missed retainer hurts immediately; and the operator-capacity ceiling — the one founder is the bottleneck until part-time help is trained.

---

## Next 4 quarters

| Quarter | Milestone |
|---|---|
| **Q3 2026** (Jul–Sep) | Signed pilot engagement #1, Harare belt. BillPay PAY round-trip unblocked with Paynow. |
| **Q4 2026** | Pilot hits the ≥30%-of-GMV criterion at week-12 review — the product works on a real floor. |
| **Q1 2027** | House #1 converts to a 12-month commitment; first case study drafted. |
| **Q3 2027** | **House #2 live** (Tier A or strong Tier B) — second floor routing GMV onto Paynow. |

---

## The ask of Paynow

1. **Formalize the partnership** — name ZimLivestock as Paynow's livestock vertical solution; Paynow BD refers livestock-industry prospects.
2. **Unblock two dependencies** — **Paab cash** (sandbox + docs; the only red on the board) and the **BillPay PAY round-trip** (vendor-portal registration with rotated creds; AUTH is already live).
3. **Co-market** — a joint case study off house #1: we grow your GMV, you grow our pipeline.

---

*Prepared for the Paynow internship-return demo, 2026-06-04. Cash-positive from the first house, US$0 external capital, ~US$56k of founder earnings over three years — and the number that grows fastest is the GMV we route onto Paynow.*
