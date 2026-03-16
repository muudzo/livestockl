# Stripe DX Benchmark Report

## 1. Integration Summary

| Field | Value |
|-------|-------|
| **Provider** | Stripe |
| **Website** | stripe.com |
| **Integration method** | Stripe Checkout (hosted payment page) |
| **SDK used** | `stripe` v17.7.0 (Deno ESM import) |
| **Date started** | ___ (fill in) |
| **Time to first successful test payment** | ___ minutes (fill in) |

---

## 2. Signup and Onboarding

**Steps from "I want to integrate" to "it works":**

1. Go to stripe.com and create an account (email + password)
2. Verify email address
3. Land on Stripe Dashboard -- test mode is enabled by default
4. Navigate to Developers > API Keys to get `pk_test_...` and `sk_test_...`
5. Install SDK or use ESM import
6. Create a Checkout Session (server-side)
7. Redirect user to `session.url`
8. Payment completes on Stripe's hosted page

**Total steps: 8** (from zero to working test payment)

| Metric | Score |
|--------|-------|
| Account creation time | ___ minutes (fill in when you do it) |
| Required verification for testing | Email only (no business docs for test mode) |
| Sandbox available immediately | Yes -- test mode is the default |
| Test API keys accessible from dashboard | Yes -- visible on first dashboard load |

**Onboarding Score: ___/5** (fill in after going through it)

**Notes/Screenshots:** ___ (add screenshots of the signup flow and dashboard here)

---

## 3. Documentation Quality

**URL:** https://docs.stripe.com

| Criteria | Observation |
|----------|-------------|
| Quickstart guide | Yes -- dedicated Checkout quickstart with step-by-step instructions |
| Code examples | Available in 7 languages: Node.js, Python, Ruby, PHP, Go, Java, .NET |
| API reference | Complete -- every endpoint, parameter, and response documented |
| Search functionality | Full-text search across all docs, returns relevant results instantly |
| Code snippets are copy-pasteable | Yes -- includes syntax highlighting and copy buttons |
| Versioned docs | Yes -- API versions are documented with changelogs |
| Interactive examples | Yes -- API Explorer lets you make calls from the browser |

**Our Checkout Session creation required this code (Deno/Edge Function):**

```typescript
// Total: 24 lines for the core Stripe call
const session = await stripe.checkout.sessions.create({
  mode: "payment",
  line_items: [
    {
      price_data: {
        currency: "usd",
        unit_amount: amount * 100, // Stripe uses cents
        product_data: {
          name: livestockTitle || "Livestock Purchase",
          description: `Reference: ${reference}`,
        },
      },
      quantity: 1,
    },
  ],
  metadata: {
    reference,
    livestock_id: paymentRecord.livestock_id,
    user_id: callerUser.id,
  },
  customer_email: callerUser.email,
  success_url: `${origin}/payment-status/${reference}?stripe_status=success`,
  cancel_url: `${origin}/payment-status/${reference}?stripe_status=cancelled`,
});
```

**Compared to Paynow which required:**

```typescript
// Paynow: ~40 lines -- manual hash, form-encoding, separate endpoints for mobile vs web
const values = { id: integrationId, reference, amount: amount.toString(), ... };
const hashString = Object.values(values).join("") + integrationKey;
const data = encoder.encode(hashString);
const hashBuffer = await crypto.subtle.digest("SHA-512", data);
const hash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
values.hash = hash.toUpperCase();
const formBody = new URLSearchParams(values).toString();
const response = await fetch("https://www.paynow.co.zw/interface/initiatetransaction", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: formBody,
});
const parsed = Object.fromEntries(new URLSearchParams(await response.text()));
```

**Documentation Score: ___/5** (fill in)

---

## 4. SDK Usability

| Criteria | Observation |
|----------|-------------|
| Package | `stripe` on npm / `https://esm.sh/stripe@17.7.0?target=deno` for Deno |
| TypeScript support | Full types included -- autocomplete works for every method and parameter |
| Authentication | Single constructor: `new Stripe(secretKey)` |
| API call pattern | `stripe.checkout.sessions.create({...})` -- clean, predictable |
| Error handling | Typed exceptions (`Stripe.errors.StripeCardError`, etc.) |
| Webhook verification | One-liner: `stripe.webhooks.constructEvent(body, sig, secret)` |

