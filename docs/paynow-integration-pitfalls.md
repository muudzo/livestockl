# Paynow Go Integration — Pitfalls & Lessons Learned

**Date:** March 18, 2026
**Author:** Tatenda Nyemudzo
**Context:** Built a Go HTTP client for Paynow's payment API from scratch — no official Go SDK exists.

---

## Summary

Paynow has **no official Go SDK**. Their supported languages are: Node.js, Java, Python, PHP, and .NET. To integrate with our Go backend, we reverse-engineered the API specification from the Node.js and Java SDK source code on GitHub, then built a raw HTTP client using Go's standard library.

This document catalogs every pitfall, undocumented behavior, and SDK inconsistency we encountered during the integration. These are real issues that will affect any developer integrating Paynow outside of their supported SDK languages.

---

## Pitfall Index

| # | Category | Severity | Summary |
|---|----------|----------|---------|
| 1 | Infrastructure | Critical | Server unreliability and slow response times |
| 2 | Protocol | Critical | Request body must be form-urlencoded, not JSON |
| 3 | Protocol | High | `status` field in request must always be literal "Message" |
| 4 | Security | Critical | Hash field order is insertion-ordered, not alphabetical |
| 5 | Validation | High | `authemail` is silently required for mobile transactions |
| 6 | Validation | Medium | Phone number format sensitivity |
| 7 | Protocol | Medium | Method field case sensitivity inconsistency between SDKs |
| 8 | Protocol | High | Poll endpoint uses POST with empty body, not GET |
| 9 | Protocol | Medium | Poll URL is fully qualified — don't prepend base URL |
| 10 | Protocol | Critical | Responses are URL-encoded query strings, not JSON |
| 11 | Security | High | Error responses may not include a valid hash |
| 12 | Protocol | High | Webhook body is form-urlencoded, not JSON |
| 13 | Security | Critical | Webhook hash verification is mandatory |
| 14 | Security | High | SDK inconsistency on integration key casing for hash |
| 15 | Security | High | Hash is over raw values, not URL-encoded values |
| 16 | Security | Medium | Response hash field order differs from request |
| 17 | Protocol | Critical | Missing Content-Type header returns HTML silently |
| 18 | Infrastructure | Critical | Cloudflare bot protection blocks programmatic access |
| 19 | Infrastructure | High | Server returns HTML on overload (200 OK with HTML body) |
| 20 | Debugging | High | Error messages are cryptic and unhelpful |
| 21 | DX | Medium | Internal method names don't match API method codes |

---

## Detailed Pitfall Descriptions

### Pitfall #1: Server Unreliability and Timeouts
**Severity:** Critical
**Category:** Infrastructure

Paynow's server (`www.paynow.co.zw`, IP `196.44.182.165`) is frequently unresponsive. During our testing on March 16, 2026, we attempted 6 different connection methods — all returned `ETIMEDOUT` or `Connection reset by peer`. The server was completely down for over 24 hours.

**Impact:** Cannot test, cannot process payments, no fallback.
**Workaround:** Built simulation mode that activates when Paynow credentials are absent. Real payments attempted only when server is reachable. Set HTTP timeout to 30s to avoid hanging goroutines.
**Recommendation to Paynow:** Provide a status page. Consider hosting on more reliable infrastructure or CDN.

---

### Pitfall #2: Request Body Must Be Form-Urlencoded
**Severity:** Critical
**Category:** Protocol

All Paynow API endpoints expect `application/x-www-form-urlencoded` request bodies. If you send JSON (which is the default for most modern HTTP clients), Paynow returns a 200 OK with either garbage data or an HTML error page — no error code, no useful error message.

**Impact:** First-time integrators waste hours debugging "hash mismatch" or empty responses because they're sending JSON.
**How we found it:** Response was HTML instead of expected query string. Inspecting the Node.js SDK revealed form encoding.
**Recommendation to Paynow:** Accept JSON alongside form encoding, or return a clear error like `{"error": "Content-Type must be application/x-www-form-urlencoded"}`.

---

