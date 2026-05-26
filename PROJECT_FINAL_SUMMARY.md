# ZimLivestock — Final Project Summary

**Intern:** Tatenda Nyemudzo
**Host:** Paynow Zimbabwe (Webdev / Softwarehouse) — Developer Experience team
**Period:** 12 March 2026 – ongoing (this snapshot: 26 May 2026, ~10 weeks in)
**Production URL:** https://app-nine-sigma-jgoqp90f2p.vercel.app
**Codebase:** this repository (`Downloads/app/`)
**Supabase project:** `hmeieslclzycyjjjflfh`

This document is the single executive-level wrap-up for the Paynow supervisor. Everything else in the repo is a citation. For the audience-specific deep dives, see the [Evidence index](#evidence-index) at the end.

---

## 1. One-paragraph summary

The brief was open-ended: *build something real on Paynow's ecosystem, treat yourself as a third-party developer, and document what gets in your way.* What shipped is **ZimLivestock** — a multi-tenant livestock-auction platform live in production on Vercel + Supabase, integrating **four Paynow products** (Core, BillPay vendor, BillPay biller, TXT SMS), with **Bisafe** sandbox access secured and **Paab** still blocked upstream. Alongside the product I produced a **42-page DX benchmark** comparing Paynow against Stripe, Paystack, Flutterwave, Pesepay and DPOpay, and an **Ecosystem Integration Retrospective** showing that Paynow's *own* sibling products (BillPay, TXT) already implement the patterns Core needs — the DX gap is internal-consistency, not capability. The 8 May 2026 demo to Paynow leadership ran a live end-to-end auction → SMS → USSD push on stage; the panel returned six strategic asks of which **5 of 6 are now verified end-to-end**, with the sixth (Paab) still waiting on credentials. The project has crossed from *consumer of the Paynow ecosystem* to *participant in it* (BillPay biller endpoints live, awaiting vendor-portal registration).

---

## 2. Scope vs outcome

Internship brief had three success criteria. Snapshot against each:

| # | Criterion | Outcome |
|---|---|---|
| 1 | Ship a credible consumer product (real users, real money, real Paynow) | **Done.** PWA in production on Vercel. Multi-tenant SaPS pivot complete. 4 Paynow products live in-app. |
| 2 | DX benchmark — Paynow vs ≥3 competitors across ≥5 categories | **Exceeded.** 5 providers, 7 categories, ranked report with 7 top-line recommendations. |
| 3 | At least one architectural recommendation Paynow could action | **Exceeded.** 16 ranked recommendations in the Paynow-Core writeup; 7 strategic ones in the benchmark; ecosystem retrospective formalises the keystone (move Core to `api.paynow.co.zw` without Cloudflare). |

Detailed 14-criterion tracker: [`docs/internship-deliverables-tracker.md`](docs/internship-deliverables-tracker.md).
Original brief: [`docs/internship-brief.md`](docs/internship-brief.md).

---

## 3. What's live in production (26 May 2026)

### Marketplace core
- Browse → bid → win → checkout → pay (Paynow Core primary, Stripe fallback for diaspora)
- Real-time bid updates via Supabase Realtime; 90-second auction cadence matching the physical floor
- Atomic `place_bid` RPC (`SECURITY DEFINER` + `FOR UPDATE`) and `end_expired_auctions` cron
- Idempotency keys on `bids` and `payments` enforced by partial unique indexes
- 5% platform fee math verified cent-accurate; US$100k payment cap as DB `CHECK` constraint

### Multi-tenant SaPS infrastructure (post-pivot, May 2026)
- 10 transactional tables carry `tenant_id NOT NULL` with RLS membership checks
- Lead pipeline: `/operators/request-access` form → admin queue → approval token → 5-step onboarding wizard → live tenant in ~6 minutes (no SQL editor)
- `provision_tenant()` `SECURITY DEFINER` RPC — atomic tenant + member + lead-state update
- Operator-tunable config (commission split, reserve, dispute window, lot fee) edited through `/t/<slug>/settings`
- Two tenants seeded: `zimlivestock-demo` (defaults) and `harare-auction-house` (5/7 split, US$25 lot fee, 7-day dispute, reserves required — calibrated to the 19 March field visit)

### Multi-channel access
| Channel | Status |
|---|---|
| Web / PWA (installable, offline shell, Workbox caching) | Live |
| WhatsApp bot — list / browse / bid via chat (0773819300) | Live |
| USSD simulator — feature-phone bidding at `/ussd-simulator` | Live |
| Facebook Messenger bot | Code complete, awaiting page-token rotation |
| BillPay biller AUTH endpoint | Live (Paynow can call it today) |
| BillPay biller PAY endpoint | Live, awaiting vendor-portal registration |

### Payments
- **Paynow Core** — Web Checkout + Express USSD push via Cloudflare Worker relay (`paynow-relay.zimlivestock.workers.dev`) to bypass the bot wall on `www.paynow.co.zw`
- **BillPay vendor** (outbound, paying bills out of platform earnings) — 6 edge functions, JSON I/O
- **BillPay biller** (inbound, ZimLivestock as a biller) — `billpay-biller-auth` + `billpay-biller-pay` Supabase edge functions, Basic Auth + optional IP allowlist, audit-logged
- **TXT SMS** — auction-won / auction-sold notifications, with a Cloudflare Quick Tunnel from a static-IP machine to satisfy txt.co.zw's IP allowlist
- **Stripe** — card fallback for diaspora buyers
- **Bisafe** — sandbox access received; integration scoped for the next sprint

### Transportation (new this fortnight)
- Sellers toggle delivery on listing
- Distance-based quotes at checkout via Nominatim geocoding + haversine
- US$15 base + $0.35/km, capped at $250

### Reliability + security
- RLS on every table, with the bids direct-INSERT bypass closed in April (writes go through `place_bid` only)
- CORS wildcard fallback removed on every user-facing edge function (April SEV-1 fix)
- Post-deploy QA gate runs `consistency-checker` + `security-agent` + `chaos-test` against production on every merge to `main`
- Tenant RLS infinite-recursion bug fixed 2026-05-21 (`security-definer` helper)
- Sentry instrumentation wired (DSN-gated)

---

## 4. The DX benchmark (key research output)

Methodology: deliberately *lazy* — one integration attempt per provider, only the publicly documented path, with real credentials. The findings approximate what a new developer experiences on their first try.

| Rank | Provider | DX Score | LOC | First-200 |
|---|---|---|---|---|
| 1 | Stripe | 9.7/10 | 561 | ~2 h |
| 2 | Paystack | 8.0/10 | 557 | ~1.5 h |
| 3 | Flutterwave | 7.2/10 | 523 | ~2.5 h |
| 4 | **Paynow Core** | **4.2/10** | **835** | ~3.5 h |
| 5 | Pesepay | 3.8/10 | — | blocked (malformed headers) |
| — | DPOpay | — | — | excluded (sandbox requires KYC) |

Full report: [`benchmarks/payment-provider-benchmark-report.md`](benchmarks/payment-provider-benchmark-report.md).
Per-provider DX notes: [`benchmarks/`](benchmarks/).
Paynow pitfall catalogue (21 documented): [`docs/paynow-integration-pitfalls.md`](docs/paynow-integration-pitfalls.md).

### Top 7 recommendations to Paynow Core

1. **Move the production API off `www.paynow.co.zw` (Cloudflare bot wall) to `api.paynow.co.zw`** — mirrors the existing `billpay.paynow.co.zw` pattern. *Critical: blocks every modern cloud client today; forced ZimLivestock to ship a Cloudflare Worker relay to function at all.*
2. Fix / modernise the Node.js SDK (silent errors, no TypeScript types, Deno-incompatible).
3. Standardise webhook hash field ordering (or switch to HMAC like Paystack).
4. Adopt JSON API format — replace form-encoded.
5. Improve sandbox + test docs (test phone numbers, webhook logs).
6. Return structured JSON error responses (codes + doc links) instead of HTML error pages.
7. Build developer-onboarding content (the Paystack playbook).

### Headline finding: it's an internal-consistency gap, not a capability gap

The **Ecosystem Integration Retrospective** ([`deliverables/week-5/ecosystem-integration-retrospective.md`](deliverables/week-5/ecosystem-integration-retrospective.md)) extends the benchmark with a second comparison axis: Paynow Core vs sibling products in the Paynow family. Both **BillPay** (7.5/10) and **TXT** (7/10) already ship the patterns Core needs — separate API subdomain without Cloudflare, HTTP Basic Auth, documented test prefixes, versioned docs, clear state machines. Backed by four independent evidence layers:

1. First-attempt integration testing — time-to-first-200 per product
2. DX comparison table — 8 criteria across all three Paynow products
3. Forum evidence — 3 independent reports of the same Core blocker over 7 months on Paynow's own developer forum
4. Working production workaround — the Cloudflare Worker relay, which quantifies the cost: TCP RST → 200 OK in 400–800 ms of added latency

Estimated lift to Core's DX score from the recommendation set: 4.2 → 7–8/10, for ~4 weeks of internal engineering work.

---

## 5. Field research → product

Two physical auction-floor visits ([19 March](research/auction-field-visit-2026-03-19.md), [25 March deep-dive](research/auction-field-visit-2026-03-25.md)) drove concrete product decisions. Consolidated research summary: [`deliverables/week-5/livestock-market-research-summary.md`](deliverables/week-5/livestock-market-research-summary.md).

| Field insight | Implementation |
|---|---|
| US$1,000 deposit prices out 90% of buyers | Escrow-based US$50–100 holds (schema ready; Bisafe integration scoped) |
| 12% hidden fees erode trust | Itemised fee breakdown on checkout |
| Buyers don't trust listings without health proof | Stock-card photo upload required in seller flow |
| Sellers want a trust signal at checkout | Paynow trust badges (payment-history based) |
| Real auctions run ~90 seconds per lot | Timed auctions with countdown matching floor cadence |
| 45 max active bidders per ring; trust hierarchies matter | Tenant-scoped membership; per-tenant operator config |

---

## 6. The 8 May 2026 demo and panel asks

Demo ran three live agents pre-bidding on staggered auctions. Each agent win triggered:
- TXT SMS to the buyer's phone
- TXT SMS to the seller's phone
- Paynow Express USSD push to the buyer's phone for the won amount

All chained through the live `end-auctions` Supabase Edge Function + Cloudflare relay. The panel saw a real US$0.02 USSD prompt arrive on the demonstrator's phone on stage.

Status against the six panel asks (detail: [`deliverables/week-7/post-demo-progress-report.md`](deliverables/week-7/post-demo-progress-report.md)):

| # | Panel ask | Status |
|---|---|---|
| 1 | Cash payments via **Paab** | 🔴 Blocked — awaiting Paab sandbox + docs from Paynow |
| 2 | Register platform as a **BillPay biller** | 🟡 AUTH live; PAY pending vendor-portal registration with rotated creds |
| 3 | Codify physical-floor auction mechanics | 🟢 Done — per-tenant config, edited from `/settings`, no SQL |
| 4 | Sellers register Paynow merchant ID, not bank details | 🟢 Done — `/account` + soft-guard on `/post` |
| 5 | **Bisafe** escrow | 🟢 Done — sandbox + docs received; integration scoped |
| 6 | Accessibility — USSD / WhatsApp reach | 🟢 Done — WhatsApp bot live on 0773819300; USSD simulator at `/ussd-simulator` |

**Net: 5 green · 1 amber · 1 red**, with both amber and red blocked on Paynow-side action.

---

## 7. What's blocked, and on whom

| Blocker | Owns | Impact |
|---|---|---|
| Paab sandbox + docs | Paynow | Ask #1 cannot start |
| BillPay vendor-portal registration with rotated creds | Paynow eng | Ask #2 PAY round-trip |
| Paynow merchant-transfer API docs | Paynow | Seller settlement function (post-ask-#4) |
| txt.co.zw REMOTE credentials | Paynow | Activates the SMS-notifications branch |
| Meta page-token rotation | Paynow + Meta | Facebook bot public launch |
| Mac mini production access | Internal | WhatsApp bot productionisation |

Concrete ask of supervisor:
1. **Forward BillPay rotated creds to Paynow eng** → unblocks ask #2 PAY round-trip.
2. **Confirm Paab timeline** → the only red on the board.
3. **Sign off on SaPS commercial bundle** → 10 docs ready to send to operator prospects.

---

## 8. Architecture snapshot

| Tier | Tech | Highlights |
|---|---|---|
| Frontend | React 18 + TS + Vite + Tailwind + shadcn/ui | React Query + Zustand; lazy-loaded routes; PWA via vite-plugin-pwa + Workbox; stale-chunk reload guard |
| API | Supabase Edge Functions (Deno) | Payments (4) · BillPay vendor (6) · BillPay biller (2) · TXT · agents · QA · SaPS lead/onboard (5) |
| Data | Supabase Postgres + RLS | Atomic RPCs for money + bids; composite indexes on hot paths; multi-tenant column-default routing; `provision_tenant()` SECURITY DEFINER |
| Realtime | Supabase Realtime | Bids, messages, notifications, agents — clean unsub on every hook |
| Payments | Paynow + Stripe + Bisafe (scoped) | Orchestrator retry chain (EcoCash → OneMoney → Card); webhook verification; settlement ledger |
| Relay layer | Cloudflare Workers + Quick Tunnel | Bypasses Paynow Cloudflare bot wall and TXT IP allowlist |
| CI/CD | GitHub Actions + Vercel | Schema Guard → Build → Edge Check → Deploy → Post-deploy QA |

Interactive diagram: [`docs/architecture-diagram.html`](docs/architecture-diagram.html). Wireframes: [`docs/wireframes.html`](docs/wireframes.html).

---

## 9. CI + release posture

Non-negotiable gates ([`CONTRIBUTING.md`](CONTRIBUTING.md)):

- **Schema Guard** — diffs `schema.sql` + `rls_policies.sql` vs main; blocks removing policies/tables/CHECKs/FKs without an explicit `[force-schema]` token in the commit message
- **Consistency checker** — hard-fails on `summary.health == "critical"`
- **Security agent** — fails on any `critical_failures != 0` or high-severity `status: fail`
- **Chaos test** — fails on any `summary.failed > 0`

No override for integrity / security / chaos. Either the underlying issue is fixed, or the merge doesn't ship.

---

## 10. What's next (fortnight: 2026-05-26 → 2026-06-08)

- BillPay biller PAY round-trip with Paynow eng (once vendor-portal registration completes)
- Seller settlement function once merchant-transfer API docs arrive
- WhatsApp bot → Mac mini production deploy
- Facebook Messenger bot public launch (post page-token rotation)
- TXT REMOTE creds → activate SMS notifications branch
- Bisafe escrow implementation against the received sandbox
- First SaPS operator prospect outreach (3 pilot tenants by 8 June target)

---

## 11. Repository orientation (for a future engineer)

```
Downloads/app/
├── src/                       React + TypeScript front end
│   ├── app/routes.tsx         All routes, lazy-loaded, tenant-prefix mirror
│   ├── hooks/                 React Query hooks (useLivestock, useBids, ...)
│   └── stores/authStore.ts    Zustand auth, localStorage-backed
├── supabase/
│   ├── schema.sql             Schema + atomic RPCs (place_bid, end_expired_auctions, provision_tenant)
│   ├── rls_policies.sql       RLS — never bypass to "make it work"
│   ├── functions/             Edge Functions (Deno) — payments, billpay, txt, agents, QA
│   └── tests/                 Read-only verification scripts (multi-tenancy, etc.)
├── docs/                      Paynow API references, integration plans, wireframes
├── benchmarks/                DX benchmark — report + per-provider notes
├── research/                  Field research from physical auction visits
└── deliverables/              All written deliverables, organised by week
    ├── week-1-2/              Foundation phase
    ├── week-5/                Build + retrospective + audit
    ├── week-6/                Ecosystem integration + final demo
    ├── week-7/                BillPay biller + post-demo report
    ├── business/              SaPS commercial bundle (10 docs)
    └── internship-return/     Final academic deliverables (NHL Stenden)
```

Project-specific conventions worth knowing about are in [`CLAUDE.md`](CLAUDE.md).

---

## 12. Evidence index

### Internship-facing
| Artifact | Path |
|---|---|
| Brief | [`docs/internship-brief.md`](docs/internship-brief.md) |
| 14-criterion tracker | [`docs/internship-deliverables-tracker.md`](docs/internship-deliverables-tracker.md) |
| April 14 handover snapshot | [`docs/INTERNSHIP-HANDOVER.md`](docs/INTERNSHIP-HANDOVER.md) |
| Final academic report (NHL Stenden) | [`deliverables/internship-return/final-internship-report.md`](deliverables/internship-return/final-internship-report.md) |
| Post-demo progress report (May 22) | [`deliverables/week-7/post-demo-progress-report.md`](deliverables/week-7/post-demo-progress-report.md) |

### Research
| Artifact | Path |
|---|---|
| Field visit — 19 March | [`research/auction-field-visit-2026-03-19.md`](research/auction-field-visit-2026-03-19.md) |
| Field visit — 25 March (deep-dive) | [`research/auction-field-visit-2026-03-25.md`](research/auction-field-visit-2026-03-25.md) |
| Consolidated market research | [`deliverables/week-5/livestock-market-research-summary.md`](deliverables/week-5/livestock-market-research-summary.md) |
| Paynow full integration plan | [`research/paynow-full-integration-plan.md`](research/paynow-full-integration-plan.md) |
| ZimLivestock roadmap | [`research/zimlivestock-roadmap.md`](research/zimlivestock-roadmap.md) |

### DX benchmark + retrospective
| Artifact | Path |
|---|---|
| Benchmark exec report | [`benchmarks/payment-provider-benchmark-report.md`](benchmarks/payment-provider-benchmark-report.md) |
| Per-provider DX notes | [`benchmarks/`](benchmarks/) |
| Paynow pitfalls (21) | [`docs/paynow-integration-pitfalls.md`](docs/paynow-integration-pitfalls.md) |
| Ecosystem retrospective (Core vs BillPay vs TXT) | [`deliverables/week-5/ecosystem-integration-retrospective.md`](deliverables/week-5/ecosystem-integration-retrospective.md) |

### Integration writeups (Paynow-facing)
| Artifact | Path |
|---|---|
| Paynow Core | [`deliverables/week-6/paynow-supabase-integration.md`](deliverables/week-6/paynow-supabase-integration.md) |
| BillPay vendor | [`deliverables/week-6/billpay-supabase-integration.md`](deliverables/week-6/billpay-supabase-integration.md) |
| TXT SMS | [`deliverables/week-6/txt-supabase-integration.md`](deliverables/week-6/txt-supabase-integration.md) |
| BillPay biller (inbound) | [`deliverables/week-7/billpay-biller-api-spec.md`](deliverables/week-7/billpay-biller-api-spec.md) |
| BillPay biller template (filled) | [`deliverables/week-7/billpay-biller-template.md`](deliverables/week-7/billpay-biller-template.md) |

### Audits + reliability
| Artifact | Path |
|---|---|
| Enterprise audit (13 Apr) | [`deliverables/week-5/enterprise-audit-2026-04-13.md`](deliverables/week-5/enterprise-audit-2026-04-13.md) |
| Adversarial / red-team test | [`deliverables/week-5/adversarial-test-2026-04-14.md`](deliverables/week-5/adversarial-test-2026-04-14.md) |
| Payment red-team | [`deliverables/week-5/payment-redteam-2026-04-14.md`](deliverables/week-5/payment-redteam-2026-04-14.md) |
| Launch readiness | [`LAUNCH_READINESS_REPORT.md`](LAUNCH_READINESS_REPORT.md) |
| Hardening notes | [`docs/HARDENING.md`](docs/HARDENING.md) |
| 100-user stress simulation | [`deliverables/week-5/100-user-stress-simulation.md`](deliverables/week-5/100-user-stress-simulation.md) |

### Demo + presentation
| Artifact | Path |
|---|---|
| Final demo script | [`deliverables/week-6/final-demo-script.md`](deliverables/week-6/final-demo-script.md) |
| Demo runbook | [`deliverables/week-6/demo-runbook.md`](deliverables/week-6/demo-runbook.md) |
| Slidev deck | [`deliverables/week-6/slides.md`](deliverables/week-6/slides.md) |
| Stakeholder feedback form | [`deliverables/week-5/stakeholder-feedback-form.md`](deliverables/week-5/stakeholder-feedback-form.md) |

### SaPS commercial bundle
| Artifact | Path |
|---|---|
| Business case | [`deliverables/business/business-case.md`](deliverables/business/business-case.md) |
| Pilot proposal | [`deliverables/business/pilot-proposal.md`](deliverables/business/pilot-proposal.md) |
| GTM strategy | [`deliverables/business/gtm-strategy.md`](deliverables/business/gtm-strategy.md) |
| Competitive positioning | [`deliverables/business/competitive-positioning.md`](deliverables/business/competitive-positioning.md) |
| Customer success playbook | [`deliverables/business/customer-success-playbook.md`](deliverables/business/customer-success-playbook.md) |
| Financial model | [`deliverables/business/financial-model.xlsx`](deliverables/business/financial-model.xlsx) |
| MD pitch deck | [`deliverables/business/zimlivestock-md-pitch.pptx`](deliverables/business/zimlivestock-md-pitch.pptx) |

### Session logs
Chronological build journal in [`session-logs/`](session-logs/) — March 17 → May 14, with the May 11 log covering the full SaPS pivot end-to-end and May 14 the post-demo supervisor walkthrough.

---

*Last updated 2026-05-26. This document is the handover surface for the Paynow supervisor; every claim above is backed by a linked artifact in this repository.*
