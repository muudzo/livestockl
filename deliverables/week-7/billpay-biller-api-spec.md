# ZimLivestock BillPay Biller API — Specification

> Version: 1.0 · Status: pre-production · Audience: Paynow BillPay engineering
> Companion: [billpay-biller-template.md](billpay-biller-template.md)

ZimLivestock exposes a single HTTPS endpoint that handles all three required
operations (`member`, `pay`, `status`). The action is selected by an
`action=` query parameter for `GET` and a `"action":` field in the JSON
body for `POST`.

---

## 0. Connection details

| | Value |
|---|---|
| Base URL | `https://hmeieslclzycyjjjflfh.supabase.co/functions/v1/billpay-biller-inbound` |
| Protocol | HTTPS only — TLS 1.2+ |
| Content-Type | `application/json` (request and response) |
| Auth | HTTP Basic — `Authorization: Basic base64(username:password)` |
| IP Allowlist | Optional — set on our side via `BILLPAY_BILLER_ALLOWED_IPS`. Paynow to supply egress IPs. |
| Timeout | 30 seconds (Supabase Edge Function default) |

All responses are JSON with a top-level `status` field that takes one of:

| `status` | Meaning |
|---|---|
| `Authorized` | Member resolved, ready to pay |
| `Paid` | Payment settled (terminal-success) |
| `AlreadyPaid` | Member already settled (idempotent / conflict) |
| `Pending` | Payment created but not yet finalised |
| `Failed` | Validation / business-rule failure |
| `NonExistent` | Member or reference not found |
| `Unknown` | Internal mapping fallback (should not occur) |

HTTP status codes follow REST conventions:
`200` success · `400` bad request · `401` auth · `404` not found · `409` conflict · `500` internal.

---

## 1. Get Member Details

Look up an auction reference and return the member name and amount due.

### Request

```
GET /billpay-biller-inbound?action=member&member=ZL-AUTO-MOWHCJ9J-HEPJ
Authorization: Basic <base64>
```

### Response — success (200)

```json
{
  "status": "Authorized",
  "member": "ZL-AUTO-MOWHCJ9J-HEPJ",
  "name": "Brahman Bull",
  "amountDue": 0.05,
  "currency": "USD"
}
```

### Response — already paid (200)

```json
{
  "status": "AlreadyPaid",
  "member": "ZL-AUTO-MOWHCJ9J-HEPJ",
  "name": "Brahman Bull",
  "amountDue": 0,
  "currency": "USD"
}
```

### Response — not found (404)

```json
{
  "status": "NonExistent",
  "member": "ZL-AUTO-NOPE-1234",
  "error": "Reference not found"
}
```

### Response — auth failure (401)

```json
{ "status": "Failed", "error": "Unauthorized" }
```

---

## 2. Post a Payment

Settle a payment for a previously-resolved member. **Idempotent on
`paynowReference`** — a duplicate POST returns the original response.

### Request

```
POST /billpay-biller-inbound
Authorization: Basic <base64>
Content-Type: application/json

{
  "action": "pay",
  "member": "ZL-AUTO-MOWHCJ9J-HEPJ",
  "amount": 0.05,
  "currency": "USD",
  "paynowReference": "PAYNOW-BILLPAY-987654321"
}
```

### Response — success (200)

```json
{
  "status": "Paid",
  "reference": "ZL-AUTO-MOWHCJ9J-HEPJ",
  "billerReference": "PAYNOW-BILLPAY-987654321",
  "amountPaid": 0.05,
  "currency": "USD"
}
```

### Response — idempotent retry (200)

Identical to the success response above. Both the body and `200` status code
are stable across retries with the same `paynowReference`.

### Response — amount mismatch (400)

```json
{
  "status": "Failed",
  "error": "Amount mismatch",
  "expected": 0.05,
  "got": 0.10
}
```

### Response — reference not found (404)

```json
{
  "status": "NonExistent",
  "error": "Reference not found"
}
```

### Response — already settled by a *different* transaction (409)

