# ZimLivestock — Business Case

> **Status:** v3.0  ·  **Author:** Tatenda Nyemudzo  ·  **Date:** May 2026 — *pricing + unit economics revised June 2026 to the v3.0 scaling-platform model*
> **Audience:** Paynow MD, ZimLivestock leadership, prospective auction-house partners
> **Companion docs:** [`gtm-strategy.md`](gtm-strategy.md) · [`pilot-proposal.md`](pilot-proposal.md) · [`financial-model.xlsx`](financial-model.xlsx)
> **Canonical numbers live in [`gtm-strategy.md`](gtm-strategy.md) (v3.0).** This document defers to it for all pricing and financials.

---

## 1. The pitch in one line

> **"We run the digital floor — and you onboard in an afternoon."**
>
> ZimLivestock is a **B2B SaaS platform** for Zimbabwean livestock auction houses. Each house onboards as an isolated (RLS) tenant through a self-serve wizard, gets a branded digital marketplace on top of its existing business, and integrates with Paynow for settlement and Bisafe for escrow. The auction house keeps its brand and its customer relationships. Houses pay a one-off onboarding fee, a monthly platform subscription, and a thin transaction take on settled GMV. Over time the platform diversifies into B2B2C consumer revenue through **transport** (delivery). **B2B today, B2B2C tomorrow.**

**Why a platform that scales, not a bespoke service:** auction houses are not tech-native, but they don't need a per-house engineering build either. A self-serve onboarding wizard (`/operators` → admin approval → a ~6-minute RLS-isolated tenant, no SQL) makes onboarding low-touch, so the platform can grow to ~20 houses — about a third of the ~40–60 house market — over five years without a bespoke project behind each one. The product is the platform *plus* the wizard that makes it reachable at scale, across five live channels: web/PWA, WhatsApp, USSD, BillPay-as-biller, and Facebook Messenger.

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
- A black-box payment flow. He needs to see every settlement, every cent, in a way he can show his bookkeeper.
- A multi-year lock-in. He wants to be able to walk if it doesn't work.
- A heavy IT project. He won't sit through a months-long bespoke build — onboarding has to be fast and low-touch, or it's not worth his Saturday.

### What he will buy
- A **subscription to a platform that carries his brand** — and onboarding he can complete in an afternoon. The self-serve wizard means his tenant is live (RLS-isolated, no SQL, no engineer on his floor) inside minutes, not weeks; he supplies his details, we approve, the marketplace goes up under his name.
- A one-off **onboarding fee** that covers the setup, branding, and data migration — a project line he can show his bookkeeper and his association.
- A monthly **platform subscription** for us running the platform on his behalf: he calls a number when something breaks, we fix it, he doesn't open the codebase. He hired one person for EcoCash reconciliation; he is not hiring another to administer software, and with the wizard he doesn't have to.
- A modest transaction take on what we settle, framed as "shared upside" not "platform fee".
- A 12-month renewable commitment, not a multi-year lock-in.

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

## 6. Business model — a scaling B2B SaaS platform

We do not sell a licence and we do not sell a bespoke build. We sell a **subscription to a platform**: self-serve onboarding + a branded marketplace + ongoing operations, with the auction house live as an isolated tenant in an afternoon. Three B2B revenue lines today, plus a B2B2C consumer line (transport) that grows over time. **B2B today, B2B2C tomorrow.**

### 📌 Pricing reference — defers to the canonical model

**The canonical price list lives in [`gtm-strategy.md`](gtm-strategy.md) (v3.0) and the financial model. The table below mirrors it. If a number ever disagrees, the GTM strategy wins — update this doc.**

> **Revised June 2026.** The figures reflect what a Zimbabwean auction house — netting fees on a manual floor, paying in USD — will realistically commit to, sized so onboarding is a one-off project line and the subscription is the recurring spine.

| Tier | Onboarding fee (one-off) | Subscription (monthly) | Sale-day GMV target | Sale days / mo |
|---|---:|---:|---:|---:|
| **A — Anchor house** | US$3,500 | US$1,500 | $80–120k | 4 (weekly) |
| **B — Mid-market**   | US$2,500 | US$1,200 | $40–80k  | 3 (weekly–fortnightly) |
| **C — Small / regional** | US$1,500 | US$900 | $10–30k | 2 (fortnightly) |
| **Pilot (any tier)** | US$1,000 *(credited toward the full tier onboarding fee on conversion — a converting house never pays twice)* | US$1,000/mo for 90 days, then converts to the signed tier rate | varies | varies |

Plus, across all tiers:
- **Transaction take: 0.75%** of settled GMV, sits on top of Paynow's own fee.
- **Transport (consumer line):** buyer quote US$15 base + US$0.35/km, capped US$250. The platform keeps only the flat US$15 booking leg (≈ US$12.00 net after ~US$3 processing); the transporter prices and keeps the entire distance-based haul.
- **Pass-through costs:** Bisafe escrow, SMS, Paynow merchant-transfer — no markup.
- **Commitment:** 12-month renewable from month-4 of pilot or day-one of standard onboarding.

### Revenue streams

