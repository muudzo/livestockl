# Pesepay DX Benchmark Report

## 1. Integration Summary

| Field | Value |
|-------|-------|
| **Provider** | Pesepay |
| **Website** | pesepay.com |
| **Integration method** | Pesepay Hosted Checkout (redirect flow with encrypted payloads) |
| **SDK used** | No SDK -- raw REST API with AES-256-CBC encryption |
| **Date started** | ___ (fill in) |
| **Time to first successful test payment** | ___ minutes (fill in) |
| **Developer friction** | ___ (fill in after testing) |

---

## 2. Signup and Onboarding

**Steps from "I want to integrate" to "it works":**

1. Go to pesepay.com and create a merchant account
2. Verify email and identity (business registration may be required)
3. Land on Pesepay Dashboard
4. Navigate to API Settings to get API Key and Encryption Key
5. Implement AES-256-CBC encryption for request payloads
6. Implement AES-256-CBC decryption for response payloads
7. POST encrypted payload to `/api/payments-engine/v1/payments/initiate`
8. Decrypt response to get `redirectUrl`
9. Redirect user to Pesepay's hosted checkout
10. User completes payment
11. Pesepay redirects back to your `returnUrl`
12. Pesepay sends encrypted webhook to your `resultUrl`

**Total steps: 12** (from zero to working payment -- most of any provider)

| Metric | Score |
|--------|-------|
| Account creation time | ___ minutes (fill in) |
| Required verification for testing | Business registration may be required |
| Sandbox available immediately | Unclear -- test mode availability varies |
| Test API keys accessible from dashboard | Yes (API Key + Encryption Key) |

**Onboarding Score: ___/5** (fill in)

---

## 3. Documentation Quality

**URL:** https://developer.pesepay.com

| Criteria | Observation |
|----------|-------------|
| Quickstart guide | Limited -- basic API reference only |
| Code examples | PHP and Node.js examples available |
| API reference | Documented but less detailed than Paystack/Stripe |
| Search functionality | Basic |
| Interactive API testing | No |
| Versioned docs | v1 is current |

**Our payment initiation required this code:**

```typescript
// Pesepay: Encrypted REST API -- most complex of all providers
// Step 1: Build the payment payload
const paymentPayload = {
  amountDetails: { amount: 1000, currencyCode: "USD" },
  reasonForPayment: "Livestock Purchase",
  resultUrl: "https://api.example.com/webhook",
  returnUrl: "https://app.com/payment-status/REF",
  merchantReference: "ZL-M3K9-AB2F",
};

// Step 2: Encrypt with AES-256-CBC (~25 lines)
const keyData = await crypto.subtle.digest("SHA-256", encoder.encode(encryptionKey));
const key = await crypto.subtle.importKey("raw", keyData, { name: "AES-CBC" }, false, ["encrypt"]);
const iv = new Uint8Array(keyData.slice(0, 16));
// ... PKCS7 padding, encrypt, base64 encode

// Step 3: POST encrypted payload
const response = await fetch("https://api.pesepay.com/api/payments-engine/v1/payments/initiate", {
  method: "POST",
  headers: { Authorization: PESEPAY_API_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ payload: encryptedPayload }),
});

// Step 4: Decrypt response (~20 lines)
const data = await response.json();
const decrypted = await decryptPayload(data.payload, encryptionKey);
// decrypted.redirectUrl -> redirect user here
```

**Compared to Paystack (no encryption):**

```typescript
// Paystack: 5 lines, no encryption needed
const response = await fetch("https://api.paystack.co/transaction/initialize", {
  method: "POST",
  headers: { Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" },
  body: JSON.stringify({ email, amount: amount * 100, reference, callback_url }),
});
const data = await response.json();
// data.data.authorization_url -> redirect
```

**Compared to Flutterwave (no encryption):**

```typescript
// Flutterwave: 5 lines, no encryption needed
const response = await fetch("https://api.flutterwave.com/v3/payments", {
  method: "POST",
  headers: { Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" },
  body: JSON.stringify({ tx_ref, amount, currency: "USD", redirect_url, customer: { email } }),
});
const data = await response.json();
// data.data.link -> redirect
```

**Documentation Score: ___/5** (fill in)

---

## 4. SDK Usability

| Criteria | Observation |
|----------|-------------|
| Package | No official Deno SDK -- raw REST API with mandatory AES encryption |
| TypeScript support | No types -- you define your own interfaces |
| Authentication | API Key in `Authorization` header (not Bearer format) |
| API call pattern | Encrypted REST: encrypt payload -> POST -> decrypt response |
| Error handling | Mixed -- some errors encrypted, some plaintext JSON |
| Webhook verification | Encrypted payload decryption (not HMAC) |

