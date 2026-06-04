# ZimLivestock — Go-to-Market & Strategy

**Version:** v3.0
**Author:** Tatenda Nyemudzo
**Date:** June 2026
**Supersedes:** v2.0 — where any figure here disagrees with an earlier document, **this wins**.
**Companion docs:** [business-case.md](./business-case.md) · [pilot-proposal.md](./pilot-proposal.md)

---

## What changed since v2.0 (read first)

v2.0 modeled a deliberately conservative, owner-operated, **three-house bootstrap** with no founder salary and no external capital — a floor designed to prove the thing could survive, not that it would scale. That was the right posture for its moment. It is no longer the posture.

v3.0 reframes the business as a **scaling B2B-SaaS platform** — auction houses onboard and pay as isolated tenants — **that diversifies into B2B2C consumer revenue through transport** over time. The B2B layer is monetized today; the consumer layer is upside the B2B layer makes possible.

Two concrete things make the growth story warranted now, where it was not before:

1. **A self-serve onboarding wizard.** Each new auction house used to be a multi-week, per-house engineering build. It is now a request at `/operators` → admin approval → a ~6-minute, no-SQL, RLS-isolated live tenant. Adding the tenth house costs roughly what adding the second did. That is the precondition for scale, and only now is it true.
2. **Five live distribution channels** — web/PWA, WhatsApp Cloud bot, USSD, BillPay-as-biller, and Facebook Messenger — that meet Zimbabwean buyers and sellers where they already transact, instead of forcing them to a single app.

> **One sentence for the panel:** ZimLivestock is a settlement-and-payout platform that auction houses pay to onboard onto today, and that monetizes final consumers through delivery as the installed base grows — moderate scale (~20 houses, a third of the market, by Year 5), largely self-funded, with every dollar of GMV routed onto Paynow rails.

---

# The v3.0 Reframe: From Bootstrap Floor to Settlement Platform

## The Frame

ZimLivestock v2.0 was written defensively. It modeled a three-house, owner-operated business with no salary and no external capital — a deliberate floor that proved the thing could survive, not that it would scale. That framing was correct for its moment, but it has been superseded. Two things changed what is reachable: a self-serve onboarding wizard that turns each new auction house from a multi-week engineering build into a ~6-minute, admin-approved, RLS-isolated tenant; and five live distribution channels — web/PWA, WhatsApp, USSD, BillPay-as-biller, and Facebook Messenger — that meet Zimbabwean buyers and sellers where they already are. When onboarding stops being bespoke labor, adding the tenth house costs roughly what adding the second did. That is the precondition for a growth story, and only now is it true.

So v3.0 states it plainly: this is a B2B SaaS platform that monetizes auction-house onboarding **today**, and evolves into a B2B2C marketplace that monetizes final consumers — through transport — **over time**. The order is not cosmetic. The B2B layer funds and de-risks the business now; the consumer layer is upside that the B2B layer makes possible.

## The B2B2C Flywheel

The sequence is the strategy. Auction houses onboard as paying tenants. Each house brings its own sellers and buyers onto the platform — people who were already transacting, now settling on rails instead of in cash and WhatsApp groups. As those buyers and sellers transact, consumer transaction volume accumulates inside the platform. That volume is the precondition for consumer revenue: a single house generates too few post-sale deliveries to matter, but twelve houses' worth of buyers, each needing cattle moved after a sale, is a real book of logistics demand. Transport revenue then makes the platform stickier for the houses themselves — a house whose buyers get reliable delivery and whose sellers stop losing sales to delivery friction has a harder reason to leave.

The discipline here is refusing to invert the order. You cannot monetize consumers before the houses bring them. Every consumer-revenue line in v3.0 sits downstream of B2B onboarding, which is why the model leans on house retainers in the early years and only lets transport margin become material as the installed base of houses — and therefore buyers — grows.

## Why Transport, and Why Only Transport

