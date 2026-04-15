# Livestock Market Research Summary

**Internship deliverable — Paynow DX project**
**Date:** 2026-04-14
**Proposal goal addressed:** Goal #1 — *"Understand Real Livestock Market Workflows"*

This document consolidates the field research conducted during the internship to inform the Paynow marketplace prototype's design.

---

## 1. Method

**Two field visits** to a physical livestock auction in Zimbabwe:
- **2026-03-19** — initial observational visit (surface mechanics: fees, deposits, attendance, clearance, auctioneer cadence). See [research/auction-field-visit-2026-03-19.md](../../research/auction-field-visit-2026-03-19.md).
- **2026-03-25** — follow-up deep-dive (system dynamics: trust layers, liquidity clustering, price formation, network density, the ABL metric). See [research/auction-field-visit-2026-03-25.md](../../research/auction-field-visit-2026-03-25.md).

**Supporting data**:
- Structured conversations with sellers, buyers, auctioneer staff, and an on-site police officer
- Pricing observations across multiple animal lots
- Fee structures, deposit barriers, transaction timing
- Comparative review of informal channels (WhatsApp groups, Facebook Marketplace, village networks)

**Known limits:**
- Sample size is one auction operator across two visits; regional variance across Matabeleland, Manicaland, and Masvingo not captured
- Informal channels observed but not systematically measured (no access to WhatsApp group transaction volume)
- Findings are operator-side; end-buyer preferences are inferred, not directly interviewed

Proposal-scoped depth (two formal market studies within a 6-week DX project), not a standalone market-research report. Findings should be read as **directional**, not definitive.

---

## 2. Market Structure

Zimbabwe's livestock trade flows through three largely disconnected channels:

| Channel | Volume signal | Trust mechanism | Fee structure | Digital footprint |
|---|---|---|---|---|
| **Physical auction pens** | High per-session (US$10k+ moves in a 2-hour session at the visited operator) | Deposit + police clearance + physical inspection | 12% total (5% seller + 7% buyer) | Near zero |
| **WhatsApp groups / Facebook Marketplace** | Medium, fragmented | Social reputation within closed groups | Informal (0–3%) | Photos only, no settlement infrastructure |
| **Village / informal networks** | High aggregate, low per-transaction | Kinship + repeat interaction | None | Not applicable |

**Critical observation:** auction pens command **higher per-animal prices** than WhatsApp/Facebook listings despite the 12% fee burden. Buyers pay the premium because the trust infrastructure (deposit, inspection, police clearance, escrow-by-cash-on-site) is built in. This is the pricing logic for the Paynow marketplace prototype: *trust compression has willingness-to-pay*.

---

## 3. Key Findings from the Auction Visit

Surface mechanics confirmed on both visits (2026-03-19 and 2026-03-25); deeper system-dynamics analysis of the same observations is in the [second-visit deep-dive](../../research/auction-field-visit-2026-03-25.md).

### 3.1 Deposit barrier (US$1,000)
Before bidding, every buyer deposits US$1,000 in cash. Filters serious buyers. Has the unintended effect of **excluding the employed-salaried segment** — people who could afford to buy a single US$600 goat but cannot tie up US$1,000 upfront.

**Implication for the marketplace prototype:** a small refundable escrow via Paynow (US$50–100) achieves the same filtering function at one-tenth the friction, opening the market to salaried buyers currently excluded.

### 3.2 Fee asymmetry (12% house take)
Seller pays 5% commission; buyer pays 7% commission. Buyers resent the 7% more than sellers resent the 5% because the 7% lands visibly on top of an already-hard-fought bid.

**Implication:** a platform-fee structure that shifts the weight toward the seller-side (e.g. 4% seller / 2% buyer for a 6% total) is both cheaper AND psychologically better-received than splitting it 3/3.

### 3.3 Attendee composition is NOT end consumers
90%+ of buyers at the physical auction are **dealers / resellers**, not individuals acquiring for their own consumption or breeding. End buyers (restaurants, butcheries, individual farmers) buy *from* the dealers later at a second markup.

**Implication:** the auction operator is a B2B wholesaler with retail optics. The real untapped segment for a digital marketplace is **end-buyers who currently can't access auction pricing** — salaried urban families, diaspora buyers arranging purchases for family, butcheries too small to send a dealer.

### 3.4 Police clearance is a mandatory state gate
A policewoman is physically present and must clear every animal before ownership transfer. Brand check, vet-cert sighting, provenance verification. This is **not regulatory theatre** — stock theft recovery rates are estimated at ~15% by the Zimbabwe Commercial Farmers Union, and the police sign-off is the audit layer that keeps the whole system legible.

**Implication:** any digitization of the auction flow must model police clearance as a **first-class state**, not metadata. A marketplace that "skips" clearance would be unusable in practice and illegal in principle. The pilot built during Week 5 (see `docs/auction-pilot-architecture.md`) reflects this — clearance is a named state in the ownership state machine alongside registered, auctioned, paid, transferred.

### 3.5 Transport is a shared pain
Both buyer and seller lose time and money on transport. Buyer pays a truck to collect the animal; seller loses days if the buyer's truck doesn't arrive. Currently resolved by informal arrangement (phone calls, cash on delivery to drivers).

**Implication:** a partnership layer with transport operators, integrated into settlement (funds released on proof of delivery), is the natural next adjacent service for any livestock marketplace. Out of scope for the internship prototype but recorded as a phase-2 direction.

