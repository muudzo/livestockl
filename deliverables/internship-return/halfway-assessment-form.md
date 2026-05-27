# Halfway Assessment Form

*To be completed by the company supervisor during the mid-placement discussion with the student.*

Dept. of Communication & Multimedia Design
NHL Stenden University of Applied Sciences
Rengerslaan 10, 8917 DD Leeuwarden
stagecmd@nhlstenden.com

---

## Purpose

The Work Placement Progress Form provides feedback from the company supervisor to the placement student. It is diagnostic: what is the student's current situation, and what remains to be done in order to complete the placement satisfactorily?

The discussion is based on:

- The student's placement plan and the tasks and competencies mentioned therein.
- The student's interim placement report (`interim-internship-report.md`).
- The tasks the student has carried out.
- How the student functions.
- Any half- or end-products delivered by the student.

End results of the discussion:

- This work-placement progress form, completed and signed.
- A modified placement plan, if necessary.

---

## Placement Details

| | |
|---|---|
| **Student name** | Tatenda Nyemudzo |
| **Student email** | tatenda.nyemudzo@student.nhlstenden.com |
| **Student telephone** | +263 71 964 6741 |
| **Company name** | Paynow (Webdev Group / Softwarehouse) |
| **Address and place** | 27 Argyll Road, Newlands, Harare, Zimbabwe |
| **Company telephone** | [FILL — company telephone] |
| **Company supervisor** | Takudzwa Sisimayi (takudzwa@paynow.co.zw) |
| **Placement coach** | John Bos (john.bos@nhlstenden.com, +263 78 149 7764) |
| **Period** | 2 February 2026 – 8 June 2026 (91 days) |
| **Date appraisal** | [FILL — date of appraisal] |

---

## Initials (signatures on completion)

| Student | Placement company | Placement coach |
|---|---|---|
| [FILL initials] | [FILL initials] | [FILL initials] |

---

## Part 1 — General Appraisal

### Q1. What learning- and work experience, in your view, has the student gained during the first half of the placement?

