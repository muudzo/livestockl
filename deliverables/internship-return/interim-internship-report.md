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

## Table of Contents

1. Organizational Analysis
2. Interim Evaluation (for the company supervisor)
3. Justification of Learning Objectives — five HBO-i competencies
4. Experiences of Growth and Insights
5. Reflection and Progress Assessment (for the internship tutor)
6. Conclusion
- Appendix A — Key Deliverables Index
- Appendix B — Competency Mapping (HBO-i / CMD)

---

## 1. Organizational Analysis

### 1.1 Description and mission

Paynow is one of Zimbabwe's primary digital payment processors. Founded in 2009, it serves thousands of merchants as the country's main online-payment acceptance layer in a market where international card networks are often unreliable. Its mission, **"to make digital payments accessible to every Zimbabwean,"** is read literally inside the company: a product that fails on a feature phone, on 2G, or during a power cut has failed its mandate.

### 1.2 Products

| Product | Function | Primary user |
|---|---|---|
| **Paynow Core** | Web + Express Checkout (USSD push to EcoCash, OneMoney, Telecash, Zimswitch) | Online merchants |
| **BillPay** | Vendor API to 106+ Zimbabwean billers (ZESA, ZWSC, school fees, DStv, airtime) | Retail apps, banks, super-apps |
| **TXT (txt.co.zw)** | Bulk SMS gateway with sender-ID branding | Merchants needing OTPs / receipts |
| **Bisafe** | Escrow — funds held until delivery confirmation | High-ticket / trust-deficit |
| **Paab** | Physical cash-collection agent network | Unbanked / cash-only consumers |

### 1.3 Market

Mobile money (EcoCash, OneMoney, primarily over USSD) dominates consumer payments; card rails are unreliable; cash remains heavy in agriculture and informal trade. Direct competitors: Pesepay, DPOpay. Stripe, Paystack, Flutterwave are unavailable or constrained.

### 1.4 Organisation, position, and culture

Paynow runs per-product teams, a shared **Developer Experience (DX) team**, and a small SRE function. Structure is flat: decisions sit with whoever is closest to the problem. Day-to-day on Slack, urgent on WhatsApp, long-form in Google Drive. Oversight: ZEPA and the Reserve Bank of Zimbabwe.

I report into the DX team under Takudzwa Sisimayi rather than into a single product team. No Paynow employee had previously integrated every product end-to-end inside one application; the DX seat let me consume the ecosystem as an external integrator does and surface inconsistencies invisible from a product silo. In practice: direct access to engineering leads across all five products, sandbox + live merchant accounts (IDs 23657 / 23997), and latitude over stack, scope, and methodology, subject to a mid-point leadership-panel demo.

Three cultural traits: **pragmatic and infrastructure-first** (products described by what fails on 2G, not what looks good on a slide); **flat and trust-based** (live-merchant credentials in week one); **receptive to external critique** (without which the benchmark and retrospective would not exist).

---

## 2. Interim Evaluation (for the company supervisor)

### 2.1 Brief summary (≤ ½ A4)

**Delivery.** Across the first 17 of 18 weeks I built and deployed **ZimLivestock**, a livestock-trading marketplace integrating the full Paynow ecosystem — Core, BillPay, TXT, components of Bisafe and Paab — inside a React PWA backed by Supabase. Live at `app-nine-sigma-jgoqp90f2p.vercel.app`. On 8 May 2026 it was demonstrated to a Paynow leadership panel, with the agentic-buying chain (semi-automated WhatsApp and USSD purchases completing without a web checkout) running live on stage.

**Research.** Three artefacts: a **field-research report** from physical livestock-auction visits; a **42-page DX benchmark** comparing Paynow against five competitors across seven categories; and an **Ecosystem Integration Retrospective** with senior-engineer integration writeups for Core, BillPay, and TXT. The headline finding: Paynow Core scored lowest of the six providers (4.2/10), while Paynow's own BillPay and TXT scored 7.5 and 7. The gap is one of internal consistency, not capability — the architectural fix already runs on Paynow's own BillPay subdomain (detailed in §4).

**Impact.** The DX team is reviewing the integration writeups as candidate documentation; the workaround for the Core blocker is in production. The benchmark and retrospective give Paynow outside-in evidence otherwise requiring a paid auditor.

