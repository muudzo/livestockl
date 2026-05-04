# Final Demo Script — ZimLivestock × Paynow

**Audience:** Paynow leadership + senior engineering team
**Runtime:** 8 min main + 5 min Q&A
**Date:** 2026-05-04
**Predecessor doc:** [`demo-runbook.md`](demo-runbook.md) (April 16, internal review). This script is the public-facing final delivery — assume some attendees haven't seen the earlier demo.

---

## One-liner

> *Two deliverables: (1) a working agent-native auction app on Supabase with EcoCash Express, BillPay, and Stripe wired in; (2) an integration playbook senior engineers can hand to the next vendor — including the Cloudflare workaround that should not exist.*

---

## What's new since the internal review (April 16)

| | April 16 demo | Today |
|---|---|---|
| In-app notifications | Page existed; no badge, no click-through | Numeric pill on nav, tap-to-open, type-aware deep links |
| Outbid → re-bid loop | 3 taps (Notifications → guess listing → bid) | 1 tap (notification routes to `/item/<id>`) |
| Senior-engineer handover | Slide deck only | Full code-snippet integration doc ([`paynow-supabase-integration.md`](paynow-supabase-integration.md)) |
| BillPay vendor coverage | Test biller only | 11 simulated billers + ZETDC test-meter cases per v1.33 spec |
| Edge Function hardening | CORS wildcard, JSON 500s | Origin-allowlist, `400` on malformed JSON, no stack-trace leaks |

If a returning attendee asks "what's actually different" — those five rows.

---

## Pre-demo (T-15 min)

```bash
cd /Users/tatendanyemudzo/Downloads/app
source .env.local

# 1. Reseed agent auctions (3 ended + 7 active, staggered 2-14 min)
python3 -c "
import json, os, urllib.request
with open('supabase/seeds/demo-agent-auctions.sql') as f: sql = f.read()
req = urllib.request.Request(
    'https://api.supabase.com/v1/projects/hmeieslclzycyjjjflfh/database/query',
    data=json.dumps({'query': sql}).encode(),
    headers={'Authorization': f'Bearer {os.environ[\"SUPABASE_ACCESS_TOKEN\"]}', 'Content-Type': 'application/json', 'User-Agent': 'curl/8.4.0'},
    method='POST',
)
print(urllib.request.urlopen(req, timeout=60).read().decode())
"

# 2. Cloudflare relay healthy
/usr/bin/curl -sS -H 'User-Agent: Mozilla/5.0' https://paynow-relay.zimlivestock.workers.dev/health

# 3. Notification link column verified on remote
supabase db query --linked "select count(*) filter (where link is not null) as with_link, count(*) total from notifications;"

# 4. Dev server (use --host so phone on same wifi can hit it if needed)
npm run dev -- --host
```

**Eyeball before going on:**
- 10 AGENT listings in the feed (3 won, 7 ticking)
- Penny Sniper agent visible on `/agents`
- Test phone unlocked, on data, EcoCash wallet > US$0.50
- Bell pill on "More" shows a count (seed it by triggering one bid manually if zero)

---

## Script (8 min)

### Act 1 — The shape of the problem (60s)

**Say.**
> "Zimbabwe runs on EcoCash. Seventy-percent of adult banking flows through it. So if you're building anything that needs to take payment from a Zimbabwean buyer, you go to Paynow first. ZimLivestock is a livestock auction app. The buyer wins, the buyer pays, the seller gets notified — that whole loop runs on Paynow."

**Show.** Home feed. Scroll once. Tap an AGENT listing.

**Say.**
> "What I want to walk you through is two things. One — what the app does. Two — what we learned integrating Paynow's products against a serverless backend, and what I wrote down for your senior engineers."

---

### Act 2 — Buyer flow, real Paynow (90s)

**Say.**
> "Let's run a real EcoCash payment. Not a simulator — actual Paynow Express Checkout, USSD on my phone."

**Show.**
1. From the active listing, tap **Bid Now**.
2. Enter `US$0.05` (the penny ceiling — keeps demo cheap).
3. Watch the app navigate to `/payment-status/<ref>`.
4. **Hold the phone up.** USSD prompt arrives in 8–15s.
5. Approve `*151#` on phone.
6. Web UI flips to **Paid** in <20s — the poll-sync hook detects the state change before the webhook even arrives.

