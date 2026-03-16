# Paystack DX Benchmark Report

## 1. Integration Summary

| Field | Value |
|-------|-------|
| **Provider** | Paystack |
| **Website** | paystack.com |
| **Integration method** | Paystack Checkout (hosted payment page via redirect) |
| **SDK used** | No SDK -- raw REST API calls (`fetch`) |
| **Date started** | ___ (fill in) |
| **Time to first successful test payment** | ___ minutes (fill in) |

---

## 2. Signup and Onboarding

**Steps from "I want to integrate" to "it works":**

1. Go to paystack.com and create an account (email + password)
2. Verify email address
3. Land on Paystack Dashboard -- test mode is enabled by default
4. Navigate to Settings > API Keys to get `sk_test_...` and `pk_test_...`
5. Make a POST to `/transaction/initialize` with email, amount, reference
6. Redirect user to `authorization_url` from the response
7. Payment completes on Paystack's hosted page
8. Paystack redirects back to your `callback_url`

**Total steps: 8** (from zero to working test payment)

| Metric | Score |
|--------|-------|
| Account creation time | ___ minutes (fill in) |
| Required verification for testing | Email only |
| Sandbox available immediately | Yes -- test mode is the default |
| Test API keys accessible from dashboard | Yes |

**Onboarding Score: ___/5** (fill in)

---

## 3. Documentation Quality

**URL:** https://paystack.com/docs

| Criteria | Observation |
|----------|-------------|
| Quickstart guide | Yes -- "Accept Payments" guide covers the redirect flow |
| Code examples | Available in Node.js, PHP, Python, Ruby |
| API reference | Complete -- every endpoint documented with params and responses |
| Search functionality | Yes -- full-text search |
| Interactive API testing | No built-in API explorer (unlike Stripe) |
| Versioned docs | API is unversioned -- single current version |

**Our transaction initialization required this code:**

```typescript
// Paystack: Simple REST API call -- no SDK needed
const response = await fetch("https://api.paystack.co/transaction/initialize", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: callerUser.email,
    amount: amount * 100, // Paystack uses kobo/cents
    reference,
    callback_url: `${origin}/payment-status/${reference}`,
    metadata: {
      livestock_title: "Hereford Bull",
      livestock_id: "uuid-here",
    },
  }),
});

const data = await response.json();
// data.data.authorization_url -> redirect user here
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

**Documentation Score: ___/5** (fill in)

---

## 4. SDK Usability

| Criteria | Observation |
|----------|-------------|
| Package | No official Deno SDK -- raw REST API (community `paystack-node` for Node.js) |
| TypeScript support | No types -- you define your own interfaces |
| Authentication | Bearer token in Authorization header |
| API call pattern | Standard REST: `POST /transaction/initialize`, `GET /transaction/verify/:ref` |
| Error handling | JSON response with `status: false` and `message` string |
| Webhook verification | Manual HMAC SHA512 on request body using secret key |

**Webhook verification -- Paystack (10 lines):**

```typescript
const encoder = new TextEncoder();
const key = await crypto.subtle.importKey(
  "raw", encoder.encode(PAYSTACK_SECRET_KEY),
  { name: "HMAC", hash: "SHA-512" }, false, ["sign"]
);
const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
const computedSignature = Array.from(new Uint8Array(signatureBuffer))
  .map(b => b.toString(16).padStart(2, "0")).join("");

if (computedSignature !== signature) { /* reject */ }
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

| Component | Paystack | Stripe | Paynow |
|-----------|----------|--------|--------|
| Payment initiation (Edge Function) | ~150 lines | ~158 lines | ~257 lines |
| Webhook handler | ~125 lines | ~122 lines | ~146 lines |
| Frontend hook | ~132 lines | ~132 lines | ~137 lines |
| Checkout UI | ~150 lines | ~149 lines | ~206 lines |
| **Total** | **~557 lines** | **~561 lines** | **~746 lines** |

**SDK Usability Score: ___/5** (fill in)

---

## 5. Sandbox / Testing Experience

### Test Card Numbers