### Pitfall #3: The "status" Field Must Be "Message"
**Severity:** High
**Category:** Protocol

Every request to Paynow must include a field called `status` with the literal value `"Message"`. This is NOT the transaction status — it's a protocol field that signals "this is a message/request". It's completely undocumented in the API docs. We only discovered it by reading the SDK source code.

**Impact:** Omitting this field or using a different value causes silent failures.
**Recommendation to Paynow:** Document this requirement prominently. Better yet, make it optional since it carries no meaningful information.

---

### Pitfall #4: Hash Field Order Is Insertion-Ordered
**Severity:** Critical
**Category:** Security

The SHA-512 hash is computed by concatenating field **values** in the order they appear in the request body. If you use a Go `map` (which has random iteration order), your hash will be wrong approximately 99% of the time.

**Impact:** Hash mismatch error on nearly every request if using unordered data structures.
**How we solved it:** Used a `[]fieldPair` slice (ordered key-value pairs) instead of `map[string]string` for hash computation.
**Recommendation to Paynow:** Document the exact field order for hash computation. Currently this information only exists in the SDK source code.

---

### Pitfall #5: Email Silently Required for Mobile Transactions
**Severity:** High
**Category:** Validation

The `authemail` field is optional for web transactions but **required** for mobile (express) transactions. If you omit it from a mobile transaction, you don't get a helpful error like "email is required" — you get a cryptic hash mismatch error instead, because the server includes the email in its hash computation even when you didn't send one.

**Impact:** Hours of debugging hash mismatches that are actually caused by a missing field.
**Recommendation to Paynow:** Return `{"error": "authemail is required for mobile transactions"}` instead of a hash mismatch.

---

### Pitfall #6: Phone Number Format Sensitivity
**Severity:** Medium
**Category:** Validation

Zimbabwean mobile numbers must be sent as `"0771234567"` (local format, no country code, no spaces, no dashes). Sending `"+263771234567"` or `"263771234567"` may cause silent rejection.

**Impact:** Payment initiation fails with no clear error message.
**Recommendation to Paynow:** Accept multiple formats and normalize internally, or return a clear validation error.

---

### Pitfall #7: Method Field Case Sensitivity
**Severity:** Medium
**Category:** Protocol

The Node.js SDK sends method values in lowercase (`"ecocash"`). The Java SDK's enum uses uppercase (`"ECOCASH"`) but calls `.toString()`. The actual API behavior is unclear — we send lowercase to match the Node.js SDK, which appears to be the most widely used.

**Impact:** Potential silent failure if wrong casing is used.
**Recommendation to Paynow:** Document accepted values explicitly. Accept case-insensitive input.

---

### Pitfall #8: Poll Uses POST, Not GET
**Severity:** High
**Category:** Protocol

To check a transaction's status, you must send a **POST** request with an **empty body** to the poll URL. A GET request returns an HTML page instead of the status response.

**Impact:** Counter-intuitive API design. Most developers default to GET for status checks.
**Recommendation to Paynow:** Support GET requests for polling, or document the POST requirement prominently.

---

### Pitfall #9: Poll URL Is Fully Qualified
**Severity:** Medium
**Category:** Protocol

The poll URL returned by Paynow is a complete URL (e.g., `https://www.paynow.co.zw/Interface/CheckPayment/?guid=...`). If you prepend your base URL, you'll get `https://www.paynow.co.zw/https://www.paynow.co.zw/...`.

**Impact:** 404 errors on poll requests.
**How we solved it:** Use the poll URL as-is, never concatenate with base URL.

---

### Pitfall #10: Responses Are URL-Encoded Query Strings
**Severity:** Critical
**Category:** Protocol

Paynow API responses are **not JSON**. They are URL-encoded query strings in the response body:
```
status=Ok&browserurl=https%3A%2F%2Fwww.paynow.co.zw%2F...&pollurl=...&hash=ABC...
```

If you try `json.Unmarshal()` on this, you get a confusing "invalid character 's' looking for beginning of value" error.

