# Flutterwave DX Benchmark Report

## 1. Integration Summary

| Field | Value |
|-------|-------|
| **Provider** | Flutterwave |
| **Website** | flutterwave.com |
| **Integration method** | Flutterwave Standard (hosted payment page via redirect) |
| **SDK used** | No SDK -- raw REST API calls (`fetch`) |
| **Date started** | ___ (fill in) |
| **Time to first successful test payment** | ___ minutes (fill in) |
| **Developer friction** | Medium — payment flow works but webhook setup is confusing |

---

## 2. Signup and Onboarding

**Steps from "I want to integrate" to "it works":**

1. Go to flutterwave.com and create an account (email + password)
2. Verify email address
3. Land on Flutterwave Dashboard
4. Toggle to "Test Mode" (sandbox) in the top bar
5. Navigate to Settings > API Keys to get test secret key (`FLWSECK_TEST-...`)
6. Set a "Secret Hash" for webhook verification in Settings > Webhooks
7. Make a POST to `https://api.flutterwave.com/v3/payments` with customer, amount, tx_ref
8. Redirect user to `data.link` from the response
9. Payment completes on Flutterwave's hosted page
10. Flutterwave redirects back to your `redirect_url`

**Total steps: 10** (from zero to working test payment)

| Metric | Score |
|--------|-------|
| Account creation time | ___ minutes (fill in) |
| Required verification for testing | Email + phone number |
| Sandbox available immediately | Yes -- toggle to test mode |
| Test API keys accessible from dashboard | Yes |

**Onboarding Score: ___/5** (fill in)

---

## 3. Documentation Quality

**URL:** https://developer.flutterwave.com/docs

| Criteria | Observation |
|----------|-------------|
| Quickstart guide | Yes -- "Collect payments" guide covers Standard flow |
| Code examples | Available in Node.js, PHP, Python, Go, Java |
| API reference | Complete -- v3 API fully documented |
| Search functionality | Yes -- full-text search |
| Interactive API testing | No built-in explorer |
| Versioned docs | API is versioned (v3 is current) |

**Our payment initiation required this code:**

```typescript
// Flutterwave: REST API call -- similar to Paystack
const response = await fetch("https://api.flutterwave.com/v3/payments", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    tx_ref: reference,
    amount,
    currency: "USD",
    redirect_url: `${origin}/payment-status/${reference}`,
    customer: {
      email: callerUser.email,
      name: "Customer Name",
    },
    customizations: {
      title: "ZimLivestock",
      description: "Livestock Purchase",
    },
  }),
});

const data = await response.json();
// data.data.link -> redirect user here
```

**Compared to Paystack:**

