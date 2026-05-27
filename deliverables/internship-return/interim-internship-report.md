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

Paynow, operating under the legal entity Webdev Group / Softwarehouse, is one of Zimbabwe's largest digital payment-processing platforms. Founded in 2009 and headquartered at 27 Argyll Road, Newlands, Harare, it processes a substantial share of the country's card-not-present transactions. Where international card networks work erratically and bank branches are scarce outside the two main cities, Paynow is often the most viable acceptance layer for online merchants. The customer base spans thousands of merchants — from large utilities and insurers to single-operator e-commerce sellers.

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

Together these cover the full Zimbabwean payment matrix: digital-to-digital, digital-to-bill, digital-to-cash, cash-to-digital, and escrowed transactions.

### 1.4 Market

Three structural conditions define the market: mobile-money dominance (EcoCash and OneMoney, primarily over USSD); card-rail unreliability (Visa/Mastercard works intermittently under forex constraints); and continued heavy cash circulation in agriculture and informal trade. Paynow's direct competitors are Pesepay and DPOpay; Stripe, Paystack, and Flutterwave are either unavailable or operate under severe constraints here.

### 1.5 Internal organisation and structure

Paynow runs product teams per product line (Core, BillPay, TXT, Bisafe, Paab), a shared **Developer Experience (DX) team**, and a small SRE function. By Zimbabwean standards the company is **flat**: decisions sit with small cross-functional groups rather than long approval chains.

### 1.6 Internal communication

Per-product **Slack channels** for day-to-day, **WhatsApp** for urgent coordination. Weekly product standups; long-form decisions live in Google Drive — a friction point the DX team is working on.

### 1.7 My position and department

I report into the **DX team**, day-to-day supervised by Takudzwa Sisimayi, rather than to a single product team. The placement was deliberately positioned this way: no Paynow employee had previously integrated every Paynow product end-to-end in a single application. Sitting at the DX layer let me consume the ecosystem as an external integrator does, and expose inconsistencies that product-silo insiders would not see.

The positioning gave me four concrete things: direct access to engineering leads across Core, BillPay, TXT, Bisafe, and Paab; sandbox + live merchant accounts (Integration IDs 23657 and 23997); cross-team Slack access; and latitude to choose my own stack, scope, and research methodology, subject to a mid-point leadership-panel demo.

### 1.8 Position in the business chain

Paynow sits as the **integration and orchestration layer** between merchants/consumers and the underlying payment rails (EcoCash, OneMoney, Telecash, Zimswitch, banking partners). It is simultaneously infrastructure to merchants embedding Paynow Core, and a retail-facing product through BillPay and Paab. Oversight comes from the Zimbabwe Electronic Payments Association (ZEPA) and the Reserve Bank of Zimbabwe (RBZ).

### 1.9 Organisational culture

Three traits stood out:

- **Pragmatic and infrastructure-first.** Products are described by what fails on 2G or in a power cut, not by what looks good on a slide.
- **Flat and trust-based.** Live-merchant credentials and direct supervisor contact in week one. Decisions sit with whoever is closest to the problem.
- **Externally humble, internally confident.** Receptive to outside critique — without which the benchmark and retrospective would not have been possible.

---

## 2. Interim Evaluation (for the company supervisor)

### 2.1 Brief summary (≤ ½ A4)

Across the first 17 weeks of my 18-week placement at Paynow I designed, built, and deployed **ZimLivestock**, a livestock-trading marketplace for cattle, goats, sheep, and pigs that integrates the full Paynow ecosystem — Core (Web + Express Checkout), BillPay, TXT, and components of Bisafe and Paab — inside a single React PWA backed by Supabase. The application is live in production at `app-nine-sigma-jgoqp90f2p.vercel.app` and was demonstrated to a Paynow leadership panel on 8 May 2026, where the end-to-end agentic-buying chain (semi-automated WhatsApp- and USSD-driven purchase flows that complete without a traditional checkout UI) executed live on stage.

Alongside the build I delivered three research artefacts: (1) a **physical auction field-research report** from visits to a livestock auction, capturing fee structures, trust dynamics, and digital-readiness barriers; (2) a **42-page Developer Experience benchmark** comparing Paynow against five competitors across seven categories; and (3) an **Ecosystem Integration Retrospective** using a four-layer evidence model, accompanied by senior-engineer integration writeups for Core, BillPay, and TXT intended for Paynow's documentation team.

