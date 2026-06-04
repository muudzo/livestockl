# ZimLivestock — Go-to-Market & Strategy

**Version:** v3.0 · **Author:** Tatenda Nyemudzo · **Date:** June 2026
**Supersedes:** v2.0 — where any figure here disagrees with an earlier document, **this wins**.
**Companion docs:** [business-case.md](./business-case.md) · [pilot-proposal.md](./pilot-proposal.md)

> **ZimLivestock is a multi-tenant livestock settlement platform: auction houses onboard to digitize their sales, route every payment through Paynow, and — as transaction volume scales — the platform monetizes post-sale transport.** B2B SaaS today; B2B2C tomorrow.

---

## Executive summary

Auction houses pay to onboard as isolated tenants (one-off fee + monthly subscription + a thin 0.75% take on settled GMV). That B2B base funds the business now. As each house brings its buyers and sellers onto the platform, post-sale delivery demand accumulates — and **transport** becomes a consumer-revenue line layered on top. We scale to ~20 houses (a third of the ~40-60 house market) over five years, anchors-first, largely self-funded.

| | Year 1 | Year 3 | Year 5 |
|---|---:|---:|---:|
| Houses live | 5 | 12 | 20 |
| Revenue (US$) | 61,636 | 198,346 | 361,695 |
| Surplus (US$) | +12,795 | +65,536 | +125,765 |
| GMV onto Paynow rails (US$) | 894,600 | 3,683,300 | 7,149,100 |
| Consumer (transport) share of revenue | 1.3% | 4.8% | 8.8% |

**5-year totals:** US$1.03M revenue · US$346,583 surplus · ~US$19.5M GMV onto Paynow rails. Positive surplus every year; no equity-requiring trough.

> **One sentence for the panel:** a settlement-and-payout platform auction houses pay to onboard onto today, monetizing final consumers through delivery as the installed base grows — moderate scale, largely self-funded, with every dollar of GMV routed onto Paynow rails.

---

## What changed since v2.0

v2.0 was a deliberately conservative, owner-operated **three-house bootstrap** — a floor built to prove the business could survive, not scale. Two things have since made scale reachable, so v3.0 reframes accordingly: a **self-serve onboarding wizard** that turns each new house from a multi-week engineering build into a ~6-minute, admin-approved, RLS-isolated tenant (adding the tenth house now costs roughly what the second did); and **five live channels** — web/PWA, WhatsApp, USSD, BillPay-as-biller, Facebook Messenger — that meet buyers and sellers where they already transact. When onboarding stops being bespoke labor, a growth story becomes credible. The B2B layer is monetized today; the consumer layer is the upside it makes possible.

---

## Growth thesis

### The flywheel

1. **Auction houses onboard** as paying tenants.
2. Their **buyers and sellers transact digitally** — settling on rails instead of in cash and WhatsApp groups.
3. **Delivery demand accumulates** across houses (one house's deliveries are negligible; twelve houses' worth is a real logistics book).
4. **Transport revenue grows and deepens stickiness** — a house whose buyers get reliable delivery has a harder reason to leave.

The order is the strategy: you cannot monetize consumers before the houses bring them. Every consumer line sits strictly downstream of B2B onboarding, which is why the model leans on subscriptions early and only lets transport bite as the installed base grows.

### Why transport — and why only transport

Transport is the right consumer line for three concrete reasons: it is **already shipped** (sellers toggle delivery; buyers get a checkout quote — US$15 base + US$0.35/km, capped US$250), so there's no new product to build; it solves the **#1 post-sale friction** we observed on a full sale day, the thing that breaks otherwise-good sales; and the buyer **already expects to pay for delivery**, so we intermediate an existing cost rather than invent a fee. Buyer transaction fees, diaspora FX, financing, and data are plausible future optionality but are **not in the numbers** — modeling unshipped revenue against unvalidated frictions is exactly the over-promising we avoid.

### Paynow alignment

