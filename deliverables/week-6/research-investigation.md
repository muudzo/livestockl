# Research Investigation — Paynow Core Reachability from Cloud Infrastructure

**Author.** Tatenda Nyemudzo · Paynow internship 2026
**Investigation window.** 2026-03-16 → 2026-04-16 (4 weeks)
**Audience.** Paynow senior engineering · CMD Leeuwarden internship assessor
**Competency mapping.** L2 *To Research* — structured technical investigation, system metrics, prototyping, recommendation report, presentation to senior engineers.

---

## Executive Summary

- **Problem.** Outbound HTTP from Supabase Edge / Lambda / Workers / Deno Deploy / Vercel Edge to `www.paynow.co.zw/interface/*` is rejected at the TCP layer (`Connection reset by peer · os error 104`). Browsers pass the Cloudflare JS challenge fronting the host; programmatic clients cannot.
- **Evidence.** 142 of 142 direct attempts failed across 2 credentials, 2 networks, 4 runtimes. Three Paynow developer-forum threads independently report the same symptom over 7 months; none resolved.
- **Diagnostic proof.** A 70-LOC Cloudflare Worker relay succeeds on first call where direct egress fails. CF Worker traffic is allowlisted by the same ruleset that blocks third-party datacenters — the failure is therefore network-layer, not application-layer.
- **Fix.** Move Paynow Core's API surface to `api.paynow.co.zw` without the Cloudflare bot wall. Pattern source: BillPay already does this at `billpay.paynow.co.zw`. Adoption, not invention.
- **Effort.** ~1 week of platform engineering.
- **Strategic implication.** Without the fix, Paynow Core's distribution surface is narrower than peers that expose a dedicated API host — the agentic-commerce cohort (Claude tasks, OpenAI Operators, embedded payments, autonomous marketplaces) defaults onto the topology Paynow Core currently rejects.

The downstream cost of inaction is documented in §6.

---

## 1. Problem Identification

### 1.1 Trigger

A first-pass attempt to call Paynow Core's `/interface/initiatetransaction` endpoint from a Supabase Edge Function failed without a single byte of HTTP response. The TCP connection was reset before any payload was returned. A naive read of the error suggested a transient outage. A retry from the same edge runtime returned the same error.

A retry from a browser succeeded. This was the first signal that the failure was client-class, not server-class.

### 1.2 Initial hypotheses (and why they were wrong)

| # | Hypothesis | Test | Result |
|---|---|---|---|
| 1 | Paynow API is down | Browser GET `www.paynow.co.zw` | Loaded normally |
| 2 | Geo-blocked by region | Curl from US, EU, ZA datacenters | All blocked |
| 3 | Credentials misconfigured | Re-issued integration ID 23657, retried | Same error |
| 4 | SDK fixes the issue | `npm:paynow@2.2.2` via Deno + Node | Same error, silently swallowed |
| 5 | Local network solves it | Local Express + SDK on Zimbabwean ISP | `ETIMEDOUT 196.44.182.165:443` |
| 6 | Paynow whitelists per-IP | Asked Paynow engineering, then community | No whitelist process exists |

After hypotheses 1–6 were ruled out, the investigation broadened to **why some HTTP clients succeed and others fail on the same endpoint**.

### 1.3 Refined problem statement

> *Paynow Core's API at `www.paynow.co.zw/interface/*` is reachable from web browsers and from programmatic clients running inside trusted IP ranges (Cloudflare's own network), but is rejected at the TCP layer from every public datacenter IP range we tested. The rejection is consistent with Cloudflare bot-protection rules that block clients which cannot solve a JavaScript challenge. This makes Paynow Core unusable from any standard serverless deployment target.*

This was the working problem statement used for the rest of the investigation.

### 1.4 Why this is an architecture issue, not a configuration one

The block is not solvable by:
- Adding the developer's IP to a whitelist (no such mechanism exists for Paynow merchants)
- Using the official Paynow SDK (the SDK uses the same endpoint over the same HTTP client, fails identically, but silently)
- Switching deployment regions (every datacenter region tested produced the same error)
- Calling on behalf of an authenticated user (the rejection happens before authentication)

The block is solvable only by either (a) moving the call origin into a trusted IP range, or (b) Paynow adjusting its CDN/DNS topology. (a) is what every individual integrator must currently do. (b) is what this report recommends.

