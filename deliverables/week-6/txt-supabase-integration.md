# txt.co.zw × Supabase Integration

**Author.** Tatenda Nyemudzo · Paynow internship 2026
**Status.** Live — end-to-end SMS delivery verified 2026-05-05
**Audience.** Paynow senior engineering · future ZimLivestock maintainers · external integrators
**Companion artifact.** [Paynow × Supabase Integration](paynow-supabase-integration.md) (same project, Paynow Core)

---

## 0. TL;DR — 30-second read

ZimLivestock sends transactional SMS (auction won, outbid, payment confirmed) through `txt.co.zw` v1.12. The integration runs serverless on Supabase Edge Functions, but txt.co.zw enforces **IP whitelist + Basic Auth + account KYC** simultaneously — three separate manual gates not documented in v1.12. Supabase Edge has no static IP, so we route all SMS through a 70-LOC self-hosted relay on a residential Mac mini, exposed via free Cloudflare Quick Tunnel. The static-IP-egress path is the workaround; the broader recommendation in §10 is for txt.co.zw to support Basic-Auth-only authentication for serverless callers.

```
Browser PWA  ──▶  Supabase Edge (send-sms)  ──▶  Cloudflare Quick Tunnel  ──▶  Mac mini relay (Deno)  ──▶  txt.co.zw API
                                                                                  │
                                                                                  └─ egress IP: 41.173.195.173
                                                                                     (whitelisted by Paynow for remote_tatenda)
```

---

## 1. Provisioning Checklist

These three workflows are sequential, manual, and non-trivially ordered. Skipping any one produces a different upstream error code, which makes diagnosis hard if you don't know what to expect. Track each individually.

| # | Step | Owner | Time | How to verify it landed |
|---|---|---|---|---|
| 1 | Create REMOTE-API user | Paynow support | 1–2 days | Auth probe returns HTTP 302 → 403 transition (see §6.1) |
| 2 | Whitelist your egress IP for that user | Paynow support | hours-to-days | Auth probe returns HTTP 200 with balance |
| 3 | Verify customer mobile number via portal | You | minutes | First SMS send returns `SUCCESS:<msgid>` instead of "verify your mobile number" KYC string |

**Critical:** the REMOTE-API username is conventionally prefixed `remote_*` and is **separate** from your portal-login username. Confirm this with Paynow at signup; integration tooling defaulted to portal username and burned a day debugging.

---

## 2. Architecture

### 2.1 Why a relay exists

txt.co.zw enforces IP whitelist on REMOTE-API users **even when Basic Auth is also configured**. The 16-character password the v1.12 spec describes as a Basic Auth gate is, in practice, *additive* — not an alternative. Requests from non-whitelisted IPs are rejected even with valid credentials.

Supabase Edge Functions egress from rotating datacenter IPs across multiple regions; whitelisting them all is impractical and would defeat the point. We need a single, stable IP to whitelist. That's the relay's job.

### 2.2 Why Cloudflare Tunnel (not direct ngrok)

Initial attempt used ngrok free tier. ngrok now serves a mandatory browser-warning interstitial on free quick tunnels that can't be reliably bypassed by callers like Supabase Edge. Cloudflare Quick Tunnel (`cloudflared tunnel --url`) is genuinely free, requires no signup, and serves no interstitial. Trade-offs:

| Tunnel | Cost | Interstitial | Signup | URL stability | Best for |
|---|---|---|---|---|---|
| ngrok free | $0 | Yes (blocks API callers) | Email | Random per session | Browser dev |
| Cloudflare Quick Tunnel | $0 | None | None | Random per session | API callers (this case) |
| ngrok paid ($8/mo) | $8/mo | None | Email + card | Reservable | Stable production |
| Cloudflare Tunnel (named) | $0 | None | Cloudflare account | Stable, named domain | Production |

For a 24-hour demo window, Cloudflare Quick Tunnel is correct. For long-term production, migrate to a named Cloudflare Tunnel or move the relay onto a paid static-IP host (Fly.io dedicated IPv4 $2/mo, DigitalOcean droplet $4/mo).