**Say while waiting for USSD.**
> "The interesting part isn't that this works. It's the three independent paths that all have to fail before this user sees an error: webhook, poll-sync from the browser, and the Cloudflare Worker relay. Any one of them recovers. We'll come back to that."

---

### Act 3 — Notifications, end-to-end (90s) ← **NEW**

**Setup.** Have a *second* logged-in browser/incognito as a different buyer who already bid on the same item.

**Say.**
> "When that bid landed, the place_bid RPC fired notifications. Seller gets one — *new bid on your listing*. Every previous bidder gets *you've been outbid*. Both rows have type='bid' but they need to land in different places, because the seller wants to see their listings and the outbid buyer wants to bid again."

**Show.**
1. Switch to the second browser. Bell pill on "More" now reads `1`.
2. Tap **More → Notifications**.
3. The "You've been outbid!" row is highlighted — tap it.
4. App routes to `/item/<id>` — same listing, bid form already showing the new minimum.

**Say.**
> "One tap to re-bid. The destination came from a `link` column we added to the notifications table this morning — the place_bid function populates it differently for sellers versus outbid bidders. Same notification type, different deep link per recipient."

---

### Act 4 — Bills, agent autonomy (90s)

**Say.**
> "Same merchant identity, different Paynow product. Let me show BillPay."

**Show.**
1. Home feed → **Pay Bills** (Services hero card or `/pay-bill`).
2. Pick **ZETDC Prepaid Electricity**.
3. Enter test meter `37132567431` (single-debt token per v1.33 spec).
4. Amount `US$5`.
5. Walk through the AUTH → confirm → PAY wizard.
6. Token returned, receipt SMS sent (point at the toast).

**Say.**
> "Per spec, AUTH and PAY use the same Reference. The Edge Function generates it on AUTH, stores it in `bill_payments.reference`, and on PAY we look up the authorized row and send the same reference back. If we got it wrong — duplicate billing or rejected PAY. The DB enforces it."

**Show.** Briefly flip to the agent dashboard:
> "Penny Sniper bid, won, and paid 3 of these auctions overnight via the same EcoCash Express path. No clicks. No human in the loop. The settlement ledger has every step."

---

### Act 5 — The handover doc (90s) ← **NEW**

**Say.**
> "I want your senior engineers to be able to use what I built. So I wrote them this."

**Show.** Open [`deliverables/week-6/paynow-supabase-integration.md`](paynow-supabase-integration.md). Scroll once.

**Say, pointing at the contents.**
> "Thirteen sections. Architecture, schema, hash signing, Express Checkout, Web Checkout, webhook receiver, poll-sync fallback, the Cloudflare workaround, BillPay AUTH/PAY, the frontend hook, gotchas, env vars, file index. Every code snippet is verbatim from current code with file-and-line citations so anyone reviewing can audit in-tree."

**Pause on the gotchas table.**
> "Ten things that bit us — penny rounding, hash order, TechnicalNarration leaking to UI, double-submit duplication. Each one has a one-line fix and the file it lives in. If your team takes this app over tomorrow, this is the doc they read first."

---

### Act 6 — The infrastructure ask (75s)

**Say.**
> "One thing in this doc shouldn't have to exist."

**Show.** Scroll to Section 8 (Cloudflare egress workaround). Open [`paynow-relay/src/index.js`](../../paynow-relay/src/index.js).

**Say.**
> "70 lines of Cloudflare Worker. It exists because Paynow Core's API rate-limits or blocks Supabase Edge Function egress IPs. Without this, the autonomous payment loop dies on a TCP RST. With it — clean 200, 400-800ms round trip."

**Say, slower.**
> "BillPay is on `billpay.paynow.co.zw` — a sub-host, no bot wall, integrated in 90 minutes. Paynow Core is on `www.paynow.co.zw` — bot wall, 3.5 hours plus a proxy. The recommendation in [the retrospective](../week-5/ecosystem-integration-retrospective.md) is one line: do for Paynow Core what you already did for BillPay. Every ZW developer trying to build agentic payments hits this same wall. You can unblock all of them in one DNS change."

---

### Act 7 — Close (30s)

**Say.**
> "What I'm leaving with you: a working app, a senior-engineer integration doc, and a benchmark report comparing Paynow to four other African payment providers. Paynow ranked second on developer experience — only beaten by the providers that ship native EcoCash. Where I'd put effort first: Paynow Core sub-host migration, a Postman collection link from the dashboard, and a sandbox that doesn't require submitting an integration request."

> "Questions?"