The most material finding is counter-intuitive: Paynow Core scored lowest of the six providers (4.2/10) while Paynow's own BillPay and TXT scored 7.5/10 and 7/10. The gap is an **internal consistency gap**, not a fundamental capability gap — and the architectural fix already exists on Paynow's own BillPay subdomain. Detailed in §4.

**Impact for Paynow.** Beyond the live marketplace, the work has produced material the DX team is actively reviewing as candidate documentation: integration writeups for Core, BillPay, and TXT in the register of Paynow's own engineers, plus a documented workaround for the Core bot-wall now in production. The DX benchmark v2 and Ecosystem Retrospective give the DX team an outside-in evidence base for the subdomain-isolation recommendation, which would otherwise have required engaging a paid external auditor.

### 2.2 Main tasks versus secondary tasks

| Category | Tasks |
|---|---|
| **Main tasks** (in original ZimLivestock plan, 12 Mar – 23 Apr) | Field research; DX benchmark vs Stripe / Paystack / Flutterwave; wireframes + architecture; marketplace prototype (listings + bidding); Paynow Core integration; end-to-end payment testing; stakeholder demos; final DX report; deployed prototype; 5-min presentation. |
| **Secondary tasks** (added post-demo / outside plan) | BillPay, TXT, Bisafe, Paab integrations/designs; benchmark expanded to 6 providers / 7 categories; WhatsApp bot; USSD simulator; senior-engineer integration writeups; Cloudflare Worker relay + browser-relay fallback; session-log discipline. |

The boundary between "main" and "secondary" eroded after the 8 May leadership demo. Tasks the panel asked me to extend — BillPay coverage, Bisafe escrow on high-ticket trades, agentic commerce via WhatsApp, USSD reach for feature phones — became central to the second half of the placement, not optional. Section 2.6 details the scope expansion explicitly.

### 2.3 The most important thing I have learned

The single most important lesson is that **a developer-experience benchmark, done from the inside with real production credentials, is a strategic instrument and not a documentation exercise.** I came in treating the benchmark as a deliverable. It is not. By week 6 it had become the spine of every other piece of work — retrospective, demo, integration order, even the ZimLivestock checkout design. The corollary is practical: write down what surprises you in week one. By week three those surprises feel normal, and the comparative evidence is gone.

### 2.4 Alignment with the internship plan

The placement began on **2 February 2026**, with the first weeks devoted to onboarding and orientation; the **ZimLivestock project plan** then ran formally from **12 March to 23 April 2026** (6 weeks). The internship therefore comprises two nested documents:

- **The Internship Agreement (CMD)** signed by myself, Takudzwa Sisimayi (company supervisor), and John Bos (internship tutor): 91 days, 2 Feb – 8 Jun 2026, anchored to five HBO-i competencies — *To Create*, *To Learn*, *To Communicate*, *To Organise*, *To Research* — totalling 30 ECTS.
- **The ZimLivestock project plan** (12 Mar – 23 Apr 2026, 6 weeks): the concrete project deliverable inside the placement.

Against the **ZimLivestock project plan**, every success criterion has been met or exceeded:

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

Against the **Internship Agreement competencies**, alignment is described in section 3.

### 2.5 Competencies to focus on in the upcoming period

For the remaining ~3 weeks I want to stretch on three things:

1. **Advisory communication to non-technical leadership.** The 8 May demo proved I can carry a technical room; condensing the same material into a 10-minute written brief is the harder skill. The final ecosystem report is the vehicle.
2. **Designing for trust under low-trust conditions.** Field research showed counterparty distrust — not UI friction — is the failure mode. Bisafe escrow, dispute flows, and seller verification are where I test design choices against that constraint.
3. **Writing for code I did not author.** The integration writeups for Paynow's docs team require describing systems whose source I cannot fully see — a different discipline from documenting my own code.

### 2.6 Adjustments to the internship plan (scope expansion vs original plan)

The internship has expanded materially beyond the original ZimLivestock project plan. The table below makes the expansion explicit so the supervisor and tutor can assess whether the additions remain consistent with the agreement.

#### Items inside the original plan and delivered

| Item | Plan reference |
|---|---|
| Marketplace prototype with listings + bidding + payment | Week 3–4 plan |
| Paynow Core integration (Web + Express / mobile money) | Week 3–4 plan |
| End-to-end payment testing | Week 5 plan |
| DX benchmark vs Stripe / Paystack / Flutterwave | Week 1–2 plan |
| Field research at livestock auction | Week 1–2 plan |
| Final DX report + 5-min presentation | Week 6 plan |
| Deployed prototype with public URL | Week 6 plan |

