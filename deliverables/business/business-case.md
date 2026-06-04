# ZimLivestock — Business Case

> **Status:** v1.1  ·  **Author:** Tatenda Nyemudzo  ·  **Date:** May 2026 — *pricing + unit economics revised June 2026 to match the honest financial model*
> **Audience:** Paynow MD, ZimLivestock leadership, prospective auction-house partners
> **Companion docs:** [`gtm-strategy.md`](gtm-strategy.md) · [`pilot-proposal.md`](pilot-proposal.md) · [`financial-model.xlsx`](financial-model.xlsx)

---

## 1. The pitch in one line

> **"We run the digital floor for you."**
>
> ZimLivestock is a **software-as-a-professional-service** product for Zimbabwean livestock auction houses. We deploy a branded digital marketplace on top of the auction house's existing business, train their team, operate it on their behalf, and integrate it with Paynow for settlement and Bisafe for escrow. The auction house keeps their brand and their customer relationships. We provide the rails *and* the people running them.

**Why SaPS, not SaaS:** auction houses are not tech-native customers. They need a partner, not a portal. The product is the platform *plus* the people who keep it operating — the same way Paynow itself sells integrations, not licences.

---

## 2. The problem (validated in the field)

In March 2026 I sat through a full sale day at a working Zimbabwean cattle auction floor. Eight findings shaped the product, and four of them are the load-bearing problems we solve:

| # | Problem observed | Business consequence |
|---|---|---|
| 1 | **US$1,000 deposit gate before bidding.** Filters serious buyers — but locks out small/casual buyers and remote ones entirely. | Auction houses leave money on the floor every Saturday. The marginal bidder who'd push the price up by 5% never shows. |
| 2 | **12% combined house fees** (5% seller / 7% buyer). | High enough that sellers route around the auction via WhatsApp groups for animals under US$500. Auction houses bleed the long tail. |
| 3 | **Attendance is dealers and resellers**, not end consumers. Salaried buyers, diaspora, women farmers — all underserved. | Auction houses are addressing one buyer profile when three exist. |
| 4 | **Police clearance is in-person, paper-based.** A constable on-site verifies every animal's branding. | Can't scale beyond what one constable can stamp in a day. Auction houses are physically capped. |

WhatsApp groups have rushed in to fill the gap for sub-US$500 trades, but they have **no settlement, no trust, no audit trail, no police clearance integration** — which is why the higher-value end of the market still walks into the physical shed.

**The opportunity:** the auction house already owns the trust infrastructure (deposit, police, inspection, network). They just don't have a digital surface for it. We give them one — and take a cut of every transaction we settle.

---

## 3. Value proposition (canvas)

### For the auction house (the paying customer)
| Pain | What we relieve |
|---|---|
| Capped to weekend physical attendance | 24/7 listings + asynchronous bidding |
| Cash-handling risk and float | Paynow settlement direct to merchant ID + Bisafe escrow |
| No digital marketing surface | Branded marketplace under their name + SMS list of all past buyers |
| Police clearance bottleneck | Workflow tool for constables; digital chain of custody |
| Lose the long tail to WhatsApp | Lower-fee tier for sub-US$500 trades, integrated |

### For the seller (the auction house's customer)
| Gain | What we deliver |
|---|---|
| Higher final prices | More bidders, including remote and diaspora |
| Faster payout | Paynow merchant transfer in hours, not days |
| Less travel | List from a phone, never visit the floor |

### For the buyer (the auction house's other customer)
| Gain | What we deliver |
|---|---|
| Lower deposit barrier | Bisafe escrow — small refundable hold, not US$1,000 cash |
| Reach animals they couldn't physically attend for | Listings across all partnered auction houses |
| Settlement they trust | Paynow's name on the receipt |