---

## Q&A — anticipated questions, prepared answers

**"How does this scale beyond the demo?"**
> Single-pod Supabase Edge Functions handle ~100 concurrent payment initiations on the free tier. Paynow Core is the bottleneck not us — Express Checkout is sequential per phone number. The architecture in the integration doc supports horizontal scale because every state transition is idempotent and DB-keyed.

**"What if Paynow goes down?"**
> Three answers. (1) The webhook is best-effort — poll-sync replays every 20s. (2) Stripe is wired as a card fallback for diaspora buyers. (3) For agent flows, we mark `being_processed` and let `billpay-reconcile` resolve later — no double-charge, no lost payment.

**"Why React + Supabase instead of a Go backend?"**
> Started there, removed it on March 30. Edge Functions cover the same surface in less code and the RLS policies are the security backbone. Less infra to keep alive in a one-person team. The integration doc explains why the service-role-only update policy on `payments` is non-negotiable.

**"How do you test this without burning real EcoCash?"**
> Test numbers: `0771111111` success, `0772222222` delayed, `0773333333` cancel, `0774444444` insufficient. BillPay has prefix-based simulation per v1.33 spec — `AT*` auth-timeout, `PF*` pay-failure, `PFF*` flagged. All in `supabase/functions/billpay/index.ts` with comments matching the spec.

**"What would you do with another 6 weeks?"**
> Three things. (1) Apply for Paynow Core sandbox creds and wire the live diff comparison, so the benchmark proves the recommendation moves the number. (2) Add `link` and `livestock_id` columns to notifications and rewrite all 12 Edge Function insert sites — the same pattern we applied to `place_bid` today. (3) Push the Cloudflare relay open-source so other ZW devs hit by the same wall don't reinvent it.

**"What's the relay URL?"**
> `paynow-relay.zimlivestock.workers.dev` — Cloudflare free tier, my account. Happy to transfer to Paynow's account if you want to control the egress.

---

## Fallback plans

### Live Paynow refuses (rare)
Pivot:
> "Live demo just caught the exact failure mode the relay addresses — TCP RST from Paynow's bot wall. Here's what the simulator would have done." Show the simulator path in [`supabase/functions/initiate-payment/index.ts`](../../supabase/functions/initiate-payment/index.ts) and the ledger entry that records `live_paynow_blocked`.

### USSD doesn't arrive
- Check phone bars; flick airplane mode on/off.
- Check EcoCash wallet balance.
- Worst case: skip Act 2 live demo, show a 30-sec recording.

### Notifications don't fan out (Act 3)
The `place_bid` RPC always inserts. If the second-buyer browser doesn't show the bell pill within 5s:
1. Refresh that tab — the realtime subscription may have lost its session.
2. Manually trigger:
```bash
supabase db query --linked "select count(*) from notifications where created_at > now() - interval '1 minute' and user_id = '<second-buyer-id>';"
```
If count > 0, the issue is the realtime channel — refresh fixes it.

### Whole demo dies
Have these tabs pre-loaded as PDF screenshots:
- `/notifications` with the unread badge visible
- `/item/<id>` deep-linked from a notification
- BillPay AUTH→PAY wizard with token returned
- The integration doc opened to Section 8

---

## Hot keys / hot URLs

| What | Where |
|---|---|
| Local dev | `http://localhost:5173` |
| Notifications screen | `/notifications` |
| Agent dashboard | `/agents` |
| BillPay flow | `/pay-bill` |
| Won listings | `/my-listings` (Won tab) |
| Supabase SQL | dashboard.supabase.com/project/hmeieslclzycyjjjflfh/sql |
| CF Worker logs | dash.cloudflare.com → Workers → paynow-relay → Logs |
| Integration doc | [deliverables/week-6/paynow-supabase-integration.md](paynow-supabase-integration.md) |
| Retrospective | [deliverables/week-5/ecosystem-integration-retrospective.md](../week-5/ecosystem-integration-retrospective.md) |
| Slide deck | [deliverables/week-6/presentation-deck.md](presentation-deck.md) |

---

## Post-demo

- Send the integration doc + retrospective + benchmark report as a single tarball.
- If asked for a follow-up: offer a 30-min walk-through of the gotchas table with whoever takes the app over.
- Note any specific question the panel raised that the integration doc *doesn't* answer — those become the v2 additions.
- Save the demo recording and ledger screenshots into [`deliverables/week-6/`](.).
