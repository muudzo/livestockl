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

Paynow, operating under the legal entity Webdev Group / Softwarehouse, is Zimbabwe's largest digital payment-processing platform. Founded in 2009, the company processes the majority of card-not-present transactions in the country. Paynow's role in the Zimbabwean economy is structural rather than incidental: in a market where Visa and Mastercard rails work erratically, where bank branches are scarce outside Harare and Bulawayo, and where the modal consumer transaction is a US$2–US$10 purchase paid via EcoCash or OneMoney USSD, Paynow is for most online merchants the only viable acceptance layer.

The company headquarters is at 27 Argyll Road, Newlands, Harare. Its customer base spans thousands of merchants — from large utilities and insurers to single-operator e-commerce sellers — and indirectly almost every Zimbabwean consumer who has ever paid an online bill.

### 1.2 Mission and goals

Paynow's stated mission is **"to make digital payments accessible to every Zimbabwean."** In a country where physical-cash infrastructure has periodically collapsed (the 2008 hyperinflation episode and the post-2016 bond-note era both pushed adoption of digital wallets), this mission is read literally inside the company: a payment product that does not work on a US$30 feature phone, in a power cut, on 2G, in rural Mashonaland, has failed its mandate. This framing — accessibility first, polish second — shapes most product decisions I observed.

### 1.3 Activities and products

Paynow operates a multi-product ecosystem rather than a single payment gateway. The portfolio is:

| Product | Function | Primary user |
|---|---|---|
| **Paynow Core** | Web Checkout (hosted page, SHA-512 signed form POST) + Express Checkout (USSD push to EcoCash, OneMoney, Telecash, Zimswitch) | Online merchants |
| **BillPay** | Vendor API to pay 106+ Zimbabwean billers (ZESA electricity, ZWSC water, school fees, municipal rates, medical aid, DStv, airtime) | Retail apps, banks, super-apps |
| **TXT (txt.co.zw)** | Bulk SMS gateway with sender-ID branding | Merchants needing OTPs, receipts, notifications |
| **Bisafe** | Escrow product — funds held until delivery confirmation | High-ticket and trust-deficit transactions |
| **Paab** | Physical cash-collection agent network; teller points notify the merchant digitally on receipt | Unbanked / cash-only consumers |

Together these products cover the full payment matrix in Zimbabwe: digital-to-digital, digital-to-bill, digital-to-cash, cash-to-digital, and assured (escrowed) transactions.

### 1.4 Market

Paynow operates in the Zimbabwean digital-payments market, which is defined by three structural conditions:

1. **Mobile money dominance.** EcoCash (Econet Wireless) and OneMoney (NetOne) together account for the overwhelming majority of consumer transactions. USSD, not apps, is the primary interface.
2. **Card-rail unreliability.** International card networks function intermittently due to forex controls and correspondent-banking constraints. A merchant who relies solely on Visa/Mastercard cannot operate sustainably.
3. **Cash co-existence.** Cash remains in heavy circulation, particularly in agriculture and informal trade. Any "digital-only" product cedes a large addressable market.

Paynow's direct competitors are Pesepay and DPOpay (regional gateways), as well as direct integrations that larger merchants build straight to mobile-network APIs. Globally comparable players — Stripe, Paystack, Flutterwave — are either unavailable in Zimbabwe or operate with severe constraints.

### 1.5 Internal organisation and structure

Paynow is organised into **product teams aligned to each product line** (Core, BillPay, TXT, Bisafe, Paab), supported by a **Developer Experience (DX) team** that owns SDKs, merchant onboarding, and developer-facing documentation, and a small infrastructure / SRE function shared across products.

A simplified text representation of the structure:

```
                    Executive / Leadership
                              |
        ----------------------+----------------------
        |          |          |          |          |
      Core      BillPay      TXT      Bisafe       Paab
    Product    Product    Product   Product     Product
     Team       Team       Team      Team        Team
        |          |          |          |          |
        +----------+----+-----+----------+----------+
                        |
                Developer Experience (DX)
                        |
           Shared Infrastructure / SRE
```