```json
{
  "status": "AlreadyPaid",
  "error": "Reference already settled by a different transaction"
}
```

### Response — settlement race / unexpected state (409)

```json
{
  "status": "Failed",
  "error": "Settlement race — payment in unexpected state"
}
```

This indicates two concurrent settlement attempts; safe to retry the same
`paynowReference` — it will resolve to the winning attempt.

### Response — missing required field (400)

```json
{
  "status": "Failed",
  "error": "Missing member, amount, or paynowReference"
}
```

---

## 3. Get Payment Status

Poll the status of a previously-posted payment using **our reference**.

### Request

```
GET /billpay-biller-inbound?action=status&reference=ZL-AUTO-MOWHCJ9J-HEPJ
Authorization: Basic <base64>
```

### Response — paid (200)

```json
{
  "status": "Paid",
  "reference": "ZL-AUTO-MOWHCJ9J-HEPJ",
  "billerReference": "PAYNOW-BILLPAY-987654321",
  "amount": 0.05,
  "currency": "USD",
  "updatedAt": "2026-05-08T05:34:12.563Z"
}
```

### Response — pending (200)

```json
{
  "status": "Pending",
  "reference": "ZL-AUTO-MOWHCJ9J-HEPJ",
  "billerReference": null,
  "amount": 0.05,
  "currency": "USD",
  "updatedAt": "2026-05-08T05:34:00.000Z"
}
```

### Response — non-existent (404)

```json
{
  "status": "NonExistent",
  "reference": "ZL-AUTO-NOPE-1234"
}
```

---

## 4. Errors — common shape

Every error response contains `status: "Failed"` (or one of the terminal
states above) and a human-readable `error` field. Error responses never
include stack traces, internal IDs, or system-level messages — they are
designed to be safe to log on Paynow's side without leaking detail about
ZimLivestock's internals.

---

## 5. Test Fixtures

The following test references are available in the live database and will
remain there for Paynow's integration testing. They are penny-range (≤ $0.05)
and prefixed `DEMO`/`ZL-AUTO`.

| Member reference | Auction title | Amount | State |
|---|---|---:|---|
| `ZL-AUTO-DEMO-PENDING` | DEMO 7AM · Brahman Bull | $0.02 | `Pending` — ready to settle |
| `ZL-AUTO-DEMO-PAID` | DEMO 7AM · Boer Goat | $0.03 | `Paid` — for idempotency tests |
| `ZL-AUTO-NOPE-1234` | n/a | — | `NonExistent` — for 404 tests |

> Refresh contact: `dev@paynow.co.zw` to rotate fixtures or seed scenario-specific
> references (e.g. failed payments, partial-amount edge cases).

---

## 6. Idempotency contract

ZimLivestock's `POST /pay` is idempotent on the `paynowReference` field:

- A duplicate POST with the same `paynowReference` returns the original
  `200 Paid` response, byte-for-byte (modulo timestamp drift).
- Enforced at the database layer by a partial unique index on
  `payments.paynow_reference` (where `method = 'BillPay'`).
- Concurrent settlement attempts (two POSTs racing for the same `member`
  with *different* `paynowReference` values) → first one wins, second one
  receives `409 AlreadyPaid`. Retrying with the original `paynowReference`
  is safe and idempotent.

This satisfies BillPay's "idempotent PAY endpoint" requirement, so
`Get Payment Status` is *beneficial* for reconciliation but not required to
recover from communication failures.

---

## 7. Audit / reconciliation

Every inbound call lands in the `billpay_inbound_log` table with the full
request payload, response payload, HTTP status code, and remote IP. Paynow
can request a date-range CSV export at any time via
`dev@paynow.co.zw`. A self-serve `GET /history` endpoint is on the roadmap
for v1.1.

---

## 8. Versioning

This is `v1.0` of the ZimLivestock biller API. Breaking changes will increment
the major version and ship behind a new `/v2/` path; we will give Paynow
≥ 30 days of overlap on `/v1` deprecation. Additive changes (new optional
fields, new actions) ship in-place under `v1.x`.
