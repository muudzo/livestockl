# BillPay × Supabase Integration

**Author.** Tatenda Nyemudzo · Paynow internship 2026
**Status.** Live — AUTH+PAY round-trip verified end-to-end against staging on 2026-05-04, production rows present from 2026-04-16
**Audience.** Paynow BillPay engineering · future ZimLivestock maintainers · external integrators
**Companion artifacts.** [txt × Supabase Integration](txt-supabase-integration.md) · [Paynow Core × Supabase Integration](paynow-supabase-integration.md) · [Research Investigation](research-investigation.md)

---

## 0. TL;DR — 30-second read

ZimLivestock lets farmers spend auction earnings on real bills — ZESA prepaid electricity, council rates, school fees, medical aid, airtime — through Paynow BillPay Vendor API v1.33. The integration is the *easiest* of the three Paynow products we shipped: HTTP Basic Auth, JSON request/response, **direct from Supabase Edge with no relay**, no IP whitelist, no KYC gate. AUTH+PAY round-trips returned real `BillPayReference` values within 90 minutes of starting the integration. The cardinal rule: **AUTH and PAY must reuse the same `Reference`** — enforced via a DB-keyed lookup on the authorized row.

```
Browser PWA  ──▶  Supabase Edge (billpay/billpay-billers/billpay-status/billpay-reverse)
                                ──▶  https://billpay.paynow.co.zw/api/payment/process
                                     (no bot wall · no relay · no IP whitelist · Basic Auth only)
```

---

## 1. Provisioning Checklist

The "easy" Paynow product. Two manual gates, both fast:

| # | Step | Owner | Time | Verify |
|---|---|---|---|---|
| 1 | Vendor account on Paynow + USD wallet prefunding | Paynow support | 1–2 days | Wallets endpoint returns balance > $0 |
| 2 | API credentials (Basic Auth) | Paynow support | minutes after vendor account exists | `/api/payment/ListBillers` returns biller array |

That's it. No REMOTE-user provisioning, no IP whitelist, no KYC gate, no separate sandbox provisioning.

**Both staging and production are reachable from the same Supabase Edge runtime** without any infrastructure detour. This is the structural pattern the [Research Investigation](research-investigation.md) recommends Paynow Core adopt.

---

## 2. Architecture

### 2.1 Why this is the simplest of the three Paynow integrations

| Product | Auth | Egress constraint | Special infrastructure |
|---|---|---|---|
| **BillPay** | HTTP Basic Auth | None — `billpay.paynow.co.zw` accepts cloud IPs | None |
| Paynow Core | SHA-512 hash signing | TCP RST from cloud IPs (Cloudflare bot wall) | Cloudflare Worker relay |
| txt.co.zw | HTTP Basic Auth + IP whitelist + KYC | Static-IP requirement | Mac mini relay + Cloudflare Tunnel |

BillPay sits on a **dedicated `billpay.paynow.co.zw` subdomain without bot protection**, which is exactly what the research investigation argues Paynow Core should adopt. The recommendation is internal pattern adoption, not new architecture — BillPay is the proof.

### 2.2 Edge Function topology

Six edge functions cover the BillPay lifecycle:

```
                      ┌─────────────────────────────────┐
                      │        Browser PWA              │
                      │  (BillPayFlow wizard, hooks)    │
                      └─────────────┬───────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
  ┌─────────────┐         ┌─────────────────┐         ┌─────────────────┐
  │  billpay    │         │ billpay-billers │         │  billpay-status │
  │  AUTH+PAY   │         │ ListBillers +   │         │   STATUS poll   │
  │             │         │ DB cache (1hr)  │         │                 │
  └──────┬──────┘         └────────┬────────┘         └────────┬────────┘
         │                         │                           │
         ├──────────┬──────────────┼───────────────┬───────────┘
         │          │              │               │
         ▼          ▼              ▼               ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │              https://billpay.paynow.co.zw/api/                      │
  │              /payment/process · /payment/ListBillers ·              │
  │              /payment/reverse · /wallets                            │
  │              HTTP Basic Auth · JSON · v1.33                         │
  └─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ (cron, every 2 min)
                                    ▲
                          ┌─────────────────────┐
                          │  billpay-reconcile  │
                          │  resolves stuck     │
                          │  BeingProcessed +   │
                          │  Flagged rows       │
                          └─────────────────────┘

  Plus:  billpay-reverse (refund/reversal)  ·  billpay-wallets (balance)
```

