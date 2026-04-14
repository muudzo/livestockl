---
name: rls-audit
description: Audit Row Level Security policies for bypass, privilege escalation, and direct-write gaps. Use when the user says "rls audit", "security check", or before any schema/policy change.
---

Run both the automated security agent and a targeted manual review. RLS bugs have been SEV-1 on this project (bids direct-INSERT bypass, commit `bf3da08`) — this skill exists to prevent recurrence.

If `$ARGUMENTS` names a table, narrow the audit to it. Otherwise audit the hot surfaces: `bids`, `payments`, `agent_payment_orders`, `settlement_ledger`, `agents`, `agent_goals`, `messages`, `favorites`.

## Step 1 — automated suite

```bash
curl -s -X POST "https://hmeieslclzycyjjjflfh.supabase.co/functions/v1/security-agent" \
  -H "Content-Type: application/json" -d '{}'
```

All 11 tests must pass. If any fail, stop and report — don't proceed to manual review until the automated floor is clean.

## Step 2 — delegate to the specialist

Spawn the `rls-auditor` sub-agent against `supabase/rls_policies.sql` + `supabase/schema.sql`. That agent has the deep policy-parsing logic.

## Step 3 — manual review against the SEV-1 pattern

For each target table, check **all four** write paths, not just the ones the app uses today:

1. **INSERT** — is there an explicit policy? Or does it fall through to permissive? The `bids` SEV-1 was a direct INSERT bypass because the app only wrote via `place_bid()` RPC but nothing stopped a client from calling `.from('bids').insert()`.
2. **UPDATE** — can a user update rows they don't own? Check `USING` AND `WITH CHECK` — `WITH CHECK` gates the post-state, `USING` gates the pre-state. Missing `WITH CHECK` is a common escalation path.
3. **DELETE** — usually should be restricted to owner or forbidden entirely for audit tables (`settlement_ledger`, `agent_activity_log`).
4. **SELECT** — does the anon role see rows it shouldn't? Payment references, user emails, private messages.

## Step 4 — RPC vs direct-table policy

If the app uses an RPC (e.g., `place_bid`) but the underlying table still has permissive RLS, clients can skip the RPC. **The RPC is not the gate — the policy is.** For each RPC, confirm the table policy is strict enough that bypassing the RPC gains nothing.

## Step 5 — cross-check with schema

```sql
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, cmd;
```

Any table without a policy for each of (INSERT, UPDATE, DELETE) is a red flag — Supabase defaults deny, but if RLS isn't enabled on the table at all, there's no gate.

Verify RLS is enabled everywhere:
```sql
select tablename from pg_tables
where schemaname='public' and rowsecurity = false;
```

## Output format

- **Critical (SEV-1 class):** direct-write bypass, anon read of sensitive data, missing `WITH CHECK`.
- **High:** over-permissive policies, missing DELETE restriction on audit tables.
- **Medium:** style/consistency issues, redundant policies.
- **Passed:** what you checked and confirmed safe.

End with a grade and whether it's safe to merge the change under review.
