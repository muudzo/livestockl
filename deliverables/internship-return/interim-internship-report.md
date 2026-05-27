# Interim Internship Report

**Internship at Paynow (Webdev Group / Softwarehouse), Harare, Zimbabwe**

---

## Title Page

| | |
|---|---|
| **Student** | Tatenda Nyemudzo |
| **Student address** | 10 Oatlands Drive, Greystone Park, Harare, Zimbabwe |
| **Student email** | tatenda.nyemudzo@student.nhlstenden.com |
| **Student telephone** | +263 71 964 6741 |
| **Programme** | Communication & Multimedia Design (CMD), HBO-i |
| **Institution** | NHL Stenden University of Applied Sciences, Leeuwarden |
| **Internship organisation** | Paynow (Webdev Group / Softwarehouse) |
| **Company address** | 27 Argyll Road, Newlands, Harare, Zimbabwe |
| **Company supervisor** | Takudzwa Sisimayi (takudzwa@paynow.co.zw) |
| **Internship tutor (NHL Stenden)** | John Bos (john.bos@nhlstenden.com, +263 78 149 7764) |
| **Internship period** | 2 February 2026 – 8 June 2026 (91 days) |
| **First tutor visit** | 13 February 2026 |
| **Date of interim appraisal** | [FILL — date of appraisal] |
| **Report date** | 27 May 2026 |
| **Document type** | Interim internship report (week 17 of 18) |
| **Propedeuse obtained** | Yes |
| **45 EC in main phase achieved** | Yes |

---

## 1. Organizational Analysis

### 1.1 Brief description

Paynow, operating under the legal entity Webdev Group / Softwarehouse, is a widely used digital payment-processing platform in Zimbabwe. Founded in 2009 and headquartered at 27 Argyll Road, Newlands, Harare, it serves thousands of merchants — from large utilities and insurers to single-operator e-commerce sellers — and is positioned as a primary acceptance layer for online payments in a market where international card networks function only intermittently.

### 1.2 Mission and goals

Paynow's stated mission is **"to make digital payments accessible to every Zimbabwean."** It is read literally inside the company: a product that fails on a feature phone, on 2G, or during a power cut has failed its mandate. Accessibility first; polish second.

### 1.3 Activities and products

Paynow operates a multi-product ecosystem:

| Product | Function | Primary user |
|---|---|---|
| **Paynow Core** | Web Checkout (SHA-512 signed form POST) + Express Checkout (USSD push to EcoCash, OneMoney, Telecash, Zimswitch) | Online merchants |
| **BillPay** | Vendor API to 106+ Zimbabwean billers (ZESA, ZWSC, school fees, municipal rates, medical aid, DStv, airtime) | Retail apps, banks, super-apps |
| **TXT (txt.co.zw)** | Bulk SMS gateway with sender-ID branding | Merchants needing OTPs, receipts, notifications |
| **Bisafe** | Escrow — funds held until delivery confirmation | High-ticket / trust-deficit transactions |
| **Paab** | Physical cash-collection agent network with digital merchant notification | Unbanked / cash-only consumers |

Together these services let Paynow support both digital and cash-linked payment flows across Zimbabwe.

### 1.4 Market

Three structural conditions shape the market. First, mobile money dominates consumer payments — EcoCash and OneMoney, primarily over USSD. Second, international card rails are intermittent. Third, cash remains heavily used in agriculture and informal trade. Paynow's direct competitors are Pesepay and DPOpay. Stripe, Paystack, and Flutterwave are either unavailable here or operate under severe constraints.

### 1.5 Internal organisation and structure

Paynow runs product teams per product line (Core, BillPay, TXT, Bisafe, Paab), a shared **Developer Experience (DX) team**, and a small SRE function. The company operates with a relatively flat structure: decisions are made inside small cross-functional teams rather than through long approval chains.

### 1.6 Internal communication

