# Contributing — Merge Policy & CI Gates

This repo runs a deliberately strict CI pipeline. The goal isn't to slow you down — it's to make it **structurally impossible** to merge code that breaks data integrity, opens a security hole, or regresses against a passing concurrency test. If you're hitting a gate, the gate is doing its job; this doc explains how to satisfy it (or override it when truly necessary).

## Pipeline overview

Every push and PR runs (in order):

1. **Schema Guard** — diffs `supabase/schema.sql` + `supabase/rls_policies.sql` against `origin/main`. Fails if any RLS policy, CHECK constraint, FK, or table is removed without explicit override.
2. **Frontend Build** — `vite build`. Fails on TS errors or build errors.
3. **Edge Functions Check** — `deno check` on every `supabase/functions/*/index.ts`. Warnings logged, hard errors fail.
4. **Deploy Edge Functions** *(main only)* — pushes Supabase functions to prod.
5. **Deploy Frontend** *(main only)* — `vercel deploy --prod`.
6. **Post-Deploy QA** *(main only)* — three suites against live prod, all hard-stop on the rules below.

## Hard-stop rules

A merge / push to main is rejected if any of the following is true after the deploy.

### Schema Guard
| Removed line type | Result |
|---|---|
| `create policy ...` | ❌ FAIL |
| `create table ...` | ❌ FAIL |
| `CHECK (...)` | ❌ FAIL |
| `references ...` (FK clause) | ❌ FAIL |
| `enable row level security` | ❌ FAIL |

**Override:** add `[force-schema]` to any commit message in the PR/push. The token is intentional ceremony — it documents the destructive intent in `git log` forever, and reviewers can grep for it.

```bash
git commit -m "refactor(schema): drop legacy bid_log table [force-schema]"
```

### Consistency Checker
Runs the `consistency-checker` edge function. Hard fails on:
- `summary.health == "critical"`

The checker covers: orphaned bids, double payments, sold-without-payment, missing settlement ledger entries, agent bid references, etc. If it goes critical, **prod data is in a broken state** — investigate before next push.

### Security Agent
Runs the `security-agent` edge function. Hard fails on **any** of:
- `summary.security_grade == "F"`
- `summary.critical_failures != 0`
- Any individual test where `status == "fail"` AND `severity == "high"`

Low-severity failures are allowed but logged in CI output for review. Critical-severity tests cover RLS isolation (anon can't read/write user data), payment cap constraints, and similar load-bearing guarantees.

### Chaos Test
Runs the `chaos-test` edge function with `scenario: all`. Hard fails on:
- Any `summary.failed > 0`
- Any `status: warn` whose message does NOT match the allowlist (currently `(?i)no listings|fixture`)

If your change introduces a new benign warning pattern (e.g. a new test that warns when a fixture is unavailable), update the allowlist in `.github/workflows/ci.yml` in the same PR. Warnings should never be silent.

## Override mechanics

There is exactly one CI-level override: `[force-schema]` in a commit message, applies only to Schema Guard. There is no override for the integrity / security / chaos gates — if those fail, **fix the underlying issue**. Bypassing them defeats the entire point of the gate.

If you're stuck and believe a gate is wrong, open an issue describing the false positive and tag a maintainer rather than disabling the gate.

## Local development

Run the schema guard locally before pushing:

```bash
bash scripts/schema-guard.sh                  # diff vs origin/main
BASE_REF=origin/develop bash scripts/schema-guard.sh   # diff vs other base
```

Run the QA suite manually (requires `CRON_SECRET` env var, see `.env.local`):

```bash
# Use the /qa skill if you have Claude Code, or directly:
curl -s -X POST "https://hmeieslclzycyjjjflfh.supabase.co/functions/v1/consistency-checker" \
  -H "Authorization: Bearer $CRON_SECRET" -d '{}' | jq

curl -s -X POST "https://hmeieslclzycyjjjflfh.supabase.co/functions/v1/security-agent" \
  -H "Authorization: Bearer $CRON_SECRET" -d '{}' | jq

curl -s -X POST "https://hmeieslclzycyjjjflfh.supabase.co/functions/v1/chaos-test" \
  -H "Authorization: Bearer $CRON_SECRET" -d '{"scenario":"all"}' | jq
```

## What's intentionally NOT a gate (yet)

- **Pre-merge QA against a preview deployment** — currently QA only runs *after* merge to main, against prod. Catching regressions one commit later is the trade-off until we have isolated per-PR Supabase projects.
- **Performance regression detection** — no historic baseline yet. Coming when we have ≥30 days of latency data.
- **Nightly extended chaos** (50 concurrent bids, ledger reconciliation) — planned, not yet wired.
- **Branch protection on `main`** — must be configured manually in GitHub Settings → Branches → Protection rule for `main`. Recommended:
  - Require status checks: `Schema Guard`, `Frontend Build`, `Edge Functions Check`, `Post-Deploy QA`
  - Require linear history
  - No force pushes

## Why these gates exist

This isn't theoretical paranoia. Today (2026-04-13) the consistency-checker caught a real data-integrity bug introduced by a seed script — `livestock_items.current_bid` didn't match `MAX(bids.amount)` — within 8 seconds of the deploy completing, and failed CI. The same gate just shipped also caught (during yesterday's enterprise audit):

- A direct-INSERT bypass on the `bids` table that let any user win an auction for $1
- A CORS wildcard fallback on the user-facing payment endpoint
- A search bug that returned wrong results across paginated pages

If gates feel inconvenient, remember that the alternative is users finding these in production.
