# Ecosystem Integration Retrospective: BillPay + TXT vs Paynow Core

**Deliverable — Paynow DX project, Goal #3 extension · 2026-04-14**

Extension of the DX benchmark with a second comparison: Paynow Core against **two sibling products in the same Paynow family** — BillPay and TXT.

**Finding:** Paynow's own sibling products are measurably better-documented and easier to integrate than Paynow Core. The organization already knows how to write good docs; Core hasn't received the same treatment.

---

## What was integrated

| Product | Status | LOC / scope |
|---|---|---|
| **Paynow Core** | Shipped on `main` | 835 LOC, DX score 4.2/10 |
| **BillPay v1.33** | Full integration shipped (`main`) | 6 edge functions, 15 billers, simulation mode, ~240 LOC per flow |
| **TXT SMS API** | Feature branch `feature/sms-notifications` (supervisor review) | ~60 LOC per flow |

---

## DX side-by-side

| Dimension | Paynow Core | BillPay | TXT |
|---|---|---|---|
| **Base URL** | `www.paynow.co.zw/interface/*` | `billpay.paynow.co.zw/api/*` | `www.txt.co.zw` / `usd.txt.co.zw` |
| **Separate API subdomain?** | ❌ Shared with website | ✅ Dedicated | ✅ Dedicated |
| **Cloudflare blocks programmatic clients?** | ✅ Yes (dealbreaker) | ❌ No | ❌ No |
| **Auth** | SHA-512 hash of concatenated values | HTTP Basic Auth | HTTP Basic Auth / IP whitelist |
| **Auth LOC per call** | ~7 (hash + uppercase) | 1 header | 1 header |
| **Request/response format** | Form-encoded both ways | JSON | Form-encoded req, `SUCCESS:`/`ERROR:` resp |
| **Endpoints per flow** | 2 (web + mobile) | 1 (`/process` + action) | 1 per concern |
| **Versioned docs** | ❌ | ✅ v1.33 (23 Jan 2024) | ✅ v1.12 (4 Mar 2024) |
| **Documented test identifiers** | ❌ No test phone numbers | ✅ 6 member prefixes (AT, AF, PT, PF, PP, PFF) + 5 product types | ✅ Test mode redirects SMS |
| **Postman collection** | ❌ | ❌ | ✅ `postman.com/paynow/paynow-txt` |
| **Structured errors** | ❌ URL-encoded strings | ✅ JSON + error codes 0-5,99 | ❌ Description only |
| **State machine documented** | ❌ (mixed statuses, hash order unclear) | ✅ 6 states, explicit poll intervals (120s/180s/600s) | N/A (one-shot) |
| **Time to first successful call** | ~3.5h, then blocked entirely | ~1.5h | ~30 min |

---

## The surprising finding

Paynow Core's weaknesses are **already solved inside the Paynow organization**:

1. **Cloudflare unreachability** — BillPay sits on `billpay.paynow.co.zw` with no bot protection. TXT sits on `txt.co.zw`. The pattern that would unblock Paynow Core already exists in two sibling products.
2. **Auth complexity** — BillPay and TXT both use standard HTTP Basic Auth. Paynow Core's SHA-512 hash-of-concatenated-values is a pattern the sibling products did not replicate.
3. **Testing** — BillPay's systematic failure-simulation prefixes (`AT` = auth timeout, `PF` = pay fail, `PFF` = flagged, etc.) let a developer test every error path without real money. Paynow Core has nothing comparable.
4. **Polling spec** — BillPay specifies poll intervals explicitly. Paynow Core requires reverse-engineering from observation.
5. **Versioning** — BillPay and TXT both publish version + date. Paynow Core docs carry neither.

**The fix for Paynow Core isn't research. It's adoption of patterns already shipping in BillPay and TXT.**

---

## Recommendations for Paynow Core (ranked by effort × impact)

| # | Change | Effort | Source pattern |
|---|---|---|---|
| 1 | Move API to `api.paynow.co.zw` without Cloudflare bot protection | ~1 week | BillPay's `billpay.paynow.co.zw` |
| 2 | Switch auth from SHA-512 hash to HTTP Basic Auth | ~2 weeks with migration window | BillPay / TXT |
| 3 | Publish documented test phone numbers for EcoCash/OneMoney | ~1 day | BillPay's member prefixes |
| 4 | Publish a Postman collection | ~1 day | TXT |
| 5 | Version docs + add publish date | ~1 hour | BillPay / TXT |
| 6 | Document webhook hash field ordering explicitly | ~1 hour | — |
| 7 | Add structured error responses with codes | ~1 week | BillPay error codes 0-5,99 |

All seven together would likely move Paynow Core from **4.2/10 → ~7-8/10**, competitive with Paystack. None require new invention.

---

## One-line summary for the presentation

> *Paynow Core's DX weaknesses are all problems that Paynow's own sibling products — BillPay and TXT — have already solved. The fix isn't research; it's internal pattern adoption.*

---

## Caveats

- TXT not integrated end-to-end under production credentials — DX assessment based on docs + spec review, not full live flow
- BillPay's Cloudflare exposure untested from cloud infra — pattern is correct in principle (separate subdomain, no bot protection), but Edge-Function reachability specifically not confirmed during the internship window
- Sample is three Paynow products; findings are internal-ecosystem scope, not industry-wide

## Related

- [paynow-dx-notes.md](../week-1-2/02-dx-benchmark/paynow-dx-notes.md) — full Paynow Core benchmark
- [docs/billpay-integration-plan.md](../../docs/billpay-integration-plan.md) · [docs/paynow-billpay-vendor-api.md](../../docs/paynow-billpay-vendor-api.md) · [docs/txt-co-zw-sms-api.md](../../docs/txt-co-zw-sms-api.md)
- [feature-branch-review.md](feature-branch-review.md) — SMS branch review