Per-product **Slack channels** for day-to-day, **WhatsApp** for urgent coordination. Weekly product standups; long-form decisions live in Google Drive — a friction point the DX team is working on.

### 1.7 My position and department

I report into the **DX team**, supervised day-to-day by Takudzwa Sisimayi, rather than into a single product team. No Paynow employee had previously integrated every Paynow product end-to-end inside one application; sitting at the DX layer let me consume the ecosystem as an external integrator does, and expose inconsistencies that product-silo insiders would not see. In practice this meant direct access to engineering leads across Core, BillPay, TXT, Bisafe, and Paab; sandbox + live merchant accounts (Integration IDs 23657 and 23997); cross-team Slack access; and latitude over my own stack, scope, and research methodology, subject to a mid-point leadership-panel demo.

### 1.8 Position in the business chain

Paynow is the **integration and orchestration layer** between merchants/consumers and the underlying payment rails (EcoCash, OneMoney, Telecash, Zimswitch, banking partners). It is infrastructure to merchants embedding Paynow Core, and a retail-facing product through BillPay and Paab. Oversight comes from ZEPA and the Reserve Bank of Zimbabwe.

### 1.9 Organisational culture

Three traits stood out:

- **Pragmatic and infrastructure-first.** Products are described by what fails on 2G or in a power cut, not by what looks good on a slide.
- **Flat and trust-based.** Live-merchant credentials and direct supervisor contact in week one. Decisions sit with whoever is closest to the problem.
- **Externally humble, internally confident.** Receptive to outside critique — without which the benchmark and retrospective would not have been possible.

---

## 2. Interim Evaluation (for the company supervisor)

### 2.1 Brief summary (≤ ½ A4)

**Delivery.** Across the first 17 weeks of my 18-week placement I built and deployed **ZimLivestock**, a livestock-trading marketplace for cattle, goats, sheep, and pigs. It integrates the full Paynow ecosystem — Core (Web + Express Checkout), BillPay, TXT, and components of Bisafe and Paab — inside a single React PWA backed by Supabase. The app is live in production at `app-nine-sigma-jgoqp90f2p.vercel.app`. On 8 May 2026 it was demonstrated to a Paynow leadership panel, where the full agentic-buying chain — semi-automated WhatsApp and USSD purchase flows that let transactions complete without a traditional web checkout — executed live on stage.

**Research.** Three artefacts: (1) a **field-research report** from visits to a physical livestock auction, capturing fee structures, trust dynamics, and digital-readiness barriers; (2) a **42-page Developer Experience benchmark** comparing Paynow against five competitors across seven categories; and (3) an **Ecosystem Integration Retrospective** using a four-layer evidence model, with senior-engineer integration writeups for Core, BillPay, and TXT intended for Paynow's docs team. The most material finding is counter-intuitive: Paynow Core scored lowest of the six providers (4.2/10) while Paynow's own BillPay and TXT scored 7.5/10 and 7/10. The gap is an **internal consistency gap**, not a fundamental capability gap — and the architectural fix already exists on Paynow's own BillPay subdomain. Detailed in §4.

**Impact for Paynow.** The DX team is actively reviewing the integration writeups as candidate documentation, and the Core bot-wall workaround is now in production. The DX benchmark v2 and Ecosystem Retrospective give Paynow an outside-in evidence base for the subdomain-isolation recommendation that would otherwise have required engaging a paid external auditor.

### 2.2 Main tasks versus secondary tasks

| Category | Tasks |
|---|---|
| **Main tasks** (in original ZimLivestock plan, 12 Mar – 23 Apr) | Field research; DX benchmark vs Stripe / Paystack / Flutterwave; wireframes + architecture; marketplace prototype (listings + bidding); Paynow Core integration; end-to-end payment testing; stakeholder demos; final DX report; deployed prototype; 5-min presentation. |
| **Secondary tasks** (added post-demo / outside plan) | BillPay, TXT, Bisafe, Paab integrations/designs; benchmark expanded to 6 providers / 7 categories; WhatsApp bot; USSD simulator; senior-engineer integration writeups; Cloudflare Worker relay + browser-relay fallback; session-log discipline. |