By Zimbabwean corporate standards the company is **flat**: product decisions are made inside small cross-functional groups (engineering lead + product owner + relevant DX contact) rather than in long hierarchical approval chains. The pace is closer to a Western start-up than to a typical Harare financial-services firm.

### 1.6 Internal communication

Day-to-day communication runs primarily on **Slack channels** organised per product, supplemented by **WhatsApp** for urgent or out-of-hours coordination — a culturally natural choice in a market where WhatsApp is the universal default. Weekly **product standups** synchronise the cross-team picture, and ad-hoc Google Meet calls handle deeper technical reviews. Written long-form decisions (architecture notes, RFCs, integration writeups) live in shared Google Drive folders rather than a single wiki, which is one of the friction points the DX team is actively working on.

### 1.7 My position and department

I report into the **Developer Experience (DX) team**, with day-to-day supervision by Takudzwa Sisimayi, rather than to a single product team. The placement was deliberately positioned this way: no Paynow employee had previously integrated every Paynow product end-to-end inside a single application. By sitting at the DX layer I would simultaneously consume the entire ecosystem as an external integrator does and expose inconsistencies that insiders, working within their own product silos, would not see.

This positioning gave me:

- A direct line to engineering leads on Core, BillPay, TXT, Bisafe, and Paab.
- A sandbox merchant account and a live merchant account (Integration IDs 23657 and 23997).
- Access to internal Slack channels across product teams.
- Latitude to choose my own technical stack, scope, and research methodology, subject to a leadership-panel demo at the mid-point.

### 1.8 Position in the business chain

Paynow sits as the **integration and orchestration layer** between two sides of the Zimbabwean payments market:

```
  Consumers / Merchants  <-->  Paynow  <-->  Payment rails
   (clients of Paynow)                  (EcoCash, OneMoney,
                                         Telecash, Zimswitch,
                                         banking partners)
```

It is simultaneously **infrastructure** (to thousands of merchants who embed Paynow Core in their checkout) and a **retail-facing product** (BillPay and Paab are used directly by end-consumers via partner apps and physical agents). The relevant industry bodies are the Zimbabwe Electronic Payments Association (ZEPA) and the Reserve Bank of Zimbabwe (RBZ), which exercises payment-system oversight.

### 1.9 Organisational culture

Three cultural traits stood out to me as a newcomer:

- **Pragmatic and infrastructure-first.** Engineers describe products by what fails when the power goes out or the network drops to 2G, not by what looks good on a slide. The bar for "works" is high; the bar for "polished" is secondary.
- **Flat and trust-based.** I was given live-merchant credentials and direct supervisor contact in week one. Decisions are made by the people closest to the problem.
- **Externally humble, internally confident.** Paynow knows it is the dominant gateway in the market but does not behave like a monopolist; the DX team in particular is receptive to outside critique, which made the benchmark and retrospective deliverables possible.

---

## 2. Interim Evaluation (for the company supervisor)

### 2.1 Brief summary (≤ ½ A4)

Across the first 17 weeks of my 18-week placement at Paynow I designed, built, and deployed **ZimLivestock**, a livestock-trading marketplace for cattle, goats, sheep, and pigs that integrates the full Paynow ecosystem — Core (Web + Express Checkout), BillPay, TXT, and components of Bisafe and Paab — inside a single React PWA backed by Supabase. The application is live in production at `app-nine-sigma-jgoqp90f2p.vercel.app` and was demonstrated to a Paynow leadership panel on 8 May 2026, where the end-to-end agentic-buying chain executed live on stage.

Alongside the build I delivered three research artefacts: (1) a **physical auction field-research report** from visits to a livestock auction, capturing fee structures, trust dynamics, and digital-readiness barriers; (2) a **42-page Developer Experience benchmark** comparing Paynow against five competitors across seven categories; and (3) an **Ecosystem Integration Retrospective** using a four-layer evidence model, accompanied by senior-engineer integration writeups for Core, BillPay, and TXT intended for Paynow's documentation team.

