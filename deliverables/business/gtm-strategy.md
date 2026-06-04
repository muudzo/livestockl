# Go-to-Market Strategy

> **Product:** ZimLivestock — software-as-a-professional-service for Zimbabwean livestock auction houses
> **Status:** v2.0  ·  **Author:** Tatenda Nyemudzo  ·  **Date:** June 2026
> **Supersedes:** v1.0 (May 2026). Where any figure here disagrees with an earlier doc, **this version wins.**
> **Companion:** [`business-case.md`](business-case.md) · [`pilot-proposal.md`](pilot-proposal.md)

---

## What's changed since v1.0 (read this first)

v1.0 was written before the product had real distribution surfaces and before we re-baselined the financials against what a Zimbabwean auction house will actually pay. This refresh is **leaner and more honest**, not more optimistic. Four substantive changes:

1. **Channels shipped.** What was a web PWA is now a five-surface distribution system — web/PWA, a live WhatsApp bot (0773819300), a USSD simulator for feature phones, BillPay-as-biller (AUTH live), and a Facebook Messenger bot (code-complete). This is now the strategy's distribution moat, not a footnote. See [§4](#4-sales-motion--multi-channel-distribution).
2. **Financials corrected down — hard.** v1.0 implied a default-alive Zimbabwe business by Q2 2028 at ~10 houses. That was wrong. The honest base case is a **3-house floor** that is **investment-stage through year 3** and does **not** reach standalone break-even within 60 months. We lead with that. See [§7](#7-unit-economics--the-honest-path) and [§8](#8-24-month-milestones-re-baselined-to-june-2026).
3. **Pricing revised down.** Realistic Zim auction-house willingness-to-pay in USD is **below** the May figures. Tier A engagement moved US$10–12k → **US$8k**; Tier A retainer US$2,000–2,500/mo → **US$1,500/mo**. The old numbers anchored too high for this market. See [§3](#3-pricing--packaging-canonical).
4. **Panel asks addressed.** All six asks from the 2026-05-08 demo are reflected as shipped channels, partnerships, or honestly-named blockers on Paynow. See [§5](#5-partnerships) and [§9](#9-what-kills-this-plan-and-what-we-do-about-it).

**The one sentence for the panel:** *This is a startup prying open a manual, cash-based, legacy auction system. The unit economics per house already work; the binding constraint is scale and fixed cost, not adoption — and the fastest-growing number we produce is GMV routed onto Paynow's rails.*

---

## 0. The frame

This is a SaPS (software-as-a-professional-service) business, not a SaaS business. The implications cascade through everything below:

| If we were SaaS | We are SaPS, so… |
|---|---|
| Self-serve signup landing page | First customer is found at a livestock association meeting, not through Google Ads |
| Per-seat or per-tx pricing on a public price list | Pricing is bespoke and quoted after a discovery conversation |
| Marketing-led growth | Founder-led + relationship-led growth |
| 10,000 customers, low ACV | 30–50 customers, high ACV |
| Cancel-and-walk-away churn | Engagement-style relationships measured in renewal of annual commitments |

The growth ceiling is set by **how many auction houses we can operate well** — not by how many we can sign. Sales velocity is *deliberately* throttled to operations capacity.

One thing the SaPS frame does **not** excuse: it doesn't make a small portfolio profitable. With a high fixed founder-plus-support cost and a small number of houses, the business is investment-stage until scale arrives. We say so plainly throughout.

---

## 1. Target market — sized and segmented

### Total addressable market
- **Zimbabwe: ~40–60 livestock auction houses** running regular sales (weekly or fortnightly). Concentrated in Mashonaland (Harare belt), Matabeleland (Bulawayo + cattle country), and Midlands (Gweru, Kwekwe).
- Many smaller operators (informal village auctions) — out of scope for v1; addressable later via a "ZimLivestock community edition" SKU.

### Serviceable obtainable market (3-year horizon — base case)
- **1 house live by end of Year 1 → 2 by end of Year 2 → 3 by end of Year 3.** This is the honest floor, set by operations capacity and the difficulty of converting a cash-based, relationship-driven incumbent. We are not modelling 10 houses.
- The 3-house floor is **investment-stage**. Reaching break-even requires more houses with the early ones matured — see the path-to-viability in [§7](#7-unit-economics--the-honest-path).

### Segmentation by tier

| Tier | # in market | Sale-day GMV | Sales cadence | Engagement fee | Retainer |
|---|---:|---|---|---:|---:|
| **Tier A — Anchor houses** | ~8 | US$80–120k | Weekly | US$8,000 | US$1,500/mo |
| **Tier B — Mid-market** | ~20 | US$40–80k | Weekly or fortnightly | US$6,000 | US$1,200/mo |
| **Tier C — Small/regional** | ~20 | US$10–30k | Fortnightly or monthly | US$4,000 | US$900/mo |

Tier A is the strategic acquisition target — landing **one** of them well is the entire Year-1 game. Tier B builds the recurring base in Year 2. Tier C extends reach but is rate-limited by ops capacity until the path scenario kicks in.

---

## 2. Customer journey (one auction house, end-to-end)

| Stage | Duration | What happens | Owner |
|---|---|---|---|
| **0. Awareness** | — | They hear about us from another auction house, the ZLPA conference, or Paynow's BD team | BD |
| **1. Discovery call** | 1 hour, on-site | We visit their floor, observe a sale, talk to the owner + their bookkeeper | Founder + BD |
| **2. Proposal** | 1 week | Custom-quoted engagement based on their tier, sale-day GMV, complexity | Founder |
| **3. Signature** | — | Deployment fee invoiced 50% upfront, 50% on go-live | BD |
| **4. Deployment** | ~6 min onboarding + 4–6 wks hand-hold | Self-serve tenant via `/operators` wizard (live tenant in ~6 minutes, no SQL editor), then branded skin, data migration, Paynow merchant-ID setup, on-floor training day | Engineering + ops |
| **5. Go-live** | Day 1 | First sale runs through the platform alongside the physical floor | Ops |
| **6. Hand-hold** | Months 1–3 | High-touch support. Daily check-ins for the first 4 weeks. Weekly thereafter. | Ops |
| **7. Steady-state** | Months 4+ | Monthly retainer in steady state. Quarterly business review with the owner. | Ops |
| **8. Expansion** | Month 9+ | Add second-tier surfaces: transport delivery quotes, deeper analytics, branded mobile app | Founder + ops |
| **9. Renewal** | Month 12 | 12-month commitment renewal. ~90% expected. | BD |

The deployment step is materially faster than v1.0 assumed: the **SaPS multi-tenant onboarding wizard** (`/operators` → request access → admin approval → wizard → live tenant in ~6 minutes, tenant-isolated RLS verified) replaced the SQL-editor provisioning that made each house a custom engineering project. The human work — training, trust, hand-holding — is unchanged. The plumbing is now self-serve.

---

## 3. Pricing & packaging (canonical)

**This table is the single source of truth and supersedes the May-2026 figures in `business-case.md`.** It was revised **down** to reflect realistic Zimbabwean auction-house willingness-to-pay in USD. (For reference: old Tier A was US$10–12k engagement / US$2,000–2,500 retainer — too high an anchor for this market.)

| Tier | Engagement (one-off) | Retainer (monthly) | Sale-day GMV | Sale days / mo |
|---|---:|---:|---:|---:|
| **A — Anchor house** | US$8,000 | US$1,500 | US$80–120k | 4 (weekly) |
| **B — Mid-market** | US$6,000 | US$1,200 | US$40–80k | 3 (weekly–fortnightly) |
| **C — Small / regional** | US$4,000 | US$900 | US$10–30k | 2 (fortnightly) |
| **Pilot (any tier)** | US$5,000 *(disc. from US$8k list)* | US$1,000/mo for 90 days, then converts to tier rate | varies | varies |

Plus, across all tiers:
- **Transaction surcharge: 0.75%** of settled GMV, on top of Paynow's own fee. Auditable in the monthly report.
- **Transport** (new revenue surface — see [§5](#5-partnerships)): US$15 base + US$0.35/km, capped US$250 per delivery. Base-case-excluded upside.
- **Pass-through costs:** SMS — no markup. (Bisafe escrow and Paynow merchant-transfer once integrated; both are still dependencies, not live capabilities.)
- **Commitment:** 12-month renewable from month-4 of pilot or day-one of standard engagement.

### How we quote
- We **do not publish a price list**. SaPS sales work on conversation and discovery, not catalog SKUs.
- We **always lead with the engagement, not the retainer**. The first sale is a project the auction house bookkeeper can categorize.
- We **never discount the retainer**. Discount the engagement to win the pilot, hold the retainer firm to set the future pricing anchor.

---

## 4. Sales motion + multi-channel distribution

### Why distribution is the moat now

v1.0 sold a single web surface. v2.0 reaches the auction floor through **five channels**, which is the direct answer to the panel's "maximise accessibility" ask. A WhatsApp-group competitor reaches one surface; we reach the buyer wherever they are — smartphone, feature phone, chat, or biller menu.

| Channel | Who it reaches | Status |
|---|---|---|
| **Web / PWA** | Smartphone buyers, diaspora, sellers | Live (production) |
| **WhatsApp Cloud bot** (0773819300) | The buyer who already lives in WhatsApp — 7-step sell flow + browse/view/bid | Live |
| **USSD simulator** (`/ussd-simulator`) | Feature-phone bidders with no data — no telco integration needed to demo | Live |
| **BillPay-as-biller** | Anyone with a Paynow/EcoCash biller menu — pay a ZimLivestock invoice from the standard biller list | AUTH live (200 + member payload); PAY pending Paynow vendor-portal registration |
| **Facebook Messenger bot** | Facebook-native buyers | Code-complete; awaiting Meta page-token rotation |

This multi-channel reach is the **distribution advantage vs WhatsApp competitors**: they have one channel and no settlement; we have five channels and Paynow settlement behind all of them. Every channel funnels GMV onto Paynow's rails — which is the number that matters most to this panel ([§6](#6-metrics--what-we-track-each-month)).

### Year 1 — founder-led, relationship-led

Three acquisition channels, in priority order:

**1. Direct founder-led BD**
- Founder visits Tier A and Tier B auction houses in person. Saturday floor visits.
- One discovery call per week. Conversion target: 1 in 5 (20% close rate).
- Year-1 target: **1 paying house live by end of Year 1** (signed pilot converting to commitment). Not three signings — one house, deployed well, used as the reference.

**2. Paynow channel partnership**
- Position ZimLivestock as Paynow's "vertical solution for livestock". Paynow BD mentions us when an auction house asks about EcoCash settlement.
- Revenue share with Paynow on referrals — 5% of engagement fee + 5% of first year's retainer.
- Year-1 target: **2 referrals from Paynow BD, 1 advancing to discovery.**

**3. ZLPA + livestock-industry conferences**
- Sponsor or speak at the Zimbabwe Livestock Producers Association annual conference.
- Speak on "Digital infrastructure for the modern auction floor."
- Year-1 target: **5 warm leads from one conference appearance.**

### Year 2 — productize what works

- Land **house #2** (one Tier A or strong Tier B). Founder still runs both personally.
- Stand up a referral programme — existing customers introduce other houses, get 1 month free retainer per closed referral.
- Light farmer-facing awareness (drive listing volume on existing floors), **not** B2B auction-house ad spend.

### Year 3 — proof, then push toward scale

- House #1 is in its second renewal; quote its numbers in every pitch. Land **house #3**.
- This is where the base case ends and the **path-to-viability** ([§7](#7-unit-economics--the-honest-path)) takes over: the route to break-even runs through 5–6 houses with the early ones matured, not through squeezing adoption on three.
- Begin light discovery in neighbouring markets (Zambia, Mozambique, Botswana — same auction culture, similar payments fragmentation) **only** if ops can reliably run the Zimbabwe portfolio.

---

## 5. Partnerships

### Paynow — the strategic spine
- Most important relationship, full stop. Paynow has the BD network, the brand, and the payment rails behind all five of our channels.
- Position: ZimLivestock is the "vertical solution" Paynow points livestock-industry prospects at.
- Reciprocal: **every settlement runs through Paynow.** We route US$43,200 of GMV onto Paynow rails in Year 1, US$223,200 in Year 2, US$545,400 in Year 3 — the GMV line grows fastest of anything we produce ([§6](#6-metrics--what-we-track-each-month)). We grow their GMV; they grow our pipeline.
- Make it formal — co-marketing agreement, named on each other's case studies.
- **Bisafe escrow** — sandbox/docs requested from Paynow; integration not yet built. Named as a dependency, not a shipped feature.

### Transport providers (new revenue surface)
- Cattle delivery is the post-sale friction point — field research flagged it as the biggest seller complaint.
- **Already shipped:** seller delivery toggle on listings; buyers get distance-based quotes at checkout (Nominatim geocoding + haversine). Pricing US$15 base + US$0.35/km, capped US$250.
- This is a **new revenue surface excluded from the base case** — upside, not a load-bearing assumption. In the path-to-viability scenario it contributes ~US$150/house/month of transport margin.
- Strategic: extends platform value beyond settlement and makes us stickier with both buyers and houses.

### Veterinary services
- Every animal at a Zimbabwean auction needs a vet inspection certificate.
- Partner with local vet practices to attach digital vet certs to listings.
- No revenue — pure value extension that makes the platform stickier with auction houses.

### Government — Ministry of Lands, Agriculture and Rural Resettlement
- The platform is a record-keeping tool that could feed national livestock census data.
- Engage early; position as augmenting state data infrastructure, not replacing the constable workflow.
- Strategic upside: if the state mandates digital traceability (likely within 3 years per regional trends), we are the existing solution.

---

## 6. Metrics — what we track each month

### North-star metric
**Number of auction houses where ≥30% of a sale day's GMV settles through our platform.**

This is still the only number that captures whether we deployed, whether customers used it, and whether ops kept it running. At base case this is 1 → 2 → 3 over three years.

### Leading metrics (new in v2.0)
- **GMV routed onto Paynow rails** — US$43,200 (Y1) → US$223,200 (Y2) → US$545,400 (Y3). The number that matters most to Paynow, and the fastest-growing line we produce.
- **Multi-channel adoption** — share of bids/payments arriving via WhatsApp, USSD, BillPay, and Facebook vs web. This is the accessibility proof and the early signal that a non-tech-native floor is actually using the product.
- Discovery calls per month.
- Days from first contact to signed engagement.
- Operations hours per house per month (capacity check — the real growth governor).

### Lagging
- Monthly recurring revenue (retainer × live houses) — the reliable spine; retainer-led by design.
- GMV-tied transaction surcharge revenue — small but compounds.
- Engagement signings (lead → close conversion).

### Health checks
- NPS from auction-house owners, quarterly.
- Time-to-resolution on operations tickets.
- Incidents per house per month (target: < 1).

---

## 7. Unit economics & the honest path

### The per-house economics already work

At a **mature house at 15% adoption**, recurring economics are healthy:

| | Tier A | Tier B |
|---|---:|---:|
| Mature recurring (retainer + surcharge), per year | **US$22,860** | **US$16,830** |

A single mature house contributes roughly **US$15–21k/year**. The per-unit math is not the problem.

### The binding constraint is scale + fixed cost — not adoption

This is the rigorous insight we want the panel to leave with. Fixed founder-plus-support cost is **~US$48–55k/year**. One mature house covers a third of that. So:

- **Pushing adoption from 15% → 30% moves Year-3 monthly net by only ~US$200.** Adoption is *not* the lever at this scale.
- **Break-even needs ~5–6 houses with the early ones matured**, so the fixed cost amortizes across enough recurring revenue.

That reframes the whole plan: we are not adoption-constrained, we are **scale-and-cost constrained.** The job is to add houses and let early ones mature — not to over-engineer conversion on a tiny base.

### Base case (leanest, deliberately conservative — 3-house floor)

| | Year 1 | Year 2 | Year 3 | 3-year |
|---|---:|---:|---:|---:|
| Houses live (end of year) | 1 | 2 | 3 | — |
| Revenue | US$12,321 | US$28,071 | US$48,987 | **US$89,379** |
| Net | US$-19,119 | US$-13,209 | US$-6,733 | **US$-39,061** |
| GMV onto Paynow rails | US$43,200 | US$223,200 | US$545,400 | US$811,800 |

**Year-3 revenue mix:** US$36,900 retainer + US$8,000 engagement + US$4,087 transaction surcharge. Revenue is **retainer-led** — the recurring retainer is the reliable spine; the surcharge is small but compounds with GMV.

**Read this honestly:** the 3-house floor is **investment-stage through Year 3** and **does not reach standalone break-even within 60 months.** The base case does not break even within the 60-month horizon at all; the month-36 cumulative break-even belongs only to the path-to-viability upside. We are not going to hockey-stick this for the panel. The base case is a credible floor, not a forecast of profit.

### Path-to-viability (clearly-labeled UPSIDE — NOT the base case)

This is the trajectory **if** we execute on scale. It is explicitly **not** the base case and should never be cited as one.

> **Assumptions:** 6 houses by month 44 · 20% adoption ceiling · +US$150/house/month transport margin.

| | Year 1 | Year 2 | Year 3 | Year 4 | Year 5 |
|---|---:|---:|---:|---:|---:|
| Net | US$-13,199 | US$-6,509 | **+US$23,204** | **+US$44,438** | **+US$55,411** |

- **Cumulative break-even: month 36.**
- **+US$103,345 cumulative by month 60.**

The path doesn't depend on a heroic adoption number (the ceiling is 20%). It depends on **getting to six houses and letting the early ones mature** — exactly the scale lever the unit economics identify. That is the bet, stated plainly.

---

## 8. 24-month milestones (re-baselined to June 2026)

All dates are ≥ June 2026. v1.0 treated Q3 2026 as "now"; now is June 2026. These are tied to the **honest** numbers — the 3-house floor and the investment-stage reality, with break-even living in the path scenario in Year 3+.

| Quarter | Milestone | What's true if we hit it |
|---|---|---|
| **Q3 2026** (Jul–Sep) | Signed pilot engagement #1, Harare belt. BillPay PAY round-trip unblocked with Paynow. | First paying customer running their floor on the platform across web + WhatsApp + USSD. |
| **Q4 2026** | Pilot at week-12 review hits the ≥30% GMV criterion. Seller settlement function live (pending merchant-transfer API docs). | The product works in the wild on a real floor. We can quote a real number. |
| **Q1 2027** | House #1 converts to a 12-month commitment; first case study drafted. | We have a reference customer, not just a pilot. |
| **Q2 2027** | Paynow formalises us as their livestock vertical solution. Facebook bot live; Paab cash flow unblocked IF Paynow sandbox + docs land. | Distribution unlocks; the fifth channel comes online. |
| **Q3 2027** | **House #2 live** (Tier A or strong Tier B). | The 3-house base case is on track; second floor routing GMV onto Paynow rails. |
| **Q4 2027** | House #1 annual renewal hit. Recurring spine proven across a full year. | Renewal economics demonstrated; retainer-led model validated. |
| **Q1 2028** | **House #3 live.** End-of-Year-3 base case (~US$48,987 revenue, net ~US$-6,733) realised. | Base-case floor delivered. Business is still investment-stage — and we say so. |
| **Q2 2028** | Decision gate: commit to the **path-to-viability** push (toward 6 houses by month 44) or hold at the floor. | The scale lever — not adoption — is the path to break-even (cumulative break-even ~month 36 on the path scenario). |

No milestone here cites 10 houses, a default-alive Zimbabwe by 2028, or the old inflated pricing ranges. Those were v1.0 optimism. This is the floor we can actually stand on.

---

## 9. What kills this plan (and what we do about it)

1. **Scale + fixed cost — the binding constraint.** A mature house contributes ~US$15–21k/yr; fixed founder+support cost is ~US$48–55k/yr. The 3-house floor never reaches standalone break-even within 60 months. *Mitigation:* treat this honestly as investment-stage; pursue the path-to-viability (6 houses by month 44, early ones matured) rather than over-optimising adoption on a tiny base — adoption 15%→30% moves Y3 monthly net by only ~US$200.

2. **Paynow-dependency blockers (named honestly — asks of Paynow).** Four items are external dependencies on Paynow, and we will not pretend otherwise:
   - **Paab cash payments** — RED, awaiting Paynow sandbox + docs. The only red on the board. Cash-collection accessibility is parked until this lands.
   - **BillPay PAY round-trip** — awaiting Paynow vendor-portal registration with rotated creds. AUTH is live (200 + member payload); the pay leg is blocked.
   - **Paynow merchant-transfer API docs** — needed for the seller settlement function.
   - **txt.co.zw REMOTE creds** — blocking the SMS notifications branch.
   *Mitigation:* multi-rail by design (Paynow primary, Stripe diaspora fallback) so no single blocker stops the platform; and each blocker is on the supervisor ask list, not silently absorbed.

3. **Operations capacity bottlenecks before sales does.** *Mitigation:* the SaPS onboarding wizard removed per-house engineering setup (~6-min tenant provisioning), so capacity is now bounded by human support, not deployment. Hire ops support as we approach house #3, not after.

4. **An auction house churns publicly.** *Mitigation:* high-touch support in months 1–3 is non-negotiable. The first houses are reference customers — treat them like founding investors.

5. **Adoption is slow on a manual, cash-based incumbent.** This is real — we are prying open a legacy system. *Mitigation:* the economics tell us adoption is *not* the binding lever at this scale, so we don't bet the company on it; we bet on multi-channel reach lowering the activation barrier (USSD + WhatsApp + BillPay meet buyers where they already are) and on adding houses.

6. **Currency volatility wipes out unit economics.** *Mitigation:* all engagement + retainer pricing in **USD**. Transaction surcharge invoiced in USD-equivalent of settled value.

---

*Prepared for the Paynow internship-return demo, 2026-06-04. The framing throughout is deliberate: this is the commercial business built on Paynow's rails, presented as an honest early-stage case. The per-house economics work; the path to viability is scale; and the number that grows fastest is the GMV we route onto Paynow.*