### 2.2 Main tasks versus secondary tasks

| Category | Tasks |
|---|---|
| **Main** (original plan, 12 Mar – 23 Apr) | Field research; DX benchmark vs Stripe / Paystack / Flutterwave; wireframes + architecture; marketplace prototype; Core integration; end-to-end payment testing; stakeholder demos; final DX report; deployed prototype; 5-min presentation. |
| **Secondary** (added post-demo) | BillPay, TXT, Bisafe, Paab integrations/designs; benchmark expanded to 6 providers / 7 categories; WhatsApp bot; USSD simulator; integration writeups; Cloudflare Worker relay; session-log discipline. |

The main vs secondary boundary eroded after the demo (§2.6).

### 2.3 The most important thing I have learned

**A developer-experience benchmark, done from the inside with real production credentials, is a decision-making tool — not a documentation exercise.** By week 6 it had become the spine of every other piece of work: retrospective, demo, integration order, even the ZimLivestock checkout design. Practical lesson: write down what surprises you in week one. By week three the surprises feel normal and the comparative evidence is gone.

### 2.4 Alignment with the internship plan

The placement runs **2 February – 8 June 2026** (91 days, 30 ECTS, five HBO-i competencies); the **ZimLivestock project plan** formed the primary delivery phase from **12 March – 23 April** following onboarding. Every plan criterion has been met or exceeded:

| Plan success criterion | Due | Status |
|---|---|---|
| ≥2 auction-house visits + research document | 25 Mar | ✅ |
| DX benchmark vs 3 platforms / 5 categories | 25 Mar | ✅ Expanded to 6 / 7 |
| Initial wireframes + flow diagrams | 25 Mar | ✅ |
| Functional marketplace prototype | 8 Apr | ✅ Live in production |
| Paynow Core integration (web + mobile money) | 8 Apr | ✅ |
| ≥2 product improvements from field research | 8 Apr | ✅ Reserve-price visibility, time-boxed auctions with USSD fallback, WhatsApp listing as primary channel |
| ≥3 user feedback sessions | 8 Apr | ✅ |
| First draft of DX report | 8 Apr | ✅ |
| End-to-end payment test cases | 15 Apr | ✅ 11/11 PASS |
| Demo to ≥2 stakeholders + structured feedback | 15 Apr | ✅ Leadership panel, 8 May |
| Final DX report with ≥5 recommendations | 21 Apr | ✅ |
| Deployed prototype with public URL | 23 Apr | ✅ |
| 5-minute presentation | 23 Apr | ✅ |

### 2.5 Competencies to focus on going forward

1. **Advisory communication to non-technical leadership.** The demo proved I can carry a technical room; a 10-minute written brief is the harder skill.
2. **Designing for trust under low-trust conditions.** Field research showed counterparty distrust — not UI friction — is the failure mode. Bisafe escrow, dispute flows, and seller verification test design against that constraint.
3. **Writing for code I did not author.** The integration writeups describe systems whose source I cannot fully see.

### 2.6 Adjustments to the internship plan

Scope expanded after the demo; additions approved in 1:1s.

| Added item | Trigger | Status |
|---|---|---|
| **BillPay biller-inbound integration** | Demo ask | Live |
| **TXT notifications integration** | Demo ask | Live |
| **Bisafe escrow design** | Demo ask (counterparty trust) | Designed; in flight |
| **Paab cash-collection design** | Demo ask | Designed; scoped |
| **Benchmark expanded** (3→6, 5→7) | DX team — competitive context | Live in v2 |
| **WhatsApp bot** | Field research: de-facto trading channel | Working prototype |
| **USSD simulator** | Field research: rural sellers, no smartphones | Working prototype |
| **Routing workaround for Core blocker** | Production blocker (§4) | Live |
| **Senior-engineer integration writeups** | DX team adopted as docs candidates | Drafted |
| **Ecosystem Integration Retrospective** | Panel ask: outside-in integrator perspective | Draft delivered |
| **Reframe of final deliverable** — from launch to evidence vehicle | Lasting value sits in the retrospective + benchmark, not the product | Reframed |

The remaining ~3 weeks converge this material into one advisory document rather than adding more.

---

