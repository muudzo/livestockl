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

Paynow, operating under Webdev Group / Softwarehouse, is one of Zimbabwe's primary digital payment processors. Founded in 2009 and headquartered in Harare, it serves thousands of merchants — from utilities and insurers to single-operator e-commerce sellers — and functions as the country's primary online-payment acceptance layer in a market where international card networks operate only intermittently.

### 1.2 Mission and goals

Paynow's stated mission is **"to make digital payments accessible to every Zimbabwean."** Internally this is read literally: a product that fails on a feature phone, on 2G, or during a power cut has failed its mandate. Accessibility first; polish second.

### 1.3 Activities and products

| Product | Function | Primary user |
|---|---|---|
| **Paynow Core** | Web Checkout (SHA-512 signed form POST) + Express Checkout (USSD push to EcoCash, OneMoney, Telecash, Zimswitch) | Online merchants |
| **BillPay** | Vendor API to 106+ Zimbabwean billers (ZESA, ZWSC, school fees, municipal rates, medical aid, DStv, airtime) | Retail apps, banks, super-apps |
| **TXT (txt.co.zw)** | Bulk SMS gateway with sender-ID branding | Merchants needing OTPs, receipts, notifications |
| **Bisafe** | Escrow — funds held until delivery confirmation | High-ticket / trust-deficit transactions |
| **Paab** | Physical cash-collection agent network with digital merchant notification | Unbanked / cash-only consumers |

### 1.4 Market

Three structural conditions shape the market: mobile money (EcoCash, OneMoney, primarily over USSD) dominates consumer payments; international card rails are intermittent; cash remains heavily used in agriculture and informal trade. Direct competitors are Pesepay and DPOpay; Stripe, Paystack, and Flutterwave are either unavailable here or operate under severe constraints.

### 1.5 Internal organisation and communication

Paynow runs per-product teams (Core, BillPay, TXT, Bisafe, Paab), a shared **Developer Experience (DX) team**, and a small SRE function. The structure is flat: decisions sit with whoever is closest to the problem. Per-product **Slack channels** carry day-to-day work; **WhatsApp** carries urgent coordination; weekly product standups punctuate the cadence. Long-form decisions live in Google Drive — a friction point the DX team is working on.

### 1.6 My position and access

I report into the **DX team**, supervised day-to-day by Takudzwa Sisimayi, rather than into a single product team. No Paynow employee had previously integrated every product end-to-end inside one application; the DX seat let me consume the ecosystem as an external integrator does, and surface inconsistencies invisible from inside a product silo. In practice this meant direct access to engineering leads across all five products; sandbox and live merchant accounts (Integration IDs 23657 and 23997); cross-team Slack access; and latitude over stack, scope, and methodology, subject to a mid-point leadership-panel demo.

### 1.7 Position in the business chain

Paynow is the **integration and orchestration layer** between merchants/consumers and the underlying payment rails (EcoCash, OneMoney, Telecash, Zimswitch, banking partners). Oversight comes from ZEPA and the Reserve Bank of Zimbabwe.

### 1.8 Organisational culture

- **Pragmatic and infrastructure-first.** Products are described by what fails on 2G or in a power cut, not by what looks good on a slide.
- **Flat and trust-based.** Live-merchant credentials and direct supervisor contact in week one.
- **Externally humble, internally confident.** Receptive to outside critique — without which the benchmark and retrospective would not have been possible.

---

## 2. Interim Evaluation (for the company supervisor)

### 2.1 Brief summary (≤ ½ A4)

**Delivery.** Across the first 17 weeks of my 18-week placement I built and deployed **ZimLivestock**, a livestock-trading marketplace integrating the full Paynow ecosystem — Core, BillPay, TXT, and components of Bisafe and Paab — inside a single React PWA backed by Supabase. The app is live in production at `app-nine-sigma-jgoqp90f2p.vercel.app`. On 8 May 2026 it was demonstrated to a Paynow leadership panel, with the full agentic-buying chain (semi-automated WhatsApp and USSD purchase flows that let transactions complete without a traditional web checkout) executing live on stage.