Transport is the right consumer line for three concrete reasons, not aspiration. First, it is already shipped: sellers toggle delivery on a listing, buyers get a distance-based quote at checkout (geocoding plus haversine, US$15 base + US$0.35/km, capped at US$250), and the margin is captured per booking. There is no new product to build. Second, it solves the single biggest unsolved friction we observed on a full sale day — cattle delivery is the #1 post-sale seller complaint, the thing that breaks otherwise-good sales. Third, the buyer already expects to pay for delivery; we are not inventing a fee, we are intermediating a cost the consumer was always going to bear, and taking a margin for making it reliable and accountable.

That is also why transport is the *only* modeled consumer line. Buyer transaction fees, diaspora FX margin, financing, and data-sale revenue are all plausible future optionality, and we will name them as such — but none are in the numbers. Modeling revenue we have not shipped against frictions we have not validated is exactly the over-promising v2.0 was built to avoid. We keep that discipline.

## Operating Model

This is no longer a solo bootstrap, but it is not a venture burn either. Running ~20 houses by the end of Year 5 — roughly a third of the ~40-60 house market, ramping about 5 → 8 → 12 → 16 → 20 — needs a small team, added in phases as the house count justifies it: the founder on product, partnerships, and the anchor Tier A accounts; then an operations/onboarding lead as the wizard pipeline fills; then a support person as live tenants and their buyers generate day-to-day volume and the transport book needs coordinating. The wizard is what keeps this lean — low-touch onboarding means headcount tracks support load, not onboarding labor.

The constraint is real and we plan inside it: Zimbabwe has effectively no venture capital and scarce USD. v3.0 is a growth story that still aims to be largely self-funded, with house retainers covering opex as the base scales. The ambition is moderate by design — a third of the market, not all of it — precisely because the financing environment rewards a business that funds its own next house rather than one that needs outside capital to reach the one after.

## Paynow Alignment

Every channel settles on Paynow, and every payout to a seller runs the same rails (Integration ID 23997; Stripe is the diaspora/card fallback only). This is the strategically load-bearing point. Zimbabwe has four national livestock-digitization initiatives — Mastercard's E-Livestock RFID identity, the government Digital Stock Card, per-kg online auction networks, VFEX tokenization — and three of the four are identity, title, or asset layers with no money layer underneath them. They can tell you which animal is which and who owns it; they cannot move the money or transfer the title against a settled payment. ZimLivestock is exactly that missing settlement-and-payout engine. Which means the fastest-growing and most strategically legible number in v3.0 is not revenue — it is GMV routed onto Paynow rails. Every house we onboard, every channel we light up, and every delivery we book is volume moving onto rails that were not carrying it before. That is the number to watch, and it is the one Paynow should care about most.

---

## Target Market & the Onboarding Thesis

Zimbabwe has roughly **40-60 auction houses** running regular (weekly/fortnightly) sales, concentrated in three belts: Mashonaland (the Harare belt), Matabeleland (Bulawayo and cattle country), and the Midlands (Gweru/Kwekwe). The market segments cleanly by sale-day GMV and cadence.

| Tier | Profile | Sale-day GMV | Cadence | Count in market |
|---|---|---|---|---|
| **A — anchor** | Highest-volume regional houses; credibility-builders | US$80-120k | Weekly (~4 sale-days/mo) | ~8 |
| **B — mid-market** | Established but smaller throughput | US$40-80k | Weekly–fortnightly (~3/mo) | ~20 |
| **C — small/regional** | Fee-sensitive regional houses | US$10-30k | Fortnightly (~2/mo) | ~20 |

**The onboarding thesis.** The wizard makes an *anchors-first, land-and-fill* motion operable on a small team. We sign the scarce Tier A houses early — they carry the most GMV and the most credibility — then fill toward the market's true B/C-heavy shape as we scale. The ramp is **5 → 8 → 12 → 16 → 20 live houses** at year-end (Years 1-5), reaching ~1/3 of the market. We do not pretend we can manufacture more anchors than exist: by Year 5 we have captured ~7 of ~8 Tier A houses, and incremental growth in Years 4-5 is necessarily mid-market and regional.

