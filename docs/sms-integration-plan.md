# SMS & Airtime Integration Plan — ZimLivestock via txt.co.zw

## Overview
Add SMS notifications for critical auction events (payment confirmed, auction won, outbid) using the txt.co.zw API. Also enables airtime rewards for referrals and first listings.

**Why SMS:** 40%+ of rural Zimbabwe uses feature phones. SMS has 98% open rate. Cost: ~US$0.03/message.

## Core: Reusable `send-sms` Edge Function

Location: `supabase/functions/send-sms/index.ts`

```typescript
// POST body
{
  recipientPhone: string,   // "0771234567"
  message: string,           // max 160 chars
  eventType: string,         // "payment_confirmed", "auction_won", etc.
  userId: string,            // for logging
}
```

**Responsibilities:**
1. Normalize phone to Zimbabwe format (+263...)
2. POST to `https://usd.txt.co.zw/Remote/SendMessage`
3. Log to `sms_log` table
4. Check rate limit (max 10 SMS/user/hour)
5. Never throw — SMS failure must not block calling function

**Auth:** HTTP Basic Auth with txt.co.zw credentials stored as Supabase secrets.

## Where SMS Gets Sent

### 1. Payment Confirmed (Highest Value)
**Modify:** `supabase/functions/payment-webhook/index.ts` → inside `completePayment()`

| Recipient | SMS |
|---|---|
| Buyer | "Payment confirmed: US$X for [item]. Ref: ZL-XXX. Thank you for using ZimLivestock." |
| Seller | "Payment received: US$X for [item]. Your payout will be processed within 24hrs." |

### 2. Auction Won
**Modify:** `supabase/functions/end-auctions/index.ts` → after `end_expired_auctions()` RPC

| Recipient | SMS |
|---|---|
| Winner | "You won [item] for US$X! Pay now at zimlivestock.co.zw to complete your purchase." |
| Seller | "Your auction for [item] ended. Sold for US$X. Buyer will be prompted to pay." |

### 3. Outbid Notification (Highest Engagement)
**Modify:** `supabase/schema.sql` → `place_bid()` function

Add to PL/pgSQL:
```sql
SELECT user_id INTO v_prev_bidder FROM public.bids
  WHERE livestock_id = p_livestock_id AND user_id != p_user_id
  ORDER BY amount DESC LIMIT 1;

IF v_prev_bidder IS NOT NULL THEN
  INSERT INTO public.notifications (user_id, type, title, message, priority)
  VALUES (v_prev_bidder, 'bid', 'You''ve been outbid',
    'Someone bid US$' || p_amount || ' on ' || v_item.title, 'high');
END IF;
```

SMS sent async via `pg_net` or notification trigger → `send-sms`.

| Recipient | SMS |
|---|---|
| Previous bidder | "You've been outbid on [item]. New highest: US$X. Place a higher bid now." |

### 4. Auction Ending Soon (Phase 1b)
**New:** `supabase/functions/auction-ending-alerts/index.ts` (cron every 15 min)

Query auctions ending within 1 hour with bids → SMS highest bidder.

| Recipient | SMS |
|---|---|
| Highest bidder | "Your bid of US$X on [item] expires in less than 1 hour." |

### 5. Airtime Rewards (Phase 2)
Uses `https://usd.txt.co.zw/Remote/DirectRecharge`

| Trigger | Recipient | Amount |
|---|---|---|
| First listing posted | Seller | US$0.50 airtime |
| Referral signup | Referrer + new user | US$0.25 each |

## New DB Table: `sms_log`

```sql
CREATE TABLE IF NOT EXISTS public.sms_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  phone text NOT NULL,
  message text NOT NULL,
  event_type text NOT NULL,
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed')),
  provider_reference text,
  cost_usd numeric(6,4),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_log_user ON public.sms_log(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_log_created ON public.sms_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_log_user_recent ON public.sms_log(user_id, created_at DESC);
```

## Files to Create