**Webhook verification -- Stripe (3 lines):**

```typescript
const signature = req.headers.get("stripe-signature");
const event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
// done -- event is typed and verified
```

**Webhook verification -- Paynow (25+ lines, 3 hash strategies):**

```typescript
// Strategy 1: Documented field order
const documentedOrder = ["reference", "paynowreference", "amount", "status", "pollurl"];
const documentedValues = documentedOrder.filter(key => key in params).map(key => params[key]).join("");
let computedHash = await computeHash(documentedValues);

// Strategy 2: Received order (if strategy 1 fails)
if (computedHash !== receivedHash?.toUpperCase()) {
  const receivedOrderValues = Object.entries(params)
    .filter(([key]) => key.toLowerCase() !== "hash")
    .map(([, value]) => value).join("");
  computedHash = await computeHash(receivedOrderValues);
}

// Strategy 3: Alphabetical (if strategy 2 fails)
if (computedHash !== receivedHash?.toUpperCase()) {
  const sortedValues = Object.entries(params)
    .filter(([key]) => key.toLowerCase() !== "hash")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, value]) => value).join("");
  computedHash = await computeHash(sortedValues);
}
```

**Lines of code comparison:**

| Component | Stripe | Paynow |
|-----------|--------|--------|
| Payment initiation (Edge Function) | 158 lines | 257 lines |
| Webhook handler | 122 lines | 146 lines |
| Frontend hook (usePayments) | 132 lines | 137 lines |
| Checkout UI component | 149 lines | 206 lines |
| **Total** | **561 lines** | **746 lines** |
| **Net difference** | **185 fewer lines (25% less code)** | -- |

**SDK Usability Score: ___/5** (fill in)

---

## 5. Sandbox / Testing Experience

### Test Card Numbers

| Scenario | Card Number | CVC | Expiry |
|----------|-------------|-----|--------|
| Successful payment | 4242 4242 4242 4242 | Any 3 digits | Any future date |
| Requires 3D Secure | 4000 0025 0000 3155 | Any 3 digits | Any future date |
| Card declined | 4000 0000 0000 9995 | Any 3 digits | Any future date |
| Insufficient funds | 4000 0000 0000 9995 | Any 3 digits | Any future date |
| Visa (debit) | 4000 0566 5566 5556 | Any 3 digits | Any future date |
| Mastercard | 5555 5555 5555 4444 | Any 3 digits | Any future date |
| Amex | 3782 822463 10005 | Any 4 digits | Any future date |
| Discover | 6011 1111 1111 1117 | Any 3 digits | Any future date |
| UnionPay | 6200 0000 0000 0005 | Any 3 digits | Any future date |

### Webhook Testing

```bash
# Stripe CLI -- forward webhooks to local dev server
stripe listen --forward-to http://localhost:54321/functions/v1/payment-webhook

# Trigger a test event
stripe trigger checkout.session.completed
```

### PaymentMethod IDs (for API-only testing, no card form needed)

```typescript
// Use these in API calls instead of card numbers
"pm_card_visa"
"pm_card_mastercard"
"pm_card_amex"
"pm_card_discover"
```

### Dashboard

- Test transactions visible in Dashboard under Payments
- Each transaction shows full event log, metadata, and timeline
- Webhook delivery attempts visible with request/response payloads
- Logs > API Requests shows every API call with full request/response

**Compared to Paynow:**
- Paynow has no official CLI for local webhook testing
- No publicly documented test phone numbers for EcoCash/OneMoney sandbox
- Dashboard provides minimal transaction detail
- Webhook debugging requires manual log inspection

**Sandbox Score: ___/5** (fill in after testing)

---

## 6. Error Message Clarity

### Stripe Error Object Structure

```json
{
  "error": {
    "type": "card_error",
    "code": "card_declined",
    "decline_code": "insufficient_funds",
    "message": "Your card has insufficient funds.",
    "param": "payment_method",
    "doc_url": "https://stripe.com/docs/error-codes/card-declined",
    "request_log_url": "https://dashboard.stripe.com/test/logs/req_abc123"
  }
}
```