### 2.3 Two cardinal rules from v1.33 spec

**Rule 1 — same Reference across AUTH and PAY.** AUTH generates a unique `Reference`, sends to Paynow, gets back `Authorized` status. PAY must echo *exactly* the same `Reference`. We persist the authorized row keyed by Reference and look it up on PAY.

**Rule 2 — voucher billers' SMS receipts are mandatory.** When the PAY response carries `ReceiptSmses` (e.g. ZETDC tokens, EVD vouchers), every entry in that array MUST be sent to the customer via SMS. Vendor obligation, not optional.

The integration enforces both at the application layer — neither is enforced upstream.

### 2.4 Status state machine

```
     AUTH ──────▶ Authorized ──── PAY ─────────┐
                                                │
       ┌─────────────────┬─────────────────────┴─────────┬─────────────┐
       ▼                 ▼                               ▼             ▼
     Paid          BeingProcessed                     Flagged        Failed
       │                 │                               │             │
       │           (poll 120s, then              (poll 600s,           │
       │            180s thereafter)              under review)        │
       │                 │                               │             │
       │                 ├──────────▶ Paid              │             │
       │                 │                               │             │
       │                 ├──────────▶ Failed            ├──▶ Paid     │
       │                 │                               │             │
       │                 └──────────▶ Flagged           └──▶ Failed   │
       │
       └──── Reversed (via billpay-reverse, error codes 0-5, 99)
```

`billpay-reconcile` cron resolves BeingProcessed → terminal in ~3 polls, escalates to Flagged after 10 attempts.

---

## 3. Components

| Path | Purpose |
|---|---|
| [`supabase/functions/billpay/index.ts`](../../supabase/functions/billpay/index.ts) | Core: AUTH + PAY actions on `/api/payment/process` |
| [`supabase/functions/billpay-billers/index.ts`](../../supabase/functions/billpay-billers/index.ts) | ListBillers proxy with 1hr DB cache (`billers_cache`) and stale-cache fallback |
| [`supabase/functions/billpay-status/index.ts`](../../supabase/functions/billpay-status/index.ts) | STATUS check + RETRY for BeingProcessed payments |
| [`supabase/functions/billpay-reverse/index.ts`](../../supabase/functions/billpay-reverse/index.ts) | Refund/reversal flow (error codes 0–5, 99 per spec) |
| [`supabase/functions/billpay-wallets/index.ts`](../../supabase/functions/billpay-wallets/index.ts) | Vendor wallet balance check |
| [`supabase/functions/billpay-reconcile/index.ts`](../../supabase/functions/billpay-reconcile/index.ts) | Cron worker — polls stuck BeingProcessed/Flagged rows |
| [`src/hooks/useBillPay.ts`](../../src/hooks/useBillPay.ts) | React Query hooks: billers, auth, pay, status, wallets, history |
| [`src/app/components/BillPayFlow.tsx`](../../src/app/components/BillPayFlow.tsx) | 4-step wizard with dynamic biller config + live polling |
| [`src/app/components/TestBillPayPayment.tsx`](../../src/app/components/TestBillPayPayment.tsx) | Test harness — same-reference + status invariants |
| [`src/app/components/PostSaleBillPayPrompt.tsx`](../../src/app/components/PostSaleBillPayPrompt.tsx) | Post-auction CTA: "Pay a bill with your earnings?" |
| [`src/types/billpay.ts`](../../src/types/billpay.ts) | TypeScript types mirroring v1.33 |
| [`docs/billpay-integration-plan.md`](../../docs/billpay-integration-plan.md) | Implementation plan (architecture, biller list, simulation matrix) |
| [`docs/paynow-billpay-vendor-api.md`](../../docs/paynow-billpay-vendor-api.md) | v1.33 spec reference annotations |
| [`docs/paynow-billpay.postman_collection.json`](../../docs/paynow-billpay.postman_collection.json) | Runnable Postman collection |

Plus DB tables: `bill_payments` (lifecycle) and `billers_cache` (ListBillers cache, 1-hour TTL).

---

## 4. Edge Function (`billpay`) — Anatomy

### 4.1 AUTH — generate Reference, persist authorized row