### Gain creators (where we win, sharp version)
1. **More auctions per week, without more constables.** The bottleneck moves from physical attendance to digital reach.
2. **A long tail that doesn't leak.** Sub-US$500 trades go through the platform instead of WhatsApp.
3. **A captive remarketing list.** Every buyer's phone number, ready for next week's sale.

---

## 4. Customer (the auction house operator)

### Persona — "Mr. Mawere"
- 50-something, third-generation auction-house owner outside Harare.
- Runs the floor every Saturday. Knows the regular buyers by name.
- Sceptical of tech he can't see — but his teenage daughter sells him on EcoCash three years ago and he hasn't looked back.
- Reads the *Sunday Mail* livestock prices column on his phone every week.
- Decision criteria, in order: (1) does it keep my brand on the receipt? (2) does it bring me new buyers? (3) does it touch the police clearance step? (4) how does it pay out and when?

### What he won't buy
- A platform that disintermediates him. The marketplace must carry **his auction house's name**, not ours.
- A self-service tool he has to operate himself. He hired one person to do EcoCash reconciliation — he is not hiring another to administer software.
- A black-box payment flow. He needs to see every settlement, every cent, in a way he can show his bookkeeper.
- An upfront fee that arrives with no people attached. If we're charging him money on day one, there'd better be a team in the room with him on day one.

### What he will buy
- A **professional-service engagement** with named people: a deployment fee that includes a training day on his floor, with our operations lead present in person.
- A monthly retainer in exchange for us *running* the platform on his behalf — he calls a number when something breaks, we fix it, he doesn't open the codebase.
- A modest transaction surcharge on what we settle, framed as "shared upside" not "platform fee".
- A 12-month renewable commitment, not a multi-year lock-in. He wants to be able to walk if it doesn't work.

### Where we find him
- The Zimbabwe Livestock Producers Association (ZLPA) annual conference.
- Word-of-mouth from the first pilot house.
- Cold visits — yes, in person, on Saturdays.

---

## 5. Competitive landscape

| Alternative | What they offer | Where we win |
|---|---|---|
| **WhatsApp groups** | Free, ubiquitous, instant | No settlement, no escrow, no police clearance, no chain of custody. We're the path for trades > US$200 where trust starts to matter. |
| **Physical-only auction houses** (status quo) | Trust infrastructure already in place | We're not their replacement — we're their digital extension. Coopetition, not competition. |
| **Generic marketplaces** (Facebook Marketplace, Classifieds) | Reach | No payment integration, no livestock-specific workflow (breed, weight, vet record), no police-clearance hook. |
| **Foreign livestock platforms** (Auctions Plus AU, LMA NZ) | Mature product | Built for AUD/NZD card payments, not EcoCash USSD. Don't speak Shona, don't know the constable workflow, no Paynow integration. |
| **Imagined competitor: a Paynow-built first-party marketplace** | Same payment rails | Paynow's strategic position is to be infrastructure, not a vertical operator. This is exactly why we partner *with* them, not against them. |

The competitive moat isn't technology. The moat is **local presence + Paynow partnership + auction-house relationships**. The product is what makes those three things compound.

---

## 6. Business model — Software as a Professional Service

We do not sell a licence. We sell an **engagement**: deployment + training + ongoing operations of a digital marketplace branded as the auction house's own. Three layered revenue lines, each tied to a different unit of value we deliver.

### 📌 Pricing reference — single source of truth

**This table is the canonical price list. Every other document (GTM, pilot proposal, playbook, financial model, sales script) references these numbers. If a number disagrees with this table, this table wins — update the sibling doc.**

> **Revised June 2026.** The original May figures (Tier A $10–12k / $2,000–2,500/mo) assumed willingness-to-pay we have no field evidence for. These leaner numbers reflect what a Zimbabwean auction house — netting fees on a manual floor, paying in USD — will realistically commit to.