```typescript
// Paystack: Very similar pattern
const response = await fetch("https://api.paystack.co/transaction/initialize", {
  method: "POST",
  headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`, ... },
  body: JSON.stringify({ email, amount: amount * 100, reference, callback_url }),
});
```

**Compared to Stripe:**

```typescript
// Stripe: SDK call with typed params
const session = await stripe.checkout.sessions.create({
  mode: "payment",
  line_items: [{ price_data: { currency: "usd", unit_amount: amount * 100, ... } }],
  success_url: "...",
  cancel_url: "...",
});
```

**Compared to Paynow:**

```typescript
// Paynow: Manual hash computation + form-encoded POST
const hashString = Object.values(values).join("") + integrationKey;
const hashBuffer = await crypto.subtle.digest("SHA-512", data);
// ... 40+ lines of hash + form encoding
```

**Key difference from Paystack:** Flutterwave accepts amounts in the actual currency (not kobo/cents). `amount: 10` means US$10, not US$0.10.

**Documentation Score: ___/5** (fill in)

---

## 4. SDK Usability

| Criteria | Observation |
|----------|-------------|
| Package | No official Deno SDK -- raw REST API (community `flutterwave-node-v3` for Node.js) |
| TypeScript support | No types -- you define your own interfaces |
| Authentication | Bearer token in Authorization header |
| API call pattern | Standard REST: `POST /v3/payments`, `GET /v3/transactions/:id/verify` |
| Error handling | JSON response with `status: "error"` and `message` string |
| Webhook verification | Secret hash comparison (header `verif-hash`) |

**Webhook verification -- Flutterwave (3 lines):**

```typescript
const secretHash = req.headers.get("verif-hash");
if (secretHash !== FLUTTERWAVE_SECRET_HASH) {
  return new Response("Invalid hash", { status: 403 });
}
```

**Webhook verification -- Paystack (10 lines):**

```typescript
const key = await crypto.subtle.importKey("raw", encoder.encode(SECRET), ...);
const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2,"0")).join("");
if (computed !== signature) { /* reject */ }
```

**Webhook verification -- Stripe (1 line via SDK):**

```typescript
const event = stripe.webhooks.constructEvent(body, signature, secret);
```

**Webhook verification -- Paynow (25+ lines, 3 strategies):**

```typescript
// 3 different hash ordering strategies needed
```

**Lines of code comparison:**

| Component | Flutterwave | Paystack | Stripe | Paynow |
|-----------|-------------|----------|--------|--------|
| Payment initiation (Edge Function) | ~145 lines | ~150 lines | ~158 lines | ~257 lines |
| Webhook handler | ~115 lines | ~125 lines | ~122 lines | ~146 lines |
| Frontend hook | ~115 lines | ~132 lines | ~132 lines | ~137 lines |
| Checkout UI | ~148 lines | ~150 lines | ~149 lines | ~206 lines |
| **Total** | **~523 lines** | **~557 lines** | **~561 lines** | **~746 lines** |

**SDK Usability Score: ___/5** (fill in)

---

## 5. Sandbox / Testing Experience

### Test Card Numbers

| Scenario | Card Number | Expiry | CVV | PIN | OTP |
|----------|-------------|--------|-----|-----|-----|
| Successful payment (Mastercard) | 5531 8866 5214 2950 | 09/32 | 564 | 3310 | 12345 |
| Successful payment (Visa) | 4187 4274 1556 4246 | 09/32 | 828 | 3310 | 12345 |
| Successful (no auth) | 4242 4242 4242 4242 | 09/32 | 812 | -- | -- |
| Insufficient funds | 5258 5859 2266 6506 | 09/32 | 883 | 3310 | 12345 |
| Card declined | 5399 8383 8383 8381 | 09/32 | 564 | 3310 | 12345 |

### Test Mobile Money
- Flutterwave provides test numbers for Ghana Mobile Money, M-Pesa, etc.
- Phone: `0551234987` (Ghana test)

### Test Bank Transfer
- Flutterwave test mode generates mock bank transfer instructions
- No real bank needed

### Webhook Testing
- No official CLI for local webhook forwarding
- Use ngrok or similar to expose localhost
- Dashboard shows webhook delivery logs

### Dashboard
- Test transactions visible under Transactions
- Event logs show webhook deliveries with payloads
- API logs available for debugging

**Compared to Stripe:**
- Stripe has `stripe listen` CLI -- Flutterwave does not
- Stripe has more granular test scenarios (3DS, specific decline codes)
- Flutterwave test requires PIN + OTP steps (more realistic but slower)

**Compared to Paystack:**
- Both have well-documented test cards
- Flutterwave requires PIN + OTP in test flow, Paystack does not
- Both lack webhook testing CLI

**Compared to Paynow:**
- Flutterwave has clearly documented test cards -- Paynow does not
- Flutterwave test mode works immediately -- Paynow sandbox can be unreliable
- Both lack a webhook testing CLI

**Sandbox Score: ___/5** (fill in)

---

## 6. Error Message Clarity

### Flutterwave Error Response Structure

```json
{
  "status": "error",
  "message": "Invalid authorization key",
  "data": null
}
```

### Common Errors

| Scenario | Response |
|----------|----------|
| Invalid API key | `{ "status": "error", "message": "Invalid authorization key" }` |
| Missing customer email | `{ "status": "error", "message": "customer email is required" }` |
| Invalid amount | `{ "status": "error", "message": "amount must be a number" }` |
| Invalid currency | `{ "status": "error", "message": "Invalid currency" }` |
| Duplicate tx_ref | `{ "status": "error", "message": "Merchant reference already exists" }` |

### Comparison

| Aspect | Flutterwave | Paystack | Stripe | Paynow |
|--------|-------------|----------|--------|--------|
| Structured error codes | No -- just `message` | No -- just `message` | Yes -- `type`, `code`, `param` | No |
| Doc links in errors | No | No | Yes -- `doc_url` | No |
| Dashboard request logs | Yes | Yes | Yes -- `request_log_url` | No |
| Human-readable messages | Yes | Yes | Yes | Sometimes |

**Error Message Score: ___/5** (fill in)

---

## 7. Integration Architecture

### Flow Diagram

```
User clicks "Pay"
    |
    v
Frontend (CheckoutScreen.tsx)
    |  calls supabase.functions.invoke('initiate-payment')
    v