**Research.** Three artefacts: a **field-research report** from physical livestock-auction visits; a **42-page DX benchmark** comparing Paynow against five competitors across seven categories; and an **Ecosystem Integration Retrospective** with senior-engineer integration writeups for Core, BillPay, and TXT intended for Paynow's docs team. The most material finding is counter-intuitive: Paynow Core scored lowest of the six providers (4.2/10) while Paynow's own BillPay and TXT scored 7.5/10 and 7/10. The gap is one of **internal consistency**, not capability — and the architectural fix already exists on Paynow's own BillPay subdomain (detailed in §4).

**Impact.** The DX team is reviewing the integration writeups as candidate documentation, and the Core bot-wall workaround is in production. The benchmark and retrospective give Paynow an outside-in evidence base that would otherwise have required a paid external auditor.

### 2.2 Main tasks versus secondary tasks

| Category | Tasks |
|---|---|
| **Main tasks** (in original ZimLivestock plan, 12 Mar – 23 Apr) | Field research; DX benchmark vs Stripe / Paystack / Flutterwave; wireframes + architecture; marketplace prototype (listings + bidding); Paynow Core integration; end-to-end payment testing; stakeholder demos; final DX report; deployed prototype; 5-min presentation. |
| **Secondary tasks** (added post-demo / outside plan) | BillPay, TXT, Bisafe, Paab integrations/designs; benchmark expanded to 6 providers / 7 categories; WhatsApp bot; USSD simulator; senior-engineer integration writeups; Cloudflare Worker relay + browser-relay fallback; session-log discipline. |

The "main vs secondary" boundary eroded after the leadership demo: BillPay, Bisafe, WhatsApp, and USSD became central to the second half of the placement (see §2.6).

### 2.3 The most important thing I have learned

**A developer-experience benchmark, done from the inside with real production credentials, is a strategic instrument and not a documentation exercise.** I came in treating the benchmark as a deliverable. By week 6 it had become the spine of every other piece of work — retrospective, demo, integration order, even the ZimLivestock checkout design. The practical corollary: write down what surprises you in week one. By week three those surprises feel normal and the comparative evidence is gone.

### 2.4 Alignment with the internship plan

The overall placement runs **2 February – 8 June 2026** (91 days, 30 ECTS, five HBO-i competencies — see title page); the **ZimLivestock project plan** formed the primary delivery phase from **12 March – 23 April 2026** following onboarding. Every plan success criterion has been met or exceeded:

| Plan success criterion | Plan period | Status |
|---|---|---|
| ≥2 auction-house visits + research document | by 25 Mar | ✅ Done |
| DX benchmark vs 3 platforms across 5 categories | by 25 Mar | ✅ Expanded to 6 platforms, 7 categories |
| Initial wireframes + flow diagrams | by 25 Mar | ✅ Done |
| Functional marketplace prototype (listing, bidding, payment) | by 8 Apr | ✅ Live in production |
| Paynow Core integration (web + mobile money) | by 8 Apr | ✅ Live |
| ≥2 product improvements from field research | by 8 Apr | ✅ Reserve-price visibility, time-boxed auctions with USSD fallback, WhatsApp listing as primary channel |
| ≥3 user feedback sessions | by 8 Apr | ✅ Done |
| First draft of DX report | by 8 Apr | ✅ Done |
| End-to-end payment test cases (success, failure, timeout, mobile money) | by 15 Apr | ✅ 11/11 PASS via security-agent edge function |
| Demo to ≥2 stakeholders + structured feedback | by 15 Apr | ✅ Leadership panel demo, 8 May |
| Final DX report with executive summary + ≥5 recommendations | by 21 Apr | ✅ Delivered |
| Deployed prototype with public URL | by 23 Apr | ✅ `app-nine-sigma-jgoqp90f2p.vercel.app` |
| 5-minute presentation | by 23 Apr | ✅ Delivered |

Competency alignment is described in §3.

### 2.5 Competencies to focus on in the upcoming period

For the remaining ~3 weeks:

1. **Advisory communication to non-technical leadership.** The demo proved I can carry a technical room; condensing the same material into a 10-minute written brief is the harder skill.
2. **Designing for trust under low-trust conditions.** Field research showed counterparty distrust — not UI friction — is the failure mode. Bisafe escrow, dispute flows, and seller verification are where I test design choices against that constraint.
3. **Writing for code I did not author.** The integration writeups require describing systems whose source I cannot fully see — a different discipline from documenting my own code.

### 2.6 Adjustments to the internship plan

Scope expanded beyond the original plan after the leadership demo; all additions were approved progressively in supervisor 1:1s.