| Tier | Engagement (one-off) | Retainer (monthly) | Sale-day GMV target | Sale days / mo |
|---|---:|---:|---:|---:|
| **A — Anchor house** | $8,000 | $1,500 | $80–120k | 4 (weekly) |
| **B — Mid-market**   | $6,000 | $1,200 | $40–80k  | 3 (weekly–fortnightly) |
| **C — Small / regional** | $4,000 | $900 | $10–30k | 2 (fortnightly) |
| **Pilot (any tier)** | $5,000 *(discounted from $8k list)* | $1,000 for 90 days, then converts to tier-appropriate rate | varies | varies |

Plus, across all tiers:
- **Transaction surcharge: 0.75%** of settled GMV, sits on top of Paynow's own fee.
- **Pass-through costs:** Bisafe escrow, SMS, Paynow merchant-transfer — no markup.
- **Commitment:** 12-month renewable from month-4 of pilot or day-one of standard engagement.

### Revenue streams

**1. Deployment engagement (one-off, billed up front)**
- US$5,000 – US$12,000 per auction house, sized to the house's scale.
- Covers: discovery workshop, branded skin (their colours, their logo, their domain), data migration from existing customer lists, on-site training day for floor staff + constable, integration testing with their Paynow merchant account, hand-off to the operations engagement.
- This is the deliverable Mr. Mawere can show his bookkeeper and his association — a project, not a subscription.

**2. Operations retainer (monthly, the recurring spine)**
- US$1,200 – US$2,500/month per auction house, depending on volume tier.
- Covers: we operate the platform on their behalf. Monitoring, customer support for buyers/sellers, payment reconciliation, monthly reporting, ongoing tuning. The auction house's staff handle the floor and the constable — *we* handle every screen, every USSD prompt, every webhook.
- This is what makes it "as a professional service" — the auction house is buying our team's time, with software as the leverage.

**3. Transaction surcharge (small, tied to GMV)**
- 0.75% of every sale that settles through the platform. Smaller than a SaaS-style commission because the retainer is doing most of the heavy lifting.
- Sits on top of Paynow's own fee — neutral to the auction house's takehome since the alternative (a buyer at the door) costs them roughly the same in cash-handling, security, and float.

### Why this shape (vs. a pure subscription or pure commission)

A pure **commission** model rewards us for processing volume but doesn't pay for the human work of keeping a non-tech-native auction house operational. The first call about "how do I refund this buyer?" eats half a day per month — and there's no commission on that.

A pure **subscription** model assumes the auction house can self-onboard. They can't. The deployment engagement is non-negotiable for the first 12 months.

A **layered SaPS** model lets the engagement fee pay for the day-one work, the retainer pay for the steady-state operations, and the small per-tx surcharge align long-term incentives. Every revenue line is tied to a different unit of value we deliver.

### Unit economics — the per-house unit works

The honest test is per-house. A **mature Tier B house at just 15% digital adoption** — the conservative ceiling for a manual cash market — looks like this:

| Line | Amount / yr |
|---|---:|
| Retainer ($1,200/mo × 12) | $14,400 |
| Transaction surcharge (15% of ~$2.16M GMV × 0.75%) | $2,430 |
| **Recurring revenue / yr** | **$16,830** |
| Variable cost to serve (per-house infra) | −$1,440 |
| **Contribution / yr** | **~$15,390** |

Plus a one-off **$6,000 engagement** in year 1. A mature **Tier A** house contributes ~$21,400/yr on the same basis.

**The unit is sound. The portfolio is not — yet.** One house contributes ~$15–21k/yr; the founder-lean cost base is ~$48–55k/yr. So the business needs **~5–6 houses with the early ones matured** to cover its fixed cost. That is the whole game — and it is why the only thing we throttle is operations capacity. See [`financial-model.xlsx`](financial-model.xlsx) for the month-by-month build.

### Costs

