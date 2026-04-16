# Ecosystem Integration Retrospective

**BillPay + TXT vs Paynow Core**

*Paynow DX Project — Goal #3 Extension · 2026-04-14*

This extension compares Paynow Core against two sibling products in the same ecosystem: BillPay and TXT.

---

## Methodology — minimum-effort integration

**Scope was deliberately kept "lazy"** — one integration attempt per product, using only the publicly documented path, with real production credentials, no custom workarounds or proxies until a wall forced one.

**Why this matters:** the findings below approximate what a new Paynow customer experiences on their first attempt. Anything that wasn't smooth on the lazy path is a real DX issue, not an artifact of us trying something unusual. When the blocker appeared on Paynow Core, we documented it before building around it — so the evidence is "first-attempt" honest, not "we engineered past it to make the product look bad."

---

## Core finding

**Paynow's own sibling products are materially easier to integrate than Paynow Core.**

The organization already knows how to build good API DX — Core has simply not adopted those patterns. The gap is also visible externally: the Paynow developer forum has three open threads reporting the same blocker across 7 months, none resolved.

---

## What was integrated

| Product | Status | Scope |
|---|---|---|
| Paynow Core | Shipped (`main`) | 835 LOC · DX score 4.2/10 |
| BillPay v1.33 | Full integration (`main`) | 6 edge functions · 15 billers · simulation mode · ~240 LOC per flow |
| TXT SMS API v1.12 | Feature branch | ~60 LOC per flow |

---

## DX comparison

| Dimension | Paynow Core | BillPay | TXT |
|---|---|---|---|
| Dedicated API subdomain | ❌ Shared with website | ✅ `billpay.paynow.co.zw` | ✅ `txt.co.zw` |
| Cloud infra reachable | ❌ Blocked by CF bot protection | ✅ | ✅ |
| Authentication | SHA-512 concatenated hash | HTTP Basic Auth | HTTP Basic Auth / IP whitelist |
| Auth complexity | ~7 LOC + ordering risk | 1 header | 1 header |
| Format | Form-encoded both ways | JSON | Form-encoded req, simple text resp |
| Versioned docs | ❌ | ✅ v1.33 (dated) | ✅ v1.12 (dated) |
| Test identifiers | ❌ | ✅ 6 simulation prefixes | ✅ Sandbox redirect |
| Postman collection | ❌ | ❌ | ✅ Published |
| Structured errors | ❌ | 🟡 Partial (reversal only) | ❌ |
| State machine documented | ❌ | ✅ Explicit states + polling intervals | N/A |
| Time to first success | ~3.5h (then blocked) | ~1.5h | ~30 min |

---

## The structural insight

Every major weakness in Paynow Core is already solved elsewhere inside Paynow:

1. **Reachability** — BillPay and TXT use dedicated API subdomains without bot protection. Core does not.
2. **Authentication simplicity** — BillPay/TXT use HTTP Basic Auth. Core uses a custom SHA-512 concatenation pattern.
3. **Testability** — BillPay provides deterministic failure simulation prefixes (`AT`, `PF`, `PFF`, etc.). Core provides no structured test identifiers.
4. **State clarity** — BillPay documents polling intervals (120s / 180s / 600s). Core requires inference.
5. **Documentation hygiene** — BillPay and TXT publish version numbers and dates. Core does not.

**This is not a capability gap. It is an internal consistency gap.**

---

## Workaround shipped: Cloudflare Worker relay

### Problem
Supabase Edge Functions cannot reach `www.paynow.co.zw/interface/*` directly. Requests terminate with TCP RST (`os error 104`) due to Cloudflare bot protection.

This blocks:
- Server-initiated settlement
- Agent-driven autonomous payments
- Any headless orchestration flow

### Solution implemented
A ~70 LOC Cloudflare Worker relay proxies signed requests to Paynow.

| Metric | Direct | Via Worker |
|---|---|---|
| Outcome | TCP RST | HTTP 200 |
| Latency | — | ~400–800 ms |
| Cost | — | $0 (free tier) |
| Build time | — | ~20 min |

### Live verification — 2026-04-16
Auction win → Direct attempt blocked → Relay success → Poll URL returned → USSD prompt delivered → Ledger confirmed.

The workaround proves the architectural diagnosis: **Paynow Core needs a reachable API surface identical in pattern to BillPay.** The relay works — but every integrator must independently rediscover and implement this workaround. That is ecosystem friction.

---

## Cross-check against Paynow's own developer forum

The Paynow developer forum ([forums.paynow.co.zw](https://forums.paynow.co.zw/)) has three open threads reporting this exact symptom across 7 months. None are marked resolved, no official fix is posted, and Cloudflare is not identified as the cause in any of them.

| Thread | Opened | Last activity | Status |
|---|---|---|---|
| [Paynow failing on supabase (#8759)](https://forums.paynow.co.zw/t/paynow-failing-on-supabase/8759/5) | 2026-02-03 | 2026-04-04 | Community-posted DigitalOcean VPS proxy eventually reported as working. No staff fix. |
| [Connection Reset Error from Supabase Edge Functions (#8022)](https://forums.paynow.co.zw/t/connection-reset-error-from-supabase-edge-functions/8022) | 2025-09-03 | 2025-09-11 | Paynow staff requested IP address. No follow-up. |
| [Technical Details — Connection Reset (os error 104) (#9095)](https://forums.paynow.co.zw/t/technical-details-for-integration-connection-reset-os-error-104/9095) | 2026-04-01 | 2026-04-10 | Paynow staff requested logs. Thread stalled. |

**What this confirms:**
- The block is not isolated to our project — at least three integrators independently reproduced it.
- The only working workaround in the public record is a paid VPS proxy (DigitalOcean). No one has previously identified Cloudflare bot protection as the cause, and no one has published a free-tier fix.
- Paynow support has acknowledged the problem in all three threads but posted no resolution in any.

**Discoverability is its own DX problem.** The forum homepage has no visible search bar — developers locating these threads must already know the symptom string (`os error 104` or `connection reset`) and query Google via `site:forums.paynow.co.zw`. A developer debugging their own code will not land here quickly. The documented symptom exists publicly; the diagnosis does not.

---

## Recommended changes (effort × impact ranked)

| # | Change | Effort | Pattern source |
|---|---|---|---|
| 1 | Move Core to `api.paynow.co.zw` (no bot protection) | ~1 week | BillPay |
| 2 | Migrate to HTTP Basic Auth (with transition window) | ~2 weeks | BillPay / TXT |
| 3 | Publish test phone numbers | ~1 day | BillPay |
| 4 | Publish Postman collection | ~1 day | TXT |
| 5 | Version + date docs | ~1 hour | BillPay |
| 6 | Explicit webhook hash ordering | ~1 hour | — |
| 7 | Add structured error codes | ~1 week | BillPay reversal pattern |

If implemented together, Core likely moves from **4.2/10 → 7–8/10** without new R&D.

---

## Agentic commerce risk lens

BillPay and TXT are already agent-reachable. Paynow Core — the flagship — is not.

As AI agents, serverless backends, and autonomous checkout flows become default, gateways that are reachable from cloud infrastructure win by default. **Paystack and Flutterwave already are.**

Paynow's Zimbabwe mobile-money coverage is genuinely differentiated. But differentiation only converts to revenue if an agent can reach the API on the first attempt.

Right now, two internal products meet that bar. Core does not.

---

## One-line presentation summary

> *Paynow Core's DX gaps are not innovation problems — they are internal pattern adoption problems.*
