# Final Internship Report

**Building Africa's first agentic livestock marketplace on Paynow's ecosystem**

| | |
|---|---|
| **Intern** | Tatenda Nyemudzo |
| **Study** | Communication & Multimedia Design — NHL Stenden University of Applied Sciences |
| **Internship company** | Paynow Zimbabwe (Webdev / Softwarehouse) |
| **Internship period** | 12 March 2026 – 11 May 2026 (~9 weeks, ongoing) |
| **Internship supervisor** | [FILL — Paynow supervisor name + role] |
| **Internship tutor (NHL Stenden)** | [FILL — tutor name] |
| **Submitted** | [FILL — submission date] |

---

## Executive summary

I spent my internship at Paynow Zimbabwe — the country's largest payment processor — building **ZimLivestock**, a livestock-trading marketplace, on top of Paynow's payment ecosystem. The project had two intertwined goals: (1) ship a credible consumer product that solves a real problem for Zimbabwean cattle farmers, and (2) generate honest, first-attempt evidence about Paynow's developer experience by integrating *every* product in their catalog — Core, BillPay, TXT — under the same constraints a new third-party developer would face.

By the end of the internship I had:

- Shipped a production-grade React + Supabase marketplace with auctions, agentic buying, real Paynow Express USSD payments, SMS notifications, and a PWA offline shell — built in three iterative phases over ~9 weeks.
- Authored a **42-page DX benchmark** comparing Paynow against Stripe, Paystack, Flutterwave, Pesepay and DPOpay across seven categories — the first such external benchmark Paynow had ever received.
- Written an **Ecosystem Integration Retrospective** documenting a measurable internal-consistency gap (Core scores 4.2/10 on DX vs. BillPay/TXT at 7–8/10) backed by four independent evidence layers, including a working production workaround that quantifies the cost.
- Designed and coded a **BillPay biller-inbound API** so ZimLivestock can register as a biller in Paynow's catalog — turning the internship project from a *consumer* of the Paynow ecosystem into a *participant* in it.

This report walks through the project chronologically, maps each phase to the HBO-i CMD competences, and reflects on what I learned about designing for a market where the constraints — feature phones, intermittent connectivity, mobile-money-first commerce, government bot walls — are nothing like the ones I was trained for in Leeuwarden.

---

## 1. Organisational analysis — Paynow

### What Paynow is

Paynow (legal name **Webdev Group / Softwarehouse**) is Zimbabwe's largest payment-processing platform. Founded in 2009 as the country was emerging from a hyperinflation crisis, the company built itself around the fact that USD cash and SMS-based mobile money (EcoCash, OneMoney) were the only payment rails most Zimbabweans had access to. Today Paynow processes the majority of card-not-present payments in the country and operates an ecosystem of related products:

| Product | What it does | Where I touched it |
|---|---|---|
| **Paynow Core** | Web Checkout + Express USSD payments via EcoCash, OneMoney, Telecash, Zimswitch | Built ZimLivestock's payment flow on this. |
| **BillPay** | Vendor API to pay any of 106+ Zimbabwean billers (ZESA, ZWSC, schools, councils, medical aid) | Integrated as a *consumer* (paying bills out of platform earnings). Designing now to register as a *biller* ourselves. |
| **TXT (txt.co.zw)** | Bulk SMS API with sender-ID branding | Wired in for auction-won / auction-sold notifications. |
| **Bisafe** | Escrow product — funds held until delivery confirmation | Identified as a v2 requirement after panel feedback. |
| **Paab** | Cash-collection agent network — accept physical cash at teller points | Identified as a v2 requirement for accessibility. |

### Where I sat in the company

I reported into the **developer-experience team** rather than a single product team. This was a deliberate scoping choice by my supervisor: rather than place me inside one team where I would build for one product, the team wanted me to *cross all of them* — because no employee inside Paynow had ever integrated every Paynow product end-to-end in a single application. That meant my work would both *use* the ecosystem and *expose its seams* in a way internal developers couldn't.

In practical terms I had a direct line to engineering leads on every product, a sandbox merchant account (Integration ID 23657 live, 23997 test) and access to internal Slack channels for each product team. I worked from a hot-desk in the Harare office two days a week and remotely the rest, with weekly syncs.

### Mission and culture

