# ZimLivestock — Internship Handover

**Intern:** Tatenda Nyemudzo
**Period:** 12 March – 23 April 2026
**As of:** 14 April 2026, late-day snapshot at commit `80e88e1`
**Prod URL:** https://app-nine-sigma-jgoqp90f2p.vercel.app

This is the single entry-point document for supervisor review. It rolls up every deliverable, its current state, and a direct link to the evidence. The full brief lives at [internship-brief.md](internship-brief.md).

---

## One-paragraph summary

A working livestock auction PWA went live on Vercel in Week 5. It's backed by a Supabase stack with RLS on every table, an atomic `place_bid` RPC, and a Paynow-first payment orchestrator with retry chain (EcoCash → OneMoney → Card). Paynow's live API remains unreachable from any server-side code because of Cloudflare bot protection on `www.paynow.co.zw` — a blocker that is itself the highest-value finding of the benchmark. A 5-provider DX comparison (Stripe, Paystack, Flutterwave, Paynow, Pesepay) produced a ranked report with 7 actionable recommendations. CI runs a post-deploy QA suite (consistency + security + chaos) against production on every merge to main; on 13 April it caught 3 SEV-1 issues (direct-INSERT bids bypass, CORS wildcard fallback, broken paginated search) which were fixed the same day.

---

## New this week (14 April)

A second set of deliverables landed that extend the benchmark with internal-ecosystem comparisons and deepen the market research. All on `main`:

| Artifact | Commit | What it adds |
|---|---|---|
| [livestock-market-research-summary.md](../deliverables/week-5/livestock-market-research-summary.md) | `caa20d3` | Consolidates two field visits (19 Mar + 25 Mar) into the Goal-#1 research deliverable — 3 channels, 7 field findings, 4 payment-side observations, traceability to prototype decisions |
| [ecosystem-integration-retrospective.md](../deliverables/week-5/ecosystem-integration-retrospective.md) | `ff6fb4a` | Extends the DX benchmark with a second comparison axis: Paynow Core vs **sibling products inside the Paynow family** (BillPay v1.33, TXT SMS) — see "The benchmark" section below |
| Sentry error tracking | `7247eba` | DSN-gated wire-up in `frontendLogger` + `ErrorBoundary` + global error handlers. Dormant until `VITE_SENTRY_DSN` is set. Closes the observability gap from the 13 Apr audit |
| Idempotency verification | prior `5e2e0fb` confirmed end-to-end today | Both `bids` and `payments` generate `crypto.randomUUID()` idempotency keys, enforced by partial unique indexes. Double-click / retry dedup is real |
| Second auction visit write-up | `80e88e1` | Deep-dive systems analysis from the 25 March follow-up visit. Introduces the **Active Bidders per Listing (ABL)** metric as the leading indicator of auction-economic viability |

---

## Success criteria — current status

Updated from the [tracker](internship-deliverables-tracker.md). Green = done, Yellow = partial, Red = outstanding.