| Scenario | Card Number | Expiry | CVV |
|----------|-------------|--------|-----|
| Successful payment | 4084 0840 8408 4081 | 12/30 | 408 |
| Failed payment | 4084 0840 8408 4081 | 12/30 | 001 |
| Card PIN required | 5060 6666 6666 6666 | 12/30 | 123 (PIN: 1234) |
| Bank auth (OTP) | 5078 5078 5078 5078 12 | 09/30 | 081 |

### Test Bank Transfer
- Paystack test mode provides a mock bank transfer page
- No real bank needed for testing

### Webhook Testing
- No official CLI for local webhook forwarding (unlike Stripe)
- Use a service like ngrok to expose localhost
- Dashboard shows webhook delivery logs with request/response

### Dashboard
- Test transactions visible under Transactions
- Each shows status, metadata, timeline
- Webhook deliveries visible with payloads

**Compared to Stripe:**
- Stripe has `stripe listen` CLI for local webhook testing -- Paystack does not
- Stripe has more test card scenarios (3DS, specific decline codes)
- Paystack's test cards are simpler but cover the basics

**Compared to Paynow:**
- Paystack has clearly documented test cards -- Paynow does not
- Paystack dashboard shows more transaction detail
- Both lack a webhook testing CLI

**Sandbox Score: ___/5** (fill in)

---

## 6. Error Message Clarity

### Paystack Error Response Structure

```json
{
  "status": false,
  "message": "Invalid key. Kindly ensure you are using the right authorization"
}
```

### Common Errors

| Scenario | Response |
|----------|----------|
| Invalid API key | `{ "status": false, "message": "Invalid key..." }` |
| Missing email | `{ "status": false, "message": "Email is required" }` |
| Invalid amount | `{ "status": false, "message": "Amount should be a positive number" }` |
| Duplicate reference | `{ "status": false, "message": "Duplicate Transaction Reference" }` |

### Comparison

| Aspect | Paystack | Stripe | Paynow |
|--------|----------|--------|--------|
| Structured error codes | No -- just `message` | Yes -- `type`, `code`, `param` | No |
| Doc links in errors | No | Yes -- `doc_url` | No |
| Dashboard request logs | Yes | Yes -- `request_log_url` in error | No |
| Human-readable messages | Yes | Yes | Sometimes |

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
    |  3. POSTs to https://api.paystack.co/transaction/initialize
    |  4. Returns authorization_url
    v
Frontend redirects to authorization_url
    |
    v
Paystack Hosted Checkout Page
    |  (Card / Bank Transfer / Mobile Money)
    |
    +---> Success --> redirect to callback_url with ?trxref=REF&reference=REF
    |
    v
Paystack sends webhook (charge.success)
    |
    v
Edge Function (payment-webhook/index.ts)
    |  1. Verifies HMAC SHA512 signature
    |  2. Verifies transaction with GET /transaction/verify/:ref
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
PAYSTACK_SECRET_KEY=sk_test_...    # From Paystack Dashboard > Settings > API Keys
```

---

## 8. Key Code Snippets

### 8a. Initializing a Transaction

```typescript
const response = await fetch("https://api.paystack.co/transaction/initialize", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: "buyer@example.com",
    amount: 1000 * 100, // US$1000 in cents
    reference: "ZL-M3K9-AB2F",
    callback_url: "https://app.com/payment-status/ZL-M3K9-AB2F",
    metadata: { livestock_title: "Hereford Bull" },
  }),
});