**Encryption overhead -- Pesepay (~50 lines for encrypt + decrypt):**

```typescript
// Encrypt function (~25 lines)
async function encryptPayload(payload: object, encryptionKey: string): Promise<string> {
  const keyData = await crypto.subtle.digest("SHA-256", encoder.encode(encryptionKey));
  const key = await crypto.subtle.importKey("raw", keyData, { name: "AES-CBC" }, false, ["encrypt"]);
  const iv = new Uint8Array(keyData.slice(0, 16));
  // PKCS7 padding
  const data = encoder.encode(JSON.stringify(payload));
  const padLength = 16 - (data.length % 16);
  const padded = new Uint8Array(data.length + padLength);
  padded.set(data);
  padded.fill(padLength, data.length);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-CBC", iv }, key, padded);
  // base64 encode...
  return btoa(binary);
}

// Decrypt function (~20 lines)
async function decryptPayload(encrypted: string, encryptionKey: string): Promise<any> {
  // Reverse of above: base64 decode, decrypt, remove PKCS7 padding, JSON parse
}
```

**Webhook verification -- Pesepay (decrypt payload, ~20 lines + API verify):**

```typescript
// 1. Decrypt the webhook body
const webhookData = await decryptPayload(body.payload, PESEPAY_ENCRYPTION_KEY);
// 2. Verify via API call
const check = await fetch(`https://api.pesepay.com/.../check-payment?referenceNumber=${ref}`);
// 3. Decrypt verification response
const verified = await decryptPayload(checkData.payload, PESEPAY_ENCRYPTION_KEY);
```

**Webhook verification comparison:**

| Provider | Method | Lines |
|----------|--------|-------|
| Stripe | SDK `constructEvent()` | 1 |
| Flutterwave | Secret hash header comparison | 3 |
| Paystack | HMAC SHA512 | ~10 |
| Pesepay | AES decrypt + API verify + AES decrypt | ~25+ |
| Paynow | SHA-512 hash (3 strategies) | ~25+ |

**Lines of code comparison:**

| Component | Pesepay | Flutterwave | Paystack | Stripe | Paynow |
|-----------|---------|-------------|----------|--------|--------|
| Payment initiation (Edge Function) | ~205 lines | ~145 lines | ~150 lines | ~158 lines | ~257 lines |
| Webhook handler | ~140 lines | ~115 lines | ~125 lines | ~122 lines | ~146 lines |
| Frontend hook | ~115 lines | ~115 lines | ~132 lines | ~132 lines | ~137 lines |
| Checkout UI | ~148 lines | ~148 lines | ~150 lines | ~149 lines | ~206 lines |
| **Total** | **~608 lines** | **~523 lines** | **~557 lines** | **~561 lines** | **~746 lines** |

Note: Pesepay line count is inflated by the ~50 lines of encrypt/decrypt utility code that must be duplicated in each Edge Function.

**SDK Usability Score: ___/5** (fill in)

---

## 5. Sandbox / Testing Experience

### Test Credentials
- Pesepay test mode credentials: Check Dashboard > API Settings
- Test card numbers: Not clearly documented (major DX gap)
- Test mobile money numbers: Not clearly documented

### Supported Payment Methods
- Visa / Mastercard
- EcoCash
- OneMoney
- Telecash
- Zimswitch

### Webhook Testing
- No official CLI for local webhook forwarding
- Use ngrok to expose localhost
- Webhooks are encrypted -- debugging requires decryption

### Dashboard
- Transaction history available
- Less detailed than Paystack/Flutterwave dashboards

**Compared to Stripe:**
- Stripe has comprehensive test cards, CLI tools, detailed dashboard
- Pesepay test documentation is significantly less detailed

**Compared to Paystack:**
- Paystack has clearly documented test cards with specific scenarios
- Pesepay test card documentation is unclear or missing

**Compared to Flutterwave:**
- Flutterwave has documented test cards with PIN + OTP
- Pesepay lacks equivalent documentation

**Compared to Paynow:**
- Both are Zimbabwe-focused
- Neither has great test credential documentation
- Pesepay has a more modern API design but encryption adds complexity

**Sandbox Score: ___/5** (fill in)

---

## 6. Error Message Clarity

### Pesepay Error Response Structure

Errors may come in two formats:

**Plaintext (non-encrypted):**
```json
{
  "status": "error",
  "message": "Invalid API key"
}
```

**Encrypted (need to decrypt first):**
```json
{
  "payload": "<encrypted_error_message>"
}
```

### Common Errors

| Scenario | Response |
|----------|----------|
| Invalid API key | Plaintext error message |
| Invalid encryption | Decrypt failure -- no useful error |
| Missing required field | Encrypted error response |
| Invalid amount | Encrypted error response |

### Comparison

| Aspect | Pesepay | Flutterwave | Paystack | Stripe | Paynow |
|--------|---------|-------------|----------|--------|--------|
| Structured error codes | No | No | No | Yes | No |
| Doc links in errors | No | No | No | Yes | No |
| Errors readable without decryption | Sometimes | Yes | Yes | Yes | Yes |
| Dashboard request logs | Basic | Yes | Yes | Yes | No |
| Human-readable messages | After decryption | Yes | Yes | Yes | Sometimes |

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
    |  3. Builds payment payload
    |  4. ENCRYPTS payload with AES-256-CBC  <-- unique to Pesepay
    |  5. POSTs encrypted payload to Pesepay API
    |  6. DECRYPTS response                   <-- unique to Pesepay
    |  7. Returns redirectUrl
    v
Frontend redirects to redirectUrl
    |
    v
Pesepay Hosted Checkout Page
    |  (Card / EcoCash / OneMoney / Telecash / Zimswitch)
    |
    +---> Success --> redirect to returnUrl
    |
    v
Pesepay sends ENCRYPTED webhook to resultUrl
    |
    v
Edge Function (payment-webhook/index.ts)
    |  1. DECRYPTS webhook payload            <-- unique to Pesepay
    |  2. Verifies via GET /check-payment (also encrypted response)
    |  3. DECRYPTS verification response      <-- unique to Pesepay
    |  4. Updates payment status in DB
    |  5. Marks livestock item as "sold"
    v
Frontend polls DB, sees "paid"
```