The most material finding is a counter-intuitive one: Paynow's Core gateway scored 4.2/10 in the DX benchmark — the lowest of the six providers compared — while Paynow's own BillPay and TXT products scored 7.5/10 and 7/10 respectively. The gap is an **internal consistency gap**, not a fundamental capability gap; the architectural fix (subdomain isolation away from the Cloudflare bot wall on `www.paynow.co.zw`) already exists inside Paynow's own infrastructure on `billpay.paynow.co.zw`.

### 2.2 Main tasks versus secondary tasks

| Category | Tasks |
|---|---|
| **Main tasks** (in original ZimLivestock project plan, 12 Mar – 23 Apr) | Auction-house field research; DX benchmark vs Stripe / Paystack / Flutterwave; wireframes + architecture; functional marketplace prototype (listings + bidding + browse); Paynow Core integration (Web + Express Checkout / mobile money); end-to-end payment testing; stakeholder demos; final DX report; deployed prototype with public URL; 5-minute presentation. |
| **Secondary tasks** (added post-demo / outside original plan) | BillPay biller-inbound integration; TXT notifications integration; Bisafe escrow design; Paab cash-collection design; benchmark scope expanded from 3 to 6 providers and 5 to 7 categories; WhatsApp bot for listing/bidding; USSD simulator for feature-phone users; senior-engineer integration writeups for the Paynow docs team; Cloudflare Worker relay and browser-relay fallback for the Core bot-wall problem; session-log discipline and weekly progress reports. |

The boundary between "main" and "secondary" eroded after the 8 May leadership demo. Tasks the panel asked me to extend — BillPay coverage, Bisafe escrow on high-ticket trades, agentic commerce via WhatsApp, USSD reach for feature phones — became central to the second half of the placement, not optional. Section 2.6 details the scope expansion explicitly.

### 2.3 The most important thing I have learned

The single most important lesson is that **a developer-experience benchmark, done from the inside with real production credentials, is a strategic instrument and not a documentation exercise.** I came into the internship treating the benchmark as a deliverable. By week 6 it had become the spine of every other piece of work: the integration retrospective, the leadership demo, the choice of which Paynow products to integrate in what order, and even the design of the ZimLivestock checkout flow all hung off insights surfaced during benchmarking. The corollary lesson is that the value of an outsider-with-access role lies entirely in writing down what surprises you in week one, before the surprises normalise.

### 2.4 Alignment with the internship plan

The internship comprises two nested documents:

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

For the remaining ~3 weeks I want to deliberately stretch on:

1. **Advisory communication to non-technical leadership.** The 8 May demo proved I can carry a technical room; the harder skill is condensing the same material into a 10-minute written brief that a non-engineer executive will act on. The final ecosystem report is the vehicle.
2. **Designing for trust under low-trust conditions.** Field research showed the failure mode in Zimbabwean livestock trading is not user-interface friction but counterparty distrust. Bisafe escrow integration, dispute flows, and seller verification are where I will test design choices against that constraint.
3. **Writing for code I did not author.** The integration writeups for Paynow's documentation team require me to describe systems whose source I cannot fully see — a different writing discipline from documenting my own code, and one I want to get better at before the placement ends.

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
| **BillPay biller-inbound integration** — registered ZimLivestock as a biller, enabling buyers to pay using vendor reference flow | 8 May demo panel ask | Live |
| **TXT notifications integration** — order, bid, payment SMS via Paynow's own SMS rail | 8 May demo panel ask + integration synergy | Live |
| **Bisafe escrow design** — funds held until livestock delivery confirmation | 8 May demo panel ask (counterparty trust) | Design + scoping done, integration in flight |
| **Paab cash-collection design** — unbanked-buyer flow | 8 May demo panel ask | Design done, integration scoped |
| **Benchmark scope expanded** from 3 providers / 5 categories → 6 providers (added Pesepay, DPOpay) / 7 categories | DX team request — wanted regional competitive context, not just global | Live in benchmark v2 |
| **WhatsApp bot** — 7-step seller listing flow + buyer bidding flow | Field research showed WhatsApp is the de-facto trading channel | Working prototype |
| **USSD simulator** — feature-phone channel | Field research showed many rural sellers have no smartphone | Working prototype |
| **Cloudflare Worker relay + browser-relay fallback** | Production blocker: Cloudflare bot wall on `www.paynow.co.zw` blocked server-to-server calls from Supabase Edge | Live infrastructure |
| **Senior-engineer integration writeups** for Core, BillPay, TXT | DX team adopted my private notes as documentation candidates | Drafted, with DX team |
| **Ecosystem Integration Retrospective** (four-layer evidence model) | Synthesis vehicle for the panel ask "tell us what we look like from outside" | Draft delivered |
| **Reframe of final deliverable** from "ZimLivestock launch" → "ZimLivestock as evidence vehicle for an ecosystem integration thesis" | The product is live; the strategic value is the retrospective + benchmark, not the product itself | Reframed |

