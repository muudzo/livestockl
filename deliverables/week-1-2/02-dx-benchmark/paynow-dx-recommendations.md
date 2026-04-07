# Paynow Developer Experience — Findings & Recommendations

**Author:** Tatenda Nyemudzo
**Date:** 7 April 2026
**Context:** 4 weeks integrating Paynow's payment gateway into a livestock marketplace prototype. Built raw HTTP integration (no SDK) against web checkout, express checkout, webhook handler, and polling endpoints. Also evaluated BillPay Vendor API documentation.
**Methodology:** Hands-on integration, source code analysis of Node.js and Java SDKs, documentation review, comparison against Stripe/Paystack/Flutterwave/Pesepay.

---

## What Paynow Does Well

Before the recommendations, it's important to acknowledge what works. These are genuine strengths that differentiate Paynow from competitors in the Zimbabwean market.

1. **Comprehensive local payment coverage.** EcoCash, OneMoney, InnBucks, O'mari, Zimswitch, Visa/MC — no other Zimbabwean gateway covers this range. Stripe and Paystack don't support any local mobile money methods.

2. **BuySafe escrow is a killer feature.** Built-in escrow with delivery confirmation and dispute mediation — Stripe charges extra for this, Paystack doesn't offer it at all. For marketplace use cases, this is a significant competitive advantage.

3. **Test mode with realistic scenarios.** The four test numbers (success, delayed, cancelled, insufficient balance) simulate real-world payment outcomes well. The 5s/30s delay simulation is useful for testing UI states.

4. **BillPay Vendor API is well-structured.** The AUTH → PAY two-step flow, biller auto-configuration endpoint, and product metadata system are genuinely well-designed. The documentation is thorough with complete request/response examples.

5. **No minimum fees for merchants.** Unlike Stripe ($0.30 + 2.9%), Paynow's fee structure works for micro-transactions common in African markets.

---

## Recommendation 1: Separate API Endpoints from the Main Website

**Severity:** Critical
**Evidence:** Paynow's API endpoints (`/interface/initiatetransaction`, `/interface/remotetransaction`) are hosted on `www.paynow.co.zw` — the same domain as the consumer-facing website. This domain sits behind Cloudflare bot protection, which blocks programmatic access from cloud servers, CI/CD pipelines, and international development machines.

**What we experienced:**
- Supabase Edge Functions (Deno Deploy) cannot reach Paynow at all — connection reset
- Tested from 6 different connection methods including local proxy, VPN, and Zimbabwean network
- Confirmed by Paynow's own developer forum: other integrators report the same issue
- We had to build a browser-relay fallback pattern where the user's browser (which passes Cloudflare challenges) POSTs to Paynow directly

**Why this matters:** Every modern payment integration runs server-to-server. Stripe, Paystack, and Flutterwave all expose APIs on dedicated subdomains (`api.stripe.com`, `api.paystack.co`, `api.flutterwave.com`) that are never behind bot protection. A payment API that blocks programmatic access is fundamentally broken for its intended use case.

**Recommendation:** Host API endpoints on a separate subdomain (e.g., `api.paynow.co.zw`) without Cloudflare bot protection. The API already has hash-based authentication — Cloudflare adds no security value and breaks legitimate integrations.

**Counterargument defense:** "Cloudflare protects against DDoS." — True, but Cloudflare's API-mode configuration allows rate limiting without bot challenges. Stripe processes billions of dollars through APIs without bot challenges on their API subdomain.

---

## Recommendation 2: Support JSON Alongside Form Encoding

**Severity:** High
**Evidence:** Every request and response in the Paynow API uses `application/x-www-form-urlencoded` encoding. Every competing payment gateway (Stripe, Paystack, Flutterwave, Pesepay) uses JSON.

**What we experienced:**
- First integration attempt sent JSON → received HTML error page with 200 OK status
- No error message indicating the format was wrong
- Response parsing required `URLSearchParams` instead of `JSON.parse`
- The BillPay Vendor API already uses JSON — proving Paynow can do this

**Lines of code comparison (same outcome — initiate a payment):**

| Provider | Lines to initiate | Format |
|---|---|---|
| Paystack | 5 | JSON |
| Stripe | 8 | JSON |
| Flutterwave | 7 | JSON |
| **Paynow** | **40+** | Form-encoded + manual hash |

**Recommendation:** Accept `Content-Type: application/json` on all endpoints and return JSON when `Accept: application/json` is set. Keep form-encoded support for backward compatibility. This is a non-breaking change.

**Counterargument defense:** "Form encoding is a standard protocol." — True, but it's a standard from the 1990s. The BillPay API already proves Paynow's team can build JSON APIs. The gateway API should match.

---

## Recommendation 3: Document Hash Computation Explicitly

**Severity:** High
**Evidence:** The hash generation documentation says "concatenate the values in the message for each element in their raw form" — but does not specify the required field order. The example shows one order, but doesn't state it's mandatory.