### Error Types

| Error Type | HTTP Status | When It Happens |
|------------|-------------|-----------------|
| `card_error` | 402 | Card declined, expired, insufficient funds |
| `invalid_request_error` | 400 | Missing/wrong parameters |
| `authentication_error` | 401 | Invalid API key |
| `rate_limit_error` | 429 | Too many requests |
| `api_error` | 500 | Stripe server issue (rare) |
| `idempotency_error` | 400 | Duplicate idempotency key with different params |

### What Makes Stripe Errors Good

1. **`doc_url`** -- Every error links directly to a documentation page explaining it
2. **`request_log_url`** -- Links to the exact API request in your dashboard for debugging
3. **`decline_code`** -- For card errors, tells you exactly why (e.g., `insufficient_funds`, `lost_card`, `stolen_card`)
4. **`param`** -- Tells you which field caused the error
5. **`message`** -- Human-readable, can be shown to end users

### Compared to Paynow

Paynow errors come back as URL-encoded strings:
```
status=error&error=Insufficient+balance
```
- No error codes, just a text message
- No links to documentation
- No parameter identification
- No request tracing

**Error Message Score: ___/5** (fill in after encountering errors)

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
    |  3. Calls stripe.checkout.sessions.create()
    |  4. Returns session.url
    v
Frontend redirects to session.url
    |
    v
Stripe Hosted Checkout Page
    |  (Card / Google Pay / Apple Pay)
    |
    +---> Success --> redirect to /payment-status/:ref?stripe_status=success
    |
    +---> Cancel --> redirect to /payment-status/:ref?stripe_status=cancelled
    |
    v
Stripe sends webhook (checkout.session.completed)
    |
    v
Edge Function (payment-webhook/index.ts)
    |  1. Verifies signature with stripe.webhooks.constructEvent()
    |  2. Updates payment status to "paid" in DB
    |  3. Marks livestock item as "sold"
    |  4. Sends notifications to buyer + seller
    v
Frontend (PaymentStatus.tsx) polls DB, sees "paid"
    |
    v
Shows "Payment Successful"
```

### Environment Variables Required

```env
# Supabase Edge Function secrets
STRIPE_SECRET_KEY=sk_test_...          # From Stripe Dashboard > Developers > API Keys
STRIPE_WEBHOOK_SECRET=whsec_...        # From Stripe Dashboard > Developers > Webhooks
                                       # Or from `stripe listen` CLI output
```

---

## 8. Key Code Snippets

### 8a. SDK Initialization (Deno Edge Function)

```typescript
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-12-18.acacia",
});
```

**DX note:** Single import, single constructor. TypeScript types are bundled. For Node.js it would be `npm install stripe` and `import Stripe from 'stripe'`.

### 8b. Creating a Checkout Session

```typescript
const session = await stripe.checkout.sessions.create({
  mode: "payment",
  line_items: [
    {
      price_data: {
        currency: "usd",
        unit_amount: amount * 100, // GOTCHA: Stripe uses cents, not dollars
        product_data: {
          name: "Hereford Bull - 450kg",
          description: "Reference: ZL-M3K9-AB2F",
        },
      },
      quantity: 1,
    },
  ],
  metadata: {
    reference: "ZL-M3K9-AB2F",        // Our internal reference
    livestock_id: "uuid-here",
    user_id: "uuid-here",
  },
  customer_email: "buyer@example.com",
  success_url: "https://app.com/payment-status/ZL-M3K9-AB2F?stripe_status=success",
  cancel_url: "https://app.com/payment-status/ZL-M3K9-AB2F?stripe_status=cancelled",
});

// session.url -> "https://checkout.stripe.com/c/pay/cs_test_..."
// Redirect the user to this URL
```

### 8c. Webhook Signature Verification

```typescript
const body = await req.text();  // MUST be raw text, not parsed JSON
const signature = req.headers.get("stripe-signature");

let event: Stripe.Event;
try {
  event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
} catch (err) {
  return new Response("Invalid signature", { status: 403 });
}