| File | Purpose |
|---|---|
| `supabase/functions/send-sms/index.ts` | Core reusable SMS sender |
| `supabase/functions/auction-ending-alerts/index.ts` | Cron: "ending soon" SMS (Phase 1b) |

## Files to Modify

| File | Change |
|---|---|
| `supabase/functions/payment-webhook/index.ts` | Add SMS calls in `completePayment()` |
| `supabase/functions/end-auctions/index.ts` | Query winners after RPC, send SMS |
| `supabase/schema.sql` | Add outbid notification to `place_bid()`, add `sms_log` table |

## Data Flow
```
Event (payment, auction end, outbid)
  → Edge Function detects event
  → Queries profiles.phone for user
  → Calls send-sms Edge Function
  → send-sms POSTs to usd.txt.co.zw/Remote/SendMessage
  → Logs to sms_log table
  → Returns success/failure (never throws)
```

## Security
- **Credentials:** `TXT_API_USERNAME` + `TXT_API_PASSWORD` as Supabase secrets
- **Phone numbers:** Already in `profiles.phone` (required at signup)
- **Rate limiting:** Max 10 SMS/user/hour via `sms_log` index
- **Cost cap:** Max 500 SMS/day (US$15/day) enforced in `send-sms`
- **Internal only:** `send-sms` requires service role auth, not publicly callable
- **Opt-out:** Phase 2 — add `sms_opt_out` column to profiles

## Minimal Viable Integration

1. `send-sms` Edge Function (reusable core)
2. Modify `payment-webhook` — SMS on payment confirmed (buyer + seller)
3. Modify `end-auctions` — SMS on auction won (winner + seller)
4. Schema: `sms_log` table

**Estimated effort:** ~14 hours total for Phase 1

## txt.co.zw API Reference

- **Host:** `https://usd.txt.co.zw` (USD currency)
- **Send SMS:** `POST /Remote/SendMessage` — fields: Recipients, Body, sending_number
- **Send Airtime:** `POST /Remote/DirectRecharge` — fields: Recipient, Amount
- **Check Balance:** `GET /Remote/AccountBalance`
- **Auth:** HTTP Basic or Username + IP whitelist
- **Test mode:** Available — directs SMS to predefined emails/numbers

---

## Integration Journey & Operational Findings

*Appended 2026-05-05 after live integration attempts. Captures what the up-front plan didn't predict.*

### Timeline of attempts

| Date | Attempt | Result | Diagnostic signal |
|---|---|---|---|
| 2026-05-04 | Set Basic Auth secrets with portal username `tatendanyemudzo` | **HTTP 302 → /user/logon** on both `usd.txt.co.zw` and `www.txt.co.zw` | Auth not recognized — portal username is not the REMOTE-API user |
| 2026-05-05 | Paynow provisioned proper REMOTE user `remote_tatenda` with separate password | **HTTP 403** with status line: *"remote_tatenda is not configured to access this API from `<requesting IP>`"* | Auth at user level works; account is configured with IP whitelist, current IP not on it |
| 2026-05-05 | Confirmed credentials work cross-host: only `usd.txt.co.zw` accepts these creds; `www.txt.co.zw` returns 302 | Hosts are credential-scoped — confirms v1.12 §Hosts warning |

### Four credential-related insights the docs don't make obvious

1. **Portal username ≠ REMOTE-API username.** The user account you log in to txt.co.zw with via a browser is a different identity from the one you use to call the API. REMOTE-API users are conventionally prefixed `remote_*` (e.g. `remote_tatenda`) and must be created separately by Paynow support.

2. **HTTP 302 vs HTTP 403 are diagnostically distinct.**
   - `302 → /user/logon` = "this username is not a recognized REMOTE user on this host" (or wrong password)
   - `403 → "<user> is not configured to access this API from <IP>"` = REMOTE user exists; IP whitelist is enforced; current IP is not on it
   - The transition from 302 to 403 confirms that REMOTE provisioning happened and auth at the user level is working — only the IP gate remains.