**1. Onboarding fee (one-off, billed up front)**
- US$1,500 – US$3,500 per auction house, sized to the house's tier.
- Covers: discovery, branded skin (their colours, their logo, their domain), data migration from existing customer lists, integration testing with their Paynow merchant account, and the self-serve wizard that provisions their RLS-isolated tenant. Onboarding is low-touch — minutes in the wizard, not a months-long engineering project.
- This is the deliverable Mr. Mawere can show his bookkeeper and his association — a project line, not a subscription.

**2. Platform subscription (monthly, the recurring spine)**
- US$900 – US$1,500/month per auction house, depending on volume tier.
- Covers: we operate the platform on their behalf. Monitoring, customer support for buyers/sellers, payment reconciliation, monthly reporting, ongoing tuning across all five channels. The auction house's staff handle the floor and the constable — *we* handle every screen, every USSD prompt, every webhook.
- This is the durable B2B spine — recurring revenue that scales with house count, not with any single sale day.

**3. Transaction take (small, tied to GMV)**
- 0.75% of every sale that settles through the platform. Smaller than a SaaS-style commission because the subscription is doing most of the heavy lifting.
- Sits on top of Paynow's own fee — neutral to the auction house's takehome since the alternative (a buyer at the door) costs them roughly the same in cash-handling, security, and float.

**4. Transport / delivery (the B2B2C consumer line, grows over time)**
- Cattle delivery is the #1 post-sale complaint we found in the field. We monetise it on the buyer side: a flat US$15 booking leg the platform keeps (≈ US$12.00 net), with the transporter pricing and keeping the distance-based haul on a route-batched full truck.
- This is where the platform diversifies from pure B2B into B2B2C. Attach-rate ramps 5% → 9% → 14% → 19% → 24% across Y1–Y5, lifting the consumer share of revenue from ~1.3% to ~8.8%.

### Why this shape (vs. a pure subscription or pure commission)

A pure **commission** model rewards us for processing volume but doesn't pay for the human work of keeping a non-tech-native auction house operational. The first call about "how do I refund this buyer?" eats half a day per month — and there's no commission on that.

A pure **commission** also can't fund the day-one setup. The onboarding fee pays for that.

A **layered platform** model lets the onboarding fee pay for the day-one work, the subscription pay for the steady-state operations, the small per-tx take align long-term incentives, and transport open a consumer line on top. Every revenue line is tied to a different unit of value we deliver — and the wizard keeps onboarding cheap enough that adding the next house doesn't require adding a bespoke project.

### Unit economics — the per-house unit works

The honest test is per-house. A **mature Tier B house at field-honest digital adoption (~13%)** — below the ~15% mature ceiling for a manual cash market — looks like this:

| Line | Amount / yr |
|---|---:|
| Subscription ($1,200/mo × 12) | $14,400 |
| Transaction take (~13% of ~$2.16M GMV × 0.75%) | ~$2,100 |
| **Recurring revenue / yr** | **~$16,500** |
| Variable cost to serve (per-house infra + pass-through) | −$1,440 |
| **Contribution / yr** | **~$15,060** |

Plus a one-off **US$2,500 onboarding fee** in year 1. A mature **Tier A** house contributes ~$21k/yr on the same basis, and adoption sits field-honest in the 10.5–13.7% band — we never lean on adoption as a growth lever.

**The unit is sound, and it gets cheaper to add the next one.** Because onboarding runs through the self-serve wizard (a ~6-minute RLS-isolated tenant, no bespoke engineering), the cost of landing house N+1 is low-touch. What we scale on is **house count + transport**, not adoption — adoption is held field-honest. See [`financial-model.xlsx`](financial-model.xlsx) for the month-by-month build.

### Costs

This is **largely self-funded**, not a financed startup. There is no funding round to raise in Zimbabwe and USD is scarce, so the model is built to need none — but it does carry a real team and a prudent working-capital buffer.

- **The founder draws a salary, inside payroll.** Year 5 payroll of US$198k funds a real ~9–13 person org — not a lean one-person shop. People are hired against a scaling book, not ahead of imagined revenue.
- **Costs scale with the book.** Total operating cost runs **US$48,841 → $84,274 → $132,810 → $181,365 → $235,930** over Y1–Y5, against revenue of **$61,636 → $130,867 → $198,346 → $277,259 → $361,695**. Payroll is the dominant line (US$36k → $198k); infrastructure stays modest (US$3,600 → $5,400).
- Infrastructure: Supabase + Vercel + Cloudflare — grows slowly with the book (US$3,600/yr in Y1 to US$5,400/yr in Y5).
- Variable: Bisafe escrow, SMS, Paynow merchant-transfer fees — all pass-through (US$241 → $530/yr).
- **$0 external equity.** Growth is funded from operating surplus plus a held **2–3 month opex working-capital buffer** — not borrowed, not raised. Year 1's surplus cushion is thin (~3.5 weeks of opex), which is exactly why the buffer is non-negotiable.

### The money story — the 5-year model

The business is surplus-positive from Year 1 and the surplus compounds as houses are added and transport attaches. All figures US$:

| Year | Houses live (EOY) | Revenue | Operating cost | Surplus |
|---|---:|---:|---:|---:|
| 1 | 5 | $61,636 | $48,841 | **+$12,795** |
| 2 | 8 | $130,867 | $84,274 | **+$46,593** |
| 3 | 12 | $198,346 | $132,810 | **+$65,536** |
| 4 | 16 | $277,259 | $181,365 | **+$95,894** |
| 5 | 20 | $361,695 | $235,930 | **+$125,765** |
| **5-yr** | — | **$1,029,803** | **$683,220** | **+$346,583** |

Cumulative surplus builds **$12,795 → $59,388 → $124,924 → $220,818 → $346,583**.

Revenue is **subscription-led** — the subscription line alone runs $39,600 → $266,400 (5-yr $766,800), the durable spine that doesn't depend on any single sale day. GMV routed onto Paynow rails grows **$894,600 → $2,463,200 → $3,683,300 → $5,310,800 → $7,149,100** — about **US$19.5M over five years**. The revenue mix shifts from 98.7% auction-house / 1.3% consumer-transport in Y1 to 91.2% / 8.8% in Y5 as the B2B2C transport line matures.

**What moves the number is house count and transport, not adoption.** Blended digital adoption is held field-honest at 10.5 / 11.5 / 12.3 / 13.0 / 13.7% — deliberately below the mature ceiling, never used as a growth lever. We ramp from 5 live houses to 20 (5 → 8 → 12 → 16 → 20), anchors-first, and let transport attach behind the GMV. The single **most aggressive assumption** is landing 3 of ~8 Tier A anchors in Year 1 — that's the load-bearing bet, and we name it as such.

**Growth is self-funded, with a buffer.** Operating surplus funds the next cohort of onboardings; the 2–3 month opex buffer absorbs the thin early-year cushion. There is no funding round because there is nowhere in Zimbabwe to raise one — and the model is built so it doesn't need external equity. The result is a durable, scaling climb run by a small team: moderate scale by choice (~1/3 of the market), modest revenue per customer, recurring subscription as the spine, and transport diversifying the line over time.

---

## 7. Risks & how we de-risk

| Risk | Likelihood | Mitigation |
|---|---|---|
| Auction houses don't pay — they take the software for free | Medium | The marketplace runs under their brand on *our* platform — they can't fork it. The pilot deposit is creditable, so converting is the cheaper path, and the transaction take aligns us to their upside. |
| Paynow changes terms / pulls integration | Low (we're internal-friendly) | Multi-rail by design — Paynow primary, Ecocash USSD direct as fallback, Stripe for diaspora buyers. |
| A bigger company copies us | Low (no obvious threat) | Local auction-house relationships are not buildable at the speed software is. The relationship moat compounds faster than the code moat. |
| Police-clearance digitization gets blocked by the state | Medium | v1 ships *with* the constable on-site, not without — we augment, not replace. The state has reasons to like an audit trail. |
| Regulatory ambiguity around digital animal trading | Medium | Engage the Ministry of Lands early; position as a *record-keeping* tool that improves national livestock census data. |
| **USD scarcity & entrenched cash habits** | High | We price in USD and settle on Paynow rails buyers already trust; the long-tail tier meets cash-preferring sellers where they are rather than forcing a behaviour change. |
| **Currency volatility (ZWL swings)** | High | All pricing and contracts are denominated in **US$**, never local currency — payroll and the houses' obligations are insulated from the swing. |
| **Thin early-year cushion** | Medium | Year 1 surplus is ~3.5 weeks of opex. Mitigation: hold a **2–3 month opex working-capital buffer**, self-funded, so a bad month dents surplus, never solvency. No external equity required. |
| **Anchor-landing risk** | Medium-High | The most aggressive assumption is landing **3 of ~8 Tier A anchors in Year 1**. If anchors slip, the ramp slips. We sequence anchors-first, lead with a creditable pilot, and pace the team hire against signed houses rather than ahead of them. |

---

## 8. The ask

A **paid 90-day pilot** with one Harare-area auction house, structured as the first onboarding under the platform model:

- US$1,000 onboarding deposit, billed at signing — **credited toward the full tier onboarding fee on conversion**, so a converting house never pays twice.
- US$1,000/month platform subscription, billed month-to-month for the 90-day pilot, converting to the signed tier rate (e.g. the $1,200 Tier B rate) at month 4 if both sides are happy.
- 0.75% transaction take on settled sales.
- Paynow listed as the payment partner of record on all marketing and receipts.

**Success criterion at month 3:**
1. ≥ 30% of a single sale day's GMV runs through the platform.
2. The house signs a 12-month subscription commitment.
3. The house agrees to be a named reference for the next onboarding.

If we hit all three, we have a paying reference customer, a number, and a sales artefact. If we hit (1) but not (2)/(3) the issue is sales/relationship and we adjust how we pitch. If we miss (1) the issue is product/market fit and we revisit before onboarding the next house.

**Why paid, not free:** a free pilot teaches us nothing about willingness to pay — which is the only signal that matters. Better to credit the deposit on conversion than to give it away.

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
