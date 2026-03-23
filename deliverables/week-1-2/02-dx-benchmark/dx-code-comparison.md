# Payment Provider DX — Side-by-Side Code Comparison

> Real code from the same app (ZimLivestock), same use case (initiate a US$10 test payment), same runtime (Supabase Edge Functions / Deno).
> Every snippet below is from our actual codebase — not documentation examples.

---

## 1. Payment Initiation — "Show me the code"

### Stripe (25 lines — SDK with TypeScript types)

```typescript
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-12-18.acacia",
});

// One SDK call — typed params, autocomplete guides you
const session = await stripe.checkout.sessions.create({
  mode: "payment",
  line_items: [{
    price_data: {
      currency: "usd",
      unit_amount: Math.round(amount * 100), // cents
      product_data: {
        name: "Test Livestock Purchase",
        description: `Reference: ${reference}`,
      },
    },
    quantity: 1,
  }],
  metadata: { reference, test: "true" },
  customer_email: email,
  success_url: `${origin}/payment-status/${reference}?stripe_status=success`,
  cancel_url: `${origin}/payment-status/${reference}?stripe_status=cancelled`,
});

// Done. session.url is your redirect.
return { redirectUrl: session.url };
```

**What you think about while writing this:** "Which fields do I need?" — TypeScript autocomplete answers every question.

---

### Paystack (15 lines — raw fetch, Bearer token)

```typescript
const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")!;

// One fetch call — JSON in, JSON out
const response = await fetch("https://api.paystack.co/transaction/initialize", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: email || "test@example.com",
    amount: Math.round(amount * 100), // kobo (cents)
    reference,
    callback_url: `${origin}/payment-status/${reference}`,
    metadata: { livestock_title: "Test Livestock Purchase" },
  }),
});

const data = await response.json();
// Done. data.data.authorization_url is your redirect.
return { redirectUrl: data.data.authorization_url };
```

**What you think about while writing this:** "That was relatively easy."

---

### Flutterwave (18 lines — raw fetch, Bearer token)

```typescript
const FLUTTERWAVE_SECRET_KEY = Deno.env.get("FLUTTERWAVE_SECRET_KEY");

// Similar to Paystack — one fetch, JSON in/out
const response = await fetch("https://api.flutterwave.com/v3/payments", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    tx_ref: reference,
    amount: amount || 10, // actual currency, NOT cents
    currency: "USD",
    redirect_url: `${origin}/payment-status/${reference}`,
    customer: { email: email || "test@example.com", name: "Test Customer" },
    customizations: { title: "ZimLivestock", description: "Test Payment" },
  }),
});

const data = await response.json();
// Done. data.data.link is your redirect.
return { redirectUrl: data.data.link };
```

**What you think about while writing this:** "Almost the same as Paystack... but wait, amount is NOT in cents? OK, easier."

---

### Paynow (40 lines — manual hash + form-encoded)

```typescript
const integrationId = Deno.env.get("PAYNOW_INTEGRATION_ID");
const integrationKey = Deno.env.get("PAYNOW_INTEGRATION_KEY");
const resultUrl = Deno.env.get("PAYNOW_RESULT_URL");
const returnUrl = Deno.env.get("PAYNOW_RETURN_URL");
// Already 4 env vars vs Paystack's 1

// Build form values in EXACT insertion order (hash depends on it)
const values: Record<string, string> = {
  id: integrationId,
  reference: reference,
  amount: Number(amount).toFixed(2),
  additionalinfo: "Benchmark test payment",
  returnurl: returnUrl,
  resulturl: resultUrl,
  authemail: "test@benchmark.com", // silently required, not obvious
  status: "Message", // literal string "Message" — not intuitive
};

// Manual SHA-512 hash computation (7 lines just for auth)
const hashString = Object.values(values).join("") + integrationKey;
const encoder = new TextEncoder();
const data = encoder.encode(hashString);
const hashBuffer = await crypto.subtle.digest("SHA-512", data);
const hashArray = Array.from(new Uint8Array(hashBuffer));
const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
values.hash = hash.toUpperCase();

// Can't POST from server — Cloudflare blocks it
// Return signed form data for browser to submit directly
return {
  formAction: "https://www.paynow.co.zw/interface/initiatetransaction",
  formFields: values,
};
// Browser submits the form. Not ideal.
```

**What you think about while writing this:** "Why am I computing a hash manually? Why is the status literally 'Message'? Why do I need 4 env vars? Why can't I POST from my server?"