3. **Basic Auth path coexists with IP whitelist.** The v1.12 spec presents Basic Auth as an alternative to Username+IP, but in practice an account can be configured with **both layers active**: even when Basic Auth credentials are correct, requests from non-whitelisted IPs are rejected. The 16-character password is necessary but not sufficient.

4. **Account-level KYC verification gates outbound SMS — separately from REMOTE provisioning.** Even after the REMOTE user is created, the password set, and the IP whitelisted, the first SMS send returns `200 OK` with body: *"Sorry, you are not permitted to send SMS until you verify your mobile number. Go to https://usd.txt.co.zw/customer/verifykyc"*. The customer (portal-user identity, not the REMOTE-API user) must log into the web portal at `/customer/verifykyc`, submit a mobile number, and complete OTP verification. **None of this is mentioned in v1.12.** Plan integration timelines accordingly: REMOTE provisioning + IP whitelist + KYC verification are three separate manual workflows on Paynow's side, each potentially gated on different teams.

### Why we shipped a relay anyway (the agentic-commerce constraint)

The test-machine that ran our integration attempts was a **Supabase Edge Function** — a serverless platform with rotating egress IPs across multiple datacenter regions. Even if Paynow whitelists one IP today, the next request can egress from a different IP tomorrow. This makes IP whitelisting structurally incompatible with serverless platforms.

This is the same DX gap the research investigation identifies for Paynow Core (see [research-investigation.md](../deliverables/week-6/research-investigation.md)) — except for txt.co.zw it surfaces at the *application* layer instead of the *transport* layer:

| Product | Failure mode | Fix |
|---|---|---|
| Paynow Core | TCP RST (`os error 104`) before HTTP | CF Worker relay (egress from Cloudflare network is trusted) |
| txt.co.zw (this product) | HTTP 403 with explicit IP-not-whitelisted message | Static-IP relay (IP must be whitelisted by Paynow per REMOTE user) |

Both require integrators to operate proxy infrastructure that no other major payment / SMS gateway demands. **The recommendation in the research investigation — *adopt the BillPay subdomain pattern, drop bot/IP gating on the API surface* — applies to txt.co.zw symmetrically.** A `remote_*` user that authenticates on Basic Auth alone (matching v1.12 §Basic Authentication as documented, without the additional IP enforcement) would unblock every serverless caller.

### Architecture shipped (constrained — no credit card available)

Without budget for a managed cloud provider (Oracle Cloud, Fly.io, DigitalOcean, AWS — all require a credit/debit card for signup), the workaround uses infrastructure the developer already has:

```
Browser → Supabase Edge (send-sms) ─┐
                                    │ POST via ngrok URL
                                    ▼
                          Local laptop relay (Deno HTTP server, localhost:8787)
                                    │ adds Basic Auth + forwards
                                    │ egresses from developer's residential IP
                                    ▼
                          usd.txt.co.zw (whitelists residential IP for `remote_tatenda`)
```

**Key invariant:** The IP that hits `usd.txt.co.zw` is the **laptop's residential IP**, not ngrok's. ngrok is a free inbound tunnel for Supabase to reach the laptop; it does not affect outbound calls *from* the laptop. So the single IP given to Paynow for whitelisting is the laptop's home internet egress.

**Components:**
- `paynow-txt-local-relay/relay.ts` — 40-LOC Deno HTTP server: validates shared secret header, adds Basic Auth, forwards body to `https://usd.txt.co.zw/Remote/SendMessage` (or `/Remote/AccountBalance` for health probes).
- ngrok free tier — `ngrok http 8787` exposes `localhost:8787` as a public HTTPS URL. Free signup requires only an email address.
- Supabase secrets — `TXT_RELAY_URL` (ngrok URL) and `TXT_RELAY_SECRET` (shared header for relay auth).

