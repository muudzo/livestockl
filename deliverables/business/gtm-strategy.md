# Go-to-Market Strategy

> **Product:** ZimLivestock — software-as-a-professional-service for Zimbabwean livestock auction houses
> **Status:** v1.0 draft  ·  **Author:** Tatenda Nyemudzo  ·  **Date:** May 2026
> **Companion:** [`business-case.md`](business-case.md) · [`pilot-proposal.md`](pilot-proposal.md)

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

---

## 1. Target market — sized and segmented

### Total addressable market
- **Zimbabwe: ~40–60 livestock auction houses** running regular sales (weekly or fortnightly). Concentrated in Mashonaland (Harare belt), Matabeleland (Bulawayo + cattle country), and Midlands (Gweru, Kwekwe).
- Many smaller operators (informal village auctions) — out of scope for v1; these are addressable later via a "ZimLivestock community edition" SKU.

### Serviceable obtainable market (3-year horizon)
- **15–20 houses engaged** at year 3. That's 1/3 of the market. Driven by operations capacity, not demand.

### Segmentation by tier

| Tier | # of houses | Sale-day GMV | Sales cadence | Engagement fee | Retainer |
|---|---:|---|---|---:|---:|
| **Tier A — Anchor houses** | ~8 | US$80–200k | Weekly | $10–12k | $2,000–2,500/mo |
| **Tier B — Mid-market** | ~20 | US$30–80k | Weekly or fortnightly | $7–8k | $1,500/mo |
| **Tier C — Small/regional** | ~20 | US$10–30k | Fortnightly or monthly | $5k | $1,200/mo |

Tier A is the strategic acquisition target — landing 2–3 of them is the entire year-1 game. Tier B builds the recurring base. Tier C extends reach but is rate-limited by ops capacity until year 3.

---

## 2. Customer journey (one auction house, end-to-end)

| Stage | Duration | What happens | Owner |
|---|---|---|---|
| **0. Awareness** | — | They hear about us from another auction house, the ZLPA conference, or Paynow's BD team | BD |
| **1. Discovery call** | 1 hour, on-site | We visit their floor, observe a sale, talk to the owner + their bookkeeper | Founder + BD |
| **2. Proposal** | 1 week | Custom-quoted engagement based on their tier, sale-day GMV, complexity | Founder |
| **3. Signature** | — | Deployment fee invoiced 50% upfront, 50% on go-live | BD |
| **4. Deployment** | 4–6 weeks | Branded skin, data migration, payment integration, training day on their floor | Engineering + ops |
| **5. Go-live** | Day 1 | First sale runs through the platform alongside the physical floor | Ops |
| **6. Hand-hold** | Months 1–3 | High-touch support. Daily check-ins for the first 4 weeks. Weekly thereafter. | Ops |
| **7. Steady-state** | Months 4+ | Monthly retainer in steady state. Quarterly business review with the owner. | Ops |
| **8. Expansion** | Month 9+ | Add second-tier features: branded mobile app, deeper analytics, transport integration referrals | Founder + ops |
| **9. Renewal** | Month 12 | 12-month commitment renewal. ~90% expected. | BD |

---

## 3. Pricing & packaging

| Component | Price | Notes |
|---|---|---|
| **Deployment engagement (one-off)** | US$5,000–$12,000 | Sized by tier. Pilot houses get discounted from list. |
| **Operations retainer (monthly)** | US$1,200–$2,500 | Sized by tier. Includes monitoring, support, reconciliation, reporting. Annual commitments preferred. |
| **Transaction surcharge** | 0.75% of settled GMV | On top of Paynow's own fee. Auditable in the monthly report. |
| **Premium add-ons** | Quoted | Branded mobile app (~$5k engagement + $300/mo), transport-integration referral revenue share, custom analytics dashboards. |
| **Bisafe escrow** | Pass-through | Paynow charges; we don't mark up. |

### How we quote
- We **do not publish a price list**. SaPS sales work on conversation and discovery, not catalog SKUs.
- We **always lead with the engagement, not the retainer**. The first sale is a project the auction house bookkeeper can categorize.
- We **never discount the retainer**. Discount the engagement to win the pilot, hold the retainer firm to set the future pricing anchor.

---

## 4. Sales motion

### Year 1 — founder-led, relationship-led

Three channels, in priority order:

**1. Direct founder-led BD**
- Founder visits Tier A and Tier B auction houses in person. Saturday floor visits.
- One discovery call per week. Conversion target: 1 in 5 (20% close rate).
- Year-1 target: **3 paying engagements signed**.

**2. Paynow channel partnership**
- Position ZimLivestock as Paynow's "vertical solution for livestock". Paynow BD team mentions us when an auction house asks about EcoCash settlement.
- Revenue share with Paynow on referrals — 5% of engagement fee + 5% of first year's retainer.
- Year-1 target: **2 referrals from Paynow BD, 1 close.**

**3. ZLPA + livestock-industry conferences**
- Sponsor or speak at the Zimbabwe Livestock Producers Association annual conference.
- Speak on "Digital infrastructure for the modern auction floor."
- Year-1 target: **5 warm leads from one conference appearance.**

### Year 2 — productize what works