The scope expansion has been approved progressively in supervisor 1:1s; none of it has displaced original-plan deliverables. The principal risk is **synthesis-debt**: there is now more raw material than will fit into a single coherent advisory document, and the remaining ~3 weeks are committed to converging the material rather than producing more of it.

---

## 3. Justification of My Learning Objectives (HBO-i competencies)

The Internship Agreement allocates 30 ECTS across five HBO-i competencies. Each competency carries a learning goal phrased in my own words at the start of the placement. The sub-sections below justify each competency, restate the original learning goal, and present the evidence cluster that supports it at this interim point.

### 3.1 To Create — L2, 12 ECTS (6 compulsory + 6 elective)

**Original learning goal:** *By the end of my placement, I will have shipped at least one full-stack application at Paynow that interfaces with core platform infrastructure (e.g. payment processing, merchant management, or settlement), is deployed to production, and handles real user traffic. This includes building end-to-end features connecting frontend UIs to backend APIs and core Paynow systems; designing and implementing RESTful or event-driven integrations with core infrastructure; building merchant-facing or internal dashboards and tools; writing automated tests and managing deployments through CI/CD pipelines; and applying secure coding practices appropriate to a fintech environment.*

**Why this competency was appropriate.** Paynow is a fintech operator with live merchant flows. A "prototype on localhost" would not have exposed the relay problem, the webhook hash-ordering bug, or the operational reality of running an integration in production. The 12 ECTS commitment reflects that build work was always going to be the dominant time-sink, and the placement's strategic value depended on me being able to ship — not just design.

**Evidence cluster (interim).**

- **ZimLivestock live in production** at `app-nine-sigma-jgoqp90f2p.vercel.app`, integrated end-to-end with Paynow Core (Web Checkout + Express Checkout / mobile money).
- **Frontend ↔ backend ↔ core Paynow systems**: React 18 + TypeScript + Vite + Tailwind + shadcn/ui (client); Supabase Edge Functions in Deno (server); Paynow Web/Express Checkout, BillPay biller-inbound, and TXT bulk-SMS (core systems).
- **Event-driven integration**: Paynow webhooks → Supabase Edge Function → row-level-secured Postgres → realtime fan-out to subscribed clients.
- **Internal/merchant-facing tooling**: admin auction-control dashboard; bid-history views; payment-status reconciliation; seller listing wizard; buyer browse + bid; WhatsApp bot listing flow; USSD simulator.
- **Tests + CI/CD**: Vercel preview deployments per push; Supabase migrations versioned and deployed via CLI; security-agent edge function (11/11 PASS) gates RLS regressions; payment test matrix exercises Paynow's four sandbox phone numbers (success / delayed / cancel / insufficient).
- **Secure coding for fintech**: row-level security on every table; idempotency keys on `bids` and `payments`; SHA-512 hash verification on Paynow webhooks; CORS wildcard fallback removed on user-facing functions (SEV-1 fix); no stack traces leaked on public endpoints; secrets in Supabase Vault, never inline.
- **Atomic RPCs** for `place_bid` and `end_expired_auctions` — single-statement transactions, not check-then-act sequences.