// event.type is "checkout.session.completed", "checkout.session.expired", etc.
// event.data.object contains the full Checkout Session
```

### 8d. Frontend -- Initiating Payment (React Hook)

```typescript
// Call Edge Function to create Stripe Checkout Session
const { data: stripeResult, error: fnError } = await supabase.functions.invoke(
  'initiate-payment',
  { body: { reference, amount, livestockTitle } }
);

// Redirect to Stripe Checkout
if (stripeResult?.redirectUrl) {
  window.location.href = stripeResult.redirectUrl;
}
```

### 8e. Frontend -- Handling Return from Stripe

```typescript
// PaymentStatus.tsx reads the URL params Stripe sends back
const stripeStatus = searchParams.get('stripe_status'); // "success" or "cancelled"

// But we don't trust the URL alone -- we poll the DB for webhook confirmation
const { data: paymentData } = usePaymentStatus(ref);

// Only show "success" when the webhook has actually updated the DB
if (paymentData?.status === 'paid') return 'success';
if (stripeStatus === 'cancelled') return 'failed';
return 'pending'; // waiting for webhook
```

---

## 9. Gotchas and Pitfalls Encountered

| Gotcha | Impact | Solution |
|--------|--------|----------|
| Amounts are in **cents** not dollars | Would charge 100x less or 100x more | Multiply by 100: `unit_amount: amount * 100` |
| Webhook body must be **raw text** | Signature verification fails if body is parsed | Use `req.text()` not `req.json()` |
| Success URL does not mean payment succeeded | User could manually navigate to success URL | Always verify via webhook, poll DB for status |
| Stripe Checkout sessions expire after 24h | Pending payments could hang forever | Handle `checkout.session.expired` webhook event |
| Deno ESM import needs `?target=deno` | Import fails without target parameter | `https://esm.sh/stripe@17.7.0?target=deno` |

---

## 10. Scores Summary

Fill these in after completing the hands-on integration:

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

## 11. Stripe vs Paynow Comparison

| Dimension | Stripe | Paynow |
|-----------|--------|--------|
| **Hosted checkout** | Full-featured UI with card, Google Pay, Apple Pay | Basic web form |
| **Mobile money** | Not supported | EcoCash, OneMoney (core strength) |
| **SDK** | Official SDK with full TypeScript types | No official SDK -- raw HTTP + manual hashing |
| **Webhook security** | SDK method: `constructEvent()` (1 line) | Manual SHA-512 with unclear field ordering (25+ lines, 3 strategies) |
| **Test environment** | Dedicated test mode, test cards, CLI, dashboard logs | Limited sandbox, unclear test credentials |
| **Error messages** | Typed errors with codes, doc links, dashboard links | Plain text error strings |
| **Documentation** | Comprehensive, multi-language, searchable, interactive | Minimal, single-language examples |
| **Pricing transparency** | Published on website (2.9% + 30c) | Varies, contact required |
| **Zimbabwe availability** | Not directly available | Yes -- primary market |
| **Currency support** | 135+ currencies including USD | ZWL, USD |
| **PCI compliance** | Handled entirely by Stripe | Handled by Paynow |
| **Code complexity** | 561 total lines across 4 files | 746 total lines across 4 files (33% more) |
| **Integration time** | ___ (fill in) | ___ (fill in from main branch experience) |

---

## 12. Recommendations for Paynow Based on Stripe's DX

These will feed into your final report's "5 actionable recommendations":

1. **Provide an official SDK** -- Stripe's single `stripe.checkout.sessions.create()` call vs Paynow's manual hash computation and form encoding is the single biggest DX gap.

2. **Standardize webhook hash field ordering** -- The fact that we needed 3 different hash strategies to handle Paynow webhooks suggests the documentation is unclear. Stripe's `constructEvent()` works every time.

3. **Improve test environment** -- Stripe provides test card numbers, a CLI for local webhook forwarding, and full dashboard logs. Paynow should document test phone numbers for EcoCash/OneMoney sandbox.

4. **Return structured error objects** -- Stripe errors include `code`, `message`, `param`, and `doc_url`. Paynow returns `status=error&error=Some+text`. Structured errors dramatically reduce debugging time.

5. **Publish integration quickstarts** -- Stripe has step-by-step guides in 7 languages. Paynow documentation would benefit from similar quickstarts for common stacks (Node.js, Python, PHP).