## 3. Justification of My Learning Objectives (HBO-i competencies)

The Internship Agreement allocates 30 ECTS across five HBO-i competencies. Each sub-section restates the goal with evidence.

**CMD framing.** Engineering-heavy on the surface, four CMD lenses shaped the work: **human-centred design** (architecture anchored in counterparty trust via field research); **service design** (web, WhatsApp, USSD, cash as one user journey); **systems thinking** (surfaced an internal ecosystem gap, not only an external benchmark gap); **low-connectivity UX** (2G, feature phones, power cuts as first-class constraints).

### 3.1 To Create — L2, 12 ECTS

**Goal:** *Ship a production full-stack application handling real user traffic — frontend-to-backend, event-driven integrations, internal tooling, CI/CD, fintech-grade security.*

- **ZimLivestock live in production**, integrated end-to-end with Paynow Core (Web + Express Checkout).
- **Stack:** React 18 + TS + Vite + Tailwind + shadcn/ui; Supabase Edge Functions in Deno; Paynow Core, BillPay, TXT.
- **Event-driven integration:** webhooks → Edge Function → Postgres with row-level security → realtime updates to subscribed clients.
- **Tooling:** admin auction-control dashboard, bid history, payment reconciliation, seller listing wizard, buyer browse + bid, WhatsApp bot, USSD simulator.
- **Tests + CI/CD:** Vercel previews per push; versioned Supabase migrations; security-agent edge function (11/11 PASS) gating RLS regressions; payment test matrix across the four sandbox numbers.
- **Secure coding:** per-user access controls; safe-retry keys on bids and payments; verified webhook signatures; closed a CORS vulnerability that would have let any third-party site call our payment functions; secrets in Supabase Vault.

### 3.2 To Learn — L2, 3 ECTS

**Goal:** *Operate effectively in a professional fintech environment — mastering Paynow's stack, participating in Agile cycles, reflecting regularly, and adjusting designs to regulatory and business realities.*

- **Stack absorbed end-to-end:** webhook signing, USSD push semantics, safe-retry patterns, the *biller-inbound* vendor flow, an undocumented inconsistency in how security signatures were generated during callbacks.
- **Agile cadence:** weekly standups; fortnightly supervisor 1:1s; tutor check-ins.
- **Reflection:** session logs, weekly progress reports, decision rationale in project memory.
- **Adjusting to constraints:** routing workaround after the Core blocker (§4); abandoned a custom Go backend once Supabase covered it; integrated Core + BillPay rather than a single rail, because "digital-only" cedes the cash economy.

### 3.3 To Communicate — L2, 6 ECTS

**Goal:** *Communicate technical work clearly to both technical and non-technical stakeholders — documentation, sprint updates, business-framed trade-offs.*

- **Leadership-panel demo (8 May):** agentic-buying chain executed live; feedback incorporated.
- **42-page DX benchmark:** Paynow vs five competitors, seven categories, reproducible rubric, 5+ recommendations.
- **Ecosystem Integration Retrospective:** four-layer model (observed friction → root cause → evidence → action) for mixed technical / non-technical readers.
- **Senior-engineer integration writeups** (Core, BillPay, TXT) for the DX docs pipeline.
- Weekly progress reports, session logs, demo deck, return-day script.

### 3.4 To Organise — L2, 3 ECTS

**Goal:** *Independently manage workflow — planning, tracking, sprint deadlines, adjusting under feedback, owning deliverables.*

- **Plan kept:** every success criterion delivered on or ahead of date.
- **Sprint discipline:** weekly reports, per-task tracking, structured deliverable folders.
- **Re-sequencing under feedback:** Bisafe moved to weeks 8–9 for BillPay + TXT; agentic-commerce bounded into one "non-app channels" stream.
- **Ownership:** sole intern, no missed deliverables; live app, ongoing operational responsibility.
- **Estimation under uncertainty:** the Cloudflare incident (~1.5 weeks unplanned) was absorbed by deferring BillPay to post-plan without dropping a plan item.

### 3.5 To Research — L2, 6 ECTS

**Goal:** *Conduct a structured investigation into a system-improvement opportunity, applying professional research methods and presenting a data-driven recommendation.*