[`supabase/functions/billpay/index.ts:320-408`](../../supabase/functions/billpay/index.ts#L320-L408)

```ts
const ref = generateReference();          // ZL-BP-<base36-ts>-<rand>

const apiRequest = {
  Action: "AUTH",
  BillerCode: billerCode,
  MemberNumber: accountNumber,
  Reference: ref,                          // generated once, reused for PAY
  TotalAmount: totalAmount || amount || "",
  Products: apiProducts,
};

const apiRes = await fetch(BILLPAY_API, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Basic ${basicAuth}`,
  },
  body: JSON.stringify(apiRequest),
  signal: controller.signal,                // 60s spec-recommended timeout
});

const apiData = await apiRes.json();
if (apiData.Status !== "Authorized") {
  return json({
    status: "error",
    action: "auth",
    error: apiData.Narration,                          // user-safe narration
    technicalNarration: apiData.TechnicalNarration,    // logged, never UI-bound
  });
}

await svc.from("bill_payments").insert({
  user_id: user.id,
  reference: ref,
  biller_code: billerCode,
  account_number: accountNumber,
  account_holder: apiData.MemberName || apiData.AuthData?.MemberName,
  amount: amount || apiData.TotalAmount || 0,
  total_amount: apiData.TotalAmount,
  status: "authorized",
  billpay_reference: apiData.BillPayReference,
  products: apiData.Products || [],
  auth_data: apiData.AuthData || null,
  requires_forex: apiData.Products?.some(p => p.RequiresForexPayment) || false,
});
```

The `bill_payments` row keyed on `reference` is the source of truth for the next step.

### 4.2 PAY — look up authorized row, reuse Reference

[`supabase/functions/billpay/index.ts:415-431, 582-597`](../../supabase/functions/billpay/index.ts#L415)

```ts
const { data: authRow } = await svc
  .from("bill_payments")
  .select("*")
  .eq("reference", reference)
  .eq("user_id", user.id)
  .single();

if (!authRow) {
  return json({ error: "No authorized payment found for this reference. Run AUTH first." }, 400);
}
if (authRow.status !== "authorized") {
  return json({ error: `Payment in '${authRow.status}' state, not 'authorized'. Cannot pay.` }, 400);
}