**What we experienced:**
- Built a Go client using `map[string]string` (random iteration order) → hash failed ~99% of the time
- Spent 3 hours debugging before discovering order matters (from SDK source code, not docs)
- Node.js SDK and Java SDK handle hash differently:
  - Node.js lowercases the integration key: `key.toLowerCase()`
  - Java does not lowercase
  - Same credentials produce different hashes depending on which SDK you reference
- Response hash uses a different field order than request hash (undocumented)

**What the docs should include:**
```
REQUEST HASH ORDER:
1. id
2. reference
3. amount
4. additionalinfo (if present)
5. returnurl
6. resulturl
7. authemail (if present)
8. phone (if present)
9. method (if present)
10. status
+ integration key (appended, NOT lowercased)

RESPONSE HASH ORDER:
1. reference
2. paynowreference  
3. amount
4. status
5. pollurl (if present)
+ integration key
```

**Recommendation:** Add a dedicated "Hash Computation Reference" section with explicit field ordering for both request and response, a worked example with real values, and a note about the integration key casing. Fix the SDK inconsistency.

**Counterargument defense:** "The example in the docs shows the order." — The example shows one specific case but doesn't state the order is mandatory. Developers using languages with unordered maps (Go, Python dicts pre-3.7, Ruby hashes) will fail silently. Stripe's equivalent (HMAC signatures) has explicit documentation with copy-paste verification code.

---

## Recommendation 4: Return Structured Error Responses

**Severity:** High
**Evidence:** Paynow's error responses range from unhelpful to actively misleading.

**What we experienced:**

| Scenario | Paynow Response | What it should say |
|---|---|---|
| Wrong Content-Type | 200 OK + HTML page | `{"error": "Content-Type must be application/x-www-form-urlencoded"}` |
| Missing `authemail` on mobile | `status=Error&error=Invalid+Hash` | `{"error": "authemail is required for express checkout"}` |
| Wrong integration key | `status=Error&error=Invalid+Hash` | `{"error": "Integration key does not match integration ID 23997"}` |
| Server overload | 200 OK + HTML page | 503 with `{"error": "Service temporarily unavailable", "retry_after": 30}` |
| Test mode wrong email | `status=Error&error=The+integration+ID+is+in+test+mode...` | This one is actually good — clear and actionable |

The hash mismatch error is the worst offender. It's returned for at least 5 different root causes (wrong key, wrong field order, wrong encoding, missing field, wrong casing) with no way to distinguish between them. This single error cost us approximately 8 hours of debugging across the integration.

**Recommendation:** Implement error codes with specific messages. Stripe returns errors like `{"type": "card_error", "code": "card_declined", "message": "Your card was declined.", "decline_code": "insufficient_funds"}`. Even a simple improvement like `{"error_code": "HASH_MISMATCH", "expected_prefix": "A3F2...", "received_prefix": "7B1C...", "hint": "Check field ordering"}` would save developers hours.

**Counterargument defense:** "Detailed errors leak security information." — The hash prefix approach reveals nothing about the key. Stripe, which processes more money than any payment gateway, returns detailed error codes. The security-through-obscurity argument doesn't hold when the result is developers unable to integrate.

---

## Recommendation 5: Add Express Checkout Examples to Documentation

**Severity:** Medium
**Evidence:** The express checkout documentation (`/docs/express_checkout_transactions.html`) lists required fields but provides zero request/response examples. The page says fields are "in addition to those specified in the Initiate a Transaction section" without clarifying the relationship between the two endpoints.