### 2.3 Critical invariant — what IP does txt.co.zw see?

The IP txt.co.zw sees is the **Mac mini's residential IP**, not Cloudflare's. The Quick Tunnel is *inbound* (Supabase → Mac mini); it does not affect *outbound* HTTP from Mac mini → txt.co.zw. That outbound call uses the Mac mini's normal home internet connection.

```
                                 ┌──────────────────────────────┐
                                 │      Cloudflare Tunnel       │
                                 │ ◀── inbound from Supabase    │
Supabase Edge ──── HTTPS ────────┤                              │
                                 │      ▼ to localhost:8787     │
                                 └──────┬───────────────────────┘
                                        │
                                  Mac mini relay (Deno)
                                        │
                                        │ outbound from Mac mini's
                                        │ home wifi (41.173.195.173)
                                        │
                                        ▼
                                  https://usd.txt.co.zw
```

This means the IP whitelisted by Paynow is the Mac mini's home IP. If Cloudflare Tunnel goes down, only inbound from Supabase is affected — outbound auth path is unchanged.

### 2.4 Three-tier routing in `send-sms`

The Edge Function evaluates env vars in this order and picks the first that's complete:

```ts
if (TXT_RELAY_URL && TXT_RELAY_SECRET)         → route through relay (production)
else if (TXT_USERNAME && TXT_PASSWORD)         → call txt.co.zw direct (only if Edge IP whitelisted)
else                                           → simulation mode (dev/preview)
```

Falls through cleanly: missing relay config doesn't crash; it falls back. Missing all creds simulates and writes `status: "simulated"` rows to `sms_log`. Useful for preview deploys where you don't want to leak SMS budget on test runs.

---

## 3. Components

| Path | Purpose |
|---|---|
| [`supabase/functions/send-sms/index.ts`](../../supabase/functions/send-sms/index.ts) | Edge function — auth gate, rate limiting, three-tier routing, sms_log write, action discriminator |
| [`paynow-txt-relay/relay.ts`](../../paynow-txt-relay/relay.ts) | Deno HTTP server (40 LOC): validates `x-relay-secret`, adds Basic Auth, forwards to txt.co.zw |
| [`paynow-txt-relay/start.sh`](../../paynow-txt-relay/start.sh) | Loads `.env`, starts relay |
| [`paynow-txt-relay/.env.example`](../../paynow-txt-relay/.env.example) | Template for local creds (real `.env` gitignored) |
| [`src/app/components/TestSmsNotification.tsx`](../../src/app/components/TestSmsNotification.tsx) | Browser-side test harness with health-probe button |
| [`docs/sms-integration-plan.md`](../../docs/sms-integration-plan.md) | Original integration plan + appended journey log |

---

## 4. Edge Function (`send-sms`) — Anatomy

### 4.1 Auth gate

```ts
const isCron       = cronSecret      && authHeader === `Bearer ${cronSecret}`;
const isServiceRole = serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`;
const isPrivileged = isCron || isServiceRole;

const { action } = payload;