const apiRequest = {
  Action: "PAY",
  BillerCode: billerCode,
  MemberNumber: accountNumber,
  Reference: reference,                          // ← same as AUTH (spec-mandated)
  TotalAmount: totalAmount || amount,
  Products: payProducts,
  ...(payerDetails ? { PayerDetails: payerDetails } : {}),
};
```

The DB-keyed lookup is the architectural enforcement of v1.33 §AUTH/PAY same-Reference. A future refactor could add a DB-level CHECK constraint, but the application-layer invariant has held.

### 4.3 PAY response fan-out — 4 states, distinct DB transitions

[`supabase/functions/billpay/index.ts:668-725`](../../supabase/functions/billpay/index.ts#L668)

```ts
if (apiData.Status === "Paid") {
  await svc.from("bill_payments").update({
    status: "paid",
    amount,
    total_amount: apiData.TotalAmount || amount,
    currency: apiData.Currency || "USD",
    account_holder: apiData.MemberName,
    billpay_reference: apiData.BillPayReference,
    biller_payment_reference: apiData.BillerPaymentReference,
    wallet_debit_reference: apiData.WalletDebitReference,
    vendor_commission: vendorCommission,
    vouchers: allVouchers,
    receipt_smses: receiptSmses,
    receipt_html: receiptHtml,
    display_data: displayData,
    products: apiData.Products || [],
  }).eq("reference", reference);

  // ZETDC/voucher billers: MUST send all ReceiptSmses (spec requirement)
  if (receiptSmses.length > 0) {
    const { data: profile } = await svc.from("profiles").select("phone").eq("id", user.id).single();
    if (profile?.phone) {
      for (const sms of receiptSmses) {
        sendReceiptSms(supabaseUrl, serviceRoleKey, profile.phone, sms, user.id);
      }
    }
  }
}
```

The four terminal branches and their downstream effects:

| `Status` | `bill_payments.status` | Downstream effect |
|---|---|---|
| `Paid` | `paid` | Update with vouchers, fire ReceiptSmses (mandatory) |
| `BeingProcessed` | `being_processed` | Reconcile cron picks up; first STATUS poll at 120s |
| `Flagged` | `flagged` | Slow-poll at 600s; escalate to support after 10 attempts |
| `Failed` | `failed` | Surface `Narration` to UI; do nothing destructive |

### 4.4 Network-error conservatism on PAY

[`supabase/functions/billpay/index.ts:613-631`](../../supabase/functions/billpay/index.ts#L613)

```ts
} catch (fetchErr) {
  // Network failure during PAY — mark for RETRY reconciliation
  await svc.from("bill_payments").update({
    status: "being_processed",                  // NOT "failed"
    amount,
    total_amount: totalAmount || amount,
    narration: "Network error during payment — will retry automatically",
  }).eq("reference", reference);
}
```

A PAY network error does **not** mark the payment as failed. The biller may have committed even if we never received the response. The reconcile cron resolves the actual state by hitting the STATUS endpoint. Fail-closed for downstream — the row is treated as in-flight, never silently retired as failed.

### 4.5 Auth gate

```ts
const { data: { user } } = await authClient.auth.getUser();
if (!user) return json({ error: "Not authenticated" }, 401);
```

Every action requires a logged-in Supabase user JWT. Unlike `send-sms` (service-role only) or `end-auctions` (CRON_SECRET only), BillPay actions are user-initiated by design — the user is paying with their own balance.

---

## 5. Diagnostic Cookbook

### 5.1 Test biller — the unsung hero of v1.33

The Test biller (`billerCode: "Test"`) is the *single most useful* artifact in the BillPay ecosystem. Member-number prefixes drive deterministic outcomes:

| Prefix | AUTH | PAY |
|---|---|---|
| `AT` | Auth Timeout (60s) | — |
| `AF` | Auth Failure | — |
| `PT` | — | Pay Timeout |
| `PF` | — | Pay Failure |
| `PP` | — | Pay Pending → BeingProcessed |
| `PFF` | — | Pay Flagged |
| (any other) | — | Paid (success) |

Combined with the 5 Test products (`AI` / `AM` / `AA` / `RV` / `FP`), every state in the integration is reachable without burning real money. Use these from day one.

### 5.2 Single-curl probes for each gate

```bash
# Gate 1: vendor wallet exists, has balance
curl -u "$BILLPAY_USERNAME:$BILLPAY_PASSWORD" \
  "https://billpay-staging.paynow.co.zw/api/wallets"
# Returns array with USD/ZWL balances. Empty array = no wallet provisioned.

# Gate 2: ListBillers reachable, returns curated set
curl -u "$BILLPAY_USERNAME:$BILLPAY_PASSWORD" \
  "https://billpay-staging.paynow.co.zw/api/payment/ListBillers?billerCodes=Test,ZETDC,AIRTIME"
# Returns biller config array. 401 = wrong creds. Empty = no biller access.

# Gate 3: AUTH against Test biller
curl -u "$BILLPAY_USERNAME:$BILLPAY_PASSWORD" \
  -X POST -H "Content-Type: application/json" \
  -d '{"Action":"AUTH","BillerCode":"Test","MemberNumber":"AA1234","Reference":"TEST-001","Products":[{"Code":"AA","Quantity":1,"Price":10}]}' \
  "https://billpay-staging.paynow.co.zw/api/payment/process"
# Status: "Authorized" = working. Anything else = config issue.

# Gate 4: PAY using same Reference
curl -u "$BILLPAY_USERNAME:$BILLPAY_PASSWORD" \
  -X POST -H "Content-Type: application/json" \
  -d '{"Action":"PAY","BillerCode":"Test","MemberNumber":"AA1234","Reference":"TEST-001","TotalAmount":10,"Products":[{"Code":"AA","Quantity":1,"Price":10}]}' \
  "https://billpay-staging.paynow.co.zw/api/payment/process"