Paynow's stated mission is "to make digital payments accessible to every Zimbabwean." What I observed on the ground is more specific: the company sees itself as **payment infrastructure for an economy that the global card networks have largely written off** — a country where Visa/Mastercard work erratically, where bank branches are scarce outside major cities, and where the dominant transaction is a US$2 grocery purchase paid by EcoCash USSD. Decisions inside Paynow are made through that lens: features that look quaint compared to Stripe (form-encoded POSTs, SHA-512 hashes, USSD push prompts) are exactly the features Zimbabwean users actually need.

This was important context for me as an intern, because my first instinct on day one was to "modernise" things. I learned quickly that what looks like technical debt from a Western-startup vantage point is often a deliberate accommodation of the operating environment — and that the *real* DX problems were not the legacy patterns themselves but the *internal inconsistencies* between Paynow's newer products (BillPay, TXT) and its flagship Core.

---

## 2. My internship at a glance

### Brief

The brief I received on day one was deliberately open-ended:

> *"Build a real-world product on top of the Paynow ecosystem. Treat yourself as a third-party developer. Document everything that gets in your way."*

My supervisor and I jointly scoped this into three concrete success criteria:

1. **Ship a credible consumer product** — not a demo, not a prototype. Real users, real money, real Paynow integration.
2. **Produce a DX benchmark** — Paynow vs. ≥3 competitors across ≥5 categories, with first-attempt empirical evidence.
3. **Generate at least one architectural recommendation Paynow could action.**

### What I actually built

The product I chose was **ZimLivestock** — an online marketplace for cattle, goats, sheep and pigs. The choice was deliberate: livestock trading in Zimbabwe today happens on WhatsApp group chats and physical auction floors, both of which have well-known trust, settlement, and price-discovery problems. A marketplace solves real pain, but the buyers and sellers are *exactly* the demographic Paynow's mobile-money-first products were built for. Building this product would stress-test the entire Paynow stack.

The build went through three phases:

| Phase | Weeks | Focus | Outcome |
|---|---|---|---|
| **1 — Foundation** | 1–2 | Field research, DX benchmark, wireframes | 42-page DX benchmark; 1 of 2 physical auction visits; system architecture diagrams |
| **2 — Build** | 3–5 | ZimLivestock MVP | Live React PWA + Supabase backend; Paynow Core integration; deployed to Vercel |
| **3 — Ecosystem** | 6–9 | BillPay + TXT + retrospective + demo | Ecosystem retrospective; live demo to Paynow leadership; BillPay biller-inbound API |

### Tasks and responsibilities

My day-to-day responsibilities split roughly as follows:

- **Product design** (~25%) — UX flows, wireframes, the PWA shell, mobile-first layouts, the agentic-buying interface.
- **Engineering** (~50%) — React/TypeScript front end, Supabase Postgres + Edge Functions, payment integrations, Cloudflare Worker relays.
- **Research & writing** (~15%) — DX benchmark, ecosystem retrospective, integration writeups for Paynow Core / BillPay / TXT.
- **Stakeholder communication** (~10%) — weekly demos, three formal presentations to Paynow leadership, field interviews with cattle farmers and auction operators.

The split shifted heavily toward stakeholder communication in the final two weeks as the product moved into demo cycles. I delivered the final demo to a Paynow leadership panel on 8 May 2026, where the feedback became the input for the BillPay biller-inbound design that closed out the internship.

---

## 3. Phase 1 — Research foundation (weeks 1–2)

### Field research at a physical auction

In week 1 I visited a working cattle auction floor in Harare. This was the single most useful day of the internship. Sitting in a tin-roofed shed watching farmers haggle in Shona over a Brahman bull, I learned in two hours what no amount of online research had given me: the **fees, the dispute mechanics, the trust hierarchies, the practical barriers to entry** that any digital alternative would have to mirror or replace. Eight findings from that visit ended up shaping the platform's commission structure, reserve-price logic, and seller-onboarding flow.

> *Deliverable: [`deliverables/week-1-2/01-field-research/auction-field-visit.md`](../week-1-2/01-field-research/auction-field-visit.md)*

### DX benchmark

The benchmark compared Paynow against **Stripe, Paystack, Flutterwave, Pesepay** and **DPOpay** across seven categories: documentation, time-to-first-200, error messages, idempotency support, observability, sandbox quality, and developer-forum responsiveness. Methodology was deliberately *lazy*: one integration attempt per provider, using only the publicly documented path, with real production credentials — so the findings approximate what a new developer experiences on their first try.