**What we experienced:**
- Unclear if `remotetransaction` is standalone or requires a prior `initiatetransaction` call
- No phone number format specified (we discovered "0771234567" works, "+263..." doesn't)
- No complete request example showing all fields together
- No response example showing what `instructions`, `paynowreference`, `pollurl` look like
- Had to test by trial and error with real API calls

**What the page should include:**

```
Complete EcoCash Express Checkout Example:

POST https://www.paynow.co.zw/interface/remotetransaction
Content-Type: application/x-www-form-urlencoded

id=12345&reference=INV-001&amount=10.00&additionalinfo=Payment+for+order
&authemail=customer@example.com&phone=0771234567&method=ecocash
&resulturl=https://example.com/webhook&returnurl=https://example.com/status
&status=Message&hash=ABC123...

Response (Success):
status=Ok&instructions=Dial+*151*2*7#+and+enter+your+EcoCash+PIN
&paynowreference=12345678&pollurl=https://www.paynow.co.zw/Interface/CheckPayment/?guid=...
&hash=DEF456...
```

**Recommendation:** Add complete request/response examples for each payment method (EcoCash, OneMoney, InnBucks, Visa/MC via token). Include phone format guidance.

**Counterargument defense:** "The initiate transaction docs cover the base fields." — True, but developers shouldn't have to mentally merge two documentation pages to construct a single API call. Stripe and Paystack provide complete examples for every endpoint.

---

## Recommendation 6: Provide a Status Page and Webhook Delivery Logs

**Severity:** Medium
**Evidence:** During our integration, we experienced:
- Server completely down for 24+ hours (March 16, 2026) with no way to determine if it was our code or Paynow's infrastructure
- No status page to check
- No webhook delivery logs to verify if callbacks were sent
- No retry documentation for webhooks beyond "up to ten times"

**What competitors offer:**

| Feature | Stripe | Paystack | Paynow |
|---|---|---|---|
| Status page | status.stripe.com | status.paystack.co | None |
| Webhook logs | Dashboard + CLI | Dashboard | None |
| Webhook retry details | Documented (exponential backoff) | Documented | "up to ten times" |
| Webhook testing CLI | `stripe listen --forward-to` | N/A | None |

**Recommendation:** Launch a status page (even a simple one on Atlassian Statuspage — free tier). Add webhook delivery logs to the merchant dashboard. Document webhook retry timing and intervals.

---

## Recommendation 7: Publish an OpenAPI/Swagger Specification

**Severity:** Medium
**Evidence:** No machine-readable API definition exists. Developers cannot auto-generate clients, validate requests, or use API testing tools like Postman collections (except manually).

**What this would enable:**
- Auto-generate SDKs for unsupported languages (Go, Rust, Dart/Flutter)
- Import into Postman for interactive testing
- TypeScript type generation for frontend integrations
- Automated API compatibility testing

**Current SDK coverage:** Node.js, Java, Python, PHP, .NET — no Go, no Dart/Flutter, no Rust, no Ruby.

**Recommendation:** Publish an OpenAPI 3.0 spec at `developers.paynow.co.zw/openapi.json`. This is a one-time effort that multiplicatively benefits every future integration.

**Note:** The BillPay Vendor API has a Postman collection (`https://www.postman.com/paynow/paynow-txt`). Extending this approach to the gateway API would be straightforward.

---

## Recommendation 8: Standardize SDK Behavior Across Languages

**Severity:** Medium
**Evidence:** The official Node.js and Java SDKs produce different results for the same inputs.

| Behavior | Node.js SDK | Java SDK |
|---|---|---|
| Integration key casing | `key.toLowerCase()` | No transformation |
| Method field format | lowercase (`"ecocash"`) | Enum with `.toString()` |
| Error handling | Returns `undefined` on failure (silent) | Throws exception |
| Hash computation | Over URL-encoded values (in some paths) | Over raw values |

We discovered the silent error swallowing in the Node.js SDK during testing: when the API is unreachable, the SDK returns `undefined` instead of throwing. This means `const response = await paynow.sendMobile(...)` can silently return nothing, and `response.success` evaluates to `undefined` (falsy) — but without an error, the developer doesn't know whether the payment failed or the network is down.

**Recommendation:** Establish a reference implementation (pick one SDK as canonical), add integration tests that verify all SDKs produce identical hashes for the same inputs, and fix the Node.js SDK's silent error swallowing.

---

## Recommendation 9: Improve Test Mode Documentation

**Severity:** Low
**Evidence:** Test mode works well once you know the rules, but the rules aren't all documented:

- `authemail` must match the merchant account email — discovered via trial-and-error error message
- Only the merchant who created the integration can test — not documented for team workflows
- No guidance on how to test webhook delivery in test mode
- No documentation on how to verify you've met the "at least one successful test transaction" requirement before going live
- Test mode timing varies across payment methods (5s for mobile, unspecified for card) but this isn't cross-referenced

**Recommendation:** Add a "Test Mode Guide" page that covers team testing workflows, webhook testing, and a checklist for going live.

---

## Summary: DX Scorecard

| Dimension | Score (1-5) | Key Issue |
|---|---|---|
| **Documentation completeness** | 2.5 | Missing express checkout examples, hash order, phone formats |
| **Integration simplicity** | 2 | Manual hash, form encoding, 40+ lines vs 5 for Paystack |
| **Error message quality** | 1.5 | Hash mismatch for 5 different root causes |
| **API accessibility** | 1 | Cloudflare blocks programmatic access |
| **SDK quality** | 2.5 | Exists for 5 languages but inconsistent behavior |
| **Sandbox/testing** | 3.5 | Good test numbers, but no webhook logs or status page |
| **Onboarding speed** | 3 | Dashboard is clear, keys accessible, but first payment takes hours not minutes |

**Overall DX Score: 2.3 / 5**

For comparison: Stripe scores 4.8, Paystack 4.2, Flutterwave 3.5 in the same framework.

---

## Appendix: Evidence Files

| Document | Location | Contents |
|---|---|---|
| Paynow pitfalls (21 issues) | `docs/paynow-integration-pitfalls.md` | Detailed descriptions with code |
| Paynow DX baseline | `benchmarks/paynow-dx-notes.md` | Integration walkthrough with code comparison |
| Compiled benchmark | `benchmarks/payment-provider-benchmark-report.md` | 5-provider comparison with scores |
| Stripe DX notes | `benchmarks/stripe-dx-notes.md` | Stripe integration walkthrough |
| Paystack DX notes | `benchmarks/paystack-dx-notes.md` | Paystack integration walkthrough |
| Integration code | `supabase/functions/initiate-payment/index.ts` | Working Paynow + Stripe implementation |
| Webhook handler | `supabase/functions/payment-webhook/index.ts` | Dual Paynow + Stripe webhook |

*All findings are reproducible. Code is available in the project repository.*