Every channel settles on Paynow and every seller payout runs the same rails (Integration ID 23997; Stripe is the diaspora/card fallback only). This is strategically load-bearing: three of Zimbabwe's four national livestock-digitization initiatives (E-Livestock RFID, the Digital Stock Card, per-kg auction networks, VFEX tokenization) are identity/title/asset layers with **no money layer** — they can say which animal is which, not move money or transfer title against a settled payment. ZimLivestock is that missing settlement-and-payout engine. So the fastest-growing, most strategically legible number here is not revenue — it is **GMV routed onto Paynow rails**, the number Paynow should care about most.

---

## Market opportunity

Zimbabwe has roughly **40-60 auction houses** running regular sales, concentrated in three belts: Mashonaland (Harare), Matabeleland (Bulawayo/cattle country), and the Midlands (Gweru/Kwekwe). The market segments cleanly by sale-day GMV and cadence.

| Tier | Profile | Sale-day GMV | Cadence | Count in market |
|---|---|---|---|---:|
| **A — anchor** | Highest-volume houses; credibility-builders | US$80-120k | Weekly (~4/mo) | ~8 |
| **B — mid-market** | Established, smaller throughput | US$40-80k | Weekly–fortnightly (~3/mo) | ~20 |
| **C — small/regional** | Fee-sensitive regional houses | US$10-30k | Fortnightly (~2/mo) | ~20 |

**Onboarding thesis — anchors-first, then fill.** We sign the scarce Tier A houses early (most GMV, most credibility), then fill toward the market's B/C-heavy shape. Ramp: **5 → 8 → 12 → 16 → 20 live houses** at year-end, reaching ~1/3 of the market; by Year 5 we hold ~7 of ~8 anchors, so late-stage growth is necessarily mid-market/regional. What we recapture is the segment the manual floor excludes — the sub-US$500 trades that today's US$1,000 deposit gate and 12% combined fees push onto unsettled WhatsApp groups. That is why modeled adoption is the *remote/sub-deposit slice*, not the whole sale.

---

## The 5-year financial model

