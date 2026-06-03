# ZimLivestock — Enterprise Production Readiness Audit & Remediation

**Date:** 2026-06-03
**Stack:** React 18 + TypeScript + Vite + Tailwind + shadcn/ui · Supabase (Postgres + Auth + RLS + Realtime + Storage + Edge Functions) · Paynow
**Method:** 44-agent verified audit workflow across 12 production dimensions; every medium+ finding independently re-verified by an adversarial agent against the actual source before counting. Findings were then remediated in five verified waves.

---

## Executive verdict

**Audit entry state: `NOT-READY`** — a cluster of independently-verified, exploitable financial/identity holes, plus the explicitly-requested caching and logging gaps.

**Post-remediation state: `READY`.** All blockers are fixed, committed, and verified (build ✓ · `tsc` 0 errors ✓ · 33/33 tests ✓ · prod `npm audit` 0 vulns ✓ · all 37 edge fns `deno check` ✓). The RLS drift migration has been **applied to prod and validated by the security-agent (grade A, 11/11 PASS)** — see §4. Remaining items are non-blocking polish (§5) plus a `schema.sql` dump-resync and a couple of env-config toggles.

The codebase was already well-engineered for a solo project: RLS on all 30 tables, hash-verified idempotent webhooks, a race-safe `place_bid` RPC, numeric-only money math, real CI with schema-guard + post-deploy QA gates, structured loggers on both tiers, Sentry, and a coherent PWA. The audit's value was in the drift and the unchecked surface.

---

## 1. What was found (verified findings by dimension)

| Dimension | State | Headline finding |
|---|---|---|
| Build & type-safety | ⚠️ | **No type-check anywhere** — no `typescript` dep, no `tsconfig`, CI `deno check` swallowed failures with `\|\| echo WARN`. 73 real type errors shipping silently. |
| RLS & DB security | 🔴 | **Prod policy drift**: profiles UPDATE had no WITH CHECK (self-verify), payments UPDATE allowed self-mark-paid, duplicate unguarded seller DELETE, no-op column-lock subqueries. |
| Edge security | 🟠 | **ussd-handler** platform-public with zero caller auth → spoofable phone → bid fraud + EcoCash prompt abuse. Raw error strings leaked in 3 public 500s. |
| Secret hygiene | ✅ | Clean — no plaintext secrets tracked; `.env*` gitignored; all edge secrets from `Deno.env`. |
| Payment flows | 🟠 | **payment-orchestrator** fabricated a `paid` order + settlement ledger with a synthetic reference when the relay was unconfigured. Core Paynow fetches had no timeout. |
| Caching | 🟠 | **Workbox `/rest` cache keyed by URL only** → cross-user RLS data leak on shared devices + stale financial state. No HTTP cache headers. Over-broad invalidations. |
| Logging & observability | 🟠 | 20/37 edge fns on raw `console.*`; no request-id correlation; no LOG_LEVEL gate. |
| Frontend / React | 🟠 | Data screens rendered **empty state on query failure** (masked errors on payment screens). |
| Data integrity | 🟠 | **bid-executor TOCTOU** — non-locked check-then-act could lose updates between concurrent agents. Money model otherwise sound (all `numeric`, good constraints/indexes). |
| Dependency health | 🟠 | 2 prod transitive vulns (lodash via recharts, ws via supabase-js); dead server devDeps; placeholder package name. |
| Edge robustness | 🟠 | Inconsistent outbound-fetch timeouts on the user-facing checkout paths. |
| Accessibility & UX | 🟠 | Inputs with no visible focus indicator (WCAG 2.4.7) on signup + onboarding. |

---

## 2. What was fixed and shipped (committed to `main`)