**Impact:** Fundamental integration blocker for developers who expect JSON (which is every modern developer).
**How we solved it:** Parse with `url.ParseQuery()` instead of JSON decoding.
**Recommendation to Paynow:** Support JSON responses via an `Accept: application/json` header, or at minimum document the response format clearly.

---

### Pitfall #11: Error Responses May Lack Valid Hash
**Severity:** High
**Category:** Security

When Paynow returns `status=Error`, the `hash` field may be missing or invalid. If you unconditionally verify the hash on all responses, you'll reject legitimate error messages and never know what went wrong.

**Impact:** Error handling breaks if hash verification isn't skipped for error responses.
**How we solved it:** Skip hash verification when `status == "Error"`.

---

### Pitfall #12: Webhook Body Is Form-Urlencoded
**Severity:** High
**Category:** Protocol

When Paynow POSTs to your result URL (webhook), the body is `application/x-www-form-urlencoded` — same as all other Paynow responses. Your webhook handler must use `r.ParseForm()` or `url.ParseQuery()`, not `json.Decode()`.

**Impact:** Webhook handler silently fails to parse callback, payment status never updates.

---

### Pitfall #13: Webhook Hash Verification Is Mandatory
**Severity:** Critical
**Category:** Security

Without hash verification on webhook callbacks, anyone can POST a fake `status=Paid` to your webhook endpoint and steal goods/services without paying. The hash proves the callback came from Paynow.

**Impact:** Security vulnerability — fraudulent payment confirmations.
**How we solved it:** Compute expected hash from response values + integration key, compare to received hash.

---

### Pitfall #14: Integration Key Casing in Hash
**Severity:** High
**Category:** Security

The Node.js SDK lowercases the integration key before appending to the hash string: `integrationKey.toLowerCase()`. The Java SDK does NOT lowercase. This means the same credentials produce different hashes depending on which SDK's behavior you follow.

**Impact:** Hash mismatches when switching between SDK reference implementations.
**How we solved it:** We do NOT lowercase (matching Java SDK, the original implementation). If hashes don't match, try lowercasing as a fallback.
**Recommendation to Paynow:** Pick one behavior and document it. This inconsistency between official SDKs is a serious DX problem.

---

### Pitfall #15: Hash Over Raw Values, Not URL-Encoded
**Severity:** High
**Category:** Security

The hash must be computed over raw field values, not URL-encoded values. The Node.js SDK confusingly URL-encodes values before hashing in some code paths, but the Java SDK (and the actual API) expects raw values.

**Impact:** If you hash `"US%24850"` instead of `"US$850"`, you get a mismatch.
**Recommendation to Paynow:** Document explicitly: "hash is computed over raw/unencoded values."

---

### Pitfall #16: Response Hash Field Order Differs from Request
**Severity:** Medium
**Category:** Security

The fields used for hash verification on responses are different from the fields in the request. Response hash covers: `reference`, `amount`, `paynowreference`, `pollurl`, `status` — in that order.

**Impact:** Incorrect field ordering causes hash verification failures on legitimate responses.

---

### Pitfall #17: Missing Content-Type Returns HTML Silently
**Severity:** Critical
**Category:** Protocol

If you don't set `Content-Type: application/x-www-form-urlencoded`, Paynow returns a 200 OK with an HTML error page. No error code, no error message — just HTML. This is arguably the most common first-time integration failure.

**Impact:** Developers see garbled HTML in their response parser and have no idea why.
**Recommendation to Paynow:** Return a proper error response when Content-Type is wrong.

---

### Pitfall #18: Cloudflare Bot Protection
**Severity:** Critical
**Category:** Infrastructure

Paynow's API sits behind Cloudflare bot protection. Programmatic requests from non-Zimbabwean IPs (and even some Zimbabwean IPs) may get blocked with `Connection reset by peer`, `ETIMEDOUT`, or a Cloudflare challenge page. The `cf_clearance` cookie is required for browser access.