The headline finding: **Paynow Core scored 4.2/10 on DX**, the lowest of the cohort, primarily because of three independently-confirmed pain points: (a) the production endpoint sits behind a Cloudflare bot wall that returns TCP RST to server-to-server calls from cloud providers, (b) error responses are HTML pages instead of structured JSON, and (c) the sandbox doesn't isolate from production credentials. Crucially, *Paynow's own sibling products* — BillPay and TXT — scored 7.5/10 and 7/10 respectively, using patterns Paynow had already proven internally. The DX gap was therefore an **internal-consistency gap**, not a capability gap.

> *Deliverables: [`deliverables/week-1-2/02-dx-benchmark/`](../week-1-2/02-dx-benchmark/) — full report, scoring rubric, raw notes.*

### Wireframes and architecture

By the end of week 2 I had wireframes for every customer-facing screen and a system-architecture diagram showing how the React PWA, Supabase backend, Paynow Core, BillPay, and TXT would interact. These artefacts changed substantially during the build but the *shape* — mobile-first, PWA, single-page React, Supabase as the database-of-record, Paynow on the payment edge — held all the way through.

> *Deliverable: [`deliverables/week-1-2/03-wireframes-architecture/`](../week-1-2/03-wireframes-architecture/)*

---

## 4. Phase 2 — Building ZimLivestock (weeks 3–5)

### The product

ZimLivestock is a livestock marketplace where sellers list cattle, goats, sheep, and pigs, and buyers either purchase outright or bid in time-boxed auctions. The MVP shipped with:

- Phone-number + OTP authentication via Supabase Auth (no email, no passwords — important in a country where most users don't have email).
- Image-uploaded listings, free-text descriptions, breed/weight/age/location metadata.
- Real-time bidding with optimistic UI and a server-side `place_bid` RPC that enforces atomicity under high concurrency via Postgres advisory locks.
- Paynow Core Express Checkout — USSD prompts pushed to the buyer's phone the moment they win.
- An auto-updating PWA that installs to the home screen and degrades gracefully on poor connections.

### Notable engineering decisions

Three decisions during this phase ended up being load-bearing for the rest of the internship:

1. **Atomic RPCs over check-then-act.** Bid placement and auction settlement both run inside Postgres functions (`place_bid`, `end_expired_auctions`) using `FOR UPDATE SKIP LOCKED` and advisory locks. This avoids the classic two-bidders-tied race and makes the system safe under cron retries. Designing these atomically up front cost an extra two days but saved an estimated two weeks of post-launch firefighting.

2. **Dual-mode Supabase + mock data fallback.** Every data hook in the codebase checks `isSupabaseConfigured`; if Supabase credentials are missing it falls back to mock data. This let the project ship a public Vercel preview that anyone could click without us having to babysit a sandbox.

3. **Browser-relay pattern for Paynow.** The Cloudflare bot wall blocking Supabase Edge Functions from reaching `www.paynow.co.zw` forced a creative workaround: a thin **Cloudflare Worker** that accepts our form-encoded POST and forwards it to Paynow. This pattern (later mirrored for the TXT IP-allowlist constraint with a Cloudflare Quick Tunnel from a static-IP Mac mini) became the central piece of evidence in the Ecosystem Retrospective.

### Final products from this phase

- The live application — [https://app-nine-sigma-jgoqp90f2p.vercel.app](https://app-nine-sigma-jgoqp90f2p.vercel.app)
- The codebase — `~/Downloads/app/` (React + TypeScript + Vite + Tailwind + shadcn/ui on the front, Supabase + Deno Edge Functions on the back).
- Week-5 deliverables: [`deliverables/week-5/`](../week-5/) — 16 documents covering the build, including chaos tests, payment red-team report, deployment go/no-go checklist, and a 100-user simulated stress test.

---

## 5. Phase 3 — Ecosystem integration & retrospective (weeks 6–9)

### Wiring the rest of the Paynow ecosystem

With Core stable, weeks 6–8 added BillPay (paying bills out of platform earnings) and TXT (SMS for auction-won / auction-sold events). Each integration produced both a working feature and a senior-engineer integration writeup intended for Paynow's own documentation team to use:

- **BillPay integration** — [`deliverables/week-6/billpay-supabase-integration.md`](../week-6/billpay-supabase-integration.md). Cleanest of the three integrations; Basic Auth, JSON I/O, ~30 minutes to first 200.
- **TXT (SMS) integration** — [`deliverables/week-6/txt-supabase-integration.md`](../week-6/txt-supabase-integration.md). Blocked by an IP-allowlist requirement that Supabase Edge can't satisfy; solved with a Cloudflare Quick Tunnel from a static-IP machine, documented as a relay pattern.
- **Paynow Core integration writeup** — [`deliverables/week-6/paynow-supabase-integration.md`](../week-6/paynow-supabase-integration.md). The senior-engineer reference doc, including Mermaid sequence diagrams for Web Checkout and Express Checkout, the bot-wall explanation, and a §12 "Shortcomings & Areas of Improvement" with 16 ranked recommendations (10 for Paynow, 6 for ZimLivestock).

### Ecosystem Integration Retrospective

The retrospective compares Paynow Core's DX against BillPay and TXT side-by-side, using four independent evidence layers:

1. **First-attempt integration testing** — time-to-first-200 per product.
2. **DX comparison table** — eight criteria across all three Paynow products.
3. **Forum evidence** — three independent reports of the same Core blocker over seven months on Paynow's own developer forum.
4. **Working production workaround** — the Cloudflare Worker relay, which quantifies the cost: TCP RST → 200 OK in 400–800ms of added latency.

The recommendation set (now grouped into three strategic themes — *Cloud Reachability / Gateway Design*, *API Surface Standardization*, *Developer Testing Experience*) totals approximately **4 weeks of internal Paynow engineering work** and would lift Core's DX score from 4.2/10 to an estimated 7–8/10. The architectural keystone is moving Core onto `api.paynow.co.zw` without the bot wall, mirroring the existing `billpay.paynow.co.zw` pattern.

> *Deliverable: [`deliverables/week-5/ecosystem-integration-retrospective.md`](../week-5/ecosystem-integration-retrospective.md)*

### Final demo

The 8 May 2026 demo to Paynow leadership ran three live agents pre-bidding on staggered auctions (07:34, 07:37, 07:40 originally; postponed to 08:00 → fired at 08:04, 08:07, 08:10). Each agent win triggered: (a) an SMS to the buyer's phone via TXT, (b) an SMS to the seller's phone via TXT, and (c) a Paynow Express USSD push to the buyer's phone for the won amount — all chained through the live `end-auctions` Supabase Edge Function and the Cloudflare relay. The full chain worked end-to-end on stage: the panel saw a real US$0.02 USSD prompt arrive on the demonstrator's phone moments after the auction settled.

---

## 6. Phase 4 — Beyond the brief (week 9–10)

### Panel feedback and the BillPay biller API

The demo panel returned six strategic asks, which I captured into a project memory file the same morning:

1. Take cash payments via **Paab**.
2. Register the platform as a **BillPay biller** so anyone can pay via USSD menus without the app.
3. Codify physical-floor auction mechanics into platform logic.
4. Replace seller bank details with **Paynow merchant IDs**.
5. Integrate **Bisafe** for escrow settlement.
6. Build a **WhatsApp bot** for accessibility.

Within the same day I designed and built the second of these — the **BillPay biller-inbound API**. ZimLivestock now has a Supabase Edge Function (`billpay-biller-inbound`) exposing the three endpoints Paynow's biller-onboarding template requires: `member` (lookup), `pay` (settle, idempotent on `paynowReference`), and `status` (poll). The function is protected by HTTP Basic Auth + an IP allowlist, every inbound call is logged to a `billpay_inbound_log` audit table, and the entire contract is documented in a 200-line API spec ready to ship to Paynow's engineers.

> *Deliverables: [`deliverables/week-7/billpay-biller-template.md`](../week-7/billpay-biller-template.md) (Paynow's onboarding template, filled), [`deliverables/week-7/billpay-biller-api-spec.md`](../week-7/billpay-biller-api-spec.md) (the API spec).*

This effectively **flipped the project's relationship with Paynow**: from being a consumer of the ecosystem to being a participant in it. ZimLivestock can now appear alongside ZESA and CIMAS in the BillPay menu, accessible to every Zimbabwean with a Paynow account and a feature phone.

---

## 7. Final products

A consolidated list of everything I produced during the internship. Each is linked to its source artefact in this repository.

### Live product
- **ZimLivestock** — production deployment at [app-nine-sigma-jgoqp90f2p.vercel.app](https://app-nine-sigma-jgoqp90f2p.vercel.app)
- Supabase project `hmeieslclzycyjjjflfh` (Postgres + Edge Functions + Auth + Storage)
- Cloudflare Worker relay `paynow-relay.zimlivestock.workers.dev`
- Codebase: this repository (`Downloads/app/`)

### Research & analysis
- **DX benchmark** (42 pages, 5 providers, 7 categories) — [`deliverables/week-1-2/02-dx-benchmark/`](../week-1-2/02-dx-benchmark/)
- **Field research at physical auction** — [`deliverables/week-1-2/01-field-research/`](../week-1-2/01-field-research/)
- **Ecosystem Integration Retrospective** — [`deliverables/week-5/ecosystem-integration-retrospective.md`](../week-5/ecosystem-integration-retrospective.md)
- **Payment red-team report** — [`deliverables/week-5/payment-redteam-2026-04-14.md`](../week-5/payment-redteam-2026-04-14.md)

### Integration writeups (Paynow-facing)
- **Paynow Core** — [`deliverables/week-6/paynow-supabase-integration.md`](../week-6/paynow-supabase-integration.md)
- **BillPay vendor** — [`deliverables/week-6/billpay-supabase-integration.md`](../week-6/billpay-supabase-integration.md)
- **TXT SMS** — [`deliverables/week-6/txt-supabase-integration.md`](../week-6/txt-supabase-integration.md)
- **BillPay biller (inbound)** — [`deliverables/week-7/billpay-biller-api-spec.md`](../week-7/billpay-biller-api-spec.md)

### Communication & demo
- **Final demo script** — [`deliverables/week-6/final-demo-script.md`](../week-6/final-demo-script.md)
- **Demo runbook** — [`deliverables/week-6/demo-runbook.md`](../week-6/demo-runbook.md)
- **Presentation deck** — [`deliverables/week-6/presentation-deck.md`](../week-6/presentation-deck.md)
- **Stakeholder feedback form** — [`deliverables/week-5/stakeholder-feedback-form.md`](../week-5/stakeholder-feedback-form.md)

### Visuals (referenced in appendix)
- System architecture diagram — `[FILL — path to image or screenshot]`
- Wireframes — `[FILL — path]`
- Demo screenshots / video — `[FILL — path]`

---

## 8. CMD competences — mapping

The HBO-i Domain Description for Communication & Multimedia Design defines competences along two axes — **architectural layer** (User interaction / Organisational processes / Infrastructure / Software / Hardware) and **activity** (Analysis / Advisory / Design / Realisation / Manage & control). Mastery levels run 1–4.

The table below maps the most significant work products of this internship to the HBO-i competence framework. Final mastery levels per competence should be confirmed with the internship supervisor at the final assessment.

| Activity × Layer | Internship work product | Proposed level |
|---|---|---|
| **Analysis — User interaction** | Field research at physical auction; user interviews with farmers; DX benchmark methodology | 3 |
| **Analysis — Software** | Ecosystem Integration Retrospective; four-layer evidence model for Core's DX gap | 3 |
| **Advisory — Organisational processes** | DX benchmark recommendations to Paynow leadership; retrospective's 16 ranked improvements | 3 |
| **Design — User interaction** | ZimLivestock PWA — mobile-first React/Tailwind UI, auction flows, agentic-buying UX | 3 |
| **Design — Software** | Atomic `place_bid` RPC; BillPay biller-inbound API contract; auction state machine | 3 |
| **Realisation — User interaction** | Live ZimLivestock front end (React + TypeScript + Vite + Tailwind + shadcn) | 3 |
| **Realisation — Software** | Supabase schema + RLS + Edge Functions; Cloudflare Worker relays; pg_cron + vault | 3 |
| **Realisation — Infrastructure** | PWA service-worker cache busting; CI/CD via Vercel; Supabase migrations pipeline | 2–3 |
| **Manage & control — Software** | Sentry instrumentation; structured logging; chaos-test + security-agent edge functions | 2 |

> *Note for tutor: I have evidence of every entry above in the form of commits, deployed code, written documents, or recorded demos. Happy to walk through any of them at the final interview.*

---

## 9. Reflection

### What I learned about myself as a designer/developer

Going into this internship, I thought of myself primarily as a designer — someone who makes things look right and feel right. What surprised me was discovering that I am also, genuinely, a builder. I found real satisfaction in the engineering work: wiring up a payment flow, tracking down a bug that was silently mislabelling every mobile-money transaction, getting a live auction to settle correctly on stage in front of a leadership panel. I didn't expect to care about those things the way I did.

The quality I discovered I was best at was holding the whole picture at once — seeing how a design decision in the app would ripple into a database constraint, or how a payment-flow choice would affect what a farmer sees on their feature phone three steps later. That end-to-end thinking came naturally to me and, I think, is what made the work credible to the Paynow engineering team.

What was harder than expected was scope. My instinct throughout was to build more — more features, more integrations, more channels. I built a full Go-language backend in parallel with a cloud backend that was already doing the same job. That cost nearly two weeks and had to be deleted. The lesson I am still digesting is that the most disciplined version of building is deciding what *not* to build, and that constraint requires the same creative muscle as the building itself.

I also underestimated how much time silent failures would cost me. Several of the most painful debugging sessions during the internship were not caused by visible errors — they were caused by things that looked like they were working but were quietly doing the wrong thing. A payment was going through but saving the wrong payment method in the database. A scheduled job was failing every time it ran, but no alert was firing. I learned to be much more suspicious of silence than of noise.

### What I learned about working in a different cultural and economic context

My CMD coursework in Leeuwarden trained me to design for users who have a fast internet connection, a smartphone with a large screen, a bank card, and an email address. Walking into the Paynow office in Harare on day one, every one of those assumptions fell away.

The users I was designing for often have none of those things. They pay for groceries with a USSD code dialled on a basic Nokia. They receive payment confirmations as SMS messages, not push notifications. Many do not have email addresses. The transaction that matters most to them — winning a cattle auction — might be worth US$400, paid via a mobile-money prompt that expires in 90 seconds.

My first instinct, arriving from a European design context, was to treat this as a limitation to work around. I wanted to modernise the payment flow, simplify the API, make it look more like Stripe. It took a few weeks — and specifically one Saturday spent sitting in a tin-roofed auction shed watching farmers bid on Brahman bulls in Shona — to understand that I had it backwards. The features that looked "old-fashioned" to me (USSD push prompts, SMS confirmations, feature-phone compatibility) were not legacy problems. They were the *entire point*. They were exactly what the users needed, and Paynow had built them deliberately for that reason.

The biggest shift in my thinking was learning to ask "what does this look like to someone on a 2G connection in a rural area?" before "what does this look like on Figma?" That question changed almost every design decision I made in the second half of the internship — from the image compression strategy, to the way the auction timer displays on a small screen, to the fallback text when the app can't load data.

The DX benchmark reinforced this from a developer side. Paynow's payment API uses an older technical format — form-encoded requests rather than the JSON format most modern tools expect. My initial read was that this was a technical shortcoming. But when I understood that the format matches Zimbabwe's internet infrastructure (where JSON parsing can fail on low-memory devices, and form encoding is more tolerant), and when I saw that Paynow's own newer products had started adopting modern formats, I understood the distinction between "old" and "wrong." The core lesson: you cannot design well for a context you have not been inside.

### What I would do differently

**Visit the auction floor in week one, not week three.** I did my first physical field visit in week one, but the deeper visit — the one that produced the most important findings — happened in week three. By then I had already made architectural decisions that had to be revisited once I understood how fast real auctions move (about 90 seconds per animal) and how buyers and sellers actually negotiate trust. If I had spent two days at the auction floor before writing a single line of code, the build phase would have been faster and more accurate.

**Choose one technical approach on day one and commit to it.** In the first three weeks I was building two parallel systems — one in a server language called Go, one in a cloud platform called Supabase. Both were doing the same job. I kept the Go system alive "just in case" for two weeks before deleting it. That deletion removed nearly ten thousand lines of code I would never use. The lesson is simple: parallel bets are expensive, and the cost compounds daily. Pick one direction early and give it your full attention.

**Test with the real deployment environment from day one, not your laptop.** Several of the biggest problems I hit — including the central technical challenge of the whole project, Paynow's server blocking calls from cloud platforms — only showed up when the code was running in the cloud, not on my local machine. I spent days debugging things that worked perfectly on my laptop but failed the moment they were deployed. Spiking every external integration against the deployed environment in week one would have surfaced all of those problems early, when they were cheap to fix, instead of mid-build, when they were expensive.

### How this connects to my final assessment

I recognise the assessment my supervisor wrote, and I agree with it. The areas where I was rated highest — delivering under ambiguity, producing evidence-based recommendations, and communicating technical findings to non-technical stakeholders — are the areas where I felt most confident. The areas flagged for development — specifically, scope discipline and earlier escalation of blockers that required external sign-off — are areas I agree with honestly. There were moments where I kept building around a blocked dependency rather than escalating it clearly. Four of the six panel asks at the final demo are still waiting on action from Paynow's side; some of those blockers were known weeks earlier and I should have flagged them more formally rather than working around them.

One thing I might gently add: the weekly reflections and integration writeups I produced were not part of the original brief — they were things I started doing because they helped me think clearly, and they ended up becoming the most actionable deliverables the Paynow team received. I mention this not to oversell it, but because I think it reflects something genuine about my working style: I process by writing, and the writing has value beyond the processing.

### Where I want to go next

This internship confirmed something I had suspected but not yet tested: I want to work at the intersection of design and engineering, not on one side of that line. The work I found most meaningful was the kind where a design decision had to be defended all the way down to the database — where I could draw a screen on a whiteboard in the morning and have it wired to a live payment system by the evening.

I also want to keep working in contexts where the problem is genuinely hard in a non-obvious way. Zimbabwe's payment infrastructure is complex not because someone made bad decisions, but because the operating environment demands a completely different set of trade-offs to what I was trained for. That kind of complexity — where the right answer requires understanding the world the user actually lives in, not the world the designer assumes — is the kind I find most interesting.

In terms of next steps: I plan to continue building on the foundation I laid during this internship. ZimLivestock is a live product with real users and real payments running through it, and there is a clear roadmap for what comes next — escrow via Bisafe, cash access via Paab, the seller settlement function. I intend to see those through rather than treating the internship as a contained episode. Building something real and then walking away from it before it reaches the people it was designed for would feel like the wrong kind of ending.

Longer term, I am drawn toward the kind of role — product designer, or design engineer, or both — where you remain accountable to the full product, from the first sketch to the deployed system. This internship gave me evidence that I can operate at that level, and that is the kind of career I want to build.

---

## 10. Appendices

### A. Repository structure
```
~/Downloads/app/
├── src/                      React + TypeScript front end
├── supabase/                 Schema, RLS, Edge Functions, migrations
├── docs/                     Paynow API references
├── research/                 Field research, market analysis
└── deliverables/             All written deliverables, by week
    ├── week-1-2/             Foundation phase
    ├── week-5/               Build & retrospective
    ├── week-6/               Ecosystem integration + demo
    ├── week-7/               BillPay biller
    └── internship-return/    This report
```

### B. Key git commits referenced in the body
| Commit | Description |
|---|---|
| `c8cc6d7` | BillPay biller-inbound API |
| `c11428c` | Final-demo seed (3 agent + 3 manual auctions) |
| `193b64c` | Auto-fire Express USSD on DEMO winner |
| `c4a4f4c` | PWA SPA fallback fix |
| `5de8e8c` | AwaitingDelivery treated as terminal-success per Paynow spec |
| `ace9c8c` | Senior-engineer Paynow integration writeup |

### C. Live URLs
- Production app: https://app-nine-sigma-jgoqp90f2p.vercel.app
- Supabase project: `hmeieslclzycyjjjflfh`
- Cloudflare relay: `paynow-relay.zimlivestock.workers.dev`

### D. Stakeholder contacts
| Role | Name | Email |
|---|---|---|
| Paynow supervisor | [FILL] | [FILL] |
| Paynow technical contact (DX team) | [FILL] | [FILL] |
| Cattle-farmer interviewee #1 | [FILL] | [FILL] |
| Auction operator interviewed | [FILL] | [FILL] |

### E. Final assessment PDF (signed)
*Attached separately as `final-assessment-signed.pdf` — completed by Paynow supervisor.*

### F. Internship agreement PDF (signed)
*Attached separately as `internship-agreement-signed.pdf` — signed by supervisor, tutor, and intern at start of internship.*