---

### Pesepay (55 lines — AES encryption + fetch)

```typescript
const PESEPAY_API_KEY = Deno.env.get("PESEPAY_API_KEY");
const PESEPAY_ENCRYPTION_KEY = Deno.env.get("PESEPAY_ENCRYPTION_KEY");

// Step 1: AES-256-CBC encryption function (20 lines of boilerplate)
async function encryptPayload(payload: object, encryptionKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const plaintext = JSON.stringify(payload);
  const keyHash = await crypto.subtle.digest("SHA-256", encoder.encode(encryptionKey));
  const key = await crypto.subtle.importKey("raw", keyHash, { name: "AES-CBC" }, false, ["encrypt"]);
  const iv = new Uint8Array(keyHash.slice(0, 16));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-CBC", iv }, key, encoder.encode(plaintext));
  const bytes = new Uint8Array(encrypted);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Step 2: Build payload and encrypt it
const paymentPayload = {
  amountDetails: { amount: amount || 10, currencyCode: "USD" },
  reasonForPayment: "Test Payment",
  resultUrl: `${origin}/api/webhook`,
  returnUrl: `${origin}/payment-status/${reference}`,
  merchantReference: reference,
};
const encryptedPayload = await encryptPayload(paymentPayload, PESEPAY_ENCRYPTION_KEY);

// Step 3: Send encrypted payload
const response = await fetch(
  "https://api.pesepay.com/api/payments-engine/v1/payments/initiate",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PESEPAY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ payload: encryptedPayload }),
  }
);
// ⚠️ THIS CRASHES: Pesepay returns malformed HTTP headers
// Deno throws: "invalid HTTP header parsed" before we can read the response

// Step 4 (if it worked): Decrypt the response
// Another 15 lines of AES decryption boilerplate...
```

**What you think about while writing this:** "I need to encrypt my request AND decrypt the response? Every single time? ...and it doesn't even work because their HTTP headers are broken?"

---

## 2. Webhook Verification — "Prove this payment is real"

### Stripe (1 line)

```typescript
const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
// Done. If it throws, the webhook is invalid.
```

### Paystack (10 lines — standard HMAC)

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

if (computed !== signature) { /* reject */ }
```

### Flutterwave (3 lines)

```typescript
const secretHash = Deno.env.get("FLUTTERWAVE_WEBHOOK_HASH");
const signature = req.headers.get("verif-hash");
if (signature !== secretHash) { /* reject */ }
```

### Paynow (25+ lines — 3 strategies because field order is undocumented)

```typescript
// Strategy 1: Documented field order
const documentedOrder = ["reference", "paynowreference", "amount", "status", "pollurl"];
const docValues = documentedOrder.filter(k => k in params).map(k => params[k]).join("");
let hash = await computeSHA512(docValues + integrationKey);

// Strategy 2: Received field order (if strategy 1 fails)
if (hash !== receivedHash) {
  const receivedValues = Object.entries(params)
    .filter(([k]) => k !== "hash")
    .map(([, v]) => v).join("");
  hash = await computeSHA512(receivedValues + integrationKey);
}

// Strategy 3: Alphabetical sort (if strategy 2 also fails)
if (hash !== receivedHash) {
  const sortedValues = Object.entries(params)
    .filter(([k]) => k !== "hash")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v).join("");
  hash = await computeSHA512(sortedValues + integrationKey);
}

if (hash !== receivedHash) { /* reject — all 3 strategies failed */ }
```

### Pesepay (25+ lines — AES decrypt, API verify, AES decrypt again)

```typescript
// Step 1: AES decrypt the webhook body (~15 lines of boilerplate)
const decrypted = await decryptPayload(webhookBody, PESEPAY_ENCRYPTION_KEY);

// Step 2: Verify via API call (another round trip)
const verifyResponse = await fetch(
  `https://api.pesepay.com/api/payments-engine/v1/payments/check-payment?referenceNumber=${ref}`,
  { headers: { Authorization: `Bearer ${PESEPAY_API_KEY}` } }
);

// Step 3: AES decrypt the verify response (~15 more lines of boilerplate)
const verifyDecrypted = await decryptPayload(await verifyResponse.json().payload, PESEPAY_ENCRYPTION_KEY);
```

---

## 3. Visual Comparison — Lines of Code

```
Payment Initiation (core logic only):

  Paystack    ███████████████              15 lines
  Flutterwave ██████████████████           18 lines
  Stripe      █████████████████████████    25 lines (SDK setup included)
  Paynow      ████████████████████████████████████████  40 lines
  Pesepay     ███████████████████████████████████████████████████████  55 lines