# Status: "Paid" = full chain works.
```

If gate 4 returns `Paid`, the integration is functional. Anything earlier breaking points to a specific provisioning step.

### 5.3 Common failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| `401 Unauthorized` on every endpoint | Wrong `BILLPAY_USERNAME` / `BILLPAY_PASSWORD` | Verify creds with Paynow support |
| `ListBillers` returns empty array | Vendor account exists but no billers granted | Paynow ops grants per-biller access |
| AUTH returns `Status: "Failed"` with `Narration: "Invalid biller code"` | Case sensitivity — vendor cache uses `"TEST"` (uppercase) on staging | PostgreSQL `IN` is case-sensitive; align CURATED_CODES |
| AUTH ok, PAY returns `"Reference already used"` | Reusing AUTH Reference for a *new* AUTH | Generate a new Reference per AUTH attempt |
| PAY hangs > 60s | `signal: controller.signal` 60s timeout fires | Reconcile cron resolves; user message: "we'll check the status automatically" |
| Wallet balance does not decrement | Test biller / staging environment | Production wallet only debits on production billers |
| `ReceiptSmses` array present but no SMS goes out | `profile.phone` empty or send-sms not deployed | Verify both; vendor obligation under spec §ReceiptSmses |

### 5.4 Environment / staging gotcha

The `BILLPAY_API_BASE_URL` env var routes traffic between staging and production:

| Value | Environment | Test biller available? |
|---|---|---|
| `https://billpay.paynow.co.zw` | Production | ❌ No |
| `https://billpay-staging.paynow.co.zw` | Staging | ✅ Yes |

If unset, defaults to production. Demo dry-runs require staging — set the secret before any test that uses Test-biller prefixes.

---

## 6. Operational Runbook

### 6.1 Cron schedule for reconciliation

```sql
-- billpay-reconcile: poll BeingProcessed/Flagged every 2 min
SELECT cron.schedule('billpay-reconcile', '*/2 * * * *', $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/billpay-reconcile',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.cron_secret')),
    body := '{}'::jsonb
  );
$$);
```

Polling cadence per spec: 120s for first STATUS check, 180s thereafter for BeingProcessed, 600s for Flagged, escalate after 10 attempts.

### 6.2 Test harness invocation

```bash
# Full chain via UI:
# 1. Open /pay-bill in the app
# 2. Select "TEST" biller (visible only when BILLPAY_API_BASE_URL points at staging)
# 3. Member number: AA1234 → expect authorized + paid happy path
# 4. Member number: AT1234 → expect auth timeout (gates retry logic)
# 5. Member number: PFF1234 → expect flagged (gates slow-poll)
```

The [`TestBillPayPayment.tsx`](../../src/app/components/TestBillPayPayment.tsx) component runs the same-Reference invariant + status state-machine tests against a deployed function, returning a pass/fail summary.

### 6.3 Switching environments

```bash
# Point at staging (Test biller becomes available)
supabase secrets set BILLPAY_API_BASE_URL=https://billpay-staging.paynow.co.zw \
  --project-ref hmeieslclzycyjjjflfh

# Point at production (real money flows)
supabase secrets set BILLPAY_API_BASE_URL=https://billpay.paynow.co.zw \
  --project-ref hmeieslclzycyjjjflfh

# Clear → defaults to production
supabase secrets unset BILLPAY_API_BASE_URL --project-ref hmeieslclzycyjjjflfh
```

⚠️ The frontend has a 1-hour React Query cache (`billers_cache` shadow). After flipping `BILLPAY_API_BASE_URL`, billers may take ~1 hour to refresh in the UI. Mitigation: open in incognito or clear app data.

### 6.4 Vendor wallet monitoring

```bash
# Check current balances
curl -u "$BILLPAY_USERNAME:$BILLPAY_PASSWORD" \
  https://billpay.paynow.co.zw/api/wallets
```

The `billpay-wallets` edge function exposes the same data with auth gating. For production, recommend adding a daily cron that alerts when USD balance drops below a threshold so manual top-up doesn't surprise customers mid-checkout.

### 6.5 Reversal flow

`billpay-reverse` accepts six error codes per v1.33 §Reversal: 0 (other), 1 (duplicate), 2 (timeout), 3 (incorrect amount), 4 (incorrect account), 5 (customer request), 99 (other-other). Reversals require an existing `paid` row and update status to `reversed` on success.

---

## 7. Application Wiring