Per-year onboarding mix: **Y1** +3A/+1B/+1C (anchor-led launch) · **Y2** +1A/+1B/+1C · **Y3** +1A/+2B/+1C · **Y4** +1A/+2B/+1C · **Y5** +1A/+2B/+1C (final anchor signed; growth now B/C). Houses do not churn inside the 5-year window (12-month renewable commitment; anchors are sticky).

What we recapture is the segment the manual floor excludes. Field research on a full sale day showed a US$1,000 cash deposit gate and 12% combined house fees (5% seller + 7% buyer) push sub-US$500 trades onto WhatsApp groups that have no settlement, escrow, or audit. Those are exactly the trades our settlement+payout layer brings onto rails — which is why our modeled adoption is the *remote/sub-deposit* slice, not the whole sale.

---

## Pricing & Packaging

> **Canonical.** This section supersedes pricing in business-case.md.

The v2.0 one-off (US$4k-US$8k) was priced as a bespoke engineering engagement — weeks of per-house custom build. The wizard collapses that to ~6-minute, no-SQL provisioning, so the fee can no longer be sold as "we build you a system." It is **cut ~55-60%** and reframed as a setup + training + branding + verification package covering real human cost — not engineering. The recurring subscription becomes the spine; the take-rate stays thin and GMV-elastic.

### Onboarding fee (one-time)

| Tier | Fee | What it covers |
|---|---|---|
| **Tier A (anchor)** | **US$3,500** | Wizard provisioning, branded sub-domain + logo/colors, staff training (2 sessions + sale-day shadowing on first live sale), seller/buyer verification setup, Paynow Integration ID linking + settlement-account validation, USSD + WhatsApp + Messenger activation, digital police-clearance workflow config. |
| **Tier B (mid-market)** | **US$2,500** | Wizard provisioning, branding, 1 training session + first-sale support, verification + Paynow settlement linking, activation across web/PWA + WhatsApp + USSD. |
| **Tier C (small/regional)** | **US$1,500** | Wizard provisioning, branding, group/remote training (1 session), Paynow settlement linking, web/PWA + WhatsApp activation. A deliberately low barrier for fee-sensitive regional houses. |
| **Pilot (any tier, 90 days)** | **US$1,000** | Discounted setup to remove the trial barrier: wizard provisioning, branding, one training session, Paynow linking. **Credited toward the full tier onboarding fee on conversion** — a converting house never pays twice. Functions as a refundable trial deposit, not a sunk cost. |

### Platform subscription (monthly)

The v2.0 monthly "retainer" is renamed to a **platform subscription** and the numbers are **held intact** — they are already field-calibrated to Zimbabwe USD willingness-to-pay, and v2.0 proved the recurring line is the spine (~75% of Year-3 revenue). Holding the price while the platform now does materially *more* (five live channels, multi-tenant RLS isolation, the shipped transport surface, digital police clearance, the missing settlement/payout/title layer) strengthens value-per-dollar rather than weakening it.

| Tier | Monthly | What it includes |
|---|---|---|
| **Tier A (anchor)** | **US$1,500** | All five channels, unlimited live sale-days, real-time auction engine + escrow/settlement on Paynow, transport booking surface, digital police-clearance workflow, multi-user staff accounts, **priority sale-day support SLA**, analytics. |
| **Tier B (mid-market)** | **US$1,200** | Full auction + settlement engine, core channels (web/PWA, WhatsApp, USSD, BillPay), transport booking, police-clearance workflow, multi-user accounts, standard support. |
| **Tier C (small/regional)** | **US$900** | Auction + settlement engine, web/PWA + WhatsApp, transport booking, police-clearance workflow, standard support. Entry tier held at the v2.0 floor so a fortnightly US$10-30k house clears it from a single sale-day's activity. |
| **Pilot (any tier, 90 days)** | **US$1,000** | Full feature access during the pilot regardless of target tier, then converts to the signed tier's rate. |

Subscription is now **feature-gated** (channel access + SLA scale by tier), not sold as undifferentiated retainer hours.

### Transaction take-rate