const { data } = await response.json();
// data.authorization_url -> "https://checkout.paystack.com/xxxx"
// data.access_code -> "xxxx"
// data.reference -> "ZL-M3K9-AB2F"
```

### 8b. Verifying a Transaction

```typescript
const verifyResponse = await fetch(
  `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
  { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
);
const verifyData = await verifyResponse.json();
// verifyData.data.status === "success" means payment went through
```

### 8c. Webhook Signature Verification (HMAC SHA512)

```typescript
const body = await req.text();
const signature = req.headers.get("x-paystack-signature");

const key = await crypto.subtle.importKey(
  "raw", encoder.encode(PAYSTACK_SECRET_KEY),
  { name: "HMAC", hash: "SHA-512" }, false, ["sign"]
);
const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
const computed = Array.from(new Uint8Array(signatureBuffer))
  .map(b => b.toString(16).padStart(2, "0")).join("");

if (computed !== signature) {
  return new Response("Invalid signature", { status: 403 });
}
```

### 8d. Frontend -- Redirect to Paystack

```typescript
const { data: paystackResult } = await supabase.functions.invoke('initiate-payment', {
  body: { reference, amount, livestockTitle },
});

if (paystackResult?.redirectUrl) {
  window.location.href = paystackResult.redirectUrl;
}
```

---

## 9. Gotchas and Pitfalls

| Gotcha | Impact | Solution |
|--------|--------|----------|
| Amounts in **kobo/cents** not dollars | Same as Stripe -- multiply by 100 | `amount: amount * 100` |
| No official SDK for Deno | Must use raw fetch calls | Standard REST is actually simpler than needing an SDK |
| Webhook body must be raw text for HMAC | Same as Stripe -- can't parse first | Use `req.text()` not `req.json()` |
| `callback_url` gets `?trxref=` and `?reference=` appended | URL params may conflict with your own | Handle both Paystack's params and your own |
| Always verify via API, not just webhook | Webhooks can be spoofed if signature check fails | Call `GET /transaction/verify/:ref` as defense in depth |
| Paystack docs block automated fetching | Cannot use WebFetch to read docs programmatically | DX negative -- forces manual reading |

---

## 10. Scores Summary

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

## 11. Paystack vs Stripe vs Paynow Comparison

| Dimension | Paystack | Stripe | Paynow |
|-----------|----------|--------|--------|
| **Hosted checkout** | Yes -- clean UI | Yes -- full-featured | Yes -- basic |
| **Mobile money** | Yes (Ghana, Nigeria) | No | Yes (EcoCash, OneMoney) |
| **SDK** | Community Node.js SDK | Official SDK, full TypeScript | No SDK |
| **Webhook security** | HMAC SHA512 (manual, ~10 lines) | SDK method (1 line) | SHA-512 hash (25+ lines, 3 strategies) |
| **Test environment** | Good -- test cards documented | Excellent -- CLI, many test scenarios | Limited |
| **Error messages** | `message` string only | Structured with codes + doc links | Plain text |
| **Documentation** | Good -- clear, focused on African market | Comprehensive, multi-language | Minimal |
| **Africa availability** | Nigeria, Ghana, South Africa, Kenya | Not directly in most African countries | Zimbabwe only |
| **Currency support** | NGN, GHS, ZAR, KES, USD | 135+ currencies | ZWL, USD |
| **Code complexity** | ~557 lines | ~561 lines | ~746 lines |

---

## 12. Deployment Notes

```bash
# Set Paystack secret on remote Supabase
supabase secrets set PAYSTACK_SECRET_KEY=sk_test_...

# Deploy Edge Functions
supabase functions deploy initiate-payment
supabase functions deploy payment-webhook
supabase functions deploy test-paystack-checkout --no-verify-jwt
```

### Paystack Webhook Configuration

In Paystack Dashboard > Settings > API Keys & Webhooks:
- **Webhook URL:** `https://<project-ref>.supabase.co/functions/v1/payment-webhook`
- **Events:** Paystack sends all events to a single URL -- filter by `event.event` in your handler

---

## 13. Recommendations for Paynow Based on Paystack's DX

1. **Simple REST API is good enough** -- Paystack doesn't need an SDK for basic integration. The clean REST pattern (`POST /initialize`, `GET /verify/:ref`) with Bearer auth is more developer-friendly than Paynow's form-encoded + hash approach.

2. **Document test credentials clearly** -- Paystack lists specific test card numbers with specific CVVs and expiry dates. Paynow should do the same for EcoCash/OneMoney test numbers.

3. **Use HMAC for webhooks** -- Paystack's HMAC SHA512 on the raw body is standard and works reliably. Paynow's hash-of-concatenated-values with unclear field ordering caused us to need 3 verification strategies.

4. **Transaction verification endpoint** -- Paystack provides `GET /transaction/verify/:ref` as a backup to webhooks. Paynow's poll URL serves a similar purpose but is less standardized.

5. **Single webhook URL for all events** -- Paystack sends all event types to one URL with an `event` field to distinguish. This is simpler to configure than needing separate endpoints.