The "main vs secondary" boundary eroded after the 8 May leadership demo: BillPay coverage, Bisafe escrow, WhatsApp agentic flows, and USSD reach became central to the second half of the placement (see §2.6).

### 2.3 The most important thing I have learned

The single most important lesson is that **a developer-experience benchmark, done from the inside with real production credentials, is a strategic instrument and not a documentation exercise.** I came in treating the benchmark as a deliverable. It is not. By week 6 it had become the spine of every other piece of work — retrospective, demo, integration order, even the ZimLivestock checkout design. The corollary is practical: write down what surprises you in week one. By week three those surprises feel normal, and the comparative evidence is gone.

### 2.4 Alignment with the internship plan

The placement runs **2 February – 8 June 2026** (91 days, 30 ECTS, five HBO-i competencies — see title page). The **ZimLivestock project plan** sits inside it as the concrete deliverable: **12 March – 23 April 2026** (6 weeks). Onboarding and orientation occupied the weeks before the project plan opened. Against that project plan, every success criterion has been met or exceeded:

| Plan success criterion | Plan period | Status |
|---|---|---|
| ≥2 auction-house visits + research document | by 25 Mar | ✅ Done |
| DX benchmark vs 3 platforms across 5 categories | by 25 Mar | ✅ Done — expanded to 6 platforms, 7 categories |
| Initial wireframes + flow diagrams | by 25 Mar | ✅ Done |
| Functional marketplace prototype (listing, bidding, payment) | by 8 Apr | ✅ Live in production |
| Paynow Core integration (web + mobile money) | by 8 Apr | ✅ Live |
| ≥2 product improvements from field research | by 8 Apr | ✅ Reserve-price visibility, time-boxed auctions with USSD fallback, WhatsApp listing as primary channel |
| ≥3 user feedback sessions | by 8 Apr | ✅ Done |
| First draft of DX report | by 8 Apr | ✅ Done |
| End-to-end payment test cases (success, failure, timeout, mobile money) | by 15 Apr | ✅ Done; 11/11 PASS via security-agent edge function |
| Demo to ≥2 stakeholders + structured feedback | by 15 Apr | ✅ Leadership panel demo, 8 May |
| Final DX report with executive summary + ≥5 recommendations | by 21 Apr | ✅ Delivered |
| Deployed prototype with public URL | by 23 Apr | ✅ `app-nine-sigma-jgoqp90f2p.vercel.app` |
| 5-minute presentation | by 23 Apr | ✅ Delivered |

Competency alignment is described in §3.

### 2.5 Competencies to focus on in the upcoming period

For the remaining ~3 weeks I want to stretch on three things:

1. **Advisory communication to non-technical leadership.** The 8 May demo proved I can carry a technical room; condensing the same material into a 10-minute written brief is the harder skill. The final ecosystem report is the vehicle.
2. **Designing for trust under low-trust conditions.** Field research showed counterparty distrust — not UI friction — is the failure mode. Bisafe escrow, dispute flows, and seller verification are where I test design choices against that constraint.
3. **Writing for code I did not author.** The integration writeups for Paynow's docs team require describing systems whose source I cannot fully see — a different discipline from documenting my own code.

### 2.6 Adjustments to the internship plan (scope expansion vs original plan)

The scope expanded beyond the original ZimLivestock project plan after the 8 May demo. Original-plan items were all delivered (§2.4); the additions below were approved progressively in supervisor 1:1s.