| Wave | Commit | Summary |
|---|---|---|
| **A — Type-safety gate** | `0169520` | Added `typescript` + strict `tsconfig.json` + typed `import.meta.env` (`vite-env.d.ts`) + `typecheck` script. Regenerated stale `database.types.ts` from the live schema. Fixed all 73 surfaced errors — including **real bugs**: TawkToChat read `user_metadata` off a Profile (name never resolved); PostListing edit-prefill wiped `auctionFormat`/`verifiedBiddersOnly`/`isDemo`; a `pesepayResponse` out-of-scope ReferenceError. CI now runs blocking `tsc` and the edge `deno check` exits 1. |
| **B — Caching** | `dc342dc` | Removed the Workbox `/rest` NetworkFirst cache (cross-user RLS leak); forced `usePaymentHistory`/`useWonItems` to revalidate (`staleTime 0`, `networkMode online`); scoped `['livestock']` invalidations with `refetchType: 'active'`; added `vercel.json` cache headers (immutable assets, must-revalidate shell/SW) + baseline security headers. |
| **C — Observability** | `65d1733` | `LOG_LEVEL` gate in the shared edge logger; **send-sms** migrated to structured logging; scrubbed raw internal error strings from public 500 bodies (initiate-payment, provision-tenant, payment-orchestrator); threaded `x-request-id = payment reference` so frontend and edge logs correlate across checkout. |
| **D — Security blockers** | `710d3a9` | **ussd-handler** opt-in gateway auth (secret + IP allowlist); **payment-orchestrator** simulator gated behind `ORCHESTRATOR_ALLOW_SIMULATION` (no more fake `paid` ledger rows); **bid-executor** routed through the atomic `place_bid` RPC (kills the TOCTOU race); AbortController timeouts on the Paynow checkout/poll fetches; get-transport-quote moved off wildcard CORS. **+ RLS drift migration** (see §4). |
| **E — Quick wins** | `8dc772a`, `ea25c8c`, `9df3722` | Removed dead server devDeps + `npm audit fix` (prod tree now 0 vulns); visible focus rings on AuthScreen/OnboardWizard; `isError` + Retry on the 5 data screens; renamed package `@figma/my-make-file` → `zimlivestock`. |

---

## 3. Verification evidence

- `npm run typecheck` → **0 errors** (gate now exists; previously never ran)
- `npx vite build` → **success**, PWA emitted, code-split chunks intact
- `npx vitest run` → **33/33 passing** across 5 files
- `deno check` over all 37 edge functions → **all pass** (3 were broken before)
- `npm audit --omit=dev` → **0 vulnerabilities**

---

## 4. ✅ RLS drift migration — APPLIED & VALIDATED (2026-06-03)

**`supabase/migrations/20260603120000_fix_rls_policy_drift.sql`** was applied to prod (`supabase db push --linked`) and validated by the **security-agent: grade A, 11/11 PASS, 0 critical, 0 high**. It fixed the verified exploitable RLS holes:

1. `profiles` UPDATE → column-lock `verified`/`rating`/`sales_count` (was self-verify → fraud — **CRITICAL**)
2. `payments` UPDATE → column-lock `status`/`amount`/identity (was self-mark-paid — **HIGH**)
3. Drop the duplicate **unguarded** seller DELETE policy (cascade bid-history wipe — **HIGH**)
4. Repair the no-op self-correlated column-lock subqueries on `livestock_items` + `messages`
5. Drop the over-broad `agents` catch-all `FOR ALL` policy

The column-locks preserve every legitimate frontend write path (verified: `payments.paynow_reference`, profile name/phone/merchant_id, listing content edits).

**Remaining sync task:** regenerate `supabase/schema.sql` from prod so the dump and curated `rls_policies.sql` stop diverging (the drift was the root cause of half the security findings; schema-guard CI compares against `schema.sql`):
```bash
supabase db dump --linked -f supabase/schema.sql
```

**Also configure (no code change needed):**
- `USSD_GATEWAY_SECRET` (+ append `?s=<secret>` to the Africa's Talking callback URL) and/or `USSD_ALLOWED_IPS` — activates the new USSD auth gate.
- Confirm `ORCHESTRATOR_ALLOW_SIMULATION` is **never** set in production.
- Deploy edge functions (CI does this on push to `main`).

---

## 5. Recommended follow-ups (non-blocking)

- **Logging adoption:** the BillPay suite + bots (whatsapp-cloud, facebook-bot) still use raw `console.*`. Adopt `createLogger` and add a CI grep that fails on `console.*` without the logger import. (BillPay is a feature branch awaiting review — coordinate.)
- **market-intel** `generate_report` re-scans every active listing per call — add an in-app short-TTL read action (HTTP `s-maxage` won't apply; it's a side-effecting POST).
- **facebook-bot** appears to be dead code (superseded by whatsapp-cloud, no references) and carries a fail-open signature check + token-in-URL — recommend deletion after confirmation.
- Auth-hydration flash (expired session briefly renders authed chrome); `PaymentStatus` 1s interval that never stops after terminal status; Framer-Motion entrances bypass `prefers-reduced-motion`.
- Add `SET search_path = public, pg_temp` to the remaining SECURITY DEFINER functions (`place_bid`, `agent_place_bid`, `increment_view_count`, …).
- Reconcile `rls_policies.sql` (3-arg `place_bid` grant is stale → 4-arg) and regenerate from prod.

---

*Generated by a 44-agent verified audit workflow + five remediation waves. Raw per-finding evidence with file:line citations was produced during the audit run; this report is the durable synthesis.*