| Added item | Trigger | Status |
|---|---|---|
| **BillPay biller-inbound integration** | Demo ask | Live |
| **TXT notifications integration** | Demo ask | Live |
| **Bisafe escrow design** | Demo ask (counterparty trust) | Designed; integration in flight |
| **Paab cash-collection design** | Demo ask | Designed; integration scoped |
| **Benchmark scope expanded** (3→6 providers, 5→7 categories) | DX team — regional competitive context | Live in v2 |
| **WhatsApp bot** (seller + buyer flows) | Field research: de-facto trading channel | Working prototype |
| **USSD simulator** | Field research: rural sellers without smartphones | Working prototype |
| **Cloudflare Worker relay + browser-relay fallback** | Production blocker — Core bot-wall (§4) | Live |
| **Senior-engineer integration writeups** (Core, BillPay, TXT) | DX team adopted my notes as docs candidates | Drafted |
| **Ecosystem Integration Retrospective** | Panel ask: outside-in perspective on the integrator experience | Draft delivered |
| **Reframe of final deliverable** — from launch to evidence vehicle for an ecosystem-integration thesis | Strategic value is retrospective + benchmark, not the product | Reframed |

The remaining ~3 weeks are committed to converging this material into a single coherent advisory document rather than producing more of it.

---

## 3. Justification of My Learning Objectives (HBO-i competencies)

The Internship Agreement allocates 30 ECTS across five HBO-i competencies. Each sub-section below restates the goal and presents an interim evidence cluster.

**CMD framing.** The placement is engineering-heavy on the surface, but four CMD lenses framed the work: **human-centred design** (anchoring the architecture in counterparty trust via field research); **service design** (treating web, WhatsApp, USSD, and physical cash as one user journey); **systems thinking** (which surfaced an internal ecosystem gap, not only an external benchmark gap); and **low-connectivity UX** (treating 2G, feature phones, and power cuts as first-class design constraints).

### 3.1 To Create — L2, 12 ECTS (6 + 6)

**Goal:** *Ship at least one full-stack application at Paynow, deployed to production, handling real user traffic — covering frontend-to-backend integration, event-driven integrations, internal tooling, CI/CD, and fintech-grade security.*

**Why appropriate:** Paynow runs live merchant flows; a localhost prototype would not have surfaced the relay problem, the webhook verification edge case, or other production realities. The 12 ECTS reflects that strategic value depended on shipping, not designing.

**Evidence.**