- **Founder-lean by design.** A modest founder draw, one part-time support person added when the second house lands, a second late in year 3 — not a funded org chart. Total fixed cost ~US$48–55k/yr.
- Infrastructure: Supabase + Vercel + Cloudflare ≈ **US$250/month base** + ~US$120/active house; grows slowly with the book.
- Variable: Bisafe escrow, SMS, Paynow merchant-transfer fees — all pass-through.

### Path to break-even — honest version

The leanest base case (3 houses, 15% adoption) is **investment-stage through all three years**: Year 1 ~−$19k, Year 2 ~−$13k, Year 3 ~−$7k net; standalone break-even sits beyond month 36.

The constraint is **scale, not adoption** — doubling adoption (15% → 30%) recovers only ~$200/month. What flips the model is house count: with **6 houses by month 44, 20% adoption, and the transport margin**, cumulative net turns positive ~month 36 and reaches ~+$103k by month 60. That path-to-viability is upside we earn — never the plan of record.

The growth ceiling is set by how many auction houses we can *operate* well, not by software margins. Fewer customers, modest revenue per customer, high service intensity — and a deliberately slow, honest climb.

---

## 7. Risks & how we de-risk

| Risk | Likelihood | Mitigation |
|---|---|---|
| Auction houses don't pay — they take the software for free | Medium | Revenue share, not upfront subscription. We only make money when they do. |
| Paynow changes terms / pulls integration | Low (we're internal-friendly) | Multi-rail by design — Paynow primary, Ecocash USSD direct as fallback, Stripe for diaspora buyers. |
| A bigger company copies us | Low (no obvious threat) | Local auction-house relationships are not buildable at the speed software is. The relationship moat compounds faster than the code moat. |
| Police-clearance digitization gets blocked by the state | Medium | v1 ships *with* the constable on-site, not without — we augment, not replace. The state has reasons to like an audit trail. |
| Regulatory ambiguity around digital animal trading | Medium | Engage the Ministry of Lands early; position as a *record-keeping* tool that improves national livestock census data. |

---

## 8. The ask

A **paid 90-day engagement** with one Harare-area auction house, structured as the first deployment under the SaPS model:

- US$5,000 deployment fee, billed at signing — discounted from list price (US$8,000) because the house is taking pilot risk with us.
- US$1,000/month operations retainer, billed month-to-month for the pilot, convertible to a 12-month commitment (at the $1,200 Tier B rate) at month 4 if both sides are happy.
- 0.75% transaction surcharge on settled sales.
- Paynow listed as the payment partner of record on all marketing and receipts.

**Success criterion at month 3:**
1. ≥ 30% of a single sale day's GMV runs through the platform.
2. The house signs a 12-month operations commitment.
3. The house agrees to be a named reference for engagement #2.

If we hit all three, we have a paying reference customer, a number, and a sales artefact. If we hit (1) but not (2)/(3) the issue is sales/relationship and we adjust how we pitch. If we miss (1) the issue is product/market fit and we revisit before signing engagement #2.

**Why paid, not free:** a free pilot teaches us nothing about willingness to pay — which is the only signal that matters for the SaPS model. Better to discount than to give it away.

---

## 9. Appendix — what we've already built (de-risks the pitch)

| Capability | Status |
|---|---|
| Live React PWA, mobile-first, USSD-friendly | ✅ shipped (production) |
| Paynow Express Checkout integration | ✅ live, demoed |
| BillPay biller-inbound API | ✅ coded, awaiting Paynow IPs |
| TXT.co.zw SMS notifications | ✅ live, demoed |
| Atomic auction-close + winner-detection RPCs | ✅ live |
| Agentic auto-buy demo | ✅ demoed to Paynow leadership 2026-05-08 |
| Bisafe escrow integration | ⏳ designed, awaiting Paynow Bisafe spec |
| Paab cash-collection integration | ⏳ designed, awaiting Paynow Paab spec |

The first six rows mean: the product Mr. Mawere would log in to next Saturday already exists. The pitch is not "give us money to build" — it's "let us deploy what's built."
