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

**BillPay and TXT are agent-reachable on the default integration path. Paynow Core is agent-reachable only with an engineered relay** — for ZimLivestock, that's the Cloudflare Worker described in §"Workaround shipped" above. Penny Sniper bids and pays through Core in production *because that relay exists*. Without it: TCP RST, no transaction.

The point isn't that Core can never serve agents. It's that **every integrator who wants agentic flows on Core must independently rediscover the bot-wall block, diagnose Cloudflare as the cause (not surfaced in any forum thread), and build their own relay.** Two of three Paynow products skip that ceremony. The third inherits it on every greenfield integration.

As AI agents, serverless backends, and autonomous checkout flows become default, gateways that are reachable from cloud infrastructure win by default. **Paystack and Flutterwave already are.** They don't require a relay.

Paynow's Zimbabwe mobile-money coverage is genuinely differentiated. But differentiation only converts to revenue if an agent can reach the API on the **first** attempt — without each developer having to rebuild the same workaround in isolation.

Right now, two internal products meet that bar by default. Core meets it conditionally, via per-integrator effort that should not be required.

---

## Update — 2026-05-06 (3 weeks after original publication)

Three findings emerged after the April 14 cut-off that materially update this retrospective. Two reinforce the central thesis; one is a new class of issue.

### TXT cloud-reachability is conditional, not absolute

The April 14 table marked TXT *"Cloud-reachable: ✅"* and *"Time to first success: ~30 min"*. Both are technically accurate **for first-200-against-the-public-API**. They are misleading for **time-to-deliver-an-actual-SMS from a serverless backend**.

Reality after live integration:

| Gate | Documented? | Resolved by |
|---|---|---|
| REMOTE-API user provisioning (separate from portal user) | ❌ | Paynow staff request |
| Account-level IP whitelist enforcement | ❌ | Cannot be lifted — must whitelist a static IP |
| KYC verification before first send | ❌ | Manual customer flow at `usd.txt.co.zw/customer/verifykyc` |
| Static IP from cloud egress | ❌ | **Mac mini residential ISP + Cloudflare Quick Tunnel** |

Real time-to-live-SMS-from-Supabase-Edge: **~2 weeks elapsed**, ~6 hours coding. The public-doc ergonomics are excellent; the operational provisioning surface has the same shape as Core's bot-wall problem, just at a different layer. **This reinforces — not contradicts — Recommendation #1.** The architectural fix (`api.paynow.co.zw` without bot protection, static-IP whitelisting moved to a separate provisioned tier instead of a permanent gate) generalizes beyond Core to every Paynow product that gates infrastructure on egress topology.

### `AwaitingDelivery` is undocumented terminal-success

Caught during a Paynow-internal spec review on 2026-05-05 and shipped as a 3-line fix the next morning. The webhook-status table in the official Web spec lists `AwaitingDelivery` but does not declare it terminal-success. Most integrators (this one included on first pass) treat it as non-terminal and rely on a follow-up `Paid` callback that for digital/auction goods may never arrive. Settled-but-undelivered orders sit as `pending` indefinitely until poll-sync clears them.

This is a documentation-clarity issue, not a code defect on Paynow's side, but it belongs alongside *"webhook hash ordering"* in Recommendation #6 — both are spec-implicit conventions that bite every new integrator.

**Suggested addition to the recommendations table:**

| # | Change | Effort | Pattern source |
|---|---|---|---|
| 8 | State explicitly which webhook statuses are terminal-success vs non-terminal (`AwaitingDelivery` ambiguity) | ~1 hour | — |

### BillPay simulation prefixes are case-sensitive (undocumented)

Spec examples are uppercase (`AT12345`, `AF12345`); behaviour appears to require uppercase. Lowercase `attimeout` returned a successful PAY in live testing on 2026-05-06 instead of the expected 120-second timeout. Either the prefixes are case-sensitive in production (and the spec should say so) or production silently ignores prefixes that don't exact-match (which would be a regression versus the documented contract). Worth a one-line addition to BillPay v1.34.

### What this update does NOT change

- The DX comparison table conclusions stand. BillPay and TXT are still materially easier to integrate than Core in the first-attempt sense.
- The Cloudflare Worker relay validation (April 16 live test) is unaffected.
- The forum cross-check (three unresolved threads, paid-VPS workarounds) is more relevant now, not less — the txt.co.zw IP-whitelist finding shows Paynow integrators are already silently routing live traffic through residential relays.
- The Recommended Changes ranking (Effort × Impact) holds; #1 and #2 are unchanged. Add #8 above to the list.

### What changed in the demo timeline

- Live TXT-driven SMS chain now fires end-of-auction notifications from the Mac mini relay, demoed alongside Core via the Cloudflare Worker.
- ZimLivestock's senior-engineer integration doc (`paynow-supabase-integration.md`) now contains a §12 *Shortcomings & Areas of Improvement* with P1–P10 explicitly mapping to the recommendations in this retrospective.

The thesis hasn't moved. Two products in this ecosystem are agent-ready by default. A third — Core — is agent-ready *only with engineered workarounds that each integrator must independently rediscover and ship.* ZimLivestock proves this works (Penny Sniper transacts through Core via the Cloudflare Worker relay), but the friction is structural: every new agent-driven Paynow integration starts from zero on the same problem. The recommendations are unchanged in shape and gain one more entry.

---

## One-line presentation summary

> *Paynow Core's DX gaps are not innovation problems — they are internal pattern adoption problems.*