**Trade-offs accepted:**
| Trade-off | Mitigation |
|---|---|
| Laptop must be online with relay running | Acceptable for demo; long-term needs migration to a paid static-IP host |
| Residential IP can rotate with ISP DHCP renewal | Verified stability via repeated `curl ifconfig.me`; if IP changes mid-demo, request re-whitelist |
| ngrok free URL changes per session | Update `TXT_RELAY_URL` Supabase secret on each restart |
| ngrok free has 8-hour session limit | Restart before demo; bandwidth quota is far above demo needs |

### Diagnostic tooling shipped

`supabase/functions/send-sms/index.ts` exposes a free, read-only `action: "health"` action that hits `/Remote/AccountBalance` and returns a structured status:

| Status | Meaning |
|---|---|
| `live` | Credentials work; balance returned |
| `auth_not_provisioned` | REMOTE user not recognized (HTTP 302 → login) |
| `credentials_missing` | `TXT_USERNAME` / `TXT_PASSWORD` Supabase secrets unset |
| `http_error` (with body) | Auth recognized; access denied — typically the 403 IP message |
| `unreachable` | Network failure |

This action is exposed without service-role gating (the SMS-send action remains gated) so the test harness ([`src/app/components/TestSmsNotification.tsx`](../src/app/components/TestSmsNotification.tsx)) can ping it from a browser. The harness has a "Ping txt.co.zw" button with color-coded status.

Use cases:
- **Pre-demo verification.** One click confirms upstream is reachable without spending the $0.03/SMS test cost.
- **Post-incident triage.** When SMS sends start failing in production, a single curl distinguishes "Paynow's account changed state" from "our relay is down."
- **Onboarding new integrators.** A new team member can run the probe on day one to confirm credentials are propagated.

### Recommendations for future txt.co.zw integrators

1. **Confirm REMOTE user identity up front.** Before starting integration, ask Paynow support to confirm: (a) what is the exact REMOTE-API username (it will likely have a `remote_` prefix), (b) which host is it provisioned on (`www.txt.co.zw` ZWG vs `usd.txt.co.zw` USD), (c) is IP whitelist active or pure Basic Auth.
2. **Provision both hosts at signup.** If you ever need ZWG billing, get the user added on `www.txt.co.zw` at the same time. Cross-host migration is a manual support ticket.
3. **Avoid IP whitelist for serverless deployments.** Insist on Basic Auth-only. If support insists on IP enforcement, you will need a static-IP relay — and the v1.12 docs do not warn integrators about this combinatorial gotcha.
4. **Use the health-probe pattern.** Even before any SMS send code is written, deploy `/Remote/AccountBalance` as a connectivity probe. The 302/403 distinction is the single most useful diagnostic signal in this integration.
5. **Negotiate test mode early.** v1.12 §Test Mode mentions test-mode REMOTE users that route SMS to predefined addresses. Ask for one for your dev environment before you start sending real SMS — production SMS billing accumulates fast during integration debugging.

### Status as of 2026-05-05 (live)

- **Integration shipped to main:** ✅ `supabase/functions/send-sms/index.ts`, relay (`paynow-txt-relay/`), test harness, this plan
- **REMOTE user provisioned:** ✅ `remote_tatenda` on `usd.txt.co.zw`
- **Credentials stored:** ✅ Supabase secrets (`TXT_USERNAME`, `TXT_PASSWORD`, `TXT_RELAY_URL`, `TXT_RELAY_SECRET`)
- **Static-IP relay:** ✅ Mac mini at `41.173.195.173`, exposed via Cloudflare Tunnel (free quick-tunnel)
- **Paynow IP whitelist:** ✅ Whitelisted for `remote_tatenda`
- **Account KYC:** ✅ Mobile number verified on `usd.txt.co.zw/customer/verifykyc`
- **Health probe:** ✅ Returns `{ ok: true, status: "live", balance: "$2.00", via: "relay" }`
- **Live SMS:** ✅ End-to-end smoke test delivered to subscriber phone

Full chain proven: `Supabase Edge → Cloudflare Tunnel → Mac mini relay → txt.co.zw → SIM`.