### Environment Variables Required

```env
PESEPAY_API_KEY=abc123...           # From Dashboard > API Settings
PESEPAY_ENCRYPTION_KEY=xyz789...    # From Dashboard > API Settings
```

---

## 8. Key Code Snippets

### 8a. AES-256-CBC Encryption (required for every API call)

```typescript
async function encryptPayload(payload: object, encryptionKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const plaintext = JSON.stringify(payload);
  const keyData = await crypto.subtle.digest("SHA-256", encoder.encode(encryptionKey));
  const key = await crypto.subtle.importKey("raw", keyData, { name: "AES-CBC" }, false, ["encrypt"]);
  const iv = new Uint8Array(keyData.slice(0, 16));
  const data = encoder.encode(plaintext);
  const padLength = 16 - (data.length % 16);
  const padded = new Uint8Array(data.length + padLength);
  padded.set(data);
  padded.fill(padLength, data.length);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-CBC", iv }, key, padded);
  // ... base64 encode and return
}
```

### 8b. AES-256-CBC Decryption (required for every API response)

```typescript
async function decryptPayload(encryptedBase64: string, encryptionKey: string): Promise<any> {
  const keyData = await crypto.subtle.digest("SHA-256", encoder.encode(encryptionKey));
  const key = await crypto.subtle.importKey("raw", keyData, { name: "AES-CBC" }, false, ["decrypt"]);
  const iv = new Uint8Array(keyData.slice(0, 16));
  const bytes = base64ToUint8Array(encryptedBase64);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, key, bytes);
  // ... remove PKCS7 padding, JSON parse
}
```

### 8c. Initiating a Payment

```typescript
const paymentPayload = {
  amountDetails: { amount: 1000, currencyCode: "USD" },
  reasonForPayment: "Hereford Bull Purchase",
  resultUrl: "https://api.example.com/webhook",
  returnUrl: "https://app.com/payment-status/REF",
  merchantReference: "ZL-M3K9-AB2F",
};
const encrypted = await encryptPayload(paymentPayload, PESEPAY_ENCRYPTION_KEY);
const response = await fetch("https://api.pesepay.com/api/payments-engine/v1/payments/initiate", {
  method: "POST",
  headers: { Authorization: PESEPAY_API_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ payload: encrypted }),
});
const data = await response.json();
const decrypted = await decryptPayload(data.payload, PESEPAY_ENCRYPTION_KEY);
// decrypted.redirectUrl -> redirect user
```

### 8d. Verifying a Payment