> Self-funded growth case, moderate scale, anchors-first. The numbers below are built from the pricing in the next section; driver formulas and audit corrections are in the [Appendix](#appendix--model-drivers--methodology). Every cell recomputes from the stated drivers; the mix sums to 100.0 each year; cumulative surplus closes on the total.

### Revenue by line (US$)

| Year | Onboarding | Subscription | Transaction take (0.75%) | Transport | **Total** |
|---|---:|---:|---:|---:|---:|
| **1** | 14,500 | 39,600 | 6,710 | 826 | **61,636** |
| **2** | 7,500 | 100,800 | 18,474 | 4,093 | **130,867** |
| **3** | 10,000 | 151,200 | 27,625 | 9,521 | **198,346** |
| **4** | 10,000 | 208,800 | 39,831 | 18,628 | **277,259** |
| **5** | 10,000 | 266,400 | 53,618 | 31,677 | **361,695** |
| **5yr** | 52,000 | 766,800 | 146,258 | 64,745 | **1,029,803** |

### Costs (US$)

| Year | Infrastructure | Payroll | Pass-through | Other (BD/travel/mktg) | **Total** |
|---|---:|---:|---:|---:|---:|
| **1** | 3,600 | 36,000 | 241 | 9,000 | **48,841** |
| **2** | 3,960 | 66,000 | 314 | 14,000 | **84,274** |
| **3** | 4,440 | 108,000 | 370 | 20,000 | **132,810** |
| **4** | 4,920 | 150,000 | 445 | 26,000 | **181,365** |
| **5** | 5,400 | 198,000 | 530 | 32,000 | **235,930** |

Payroll is the dominant cost (73.7% of opex in Y1 → 83.9% in Y5) and the single throttle lever — Y3-Y5 hires are delayable if revenue lags, since the wizard keeps onboarding low-touch.

### Surplus & GMV onto Paynow rails (US$)

| Year | Revenue | Costs | **Surplus** | **Cumulative** | **GMV onto Paynow** |
|---|---:|---:|---:|---:|---:|
| **1** | 61,636 | 48,841 | **+12,795** | 12,795 | 894,600 |
| **2** | 130,867 | 84,274 | **+46,593** | 59,388 | 2,463,200 |
| **3** | 198,346 | 132,810 | **+65,536** | 124,924 | 3,683,300 |
| **4** | 277,259 | 181,365 | **+95,894** | 220,818 | 5,310,800 |
| **5** | 361,695 | 235,930 | **+125,765** | 346,583 | 7,149,100 |
| **5yr** | **1,029,803** | **683,220** | **+346,583** | — | **19,501,000** |

Surplus is positive every year and cumulative surplus never dips below zero. GMV onto Paynow rails compounds ~US$0.9M → ~US$7.1M annually (~US$19.5M over five years).

### Revenue mix over time (the centerpiece)

| Year | Houses live | Auction-house revenue | Consumer (transport) revenue |
|---|---:|---:|---:|
| **1** | 5 | 98.7% | 1.3% |
| **2** | 8 | 96.9% | 3.1% |
| **3** | 12 | 95.2% | 4.8% |
| **4** | 16 | 93.3% | 6.7% |
| **5** | 20 | 91.2% | 8.8% |

The consumer slice climbs ~7x off a near-zero base as both multiplicands grow — more deliverable transactions *and* a rising attach rate (5% → 24%). By Year 5 transport is a **meaningful but still-minority 8.8%**: a real, compounding consumer line on a B2B-SaaS spine (subscription is still ~74% of Year-5 revenue), not yet a co-equal pillar. That is exactly the B2B → B2B2C arc.

---

## Pricing & packaging

> **Canonical.** This supersedes pricing in business-case.md.

The v2.0 one-off (US$4k-US$8k) was priced as a bespoke engineering build; the wizard collapses that to ~6-minute provisioning, so the fee is **cut ~55-60%** and reframed as a setup/training/branding package covering human cost, not engineering. The monthly subscription is the spine; the take-rate stays thin and GMV-elastic.

### Onboarding fee (one-time)

| Tier | Fee | Includes |
|---|---:|---|
| **A — anchor** | US$3,500 | Full onboarding: wizard provisioning, branding, staff training + first-sale shadowing, verification, Paynow linking, activation across all five channels. |
| **B — mid-market** | US$2,500 | Standard onboarding: branding, one training session + first-sale support, Paynow linking, web/WhatsApp/USSD activation. |
| **C — small/regional** | US$1,500 | Lightweight onboarding: branding, remote/group training, Paynow linking, web/WhatsApp activation. A deliberately low barrier. |
| **Pilot (any tier, 90 days)** | US$1,000 | Discounted setup, **credited toward the full tier fee on conversion** — a converting house never pays twice. |

### Platform subscription (monthly)

The v2.0 "retainer" is renamed to a feature-gated **subscription** with numbers **held intact** — already field-calibrated to Zimbabwe USD willingness-to-pay, and the platform now does materially more (five channels, RLS isolation, transport surface, digital police clearance, the settlement/payout layer).

| Tier | Monthly | Includes |
|---|---:|---|
| **A — anchor** | US$1,500 | All five channels, unlimited sale-days, auction + escrow/settlement engine, transport booking, police-clearance workflow, multi-user accounts, **priority sale-day SLA**, analytics. |
| **B — mid-market** | US$1,200 | Full auction + settlement engine, core channels, transport booking, police-clearance, multi-user, standard support. |
| **C — small/regional** | US$900 | Auction + settlement engine, web/WhatsApp, transport booking, police-clearance, standard support. Held at the v2.0 floor so one sale-day clears it. |
| **Pilot (any tier, 90 days)** | US$1,000 | Full access during pilot, then converts to the signed tier's rate. |

### Transaction take-rate — 0.75% of settled GMV (unchanged)

Stays thin by design: forcing adoption 15%→30% moves monthly net by only ~US$200, so it is a GMV-scaling line, not a margin lever. A fat take on top of houses' existing 12% fees would contradict our undercut-on-fees positioning and push the long tail back to WhatsApp. It compounds automatically with the house ramp — and it is the metric Paynow cares about most.

### Transport (the consumer line)

Modeled conservatively as a **flat coordination fee**, not a per-beast haulage spread the model would have to defend against fuel:

- The platform charges the **fixed US$15 booking leg**; the transporter sets and keeps the **entire distance-based haul price (US$0.35/km)** and clears fuel/driver/return on a route-batched full truck — not our risk per beast.
- **Net margin per booked delivery = US$15 − ~US$3 processing = US$12.00.**
- **Transport revenue = digital transactions × attach-rate × US$12.00**, attach ramping 5% → 24% as the consumer channels pull in buyers (end consumers, women farmers, diaspora-funded, peri-urban) who structurally cannot self-haul.

We never keep a spread that must beat diesel. This is a software coordination fee — defensible to anyone who has hired a cattle truck, because we are not the haulier and do not price the haul.

---

## Operating & funding assumptions

**Team.** No longer solo, not a venture burn. Running ~20 houses needs a small team added in phases as house count justifies: founder on product/partnerships/anchor accounts → an operations/onboarding lead as the pipeline fills → support as live tenants and the transport book generate day-to-day load. The wizard keeps it lean because headcount tracks support load, not onboarding labor. **Honestly:** the US$198k Y5 payroll is *not* a "4-person team" — at realistic Zimbabwe USD wages (~US$6-18k/yr) plus a founder draw it funds a real org of **~9-13 people**, which is what running 20 houses across five channels at ~60+ sale-days/month *plus* transporter dispatch actually requires. Transport dispatch ops lives inside this payroll, not for free.

**Self-funded — but the Year-1 cushion is genuinely thin.** Surplus is positive every year and cumulative surplus never goes negative, so no equity is required. But Y1 surplus is only **~3.5 weeks of opex** of headroom, so intra-year cash timing is a real risk: onboarding fees are lumpy (collected at signing), the first cohort's subscription only reaches run-rate in Year 2, and payroll is monthly from month one. A **2-3 month opex working-capital buffer** (Y1 ~US$8-12k; Y5 ~US$40-60k) is prudent to bridge timing — a buffer, not equity. If a single anchor signature slips a quarter, Y1 could go slightly cash-negative intra-year even though it closes positive. That is the honest reason to hold the buffer.

**The constraint we plan inside:** Zimbabwe has effectively no VC and scarce USD. Moderate ambition (a third of the market, not all of it) is deliberate — the financing environment rewards a business that funds its own next house. Payroll is the throttle: under-performance delays hires, it does not require a raise.

---

## Metrics, partnerships & risks

**Metrics (priority order):** (1) **GMV onto Paynow rails** — the headline (~US$0.9M → ~US$7.1M); (2) houses live and tier mix vs the anchors-first plan; (3) blended digital adoption held field-honest at 10.5-13.7% — a maturity floor, not a growth lever; (4) transport attach-rate (5% → 24%) — the consumer-line leading indicator; (5) subscription run-rate vs billed — the Year-1 cash-timing canary; (6) surplus, which must stay positive (the self-funded invariant).

**Partnerships.** *Paynow (the spine):* settlement + payout on all five channels; also the strategic moat — we are the settlement/payout/title layer three of four national initiatives lack. *Transport providers:* a dispatch network of local cattle-truck owners — we own no trucks and carry no fleet/fuel/insurance risk; we coordinate, they haul.

### What kills this plan, and the mitigation

| Risk | Why it bites | Mitigation |
|---|---|---|
| **Operator / team capacity** | 20 houses × 5 channels × ~60+ sale-days/mo + dispatch is a real load. | Headcount phased to house count; wizard keeps onboarding low-touch; Y3-5 hires delayable. |
| **Adoption on a cash floor** | The deposit gate + 12% fees cap digital settlement; forcing adoption barely moves net. | Modeled at 10.5-13.7% — *below* the ~15% ceiling. Growth rides on more houses + transport, not adoption inflation. |
| **USD scarcity / wage inflation** | No VC, scarce USD; hot USD wage inflation could push Y4-Y5 payroll past model. | Self-funded with a 2-3 month buffer; payroll is the throttle. Even hot inflation doesn't turn a year negative. |
| **Transport execution** | A platform-arranged haul is a trust purchase; a bad delivery damages the consumer line and stickiness. | Later-year derivative upside (1.3% → 8.8%), never a Y1 pillar. We coordinate, don't haul; price transporters generously early to build reliability. |
| **Paynow dependency** | The settlement spine runs on Paynow; an outage or block stalls the core value prop. | Poll-URL fallback live; browser-relay bypasses Cloudflare server-to-server blocks. Deep alignment is the mitigation *and* the point. |

---

## Supersession note

v3.0 is canonical. These sibling docs lag it and need reconciliation:

- **business-case.md** — pricing superseded (one-off cut ~55-60%; retainer → subscription, numbers held; 0.75% take held). Reconcile its tables and bootstrap framing to the scaling SaaS-into-B2B2C model here.
- **Financial deck / model** — replace v2.0 bootstrap figures (Revenue 12,321 → 48,987; GMV 43,200 → 545,400) with the v3.0 model (Revenue 61,636 → 361,695; GMV 894,600 → 7,149,100; cumulative surplus 346,583).
- **pilot-proposal.md** — update to the US$1,000 creditable-deposit structure and US$1,000/mo pilot subscription.

Where any disagree with figures here, **this document wins**.

---

## Appendix — model drivers & methodology

Every cell recomputes from these drivers:

- **Houses live (EOY):** 5 / 8 / 12 / 16 / 20. **Onboarding mix:** Y1 +3A/1B/1C · Y2 +1A/1B/1C · Y3-Y5 +1A/2B/1C each (final anchor in Y5). Cumulative tier mix Y1 3A/1B/1C → Y5 7A/8B/5C. No churn inside the window (12-month renewable; anchors sticky).
- **Blended digital adoption:** 10.5 / 11.5 / 12.3 / 13.0 / 13.7% — a cohort-maturation curve (entry ~10.5% → mature ~15%), below any "30% digitization" optimism; new low-adoption cohorts keep the blend drifting up gently.
- **Avg digital ticket:** US$650 (constant) — skews to the smaller/remote trades the deposit + fees push to WhatsApp; the conservative choice.
- **Digital transactions = GMV ÷ US$650:** ~1,376 / 3,790 / 5,667 / 8,170 / 10,999.
- **Subscription** (A/B/C = US$1,500/1,200/900): prior cohorts billed 12 months, current-year cohort billed 6 — one half-year go-live convention applied to *both* subscription and GMV.
- **Onboarding** (A/B/C = US$3,500/2,500/1,500): pilots convert and credit the US$1,000 deposit toward the full fee.
- **Transaction take = GMV × 0.75%. Transport = digital transactions × attach% × US$12.00** (attach 5/9/14/19/24%).
- **Pass-through** = US$200 base + tx × US$0.03 confirmation SMS (no haul payout flows through us). **Infrastructure** = US$3,000 base + US$120/live house.

**Audit corrections vs the first draft (all resolved):**

1. **Subscription/GMV go-live timing [blocker].** The draft billed new houses a full 12 months while haircutting their GMV by half — overstating subscription by ~US$147,600 over five years. Fixed with one half-year convention on both lines.
2. **Transport unit economics [re-grounded].** The draft's per-beast spread sat below diesel cost. Re-modeled as a flat US$15 booking fee → US$12.00 net; the transporter prices and clears the haul. Attach lowered to 5→24%.
3. **Y1 adoption [softened].** Lowered the all-new Y1 cohort from 12.0% to ~10.5% (entry midpoint), trimming the v2.0→v3.0 Y1 rails step-up from ~23.7x to ~20.7x.
4. **Payroll narrative [reconciled].** Dollar figures kept; the indefensible "lean 4-person team" framing dropped.

**The most aggressive single assumption** (flag for scrutiny): the model lands **3 of ~8 Tier A anchors in Year 1**. Defensible under a funded-team growth story, but the most likely line of challenge — a gentler Y1 anchor cohort cascades cleanly through the model.