Edge Function (initiate-payment/index.ts)
    |  1. Validates payment record in DB
    |  2. Verifies user auth + auction win
    |  3. POSTs to https://api.flutterwave.com/v3/payments
    |  4. Returns data.link (redirect URL)
    v
Frontend redirects to data.link
    |
    v
Flutterwave Hosted Checkout Page
    |  (Card / Bank Transfer / Mobile Money / USSD)
    |
    +---> Success --> redirect to redirect_url with ?status=successful&transaction_id=...&tx_ref=...
    |
    v
Flutterwave sends webhook (charge.completed)
    |
    v
Edge Function (payment-webhook/index.ts)
    |  1. Verifies verif-hash header matches secret hash
    |  2. Verifies transaction with GET /v3/transactions/:id/verify
    |  3. Updates payment status to "paid" in DB
    |  4. Marks livestock item as "sold"
    |  5. Sends notifications
    v
Frontend (PaymentStatus.tsx) polls DB, sees "paid"
    |
    v
Shows "Payment Successful"
```

### Environment Variables Required

```env
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-...    # From Dashboard > Settings > API Keys
FLUTTERWAVE_SECRET_HASH=my-secret-hash     # Set in Dashboard > Settings > Webhooks
```

---

## 8. Key Code Snippets

### 8a. Creating a Payment Link

```typescript
const response = await fetch("https://api.flutterwave.com/v3/payments", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    tx_ref: "ZL-M3K9-AB2F",
    amount: 1000, // US$1000 (NOT in cents -- actual amount)
    currency: "USD",
    redirect_url: "https://app.com/payment-status/ZL-M3K9-AB2F",
    customer: {
      email: "buyer@example.com",
      name: "John Doe",
    },
    customizations: {
      title: "ZimLivestock",
      description: "Hereford Bull Purchase",
      logo: "https://app.com/logo.png",
    },
    meta: {
      livestock_id: "uuid-here",
    },
  }),
});

const data = await response.json();
// data.data.link -> "https://checkout.flutterwave.com/v3/hosted/pay/xxxx"
```

### 8b. Verifying a Transaction

```typescript
const verifyResponse = await fetch(
  `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
  { headers: { Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}` } }
);
const verifyData = await verifyResponse.json();
// verifyData.data.status === "successful" means payment went through
// verifyData.data.tx_ref matches your reference
```

### 8c. Webhook Verification (Secret Hash)

```typescript
// Flutterwave uses a simple secret hash -- set in Dashboard > Webhooks
const secretHash = req.headers.get("verif-hash");
if (secretHash !== FLUTTERWAVE_SECRET_HASH) {
  return new Response("Invalid hash", { status: 403 });
}

// Then parse body as JSON (not form-encoded like Paynow)
const body = await req.json();
```

### 8d. Frontend -- Redirect to Flutterwave

```typescript
const { data: flutterwaveResult } = await supabase.functions.invoke('initiate-payment', {
  body: { reference, amount, livestockTitle },
});

