# Payment Test Results

**Project:** Mimoo (formerly ZimLivestock) — Paynow DX Evaluation Prototype
**Date:** April 9, 2026
**Tester:** Tatenda Nyemudzo
**Environment:** Supabase Edge Functions (Deno) + React 18 Frontend

---

## 1. Test Infrastructure

### Edge Functions Deployed (18 total)

| Function | Purpose |
|---|---|
| `initiate-payment` | Payment creation (Paynow Express/Web + Stripe) |
| `payment-webhook` | Callback handler (Paynow + Stripe) |
| `payment-orchestrator` | Auto-retry with EcoCash -> OneMoney -> Card fallback |
| `billpay` | BillPay AUTH + PAY (ZESA, Airtime, Council, Universities) |
| `billpay-status` | Polling with spec-compliant intervals (120s/180s/600s) |
| `billpay-reconcile` | Cron background reconciliation (every 2min) |
| `billpay-reverse` | Payment reversals with error code handling |
| `test-stripe-checkout` | Stripe sandbox test |
| `test-paystack-checkout` | Paystack sandbox test |
| `test-flutterwave-checkout` | Flutterwave sandbox test |
| `test-pesepay-checkout` | Pesepay sandbox test |

### Test Components

5 provider-specific test pages + 1 BillPay test harness with 8 automated test cases.

---

## 2. Paynow Payment Flow Tests

### 2.1 EcoCash Mobile Money (Express Checkout)

| Test Case | Expected | Result | Notes |
|---|---|---|---|
| Valid payment (0771234567, US$1.00) | USSD prompt sent to phone | PASS (simulation) | Returns poll URL for status checking |
| Invalid phone format (123) | Validation error | PASS | Client-side regex blocks submission |
| Phone format (07XXXXXXXX) | Accepted | PASS | 10-digit Zimbabwe format enforced |
| USSD timeout (no response) | Pending -> instructions shown | PASS | "Dial *151# if you missed USSD prompt" displayed |
| Insufficient balance | Failure status | PASS (simulation) | Error: "Insufficient balance in EcoCash wallet" |

### 2.2 OneMoney Mobile Money

| Test Case | Expected | Result | Notes |
|---|---|---|---|
| Valid payment (0713456789, US$1.00) | USSD prompt sent | PASS (simulation) | Slower network (~4-10s delivery) |
| Network timeout | Fallback to retry | PASS | Orchestrator retries with +10% success boost |

### 2.3 Card/Web Checkout

| Test Case | Expected | Result | Notes |
|---|---|---|---|
| Card payment initiation | Redirect to Paynow hosted page | PASS | Falls back to browser form if Cloudflare blocks |
| Cloudflare blocking | Fallback form submission | PASS | Browser-relay pattern bypasses server-side block |

### 2.4 Webhook Handling

| Test Case | Expected | Result | Notes |
|---|---|---|---|
| Status "Paid" callback | Payment marked complete, item sold | PASS | SHA-512 hash verified, buyer/seller notified |
| Status "Cancelled" callback | Payment marked failed | PASS | User shown failure state |
| Status "Failed" callback | Payment marked failed | PASS | |
| Invalid hash | 403 Forbidden | PASS | Prevents spoofed callbacks |
| Duplicate callback (idempotent) | No double-processing | PASS | `maybeSingle()` + status check prevents duplicates |
| Stripe webhook (checkout.session.completed) | Payment completed | PASS | Stripe-Signature header routing works |
| Stripe webhook (checkout.session.expired) | Payment failed | PASS | |

### 2.5 Payment Orchestrator (Agent Auto-Pay)

| Test Case | Expected | Result | Notes |
|---|---|---|---|
| First attempt EcoCash | ~70% success rate | PASS (simulation) | Realistic failure simulation |
| Retry after failure | +10% success boost per attempt | PASS | Capped at +20% total |
| EcoCash fail -> OneMoney fallback | Automatic method switch | PASS | Seamless provider chain |
| All methods fail -> Card fallback | Final fallback attempt | PASS | ~80% card success rate |
| Daily limit exceeded | Descriptive error | PASS | "Transaction declined - daily limit exceeded" |

---

## 3. Competitor Payment Provider Tests

### 3.1 Stripe

| Test Case | Expected | Result | Notes |
|---|---|---|---|
| Card 4242424242424242, US$10 | Checkout session created, redirect | PASS | 18-second integration time |
| Session expired | Failure callback | PASS | checkout.session.expired event |
| Test card (any expiry/CVC) | Accepted | PASS | Sandbox fully functional |

### 3.2 Paystack

| Test Case | Expected | Result | Notes |
|---|---|---|---|
| Card 4084084084084081, US$10 | Redirect to Paystack page | PASS | Clean SDK, fast integration |
| Expiry 12/30, CVV 408 | Accepted | PASS | Test credentials work reliably |

### 3.3 Flutterwave

| Test Case | Expected | Result | Notes |
|---|---|---|---|
| Card 5531886652142950, US$10 | Redirect to Flutterwave modal | PASS | Requires PIN + OTP |
| PIN 3310, OTP 12345 | Payment completes | PASS | Multi-step verification works |

### 3.4 Pesepay

| Test Case | Expected | Result | Notes |
|---|---|---|---|
| EcoCash/OneMoney/Card, US$10 | Redirect to Pesepay checkout | PASS | Supports local mobile money |
| No hardcoded test cards | Requires dashboard credentials | N/A | Less developer-friendly sandbox |

---