| Added item | Trigger | Status |
|---|---|---|
| **BillPay biller-inbound integration** | 8 May demo ask | Live |
| **TXT notifications integration** | 8 May demo ask | Live |
| **Bisafe escrow design** | 8 May demo ask (counterparty trust) | Designed, integration in flight |
| **Paab cash-collection design** | 8 May demo ask | Designed, integration scoped |
| **Benchmark scope expanded** (3→6 providers, 5→7 categories) | DX team request — regional competitive context | Live in v2 |
| **WhatsApp bot** (seller + buyer flows) | Field research: WhatsApp is the de-facto trading channel | Working prototype |
| **USSD simulator** | Field research: many rural sellers have no smartphone | Working prototype |
| **Cloudflare Worker relay + browser-relay fallback** | Production blocker (Core bot-wall — see §4) | Live |
| **Senior-engineer integration writeups** (Core, BillPay, TXT) | DX team adopted my notes as docs candidates | Drafted |
| **Ecosystem Integration Retrospective** | Panel ask: "tell us what we look like from outside" | Draft delivered |
| **Reframe of final deliverable** — from ZimLivestock launch to evidence vehicle for an ecosystem-integration thesis | Strategic value is retrospective + benchmark, not the product | Reframed |

The remaining ~3 weeks are committed to converging this material into a single coherent advisory document rather than producing more of it.

---

## 3. Justification of My Learning Objectives (HBO-i competencies)

The Internship Agreement allocates 30 ECTS across five HBO-i competencies, each with a learning goal I phrased in my own words at the start of the placement. The sub-sections below restate each goal, justify the competency, and present an interim evidence cluster.

**CMD framing.** The placement is engineering-heavy on the surface, but four CMD lenses framed the work: human-centred design (anchoring the architecture in counterparty trust over UI polish, via field research); service design (treating web, WhatsApp, USSD, and physical cash as one user journey rather than a set of integrations); systems thinking (which surfaced an *internal* ecosystem gap inside Paynow, not only an external benchmark gap); and low-connectivity UX (treating 2G, feature phones, and power cuts as first-class design constraints).

### 3.1 To Create — L2, 12 ECTS (6 compulsory + 6 elective)

**Original learning goal:** *Ship at least one full-stack application at Paynow that interfaces with core platform infrastructure, is deployed to production, and handles real user traffic — covering frontend-to-backend integration, RESTful or event-driven integrations, internal tooling, CI/CD, and secure coding practices appropriate to a fintech environment.*

**Why this competency was appropriate.** Paynow runs live merchant flows; a localhost prototype would not have surfaced the relay problem, the webhook hash-ordering bug, or the realities of production integration. The 12 ECTS commitment reflects that the placement's strategic value depended on shipping, not just designing.

**Evidence cluster (interim).**

- **ZimLivestock live in production** at `app-nine-sigma-jgoqp90f2p.vercel.app`, integrated end-to-end with Paynow Core (Web + Express Checkout).
- **Stack**: React 18 + TS + Vite + Tailwind + shadcn/ui (client); Supabase Edge Functions in Deno (server); Paynow Core, BillPay biller-inbound, and TXT bulk-SMS (core systems).
- **Event-driven integration**: Paynow webhooks → Edge Function → Postgres database protected with row-level security (RLS — database rules that restrict each user to their own data) → realtime fan-out.
- **Internal/merchant tooling**: admin auction-control dashboard, bid history, payment reconciliation, seller listing wizard, buyer browse + bid, WhatsApp bot, USSD simulator.
- **Tests + CI/CD**: Vercel previews per push; versioned Supabase migrations; security-agent edge function (11/11 PASS) gating RLS regressions; payment test matrix across Paynow's four sandbox numbers (success / delayed / cancel / insufficient).
- **Secure coding for fintech**: row-level security on every table; idempotency keys on `bids` and `payments` (so a retried request can't accidentally double-bid); SHA-512 hash verification on Paynow webhooks (cryptographic proof the callback isn't forged); CORS wildcard fallback removed on user-facing functions (SEV-1 fix — it would have let any third-party site call our payment functions); no stack traces leaked publicly; secrets in Supabase Vault.
- **Atomic database operations** (`place_bid`, `end_expired_auctions`) — single transactions that either fully succeed or fully fail, preventing races when two users bid at the same moment.

