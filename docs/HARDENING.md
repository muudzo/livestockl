# Hardening — post-session tech ops follow-up

**Context.** Session 2026-04-16 shipped agent autonomy (buyer-agent → auction-sniper → payment-orchestrator → EcoCash Express via CF Worker relay). Along the way we hit 8 classes of bug. This doc captures what we hardened immediately and what's still owed.

---

## Shipped in the follow-up commit

| Guardrail | Where | Effort | Recurrence class addressed |
|---|---|---|---|
| `_shared/money.ts` + Deno tests | [money.ts](../supabase/functions/_shared/money.ts) · [money_test.ts](../supabase/functions/_shared/money_test.ts) | 15m | Rounding math on penny amounts (c8b9a3a) |
| win-detector surfaces inner payment failures | [win-detector/index.ts:126-135](../supabase/functions/win-detector/index.ts#L126-L135) | 15m | Edge-fn → edge-fn auth swallowed silently |
| `supabase/config.toml` pins `verify_jwt = false` per function | [supabase/config.toml](../supabase/config.toml) | 15m | `--no-verify-jwt` flag drift on redeploy |
| Orchestrator screams on missing relay env | [payment-orchestrator/index.ts](../supabase/functions/payment-orchestrator/index.ts) | 15m | Silent fallback to simulator when relay unset |

Each one closes a whole bug class, not just the incident that exposed it.

---

## Remaining debt — ranked

### 1. Centralized `insert()` wrapper with `.throwOnError()` (1h)

**The trap.** `supabase-js` silently drops insert failures unless you opt in. During the session we added `live_paynow_*` events to `settlement_ledger` — they never landed because the table's CHECK constraint rejected the new values. We only noticed after several ops cycles.

**Fix.** Create `supabase/functions/_shared/db.ts`:

```ts
export async function safeInsert<T>(client: any, table: string, row: T) {
  const { data, error } = await client.from(table).insert(row).select().single();
  if (error) throw new Error(`insert ${table} failed: ${error.message}`);
  return data;
}
```

Sed-replace 11 call sites in `payment-orchestrator/index.ts` (lines 259, 371, 392, 422, 477, 485, 526, 536) + the debug inserts elsewhere.

**Alternative** (cheaper but noisier): suffix every critical `.insert(...)` with `.throwOnError()`.

---

### 2. Schema drift CI check (1h)

**The trap.** `schema.sql` diverges from the live DB silently. During the session:
- `agent_bids.status` column used by `win-detector` wasn't declared
- `settlement_ledger_event_check` CHECK constraint existed in DB but not in the file
- When I dropped and re-added the CHECK, I had to discover the existing value list empirically

**Fix.** Add `.github/workflows/schema-drift.yml`:

```yaml
name: schema drift
on: [schedule: { cron: "0 4 * * *" }]
jobs:
  diff:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase link --project-ref hmeieslclzycyjjjflfh
      - run: |
          supabase db diff --linked --schema public > drift.sql
          if [ -s drift.sql ]; then
            echo "::error::live DB diverges from schema.sql"
            cat drift.sql
            exit 1
          fi
```

Runs nightly. Failure notifies — doesn't block deploys. Eliminates silent drift without disrupting rapid iteration.

---

### 3. End-auctions cron heartbeat (1h)

**The trap.** During the session, 10 agent auctions sat past `end_time` in `status = 'active'`. Had to `UPDATE` manually to proceed. The scheduled pg_cron entry may not exist, or the function silently failed.

**Fix.** Extend the existing `consistency-checker` function (Post-Deploy QA job) with:

```ts
const { data: stuck } = await supabase
  .from("livestock_items")
  .select("id, title, end_time")
  .eq("status", "active")
  .lt("end_time", new Date(Date.now() - 2 * 60_000).toISOString());

if (stuck?.length) {
  return { status: "fail", message: `${stuck.length} auctions stuck past end_time`, items: stuck };
}
```

Fails the nightly chaos run if any auction is stuck for > 2 min past expiry.

---

### 4. Secret drift verification in CI (1h)

**The trap.** `CRON_SECRET` diverged across `.env.local`, Supabase secrets, GH Actions. Chaos-test job 401'd once during the session; we rotated by hand.

**Fix.** Add `scripts/verify-secrets.sh` — hits `end-auctions` with the local `CRON_SECRET` and asserts HTTP 200:

```bash
#!/usr/bin/env bash
set -e
: "${CRON_SECRET:?unset}" "${SUPABASE_PROJECT_REF:?unset}"
CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1/end-auctions" \
  -H "Authorization: Bearer ${CRON_SECRET}")
if [ "$CODE" != "200" ] && [ "$CODE" != "204" ]; then
  echo "::error::CRON_SECRET mismatch — end-auctions returned $CODE"
  exit 1
fi
```

Call from `ci.yml` before the Post-Deploy QA job. Fails the build on mismatch.

---

### 5. CF Worker relay observability (1h)

**The trap.** The relay is a single point of failure. If it goes down, every agent settlement attempts the direct path → simulator fallback → silent "paid" lies.

**Fix (minimum).** Log `live_paynow_blocked` events to Slack via webhook. In `_shared/logger.ts`:

```ts
if (event === "live_paynow_blocked" && Deno.env.get("SLACK_OPS_WEBHOOK")) {
  fetch(Deno.env.get("SLACK_OPS_WEBHOOK")!, {
    method: "POST",
    body: JSON.stringify({ text: `Paynow relay blocked: ${details.error}` }),
  }).catch(() => {}); // fire-and-forget; don't block the response
}
```

**Fix (nice-to-have).** Deploy a second relay to Deno Deploy as a hot standby. Orchestrator tries primary → falls back to secondary → only then to simulator.

---

### 6. Post-demo secret rotation (5m)

`CRON_SECRET` + `PAYNOW_RELAY_SECRET` both passed through chat this session. Rotate:

```bash
NEW_CRON=$(openssl rand -hex 32)
NEW_RELAY=$(openssl rand -hex 32)

supabase secrets set CRON_SECRET="$NEW_CRON" PAYNOW_RELAY_SECRET="$NEW_RELAY" \
  --project-ref hmeieslclzycyjjjflfh
gh secret set CRON_SECRET --body "$NEW_CRON" --repo tatenda-source/livestockl
cd paynow-relay && ./node_modules/.bin/wrangler secret put RELAY_SECRET  # paste $NEW_RELAY
```

Then update `.env.local` and restart the dev server.

---

## The patterns worth remembering

Each class of bug in this session maps to one of five meta-patterns. Any future fix should ask "which pattern?" and pick the corresponding guardrail.

| Pattern | Example from session | Guardrail shape |
|---|---|---|
| Silent API behaviour | `.insert()` swallows CHECK violation | Wrapper that throws |
| Config drift across environments | `CRON_SECRET` mismatch | Verify-in-CI script |
| File → live DB drift | `schema.sql` missing CHECK | Nightly diff job |
| CLI flag drift | `--no-verify-jwt` lost on redeploy | Pin in `config.toml` |
| Inner failure hidden by outer 200 | win-detector 200 with payment 401 | Assert inner status, throw |

---

## Out of scope for this doc

- Paynow API improvements (covered in `deliverables/week-5/ecosystem-integration-retrospective.md`)
- Agent fairness / anti-griefing (separate design doc needed)
- Multi-region relay (not justified until we have > 1 demo deployment)
