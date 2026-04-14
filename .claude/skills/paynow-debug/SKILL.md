---
name: paynow-debug
description: Diagnose a failing Paynow payment flow. Use when the user says "paynow broken", "payment failing", "debug paynow", or reports a specific transaction stuck/errored.
---

Walk the Paynow payment flow end-to-end and isolate where it breaks. Don't guess — check each layer.

If `$ARGUMENTS` contains a reference/poll URL/phone number, narrow to that transaction.

## Layer checklist (top to bottom)

### 1. Mode detection
- Is `PAYNOW_INTEGRATION_ID` / `PAYNOW_INTEGRATION_KEY` set in Supabase Edge Function secrets?
- If unset → running in **simulation mode**. Confirm the user expected that.
- Check `initiate-payment` function logs for `[SIM]` prefix.

### 2. Request shape
Paynow expects form-encoded, not JSON. Check the outgoing body in the browser-relay or edge function:
- `id`, `reference`, `amount`, `additionalinfo`, `returnurl`, `resulturl`, `authemail`
- `hash` computed last from all other fields + integration key, uppercase SHA512.

### 3. Cloudflare / transport
Paynow's API has intermittently blocked Supabase egress via Cloudflare. Symptoms: 403 HTML page instead of form response, or TLS reset.
- If server-to-server is failing, verify the **browser-relay** path is what's actually running.
- `curl -v https://www.paynow.co.zw/interface/initiatetransaction` from local — if it returns 403, it's CF, not us.

### 4. Test phone expectation
- `0771111111` → success (both webhook + poll will flip to Paid)
- `0772222222` → delayed (flip after ~20s, exercises poll fallback)
- `0773333333` → user-cancelled
- `0774444444` → insufficient funds
If the user is testing with a real number and seeing "cancelled", it's user behavior, not a bug.

### 5. Confirmation path
Two independent channels — both must be wired:
- **Webhook** → `payment-webhook` Edge Function. Check logs for the transaction's `reference`.
- **Poll URL** → `poll-payment` Edge Function, called client-side on an interval (active fallback, commit `f19aba4`).

Race condition: whichever confirms first wins, the other must be idempotent. Check `payments.reference` unique constraint + idempotency key logic.

### 6. DB state
```sql
select id, reference, status, method, created_at, updated_at
from payments
where reference = '<REF>' order by updated_at desc;
```
And the ledger:
```sql
select event, payload, created_at
from settlement_ledger
where payment_order_id = '<UUID>' order by created_at;
```

### 7. RLS
If inserts are silently failing: check `rls_policies.sql` for `payments` INSERT policy. Service-role bypass is expected inside edge functions; client-side writes should route through RPC only.

## Output format

- **What's broken:** one-line summary.
- **Evidence:** logs/DB rows/curl output that proves it.
- **Fix:** concrete change, with file:line where applicable.
- **Verification:** the exact command/flow to confirm the fix.