### 3.2 To Learn — L2, 3 ECTS (compulsory, maximum permitted)

**Original learning goal:** *Operate effectively in a professional fintech development environment by mastering Paynow's tech stack, participating in Agile cycles, holding regular reflection sessions, and adjusting technical designs to regulatory and business realities.*

**Why this competency was appropriate.** I arrived with no prior fintech experience and no exposure to mobile-money rails or USSD-first markets. The placement only works if I can absorb domain context fast enough to make non-trivial decisions without supervision.

**Evidence cluster (interim).**

- **Paynow stack absorbed end-to-end**: webhook signing, USSD push semantics, idempotency patterns, the *biller-inbound* vendor flow (registering ZimLivestock as a biller so buyers pay it using their normal bill-payment flow), the undocumented hash-ordering quirk on callbacks.
- **Agile participation**: weekly product standups across Core, BillPay, TXT; fortnightly supervisor 1:1s; tutor check-ins.
- **Reflection cadence**: session-log discipline; weekly progress reports; decision rationale saved in project memory.
- **Adjusting designs to constraints**: switched to a Cloudflare Worker plus browser-relay fallback after the Core bot-wall (§4); abandoned a custom Go backend once Supabase's row-level security covered the same ground; integrated Paynow Core + BillPay instead of a single rail because "digital-only" cedes the cash economy.

### 3.3 To Communicate — L2, 6 ECTS (3 compulsory + 3 elective)

**Original learning goal:** *Communicate technical work clearly to both technical and non-technical stakeholders — through documentation, sprint updates, and trade-off explanations framed in business-relevant terms.*

**Why this competency was appropriate.** The work is only valuable if Paynow leadership reads, believes, and acts on it. The DX team asked for outside-in evidence on developer experience; product teams asked for an integration-friction list only an end-to-end integrator produces. Both audiences need the same material translated for them.

**Evidence cluster (interim).**

- **8 May 2026 leadership-panel demo**: full agentic-buying chain executed live; panel feedback captured and incorporated.
- **42-page DX benchmark**: Paynow vs five competitors across seven categories, with a reproducible rubric and 5+ actionable recommendations.
- **Ecosystem Integration Retrospective**: four-layer evidence model (observed friction → root cause → evidence → recommended action) for mixed technical / non-technical readers.
- **Senior-engineer integration writeups** (Core, BillPay, TXT) in Paynow's own internal register, intended for adoption into the DX docs pipeline.
- **Weekly progress reports**, session logs, demo deck, 1-minute video script, NHL Stenden return-day script.

### 3.4 To Organise — L2, 3 ECTS (compulsory)

**Original learning goal:** *Independently manage my development workflow within Paynow's Agile environment — planning, tracking, meeting sprint deadlines, adjusting priorities under feedback, and taking ownership of deliverables.*

**Why this competency was appropriate.** With week-one autonomy over stack, scope, and methodology, the placement depended heavily on disciplined planning and prioritisation. Organisation is load-bearing for everything else.

**Evidence cluster (interim).**

- **Plan kept**: every project-plan success criterion delivered on or ahead of date (see §2.4).
- **Sprint discipline**: weekly progress reports, per-task todo tracking, structured deliverable folders.
- **Priority re-sequencing under feedback**: post-demo, Bisafe moved from week 7 to weeks 8–9 to make room for BillPay + TXT; agentic-commerce work was bounded into a single "non-app channels" stream.
- **Ownership**: sole intern, no missed deliverables; live production app with ongoing operational responsibility.
- **Realistic estimation under uncertainty**: the Cloudflare incident (~1.5 weeks unplanned) was absorbed by deferring BillPay to post-plan, without dropping any plan item.

### 3.5 To Research — L2, 6 ECTS (elective)

**Original learning goal:** *Conduct a structured technical investigation into a system-improvement opportunity at Paynow, applying professional research methods and presenting a data-driven recommendation to senior engineers.*