if (!isPrivileged && action !== "health") {
  return json({ success: false, error: "Unauthorized" }, 401);
}
```

- **SMS send** (default action) requires service role or CRON_SECRET — gated tight because real money flows ($0.03/SMS).
- **`action: "health"`** is openable to any caller the Supabase gateway authenticated. The probe is read-only, sends no SMS, and reveals only "are credentials provisioned?" — fine for the test harness using the user's anon JWT.

### 4.2 Health probe

Unified entry point for credential verification across the routing tiers:

```ts
if (action === "health") {
  // Path 1: route through relay (production path)
  if (TXT_RELAY_URL && TXT_RELAY_SECRET) {
    const res = await fetch(`${relayUrl}/balance`, {
      headers: { "x-relay-secret": relaySecret },
    });
    return json({ ...await res.json(), via: "relay", relayUrl });
  }

  // Path 2: direct call
  // ... Basic Auth direct to txt.co.zw, surfaces 302 / 403 / 200 / network errors
}
```

Returns one of these structured statuses (caller branches on `status`, not on free-text):

| Status | HTTP code | Meaning |
|---|---|---|
| `live` | 200 (returned) | Credentials work, returns `balance` field |
| `auth_not_provisioned` | 302 (forwarded) | REMOTE user not recognized |
| `http_error` | varies | Auth recognized, request denied — typically the IP-whitelist 403 |
| `credentials_missing` | n/a | None of the three routing tiers configured |
| `unreachable` | n/a | Network failure |
| `relay_unreachable` | n/a | Tunnel down (Cloudflare Quick Tunnel session expired or laptop offline) |

The `via` field discriminates `direct` vs `relay` so consumers know which path was taken.

### 4.3 Send path

```ts
if (TXT_RELAY_URL && TXT_RELAY_SECRET) {
  const res = await fetch(`${relayUrl}/sms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-relay-secret": relaySecret,
      "ngrok-skip-browser-warning": "1",  // harmless on cloudflared, kept for ngrok fallback
    },
    body: JSON.stringify({ recipientPhone: phone, message: body }),
  });
  // ... parse relay response, log to sms_log
}
```

The Edge Function does NOT carry `TXT_USERNAME`/`TXT_PASSWORD` to the relay — those creds stay on the Mac mini. The shared `x-relay-secret` is the only auth crossing Supabase → relay. This means a Supabase compromise does not leak txt.co.zw credentials.

### 4.4 sms_log write

Every send (live, simulated, or failed) writes one row to `sms_log` with idempotent shape: `{user_id, phone, message, event_type, status, provider_reference, cost_usd}`. `cost_usd` is `0.03` for `sent`, `0` for `simulated`/`failed`. Used for:
- Rate limiting (max 10 SMS/user/hour, queried inline before send)
- Cost reconciliation against txt.co.zw monthly statement
- Debug/post-incident triage

---

## 5. Relay (`paynow-txt-relay/relay.ts`) — Anatomy

### 5.1 Endpoints

```
GET  /            → 200 OK { ok: true, relay: "txt.co.zw", host }   (no auth; tunnel health)
GET  /balance     → forwards GET /Remote/AccountBalance              (requires x-relay-secret)
POST /sms         → forwards POST /Remote/SendMessage                (requires x-relay-secret)
```

Anything else → 404. Health endpoint deliberately needs no auth so Cloudflare Tunnel's own probes succeed.

### 5.2 Auth check

```ts
function authorized(req: Request): boolean {
  return req.headers.get("x-relay-secret") === relaySecret;
}
```

Single shared secret, validated by exact-match. 64-character hex (256 bits of entropy) generated via `openssl rand -hex 32`. Same value lives in Supabase secrets (`TXT_RELAY_SECRET`) and the Mac mini's `.env` (`RELAY_SECRET`).

### 5.3 Forwarding

```ts
async function handleSms(req: Request) {
  const { recipientPhone, message } = await req.json();
  const body = new URLSearchParams({
    Recipients: recipientPhone,
    Body: message.slice(0, 160),
  }).toString();

  const res = await fetch(`${TXT_HOST}/Remote/SendMessage`, {
    method: "POST",
    headers: {
      Authorization: basicAuth,                                 // pre-computed at startup
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    redirect: "manual",                                         // catch 302 → /user/logon
  });

  if (res.status === 302 || res.status === 301) return json({ success: false, status: "auth_not_provisioned" });
  if (!res.ok)                                  return json({ success: false, status: "http_error", httpStatus: res.status });

  const text = (await res.text()).trim();
  if (text.startsWith("SUCCESS:")) return json({ success: true,  status: "sent",     reference: text.substring(8).trim() });
  if (text.startsWith("ERROR:"))   return json({ success: false, status: "rejected", error:     text.substring(6).trim() });
  return json({ success: false, status: "unexpected", raw: text.slice(0, 300) });
}
```

`redirect: "manual"` is critical — without it, Deno follows the 302 to `/user/logon` and parses HTML as if it were the API response, hiding the auth-not-provisioned signal.

### 5.4 Startup invariants

```ts
if (!txtUsername || !txtPassword) Deno.exit(1);
if (!relaySecret || relaySecret.length < 32) Deno.exit(1);
```

Fails fast at boot if any required env var is missing. No silent simulation fallback on the relay — if it's running, it's expected to forward.

---

## 6. Diagnostic Cookbook

The single most valuable skill for txt.co.zw integration is reading the failure mode correctly. Each upstream signal points at a different gate.

### 6.1 The four gating errors and what they mean

```
                       ┌─────────────────────────────────────────────────────────┐
                       │ HTTP 302 → Location: /user/logon                        │
                       │ "REMOTE user does not exist on this host"               │
                       │ → Provisioning step 1 (§1) not done                     │
                       └─────────────────────────────────────────────────────────┘
                                                ▼
                       ┌─────────────────────────────────────────────────────────┐
                       │ HTTP 403 "<user> is not configured to access this API   │
                       │           from <ip>. Contact support."                  │
                       │ → REMOTE user exists; IP not whitelisted                │
                       │ → Provisioning step 2 (§1) not done                     │
                       └─────────────────────────────────────────────────────────┘
                                                ▼
                       ┌─────────────────────────────────────────────────────────┐
                       │ HTTP 200 + body "Sorry, you are not permitted to send   │
                       │   SMS until you verify your mobile number. Go to        │
                       │   https://usd.txt.co.zw/customer/verifykyc"             │
                       │ → REMOTE user + IP both green; account KYC pending      │
                       │ → Provisioning step 3 (§1) not done                     │
                       └─────────────────────────────────────────────────────────┘
                                                ▼
                       ┌─────────────────────────────────────────────────────────┐
                       │ HTTP 200 + body "SUCCESS: <msgid>"  ← live              │
                       └─────────────────────────────────────────────────────────┘
```

### 6.2 Single-curl probes for each gate

```bash
# Gate 1: REMOTE user provisioning
curl -u "<user>:<pass>" https://usd.txt.co.zw/Remote/AccountBalance
# Expect 302 if user doesn't exist; 403 or 200 if it does.

# Gate 2: IP whitelist (run from your relay's egress IP)
curl -u "<user>:<pass>" https://usd.txt.co.zw/Remote/AccountBalance
# 403 with "from <ip>" message means whitelist; 200 means cleared.

# Gate 3: KYC — only triggered on first send attempt
curl -u "<user>:<pass>" -X POST https://usd.txt.co.zw/Remote/SendMessage \
  --data "Recipients=07XXXXXXXX&Body=test"
# 200 with "verify your mobile number" body = KYC pending; 200 with "SUCCESS:" = live.

# Health probe through full chain (after whitelist, before KYC):
curl -X POST https://<your-project>.supabase.co/functions/v1/send-sms \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{"action":"health"}'
# Returns { ok: true, balance: "<amount>" } once gate 2 cleared.
```

### 6.3 Host-credential coupling

Credentials are scoped to the host they were issued on. `usd.txt.co.zw` (USD billing) and `www.txt.co.zw` (ZWG billing) are independent user databases. Cross-host calls will return 302 even with valid creds for the *other* host.

```bash
# Same creds, different hosts
curl -u "remote_tatenda:<pass>" https://usd.txt.co.zw/Remote/AccountBalance  # 200 (account exists here)
curl -u "remote_tatenda:<pass>" https://www.txt.co.zw/Remote/AccountBalance  # 302 (account doesn't exist on www)
```

If you need ZWG billing later, file a separate provisioning ticket. There is no auto-replication.

---

## 7. Operational Runbook

### 7.1 Cold start (Mac mini boot)

```bash
# Terminal 1 — relay
cd ~/Downloads/app/paynow-txt-relay
./start.sh
# Expect: "txt.co.zw relay listening on :8787"

# Terminal 2 — Cloudflare Tunnel
cloudflared tunnel --url http://localhost:8787
# Wait for "Your quick Tunnel has been created!" — copy the URL
```

### 7.2 Wire the new tunnel URL into Supabase

```bash
supabase secrets set TXT_RELAY_URL=https://<random>.trycloudflare.com \
  --project-ref hmeieslclzycyjjjflfh
```

Note: Cloudflare Quick Tunnels generate a fresh random URL each time. The Supabase secret must be updated on every restart. For long-running production, use a named Cloudflare Tunnel (stable domain) or paid static-IP host.

### 7.3 Verify the chain

```bash
curl -X POST https://hmeieslclzycyjjjflfh.supabase.co/functions/v1/send-sms \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{"action":"health"}'
```

Expect `{ ok: true, status: "live", balance: "<amount>", via: "relay" }`. Anything else → §6 diagnostic table.

### 7.4 Send a real SMS

```bash
curl -X POST https://hmeieslclzycyjjjflfh.supabase.co/functions/v1/send-sms \
  -H "Authorization: Bearer <service-role-key>" \
  -H "Content-Type: application/json" \
  -d '{"recipientPhone":"07XXXXXXXX","message":"<≤160 chars>","eventType":"<event>"}'
```

`recipientPhone` accepts `07XXXXXXXX`, `+263XXXXXXXXX`, or `263XXXXXXXXX` — `normalizePhone()` in the function strips and reformats. txt.co.zw expects the local `0`-prefixed form.

### 7.5 IP rotation

Residential ISPs occasionally rotate IPs at DHCP renewal. To check:
```bash
curl -s ifconfig.me
```

If different from the Paynow-whitelisted IP, file a re-whitelist ticket with the new IP. Mitigation: pin the Mac mini's external IP via your router's DHCP reservation (most home routers support this), or move to a paid static-IP host.

### 7.6 Account balance / cost monitoring

```bash
# Quick balance check via health probe
curl -X POST https://<project>.supabase.co/functions/v1/send-sms \
  -H "Authorization: Bearer <anon>" \
  -d '{"action":"health"}'
```

Compare against `sms_log` cost ledger:
```sql
SELECT
  date_trunc('day', created_at) AS day,
  count(*) FILTER (WHERE status = 'sent') AS sent,
  sum(cost_usd) AS daily_cost
FROM sms_log
GROUP BY 1
ORDER BY 1 DESC;
```

Reconcile against txt.co.zw monthly invoice; discrepancies usually mean failed sends being mis-logged.

### 7.7 Rate limit configuration

```ts
const MAX_SMS_PER_USER_PER_HOUR = 10;
const SMS_MAX_LENGTH = 160;
const COST_PER_SMS_USD = 0.03;
```

Rate limit is per-`user_id`, evaluated against `sms_log` rows from the past 60 minutes. Rejected sends do NOT consume the quota (they're logged as `failed`, but the count query filters by status).

---

## 8. Where SMS Fires (Application Wiring)

| Trigger | Edge Function | Recipient | Template (≤160 chars) |
|---|---|---|---|
| Payment confirmed | `payment-webhook` (`completePayment()`) | Buyer | "Payment confirmed: US$X for [item]. Ref: ZL-XXX. Thank you." |
| Payment confirmed | `payment-webhook` | Seller | "Payment received: US$X for [item]. Payout within 24hrs." |
| Auction won | `end-auctions` (after `end_expired_auctions()`) | Winner | "You won [item] for US$X! Pay at zimlivestock.co.zw to complete." |
| Auction won | `end-auctions` | Seller | "Your auction for [item] ended. Sold for US$X." |
| Outbid | `place_bid()` RPC + notification trigger | Previous bidder | "You've been outbid on [item]. New: US$X. Bid higher now." |
| Auction ending soon (Phase 1b) | `auction-ending-alerts` cron | Highest bidder | "Your bid of US$X on [item] expires in <1hr." |

All event types funnel through the single `send-sms` function — adding a new trigger requires no infrastructure changes, only a new caller.

---

## 9. Production Hardening Roadmap

The current setup is demo-grade. Before serving real merchant volume:

| # | Change | Effort | Why |
|---|---|---|---|
| 9.1 | Move relay off Mac mini onto paid static-IP host | 1 day | Removes laptop-uptime dependency |
| 9.2 | Replace Cloudflare Quick Tunnel with named Cloudflare Tunnel | 30 min | Stable URL across restarts; no daily Supabase secret update |
| 9.3 | Add cost-cap circuit breaker (max $X/day) | 2 hr | Prevents runaway-loop bills if a caller misbehaves |
| 9.4 | Implement opt-out (`profiles.sms_opt_out`) | 1 hr | Compliance with subscriber preference |
| 9.5 | Add CHAR(0) parser for `/Remote/CheckMessage/{id}` | 4 hr | Delivery-status tracking; closes the loop on `sent` → `delivered` |
| 9.6 | Migrate from Quick Tunnel to dedicated relay endpoint | 1 day | Remove cloudflared dependency entirely |

Recommended order: 9.1 → 9.3 → 9.4 → 9.2 → 9.5 → 9.6.

---

## 10. Recommendations to Paynow (txt.co.zw product)

These mirror the structural recommendations in the [Research Investigation](research-investigation.md) for Paynow Core, applied to txt.co.zw's own DX gaps.

### 10.1 Document the multi-gate provisioning flow in v1.13

The four gates in §6 are real but absent from v1.12. A 30-line "Provisioning Checklist" added to the spec would save every future integrator the discovery work captured in this document. Specifically:
- The `remote_*` username convention
- That IP whitelist + Basic Auth coexist (not alternatives)
- That account KYC is a separate gate gating SMS sends after auth+IP
- That credentials are host-scoped (USD vs ZWG)

### 10.2 Offer a "Basic-Auth-only" REMOTE user mode for serverless callers

The v1.12 §Basic Authentication section describes Basic Auth as the *alternative* to IP whitelist. In production it appears to be additive. If support could provision REMOTE users with **only** Basic Auth (no IP enforcement), serverless integrators would not need to operate proxy infrastructure. The 16-character password is already strong enough to be the sole gate.

This is a configuration option, not new architecture.

### 10.3 Surface KYC requirement in the API response, not as free-text body

Currently a KYC-pending account returns `200 OK` with body `"Sorry, you are not permitted to send SMS until you verify your mobile number..."`. A non-200 status code (e.g. `403 Forbidden`) with a structured JSON error would let integrators distinguish KYC failures from genuine SMS rejections programmatically. Free-text body parsing is fragile.

### 10.4 Publish the hosts/credentials matrix as a first-class doc

Add to v1.13:
> *"Credentials are scoped to a single host. To use both `usd.txt.co.zw` (USD) and `www.txt.co.zw` (ZWG), provision the user on each host independently. Cross-host calls with credentials from a different host return HTTP 302 → /user/logon."*

This single sentence saves hours.

### 10.5 Provide a sandbox / test mode that doesn't require KYC

Currently the only path to test the SendMessage endpoint is to fully provision a production REMOTE user with KYC. A sandbox mode (similar to v1.12 §Test Mode but available on day one) would let integrators verify their code path before any account workflow.

---

## 11. Proposed Solution for the ZimLivestock Use Case

Sections 1–10 cover what is built and what we would file upstream with the txt.co.zw product team. This section pivots from technical reference to **product commitment** — why SMS is not a notification channel in this architecture but a first-class trust transport, and why txt.co.zw is the right rail for it.

### 11.1 The accessibility constraint the architecture must absorb

The May 2026 demo panel pressed on accessibility: **roughly 30% of Zimbabwean livestock buyers and sellers transact from feature phones**, not smartphones. Field research at a physical auction in Mt Hampden confirmed this — the auctioneer's phone is the only smart device on the lot, and bidders shout, wave, and pay in cash because they cannot install an app.

Any payments architecture that assumes app-first reach fails this 30%. The proposed solution treats SMS as the **trust transport for the non-smartphone segment** — they cannot install the PWA, so SMS is how they receive bid confirmations, outbid alerts, payment receipts, and BillPay voucher codes.

### 11.2 The recommendation

**txt.co.zw via a self-hosted Cloudflare Tunnel relay, fronted by the `send-sms` Supabase Edge Function, called from every state transition in the auction lifecycle.**

```
                ┌──────────────────────────────────────────────┐
                │  ZimLivestock event emitters                 │
                │   • place_bid trigger → outbid SMS           │
                │   • auction end → winner/loser SMS           │
                │   • payment-webhook → receipt SMS            │
                │   • billpay PAY → voucher SMS                │
                │   • auction-ending cron → "ends in <1hr"     │
                └──────────────────────┬───────────────────────┘
                                       │
                ┌──────────────────────▼───────────────────────┐
                │  send-sms Edge Function                      │
                │   • single template + audit log              │
                │   • sms_log table for delivery state         │
                │   • opt-out check (roadmap §9.4)             │
                └──────────────────────┬───────────────────────┘
                                       │
                ┌──────────────────────▼───────────────────────┐
                │  Cloudflare Tunnel → Mac mini relay          │
                │   • bypasses IP-whitelist requirement        │
                │   • Basic Auth at the txt.co.zw boundary     │
                └──────────────────────┬───────────────────────┘
                                       │
                                       ▼
                              txt.co.zw → SIM
```

### 11.3 Why txt.co.zw over Twilio, AfricasTalking, or carrier SMPP

The benchmark in [benchmark-report.md](../week-1-2/02-dx-benchmark/benchmark-report.md) ranked payment providers, not SMS providers. For SMS specifically:

| Provider | Why not |
|---|---|
| Twilio | Zimbabwe sender-ID registration requires NetOne/Econet partnership ZimLivestock does not have; pricing is in USD and unfavourable for the volume profile |
| AfricasTalking | Works in Zimbabwe but routes through a third aggregator → adds latency, fragments the trust surface, and requires a second vendor relationship |
| Carrier SMPP direct | Requires bulk-SMS aggregator contracts and a 90-day onboarding; out of scope for a 9-week internship |
| **txt.co.zw** | Paynow ecosystem (same wallet, same audit trail), direct EcoCash/NetOne reach, USD-billable, already in scope for the broader Paynow integration |

The choice is not "best SMS API" — it is "best SMS rail that completes the Paynow ecosystem story." txt.co.zw wins on coverage, settlement, and ecosystem coherence.

### 11.4 Why the relay is permanent, not a workaround

§9.1 lists "move relay off Mac mini onto paid static-IP host" as the first hardening item. The relay itself is **not** a temporary workaround — it is a permanent architectural choice. The IP-whitelist gate at the txt.co.zw boundary is not removable for a non-Paynow employee, and the proposed solution treats this as a feature, not a bug:

- The relay is the only IP that knows the txt.co.zw credentials → tightest possible blast radius
- The Supabase Edge Function never sees the password → secrets never enter the cloud-egress perimeter
- The Cloudflare Tunnel provides a stable public URL that can rotate without the upstream rail noticing

The proposed Phase 2 hardening is to replace the Mac mini with a paid static-IP VPS in Zimbabwe, but the **relay pattern stays.** It is the SMS analogue of the browser-relay pattern documented in [paynow-supabase-integration.md §9](paynow-supabase-integration.md).

### 11.5 SMS as transactional, not promotional

The proposed solution explicitly **rejects** using the SMS rail for promotion (welcome blasts, "new auction tomorrow", marketing). Three reasons:

1. **Cost.** Per-message economics scale linearly. A blast to 10,000 users costs more than a month of Supabase.
2. **Trust.** The first promotional SMS makes every future transactional SMS feel like spam. Opt-out rates compound.
3. **Compliance.** Subscriber-preference rules apply differently for transactional vs promotional in Zimbabwe; conflating them creates legal exposure.

SMS triggers are restricted to the auction state machine and BillPay vouchers. Marketing happens in-app or via email.

### 11.6 Phase 2 — Delivery-status closeback

`/Remote/CheckMessage/{id}` returns delivery status (sent → delivered → read). The current architecture writes `sent` and stops. The proposed Phase 2 adds a poll cron that updates `sms_log.status` to `delivered` when carrier confirms, and `failed` when carrier rejects. This closes the loop on the trust transport and enables future features:

- Resend logic when delivery fails (carrier outages, dead SIMs)
- Bid-confirmation dependency on receipt (don't release auction state until SMS confirms)
- SLA reporting per carrier (NetOne vs Econet delivery rates)

§9.5 captures the effort estimate — 4 hours when prioritised.

### 11.7 What ships today, what's next, what we reject

**Production today:**
- `send-sms` Edge Function with single-template + audit log
- Mac mini relay over Cloudflare Tunnel
- Bid-placed, outbid, auction-won, payment-receipt SMS triggers
- Voucher SMS dispatch for BillPay (§7 in [billpay-supabase-integration.md](billpay-supabase-integration.md))
- Health probe endpoint with live balance check
- First live `status: sent` row in `sms_log` 2026-05-05

**Next (scoped, not in production):**
- Auction-ending-soon cron (Phase 1b)
- Delivery-status closeback (§11.6 above, §9.5 roadmap)
- Opt-out (§9.4)
- Cost-cap circuit breaker (§9.3)
- Migration from Quick Tunnel to named Cloudflare Tunnel (§9.2)

**Rejected:**
- Twilio / AfricasTalking — wrong rail for this ecosystem (§11.3)
- Promotional / marketing SMS — trust and cost reasons (§11.5)
- WhatsApp Business as a substitute — does not reach the feature-phone segment that justifies SMS in the first place

### 11.8 The commitment, in one paragraph

SMS via txt.co.zw is the **accessibility floor** of the ZimLivestock architecture. It is the rail that lets a feature-phone user receive a bid confirmation without installing an app, a voucher code without a smartphone, and a payment receipt without WhatsApp. It completes the Paynow ecosystem story (Paynow Core for payments, BillPay for biller payments, txt.co.zw for transactional messaging — three rails, one settlement perimeter). The relay pattern is permanent; the production hardening is incremental; the rejection of promotional use is a load-bearing decision. **SMS is not a notification channel in this architecture — it is the third trust transport, on par with the app and the wallet.**

---

## 12. Source Material and Evidence Index

### 12.1 Primary code

- [`supabase/functions/send-sms/index.ts`](../../supabase/functions/send-sms/index.ts) — Edge function (240 LOC)
- [`paynow-txt-relay/`](../../paynow-txt-relay/) — Self-hosted relay
- [`src/app/components/TestSmsNotification.tsx`](../../src/app/components/TestSmsNotification.tsx) — Browser test harness

### 12.2 Companion documentation

- [`docs/sms-integration-plan.md`](../../docs/sms-integration-plan.md) — Original plan + appended journey log with timeline
- [Research Investigation](research-investigation.md) — Parallel finding: Paynow Core CF bot wall, BillPay subdomain pattern, structural recommendations
- [Paynow × Supabase Integration](paynow-supabase-integration.md) — Sibling integration doc covering Paynow Core + BillPay

### 12.3 Live verification artifacts

- `sms_log` table (Supabase project `hmeieslclzycyjjjflfh`) — first live `status: "sent"` row 2026-05-05
- Health probe endpoint — currently returns `{ ok: true, status: "live", balance: "<amount>", via: "relay" }`
- Subscriber phone `+263781497764` — received "youre the greatest of all time" smoke test 2026-05-05

### 12.4 Supabase secrets (names only — values write-only)

| Name | Purpose |
|---|---|
| `TXT_USERNAME` | REMOTE-API username (`remote_tatenda`) |
| `TXT_PASSWORD` | REMOTE-API password (16+ chars per v1.12) |
| `TXT_RELAY_URL` | Public Cloudflare Tunnel URL pointing at the relay |
| `TXT_RELAY_SECRET` | Shared secret matching relay's local `RELAY_SECRET` |

### 12.5 Mac mini local environment (gitignored)

`paynow-txt-relay/.env` contains `TXT_USERNAME`, `TXT_PASSWORD`, `RELAY_SECRET`, `PORT=8787`. Permissions `0600`. Never committed.

---

## 13. Status

✅ **Live.** Full chain proven end-to-end. Demo-ready.

```
Browser PWA → Supabase Edge → Cloudflare Tunnel → Mac mini → txt.co.zw → SIM
```

Pending follow-up (post-demo):
- Production hardening (§9)
- File the v1.13 documentation requests with Paynow (§10)
- Migrate relay off residential infrastructure