| User journey | Component | Edge function |
|---|---|---|
| Browse billers, see grid | `BillPayFlow.tsx` step 1 | `billpay-billers` (cached or live) |
| Enter account number, validate against `MemberNumberFieldRegex` | `BillPayFlow.tsx` step 2 | (client-side regex) |
| AUTH — verify account, return holder + balance | `BillPayFlow.tsx` step 3 | `billpay` (action: AUTH) |
| User confirms, PAY fires | `BillPayFlow.tsx` step 4 | `billpay` (action: PAY) |
| Live status polling for BeingProcessed | `BillPayFlow.tsx` step 4 | `billpay-status` |
| Voucher SMS dispatch | (server-side, automatic) | `send-sms` (called by `billpay`) |
| Post-auction CTA | `PostSaleBillPayPrompt.tsx` | (deep links into `BillPayFlow`) |
| Test harness | `TestBillPayPayment.tsx` | `billpay` against TEST biller |

The wizard is the user-facing happy path; the test harness exercises edge states (timeout, flagged, reversal) without hitting real billers.

---

## 8. Production Hardening Roadmap

The integration shipped to main is feature-complete for the curated 15-biller set. Hardening items identified during the audit:

| # | Item | Effort | Priority |
|---|---|---|---|
| 8.1 | Replace ListBillers schema-spread with explicit field map (avoid leaking new vendor fields into request body) | 2 hr | Medium — vendor accepts current shape, but may break on schema change |
| 8.2 | Drop `Price: null` heuristic for forex products; use explicit `RequiresForexPayment` flag instead | 1 hr | Low |
| 8.3 | Don't always send empty `TotalAmount` — omit field when not applicable | 30 min | Low |
| 8.4 | Replace hardcoded `Currency: "USD"` fallback with response-driven currency detection | 30 min | Low |
| 8.5 | Add CHECK constraint to `bill_payments.status` matching the v1.33 state machine | 1 hr | Medium |
| 8.6 | Move ReceiptSmses dispatch inside DB transaction for atomicity (currently fires after row update) | 2 hr | Medium |
| 8.7 | Add wallet balance alerting cron (low-balance Slack/email) | 2 hr | Medium |
| 8.8 | Production wallet top-up runbook | 30 min | High before go-live with real volume |
| 8.9 | Stress-test reconcile cron against backlog of stuck Flagged rows | 4 hr | Medium |
| 8.10 | Add PostHog event tracking on each state transition for funnel analysis | 2 hr | Low |

Items 8.1–8.4 were identified during the BillPay request-shape audit — vendor accepts current requests without complaint, but documenting them for the next iteration. None block demo.

---

## 9. Recommendations to Paynow (BillPay product)

These are friendly observations from a first-time integrator, ordered by integrator-impact:

### 9.1 Publish a Postman collection alongside the v1.33 docs

Even an unauthenticated, sample-data collection would shortcut the "wire up curl, transcribe spec, debug field shapes" loop. The TXT product publishes one at `https://www.postman.com/paynow/paynow-txt` — same pattern would serve BillPay developers immediately.

### 9.2 Document the case-sensitivity of biller codes

`Test` vs `TEST` is a subtle gotcha that surfaces as `404` on AUTH despite a billers cache lookup that "looks right." A single sentence in v1.33 §BillerCode would catch it: *"BillerCode is case-sensitive and must match the value returned by ListBillers exactly."*

### 9.3 Surface the staging vs production hostname distinction in v1.33

The doc lists `https://billpay.paynow.co.zw/api/` as the base URL but doesn't mention `billpay-staging.paynow.co.zw`. New integrators hit production by default, can't access the Test biller, and are confused for hours. Add a hostnames table to v1.33 §Authentication.

### 9.4 Type the `MemberNumberFieldRegex` field consistently

Currently returned as either a `string` or an object `{Pattern, Options}`. We normalize at cache-write time, but this is the kind of polymorphism that bites every new client. Pick one shape, document it.

### 9.5 Provide structured error codes

PAY/AUTH errors come back as `Narration` (user-safe text) + `TechnicalNarration` (debug detail). Adding a stable `ErrorCode` field to error responses would let integrators handle e.g. "insufficient wallet balance" differently from "biller offline" without parsing free text.

### 9.6 Document the AUTH/PAY same-Reference invariant prominently

This is *the* most important spec-compliance rule and is currently a single sentence buried in §PAY. Promote it to v1.33 §Quick Start and add it to the Postman collection's pre-request scripts as a working example.

These are all *additive documentation* recommendations — none require BillPay infrastructure changes. The product is in good shape architecturally; the docs and onboarding artifacts are the gap.

---

## 10. Proposed Solution for the ZimLivestock Use Case