- Hire a dedicated BD person to take over Tier B + C accounts. Founder retains Tier A.
- Build a referral programme — existing customers introduce us to other houses, get 1 month free retainer per closed referral.
- Begin paid digital marketing only for *farmer-facing* awareness (drive listings volume on existing customer floors), not for B2B auction-house acquisition.

### Year 3 — proof, then expand

- The first three Tier A engagements are now in their second year. Quote their numbers in every pitch.
- Begin discovery in neighbouring markets: Zambia, Mozambique, Botswana. Same auction culture, similar payments fragmentation.
- Consider a community-edition SKU for sub-Tier-C informal auctions — self-serve, ad-supported, no engagement fee — only if Tier A/B/C operations can be reliably handled by the team.

---

## 5. Partnerships

### Paynow — the strategic partner
- Most important relationship. They have the BD network, the brand, the payment rails.
- Position: ZimLivestock is the "vertical solution" Paynow points livestock-industry prospects at.
- Reciprocal: every settlement runs through Paynow. We grow their GMV, they grow our pipeline.
- Make this formal — co-marketing agreement, named on each other's case studies.

### Transport providers
- Cattle delivery is the post-sale friction point. Field research flagged it as the biggest seller complaint.
- Partner with 2–3 regional livestock transport companies. Booking integrated into the buyer flow.
- Revenue: small per-booking referral fee. Strategic: extends the platform's value beyond just settlement.

### Veterinary services
- Every animal at a Zimbabwean auction needs a vet inspection certificate.
- Partner with local vet practices to enable digital vet certs attached to listings.
- No revenue here — pure value extension that makes the platform stickier with auction houses.

### Government — Ministry of Lands, Agriculture and Rural Resettlement
- The platform is a record-keeping tool that could feed national livestock census data.
- Engage early, position as augmenting state data infrastructure not replacing constable workflow.
- Strategic upside: if the state mandates digital traceability (likely within 3 years per regional trends), we are the existing solution.

---

## 6. Marketing — the small amount of it we need

SaPS doesn't sell via marketing-driven funnels. But three artefacts are non-negotiable:

1. **One-page site (zimlivestock.co.zw) with a "Talk to us" CTA.**
   No price page. No feature list pretending to be a SaaS. A clear positioning line, three case studies (once they exist), and a calendly link to the founder.

2. **Case studies (1 per engaged auction house).**
   The Mr. Mawere-style proof. GMV before vs after. Number of remote bidders activated. Owner quote.

3. **A podcast appearance or two.**
   Zimbabwean agriculture-business podcasts have small but highly-relevant audiences. One appearance → multiple warm leads.

We **do not** invest in:
- Paid search ads for B2B acquisition
- Conference booths (sponsorships yes, booths no)
- Outbound email sequences
- LinkedIn ads
- Influencer marketing

The market is too narrow and too relationship-dependent for any of those to pay back.

---

## 7. Metrics — what we track each month

### North-star metric
**Number of auction houses where ≥30% of a sale day's GMV settles through our platform.**

This is the only number that matters. It captures: did we deploy them, did the customers use it, did the operations team keep it running.

### Lagging
- Monthly recurring revenue (retainer × houses)
- GMV processed (transaction surcharge × GMV)
- Engagement signups (lead → close conversion)

### Leading
- Discovery calls per month
- Days from first contact to signed engagement
- Time spent supporting each customer per month (operations capacity check)

### Health checks
- NPS from auction-house owners, quarterly
- Time-to-resolution on operations tickets
- Number of incidents per house per month (target: < 1)

---

## 8. 24-month milestones

| Quarter | Milestone | What's true if we hit it |
|---|---|---|
| **Q3 2026** (now → Aug) | Signed pilot engagement #1, Harare | We have a paying customer using ZimLivestock to run their floor |
| **Q4 2026** | Pilot at week 12 review, hits 30% GMV criterion | The product works in the wild. We can quote a number. |
| **Q1 2027** | Engagement #2 + #3 signed (one Tier A, one Tier B) | We have a category, not a customer. |
| **Q2 2027** | First case study published. Paynow formalises us as their vertical solution. | Distribution unlocks. |
| **Q3 2027** | Engagement #4–6 signed. First dedicated BD hire. | The pipeline is running without the founder personally. |
| **Q4 2027** | Annual renewal hit on engagement #1 | Recurring economics proven. |
| **Q2 2028** | 10 engaged houses, $250k+/year recurring | Default-alive on Zimbabwe alone. |
| **Q4 2028** | Discovery in second market (Zambia or Mozambique) | Geographic expansion begins. |

---

## 9. What kills this plan (and what we do about it)

1. **Operations capacity bottlenecks before sales does.** Mitigation: hire ops lead by engagement #2, not #4. Don't sell what we can't run.
2. **Paynow goes cold on the partnership.** Mitigation: multi-rail product (Paynow primary but EcoCash USSD direct + Stripe diaspora as fallback). Relationship matters but isn't a single point of failure.
3. **An auction house churns publicly.** Mitigation: high-touch support in months 1–3 is non-negotiable. The first three customers are reference customers — treat them like founding investors.
4. **Founder burnout from running everything.** Mitigation: hire ops + BD by engagement #3. Founder transitions to product + strategic accounts only by month 12.
5. **Currency volatility wipes out unit economics.** Mitigation: all engagement + retainer pricing in **USD**. Transaction surcharge invoiced in USD equivalent of ZIG/ZWL settled.
