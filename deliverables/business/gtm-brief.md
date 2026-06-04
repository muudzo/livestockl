# Go-to-Market — Demo Brief

> **Product:** ZimLivestock — a B2B SaaS platform for Zimbabwean livestock auction houses
> **Status:** v3.0  ·  **Date:** 2026-06-04  ·  **Companion:** [`gtm-strategy.md`](gtm-strategy.md) (full)

**One line:** ZimLivestock is the B2B SaaS platform that runs a Zimbabwean auction floor — and routes every settlement onto Paynow's rails.

This is a scaling B2B SaaS platform: auction houses onboard as isolated (RLS) tenants through a self-serve wizard and pay a one-off onboarding fee, a monthly subscription, and a thin take on settled GMV. B2B today, B2B2C tomorrow — the platform diversifies into consumer revenue via transport (delivery) over time. The onboarding wizard (`/operators` → admin approval → a ~6-minute RLS-isolated tenant, no SQL) keeps each new house low-touch, which is what makes scale reachable.

---

## The market

Zimbabwe has roughly **40–60 livestock auction houses** running regular sales, concentrated in Mashonaland, Matabeleland, and the Midlands. We are prying open a manual, cash-based, relationship-driven legacy system. Our 5-year plan is **moderate scale — ~20 houses** (about one-third of the market), ramping **5 → 8 → 12 → 16 → 20** live by year-end, anchors-first. These are high-ACV B2B tenants, not 10,000 self-serve seats; the self-serve onboarding wizard keeps each new house low-touch so growth rides on house count and transport, not on a heavy per-house engineering build. Digital adoption is held field-honest, not used as a growth lever.

---

## How we sell

**Year-1 acquisition channels, in priority order:**
1. **BD-led onboarding** — Saturday on-floor visits to Tier A/B houses; weekly discovery calls; 20% close. Year-1 target: **5 houses live**, anchors-first, each onboarded via the wizard and used as a reference for the next.
2. **Paynow channel partnership** — positioned as Paynow's livestock vertical; Paynow BD refers prospects asking about EcoCash settlement. 5% rev-share on onboarding fee + first-year subscription.
3. **ZLPA conference** — sponsor/speak on "digital infrastructure for the modern auction floor"; target 5 warm leads per appearance.

**Multi-channel reach is the accessibility answer** (and the moat vs. WhatsApp-group competitors). We meet the buyer wherever they are, with Paynow settlement behind every surface — **five live channels**:

| Channel | Reaches | Status |
|---|---|---|
| **Web / PWA** | Smartphone buyers, diaspora, sellers | Live |
| **WhatsApp bot** (0773819300) | The buyer who lives in WhatsApp | Live |
| **USSD simulator** | Feature-phone bidders, no data | Live |
| **BillPay-as-biller** | Anyone on the Paynow/EcoCash biller menu | AUTH live; PAY pending Paynow registration |
| **Facebook Messenger** | Buyers who live on Facebook | Live |

A competitor has one channel and no settlement; we have five channels, all funnelling GMV onto Paynow.

---

## Pricing at a glance

Three signals per tier: a one-off onboarding fee, a monthly subscription, and a thin take on settled GMV. Lead with the onboarding fee; never discount the subscription (it sets the future anchor).

| Tier | Onboarding (one-off) | Subscription (monthly) | Sale-day GMV |
|---|---:|---:|---:|
| **A — Anchor house** | US$3,500 | US$1,500 | US$80–120k |
| **B — Mid-market** | US$2,500 | US$1,200 | US$40–80k |
| **C — Small / regional** | US$1,500 | US$900 | US$10–30k |
| **Pilot (any tier)** | US$1,000 *(credited)* | US$1,000 for 90 days → tier rate | varies |