- **ZimLivestock live in production**, integrated end-to-end with Paynow Core (Web + Express Checkout).
- **Stack:** React 18 + TS + Vite + Tailwind + shadcn/ui (client); Supabase Edge Functions in Deno (server); Paynow Core, BillPay, and TXT (core systems).
- **Event-driven integration:** Paynow webhooks → Edge Function → Postgres with row-level security → realtime fan-out.
- **Merchant tooling:** admin auction-control dashboard, bid history, payment reconciliation, seller listing wizard, buyer browse + bid, WhatsApp bot, USSD simulator.
- **Tests + CI/CD:** Vercel previews per push; versioned Supabase migrations; security-agent edge function (11/11 PASS) gating RLS regressions; payment test matrix across Paynow's four sandbox numbers.
- **Secure coding for fintech:** per-user database access controls; idempotency keys on bids and payments (so a retried request can't accidentally double-bid); secure webhook verification; CORS hardening on user-facing functions (closed a vulnerability that would have let any third-party site call our payment functions); secrets stored in Supabase Vault.
- **Transaction-safe database operations** preventing conflicting bids or inconsistent auction states when two users act simultaneously.

### 3.2 To Learn — L2, 3 ECTS

**Goal:** *Operate effectively in a professional fintech environment — mastering Paynow's stack, participating in Agile cycles, holding reflection sessions, and adjusting designs to regulatory and business realities.*

**Why appropriate:** I arrived with no prior fintech, mobile-money, or USSD-first experience. The placement only works if I can absorb domain context fast enough to make non-trivial decisions without supervision.

**Evidence.**

- **Stack absorbed end-to-end:** webhook signing, USSD push semantics, idempotency patterns, the *biller-inbound* vendor flow (registering ZimLivestock as a biller so buyers pay it through their normal bill-payment flow), the undocumented hash-ordering quirk on callbacks.
- **Agile cadence:** weekly product standups across Core, BillPay, TXT; fortnightly supervisor 1:1s; tutor check-ins.
- **Reflection:** session-log discipline; weekly progress reports; decision rationale saved to project memory.
- **Adjusting designs to constraints:** Cloudflare Worker plus browser-relay fallback after the Core bot-wall (§4); abandoned a custom Go backend once Supabase row-level security covered the same ground; integrated Core + BillPay rather than a single rail, because "digital-only" cedes the cash economy.

### 3.3 To Communicate — L2, 6 ECTS (3 + 3)

**Goal:** *Communicate technical work clearly to both technical and non-technical stakeholders — through documentation, sprint updates, and business-framed trade-off explanations.*

**Why appropriate:** The work is only valuable if Paynow leadership reads, believes, and acts on it. The DX team needed outside-in evidence on developer experience; product teams needed integration-friction findings only an end-to-end integrator produces.

**Evidence.**

- **8 May leadership-panel demo:** full agentic-buying chain executed live; panel feedback captured and incorporated.
- **42-page DX benchmark:** Paynow vs five competitors across seven categories, with reproducible rubric and 5+ actionable recommendations.
- **Ecosystem Integration Retrospective:** four-layer evidence model (observed friction → root cause → evidence → recommended action), pitched at mixed technical / non-technical readers.
- **Senior-engineer integration writeups** (Core, BillPay, TXT) in Paynow's internal register, intended for adoption into the DX docs pipeline.
- Weekly progress reports, session logs, demo deck, 1-minute video script, return-day script.

### 3.4 To Organise — L2, 3 ECTS

**Goal:** *Independently manage my development workflow — planning, tracking, meeting sprint deadlines, adjusting priorities under feedback, and taking ownership of deliverables.*

**Why appropriate:** With week-one autonomy over stack, scope, and methodology, the placement depended heavily on disciplined planning. Organisation is load-bearing for everything else.

**Evidence.**

- **Plan kept:** every project-plan success criterion delivered on or ahead of date.
- **Sprint discipline:** weekly progress reports, per-task tracking, structured deliverable folders.
- **Re-sequencing under feedback:** post-demo, Bisafe moved from week 7 to weeks 8–9 to make room for BillPay + TXT; agentic-commerce bounded into a single "non-app channels" stream.
- **Ownership:** sole intern, no missed deliverables; live production app with ongoing operational responsibility.
- **Estimation under uncertainty:** the Cloudflare incident (~1.5 weeks unplanned) was absorbed by deferring BillPay to post-plan, without dropping a plan item.

### 3.5 To Research — L2, 6 ECTS

**Goal:** *Conduct a structured technical investigation into a system-improvement opportunity at Paynow, applying professional research methods and presenting a data-driven recommendation to senior engineers.*

**Why appropriate:** Both DX-team and product-team asks were research-shaped, not build-shaped: the deliverables were findings + recommendations, not features.

**Evidence.**

- **Issue identified:** the Core bot-wall (§4), reproduced across IP ranges, request shapes, and user-agent strings.
- **Method:** comparative benchmark against five named peers with reproducible rubric; structured field research at a physical livestock auction; integration retrospective using a four-layer evidence model.
- **Metrics collected:** per-provider scores on docs, SDK, sandbox, error messages, onboarding, support, and time-to-first-payment; for Core also webhook reliability and undocumented quirks.
- **Solution prototyped:** Cloudflare Worker relay + browser-relay fallback, live in production.
- **Evaluation and recommendation:** side-by-side testing across Paynow products and external providers formed the basis for several infrastructure and DX recommendations (full reasoning in §2.1 and §4), presented at the 8 May panel.

---

## 4. Experiences of Growth and Insights

The most significant growth moment in the first 17 weeks did not happen on a keyboard. It happened at the auction.

I had spent the preceding week building wireframes for a livestock marketplace that, in hindsight, would have failed within weeks of real use. They assumed the friction was UI friction — too many taps, unclear pricing, slow loads. At the auction it became immediately obvious that the friction is **counterparty trust** and **payment timing**. The interface is almost incidental. A seller paid in cash for thirty years does not need a slicker checkout; he needs a credible reason to believe the money will arrive before the cattle leave the kraal. I rewrote the architecture document over the weekend. It is the single change with the largest downstream effect on the project.

The second growth moment was the Cloudflare relay incident — the clearest example I can give of getting something wrong before getting it right. Calls from our backend to Paynow's main domain were being silently dropped at the network layer. I assumed credentials, then CORS, then TLS — close to a working day at each before stepping back to validate assumptions higher up the stack. When I escalated to Takudzwa I expected a credentials reset or a firewall rule. He asked me instead to reproduce the failure against `billpay.paynow.co.zw`. That subdomain succeeded immediately. The placement's most important finding began with a supervisor redirect, not my own insight. The procedural lesson — work through the stack systematically rather than repeatedly troubleshooting the same layer — is one I now apply consciously. The fix (a Cloudflare Worker plus a browser-relay fallback that routes the call through the user's own browser, sidestepping the bot wall) is now the documented workaround.

The third — and most professionally formative — moment was the week-6 realisation that the DX benchmark was the strategic centre of the project. It arrived gradually: I noticed I was reaching for it to justify every other decision — which product to integrate next, how to scope the retrospective, what to lead the demo with. The shift was from producing deliverables to producing evidence that decisions can be made on, and Takudzwa's habit of pressing every artefact with the same question — *what decision does this enable* — was the engine of that shift.

A fourth, smaller moment was abandoning the custom Go backend I had started in week 3. I had defaulted to a familiar CMD-coursework pattern — separate backend service, separate frontend — and was three days in when Takudzwa asked, in a 1:1, what the Go layer was doing that Supabase could not. I did not have a good answer. The same functionality is now ~200 lines of Postgres functions and a few Edge Functions in Deno. The lesson was not "choose Supabase" — it was that I had been pattern-matching to a stack I already knew rather than reasoning from the constraints in front of me.

A persistent smaller insight has been about working culture. Paynow's flatness was initially disorienting after the weekly tutor sign-offs of a Dutch HBO programme; here, decisions sit with whoever is closest to the problem. After several weeks of requesting confirmation more often than necessary, I learned to bring Takudzwa proposed decisions with the option already chosen, the alternatives listed, and the trade-offs named. The format took explicit feedback to land: in a 1:1 he pointed out that my questions were doing more work than my proposed answers.

The largest single surprise has been the **ecosystem consistency pattern inside Paynow itself**. I had expected comparative integration work to surface a Paynow-versus-the-world gap; it surfaced inconsistencies between Paynow's own product subdomains instead. The architectural pattern that would resolve the most consequential of these is already running successfully on a sister product inside the same company. The most valuable advice I can leave behind is therefore less a roadmap of new things to build than a pointer back to a pattern Paynow has already shipped.

---

## 5. Reflection on Internship and Progress Assessment (for the internship tutor)

### 5.1 Does the work match the internship plan?

Yes — and it has expanded in directions explicitly invited by the supervisor and leadership panel (§2.6). Original-plan items were all delivered; additions were approved progressively and displaced nothing.

### 5.2 Are the activities appropriate for my internship goals?

Yes. Each HBO-i competency has a substantive evidence cluster (§3). The competency most at risk is *To Communicate*: the raw artefacts exist, but the final synthesis into a single advisory document is incomplete. This is the principal focus of my remaining ~3 weeks.

### 5.3 Have I acquired sufficient skills during my training?

Largely yes. CMD prepared me well for **Create** and **Communicate**. **Research** built on prior user-research coursework but was stretched by the DX-benchmark requirement to apply a reproducible rubric — a genre I had not practised before. **Organise** was the biggest adjustment: managing a 91-day placement as a sole developer abroad is a different problem from a group assignment with weekly sign-off. **Learn** built on prior reflective-practice training, with the remote-supervision cadence requiring adaptation.

### 5.4 Is the supervision from the company sufficient?

Yes. Takudzwa Sisimayi's posture — give the intern access and let them surface what insiders cannot — is exactly what the placement requires. Feedback is timely, direct, and consistently challenges my conclusions rather than accepts them; the two moments in §4 are representative. Bi-weekly 1:1s are the right cadence given the day-to-day autonomy.

### 5.5 Is the supervision from the training programme sufficient?

Yes. John Bos has provided structured check-ins and a consistent reading of my work against the HBO-i / CMD framework — particularly valuable after the demo when scope began to drift. The remote cadence (Leeuwarden ↔ Harare) works because it is predictable and because the first visit (13 February) preceded the project-plan finalisation.

### 5.6 Bottlenecks during this internship period

Three worth naming:

1. **Cloudflare relay problem.** ~1.5 weeks unplanned. Resolved with the Worker + browser-relay fallback (full narrative in §4); the bottleneck became the retrospective's most concrete recommendation.
2. **Webhook verification mismatch.** Legitimate Paynow confirmations were rejected by our code as if they were forgeries, due to a subtle and undocumented difference in how the security signature was constructed. Three intermittent production rejections before I identified it. Resolved; filed as a documentation gap in the Core writeup.
3. **Scope drift after the demo.** The panel expanded scope into BillPay, Bisafe, Paab, WhatsApp, and USSD. Productive but a scope-management risk. Managed by moving Bisafe to weeks 8–9 and bounding the agentic work into a single "non-app channels" stream. Scope expanded without dropping plan items.

All three resolved within the placement period.

### 5.7 Do I agree with the assessment my supervisor has given me?

[FILL — after appraisal on FILL-date.] Based on the 1:1s I expect a broadly positive assessment on *Create*, *Organise*, and *Research*, with constructive pressure on the synthesis-and-advisory side of *Communicate* (flagged in §2.5). I agree with that direction in advance: it is where I am weakest and where the remaining work has the highest leverage.

### 5.8 Goals for the remainder

1. Ship Bisafe escrow on ZimLivestock and document it in the senior-engineer register.
2. Deliver the final ecosystem report as a single coherent advisory document — usable by leadership without my presence in the room.
3. Close the agentic-commerce workstream (WhatsApp bot + USSD simulator) as a demonstrated, evidenced thesis rather than a one-off demonstration.
4. Leave behind onboarding documentation that gets the next external integrator to first payment in under a week (currently three).
5. Produce a separate written advisory brief from the ecosystem report and benchmark, pitched at non-engineer executives.

---

## Appendix A — Key Deliverables Index (through week 17)

| Deliverable | Location | Status |
|---|---|---|
| Field research report | `deliverables/week-1-2/01-field-research/` | Delivered |
| DX benchmark v2 (6 providers, 7 categories) | `deliverables/week-1-2/02-dx-benchmark/` | Delivered |
| Wireframes and architecture | `deliverables/week-1-2/03-wireframes-architecture/` | Delivered |
| ZimLivestock MVP | `app-nine-sigma-jgoqp90f2p.vercel.app` | Live |
| Paynow Core integration (Web + Express) | `supabase/functions/initiate-payment`, `payment-webhook` | Live |
| BillPay biller-inbound integration | ZimLivestock in Paynow biller catalog | Live |
| TXT notifications integration | Order, bid, payment notifications | Live |
| Cloudflare Worker relay + browser-relay fallback | Infrastructure | Live |
| Ecosystem Integration Retrospective | `deliverables/` | Draft delivered |
| Senior-engineer integration writeups (Core, BillPay, TXT) | `deliverables/` | Draft delivered |
| Leadership-panel demo | 8 May 2026 | Executed |
| WhatsApp bot (seller + buyer flows) | Agentic-commerce workstream | Working prototype |
| USSD simulator | Feature-phone channel | Working prototype |
| Security-agent RLS validation (11/11 PASS) | `supabase/functions/security-agent` | Live |
| Business artefacts (case, GTM, financial model, pilot proposal) | `deliverables/business/` | Delivered |
| Weekly progress + session logs | `deliverables/week-*/` | Ongoing |

## Appendix B — Competency Mapping (HBO-i / CMD)

| HBO-i competency | ECTS | Evidence cluster (interim) |
|---|---|---|
| **To Create** L2 | 12 (6 + 6) | ZimLivestock live; Core / BillPay / TXT integrated end-to-end; admin tooling; CI/CD; fintech security posture |
| **To Learn** L2 | 3 | Paynow stack absorbed; Agile cadence; supervisor 1:1s; session-log + reflection discipline |
| **To Communicate** L2 | 6 (3 + 3) | Leadership demo; DX benchmark; ecosystem retrospective; senior-engineer integration writeups; weekly reports |
| **To Organise** L2 | 3 | All project-plan criteria met; sprint cadence held; re-sequencing under feedback without dropping items |
| **To Research** L2 | 6 | DX benchmark v2 (6 providers, 7 categories, reproducible rubric); ecosystem retrospective; Cloudflare investigation; field research |
| **Total** | **30 ECTS** | |