The preceding nine sections describe what is built: a BillPay consumer integration that is live in production against real billers. This section pivots from the technical reference to the **product commitment** — how BillPay fits into the ZimLivestock architecture, why we propose it as a permanent capability (not a one-off demo), and how it sets up the Phase 2 biller-inbound story.

### 10.1 The two BillPay roles for ZimLivestock

BillPay sits at a unique seam: it lets ZimLivestock act both as a **consumer of billers** and, in Phase 2, as a **registered biller** itself. The proposed solution commits to both directions:

| Role | What it means | Who benefits |
|---|---|---|
| **BillPay consumer** (today, in production) | ZimLivestock's app can pay any Paynow-catalog biller — airtime, ZESA, council rates, school fees — on behalf of a logged-in user | Sellers paying farm bills from auction proceeds; buyers topping up airtime to receive SMS receipts |
| **BillPay biller** (Phase 2, spec'd in [week-7](../week-7/billpay-biller-api-spec.md)) | ZimLivestock registers as a biller. Any buyer pays "ZimLivestock" inside any Paynow-integrated wallet | Buyers gain a trusted-biller signal; ZimLivestock distributes through every Paynow surface |

Both roles speak the same vendor-API protocol. The consumer integration is the technical rehearsal for the biller integration — the AUTH/PAY discipline, idempotency, status-machine, and reconciliation all carry over.

### 10.2 Why BillPay is the right consumer rail for the post-auction moment

Auction-day sellers walk out with cleared funds in their wallet and immediate spending pressure — fuel, feed, transport, school fees due that week. The proposed solution makes ZimLivestock the **app where that spending happens** rather than where the seller exits to USSD:

1. **No context switch.** The seller has just authenticated for the auction. BillPay reuses the same session, the same idempotency primitives, the same `payment-poll-sync` infrastructure documented in [paynow-supabase-integration.md](paynow-supabase-integration.md).
2. **The same trust surface.** Buyers/sellers already trust ZimLivestock with auction funds. Routing bill payments through the same wallet preserves trust without re-onboarding.
3. **Sticky engagement loop.** A seller who paid ZESA inside the app on auction day returns the following week — even outside auction season.
4. **Post-Sale CTA pattern.** `PostSaleBillPayPrompt.tsx` (§7) is the productized form of this thesis — a single tap from "you won the auction" to "pay this bill."

### 10.3 Why BillPay over rolling our own biller catalog

Three providers in the broader Zimbabwean fintech space offer biller payments. BillPay is the proposed solution because:

1. **No CF bot wall.** Unlike Paynow Core (§12.1.P1 in [paynow-supabase-integration.md](paynow-supabase-integration.md#121-paynow-api-shortcomings)), the BillPay API on `billpay.paynow.co.zw` is reachable from Supabase Edge Functions, Cloudflare Workers, and any serverless platform — no relay required. This is the **only Paynow product that worked first-attempt from a serverless platform** (§11).
2. **Deepest biller catalog in Zimbabwe.** ZESA, ZINWA, council rates, DStv, NetOne, Telecel, school-fees aggregators — covered. A rolled-own integration would chase each biller individually.
3. **Funds settle in the same Paynow merchant wallet** as auction proceeds (§2.2 schema). One reconciliation surface for the seller, one settlement currency, one regulatory perimeter.
4. **Same RLS model** as the core `payments` table. Service-role-only writes, RLS audit applies once, holds for both.

### 10.4 Phase 2 — ZimLivestock as a registered biller

The May 2026 demo panel asked whether buyers could pay ZimLivestock the way they pay ZESA. The biller-inbound API spec in [week-7](../week-7/billpay-biller-api-spec.md) is the contract that lands ZimLivestock in the Paynow catalog. The technical pre-requisite is **vendor-API literacy in both directions**, which this integration proves.

Phase 2 work that becomes cheap because of this integration:

- AUTH/PAY semantics, idempotency on `Reference`, hash verification → already implemented, already audited
- Postman collection format → already reverse-engineered (§9.1)
- BillerCode case-sensitivity, sandbox/production hostname split → already documented (§9.2, §9.3)
- Voucher SMS dispatch pattern → already in production (§7, voucher SMS via `send-sms`)

The biller-inbound endpoint reuses these. The Phase 2 work is mostly *renaming* — AUTH/PAY receivers instead of senders, voucher emitters instead of consumers.

### 10.5 What ships today, what's next, what we reject

**Production today:**
- BillPay AUTH + PAY round-trip against real Paynow billers (live AIRTIME rows verified 2026-04-16, 2026-05-04)
- Sandbox parity against the TEST biller on `billpay-staging.paynow.co.zw`
- Status polling at 120s/180s/600s cadences per v1.33 spec
- BillPay reconciliation cron (`billpay-reconcile`)
- BillPay reversal flow (`billpay-reverse`)
- Voucher SMS dispatch via `send-sms`
- `PostSaleBillPayPrompt` post-auction CTA

**Next (branch-ready or scoped):**
- Biller-inbound API ([week-7 spec](../week-7/billpay-biller-api-spec.md)) — Phase 2 of the proposed architecture
- Wallet-balance alerting cron (§8.7)
- Production top-up runbook (§8.8)
- PostHog funnel instrumentation on state transitions (§8.10)

**Rejected:**
- Rolling our own biller catalog — fragmented settlement, no panel ask supports it
- Routing BillPay through a third-party aggregator — second hop, second trust surface, no benefit
- Treating BillPay as a demo-only feature — the post-auction spending moment is a permanent product seam, not a showcase

### 10.6 The commitment, in one paragraph

BillPay is not a side-quest in the ZimLivestock architecture — it is the **post-auction product surface**, and it is the **Phase 2 biller-inbound rehearsal**. The integration is in production, it works first-attempt from serverless, and it sets up the panel's most repeated ask (ZimLivestock-as-biller) with a working protocol implementation. We propose keeping BillPay in the production architecture indefinitely, and pushing biller-inbound (week-7 spec) as the next deliverable that this integration unlocks.

---

## 11. Source Material and Evidence Index

### 11.1 Live verification artifacts

- `bill_payments` table (Supabase project `hmeieslclzycyjjjflfh`):
  - **Production AIRTIME** rows from 2026-04-16 (`PMRG-260416120508-O77AF`, USD, status `paid`)
  - **Production AIRTIME** rows from 2026-05-04 (`PMRG-260504102012-857FN`, USD, status `paid`)
  - **Staging TEST** rows from 2026-05-04 (`TEST-260504120111-G6W2R`, ZIG, status `paid`)
- Both environments live-verified — production for real billers, staging for Test biller dry-runs.

### 11.2 Reference documents

- [v1.33 spec annotations](../../docs/paynow-billpay-vendor-api.md)
- [Implementation plan](../../docs/billpay-integration-plan.md)
- [Postman collection (runnable)](../../docs/paynow-billpay.postman_collection.json)

### 11.3 Companion deliverables

- [Paynow Core × Supabase Integration](paynow-supabase-integration.md) — covers Express Checkout, Web Checkout, hash signing, CF Worker relay (for the harder Paynow product)
- [txt × Supabase Integration](txt-supabase-integration.md) — sibling SMS integration, also through Paynow ecosystem
- [Research Investigation](research-investigation.md) — argues that BillPay's subdomain pattern should be adopted by Paynow Core to unblock serverless callers

### 11.4 Supabase secrets (names only — values write-only)

| Name | Purpose |
|---|---|
| `BILLPAY_USERNAME` | Vendor-API username (HTTP Basic Auth) |
| `BILLPAY_PASSWORD` | Vendor-API password |
| `BILLPAY_API_BASE_URL` | `https://billpay.paynow.co.zw` (prod) or `https://billpay-staging.paynow.co.zw` (sandbox) |
| `CRON_SECRET` | Auth for `billpay-reconcile` cron invocations |

---

## 12. Status

✅ **Live in production** — AUTH+PAY round-trip verified on staging (2026-05-04, reference `ZL-BP-MOR14OMK-LQFZ`) and production AIRTIME confirmed against live wallet (2026-04-16 and 2026-05-04).

```
Browser PWA → Supabase Edge (billpay) → billpay.paynow.co.zw → Paynow Vendor API
```

No relay infrastructure required. No IP whitelist. No KYC gate. **The only Paynow product in the integration that worked first-attempt from a serverless platform.**

Pending follow-up (post-demo):
- Hardening backlog (§8) — none demo-blocking
- v1.33 documentation requests with Paynow product team (§9)
- Production wallet alerting + top-up runbook (§8.7, §8.8)