## 4. BillPay Integration Tests

### 4.1 AUTH (Account Verification)

| Test Case | Account | Amount | Result | Notes |
|---|---|---|---|---|
| ZESA valid account | 37132567431 | US$20.00 | PASS | Returns reference + member details |
| Airtime valid | 0771234567 | US$5.00 | PASS | Phone number as account |
| Council account (COH) | 12345 | US$50.00 | PASS | AuthAmountMandated: false |
| Invalid account format | abc | - | PASS | Validation error returned |

### 4.2 PAY (Payment Processing)

| Test Case | Prefix | Expected | Result | Notes |
|---|---|---|---|---|
| Normal payment | (none) | Success + voucher | PASS | Same reference from AUTH required |
| Payment failure | PF | Failed status | PASS | Error message displayed |
| Pending/processing | PP | BeingProcessed | PASS | Status polling triggered |
| Flagged payment | PFF | Flagged status | PASS | Slow polling (30s intervals) |
| Same-reference validation | - | AUTH ref === PAY ref | PASS | Critical spec requirement verified |

### 4.3 Status Polling

| Test Case | Expected | Result | Notes |
|---|---|---|---|
| First check at 120s | Spec-compliant delay | PASS | AbortController with 60s timeout |
| Subsequent at 180s intervals | Correct interval | PASS | |
| Flagged at 600s intervals | Slower polling | PASS | |
| Auto-resolve after 3 checks | Transitions to paid | PASS (simulation) | |
| 10+ checks escalation | Auto-flag as "flagged" | PASS | Prevents infinite polling |

### 4.4 Reconciliation (Background Cron)

| Test Case | Expected | Result | Notes |
|---|---|---|---|
| Cron runs every 2min | Advisory lock prevents overlap | PASS | `pg_try_advisory_xact_lock(43)` |
| Stale payments re-checked | Status updated | PASS | Max 20 payments per run |
| Network error during check | Re-queued for next run | PASS | Graceful degradation |

### 4.5 Reversals

| Test Case | Expected | Result | Notes |
|---|---|---|---|
| Reverse paid payment | Code 0 (success) | PASS | |
| Reverse already-reversed | Code 5 (already refunded) | PASS | |
| Biller doesn't support | Code 4 | PASS | |
| Reverse pending payment | Rejected (only paid/flagged) | PASS | |

---

## 5. Error Handling & Edge Cases

### 5.1 Network Failures

| Scenario | Behavior | Result |
|---|---|---|
| Cloudflare blocks Paynow API | Browser-relay fallback form | PASS |
| Network timeout during BillPay PAY | Marked "being_processed", auto-reconciled | PASS |
| Edge Function timeout (>60s) | AbortController cancels, returns current state | PASS |

### 5.2 Concurrent Operations

| Scenario | Behavior | Result |
|---|---|---|
| Duplicate payment initiation | Checks for existing paid payment first | PASS |
| Concurrent webhook callbacks | Idempotent processing (maybeSingle) | PASS |
| Concurrent reconciliation runs | Advisory lock prevents overlap | PASS |

### 5.3 User Experience During Payment

| Scenario | Behavior | Result |
|---|---|---|
| Payment pending | Polling every 5s, spinner shown | PASS |
| Payment success | Green confirmation, item marked sold | PASS |
| Payment failure | Error message, option to retry | PASS |
| USSD not received | Fallback instructions displayed | PASS |

---

## 6. Key Findings

### Paynow-Specific Issues Encountered

1. **Cloudflare Bot Protection** — Paynow's API is unreachable from serverless environments (Supabase Edge Functions, Vercel, etc.). Required building a browser-relay fallback pattern. This is the single biggest DX blocker.

2. **Form-Encoded API** — Paynow uses `application/x-www-form-urlencoded` while every competitor uses JSON. Adds friction and complexity.

3. **Hash Field Ordering** — SHA-512 hash computation requires fields in a specific undocumented order. Trial and error was needed.

4. **No TypeScript Types** — SDK lacks TypeScript definitions. Required `(supabase.rpc as any)()` casting workaround.

5. **Webhook Verification Fragile** — Hash verification for callbacks has undocumented field ordering that differs from request signing.

### What Worked Well

1. **BillPay Vendor API** — Well-structured spec with AUTH/PAY/STATUS/REVERSE lifecycle
2. **Mobile Money Flow** — EcoCash/OneMoney USSD integration works when API is reachable
3. **Multi-biller Support** — ZESA, Airtime, Council, Universities, Insurance all supported

### Integration Complexity Comparison

| Provider | Lines of Code | Time to First Payment | Sandbox Reliability |
|---|---|---|---|
| Stripe | 157 | ~8 min | 5/5 |
| Paystack | 189 | ~18 min | 5/5 |
| Flutterwave | 234 | ~25 min | 4/5 |
| **Paynow** | **835** | **~90 min** | **2/5** |
| Pesepay | 267 | ~35 min | 3/5 |

---

## 7. Test Environment Details

- **Supabase Project:** hmeieslclzycyjjjflfh
- **Paynow Integration ID:** 23997 (production), 23657 (test server)
- **Test Phone Numbers:** 0771111111 (success), 0772222222 (delayed), 0773333333 (cancel), 0774444444 (insufficient)
- **BillPay Simulation Prefixes:** PP (pending), PF (failure), PFF (flagged)
- **Frontend:** React 18 + Vite + Tailwind + shadcn/ui
- **Runtime:** Deno (Supabase Edge Functions)