### 3.2 To Learn — L2, 3 ECTS (compulsory, maximum permitted)

**Original learning goal:** *By the end of my placement, I will demonstrate that I can operate effectively in a professional fintech development environment by mastering Paynow's tech stack and adapting my academic development methods to enterprise-level constraints through regular reflection and feedback cycles. This includes learning internal frameworks and tooling; participating in Agile sprints; holding bi-weekly reflection sessions; and adjusting technical designs based on regulatory and business realities.*

**Why this competency was appropriate.** I arrived in a Zimbabwean fintech environment with no prior fintech experience, a Dutch academic engineering background, and no exposure to mobile-money rails or USSD-first markets. The placement only succeeds if I can absorb domain context fast enough to make non-trivial decisions without supervision.

**Evidence cluster (interim).**

- **Paynow tech stack absorbed end-to-end**: SHA-512 hashing conventions; Express Checkout USSD push semantics; webhook callback signing; idempotency-key patterns; biller-inbound vendor flow; TXT sender-ID branding; the (undocumented) hash-ordering quirk on callbacks.
- **Agile participation**: weekly product standups across Core, BillPay, TXT; ad-hoc Slack-driven decision cycles; supervisor 1:1s every fortnight (Sisimayi); tutor check-ins (Bos).
- **Reflection cadence**: session-log discipline — every working session ends with a markdown log capturing decisions, surprises, and next steps. Weekly progress reports in `deliverables/`. Saved decision rationale in project memory (auto-memory) so context survives across sessions.
- **Adjusting designs to regulatory / business realities**: switched from server-to-server Paynow calls to browser-relay + Cloudflare Worker after discovering Cloudflare bot-wall enforcement (regulatory-adjacent: fraud-prevention layer Paynow cannot disable per-merchant); chose Supabase over a custom Go backend after Go-side complexity grew faster than Supabase's RLS surface; chose Paynow Core + BillPay over a single-rail integration after realising "digital-only" cedes the cash-economy market.

### 3.3 To Communicate — L2, 6 ECTS (3 compulsory + 3 elective)

**Original learning goal:** *By the end of my placement, I will communicate technical work clearly to both technical and non-technical stakeholders by producing professional documentation, presenting sprint updates, and explaining system trade-offs in business-relevant terms. This includes writing API or feature documentation; updating stakeholders during sprint ceremonies; translating technical complexity for support or product teams; and documenting design decisions.*

**Why this competency was appropriate.** The value of the work is downstream of whether Paynow leadership reads, believes, and acts on it. A great benchmark that no executive reads is a wasted artefact. The DX team explicitly asked for outside-in evidence on developer experience; product teams asked for the integration-friction list only an end-to-end integrator can produce. Both audiences need the same material translated for them.

**Evidence cluster (interim).**

- **8 May 2026 leadership-panel demo**: full agentic-buying chain executed live on stage; panel feedback captured and incorporated into the next two weeks of work.
- **42-page DX benchmark** (`deliverables/week-1-2/02-dx-benchmark/`): Paynow vs Stripe / Paystack / Flutterwave / Pesepay / DPOpay across seven categories, reproducible scoring rubric, executive summary, five+ actionable recommendations.
- **Ecosystem Integration Retrospective**: four-layer evidence model (observed friction → root-cause hypothesis → supporting evidence → recommended action) — written for an audience that includes both engineering leads and non-engineer executives.
- **Senior-engineer integration writeups** for Core, BillPay, TXT: written in the register expected by Paynow's own engineers, not in student tone, intended for adoption into the DX documentation pipeline.
- **Weekly progress reports** in `deliverables/`, structured session logs, the demo HTML slide deck, the 1-minute video script, the peer-presentation script for the NHL Stenden return day.

### 3.4 To Organise — L2, 3 ECTS (compulsory)