#### Items added during the placement (outside the original plan)

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

The scope expansion was approved progressively in supervisor 1:1s and has displaced no original-plan deliverable. The remaining ~3 weeks are committed to converging the material into a single coherent advisory document rather than producing more of it.

---

## 3. Justification of My Learning Objectives (HBO-i competencies)

The Internship Agreement allocates 30 ECTS across five HBO-i competencies. Each competency carries a learning goal phrased in my own words at the start of the placement. The sub-sections below justify each competency, restate the original learning goal, and present the evidence cluster that supports it at this interim point.

### 3.1 To Create — L2, 12 ECTS (6 compulsory + 6 elective)

**Original learning goal:** *By the end of my placement, I will have shipped at least one full-stack application at Paynow that interfaces with core platform infrastructure (e.g. payment processing, merchant management, or settlement), is deployed to production, and handles real user traffic. This includes building end-to-end features connecting frontend UIs to backend APIs and core Paynow systems; designing and implementing RESTful or event-driven integrations with core infrastructure; building merchant-facing or internal dashboards and tools; writing automated tests and managing deployments through CI/CD pipelines; and applying secure coding practices appropriate to a fintech environment.*

**Why this competency was appropriate.** Paynow runs live merchant flows; a localhost prototype would not have surfaced the relay problem, the webhook hash-ordering bug, or the realities of production integration. The 12 ECTS commitment reflects that the placement's strategic value depended on shipping, not just designing.

**Evidence cluster (interim).**