- **Issue identified:** the Core blocker (§4), reproduced across IP ranges, request shapes, user-agent strings.
- **Method:** comparative benchmark against five peers with reproducible rubric; field research at a physical livestock auction; integration retrospective using a four-layer evidence model.
- **Metrics:** per-provider scores on docs, SDK, sandbox, error messages, onboarding, support, time-to-first-payment.
- **Solution prototyped:** routing workaround, live in production.
- **Recommendation:** side-by-side testing formed the basis for several infrastructure and DX recommendations (reasoning in §2.1 and §4), presented at the panel.

---

## 4. Experiences of Growth and Insights

The most significant growth moment in the first 17 weeks did not happen on a keyboard. It happened at an auction.

I had spent the preceding week on wireframes that, in hindsight, would have failed within weeks of real use. They assumed the friction was UI — too many taps, unclear pricing, slow loads. At the auction it became immediately obvious the friction is **counterparty trust** and **payment timing**; the interface is almost incidental. A seller paid in cash for thirty years needs credible reason to believe the money will arrive before the cattle leave the kraal, not a slicker checkout. I rewrote the architecture over the weekend — the single change with the largest downstream effect on the project.

The second moment was the Cloudflare relay incident — getting something wrong before getting it right. Backend calls to Paynow's main domain were silently dropped at the network layer. I assumed credentials, then CORS, then TLS — close to a working day at each before stepping back. When I escalated, Takudzwa asked me to reproduce the failure against `billpay.paynow.co.zw`. That subdomain succeeded immediately. The placement's most important finding began with a supervisor redirect, not my own insight. The procedural lesson — work through the stack systematically rather than repeatedly troubleshooting the same layer — is one I now apply consciously. The fix (a routing workaround that sends the call through the user's own browser) is now the documented standard.

The third moment was the week-6 realisation that the DX benchmark was the project's central reference, not a side-deliverable. I noticed I was reaching for it to justify every other decision — which product to integrate next, how to scope the retrospective, what to lead the demo with. Takudzwa's habit of pressing every artefact with *what decision does this enable* was the engine of the shift.

Two smaller moments reinforced the same lesson. A one-sentence supervisor question ("what is the Go layer doing that Supabase cannot?") collapsed three days of misplaced effort. And on working culture: after several weeks of over-requesting confirmation, I learned to bring Takudzwa proposed decisions with the option chosen, alternatives listed, and trade-offs named. Both came from explicit feedback rather than self-discovery.

The largest single surprise has been the **ecosystem consistency pattern inside Paynow itself**. I had expected comparative integration work to surface a Paynow-versus-the-world gap; it surfaced inconsistencies between Paynow's own product subdomains instead. The pattern that would resolve the most consequential of these is already running on a sister product. The most valuable advice I can leave behind is therefore less a roadmap of new things to build than a pointer back to a pattern Paynow has already shipped.

---

## 5. Reflection and Progress Assessment (for the internship tutor)

### 5.1 Does the work match the internship plan?

Yes — and it has expanded in directions invited by the supervisor and panel (§2.6). Original-plan items were all delivered; additions displaced nothing.

### 5.2 Are the activities appropriate for my internship goals?

Yes. Each HBO-i competency has substantive evidence (§3). The one most at risk is *To Communicate*: raw artefacts exist, but synthesis into a single advisory document is incomplete — the focus of my remaining ~3 weeks.

### 5.3 Have I acquired sufficient skills during training?

Largely yes. CMD prepared me well for **Create** and **Communicate**. **Research** built on prior coursework, stretched by the reproducible-rubric requirement. **Organise** was the biggest adjustment: a 91-day sole-developer placement abroad is a different problem from a group assignment with weekly sign-off. **Learn** built on prior reflective-practice training, with the remote cadence requiring adaptation.

### 5.4 Is supervision from the company sufficient?

Yes. Takudzwa Sisimayi's posture — give the intern access and let them surface what insiders cannot — is exactly what the placement requires. Feedback is timely, direct, and consistently challenges my conclusions; the §4 moments are representative.

### 5.5 Is supervision from the training programme sufficient?

Yes. John Bos has provided structured check-ins and consistent reading of my work against the HBO-i / CMD framework — particularly valuable after the demo when scope drifted. The remote cadence works because it is predictable and the first visit (13 February) preceded project-plan finalisation.

### 5.6 Bottlenecks

1. **Cloudflare relay problem** — ~1.5 weeks unplanned; resolved with the routing workaround (§4). Became the retrospective's most concrete recommendation.
2. **Webhook verification mismatch** — legitimate Paynow confirmations rejected as forgeries due to an undocumented inconsistency in how the security signature was generated. Three production rejections before identification; resolved and filed as a documentation gap.
3. **Scope drift after the demo** — the panel expanded scope into BillPay, Bisafe, Paab, WhatsApp, USSD. Managed by moving Bisafe to weeks 8–9 and bounding agentic work into one "non-app channels" stream. No plan items dropped.

All resolved.

### 5.7 Do I agree with the supervisor's assessment?

[FILL — after appraisal on FILL-date.] Based on the 1:1s I expect a positive assessment on *Create*, *Organise*, and *Research*, with constructive pressure on the synthesis-and-advisory side of *Communicate*. I agree with that in advance: it is where I am weakest and where the remaining work has highest leverage.

### 5.8 Goals for the remainder

1. Ship Bisafe escrow on ZimLivestock; document it in the senior-engineer register.
2. Deliver the final ecosystem report as a single advisory document — usable by leadership without my presence in the room.
3. Close the agentic-commerce workstream as an evidenced thesis rather than a one-off demonstration.
4. Leave onboarding documentation that gets the next external integrator to first payment in under a week (currently three).
5. Produce a separate written advisory brief pitched at non-engineer executives.

---

## 6. Conclusion

This internship developed my technical, research, and communication abilities beyond classroom conditions by placing me inside a live fintech environment with real operational constraints. Beyond delivering a working platform, it shifted my understanding of design from interface thinking toward systems, trust, infrastructure, and evidence-driven decision-making. The remaining weeks will consolidate the technical and research work into clear advisory documentation for both technical and non-technical stakeholders at Paynow.

---

## Appendix A — Key Deliverables Index (through week 17)

| Deliverable | Location | Status |
|---|---|---|
| Field research report | `deliverables/week-1-2/01-field-research/` | Delivered |
| DX benchmark v2 (6 providers, 7 categories) | `deliverables/week-1-2/02-dx-benchmark/` | Delivered |
| Wireframes and architecture | `deliverables/week-1-2/03-wireframes-architecture/` | Delivered |
| ZimLivestock MVP | `app-nine-sigma-jgoqp90f2p.vercel.app` | Live |
| Paynow Core integration (Web + Express) | `supabase/functions/initiate-payment`, `payment-webhook` | Live |
| BillPay biller-inbound integration | Paynow biller catalog | Live |
| TXT notifications integration | Order, bid, payment notifications | Live |
| Cloudflare Worker + browser-relay fallback | Infrastructure | Live |
| Ecosystem Integration Retrospective | `deliverables/` | Draft |
| Senior-engineer integration writeups | `deliverables/` | Draft |
| Leadership-panel demo | 8 May 2026 | Executed |
| WhatsApp bot (seller + buyer flows) | Agentic-commerce workstream | Working prototype |
| USSD simulator | Feature-phone channel | Working prototype |
| Security-agent RLS validation (11/11 PASS) | `supabase/functions/security-agent` | Live |
| Business artefacts (case, GTM, model, pilot proposal) | `deliverables/business/` | Delivered |
| Weekly progress + session logs | `deliverables/week-*/` | Ongoing |

## Appendix B — Competency Mapping (HBO-i / CMD)

| Competency | ECTS | Evidence (interim) |
|---|---|---|
| **To Create** L2 | 12 | ZimLivestock live; Core / BillPay / TXT end-to-end; admin tooling; CI/CD; fintech security |
| **To Learn** L2 | 3 | Stack absorbed; Agile cadence; supervisor 1:1s; session-log + reflection discipline |
| **To Communicate** L2 | 6 | Leadership demo; DX benchmark; ecosystem retrospective; integration writeups; weekly reports |
| **To Organise** L2 | 3 | All project-plan criteria met; sprint cadence held; re-sequencing without dropping items |
| **To Research** L2 | 6 | DX benchmark v2; ecosystem retrospective; Cloudflare investigation; field research |
| **Total** | **30** | |