The pilot onboarding fee is **credited toward the full tier onboarding fee on conversion** — a converting house never pays twice. Across all tiers: **0.75% transaction take** on settled GMV (on top of Paynow's fee), 12-month renewable commitment. **Transport (delivery)** is the consumer revenue line that diversifies the platform into B2B2C: a buyer quote of US$15 base + US$0.35/km (capped US$250), of which the platform keeps only the flat US$15 booking leg — about US$12.00 net after processing — while the transporter prices and keeps the entire distance-based haul.

---

## The honest numbers

This is a **self-funded** platform, not a financed startup — there is no equity round to raise in Zimbabwe, and USD is scarce. We grow on revenue, carrying a prudent 2–3 month working-capital buffer; the founder draws a salary that sits inside payroll. Conservative by necessity, not choice.

| | Year 1 | Year 2 | Year 3 | Year 4 | Year 5 | 5-year |
|---|---:|---:|---:|---:|---:|---:|
| Houses live (end of year) | 5 | 8 | 12 | 16 | 20 | — |
| Revenue | US$61,636 | US$130,867 | US$198,346 | US$277,259 | US$361,695 | US$1,029,803 |
| Operating cost | US$48,841 | US$84,274 | US$132,810 | US$181,365 | US$235,930 | US$683,220 |
| **Operating surplus** | **+US$12,795** | **+US$46,593** | **+US$65,536** | **+US$95,894** | **+US$125,765** | **+US$346,583** |
| GMV onto Paynow rails | US$894,600 | US$2,463,200 | US$3,683,300 | US$5,310,800 | US$7,149,100 | US$19,501,000 |

**External equity required: US$0.** Revenue is **subscription-led** (US$766,800 of the US$1,029,803 five-year total), with onboarding, the 0.75% transaction take, and the growing transport line on top. The single most aggressive assumption is landing **3 of ~8 Tier A anchors in Year 1**; Year-1 surplus is a thin cushion (~3.5 weeks of opex), which is exactly why we hold a 2–3 month working-capital buffer. Year-5 payroll of US$198k funds a real **~9–13 person org**, not a lean handful.

**The growth story:** revenue rides on **house count and transport.** House count ramps 5 → 8 → 12 → 16 → 20; the consumer-transport mix climbs from 1.3% of revenue in Year 1 to 8.8% in Year 5 as the platform diversifies into B2B2C. Adoption is held field-honest (blended ~10.5–13.7%, below the ~15% mature ceiling) — it is not a growth lever. **GMV routed onto Paynow's rails grows fastest of all: US$894,600 → US$2,463,200 → US$3,683,300 → US$5,310,800 → US$7,149,100.**

**Growth is self-funded:** revenue compounds, the working-capital buffer absorbs timing shocks, and there is no funding round because there is nowhere to raise one — and that is fine. The path is durable and cash-positive once the buffer is in place.

**The Zimbabwe-specific risks we manage to:** USD scarcity and entrenched cash habits on the floor; currency volatility (we price and settle in USD to neutralise it); the thin Year-1 cushion (a missed subscription hurts, which is what the buffer is for); and execution risk on landing the Tier A anchors early.

---

## Next 4 quarters

| Quarter | Milestone |
|---|---|
| **Q3 2026** (Jul–Sep) | First pilot onboarded via the wizard, Harare belt. BillPay PAY round-trip unblocked with Paynow. |
| **Q4 2026** | Pilot hits the ≥30%-of-GMV criterion at week-12 review — the product works on a real floor; pilot fee credited on conversion. |
| **Q1 2027** | First anchor converts to a 12-month commitment; first case study drafted. |
| **Q3 2027** | **Year-1 cohort live — 5 houses** routing GMV onto Paynow, anchors-first. |

---

## The ask of Paynow

1. **Formalize the partnership** — name ZimLivestock as Paynow's livestock vertical solution; Paynow BD refers livestock-industry prospects.
2. **Unblock two dependencies** — **Paab cash** (sandbox + docs; the only red on the board) and the **BillPay PAY round-trip** (vendor-portal registration with rotated creds; AUTH is already live).
3. **Co-market** — a joint case study off the first anchor house: we grow your GMV, you grow our pipeline.

---

*Prepared for the Paynow internship-return demo, 2026-06-04. Self-funded with a working-capital buffer, US$0 external equity, ~US$347k cumulative operating surplus over five years on ~20 houses — and the number that grows fastest is the US$19.5M of GMV we route onto Paynow.*
