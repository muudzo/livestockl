# ZimLivestock — Production Readiness (2026-06-22)

A current, grounded "what's between us and fully production-ready" assessment.
Supersedes the dated `ENTERPRISE_PRODUCTION_AUDIT_2026-06-03.md` / `LAUNCH_READINESS_REPORT.md`
for the items below (those remain valid for everything not restated here).

**Verdict: close.** The app is already deployed with a strong CI/CD pipeline,
RLS, Sentry, and post-deploy security/chaos/consistency gates. What remains is
(1) shipping this session's security fixes to prod, (2) raising test depth, and
(3) a handful of standard hardening items. None are architectural rewrites.

---

## Already solid (don't redo)
- **CI/CD**: schema-guard, frontend build+typecheck, `deno check` on all 38 edge
  functions, auto-deploy (Supabase + Vercel), and post-deploy QA gates
  (consistency / security-agent grade gate / chaos).
- **Security baseline**: RLS on core tables, webhook signature verification
  (Paynow SHA-512 + Stripe), idempotency keys on bids/payments, no tracked secrets.
- **Ops**: Sentry wired, structured logging, ErrorBoundary, PWA offline shell.

## Fixed this session (committed to `main`)
| Area | Fix |
|------|-----|
| 🔴 Sec | `profiles` PII (email/phone/merchant id) column-locked; owner-only RPC |
| 🟠 Sec | CORS allowlist on 7 user-facing edge functions (was `*`) |
| 🔴 Sec | `react-router` 7.13.0 → 7.18.0 (RCE/XSS/open-redirect/CSRF/DoS); `npm audit` 0 |
| 🟢 Quality | ESLint + Prettier + coverage tooling; CI now runs **lint + tests** |
| 🟢 Quality | Removed all dead code (24 → 10 lint warnings) |

---

## Gaps to fully production-ready

### P0 — do before relying on this session's security work
1. **Deploy the pending DB migration.** `supabase/migrations/20260622120000_profiles_pii_protection.sql`
   is committed but **not applied**. Run `supabase db push --linked`, then confirm
   the security-agent still reports grade A.
2. **Set `ALLOWED_ORIGIN`** in the edge-function env (prod + preview). The CORS-tightened
   functions will reject browser calls until this is set — same var the existing
   helper-based functions already depend on.

### P1 — depth & confidence
3. **Test coverage is ~16.7%** (config only measures `src/hooks` + `src/stores`).
   Raise it and add a CI threshold. Prioritize payment/bid/auth paths. Set
   `coverage.thresholds` in `vite.config.ts` and gate in CI.
4. **No end-to-end tests.** Add Playwright for the critical journeys
   (browse → bid → win → pay; auth/OTP; post-listing). The `e2e-testing` /
   `browser-qa` skills are now available to scaffold these.
5. **Rate limiting** exists only on `send-sms` (1 of 38 functions). Add throttling
   to public/expensive endpoints (payment init, lead submit, agent runs).

### P2 — standard hardening
6. **Dependency automation.** No Dependabot/Renovate — the react-router CVE above
   is exactly what it would have caught. Add `.github/dependabot.yml` (npm weekly).
7. **Ratchet lint to zero.** 10 warnings remain: 7 benign `react-refresh` constant
   exports in `ui/`, **3 `react-hooks/exhaustive-deps`** worth reviewing as possible
   stale-closure bugs. Then set `eslint . --max-warnings=0` in CI.
8. **Formatting.** Prettier is configured but the existing tree isn't formatted;
   `format:check` is intentionally not yet a CI gate. Apply `npm run format` in a
   dedicated commit, then enable the gate.
9. **Accessibility pass** with `frontend-a11y` (forms, focus, ARIA on the auction UI).
10. **DR/backups**: confirm Supabase PITR/backup cadence and a documented restore drill.
11. **Secrets rotation** policy for Paynow/Stripe/BillPay/CRON_SECRET.

### Reference (from prior reports, still open)
- Load & concurrency hardening (prior score 5.5/10) and Zimbabwe real-world
  conditions — offline/retry/2G resilience (prior 3.5/10). See `LAUNCH_READINESS_REPORT.md`.

---

## Suggested order
P0 (deploy migration + set env) → P1 #3/#4 (coverage + E2E on payment path) →
P2 #6/#7 (dependabot + lint-zero) → remaining hardening.