Webhook Verification:

  Stripe      █                            1 line
  Flutterwave ███                          3 lines
  Paystack    ██████████                   10 lines
  Paynow      █████████████████████████    25+ lines (3 strategies!)
  Pesepay     █████████████████████████    25+ lines (AES × 3)

Total Integration (all files):

  Flutterwave ████████████████████████████████████████████████████  523 lines
  Paystack    █████████████████████████████████████████████████████ 557 lines
  Stripe      ██████████████████████████████████████████████████████ 561 lines
  Pesepay     ████████████████████████████████████████████████████████████  608 lines
  Paynow      ████████████████████████████████████████████████████████████████████████████████████  835 lines
```

---

## 4. Auth Setup — What it takes to make your first API call

### Stripe
```typescript
// 1 import + 1 env var
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
// You're ready. Make API calls.
```

### Paystack
```typescript
// 1 env var, used as Bearer token
const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")!;
// Add to headers: Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
// You're ready.
```

### Flutterwave
```typescript
// 1 env var for API + 1 for webhook hash
const FLUTTERWAVE_SECRET_KEY = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
// Same as Paystack: Bearer token in headers.
```

### Paynow
```typescript
// 4 env vars
const integrationId = Deno.env.get("PAYNOW_INTEGRATION_ID");
const integrationKey = Deno.env.get("PAYNOW_INTEGRATION_KEY");
const resultUrl = Deno.env.get("PAYNOW_RESULT_URL");
const returnUrl = Deno.env.get("PAYNOW_RETURN_URL");
// Not ready yet. Still need to compute SHA-512 hash for every request.
```

### Pesepay
```typescript
// 2 env vars + 40 lines of AES helper functions
const PESEPAY_API_KEY = Deno.env.get("PESEPAY_API_KEY");
const PESEPAY_ENCRYPTION_KEY = Deno.env.get("PESEPAY_ENCRYPTION_KEY");
// Not ready yet. Need encryptPayload() and decryptPayload() functions first.
```

---

## 5. Error Handling — What happens when things go wrong

### Stripe
```json
{
  "error": {
    "type": "card_error",
    "code": "card_declined",
    "message": "Your card was declined.",
    "param": "number",
    "doc_url": "https://stripe.com/docs/error-codes/card-declined",
    "request_log_url": "https://dashboard.stripe.com/test/logs/req_abc123"
  }
}
```
**You know:** what went wrong, which field, where to read about it, and where to see the raw request.

### Paystack
```json
{
  "status": false,
  "message": "Invalid key. Kindly ensure you are using the right authorization"
}
```
**You know:** what went wrong. Good enough.

### Flutterwave
```json
{
  "status": "error",
  "message": "Invalid authorization key"
}
```
**You know:** what went wrong. Same as Paystack — adequate.

### Paynow
```
status=error&error=Invalid+integration+id
```
**You know:** something is wrong. You need to URL-decode it first. No error code, no doc link, no request ID.

### Pesepay
```
(sometimes encrypted, sometimes plaintext — inconsistent)
```
**You know:** ...nothing, really. You might need to decrypt the error first. Or it might be plaintext. Or the runtime crashed before you could read it.

---

## 6. The "Laziest Integration" Results

| Provider | Time | What I did | Emotional state |
|----------|------|-----------|----------------|
| **Paystack** | 18 min | Copied fetch from docs, pasted Bearer key | "This just works" |
| **Stripe** | 25 min | `import Stripe`, copied quickstart | "SDK types are guiding me" |
| **Flutterwave** | 55 min | Same as Paystack, but webhook hash confused me for 20 min | "Payment worked, webhook... what?" |
| **Paynow** | 90 min | Built hash computation, form encoding, then hit Cloudflare wall | "Is this my fault or theirs?" |
| **Pesepay** | 60 min | Wrote AES encrypt/decrypt, then Deno crashed on HTTP headers | "So close... and then it just breaks" |
| **DPOpay** | N/A | Tried to create sandbox account, asked for business documents | "I can't even start" |

---

*All code snippets from: `/Users/tatendanyemudzo/Downloads/app/supabase/functions/test-{provider}-checkout/index.ts`*
*Same app. Same runtime. Same use case. Only the provider changes.*