### 3.6 Auctioneer speed generates FOMO
The live auctioneer talks fast, lot-to-lot cadence is 30–90 seconds, and this produces genuine urgency that pushes bids up.

**Implication for the marketplace:** an async-bidding platform inherently loses this FOMO effect. Sellers will see lower final prices online than at physical auctions for equivalent animals, at least initially. Mitigation: short timed windows (24–72 hour auctions) and a "closing burst" notification scheme.

---

## 4. What the field data says about payments in this market

Four observations about the Zimbabwean livestock market that are directly relevant to Paynow's DX project, stated as findings:

1. **Payment-failure cost is asymmetric in reputation-constrained markets.** The livestock trade runs on repeat-transaction trust between parties who know each other by name; a single failed payment damages reputation built over years. Retry-and-fallback logic — already demonstrated in the prototype's payment orchestrator — is therefore more valuable per transaction than in markets where buyer-seller relationships are anonymous.

2. **The 12% physical-auction fee prices trust-compression, not custody.** Buyers pay the premium (vs informal WhatsApp/Facebook channels at 0–3%) because deposit + inspection + police clearance + cash-on-site collectively reduce default risk. A digital equivalent that replicates the trust guarantees at a lower fee has pricing headroom — it's a wedge, not a race to zero.

3. **Institutional friction in this market is physical, not digital.** Zimbabwean payment rails (EcoCash, OneMoney, Paynow) are already digital. The real friction is transport, vet certification, and police clearance — all physical. This matters for the DX project because it clarifies what a payment rail can and cannot solve: retry logic and settlement clarity compound; logistics automation does not.

4. **The Paynow Cloudflare blocker dominates the DX findings.** During integration work, all server-to-server calls from Supabase Edge Functions to `www.paynow.co.zw` were blocked by Cloudflare anti-bot rules. The full DX benchmark report covers this, but it bears restating here because it shapes which marketplace patterns are available: any live-payment flow using Paynow from a serverless runtime requires a workaround. The prototype's browser-relay pattern is viable for demos but not production scale.

---

## 5. How These Findings Shaped the Prototype

| Finding | Prototype decision |
|---|---|
| Deposit barrier excludes salaried buyers | Small refundable escrow via Paynow (optional, per-auction) |
| Fee asymmetry | Prototype models 5–6% total fee, weighted toward seller-side |
| Police clearance is mandatory state | Implemented as first-class state in the ownership state machine (pilot branch) |
| Transport is shared pain | Out of scope v1; logged as phase-2 adjacency |
| Auctioneer FOMO | Timed auction windows (1/3/7/14 days), notifications on final hour |
| Payment failure rates high | Retry + fallback chain (EcoCash → OneMoney → Card) with full audit via settlement_ledger |
| Cloudflare blocking | Browser-relay pattern documented; flagged as top Paynow DX finding |

---

## 6. What Would Require More Research (out of internship scope)

Honest gaps I did not close:

1. **Regional variance.** Only one operator visited. Matabeleland cattle economics differ materially from Mashonaland East. Multi-site study would cost ~US$800 in travel and 4 weeks.
2. **End-buyer demand-side interviews.** All findings are operator-side; we inferred buyer preferences from auctioneer commentary. A survey of 50+ salaried urban potential buyers would validate the "excluded segment" hypothesis.
3. **Regulatory deep-dive.** Interactions with AMA (Agricultural Marketing Authority) and RBZ rules on digital livestock settlement are currently inferred from observation; formal legal review is required before any commercial launch.
4. **Stock-theft recovery data.** The 15% recovery rate is a sector estimate cited informally by the Commercial Farmers Union; no primary source confirmed within the internship window.

These are not blockers for the DX project (which is about Paynow's developer experience, not building a production livestock marketplace). They are flagged for honesty and to inform any post-internship continuation.

---

## 7. Sources and Related Deliverables

**Primary sources:**
- [research/auction-field-visit-2026-03-19.md](../../research/auction-field-visit-2026-03-19.md) — first visit, surface mechanics
- [research/auction-field-visit-2026-03-25.md](../../research/auction-field-visit-2026-03-25.md) — second visit, system dynamics
- Conversations with sector-adjacent informants

**Related deliverables:**
- [payment-test-results.md](./payment-test-results.md) — Paynow integration test results including Cloudflare blocking evidence
- [ecosystem-integration-retrospective.md](./ecosystem-integration-retrospective.md) — BillPay + TXT vs Paynow Core DX comparison
- [../../docs/auction-pilot-architecture.md](../../docs/auction-pilot-architecture.md) — pilot state machine instrumenting these findings
- [../../AGENTIC.md](../../AGENTIC.md) — agentic commerce prototype demonstrating retry-and-fallback recovery

**Internship brief goal traceability:**
- *Goal #1: "Understand Real Livestock Market Workflows"* → this document
- *Goal #2: "Integrate Paynow Into a Realistic Marketplace Scenario"* → the deployed prototype (see README)
- *Goal #3: "Evaluate Paynow Developer Experience"* → DX benchmark report (separate deliverable)

---

## 8. One-Sentence Summary

Zimbabwe's physical auction infrastructure prices trust-compression (12% fee for deposit + inspection + police clearance) but structurally excludes salaried urban buyers; the prototype demonstrates that a digital equivalent can replicate those trust guarantees at lower fees, with the Cloudflare DX blocker as the primary obstacle to a production-scale Paynow integration.