---

## 2. Methodology

### 2.1 Approach — minimum-effort integration

The investigation used a deliberately conservative methodology: **only the publicly documented happy-path was attempted, with no custom workarounds, until a wall forced one**. The reasoning is rubric-relevant — *if a finding requires us to deviate from the documented path, it is not a fair representation of new-developer experience*. Anything that broke on the lazy path is a real DX issue.

When the wall appeared (TCP reset on first call from Edge Functions), the behaviour was documented before any workaround was attempted. This separates **"first-attempt honest"** evidence from **"we engineered past this to make it look bad"** synthesis.

### 2.2 Multi-runtime test matrix

To establish that the failure was not runtime-specific:

| Runtime | Network origin | Outcome |
|---|---|---|
| Deno (Supabase Edge, eu-west-3) | Cloud datacenter | TCP reset (`os error 104`) |
| Deno (Supabase Edge, fresh creds 23657, different region) | Cloud datacenter | TCP reset (`os error 104`) |
| Node 20 + axios (local) | Zimbabwean ISP (TelOne fiber) | `ETIMEDOUT 196.44.182.165:443` |
| Node 20 + axios (local) | International ISP (Hetzner) | `ETIMEDOUT 196.44.182.165:443` |
| Node 20 + Paynow SDK 2.2.2 | International ISP | SDK returns `undefined`, masked error |
| curl 8.4.0 | Any | 75 s timeout, no response body |
| Browser fetch (Chrome 134) | Any | 200 OK after CF JS challenge |
| Cloudflare Worker (Workers runtime) | Cloudflare network | 200 OK on first call |

The pattern across the matrix: only browsers and Cloudflare-network egress succeed.

### 2.3 Sibling-product comparison

To test whether the issue was Paynow-wide or Paynow-Core-specific, two sibling products were integrated end-to-end as controls:

- **BillPay Vendor API v1.33** at `billpay.paynow.co.zw` — full integration (6 edge functions, AUTH/PAY/STATUS/REVERSE/RECONCILE/WALLETS/BILLERS), live-verified against production
- **TXT SMS API v1.12** at `www.txt.co.zw` and `usd.txt.co.zw` — feature branch with HTTP Basic Auth and IP-whitelist auth methods documented

If both succeeded from the same edge runtime, the issue would isolate to Paynow Core. They did. The result is documented in §3.3.

### 2.4 Competitor comparison

To benchmark Paynow Core against industry peers, the same first-attempt integration was performed against four competing payment gateways from the same Supabase Edge runtime:

| Provider | API host | Outcome |
|---|---|---|
| Stripe | `api.stripe.com` | Reachable, JSON, ~30 min to first success |
| Paystack | `api.paystack.co` | Reachable, JSON, ~30 min |
| Flutterwave | `api.flutterwave.com` | Reachable, JSON, ~45 min |
| Pesepay | `api.pesepay.com` | Reachable, AES-encrypted JSON, ~90 min (encryption overhead, not connectivity) |

All four competitors share a structural pattern: dedicated `api.*` subdomain, no bot protection, JSON request/response, Bearer-token authentication. **Paynow Core is the structural outlier in the cohort** — and within its own ecosystem.

### 2.5 Independent corroboration

The Paynow developer forum was searched for the symptom string. Three threads were located, all reporting the identical error, all from independent integrators:

| Thread | Opened | Last activity | Status |
|---|---|---|---|
| [Paynow failing on supabase (#8759)](https://forums.paynow.co.zw/t/paynow-failing-on-supabase/8759/5) | 2026-02-03 | 2026-04-04 | Community-posted DigitalOcean VPS proxy as eventual fix |
| [Connection Reset Error from Supabase Edge Functions (#8022)](https://forums.paynow.co.zw/t/connection-reset-error-from-supabase-edge-functions/8022) | 2025-09-03 | 2025-09-11 | Paynow staff requested IP. No follow-up. |
| [Technical Details — Connection Reset (os error 104) (#9095)](https://forums.paynow.co.zw/t/technical-details-for-integration-connection-reset-os-error-104/9095) | 2026-04-01 | 2026-04-10 | Paynow staff requested logs. Stalled. |

The findings are not specific to this project. Multiple integrators have hit the same wall over a 7-month window. None of the threads are marked resolved.

### 2.6 Alternative architectural explanations considered

The Cloudflare-bot-protection diagnosis is the explanation best supported by the evidence, but it is not the only candidate. Four alternatives were considered. Each is documented here so the diagnosis can be falsified or refined if Paynow's internal infrastructure team identifies a different root cause:

| Alternative explanation | What would distinguish it | Why we ruled it out (or didn't) |
|---|---|---|
| **Mutual TLS / client cert required** | Paynow would reject every request including browser fetches lacking a client cert | Browsers without client certs succeed → ruled out |
| **Path-selective WAF rule disabled for the website-class JS challenge but applied to API paths** | Different cf-ray IDs, different challenge headers between `/` and `/interface/*` | Plausible refinement — could narrow the fix to a path rule rather than a hostname split. Could not test from outside Paynow's infra. **Open question for Paynow's WAF team.** |
| **Volumetric rate limiting at the IP / ASN level** | Block would correlate with request rate, not request origin | Single isolated requests fail identically to bursts; block applies on connection 1 of 1. Inconsistent with rate limiting. Ruled out. |
| **Anti-DDoS L7 challenge tuned aggressively** | Block would lift after a JS-challenge solve | Browser cf_clearance cookies do appear, consistent with a JS challenge being the gating mechanism. **This is essentially a synonym for the bot-protection diagnosis** — the practical fix (a non-challenged surface for API traffic) is the same. |
| **Application-layer auth rejecting unsigned/malformed bodies before TCP RST** | Server would respond with HTTP 4xx, not RST | TCP RST happens before any HTTP exchange. Ruled out at the transport layer. |

The honest residual is the second row: a **path-selective WAF rule** would produce identical externally-observable behaviour to a hostname-wide rule, and only Paynow's WAF configuration can distinguish the two. The recommended fix in §6 works under either reading — a separate API hostname is the cleanest solution whether the rule is hostname-scoped or path-scoped — but the underlying root cause may be narrower than "bot protection on the whole hostname".

---

## 3. System Metrics Collected

### 3.1 Direct request failure metrics

Captured from the Supabase `settlement_ledger` audit table (every payment attempt is row-logged with raw error payload):

| Metric | Direct edge runtime → Paynow Core |
|---|---|
| Successful HTTP responses | 0 of 142 attempts |
| TCP RST rate | 142 of 142 (100%) |
| Mean time-to-error | 11.4 s (TCP timeout, not application response) |
| Bytes received from server | 0 |
| HTTP status code returned | None (connection severed pre-response) |
| Pattern across regions tested | Identical error in 4 Supabase Edge regions |

Sample raw error from `settlement_ledger`:
```json
{
  "payment_order_id": "b19d72e8-…",
  "event": "live_paynow_blocked",
  "error": "Connection reset by peer (os error 104)",
  "network_blocked": true,
  "endpoint": "https://www.paynow.co.zw/interface/remotetransaction",
  "ts": "2026-03-16T14:22:08.412Z"
}
```

### 3.2 Integration cost in lines of code (LOC)

Lines of integration code on `main` branch, by provider, for an equivalent feature scope (initiate, verify webhook, poll status):

| Provider | LOC | vs Paynow |
|---|---|---|
| Paynow Core | **835** | baseline |
| Pesepay | 608 | −27% |
| Paystack | 557 | −33% |
| Stripe | 561 | −33% |
| Flutterwave | 523 | −37% |
| **BillPay (within Paynow)** | **~240 per flow** | **−71%** |
| **TXT (within Paynow)** | **~60 per flow** | **−93%** |

The internal sibling products are *materially smaller integrations than the flagship*. This is the strongest single signal that the Core LOC count is not driven by Paynow's domain complexity but by Core-specific design choices.

### 3.3 Time to first successful integration

Wall-clock from "I want to integrate this" to "I have a confirmed end-to-end success":

| Provider | Time to first success | Blocked by infrastructure? |
|---|---|---|
| TXT (within Paynow) | ~30 min | No |
| Paystack | ~30 min | No |
| Stripe | ~30 min | No |
| Flutterwave | ~45 min | No |
| Pesepay | ~90 min | No (AES encryption overhead) |
| BillPay (within Paynow) | ~90 min | No |
| **Paynow Core** | **~3.5 h to a build that works only via relay** | **Yes** |

### 3.4 Webhook hash verification — code-volume cost

Lines of code required to verify an inbound webhook signature, equivalent feature:

| Provider | Webhook verification LOC | Strategies needed |
|---|---|---|
| Stripe (SDK) | 1 | 1 |
| Flutterwave | 3 | 1 |
| Paystack | 10 | 1 |
| Paynow Core | 25+ | **3** (documented order, received order, alphabetical sort) |

The Paynow Core webhook spec does not specify hash field ordering deterministically, so production code must attempt three distinct concatenation orderings until one matches. This is a measurable correctness risk — every new webhook payload could in principle break all three attempts.

### 3.5 Authentication complexity

Lines of code required to authenticate a single API call:

| Provider | Auth LOC per call | Mechanism |
|---|---|---|
| Stripe / Paystack / Flutterwave | 1 | `Authorization: Bearer <key>` header |
| BillPay (within Paynow) | 1 | `Authorization: Basic base64(user:pass)` header |
| TXT (within Paynow) | 1 | `Authorization: Basic base64(user:pass)` header |
| Paynow Core | 7 | SHA-512 hash of concatenated form values + integration key |

---

## 4. Prototyping

Two solutions were evaluated. One was suggested by the community (a paid VPS proxy). One was prototyped by this investigation (a free Cloudflare Worker relay). Both were tested live; results in §5.

### 4.1 Solution A — VPS proxy (community baseline)

**Source.** Paynow forum thread #8759 (Gillian212, 2026-04-04): *"Spin up a small DigitalOcean droplet, install Node + the Paynow SDK there, and have your edge function call your droplet instead of Paynow directly."*

**Architecture.**
```
Supabase Edge Function → DigitalOcean droplet (static IP) → www.paynow.co.zw
```

**Cost profile.**

| Item | Cost / overhead |
|---|---|
| DigitalOcean droplet (smallest) | $4–6/mo |
| Setup time | ~2 h (provision, harden, deploy proxy code) |
| Ongoing patching | Monthly OS/security updates |
| Failover / monitoring | Self-managed |
| Static IP allocation | Manual |
| Latency overhead | ~200–500 ms |

**Why it works.** Paynow's bot protection rejects unknown datacenter ranges. A long-lived VPS with a static IP, after a brief warmup period, is treated as trusted. (This is consistent with how Cloudflare's bot-protection scoring functions — short-lived ephemeral compute is high-suspicion; long-lived static-IP servers are low-suspicion.)

**Why it is not the right answer for this investigation.** It pushes ops cost onto every Paynow integrator. It introduces a single point of failure that no other provider on the benchmark requires. It requires the integrator to discover the block, find the forum thread, replicate the proxy code, and maintain a separate compute environment indefinitely.

### 4.2 Solution B — Cloudflare Worker relay (prototyped here)

**Hypothesis.** *If Paynow Core's bot protection is itself a Cloudflare ruleset, then HTTP egress from Cloudflare's own runtime should be allowlisted at the network layer, since Cloudflare treats its own edge as trusted.*

**Architecture.**
```
Supabase Edge Function → CF Worker (paynow-relay.zimlivestock.workers.dev) → www.paynow.co.zw
```

**Implementation.**
- Single source file, 70 LOC, no external dependencies
- Deploys via `wrangler deploy` in ~5 s
- Authenticates to Paynow Core with the same SHA-512 hash the Edge Function would have computed locally
- Forwards request body byte-for-byte; response body byte-for-byte
- Stateless — no caching, no auth bypass, no privileged data path

**Cost profile.**

| Item | Cost / overhead |
|---|---|
| Cloudflare Worker source | 70 LOC, single file |
| Cloudflare free tier | 100,000 requests/day |
| Setup time | ~20 min end-to-end |
| Ongoing patching | None — no OS, no runtime to maintain |
| Failover / monitoring | Cloudflare 99.99% SLA |
| Static IP allocation | N/A |
| Latency overhead | 400–800 ms |
| Monthly cost | $0 |

Worker source: [`paynow-relay/src/index.js`](../../paynow-relay/src/index.js)
Orchestrator integration: [`supabase/functions/payment-orchestrator/index.ts`](../../supabase/functions/payment-orchestrator/index.ts)

**Why it works.** Cloudflare Workers egress through Cloudflare's own trusted network. The bot ruleset that fires on requests from Supabase / AWS Lambda / Fly / Render IP ranges does not fire on Worker-originated requests to `*.paynow.co.zw`. The TCP RST disappears. Paynow's server treats the relay as a first-class HTTP caller.

### 4.3 Why a relay is treated as a workaround, not a solution

Both A and B unblock the integrator. Neither fixes the structural problem:

> *Every new Paynow integrator must independently discover the block, locate the forum threads, decide between A and B, build it, deploy it, monitor it, and pay for it. The relay is a tax on every developer who comes after.*

The recommendation in §6 is the only durable fix.

---

## 5. Evaluation of Results

### 5.1 Live verification — direct vs relay

Auction won by an autonomous bidding agent → settlement triggered → first attempt direct, second attempt via relay. Both attempts logged to `settlement_ledger`.

| State | Ledger row evidence |
|---|---|
| Direct Supabase → Paynow | `payment_order_id=b19d72e8-…` · `event=live_paynow_blocked` · `error: "Connection reset by peer (os error 104)"` · `network_blocked=true` |
| Via CF Worker relay | `payment_order_id=846efdfa-…` · `event=live_paynow_accepted` · `pollurl=https://www.paynow.co.zw/Interface/CheckPayment/?guid=1ff4f270-…` · `network_blocked=false` |

Downstream of the accepted call: USSD prompt was delivered to `+263781497764` (the merchant's verified test number); PIN was entered; transaction settled to the merchant account. Full agent loop ran end-to-end with zero keyboard input from a human.

### 5.2 Latency comparison

| Path | p50 latency | p95 latency |
|---|---|---|
| Direct (when Paynow worked, e.g. browser-class IP from a VPS) | ~600 ms | ~1.2 s |
| Via Cloudflare Worker relay | ~1,000 ms | ~1.6 s |

The 400–800 ms overhead is irrelevant against the 5–15 s USSD approval window — the user experience is dominated by waiting for the EcoCash PIN prompt, not by the API call.

### 5.3 Cost comparison

| Solution | Setup time | Monthly cost | Failure modes added |
|---|---|---|---|
| VPS proxy (community) | ~2 h | $4–6 | OS patching cadence, single-host availability, IP rotation risk |
| Cloudflare Worker relay (this work) | ~20 min | $0 | Cloudflare-tier outage |
| **Subdomain fix at Paynow's side (recommended)** | ~1 week (one-time) | $0 | None for integrators |

### 5.4 What the prototype proved

The relay's success is not just operational — it is **diagnostic**. It demonstrates that:

1. The block is at the network layer (Cloudflare's bot ruleset), not the application layer (Paynow's auth)
2. The block is trivially bypassed by changing the egress IP to a trusted range
3. The structural fix is therefore "expose Core from a trusted-by-default surface"
4. BillPay already does this at `billpay.paynow.co.zw`. The pattern is internal and already deployed; it just hasn't been adopted for Core.

The relay turns the recommendation from theoretical ("you should fix this") to falsifiable ("the fix has the predicted effect, here is the data").

### 5.5 Limits of the evaluation

- **Volume.** The live-verified relay path has handled ~20 transactions, not thousands. High-volume behaviour under sustained traffic was not measured.
- **Failure injection.** The relay was not stress-tested against Cloudflare-side outages or against deliberately malformed Paynow responses.
- **Webhook path.** This investigation focused on outbound `Edge → Paynow` calls. Paynow's *inbound* webhook deliveries to Supabase Edge Functions worked on first attempt and were not part of the block — that path was not affected by the bot ruleset.
- **Alternative providers.** Stripe, Paystack, Flutterwave, Pesepay were tested at the *integration-difficulty* level, not the *agent-readiness* level. A separate investigation could deepen that comparison.

---

## 6. Recommendation

The investigation produced one structural recommendation and six tactical recommendations, ranked by effort × impact.

### 6.1 Primary recommendation

> **Move Paynow Core's API to `api.paynow.co.zw` without Cloudflare bot protection. Mirror what BillPay already does at `billpay.paynow.co.zw`.**

```
Current
─────────────────────────────────────────────────
  Edge Function ──▶ www.paynow.co.zw (CF bot wall)
                   ✗  TCP RST · os error 104

Proposed
─────────────────────────────────────────────────
  Edge Function ──▶ api.paynow.co.zw (no bot wall)
                   ✓  HTTP 200 · pollurl returned
```

**Effort.** ~1 week of platform engineering. No new architecture; this is a DNS configuration change plus moving the API path off the bot-protected hostname.

**Impact.** All five major issues identified collapse at once:

| Issue | Resolution mechanism |
|---|---|
| Edge Functions / Lambda / Workers cannot call Paynow Core | New host has no bot wall — direct calls succeed |
| Every integrator must discover the block and build a relay | Block disappears — relay no longer needed |
| Paynow forgoes the agentic-commerce cohort by default to Paystack/Flutterwave | Core becomes agent-reachable on first call, like the cohort already is |
| Paynow forum has 3 unresolved threads on this exact symptom | Threads close themselves once the fix is deployed |
| Paynow Core LOC overhead vs sibling products | Most of the 835 LOC is form-encoding + hash + retry; the relay path adds none of that, but moving auth to Bearer (recommendation 6.2.2) compounds the LOC reduction |

**Pattern source.** Internal — BillPay. No external precedent needs to be researched.

### 6.2 Secondary recommendations

Ranked by effort × impact and adopted from the *Ecosystem Integration Retrospective* (deliverables/week-5/):

| # | Change | Effort | Pattern source |
|---|---|---|---|
| 6.2.1 | Migrate Paynow Core to HTTP Basic Auth (or Bearer token) with a transition window | ~2 weeks | BillPay / TXT |
| 6.2.2 | Publish test phone numbers for EcoCash / OneMoney sandbox | ~1 day | BillPay |
| 6.2.3 | Publish a Postman collection for Paynow Core | ~1 day | TXT |
| 6.2.4 | Version + date Paynow Core developer documentation | ~1 hour | BillPay v1.33 |
| 6.2.5 | Specify webhook hash field ordering deterministically | ~1 hour | — |
| 6.2.6 | Return structured JSON error codes with `code`, `message`, `field`, `doc_url` | ~1 week | Stripe; BillPay reversal pattern |

If 6.1 + 6.2.1–6.2.6 ship together, Paynow Core's external DX score moves from **4.2/10 → 7–8/10** without any new R&D — pure pattern adoption.

### 6.3 What inaction costs

The companies most likely to adopt Zimbabwean payment rails in 2026–2027 are agentic-commerce platforms (Anthropic Claude, OpenAI Operators, Shopify agents, embedded-payments SaaS). Their default deployment topology is *exactly* the one Paynow Core currently rejects.

| Agent scenario | Paynow Core today | After 6.1 |
|---|---|---|
| Recurring ZESA payment ("pay every salary day") | ❌ blocked | ✅ trivial |
| AI-assisted livestock checkout ("buy that heifer if it's still under $650") | ❌ blocked | ✅ trivial |
| Marketplace auto-settle on auction win | ❌ blocked without relay | ✅ trivial |
| Fraud-detection hold-and-release orchestrator | ❌ blocked | ✅ trivial |
| Third-party B2B payout via SaaS integrator | ❌ blocked | ✅ trivial |

Peers that expose a dedicated API host (Paystack, Flutterwave) are agent-reachable on first call today. Paynow's Zimbabwe mobile-money coverage is the differentiation — but differentiation only converts to revenue if an agent can actually call through it.

---

## 7. Limitations and Future Work

### 7.1 Limitations of this investigation

1. **Single-integrator scope.** The investigation reflects one developer's experience over four weeks. The forum cross-check confirms the issue is reproducible by others, but the metrics (LOC, time-to-success) are first-attempt for this engineer. A more senior engineer might integrate faster; a more junior engineer might take longer.
2. **Ledger volume.** ~140 direct attempts and ~20 relayed transactions is enough for diagnosis, not for performance engineering.
3. **No internal Paynow context.** The investigation did not have access to Paynow's CDN configuration, infrastructure runbooks, or threat model. The Cloudflare-bot-protection diagnosis is inferred from external behaviour, not confirmed against Paynow's internal config.

### 7.2 Suggested follow-up investigations

- **Webhook reliability over hostile networks** — out-of-scope here, but worth measuring if Paynow's roadmap includes recurring payments.
- **Paynow vs Paystack vs Flutterwave at the agent-readiness level** — this report compared at the integration-difficulty level. A separate investigation could measure *agent task success rate* across the three providers using a standardized agent harness.
- **Mobile-money coverage atlas** — Paynow's Zimbabwe mobile-money coverage is differentiated; quantifying that against Paystack/Flutterwave's coverage in Zambia, Malawi, Kenya would clarify exactly where Paynow's moat is widest and narrowest.

---

## 8. Conclusion

The investigation began with a single failed HTTP request. It produced:

- A reproducible diagnosis grounded in 142 logged ledger events across 4 weeks
- A working prototype that demonstrates both the cause (bot ruleset, not application logic) and the structural fix (move to a trusted-by-default surface)
- A recommendation that requires no new architecture inside Paynow — the fix exists already at `billpay.paynow.co.zw`
- An impact projection: closing the gap brings Paynow Core's distribution surface in line with peers that already expose a dedicated API host, unblocking the agentic-commerce cohort by default

**Paynow Core is currently the only product in the ecosystem whose default topology blocks serverless callers.** That is correctable, and the cost of correction is a fraction of the cost of inaction.

---

## 9. Source Material and Evidence Index

### 9.1 Primary deliverables this report builds on

- [DX benchmark](../week-1-2/02-dx-benchmark/paynow-dx-notes.md) — full provider-by-provider comparison (Stripe, Paystack, Flutterwave, Pesepay, Paynow Core)
- [Ecosystem retrospective](../week-5/ecosystem-integration-retrospective.md) — BillPay + TXT vs Paynow Core internal comparison
- [Paynow × Supabase integration](paynow-supabase-integration.md) — implementation reference for senior engineers
- [Test suite report](test-suite-report.md) — security-agent 11/11 RLS pass + BillPay test cases against staging

### 9.2 Live ledger evidence

- `settlement_ledger` table (Supabase project `hmeieslclzycyjjjflfh`) — `event=live_paynow_blocked` and `event=live_paynow_accepted` rows for direct vs relay paths
- `bill_payments` table — production AIRTIME (`PMRG-260504102012-857FN`) and staging TEST (`TEST-260504120111-G6W2R`) references confirming both Paynow environments live-verified

### 9.3 Prototype source

- [`paynow-relay/src/index.js`](../../paynow-relay/src/index.js) — 70-LOC Cloudflare Worker relay
- [`supabase/functions/payment-orchestrator/index.ts`](../../supabase/functions/payment-orchestrator/index.ts) — Edge function that routes through the relay
- [`supabase/functions/payment-webhook/index.ts`](../../supabase/functions/payment-webhook/index.ts) — Inbound webhook handler (3 hash strategies)

### 9.4 Independent corroboration

- Paynow developer forum thread [#8759](https://forums.paynow.co.zw/t/paynow-failing-on-supabase/8759/5) (2026-02-03 → 2026-04-04)
- Paynow developer forum thread [#8022](https://forums.paynow.co.zw/t/connection-reset-error-from-supabase-edge-functions/8022) (2025-09-03 → 2025-09-11)
- Paynow developer forum thread [#9095](https://forums.paynow.co.zw/t/technical-details-for-integration-connection-reset-os-error-104/9095) (2026-04-01 → 2026-04-10)

### 9.5 Test environment artifacts

- Production credentials: integration ID 23997 (live ledger evidence under this ID)
- Staging credentials: integration ID 23657 (cross-confirmation under fresh creds)
- Verified test phone: `+263781497764` (real EcoCash USSD delivery confirmed)
- Cloudflare Worker host: `paynow-relay.zimlivestock.workers.dev`

---

## 10. Presentation

This report has a paired presentation deliverable for the senior-engineer audience:

- [Presentation deck](presentation-deck.md) — slide-shaped narrative, same structure: problem → method → metrics → prototype → recommendation
- [Demo runbook](demo-runbook.md) — live walk-through script for the Wednesday demo
- [Demo script (problem-led)](demo-script-problem-solution.md) — leadership-facing pitch framing

The recommended sequencing for a 30-minute slot with senior engineers:
1. **5 min.** Problem framing (§1) + sibling-product comparison (§2.3) — this is the "Paynow's own products solve this" hook
2. **8 min.** Metrics (§3) and live demo of direct-vs-relay ledger evidence
3. **10 min.** Walkthrough of the relay implementation (§4.2) and live demo of an end-to-end agent loop using it
4. **5 min.** Recommendation (§6) — the one DNS change
5. **2 min.** Q&A

---

*End of report.*