```typescript
const checkResponse = await fetch(
  `https://api.pesepay.com/api/payments-engine/v1/payments/check-payment?referenceNumber=${ref}`,
  { headers: { Authorization: PESEPAY_API_KEY } }
);
const checkData = await checkResponse.json();
const verified = await decryptPayload(checkData.payload, PESEPAY_ENCRYPTION_KEY);
// verified.transactionStatus === "SUCCESS"
```

---

## 9. Developer Friction Notes

**What went smoothly:**
- ___ (fill in after testing)

**What caused friction:**
- ___ (fill in after testing)

**Developer quote:** _"___"_ (fill in after testing)

---

## 10. Gotchas and Pitfalls

| Gotcha | Impact | Solution |
|--------|--------|----------|
| **All payloads must be AES encrypted** | Major complexity increase vs other providers | Write reusable encrypt/decrypt functions |
| **All responses are AES encrypted** | Can't just `response.json()` and read fields | Must decrypt before accessing any data |
| **PKCS7 padding required** | AES-CBC needs proper padding or decryption fails | Implement padding manually in Deno |
| **IV derivation unclear** | Docs don't clearly specify how to derive the IV | Use first 16 bytes of SHA-256 hash of encryption key |
| **Error responses mixed format** | Some errors encrypted, some plaintext | Handle both cases in error handling |
| **Two keys required** | API Key + Encryption Key (separate concerns) | Both available in dashboard |
| **Test card numbers undocumented** | Hard to test without knowing test credentials | Check dashboard or contact support |
| **Webhook payloads encrypted** | Can't inspect webhook body in logs without decryption | Log decrypted output for debugging |
| **Amounts in actual currency** | Same as Flutterwave, different from Stripe/Paystack | `amount: 1000` means US$1000 |
| **Zimbabwe-focused** | Limited to Zimbabwe payment methods | Good for local market, not for international |

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

## 12. Pesepay vs All Providers Comparison

| Dimension | Pesepay | Flutterwave | Paystack | Stripe | Paynow |
|-----------|---------|-------------|----------|--------|--------|
| **Hosted checkout** | Yes | Yes -- clean UI | Yes -- clean UI | Yes -- full-featured | Yes -- basic |
| **Payload encryption** | AES-256-CBC required | None | None | None | SHA-512 hash |
| **Amount format** | Actual currency | Actual currency | Kobo/cents | Cents | Actual currency |
| **Local payment methods** | EcoCash, OneMoney, Telecash, Zimswitch | M-Pesa, MTN, Airtel | Nigeria/Ghana mobile | None | EcoCash, OneMoney |
| **SDK** | None | Community Node.js | Community Node.js | Official TypeScript | None |
| **Webhook security** | AES decryption + API verify | Secret hash (3 lines) | HMAC SHA512 (10 lines) | SDK (1 line) | SHA-512 (25+ lines) |
| **Test environment** | Limited documentation | Good | Good | Excellent | Limited |
| **Error messages** | Mixed encrypted/plain | Plain JSON | Plain JSON | Structured + doc links | Plain text |
| **Documentation** | Basic | Good | Good | Comprehensive | Minimal |
| **Zimbabwe support** | Yes -- primary market | No | No | No | Yes -- primary market |
| **Code complexity** | ~608 lines | ~523 lines | ~557 lines | ~561 lines | ~746 lines |

---

## 13. Deployment Notes

```bash
# Set Pesepay secrets on remote Supabase
supabase secrets set PESEPAY_API_KEY=...
supabase secrets set PESEPAY_ENCRYPTION_KEY=...

# Deploy Edge Functions
supabase functions deploy initiate-payment
supabase functions deploy payment-webhook
supabase functions deploy test-pesepay-checkout --no-verify-jwt
```

### Pesepay Webhook Configuration

In Pesepay Dashboard:
- **Result URL** is set per-transaction in the payment payload (not globally)
- The `resultUrl` field in the encrypted payment payload tells Pesepay where to send the webhook
- Webhooks are sent as encrypted JSON POST requests

---

## 14. Recommendations for Paynow Based on Pesepay's DX

1. **Don't require payload encryption** -- Pesepay's AES encryption requirement is the biggest DX friction point. HTTPS already encrypts data in transit. Paystack/Flutterwave prove that Bearer auth over HTTPS is sufficient. Paynow's hash approach is complex but at least doesn't require encrypting the entire payload.

2. **Use JSON, not form-encoded** -- Pesepay uses JSON throughout (a DX win over Paynow's form-encoded approach). JSON is easier to construct, parse, and debug.

3. **Consistent error format** -- Pesepay sometimes returns encrypted errors and sometimes plaintext. Pick one format and stick with it.

4. **Document test credentials clearly** -- Both Pesepay and Paynow have unclear test credential documentation. This is a major DX gap that Paystack and Flutterwave handle much better.

5. **Zimbabwe payment methods** -- Pesepay supports Telecash and Zimswitch in addition to EcoCash/OneMoney. If Paynow doesn't support these, it's a competitive gap.

6. **Modern API design** -- Despite the encryption overhead, Pesepay's API structure (versioned, RESTful, JSON) is more modern than Paynow's form-encoded approach. Paynow could adopt similar patterns.