**Why this competency was appropriate.** Both asks from the DX and product teams are research-shaped, not build-shaped: the deliverables are findings + recommendations, not features.

**Evidence cluster (interim).**

- **Issue identified**: the Core bot-wall (§4), reproduced across IP ranges, request shapes, and user-agent strings.
- **Method**: comparative benchmark against five named peers with a reproducible rubric; structured field-research at a physical livestock auction; integration retrospective using a four-layer evidence model.
- **Metrics collected**: per-provider scores on docs, SDK, sandbox, error messages, onboarding, support, and time-to-first-payment. For Core: webhook reliability, time to sandbox / live payment, undocumented quirks.
- **Solution prototyped**: Cloudflare Worker relay + browser-relay fallback (live in production, documented as the standard workaround).
- **Evaluation**: side-by-side against Paynow's own BillPay subdomain, which is not behind the same wall — the basis for the central subdomain-isolation recommendation (scores and full reasoning in §2.1 and §4).
- **Recommendation + presentation**: DX benchmark v2 and Ecosystem Retrospective delivered with subdomain isolation as recommendation #1; presented at the 8 May 2026 leadership-panel demo.

---

## 4. Experiences of Growth and Insights

The most significant growth moment in the first 17 weeks did not happen on a keyboard. It happened at the auction.

I had spent the preceding week building wireframes for a livestock marketplace that, in hindsight, would have failed inside a fortnight of real use. The wireframes assumed the friction in livestock trading was UI friction — too many taps, unclear pricing, slow loads. At the auction it became immediately obvious that the friction is **counterparty trust** and **payment timing**. The interface is almost incidental. A seller paid in cash for thirty years does not need a slicker checkout. He needs a credible reason to believe the money will arrive before the cattle leave the kraal. Walking back from that visit, I rewrote the architecture document over a weekend. It is the single change with the largest downstream effect on the project.

The second growth moment was the Cloudflare relay incident — the clearest example I can give of something I got wrong before I got it right.

Calls from our backend to Paynow's main domain were being silently dropped at the network layer. I assumed credentials, then CORS, then TLS — close to a working day at each before climbing one rung up the stack. When I escalated to Takudzwa I expected a credentials reset or a firewall rule. He asked me instead to reproduce the failure against `billpay.paynow.co.zw`. That subdomain succeeded immediately. The placement's most important finding began with a supervisor redirect, not my own insight.