**0.75% of settled GMV, on top of Paynow's own fee — unchanged from v2.0.** It stays thin and unchanged for three reasons: (1) v2.0 proved this line is intentionally small — forcing adoption 15%→30% moves monthly net by only ~US$200, so it is a GMV-scaling line, not a margin lever; (2) houses already levy 12% combined fees, and our positioning is explicitly *undercut on fees* — a fat platform take on top of Paynow's fee contradicts that and risks pushing sub-US$500 trades back to the unsettled WhatsApp channel we exist to capture; (3) it is the line that compounds with the consumer story and the 5→20-house ramp, scaling automatically without per-house renegotiation. It is also the metric Paynow cares about most.

### Transport (the consumer line)

Already shipped: buyer-facing quote of **US$15 base + US$0.35/km, capped US$250**, computed from haversine distance between the auction hub and the buyer's drop-off. In v3.0 the platform's economics are modeled conservatively as a **flat coordination/booking fee**, not a per-beast haulage spread the model would have to defend against fuel:

- The platform charges the **fixed US$15 booking/coordination leg**; the transporter sets and keeps the **entire distance-based haul price (US$0.35/km)**. The haul's fuel/driver/return economics are the transporter's to clear, on a full truck route-batched across buyers from the same sale — not ours to defend per beast.
- **Platform net margin per booked delivery = US$15 − ~US$3 processing (payment + confirmation SMS + Nominatim geocoding) = US$12.00.**
- **Transport revenue = digital transactions × attach-rate × US$12.00.** Attach ramps **5% → 9% → 14% → 19% → 24%**, deliberately conservative because many dealers still self-haul; it climbs as the consumer channels pull in buyers (end consumers, women farmers, diaspora-funded, peri-urban) who structurally *cannot* self-haul.

We never keep a per-beast spread that must beat diesel. This is a software coordination fee — defensible to anyone who has ever hired a cattle truck, because we are not the haulier and we do not price the haul.

---

## The Diversification Progression: a Phased B2B → B2B2C Arc

The whole strategy is the order of operations. The consumer (transport) line is strictly *derivative*: it can only take a cut of deliveries booked on digital sales that ride on auction-house GMV flowing through the platform. The dependency chain is **B2B → B2B2C** — onboard houses → houses bring digital GMV → only then does a delivery attach-rate have a denominator to multiply against.

| Phase | Years | What's happening | Consumer revenue |
|---|---|---|---|
| **1 — Land the spine** | Y1 | Anchor-led launch (5 houses, A-heavy). Subscription + onboarding carry the business. Buyers still mostly self-hauling dealers. | Negligible (1.3% of revenue) |
| **2 — Thicken the base** | Y2-Y3 | Ramp to 8→12 houses; consumer transaction volume accumulates; transport attach begins to bite as non-dealer buyers arrive. | Emerging (3.1% → 4.8%) |
| **3 — Compound the consumer line** | Y4-Y5 | 16→20 houses; both multiplicands grow (more deliverable transactions *and* a rising attach rate) as the buyer mix shifts toward those who cannot self-haul. | Material minority (6.7% → 8.8%) |

### Revenue mix over time (the centerpiece)

| Year | Houses live | Auction-house revenue | Consumer (transport) revenue |
|---|---|---|---|
| **1** | 5 | **98.7%** | **1.3%** |
| **2** | 8 | **96.9%** | **3.1%** |
| **3** | 12 | **95.2%** | **4.8%** |
| **4** | 16 | **93.3%** | **6.7%** |
| **5** | 20 | **91.2%** | **8.8%** |

The consumer slice climbs **~7x** off a near-zero Year-1 base as both multiplicands grow — more live houses and digital transactions (the deliverable-transaction base), and a rising delivery attach rate (5% → 24%). By Year 5 transport is a **meaningful but still-minority 8.8%** of revenue: a real, compounding consumer line layered onto a B2B-SaaS spine, not yet a co-equal pillar — which is exactly the B2B → B2B2C arc this reframe describes. Subscription remains the spine at **~74% of Year-5 revenue**.