[FILL — supervisor's narrative.]

*Reference points for supervisor:*

- Integrated the full Paynow ecosystem (Core Web + Express Checkout, BillPay biller-inbound, TXT) end-to-end inside a single production application — work that had not previously been done by any Paynow employee inside one application.
- Shipped a production marketplace (`app-nine-sigma-jgoqp90f2p.vercel.app`) with row-level security tested 11/11 PASS, atomic RPCs, idempotent payment write paths, and a Cloudflare Worker relay deployed as production infrastructure.
- Produced a 42-page DX benchmark comparing Paynow against five named competitors across seven categories with a reproducible rubric, and an Ecosystem Integration Retrospective using a four-layer evidence model.
- Demonstrated the agentic-buying chain live to a Paynow leadership panel on 8 May 2026; absorbed and incorporated panel feedback into the subsequent two weeks of work.
- Identified the Cloudflare bot-wall issue on `www.paynow.co.zw` as the root cause of the most material developer-experience gap, and documented the BillPay subdomain pattern as the in-house architectural fix.
- Adjusted academic Dutch CMD design defaults (mobile-first, smartphone-only, 4G assumptions) to Zimbabwean infrastructural realities (USSD-first, feature-phone parity, intermittent connectivity, US$ currency).

### Q2. What is your opinion on the student's efforts and attitude towards work?

**Sufficient / Insufficient:** [FILL]

**Comments:** [FILL]

*Reference points for supervisor:*

- 91-day placement, single intern, no missed planned deliverables.
- Self-organising work cadence: weekly progress reports, structured session logs, decision rationale persisted across sessions.
- Brought decisions to supervisor 1:1s with the option already chosen, alternatives listed, and trade-offs named — adapted to flat decision-making culture after the first three weeks.
- Took ownership of the Cloudflare relay incident (1.5-week unplanned absorption) rather than escalating; resolved + documented.

### Q3. Has your company benefited from the student's tasks?

**Yes / No:** [FILL]

**Comments:** [FILL]

*Reference points for supervisor:*

- DX benchmark v2 and Ecosystem Integration Retrospective are usable artefacts for the DX team's roadmap planning.
- Senior-engineer integration writeups for Core, BillPay, and TXT have been drafted in the register expected by Paynow's engineers and are intended for adoption into the documentation pipeline.
- The Cloudflare relay fix is a documented production workaround other Paynow integrators can use today.
- Identified the (undocumented) webhook hash-ordering quirk on Paynow callbacks — filed as a documentation gap.
- Demonstrated agentic-commerce / WhatsApp / USSD use cases internally as a thesis for non-app payment channels.

### Q4. Have any problems occurred during placement so far (supervision, functioning, planning, etc.)?

**Yes / No:** [FILL]

**Comments:** [FILL]

*Reference points for supervisor (self-reported by student in interim report §5.6):*

- Cloudflare relay incident (1.5 weeks unplanned absorption) — resolved via Cloudflare Worker + browser-relay fallback; documented as production-standard workaround.
- Webhook hash-ordering bug (undocumented Paynow behaviour) — resolved by sorting fields on received order; filed as documentation gap.
- Scope drift after the 8 May 2026 leadership demo — managed by re-sequencing Bisafe from week 7 to weeks 8–9 and bounding the agentic-commerce workstream into a single deliverable; no original-plan items dropped.

---

## Part 2 — Evaluation of Competencies

Evaluation uses three levels:

- **G** — Good.
- **M** — Mediocre.
- **U** — Unsatisfactory.

Activities and level as contained in the student's placement plan serve as the basis for evaluation. Under "Comments," note the student's strengths/weaknesses and necessary points of improvement.

---

### To Create — L2, Compulsory 6 ECTS + Choice 6 ECTS = 12 ECTS total

**Original learning goal:** Ship at least one full-stack application at Paynow that interfaces with core platform infrastructure, deployed to production, handling real user traffic. Includes building end-to-end features, RESTful/event-driven integrations, merchant-facing or internal dashboards, automated tests + CI/CD, and secure coding practices appropriate to fintech.

**Evaluation:** **G / M / U:** [FILL]

**Activities completed (reference for supervisor):**

- ZimLivestock live in production, integrated end-to-end with Paynow Core (Web + Express Checkout / mobile money), BillPay biller-inbound, and TXT bulk-SMS.
- Event-driven integration: Paynow webhooks → Supabase Edge Function → row-level-secured Postgres → realtime fan-out.
- Internal/merchant tooling: admin auction-control dashboard, bid-history views, payment-status reconciliation, seller wizard, buyer browse + bid, WhatsApp bot listing flow, USSD simulator.
- CI/CD: Vercel preview deployments per push, Supabase migrations versioned via CLI, security-agent edge function gating RLS regressions, payment test matrix against Paynow sandbox phone numbers.
- Secure fintech coding: RLS on every table, idempotency keys on `bids` and `payments`, SHA-512 webhook hash verification, CORS wildcard fallback removed (SEV-1 fix), no stack traces leaked on public endpoints, secrets in Supabase Vault.
- Atomic RPCs (`place_bid`, `end_expired_auctions`) — single-statement transactions, not check-then-act.

**Comments:** [FILL]

---

### To Learn — L2, Compulsory 3 ECTS (maximum permitted)

**Original learning goal:** Operate effectively in a professional fintech development environment by mastering Paynow's tech stack and adapting academic development methods to enterprise-level constraints through regular reflection and feedback cycles. Includes learning internal frameworks/tooling, participating in Agile sprints, bi-weekly reflection sessions, adjusting designs to regulatory/business realities.

**Evaluation:** **G / M / U:** [FILL]

**Activities completed (reference for supervisor):**

- Paynow tech stack absorbed: SHA-512 hashing, Express Checkout USSD push semantics, webhook callback signing, idempotency-key patterns, biller-inbound vendor flow, TXT sender-ID branding, undocumented hash-ordering quirk.
- Agile participation: weekly product standups across Core / BillPay / TXT, ad-hoc Slack decision cycles, bi-weekly supervisor 1:1s with Sisimayi, tutor check-ins with Bos.
- Reflection cadence: session-log discipline at the end of every working session, weekly progress reports in `deliverables/`, decision rationale persisted in auto-memory across sessions.
- Design adjustments to regulatory/business realities: switched to browser-relay + Cloudflare Worker after discovering bot-wall enforcement; consolidated to Supabase after Go-backend complexity grew faster than expected; chose Paynow Core + BillPay multi-product approach over single-rail integration after recognising cash-economy market reality.

**Comments:** [FILL]

---

### To Communicate — L2, Compulsory 3 ECTS + Choice 3 ECTS = 6 ECTS total

**Original learning goal:** Communicate technical work clearly to both technical and non-technical stakeholders by producing professional documentation, presenting sprint updates, and explaining system trade-offs in business-relevant terms. Includes API/feature documentation, sprint ceremony updates, translating technical complexity, documenting design decisions.

**Evaluation:** **G / M / U:** [FILL]

**Activities completed (reference for supervisor):**

- 8 May 2026 leadership-panel demo: full agentic-buying chain executed live; panel feedback captured and incorporated.
- 42-page DX benchmark with reproducible scoring rubric, executive summary, and 5+ actionable recommendations.
- Ecosystem Integration Retrospective using a four-layer evidence model (friction → hypothesis → evidence → action) — written for mixed technical/non-technical audience.
- Senior-engineer integration writeups for Core, BillPay, TXT — in the register expected by Paynow engineers, not student tone — intended for the DX documentation pipeline.
- Weekly progress reports, session logs, demo HTML slide deck, 1-minute video script, peer-presentation script for NHL Stenden return day.

**Self-flagged growth area:** Final synthesis into a single advisory document for Paynow leadership is incomplete at interim; principal focus of remaining ~3 weeks. (See interim report §2.5 and §5.2.)

**Comments:** [FILL]

---

### To Organise — L2, Compulsory 3 ECTS

**Original learning goal:** Independently manage development workflow within Paynow's Agile environment by planning tasks, tracking progress, meeting sprint deadlines, and adjusting priorities based on feedback. Includes breaking work into subtasks, estimating delivery time, using sprint boards, monitoring productivity, taking ownership of deliverables.

**Evaluation:** **G / M / U:** [FILL]

**Activities completed (reference for supervisor):**

- Every success criterion of the 12 Mar – 23 Apr ZimLivestock project plan delivered on or ahead of date (see interim report §2.4 table).
- Sprint discipline: weekly progress reports, per-task todo tracking, deliverable folder structure (`deliverables/week-1-2/`, `deliverables/week-5/`, `deliverables/week-6/`, `deliverables/week-7/`, `deliverables/business/`, `deliverables/internship-return/`).
- Priority re-sequencing under feedback: after 8 May demo, Bisafe moved from week 7 to weeks 8–9 to make room for BillPay + TXT integration; agentic-commerce work scoped into a single non-app channels workstream.
- Ownership: 91-day placement, sole developer, no missed planned deliverables; live production app with ongoing operational responsibility (uptime, payment reconciliation, RLS regression testing).
- Realistic estimation under uncertainty: Cloudflare-relay incident (~1.5 weeks unplanned) absorbed without dropping plan items.

**Comments:** [FILL]

---

### To Research — L2, Not compulsory, Choice 6 ECTS

**Original learning goal:** Conduct a structured technical investigation into a system improvement opportunity at Paynow, apply professional research methods, and present a data-driven recommendation to senior engineers. Includes identifying an issue, collecting metrics, prototyping solutions, evaluating results, writing a recommendation report, presenting findings.

**Evaluation:** **G / M / U:** [FILL]

**Activities completed (reference for supervisor):**

- **Issue identified:** Cloudflare bot wall on `www.paynow.co.zw` blocking server-to-server integration with Paynow Core. Reproduced systematically across IP ranges, request shapes, and user-agent strings.
- **Method:** comparative benchmark against five named peers (Stripe / Paystack / Flutterwave / Pesepay / DPOpay) across seven categories with reproducible rubric; field research with structured observation at livestock auction; integration retrospective using four-layer evidence model.
- **Metrics collected:** per-provider scores on docs, SDK, sandbox, error messages, onboarding, support, time-to-first-payment. Paynow Core specifically: webhook reliability, time to sandbox payment, time to live payment, undocumented quirks encountered.
- **Solution prototyped:** Cloudflare Worker relay + browser-relay fallback — both deployed in production and documented as standard workaround.
- **Evaluation:** side-by-side with Paynow's BillPay subdomain (`billpay.paynow.co.zw`), which does not sit behind the same Cloudflare bot wall and scored 7.5/10 vs Core's 4.2/10. Evidence basis for the central recommendation.
- **Recommendation report:** DX benchmark v2 + Ecosystem Integration Retrospective, delivered to DX team. 5+ actionable recommendations, subdomain isolation as recommendation #1.
- **Presentation:** 8 May 2026 leadership-panel demo + ongoing supervisor 1:1s.

**Comments:** [FILL]

---

## Modified Placement Plan (if necessary)

Modifications to the original placement plan agreed in the halfway discussion:

- [FILL — modifications, if any.]

Original-plan scope additions already approved progressively in supervisor 1:1s (for reference, not re-decision):

- BillPay biller-inbound integration (8 May panel ask).
- TXT notifications integration.
- Bisafe escrow design + integration (in flight).
- Paab cash-collection design.
- DX benchmark scope: 3 providers / 5 categories → 6 providers / 7 categories.
- WhatsApp bot + USSD simulator (agentic-commerce workstream).
- Cloudflare Worker relay + browser-relay fallback.
- Senior-engineer integration writeups for the Paynow docs team.
- Ecosystem Integration Retrospective (4-layer evidence model).
- Reframed final deliverable: from "ZimLivestock launch" to "ZimLivestock as evidence vehicle for an ecosystem integration thesis."

---

## Signatures

| Date | Student signature | Company supervisor signature | Placement coach signature |
|---|---|---|---|
| [FILL date] | [FILL — Tatenda Nyemudzo] | [FILL — Takudzwa Sisimayi] | [FILL — John Bos] |

---

*After completion, the student sends this form together with the interim placement report and (if necessary) the modified placement plan to the CMD department's secretarial office (stagecmd@nhlstenden.com). The placement coach signs and sends a copy to the student. The original is stored in the student's file.*