- **ZimLivestock live in production** at `app-nine-sigma-jgoqp90f2p.vercel.app`, integrated end-to-end with Paynow Core (Web + Express Checkout).
- **Stack**: React 18 + TS + Vite + Tailwind + shadcn/ui (client); Supabase Edge Functions in Deno (server); Paynow Core, BillPay biller-inbound, and TXT bulk-SMS (core systems).
- **Event-driven integration**: Paynow webhooks → Edge Function → RLS-secured Postgres → realtime fan-out.
- **Internal/merchant tooling**: admin auction-control dashboard, bid history, payment reconciliation, seller listing wizard, buyer browse + bid, WhatsApp bot, USSD simulator.
- **Tests + CI/CD**: Vercel previews per push; versioned Supabase migrations; security-agent edge function (11/11 PASS) gating RLS regressions; payment test matrix exercising Paynow's four sandbox numbers (success / delayed / cancel / insufficient).
- **Secure coding for fintech**: row-level security on every table (database rules that prevent a user reading or writing rows that aren't theirs); idempotency keys on `bids` and `payments` (so a retried request can't accidentally double-bid); SHA-512 hash verification on Paynow webhooks (cryptographic proof the callback isn't forged); CORS wildcard fallback removed on user-facing functions (SEV-1 fix — would have let any third-party site call our payment functions); no stack traces leaked on public endpoints; secrets in Supabase Vault.
- **Atomic RPCs** (`place_bid`, `end_expired_auctions`) — single-statement transactions, instead of "check then act" sequences that can race when two users bid simultaneously.

### 3.2 To Learn — L2, 3 ECTS (compulsory, maximum permitted)

**Original learning goal:** *By the end of my placement, I will demonstrate that I can operate effectively in a professional fintech development environment by mastering Paynow's tech stack and adapting my academic development methods to enterprise-level constraints through regular reflection and feedback cycles. This includes learning internal frameworks and tooling; participating in Agile sprints; holding bi-weekly reflection sessions; and adjusting technical designs based on regulatory and business realities.*

**Why this competency was appropriate.** I arrived with no prior fintech experience and no exposure to mobile-money rails or USSD-first markets. The placement only works if I can absorb domain context fast enough to make non-trivial decisions without supervision.

**Evidence cluster (interim).**

- **Paynow stack absorbed end-to-end**: SHA-512 conventions; Express Checkout USSD push semantics; webhook callback signing; idempotency patterns; biller-inbound vendor flow; TXT sender-ID branding; the undocumented hash-ordering quirk.
- **Agile participation**: weekly product standups across Core, BillPay, TXT; fortnightly supervisor 1:1s (Sisimayi); tutor check-ins (Bos).
- **Reflection cadence**: session-log discipline; weekly progress reports in `deliverables/`; saved decision rationale in project memory.
- **Adjusting designs to regulatory / business realities**: switched to browser-relay + Cloudflare Worker after hitting the Core bot-wall (see §4); chose Supabase over a custom Go backend after Go-side complexity grew faster than Supabase's RLS surface; chose Paynow Core + BillPay over a single-rail integration after realising "digital-only" cedes the cash-economy market.

### 3.3 To Communicate — L2, 6 ECTS (3 compulsory + 3 elective)

**Original learning goal:** *By the end of my placement, I will communicate technical work clearly to both technical and non-technical stakeholders by producing professional documentation, presenting sprint updates, and explaining system trade-offs in business-relevant terms. This includes writing API or feature documentation; updating stakeholders during sprint ceremonies; translating technical complexity for support or product teams; and documenting design decisions.*

**Why this competency was appropriate.** The work is only valuable if Paynow leadership reads, believes, and acts on it. The DX team asked for outside-in evidence on developer experience; product teams asked for an integration-friction list only an end-to-end integrator produces. Both audiences need the same material translated for them.

**Evidence cluster (interim).**

- **8 May 2026 leadership-panel demo**: full agentic-buying chain executed live; panel feedback captured and incorporated.
- **42-page DX benchmark**: Paynow vs Stripe / Paystack / Flutterwave / Pesepay / DPOpay across seven categories, with a reproducible rubric and five+ actionable recommendations.
- **Ecosystem Integration Retrospective**: four-layer evidence model (observed friction → root-cause hypothesis → evidence → recommended action), written for both engineering leads and non-engineer executives.
- **Senior-engineer integration writeups** for Core, BillPay, TXT — in the register of Paynow's own engineers, intended for adoption into the DX docs pipeline.
- **Weekly progress reports**, session logs, the demo deck, the 1-minute video script, the NHL Stenden return-day script.

### 3.4 To Organise — L2, 3 ECTS (compulsory)

**Original learning goal:** *By the end of my placement, I will independently manage my development workflow within Paynow's Agile environment by planning tasks, tracking progress, meeting sprint deadlines, and adjusting priorities based on feedback. This includes breaking work into subtasks; estimating delivery time; using sprint boards; monitoring productivity; and taking ownership of deliverables.*

**Why this competency was appropriate.** With week-one autonomy over stack, scope, and methodology, the placement depended heavily on disciplined planning and prioritisation. Organisation is load-bearing for everything else.

**Evidence cluster (interim).**

- **Plan kept**: every success criterion of the 12 Mar – 23 Apr project plan delivered on or ahead of date (see §2.4 table).
- **Sprint discipline**: weekly progress reports; per-task todo tracking; structured deliverable folders.
- **Priority re-sequencing under feedback**: post-demo, Bisafe moved from week 7 to weeks 8–9 to make room for BillPay + TXT; agentic-commerce work was scoped into a single "non-app channels" stream.
- **Ownership**: 91-day placement, sole intern, no missed deliverables; live production app with ongoing operational responsibility (uptime, payment reconciliation, RLS regression testing).
- **Realistic estimation under uncertainty**: the Cloudflare incident (~1.5 weeks unplanned) absorbed without dropping plan items, by deferring BillPay to post-plan.

### 3.5 To Research — L2, 6 ECTS (elective)

**Original learning goal:** *By the end of my placement, I will conduct a structured technical investigation into a system improvement opportunity at Paynow, apply professional research methods, and present a data-driven recommendation to senior engineers. This includes identifying a performance or architecture issue; collecting system metrics; prototyping solutions; evaluating results; writing a recommendation report; and presenting findings.*

**Why this competency was appropriate.** Both asks from the DX and product teams are research-shaped, not build-shaped: the deliverables are findings + recommendations, not features.

**Evidence cluster (interim).**

- **Issue identified**: the Core bot-wall (incident in §4), reproduced across IP ranges, request shapes, and user-agent strings.
- **Method**: comparative benchmark against five named peers across seven categories with a reproducible rubric; structured field-research at a physical livestock auction; integration retrospective using a four-layer evidence model.
- **Metrics collected**: per-provider scores on docs, SDK, sandbox, error messages, onboarding, support, time-to-first-payment. For Core specifically: webhook reliability, time to sandbox / live payment, undocumented quirks.
- **Solution prototyped**: Cloudflare Worker relay + browser-relay fallback, both live in production and documented as the standard workaround.
- **Evaluation**: side-by-side against Paynow's own BillPay subdomain, which is not behind the same wall. This forms the basis for the central recommendation around subdomain isolation and infrastructure separation (scores and full reasoning in §2.1 and §4).
- **Recommendation + presentation**: DX benchmark v2 + Ecosystem Retrospective delivered to the DX team with subdomain isolation as recommendation #1; presented at the 8 May 2026 leadership-panel demo.

---

## 4. Experiences of Growth and Insights

The most significant growth moment in the first 17 weeks did not happen on a keyboard. It happened at the auction.

I had spent the preceding week building wireframes for a livestock marketplace that, in hindsight, would have failed inside a fortnight of real use. The wireframes assumed that the friction in livestock trading was user-interface friction — too many taps, unclear pricing, slow page loads. At the auction it became immediately obvious that the friction is **counterparty trust** and **payment timing**, and that the user interface is almost incidental. A seller who has been paid in cash for thirty years does not need a slicker checkout; he needs a credible reason to believe the money will arrive before the cattle leave the kraal. Walking back from that visit, I rewrote the architecture document over a weekend. It is the single change that has had the largest downstream effect on the project.

The second growth moment was the Cloudflare relay incident. It is the clearest example I can give of something I got wrong before I got it right.

The symptom was simple to describe and hard to diagnose: every call from our backend to Paynow's main domain was being silently dropped before Paynow's servers even saw it. (In network terms, the calls returned TCP RST — the connection rejected at the network layer, before any application-level response.) The cause looked initially like a credentials problem, then a CORS problem, then a TLS problem. I spent almost a full working day at each of those layers before climbing one rung up the stack. When I eventually escalated to Takudzwa I expected him to reset credentials or open a firewall rule. He did neither. He asked me to reproduce the failure against `billpay.paynow.co.zw`. That subdomain succeeded immediately — which is how the comparative evidence (Core scoring 4.2/10 versus BillPay scoring 7.5/10) ended up in the retrospective as the central recommendation. The framing I now describe as the placement's most important finding was, in its original form, his redirect, not my insight.

The procedural lesson — climb the stack one layer at a time, rather than thrashing at the layer you know best — is one I now apply consciously. It is the lesson I would not have learned without his pushback. The relay fix itself (a Cloudflare Worker plus a browser-relay fallback) is now documented as the standard workaround for any integrator hitting the same wall.

The third — and most professionally formative — moment was the realisation, around week 6, that the DX benchmark was not a side-deliverable but the strategic centre of the project (the substance of this is in §2.3). What I want to note here is the texture of the realisation. It did not arrive as an insight. It arrived as a slow accumulation of moments where I noticed I was reaching for the benchmark to justify every other decision — which Paynow product to integrate next, how to scope the retrospective, what to lead the demo with. The mindset shift was from "produce deliverables" to "produce evidence that decisions can be made on." Takudzwa's habit of pressing every artefact with the same question — what decision does this enable — was, in retrospect, the engine of that shift.

A fourth growth moment, smaller but no less formative, was abandoning the custom Go backend I had started building in week 3. I had defaulted to a familiar pattern from my CMD coursework — a separate backend service speaking to a frontend client — and was three days into implementing payment endpoints when Takudzwa asked me, in a 1:1, what the Go layer was doing that Supabase's row-level security and Edge Functions could not. I did not have a good answer. The Go backend came out the following week; the same functionality is now ~200 lines of Postgres functions and a handful of Edge Functions in Deno. The lesson was not "choose Supabase" — that decision was incidental. The lesson was that I had been pattern-matching to a stack I already knew, rather than thinking about the actual constraints of the integration in front of me. It is the moment in the placement where the gap between "what I have built before" and "what this problem needs" was most visible, and it took a one-sentence supervisor question to surface it.

A smaller but persistent insight has been about working culture. Paynow's flatness and pragmatism were initially disorienting after the structured hand-in cadence of a Dutch HBO programme; there is no equivalent of a weekly tutor sign-off, and decisions are expected to be made by whoever is closest to the problem. After the first three weeks of slight over-checking, I learned to bring proposed decisions to Takudzwa with the option already chosen, the alternatives listed, and the trade-offs named. His response was uniformly faster and more useful in that format than when I asked open questions. The behaviour change took explicit feedback to land: in a 1:1 after one particularly open-ended Slack thread, he pointed out that the questions I was asking were doing more work than my proposed answers were, and that this was the wrong way round. I rewrote my next supervisor agenda the same evening, and the format I now use — proposed decision, two alternatives, the trade-off that made me pick one — comes directly from that conversation.

The largest single surprise has been the **internal consistency gap inside Paynow itself**. I had expected the benchmark to surface a Paynow-versus-the-world gap. It surfaced, instead, a Paynow-Core-versus-Paynow-BillPay gap. The architectural fix for Core's lowest-scoring problem already exists, in production, on a sister product's subdomain. The most valuable advice I can leave behind is therefore not a roadmap of new things to build but a pointer to a fix Paynow has already shipped, applied to the product that needs it most.

---

## 5. Reflection on Internship and Progress Assessment (for the internship tutor)

### 5.1 Does the work match the tasks and activities agreed in the internship plan?

Yes — and it has expanded beyond them in directions that were explicitly invited by the company supervisor and the leadership panel. Section 2.6 sets out the original-plan items (all delivered) and the added items (all approved progressively in supervisor 1:1s with Takudzwa Sisimayi). The expansion has not displaced any original-plan deliverable.

### 5.2 Are the activities appropriate for my internship goals?

Yes. The five HBO-i competencies in the agreement — *To Create*, *To Learn*, *To Communicate*, *To Organise*, *To Research* — each have a substantive evidence cluster at interim (see section 3). The competency I judge most at risk of under-delivery is *To Communicate*: the raw artefacts exist, but the final synthesis into a single advisory document for Paynow leadership is the most important piece of remaining work and is incomplete. This is the principal focus of my remaining ~3 weeks.

### 5.3 Have I acquired sufficient skills during my training to carry out my tasks?

Largely yes. The CMD programme prepared me well for **Create** and **Communicate**. **Research** was supported by prior user-research coursework but stretched by the requirement to apply it to a DX benchmark with a reproducible rubric — a genre I had not previously practised. **Organise** was the biggest adjustment: managing a 91-day placement as a sole developer in a foreign country is a different organisational problem from a group assignment with weekly sign-off. **Learn** built on prior reflective-practice training; the remote-supervision cadence required adaptation.

### 5.4 Is the supervision from the company sufficient?

Yes. Takudzwa Sisimayi's posture — give the intern access and let them surface what insiders cannot — is exactly what the placement requires. Feedback has been timely, direct, and has consistently challenged my conclusions rather than accepted them, which is the more useful behaviour for this work. Two representative moments are detailed in §4: the Cloudflare-wall redirect (which produced the retrospective's central recommendation) and the one-sentence question that removed the Go backend the following week. In both cases my first instinct was wrong and supervision corrected the trajectory rather than rubber-stamped it. Bi-weekly 1:1s are the right cadence given the autonomy I have day-to-day.