The procedural lesson — climb the stack one layer at a time, rather than thrashing at the layer you know best — is one I now apply consciously. The fix itself (a Cloudflare Worker plus a browser-relay fallback that routes the call through the user's own browser, sidestepping the bot wall) is now the documented workaround.

The third — and most professionally formative — moment was the week-6 realisation that the DX benchmark was the strategic centre of the project, not a side-deliverable (substance in §2.3). It did not arrive as an insight; it arrived as a slow accumulation of moments where I noticed I was reaching for the benchmark to justify every other decision — which Paynow product to integrate next, how to scope the retrospective, what to lead the demo with. The shift was from "produce deliverables" to "produce evidence that decisions can be made on." Takudzwa's habit of pressing every artefact with the same question — *what decision does this enable* — was the engine of that shift.

A fourth, smaller moment was abandoning the custom Go backend I had started in week 3. I had defaulted to a familiar CMD-coursework pattern — separate backend service, separate frontend — and was three days in when Takudzwa asked, in a 1:1, what the Go layer was doing that Supabase could not. I did not have a good answer. The Go backend came out the following week; the same functionality is now ~200 lines of Postgres functions and a few Edge Functions in Deno. The lesson was not "choose Supabase" — it was that I had been pattern-matching to a stack I already knew rather than reasoning from the constraints in front of me. It took a one-sentence supervisor question to surface that.

A persistent smaller insight has been about working culture. Paynow's flatness was initially disorienting after the weekly tutor sign-offs of a Dutch HBO programme; here, decisions are made by whoever is closest to the problem. After three weeks of slight over-checking, I learned to bring Takudzwa proposed decisions with the option already chosen, the alternatives listed, and the trade-offs named. The change took explicit feedback to land — in a 1:1 he pointed out that the questions I was asking were doing more work than my proposed answers. The format I use now — proposed decision, two alternatives, the trade-off that made me pick one — came directly from that conversation.

The largest single surprise has been the **internal consistency gap inside Paynow itself**. I had expected the benchmark to surface a Paynow-versus-the-world gap. It surfaced a Paynow-Core-versus-Paynow-BillPay gap instead. The architectural pattern that would resolve Core's lowest-scoring problem is already running on a sister product's subdomain inside the same company. The most valuable advice I can leave behind is therefore less a roadmap of new things to build than a pointer back to a pattern Paynow has already shipped.

---

## 5. Reflection on Internship and Progress Assessment (for the internship tutor)

### 5.1 Does the work match the tasks and activities agreed in the internship plan?

Yes — and it has expanded in directions explicitly invited by the company supervisor and leadership panel (see §2.6). Original-plan items were all delivered; the additions were approved progressively in 1:1s and displaced nothing.

### 5.2 Are the activities appropriate for my internship goals?

Yes. Each of the five HBO-i competencies has a substantive interim evidence cluster (§3). The competency most at risk of under-delivery is *To Communicate*: the raw artefacts exist, but the final synthesis into a single advisory document for Paynow leadership is incomplete. This is the principal focus of my remaining ~3 weeks.

### 5.3 Have I acquired sufficient skills during my training to carry out my tasks?

Largely yes. CMD prepared me well for **Create** and **Communicate**. **Research** built on prior user-research coursework but was stretched by the DX-benchmark requirement to apply a reproducible rubric — a genre I had not practised before. **Organise** was the biggest adjustment: managing a 91-day placement as a sole developer abroad is a different problem from a group assignment with weekly sign-off. **Learn** built on prior reflective-practice training, with the remote-supervision cadence requiring adaptation.

### 5.4 Is the supervision from the company sufficient?

Yes. Takudzwa Sisimayi's posture — give the intern access and let them surface what insiders cannot — is exactly what the placement requires. Feedback has been timely and direct, and has consistently challenged my conclusions rather than accepted them. Two representative moments are detailed in §4 (the Cloudflare-wall redirect and the Go-backend question); in both cases my first instinct was wrong and supervision corrected the trajectory rather than rubber-stamped it. Bi-weekly 1:1s are the right cadence given the day-to-day autonomy.

### 5.5 Is the supervision from the training programme sufficient?

Yes. John Bos has provided structured check-ins and a consistent reading of my work against the HBO-i / CMD framework — particularly valuable after the 8 May demo when scope began to drift. The remote cadence (Leeuwarden ↔ Harare) has worked because it is predictable and because the first visit (13 February) preceded the project-plan finalisation.

### 5.6 Bottlenecks or problems during this internship period

Three are worth naming explicitly.

**Bottleneck 1 — the Cloudflare relay problem.** ~1.5 weeks of unplanned engineering time. Resolved with a Worker relay + browser-relay fallback, now the standard workaround. Full narrative in §4; the bottleneck is now an asset — it produced the retrospective's most concrete recommendation.

**Bottleneck 2 — webhook hash-ordering bug.** Legitimate Paynow payment confirmations were being rejected by our code as forgeries. Paynow hashes callback fields in the order its server sent them, not the order our code expected — so any intermediate hop that reshuffles fields breaks the hash. Undocumented; three intermittent production rejections before I identified it. Resolved by reconstructing the hash on received-order; filed as a docs gap in the Core writeup.

**Bottleneck 3 — scope drift after the leadership demo.** The 8 May panel expanded scope into BillPay, Bisafe, Paab, WhatsApp, and USSD. Productive but a scope-management risk. Managed by moving Bisafe to weeks 8–9 and bounding the agentic work into a single "non-app channels" stream. Scope expanded without plan items being dropped.

All three resolved within the placement period.

### 5.7 Do I agree with the assessment my supervisor has given me?

[FILL — after appraisal on FILL-date.] Based on bi-weekly 1:1s, I expect the assessment to be broadly positive on *Create*, *Organise*, and *Research*, with constructive pressure on the synthesis-and-advisory side of *Communicate* (flagged in §2.5). I agree with that direction in advance: it is where I am weakest and where the remaining work has the highest leverage.

### 5.8 Goals for the remainder of the internship

1. Ship Bisafe escrow on ZimLivestock and document it in the senior-engineer register.
2. Deliver the final ecosystem report as a single coherent advisory document — usable by leadership without my presence in the room.
3. Close the agentic-commerce workstream (WhatsApp bot + USSD simulator) as a demonstrated, evidenced thesis rather than a demo trick.
4. Leave behind onboarding documentation that gets the next external integrator to first payment in under a week (currently three).
5. Produce a separate written advisory brief from the ecosystem report and DX benchmark v2, pitched at non-engineer executives.

---

## Appendix A — Key Deliverables Index (through week 17)

| Deliverable | Location | Status |
|---|---|---|
| Field research report | `deliverables/week-1-2/01-field-research/` | Delivered |
| DX benchmark v2 (6 providers, 7 categories) | `deliverables/week-1-2/02-dx-benchmark/` | Delivered |
| Wireframes and architecture | `deliverables/week-1-2/03-wireframes-architecture/` | Delivered |
| ZimLivestock MVP (live) | `app-nine-sigma-jgoqp90f2p.vercel.app` | Live in production |
| Paynow Core integration (Web + Express) | `supabase/functions/initiate-payment`, `payment-webhook` | Live |
| BillPay biller-inbound integration | ZimLivestock registered in Paynow biller catalog | Live |
| TXT notifications integration | Order, bid, payment notifications | Live |
| Cloudflare Worker relay + browser-relay fallback | Infrastructure | Live |
| Ecosystem Integration Retrospective (four-layer evidence model) | `deliverables/` | Draft delivered |
| Senior-engineer integration writeups (Core, BillPay, TXT) | `deliverables/` | Draft delivered to DX team |
| Leadership-panel demo | 8 May 2026 | Executed |
| WhatsApp bot (7-step seller flow + buyer flow) | Agentic-commerce workstream | Working prototype |
| USSD simulator | Feature-phone channel | Working prototype |
| Security-agent RLS validation (11/11 PASS) | `supabase/functions/security-agent` | Live |
| Business artefacts (business case, GTM, financial model, pilot proposal) | `deliverables/business/` | Delivered |
| Weekly progress + session logs | `deliverables/week-*/` | Ongoing |

## Appendix B — Competency Mapping (HBO-i / CMD)

| HBO-i competency | ECTS | Evidence cluster (interim) |
|---|---|---|
| **To Create** L2 | 12 (6 + 6) | ZimLivestock live; Paynow Core / BillPay / TXT integrated end-to-end; admin tooling; CI/CD via Vercel + Supabase; RLS-tested fintech security posture |
| **To Learn** L2 | 3 | Paynow stack absorbed; Agile cadence; bi-weekly supervisor 1:1s; session-log + reflection discipline; design adjustments to regulatory realities |
| **To Communicate** L2 | 6 (3 + 3) | 8 May leadership demo; 42-page DX benchmark; ecosystem retrospective; senior-engineer integration writeups; weekly progress reports |
| **To Organise** L2 | 3 | All ZimLivestock project-plan success criteria met; sprint cadence held; re-sequencing under post-demo feedback without dropping plan items |
| **To Research** L2 | 6 | DX benchmark v2 (6 providers, 7 categories, reproducible rubric); ecosystem retrospective; Cloudflare relay investigation + recommendation; field research at livestock auction |
| **Total** | **30 ECTS** | |