A note on honesty here: the consumer slice is *higher* than the earlier draft (8.8% vs 6.7% at Y5) even though absolute transport dollars are similar. That is because correcting the subscription go-live timing (see the model notes below) cut the house-side denominator by ~US$147.6k over five years — so the same consumer line is now a larger share of a *smaller, more honest* house-revenue base. The arc didn't get more optimistic; the base got more truthful.

---

## The 5-Year Financial Model

> Self-funded growth case, moderate scale, anchors-first. Every cell recomputes from the stated drivers; the mix sums to exactly 100.0 each year; cumulative surplus closes on the surplus total.

### Revenue by line

| Year | Onboarding | Subscription | Transaction take (0.75%) | Transport | **Total** |
|---|---:|---:|---:|---:|---:|
| **1** | 14,500 | 39,600 | 6,710 | 826 | **61,636** |
| **2** | 7,500 | 100,800 | 18,474 | 4,093 | **130,867** |
| **3** | 10,000 | 151,200 | 27,625 | 9,521 | **198,346** |
| **4** | 10,000 | 208,800 | 39,831 | 18,628 | **277,259** |
| **5** | 10,000 | 266,400 | 53,618 | 31,677 | **361,695** |
| **5yr** | 52,000 | 766,800 | 146,258 | 64,745 | **1,029,803** |

*All figures US$.*

### Revenue mix

| Year | Auction-house % | Consumer (transport) % |
|---|---:|---:|
| 1 | 98.7 | 1.3 |
| 2 | 96.9 | 3.1 |
| 3 | 95.2 | 4.8 |
| 4 | 93.3 | 6.7 |
| 5 | 91.2 | 8.8 |

### Costs

| Year | Infrastructure | Payroll | Pass-through + transporter | Other (BD/travel/mktg) | **Total** |
|---|---:|---:|---:|---:|---:|
| **1** | 3,600 | 36,000 | 241 | 9,000 | **48,841** |
| **2** | 3,960 | 66,000 | 314 | 14,000 | **84,274** |
| **3** | 4,440 | 108,000 | 370 | 20,000 | **132,810** |
| **4** | 4,920 | 150,000 | 445 | 26,000 | **181,365** |
| **5** | 5,400 | 198,000 | 530 | 32,000 | **235,930** |

*All figures US$.* Payroll is the dominant cost — **73.7% of opex in Y1 rising to 83.9% in Y5** — and the single throttle lever: the Y3/Y4/Y5 hires can be delayed if revenue underperforms, since the self-serve wizard keeps onboarding low-touch.

### Surplus & GMV onto Paynow rails

| Year | Revenue | Costs | **Surplus** | **Cumulative surplus** | **GMV onto Paynow** |
|---|---:|---:|---:|---:|---:|
| **1** | 61,636 | 48,841 | **+12,795** | **12,795** | **894,600** |
| **2** | 130,867 | 84,274 | **+46,593** | **59,388** | **2,463,200** |
| **3** | 198,346 | 132,810 | **+65,536** | **124,924** | **3,683,300** |
| **4** | 277,259 | 181,365 | **+95,894** | **220,818** | **5,310,800** |
| **5** | 361,695 | 235,930 | **+125,765** | **346,583** | **7,149,100** |
| **5yr** | **1,029,803** | **683,220** | **+346,583** | — | **19,501,000** |

*All figures US$.* Surplus is positive every single year and cumulative surplus never dips below zero — there is no negative drawdown trough requiring equity. GMV onto Paynow rails compounds from **~US$0.9M to ~US$7.1M annually** (~US$19.5M over five years) — the number Paynow should track above all others.

### Funding & self-funded honesty note

**Self-funded, but the cushion is genuinely thin in Year 1 — I will not pretend otherwise.** After the two blocker corrections, surplus is positive every year (Y1 +12,795 → Y5 +125,765) and cumulative surplus never goes negative, so there is no equity-requiring trough. **But** Y1 surplus fell from the draft's +53,233 to +12,795 once subscription was corrected for half-year go-live (new houses billed ~6 months in the year they launch, matching the same go-live timing already used for GMV). That +12,795 is only **~3.5 weeks of Y1 opex** of headroom, so intra-year cash-timing risk is material, not cosmetic: onboarding fees are lumpy (collected at signing, concentrated in the ramp window), the first cohort's subscription only reaches full run-rate in Year 2, and payroll is monthly from month one.