### 5.5 Is the supervision from the training programme sufficient?

Yes. John Bos has provided structured check-ins and a consistent reading of my work against the HBO-i / CMD framework — particularly valuable after the 8 May demo when scope began to drift. The remote cadence (Leeuwarden ↔ Harare) has worked because it is predictable and because the first visit took place on 13 February, before the project plan was finalised.

### 5.6 Bottlenecks or problems during this internship period

Three are worth naming explicitly.

**Bottleneck 1 — the Cloudflare relay problem.** ~1.5 weeks of unplanned engineering time. Resolved with a Worker relay + browser-relay fallback, now the standard workaround. Full narrative in §4; the bottleneck is now an asset — it produced the retrospective's most concrete recommendation.

**Bottleneck 2 — webhook hash-ordering bug.** Some legitimate Paynow payment confirmations were being rejected by our code as if they were forgeries. The cause was a quirk in Paynow's signing logic: it hashes the callback fields in the order Paynow's server sent them, not the order our code expected. If anything along the network path reshuffles those fields, the hash no longer matches and the callback is dropped. The behaviour is undocumented and caused three intermittent production rejections before I identified it. Resolved by reconstructing the hash on received-order; filed as a documentation gap in the Core writeup.

**Bottleneck 3 — scope drift after the leadership demo.** The 8 May panel produced strong feedback that expanded the project's scope into BillPay, Bisafe escrow, Paab cash, agentic commerce, WhatsApp, and USSD flows. Productive feedback, but a scope-management risk. Managed by formally moving Bisafe from week 7 to weeks 8–9 and bounding the agentic work into a single "non-app channels" workstream rather than letting it spread across every deliverable. Net effect: scope expanded without plan items being dropped.

All three were resolved within the placement period.

### 5.7 Do I agree with the assessment my supervisor has given me?

[FILL — after appraisal on FILL-date.] Based on bi-weekly conversations with Takudzwa, I expect the assessment to be broadly positive on technical delivery (*Create*, *Organise*) and research (*Research*), with constructive pressure on synthesis-and-advisory (*Communicate*) — which I have flagged in §2.5 as my priority for the remaining weeks. I agree with that direction in advance: it is where I am weakest and where the remaining work has the highest leverage.

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