**Original learning goal:** *By the end of my placement, I will independently manage my development workflow within Paynow's Agile environment by planning tasks, tracking progress, meeting sprint deadlines, and adjusting priorities based on feedback. This includes breaking work into subtasks; estimating delivery time; using sprint boards; monitoring productivity; and taking ownership of deliverables.*

**Why this competency was appropriate.** I was given a sandbox account, a live merchant account, supervisor contact, and latitude to choose my own stack in week one. With that much autonomy, the placement either runs as a well-organised programme or it slides. Organisation is the load-bearing competency for everything else.

**Evidence cluster (interim).**

- **Plan kept**: every success criterion of the 12 Mar – 23 Apr project plan delivered on or ahead of date (see section 2.4 table).
- **Sprint discipline**: weekly progress reports; per-task todo tracking; deliverable folder structure (`deliverables/week-1-2/`, `deliverables/week-5/`, `deliverables/week-6/`, `deliverables/week-7/`, `deliverables/business/`, `deliverables/internship-return/`).
- **Priority re-sequencing under feedback**: after the 8 May demo, Bisafe moved from week 7 to weeks 8–9 to make room for BillPay + TXT integration; the agentic-commerce workstream was scoped into a single "non-app channels" stream rather than spreading across every deliverable.
- **Ownership of deliverables**: 91-day placement, single intern, no missed planned deliverables to date; live production app with ongoing operational responsibility (uptime, payment reconciliation, RLS regression testing).
- **Realistic estimation under uncertainty**: the Cloudflare-relay incident (~1.5 weeks unplanned) was absorbed without dropping plan items by deferring the BillPay integration to post-plan; this is documented in the relevant session log and supervisor 1:1.

### 3.5 To Research — L2, 6 ECTS (elective)

**Original learning goal:** *By the end of my placement, I will conduct a structured technical investigation into a system improvement opportunity at Paynow, apply professional research methods, and present a data-driven recommendation to senior engineers. This includes identifying a performance or architecture issue; collecting system metrics; prototyping solutions; evaluating results; writing a recommendation report; and presenting findings.*

**Why this competency was appropriate.** The DX team had explicitly asked for outside-in evidence on where Paynow's developer experience stood relative to peers, and Paynow's product teams had explicitly asked for the kind of integration-friction list that only an end-to-end integrator produces. Both asks are research-shaped, not build-shaped: the deliverables are findings + recommendations, not features.

**Evidence cluster (interim).**

- **Issue identified**: the most material developer-experience issue is the Cloudflare bot wall on `www.paynow.co.zw` that blocks server-to-server integration with Paynow Core. This was identified by encountering it in production, then reproduced systematically across IP ranges, request shapes, and user-agent strings.
- **Method**: comparative benchmark against five named peers (Stripe / Paystack / Flutterwave / Pesepay / DPOpay) across seven categories with a reproducible rubric; field research with structured observation notes at a physical livestock auction; integration retrospective using a four-layer evidence model.
- **Metrics collected**: per-provider scores on docs, SDK, sandbox, error messages, onboarding, support, and integration time-to-first-payment (added category beyond plan). For Paynow Core specifically: webhook reliability, time to sandbox payment, time to live payment, undocumented quirks encountered.
- **Solution prototyped**: Cloudflare Worker relay + browser-relay fallback — both deployed in production and documented as the standard workaround.
- **Evaluation**: side-by-side comparison against Paynow's own BillPay subdomain (`billpay.paynow.co.zw`), which does not sit behind the same Cloudflare bot wall and scored 7.5/10 vs Core's 4.2/10. This is the evidence basis for the central recommendation: replicate the BillPay subdomain pattern for Core.
- **Recommendation report**: DX benchmark v2 + Ecosystem Integration Retrospective, delivered to the DX team. Five+ actionable recommendations, including the subdomain-isolation recommendation as recommendation #1.
- **Presentation to senior engineers**: 8 May 2026 leadership-panel demo + ongoing supervisor 1:1s with Sisimayi.