if (flutterwaveResult?.redirectUrl) {
  window.location.href = flutterwaveResult.redirectUrl;
}
```

---

## 9. Developer Friction Notes

**What went smoothly:**
- Payment flow itself works — redirect to Flutterwave checkout, pay, redirect back
- REST API pattern is similar to Paystack — familiar if you've done one hosted checkout
- Test card + PIN + OTP worked as documented

**What caused friction:**
- Webhook configuration is confusing — the "Secret Hash" concept is not well-explained in the dashboard
- Had difficulty finding where to set the webhook secret hash in the Flutterwave dashboard
- The webhook secret hash is something you create yourself (not generated), which isn't obvious
- Two separate secrets needed (API key + webhook hash) vs Paystack's single secret key for both
- Test flow requires PIN + OTP steps, making each test cycle slower than Paystack

**Developer quote:** _"The webhook bit is confusing with Flutterwave, but the payment goes through"_ — noted during first integration test.

---

## 10. Gotchas and Pitfalls

| Gotcha | Impact | Solution |
|--------|--------|----------|
| Amounts in **actual currency** not cents | Different from Stripe/Paystack -- do NOT multiply by 100 | `amount: 1000` means US$1000 |
| No official SDK for Deno | Must use raw fetch calls | Standard REST works fine |
| Webhook uses `verif-hash` header, not HMAC | Simpler than Paystack/Stripe but less cryptographically robust | Set a strong secret hash in dashboard |
| `redirect_url` gets `?status=`, `?transaction_id=`, `?tx_ref=` appended | URL params appended by Flutterwave | Parse these in PaymentStatus |
| Always verify via API, not just webhook | Webhooks can be spoofed | Call `GET /v3/transactions/:id/verify` |
| Test flow requires PIN + OTP entry | Slower to test than Paystack (which auto-completes) | Use PIN: 3310, OTP: 12345 |
| Two env vars needed (secret key + secret hash) | Must configure both for full integration | Set both in Supabase secrets |
| Account requires phone verification | Extra step vs Paystack (email only) | Have phone ready during signup |

---

## 11. Scores Summary

| Metric | Score (1-5) | Notes |
|--------|-------------|-------|
| Time to first successful payment | ___ min | |
| Documentation clarity | ___/5 | |
| SDK usability | ___/5 | |
| Error debugging difficulty | ___/5 | |
| Sandbox reliability | ___/5 | |
| Developer onboarding | ___/5 | |
| **Overall DX Score** | **___/5** | |

---

## 12. Flutterwave vs Paystack vs Stripe vs Paynow Comparison

| Dimension | Flutterwave | Paystack | Stripe | Paynow |
|-----------|-------------|----------|--------|--------|
| **Hosted checkout** | Yes -- clean UI, multi-step | Yes -- clean UI | Yes -- full-featured | Yes -- basic |
| **Amount format** | Actual currency (US$10 = 10) | Kobo/cents (US$10 = 1000) | Cents (US$10 = 1000) | Actual currency |
| **Mobile money** | Yes (M-Pesa, MTN, Airtel) | Yes (Ghana, Nigeria) | No | Yes (EcoCash, OneMoney) |
| **SDK** | Community Node.js SDK | Community Node.js SDK | Official SDK, TypeScript | No SDK |
| **Webhook security** | Secret hash header (3 lines) | HMAC SHA512 (10 lines) | SDK method (1 line) | SHA-512 hash (25+ lines) |
| **Test environment** | Good -- PIN/OTP flow | Good -- auto-complete | Excellent -- CLI, many scenarios | Limited |
| **Error messages** | `message` string only | `message` string only | Structured with codes + doc links | Plain text |
| **Documentation** | Good -- multi-language | Good -- Africa-focused | Comprehensive | Minimal |
| **Africa availability** | Nigeria, Ghana, Kenya, SA, Uganda, Tanzania, Rwanda + 10 more | Nigeria, Ghana, SA, Kenya | Not directly in most African countries | Zimbabwe only |
| **Currency support** | 150+ currencies, African currencies | NGN, GHS, ZAR, KES, USD | 135+ currencies | ZWL, USD |
| **Code complexity** | ~523 lines | ~557 lines | ~561 lines | ~746 lines |

---

## 13. Deployment Notes

```bash
# Set Flutterwave secrets on remote Supabase
supabase secrets set FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-...
supabase secrets set FLUTTERWAVE_SECRET_HASH=my-webhook-secret-hash

# Deploy Edge Functions
supabase functions deploy initiate-payment
supabase functions deploy payment-webhook
supabase functions deploy test-flutterwave-checkout --no-verify-jwt
```

### Flutterwave Webhook Configuration

In Flutterwave Dashboard > Settings > Webhooks:
- **Webhook URL:** `https://<project-ref>.supabase.co/functions/v1/payment-webhook`
- **Secret Hash:** Set a strong random string (this is sent as `verif-hash` header)
- **Events:** Flutterwave sends all events to a single URL -- filter by `event.event` in your handler

---

## 14. Recommendations for Paynow Based on Flutterwave's DX

1. **Amount format matters** -- Flutterwave uses actual currency amounts (not cents/kobo), which is more intuitive and avoids the "multiply by 100" pitfall. Paynow also uses actual amounts -- this is a DX win.

2. **Simple webhook verification** -- Flutterwave's `verif-hash` header is the simplest webhook verification of all providers (3 lines). While less cryptographically robust than HMAC, it's dramatically easier to implement than Paynow's hash-of-concatenated-values approach.

3. **JSON webhooks** -- Flutterwave sends webhook payloads as JSON (not form-encoded like Paynow). JSON is easier to parse and debug.

4. **Transaction verification endpoint** -- Flutterwave provides `GET /v3/transactions/:id/verify` as defense in depth. Standard pattern across all providers.

5. **Wide African coverage** -- Flutterwave covers 14+ African countries with local payment methods. Paynow could learn from their multi-country expansion strategy.

6. **Customizable checkout** -- Flutterwave allows logo, title, and description customization on the hosted page. Good UX touch.