**Impact:** Cannot integrate or test from international development environments (which is most developers). Supabase Edge Functions (running on Deno Deploy) also cannot reach Paynow.
**Workaround:** Must test from a Zimbabwean IP. Even then, server downtime is frequent.
**Recommendation to Paynow:** Whitelist API endpoints from Cloudflare bot protection. Payment APIs must be programmatically accessible.

---

### Pitfall #19: HTML on Server Overload
**Severity:** High
**Category:** Infrastructure

Even when the server is "up," it sometimes returns HTTP 200 with an HTML body instead of the expected query string. This happens during high load or when Cloudflare intercepts the request.

**Impact:** Response parser breaks. Must check for HTML in response body before parsing.
**How we solved it:** Check for `<html` or `<!DOCTYPE` in response body and return a descriptive error.

---

### Pitfall #20: Cryptic Error Messages
**Severity:** High
**Category:** Debugging

Paynow's error messages are minimally helpful:
- `"Invalid id."` — wrong integration ID (note the period)
- Hash mismatch — could be wrong key, wrong field order, wrong encoding, missing field, wrong casing...
- No error at all — just HTML or empty response

**Impact:** Debugging takes 10x longer than it should.
**Recommendation to Paynow:** Return structured errors with specific codes and messages. E.g., `{"error_code": "HASH_MISMATCH", "message": "Expected hash of 64 chars, got 128", "hint": "Check field ordering and integration key"}`.

---

### Pitfall #21: Internal vs API Method Names
**Severity:** Medium
**Category:** DX

Our internal system uses PascalCase method names (`"EcoCash"`, `"OneMoney"`) matching Zimbabwean branding. Paynow's API expects lowercase (`"ecocash"`, `"onemoney"`). Forgetting this mapping causes "unsupported method" errors with no useful context from Paynow's side.

**Impact:** Subtle bugs when method names cross system boundaries.
**How we solved it:** Created a `MethodToMobile()` mapping function that normalizes method names.

---

## Architecture Decision: Simulation Fallback

Because Paynow's server is unreliable and frequently unreachable, we built a **dual-mode orchestrator**:

1. **Live mode:** When `PAYNOW_INTEGRATION_ID` and `PAYNOW_INTEGRATION_KEY` environment variables are set, the orchestrator calls the real Paynow API.
2. **Simulation mode:** When credentials are absent, the orchestrator uses realistic simulated responses with Zimbabwe-specific failure rates (EcoCash 70%, OneMoney 60%, Card 80%).

This allows development, testing, and demos to proceed regardless of Paynow's server status.

---

## Missing from Paynow's Developer Experience

1. **No Go SDK** — Forces developers to reverse-engineer from other SDKs
2. **No sandbox/test environment** — Must use production credentials for testing
3. **No API status page** — No way to know if the server is down or if your code is wrong
4. **No webhook testing tool** — No equivalent of Stripe's webhook CLI
5. **No rate limit documentation** — Unknown throttling behavior
6. **No OpenAPI/Swagger spec** — No machine-readable API definition
7. **No changelog** — No way to know if the API has changed
8. **SDK inconsistencies** — Node.js and Java SDKs behave differently for hash computation

---

## Files Created

| File | Purpose |
|------|---------|
| `backend/internal/payments/paynow.go` | Raw HTTP client — hash, init web, init mobile, poll, webhook parse |
| `backend/internal/payments/orchestrator.go` | Updated — routes to real Paynow or simulation based on env vars |
| `backend/internal/handlers/payment_handler.go` | HTTP endpoints — initiate-web, initiate-mobile, webhook, poll, status |
| `backend/internal/handlers/router.go` | Updated — 5 new payment routes |
| `backend/cmd/server/main.go` | Updated — passes Paynow client to router |

## Environment Variables

```bash
# Set these to enable live Paynow payments:
PAYNOW_INTEGRATION_ID=12345
PAYNOW_INTEGRATION_KEY=your-key-here
PAYNOW_RESULT_URL=https://your-domain.com/api/payments/webhook
PAYNOW_RETURN_URL=https://your-domain.com/payment-status
```

---

*This document is part of the Paynow Developer Experience benchmark for the ZimLivestock internship project.*