---

## 4. Experiences of Growth and Insights

The most significant growth moment in the first 17 weeks did not happen on a keyboard. It happened at the auction.

I had spent the preceding week building wireframes for a livestock marketplace that, in hindsight, would have failed inside a fortnight of real use. The wireframes assumed that the friction in livestock trading was user-interface friction — too many taps, unclear pricing, slow page loads. At the auction it became immediately obvious that the friction is **counterparty trust** and **payment timing**, and that the user interface is almost incidental. A seller who has been paid in cash for thirty years does not need a slicker checkout; he needs a credible reason to believe the money will arrive before the cattle leave the kraal. Walking back from that visit, I rewrote the architecture document over a weekend. It is the single change that has had the largest downstream effect on the project.

The second growth moment was the Cloudflare relay incident. The symptom — server-to-server calls from Supabase Edge Functions to `www.paynow.co.zw` returning TCP RST — looked initially like a credentials problem, then a CORS problem, then a TLS problem. It was, in fact, a bot-protection layer between my code and the API I was integrating against. The lesson was procedural: I had been debugging at the wrong layer for almost a full day. Since then I have been more disciplined about climbing the stack one layer at a time when something fails, rather than thrashing at the layer I am most familiar with. The relay fix itself (a Cloudflare Worker plus a browser-relay fallback) is now documented as the standard workaround for any modern integrator hitting the same wall.

The third — and most professionally formative — moment was the realisation, somewhere around week 6, that the DX benchmark was not a side-deliverable but the **strategic centre of the entire project**. I had been treating it as documentation. It is, instead, the only artefact in the placement that gives Paynow's leadership a defensible outside-in view of their own developer experience, scored against named peers, against a reproducible rubric, by someone who had just integrated every product end-to-end. Once I saw that, every other piece of work — the retrospective, the writeups, the demo narrative — restructured itself around the benchmark. The mindset shift was from "produce deliverables" to "produce evidence that decisions can be made on."

A smaller but persistent insight has been about working culture. Paynow's flatness and pragmatism were initially disorienting after the structured hand-in cadence of a Dutch HBO programme; there is no equivalent of a weekly tutor sign-off, and decisions are expected to be made by whoever is closest to the problem. After the first three weeks of slight over-checking, I learned to bring proposed decisions to Takudzwa with the option already chosen, the alternatives listed, and the trade-offs named. His response was uniformly faster and more useful in that format than when I asked open questions.

The largest single surprise has been the **internal consistency gap inside Paynow itself**. I had expected the benchmark to surface a Paynow-versus-the-world gap. It surfaced, instead, a Paynow-Core-versus-Paynow-BillPay gap. The architectural fix for Core's lowest-scoring problem already exists, in production, on a sister product's subdomain. The most valuable advice I can leave behind is therefore not a roadmap of new things to build but a pointer to a fix Paynow has already shipped, applied to the product that needs it most.

---

## 5. Reflection on Internship and Progress Assessment (for the internship tutor)

### 5.1 Does the work match the tasks and activities agreed in the internship plan?

Yes — and it has expanded beyond them in directions that were explicitly invited by the company supervisor and the leadership panel. Section 2.6 sets out the original-plan items (all delivered) and the added items (all approved progressively in supervisor 1:1s with Takudzwa Sisimayi). The expansion has not displaced any original-plan deliverable.

### 5.2 Are the activities appropriate for my internship goals?

Yes. The five HBO-i competencies in the agreement — *To Create*, *To Learn*, *To Communicate*, *To Organise*, *To Research* — each have a substantive evidence cluster at interim (see section 3). The competency I judge most at risk of under-delivery is *To Communicate*: the raw artefacts exist, but the final synthesis into a single advisory document for Paynow leadership is the most important piece of remaining work and is incomplete. This is the principal focus of my remaining ~3 weeks.

### 5.3 Have I acquired sufficient skills during my training to carry out my tasks?