A working-capital cushion of **~2-3 months of opex (Y1 ~US$8-12k; Y5 ~US$40-60k)** is prudent to bridge payroll before subscription reaches run-rate and onboarding cash lands — a cash-timing buffer, *not* equity. The deepest realistic in-year dip is inside Year 1 before the founding cohort's recurring billing matures; if a single anchor signature slips a quarter, Y1 could go slightly cash-negative intra-year even though it closes positive — which is the honest reason to hold the buffer.

**On headcount, honestly:** US$198k of Y5 payroll is *not* a "lean 4-person team" at ~US$49.5k/head. At realistic Zimbabwe USD ops/support wages (~US$6-18k/yr) plus a USD founder draw, US$198k funds a real operating org of **roughly 9-13 people** — which is what is actually required to run 20 live houses across 5 channels at ~60+ sale-days/month *and* staff transporter dispatch. I keep the dollar figure (it is the defensible number) and drop the "lean 4-person" framing. **Transport dispatch ops is explicitly assumed to live inside this payroll, not for free.** If Zimbabwe USD wage inflation runs hot, Y4-Y5 payroll could rise faster than modeled and compress surplus — though it would not turn the year negative on these revenue figures.

### Model drivers & corrections (for the auditor)

Every cell recomputes from these drivers:

- **Houses live (EOY):** 5 / 8 / 12 / 16 / 20. Tier mix: Y1 3A/1B/1C → Y5 7A/8B/5C (anchors-first, regressing to the market's B/C-heavy shape).
- **Blended digital adoption:** ~10.5 / 11.5 / 12.3 / 13.0 / 13.7% — field-honest, on a cohort-maturation curve (entry ~10.5% → mature ~15%), deliberately below any "30% digitization" optimism. New low-adoption cohorts every year keep the blended number drifting up only gently.
- **Avg digital ticket:** US$650 (constant) — skews to the smaller/remote/sub-US$500 trades the deposit + 12% fees currently push to WhatsApp; a lower ticket is the conservative choice (more transactions per GMV dollar).
- **Digital transactions = GMV / US$650:** ~1,376 / 3,790 / 5,667 / 8,170 / 10,999.
- **Subscription** (monthly A/B/C = US$1,500/1,200/900), prior cohorts billed 12 months, current-year cohort billed 6 (one go-live convention applied to *both* subscription and GMV).
- **Onboarding** (one-off A/B/C = US$3,500/2,500/1,500), pilots convert and credit the US$1,000 deposit toward the full fee — no separate pilot line.
- **Transaction take = GMV × 0.75%.** **Transport = digital transactions × attach% × US$12.00** (attach 5→24%).
- **Pass-through** = US$200 base + digital_tx × US$0.03 confirmation SMS (no haul payout flows through us — transport revenue is a pure booking fee net of processing). **Infrastructure** = US$3,000 base + US$120/live house.

**Corrections vs the audited draft (all flagged defects resolved):**

1. **Subscription/GMV go-live timing [BLOCKER, fixed].** The draft billed every new house a full 12 months while haircutting *their* GMV by half — an internal contradiction overstating subscription by ~US$147,600 over five years. Fixed: one half-year go-live convention applied to both lines.
2. **Transport unit economics [re-grounded].** The draft's per-beast spread sat below diesel cost and assumed consolidation it never established. Re-modeled as a flat US$15 booking fee → US$12.00 net; the transporter prices and clears the haul, not us. Attach lowered to a conservative 5→24%.
3. **Y1 adoption [softened].** Lowered the all-new Y1 cohort from the optimistic top of its band (12.0%) to the entry midpoint (~10.5%), rescaling GMV onto rails accordingly. This trims the v2.0→v3.0 Y1 rails step-up from ~23.7x to ~20.7x — still a deliberate funded-team base-case change, not a v2.0 continuation.
4. **Payroll narrative [reconciled].** Dollar figures kept; the indefensible "lean 4-person team" framing dropped (see the funding note).

---

## Metrics, Partnerships & What Kills This Plan

### Metrics that matter (in priority order)

1. **GMV routed onto Paynow rails** — the headline. ~US$0.9M → ~US$7.1M annually; ~US$19.5M cumulative. The number Paynow should care about most.
2. **Houses live** (5 → 20) and **tier mix** vs the anchors-first plan.
3. **Blended digital adoption** held field-honest at 10.5-13.7% — watched as a maturity floor, *not* inflated as a growth lever.
4. **Transport attach-rate** (5% → 24%) — the leading indicator of the consumer line maturing.
5. **Subscription run-rate vs. billed** — the cash-timing canary behind the Year-1 thin-cushion risk.
6. **Surplus & cumulative surplus** — must stay positive every year (the self-funded invariant).

### Partnerships

- **Paynow (the spine).** Settlement + payout on Integration ID 23997, across all five channels; Stripe is the diaspora/card fallback only. This is also the strategic moat: we are the settlement+payout+title-transfer layer that three of Zimbabwe's four national livestock-digitization initiatives lack.
- **Transport providers.** A dispatch network of local cattle-truck owners/hauliers — we own no trucks and carry no fleet capex/insurance/fuel risk. We coordinate; they haul and clear the haul economics on route-batched, full-truck loads.

### What kills this plan, and the mitigation

| Risk | Why it bites | Mitigation |
|---|---|---|
| **Operator / team capacity** | 20 houses × 5 channels × ~60+ sale-days/mo + transporter dispatch is a real operating load — not a 4-person job. | Headcount phased to house count; the wizard keeps *onboarding* low-touch so payroll tracks support load. Y3-5 hires are delayable if revenue lags. |
| **Adoption on a cash floor** | The US$1,000 deposit gate + 12% fees cap how much sale-day GMV settles digitally; v2.0 showed forcing adoption barely moves net. | Adoption modeled honestly at 10.5-13.7% blended — *below* the ~15% mature ceiling. The growth story rides on more houses + transport, not adoption inflation. |
| **USD scarcity / wage inflation** | Zimbabwe has ~no VC and scarce USD; hot USD wage inflation could push Y4-Y5 payroll past model. | Largely self-funded with a 2-3 month opex working-capital buffer; payroll is the throttle lever (delay hires). Even hot inflation does not turn a year negative on these revenues. |
| **Transport execution** | A platform-arranged livestock haul is a trust purchase; a bad delivery damages the consumer line and house stickiness. | Modeled as later-year derivative upside (1.3% → 8.8%), never a Year-1 pillar. We coordinate, don't haul — variance sits with the transporter; we price the transporter generously early to build a reliable network. |
| **Paynow dependency / blockers** | The entire settlement spine runs on Paynow; a rails outage or integration block stalls the core value prop. | Poll-URL fallback is live (don't rely on webhook alone); browser-relay pattern bypasses Cloudflare server-to-server blocks. Deep alignment with Paynow is the mitigation *and* the strategic point. |

---

## Supersession Note

v3.0 is now canonical. The following sibling documents **lag this doc and need reconciliation**:

- **business-case.md** — pricing section is superseded by this document (one-off cut ~55-60%; retainer renamed to subscription with numbers held; 0.75% take held). Reconcile its pricing tables and any owner-operated-bootstrap framing to the scaling SaaS-into-B2B2C model here.
- **Financial deck / model** — replace v2.0 bootstrap figures (Revenue 12,321 → 28,071 → 48,987; GMV onto rails 43,200 → 223,200 → 545,400) with the v3.0 5-year model (Revenue 61,636 → 361,695; GMV onto rails 894,600 → 7,149,100; cumulative surplus 346,583). Drop the "lean 4-person team" line; carry the half-year go-live correction and the conservative transport unit economics.
- **pilot-proposal.md** — update the pilot to the US$1,000 creditable-deposit structure (credited toward the full tier onboarding fee on conversion) and the US$1,000/mo pilot subscription, consistent with this doc's pricing.

Where any of these disagree with figures here, **this document wins**.