| # | Criterion | Target | Status | Where to look |
|---|---|---|---|---|
| 1 | Auction-house visits + research doc | 2 visits | 🟢 **Done** — 2 of 2, both with write-ups | [visit 1 (2026-03-19)](../research/auction-field-visit-2026-03-19.md) · [visit 2 (2026-03-25, deep-dive)](../research/auction-field-visit-2026-03-25.md) |
| 2 | DX benchmark, 3+ platforms, 5 categories | 3 platforms | 🟢 **Exceeded** — 5 platforms, 7 dims | [benchmarks/](../benchmarks/) |
| 3 | Wireframes + system flow diagrams | Both | 🟢 Done | [wireframes.html](wireframes.html), [architecture-diagram.html](architecture-diagram.html) |
| 4 | Functional marketplace prototype | list/bid/pay | 🟢 Live in prod | [Prod URL](https://app-nine-sigma-jgoqp90f2p.vercel.app) |
| 5 | Paynow payment integration (web + mobile) | Working flows | 🟡 Code complete, **blocked by Cloudflare** | [deliverables/week-5/payment-test-results.md](../deliverables/week-5/payment-test-results.md) |
| 6 | Product iteration from field research | 2 improvements | 🟢 **Exceeded** — 4 shipped | See "Field research → product" below |
| 7 | User feedback sessions | 3 sessions | 🟡 Form ready, ~30% collected — 1 session started, 2 more scheduled this week | [stakeholder-feedback-form.md](../deliverables/week-5/stakeholder-feedback-form.md) |
| 8 | First-draft DX report | 1 draft | 🟢 Done | [payment-provider-benchmark-report.md](../benchmarks/payment-provider-benchmark-report.md) |
| 9 | End-to-end payment testing | Success + fail + timeout + mobile | 🟢 Sim complete; live Paynow sandbox pending | [payment-test-results.md](../deliverables/week-5/payment-test-results.md) |
| 10 | Stakeholder demos + structured feedback | 2+ demos | 🔴 Scheduled, not yet run | — |
| 11 | UX / reliability improvements from testing | From feedback | 🟢 Phase 1+2 hardening shipped | [session-logs/2026-04-13.md](../session-logs/2026-04-13.md) |
| 12 | Final DX report with exec summary + 5+ recs | 5 recs | 🟢 **Exceeded** — 7 recs, exec summary live | [benchmarks/payment-provider-benchmark-report.md](../benchmarks/payment-provider-benchmark-report.md) |
| 13 | Deployment — publicly accessible URL | Live URL | 🟢 [app-nine-sigma-jgoqp90f2p.vercel.app](https://app-nine-sigma-jgoqp90f2p.vercel.app) | — |
| 14 | 5-minute internship presentation | Deck + practice | 🟢 **Done** — 13-slide Slidev deck with 3 code comparisons + dry-run | [slides.md](../deliverables/week-6/slides.md) · [presentation-deck.md](../deliverables/week-6/presentation-deck.md) |

**Headline:** 12 🟢 / 2 🟡 / 1 🔴 as of 14 April. Deck dry-run completed flipping #14 to green. The one remaining red is stakeholder demos — 1 session run, 2 more scheduled for this week.

---

## The benchmark (criteria 2, 8, 12)

Five providers integrated end-to-end into the same ZimLivestock codebase — not paper comparison. Each has its own `test-<provider>-checkout` edge function and a test page wired through `initiate-payment`.

| Rank | Provider | Score | LOC | Integration time | Notes |
|---|---|---|---|---|---|
| 1 | Stripe | 9.7/10 | 561 | ~2 h | Gold standard |
| 2 | Paystack | 8.0/10 | 557 | ~1.5 h | Fastest to integrate |
| 3 | Flutterwave | 7.2/10 | 523 | ~2.5 h | Webhook hash confusing |
| 4 | Paynow | 4.2/10 | **835** | ~3.5 h | 60% more code than the leader |
| 5 | Pesepay | 3.8/10 | — | — | Blocked by malformed HTTP headers |
| — | DPOpay | — | — | — | Excluded — sandbox needs KYC docs |

**Top 7 recommendations** (from [benchmark report](../benchmarks/payment-provider-benchmark-report.md)):

1. Move API off `www.paynow.co.zw` → `api.paynow.co.zw` without Cloudflare. *Critical — blocks every modern cloud client today.*
2. Fix / modernize the Node.js SDK (silent errors, no TS, Deno incompatible).
3. Standardize webhook hash field ordering (or switch to HMAC like Paystack).
4. Adopt JSON API format — replace form-encoded.
5. Improve sandbox + test docs (test phone numbers, webhook logs).
6. Return structured JSON error responses (codes + doc links).
7. Build developer onboarding content (the Paystack playbook).

Full pitfall catalogue: [paynow-integration-pitfalls.md](paynow-integration-pitfalls.md) — 21 documented.

### Additional finding: Paynow's own sibling products have better DX than Paynow Core

A second DX comparison — added 14 April — examined two sibling products in the Paynow family: **BillPay Vendor API v1.33** and **TXT SMS API**. Both were integrated into the same codebase ([billpay](../supabase/functions/billpay/) 6 edge functions shipped; TXT on `feature/sms-notifications`).

**Headline:** BillPay and TXT both **already ship the patterns Paynow Core needs** — separate API subdomain without Cloudflare, HTTP Basic Auth, documented test prefixes, versioned docs, clear state machines. The fix for Paynow Core isn't research; it's internal pattern adoption.

Full analysis: [ecosystem-integration-retrospective.md](../deliverables/week-5/ecosystem-integration-retrospective.md). This extends the 7 recommendations above with 7 more that are *already implemented elsewhere in Paynow*, making them low-risk wins for the Core team.

---

## The prototype (criteria 4, 5, 6, 11)

### What it does, end-to-end

1. Seller signs up → posts a listing (title, breed, weight, health grade, photos, stock card) → publishes
2. Buyer browses with server-side search + filters → places a bid via atomic `place_bid` RPC (row-locked, validates every rule)
3. Real-time bid updates via Supabase Realtime; 90-second countdown matches physical-auction cadence
4. Auction ends → `end_expired_auctions` cron → winner notified → checkout
5. Checkout initiates payment via `initiate-payment` edge function → Paynow primary, Stripe fallback
6. `payment-webhook` verifies + settles via `settlement_ledger`; orchestrator retries on failure (EcoCash → OneMoney → Card)

### Field research → product (criterion 6)

Four iterations driven directly by the [auction field visit](../research/auction-field-visit-2026-03-19.md):

| Insight | Implementation |
|---|---|
| US$1,000 deposit prices out 90% of buyers | Escrow-based US$50–100 holds (schema ready) |
| 12% hidden fees erode trust | Fee breakdown on checkout (`CheckoutScreen.tsx`) |
| Buyers don't trust listings without health proof | Stock-card photo upload in seller flow |
| Sellers want trust signal at checkout | Paynow trust badges (payment history-based) |

### What's live today (Week 5)

- **PWA** — installable, offline fallback page, manifest compliant, Workbox caching, auto-updating SW
- **RLS** — every table has `ENABLE ROW LEVEL SECURITY` + at least one policy; direct-INSERT paths audited and blocked
- **Atomic bid RPC** — `place_bid` is `SECURITY DEFINER`, row-locks `livestock_items`, validates all rules (amount > current, > starting_price, status=active, end_time > now, no self-bid) before insert. Verified in today's enterprise audit
- **US$100k payment cap** as DB `CHECK` constraint + server-side recompute
- **Post-deploy QA gate** — CI runs `consistency-checker`, `security-agent`, `chaos-test` on every merge to main. Hard-fails on integrity breaks

### What shipped in response to the 13 Apr enterprise audit

Three SEV-1s closed the same day ([full audit](../deliverables/week-5/enterprise-audit-2026-04-13.md)):

- `bf3da08` — direct-INSERT bids bypass. Any authed user could win any auction for $1 via `POST /rest/v1/bids`. Dropped the permissive INSERT policy; bids only insert via `place_bid()` RPC now.
- `921bc62` — CORS wildcard fallback. 7 user-facing edge functions had `|| "*"` on unset env; `initiate-payment` now has full allowlist, 6 others fail closed.
- `4cd7109` — paginated search broken. Was client `.filter()` on infinite-query pages; now server-side `Supabase.or(...ilike...)` with `useDeferredValue` and escape handling.

---

## Architecture snapshot

| Tier | Tech | Highlights |
|---|---|---|
| Frontend | React 18 + TS + Vite + Tailwind + shadcn/ui | React Query + Zustand; 13 lazy-loaded routes with stale-chunk reload guard |
| PWA | vite-plugin-pwa + Workbox | CacheFirst images 7d, NetworkFirst API 5min, branded offline fallback, auto-update SW |
| API | Supabase Edge Functions (Deno) | 18+ functions: payments (4), BillPay (6), agents (5), QA (3), tests (5) |
| Data | Supabase Postgres + RLS | Composite indexes on hot paths; PgBouncer pooling; atomic RPCs for money + bids |
| Realtime | Supabase Realtime | Clean unsub on every hook (`useMessages`, `useBids`, `useNotifications`, `useAgents`) |
| Payments | Paynow + Stripe | Orchestrator retry chain, webhook verification, settlement ledger |
| CI/CD | GitHub Actions | Schema Guard → Build → Edge Check → Deploy → Post-Deploy QA |

Interactive diagram: [architecture-diagram.html](architecture-diagram.html)

---

## CI & release posture

Full policy: [CONTRIBUTING.md](../CONTRIBUTING.md). The gates that are non-negotiable:

- **Schema Guard** — diffs `schema.sql` + `rls_policies.sql` vs main; blocks removing policies/tables/CHECKs/FKs without the `[force-schema]` token in the commit message
- **Consistency checker** — hard-fails on `summary.health == "critical"`; caught a real bid-drift bug from a seed script in 8 seconds on 13 Apr
- **Security agent** — fails on any `critical_failures != 0` or high-severity `status: fail`
- **Chaos test** — fails on any `summary.failed > 0`

No override for integrity/security/chaos — fix the underlying issue or don't ship.

---

## What's still open

### Week 5 (by 15 Apr)

- Run 2 remaining stakeholder demos using [stakeholder-feedback-form.md](../deliverables/week-5/stakeholder-feedback-form.md); 1 session started, ~30% collected
- **Fix Paynow insufficient-funds fall-through** — detect `params.error` in `initiate-payment/index.ts:205-212`, return 402 with clear toast (remaining one-liner)
- Configure GitHub branch protection on `main` (manual UI step — `gh api` attempt errored on the null-payload syntax; retry via dashboard)

### Week 6 (by 23 Apr)

- Final DX report polish — benchmark report is a functional draft; add the ecosystem-retrospective findings as a new section
- 5-minute presentation deck + dry-run

### Closed this week (no longer outstanding)

- ✅ 2nd auction-house visit — written up at [research/auction-field-visit-2026-03-25.md](../research/auction-field-visit-2026-03-25.md)
- ✅ Sentry integration — DSN-gated wire-up shipped (`7247eba`); paste DSN into `.env.local` + Vercel production env to activate
- ✅ Idempotency on bids + payments — verified end-to-end this week; both generate `crypto.randomUUID()`, partial unique indexes enforce dedup
- ✅ `test-pesepay-checkout` stack leak — killed in `5e2e0fb`
- ✅ Nightly extended chaos workflow — wired in `5e2e0fb` (`.github/workflows/nightly-chaos.yml`, 03:00 UTC)
- ✅ `VERCEL_TOKEN` + `CRON_SECRET` GitHub Actions secrets — set earlier this week

### Not shipping this internship (logged for record)

- Offline mutation queue (TanStack Query Persist + IndexedDB)
- List virtualization (react-window for Messages/Notifications/PaymentHistory)
- SSR cookie session (localStorage → httpOnly cookies)
- Per-commit Lighthouse PWA audit in CI
- DOWN migrations via Supabase CLI workflow

---

## Evidence index

| Artifact | Path |
|---|---|
| Brief | [docs/internship-brief.md](internship-brief.md) |
| Live tracker | [docs/internship-deliverables-tracker.md](internship-deliverables-tracker.md) |
| DX benchmark (exec report) | [benchmarks/payment-provider-benchmark-report.md](../benchmarks/payment-provider-benchmark-report.md) |
| DX notes per provider | [benchmarks/](../benchmarks/) |
| Paynow pitfalls | [docs/paynow-integration-pitfalls.md](paynow-integration-pitfalls.md) |
| Paynow integration plan | [research/paynow-full-integration-plan.md](../research/paynow-full-integration-plan.md) |
| BillPay plan | [docs/billpay-integration-plan.md](billpay-integration-plan.md) |
| Tawk.to plan | [docs/tawkto-integration-plan.md](tawkto-integration-plan.md) |
| Auction field research — visit 1 | [research/auction-field-visit-2026-03-19.md](../research/auction-field-visit-2026-03-19.md) |
| Auction field research — visit 2 (deep-dive, systems analysis) | [research/auction-field-visit-2026-03-25.md](../research/auction-field-visit-2026-03-25.md) |
| **Livestock market research summary (Goal #1)** | [deliverables/week-5/livestock-market-research-summary.md](../deliverables/week-5/livestock-market-research-summary.md) |
| Ecosystem DX retrospective (BillPay + TXT vs Paynow Core) | [deliverables/week-5/ecosystem-integration-retrospective.md](../deliverables/week-5/ecosystem-integration-retrospective.md) |
| Adversarial / red-team test report | [deliverables/week-5/adversarial-test-2026-04-14.md](../deliverables/week-5/adversarial-test-2026-04-14.md) |
| Payment red-team report | [deliverables/week-5/payment-redteam-2026-04-14.md](../deliverables/week-5/payment-redteam-2026-04-14.md) |
| Prototype improvements log | [deliverables/week-5/prototype-improvements.md](../deliverables/week-5/prototype-improvements.md) |
| Feature branch review | [deliverables/week-5/feature-branch-review.md](../deliverables/week-5/feature-branch-review.md) |
| Wireframes (interactive) | [docs/wireframes.html](wireframes.html) |
| Architecture diagram | [docs/architecture-diagram.html](architecture-diagram.html) |
| Stanford SEED brief | [docs/stanford-seed-meeting.md](stanford-seed-meeting.md) |
| Week 1–2 package | [deliverables/week-1-2/README.md](../deliverables/week-1-2/README.md) |
| Week 5 package | [deliverables/week-5/](../deliverables/week-5/) |
| Payment test results | [deliverables/week-5/payment-test-results.md](../deliverables/week-5/payment-test-results.md) |
| Enterprise audit (13 Apr) | [deliverables/week-5/enterprise-audit-2026-04-13.md](../deliverables/week-5/enterprise-audit-2026-04-13.md) |
| Go/no-go checklist | [deliverables/week-5/deployment-go-nogo-checklist.md](../deliverables/week-5/deployment-go-nogo-checklist.md) |
| 100-user stress simulation | [deliverables/week-5/100-user-stress-simulation.md](../deliverables/week-5/100-user-stress-simulation.md) |
| Stakeholder feedback form | [deliverables/week-5/stakeholder-feedback-form.md](../deliverables/week-5/stakeholder-feedback-form.md) |
| Session logs | [session-logs/](../session-logs/) |
| CI + merge policy | [CONTRIBUTING.md](../CONTRIBUTING.md) |

---

*This document is the handover surface. Everything else in the repo is a citation.*