Largely yes. The HBO-i CMD programme prepared me well for the **Create** and **Communicate** competencies. The **Research** competency was supported by my prior coursework in user research but stretched by the requirement to apply it to a developer-experience benchmark with a reproducible rubric — a genre of research I had not previously practised. The **Organise** competency was the most demanding adjustment: managing a 91-day placement as a sole developer in a foreign country is a different organisational problem from a group assignment with weekly tutor sign-off. The **Learn** competency was supported by my prior reflective-practice training but the cadence (bi-weekly with Sisimayi, less frequent with Bos given remote distance) required adaptation.

### 5.4 Is the supervision from the company sufficient?

Yes. Takudzwa Sisimayi's posture has been "give the intern access and let them surface things insiders cannot," which is exactly the posture the placement requires. Feedback has been timely and direct, and he has consistently chosen to challenge my conclusions rather than accept them — which is the more useful behaviour for the work I am doing. Bi-weekly 1:1s have been the right cadence given the level of autonomy I have on day-to-day decisions.

### 5.5 Is the supervision from the training programme sufficient?

Yes. John Bos has provided structured check-ins and a consistent reading of my work against the HBO-i / CMD competence framework, which has been particularly valuable when the project's scope started to drift after the 8 May demo. The remote nature of the supervision (Leeuwarden ↔ Harare) has worked because the cadence is predictable and because the first visit was conducted on 13 February, before the project plan was finalised.

### 5.6 Bottlenecks or problems during this internship period

Three are worth naming explicitly.

**Bottleneck 1 — the Cloudflare relay problem.** A roughly 1.5-week unplanned absorption of engineering time. Symptom: server-to-server calls from Supabase Edge to `www.paynow.co.zw` returning TCP RST. Root cause: Cloudflare bot-protection layer between Paynow's edge and the integration API. Resolved through a Cloudflare Worker relay and a browser-relay fallback, then written up as documentation for future integrators. The bottleneck is now an asset — it is the most concrete recommendation in the retrospective.

**Bottleneck 2 — webhook hash-ordering bug.** Paynow's webhook callback hashes fields in *received* order, not insertion order. This is undocumented. It caused three intermittent production webhook rejections before being identified. Resolved by sorting and reconstructing the hash on the received-order basis. Filed as a documentation gap in the integration writeup for Core.

**Bottleneck 3 — scope drift after the leadership demo.** The 8 May panel produced strong feedback that expanded the project's scope into BillPay, Bisafe escrow, Paab cash, agentic commerce, WhatsApp, and USSD flows. Productive feedback, but a scope-management risk. Managed by formally moving Bisafe from week 7 to weeks 8–9 and bounding the agentic work into a single "non-app channels" workstream rather than letting it spread across every deliverable. Net effect: scope expanded without plan items being dropped.

All three were resolved within the placement period.

### 5.7 Do I agree with the assessment my supervisor has given me?

[FILL — after appraisal on FILL-date.] My expectation, based on bi-weekly conversations with Takudzwa, is that the assessment will be broadly positive on technical delivery (*To Create*, *To Organise*) and research output (*To Research*), with constructive pressure on the synthesis-and-advisory dimension (*To Communicate*) that I have flagged in section 2.5 as my priority for the remaining weeks. I agree with that direction of feedback in advance: it is where I am weakest, and where the remaining work has the highest leverage.

### 5.8 Goals for the remainder of the internship

1. Ship Bisafe escrow integration on ZimLivestock and document the integration in the senior-engineer register.
2. Deliver the final ecosystem report as a single coherent advisory document — not a stitched compilation of weekly artefacts — usable by Paynow leadership without my presence in the room.
3. Close the agentic-commerce workstream (WhatsApp bot + USSD simulator) as a demonstrated, evidenced thesis, not a demo trick.
4. Leave behind documentation that the next external integrator could use to onboard against the full Paynow ecosystem in under a week — currently it would take them three.
5. Convert the final ecosystem report and DX benchmark v2 into a written advisory brief deliverable separately from the source artefacts, suitable for non-engineer executives.

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
