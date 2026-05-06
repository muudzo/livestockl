# Final Demo Script — ZimLivestock × Paynow

**Audience:** Paynow leadership + senior engineering team
**Runtime:** ~10 min main + 5 min Q&A
**Date / slot:** 2026-05-06, 12:30 CAT
**Predecessor doc:** [`demo-runbook.md`](demo-runbook.md) (April 16, internal review). This script supersedes the May 4 v1 — adds the live SMS moment, the txt.co.zw static-IP relay story, and the spec-fix shipped this morning.

---

## One-liner

> *Three deliverables: (1) a working agent-native auction app on Supabase with EcoCash Express, BillPay, and Stripe wired in; (2) a live txt.co.zw SMS chain that fires end-of-auction notifications from a residential static IP because Paynow's IP-whitelist gate is unsolvable from cloud egress; (3) an integration playbook senior engineers can hand to the next vendor — including the two infrastructure workarounds that should not exist.*

---

## What's new since the May 4 v1 of this script

| | May 4 v1 | Today (May 6, 12:30 slot) |
|---|---|---|
| Live SMS at end of auction | Not in scope | Mac-mini-relayed txt.co.zw → real handset |
| End-auctions reliability | Manual fire | `pg_cron` every minute, vault-stored secret |
| Webhook spec coverage | `Paid` / `Delivered` only | + `AwaitingDelivery` (shipped 09:00 today after Paynow review) |
| Senior-engineer doc | 13 sections, ASCII diagrams | Mermaid sequence diagrams + Shortcomings & Areas of Improvement (P1–P10, Z1–Z6) |
| txt.co.zw integration | Roadmap | Live, KYC'd, IP-whitelisted, $1.78 balance |
| Demo seed | 10 staggered, manual settle | 4 pre-bid auctions ending 12:35/40/45/50, cron-settled, phone-routed |

If a returning attendee asks "what's actually different" — those six rows.

---

## Pre-demo (T-30 min, 12:00 CAT)

```bash
cd /Users/tatendanyemudzo/Downloads/app
set -a && source .env.local && set +a

# 1. Cloudflared tunnel up (Mac mini, txt.co.zw relay) — must be reachable
/usr/bin/curl -sS https://replica-industry-haven-supplier.trycloudflare.com/ | head -1

# 2. Cron has fired in the last 2 minutes
python3 - <<'PY'
import json, os, urllib.request
req = urllib.request.Request(
    'https://api.supabase.com/v1/projects/hmeieslclzycyjjjflfh/database/query',
    data=json.dumps({'query': "SELECT start_time AT TIME ZONE 'Africa/Harare' AS t, status FROM cron.job_run_details WHERE jobid=(SELECT jobid FROM cron.job WHERE jobname='end-expired-auctions') ORDER BY start_time DESC LIMIT 3;"}).encode(),
    headers={'Authorization': f'Bearer {os.environ["SUPABASE_ACCESS_TOKEN"]}', 'Content-Type': 'application/json', 'User-Agent': 'curl/8.4.0'},
    method='POST',
)
print(urllib.request.urlopen(req, timeout=30).read().decode())
PY

# 3. Demo seed intact: 4 auctions, ending 12:35–12:50
python3 - <<'PY'
import json, os, urllib.request
req = urllib.request.Request(
    'https://api.supabase.com/v1/projects/hmeieslclzycyjjjflfh/database/query',
    data=json.dumps({'query': "SELECT title, end_time AT TIME ZONE 'Africa/Harare' AS ends FROM public.livestock_items WHERE title LIKE 'DEMO%' ORDER BY end_time;"}).encode(),
    headers={'Authorization': f'Bearer {os.environ["SUPABASE_ACCESS_TOKEN"]}', 'Content-Type': 'application/json', 'User-Agent': 'curl/8.4.0'},
    method='POST',
)
print(urllib.request.urlopen(req, timeout=30).read().decode())
PY

# 4. Cloudflare relay healthy (Paynow Core path)
/usr/bin/curl -sS -H 'User-Agent: Mozilla/5.0' https://paynow-relay.zimlivestock.workers.dev/health

# 5. Dev server (--host so phone on same wifi can hit it if needed)
npm run dev -- --host
```

**Eyeball before going on:**
- 4 DEMO listings in the feed, all ending 12:35–12:50 CAT, all `current_bid = $0.05`
- Phone (0781497764) unlocked, on data, charged, **silent off / vibrate on** so the SMS is audible
- Second incognito window logged in as `Test` user (the pre-bidder) — outbid demo
- `paynow-relay` health = `ok`
- Cloudflared tunnel returning HTTP 200 (not 530)
- Cron last 3 ticks `succeeded`

If any of those fail, jump to the fallbacks section before going live.

---

## Script (~10 min)

### Act 1 — The shape of the problem (60s)

**Say.**
> "Zimbabwe runs on EcoCash. Seventy-percent of adult banking flows through it. So if you're building anything that needs to take payment from a Zimbabwean buyer, you go to Paynow first. ZimLivestock is a livestock auction app. The buyer wins, the buyer pays, the seller gets notified. That entire loop runs on Paynow products — Express Checkout for the bid payment, BillPay for the *next* thing the seller does with the cash, and txt.co.zw for the SMS that closes the loop."

**Show.** Home feed. Scroll once. Tap **DEMO · Brahman Bull — ends 12:35**.

**Say.**
> "What I'm walking you through is three things. One — what the app does end-to-end. Two — what we learned integrating Paynow against a serverless backend, and what I wrote down for your senior engineers. Three — two infrastructure workarounds we built that I'm hoping you can make obsolete."

---

### Act 2 — Live bid via real Paynow Express (120s)

**Setup.** You're logged in as `TATENDA`. The Brahman Bull is at $0.05 (Test user's pre-bid). Auction ends 12:35.

**Say.**
> "Real EcoCash payment. Not a simulator. I bid 6 cents on this Brahman Bull, the wallet prompts me, I approve."

**Show.**
1. From `/item/<brahman-bull-id>`, tap **Bid Now**.
2. Enter `0.06` (penny ceiling — keeps demo cheap and proves the no-minimum-bid path).
3. Watch the app navigate to `/payment-status/<ref>`.
4. **Hold the phone up.** USSD prompt arrives in 8–15s.
5. Approve `*151#` on phone.
6. Web UI flips to **Paid** in <20s — the poll-sync hook detects state before the webhook even arrives.

**Say while waiting for USSD.**
> "Three independent paths have to fail before this user sees an error: webhook on resulturl, poll-sync from the browser every 20 seconds, and a Cloudflare Worker relay for when Paynow's bot wall blocks Supabase egress directly. Any one recovers. We come back to that in Act 6."

**Say after Paid.**
> "I'm now the high bidder. Auction ends in three minutes. While we wait, two more things to show."

---

### Act 3 — Outbid → re-bid loop, 1 tap (75s)

**Setup.** Have the second incognito window pre-loaded as `Test` user. Bell pill on More currently `0`.

**Say.**
> "When my bid landed two seconds ago, the place_bid RPC fanned out notifications. Seller gets *new bid on your listing*. Test — the previous high bidder — gets *you've been outbid*. Both rows have type='bid' but they need to land in different places, because the seller wants to see their listings and the outbid buyer wants to bid again."

**Show.**
1. Switch to second browser. Bell pill on More now reads `1`.
2. Tap **More → Notifications**.
3. The "You've been outbid!" row is highlighted — tap it.
4. App routes to `/item/<brahman-bull-id>` — same listing, bid form already showing the new minimum.

**Say.**
> "One tap to re-bid. The destination came from a `link` column on notifications — place_bid populates it differently for sellers versus outbid bidders. Same notification type, different deep link per recipient."

**Don't re-bid as Test.** Leave TATENDA winning. The 12:35 settlement needs to fire winner SMS to TATENDA's phone.

---

### Act 4 — BillPay, agent autonomy (90s)

**Say.**
> "Same merchant identity, different Paynow product. BillPay."

**Show.**
1. Home feed → **Pay Bills** (Services hero card or `/pay-bill`).
2. Pick **ZETDC Prepaid Electricity**.
3. Enter test meter `37132567431` (single-debt token per v1.33 spec).
4. Amount `US$5`.
5. Walk through the AUTH → confirm → PAY wizard.
6. Token returned, receipt SMS sent (point at the toast).

**Say while the AUTH spinner is up.**
> "AUTH and PAY use the same Reference. Spec rule. The Edge Function generates it on AUTH, stores it in `bill_payments.reference`, and on PAY we look up the authorized row and send the same reference back. Get it wrong — duplicate billing or rejected PAY. The DB enforces it."

**Pause for tokens.**
> "ZETDC returned the token. If it had returned multiple — which it does for split-debt accounts — we send every voucher SMS to the customer because the spec mandates it. That's in the senior-engineer doc."

---

### Act 5 — **The phone buzzes.** Live SMS at end-of-auction (45s) ← **NEW**

**This act is opportunistic.** It fires when the 12:35 cron tick settles the Brahman Bull and the txt.co.zw chain delivers the winner SMS to 0781497764 — usually 12:35:30–12:36:00 CAT. **If the phone buzzes mid-Act-4, pause Act 4 and pivot here. If not, this is its own beat after Act 4.**

**Show.** Pick up the phone. Read the SMS aloud:
> *"You won 'DEMO · Brahman Bull — ends 12:35' for US\$0.06! Pay now at zimlivestock.co.zw to complete your purchase."*

**Say.**
> "That just landed. Three things had to chain — Postgres pg_cron fires every minute, calls a Supabase Edge Function with a vault-stored bearer, the function joins on the winning bid, sends the SMS through txt.co.zw. The txt.co.zw piece is the punchline of Act 7."

**If multiple SMS land** (2nd auction settles): show one, mention the others.

**If no SMS by 12:37:** check fallbacks. Don't dwell — keep moving.

---

### Act 6 — The handover doc (90s)

**Say.**
> "I want your senior engineers to be able to use what I built. So I wrote them this."

**Show.** Open [`deliverables/week-6/paynow-supabase-integration.md`](paynow-supabase-integration.md). Scroll once.

**Say, pointing at the structure.**
> "Fourteen sections. Architecture with a sequence diagram you can paste into Lucid, schema, hash signing, Express Checkout, Web Checkout, webhook receiver with the full status taxonomy, poll-sync fallback, the Cloudflare workaround with the why, BillPay as a separate doc, the gotchas table, and — the section you specifically asked for — Shortcomings & Areas of Improvement. Ten Paynow-API gaps and six on our side, with a two-week roadmap."

**Pause on §6.1.**
> "One concrete change shipped this morning, 09:00, in response to your spec review: `AwaitingDelivery` is now a terminal-success branch in webhook and poll-sync. Was three lines. Caught because you asked the right question yesterday."

**Pause on §12 (Shortcomings).**
> "P1 — the Cloudflare bot wall on www.paynow.co.zw. P3 — the AwaitingDelivery semantics we just fixed. P4 — no idempotency-key header. The doc isn't a celebration of what works, it's an audit. Take it home."

---

### Act 7 — The infrastructure ask (90s)

**Say.**
> "Two things in this doc shouldn't have to exist."

**Show.** Scroll to §8 (Cloudflare egress workaround). Open [`paynow-relay/src/index.js`](../../paynow-relay/src/index.js).

**Say.**
> "70 lines of Cloudflare Worker. It exists because Paynow Core's API rate-limits or blocks Supabase Edge Function egress IPs — same /16s as every cloud abuser. Symptom is TCP RST mid-handshake. Without this Worker, the autonomous payment loop dies silently. With it — clean 200, 400-800ms round trip."

**Show.** Open the txt.co.zw integration doc [`txt-supabase-integration.md`](txt-supabase-integration.md). Scroll to the diagnostic cookbook.

**Say, slower.**
> "Same shape, different Paynow product. txt.co.zw wouldn't accept calls from Supabase IPs because the account has IP whitelist enforcement. So that SMS you saw on my phone — it was sent from a Mac mini sitting on my desk in Mt Pleasant, on a residential ISP, fronted by a free Cloudflare Quick Tunnel. The static-IP requirement isn't lift-able, so we worked around it from the field."

**Show.** Open the Research Investigation [`research-investigation.md`](research-investigation.md). Scroll to §6.1 — the proposed `api.paynow.co.zw` subdomain diagram.

**Say.**
> "BillPay is on `billpay.paynow.co.zw` — sub-host, no bot wall, integrated direct from Edge in 90 minutes. Paynow Core is on `www.paynow.co.zw` — bot wall, three and a half hours plus a Worker proxy. The recommendation is one line: do for Core what you already did for BillPay. Every ZW developer trying to build agentic payments hits this same wall. You can unblock all of them in one DNS change. The same architectural move would let txt.co.zw drop the IP whitelist or move it to a separate provisioned tier instead of a permanent gate."

---

### Act 8 — Close (45s)

**Say.**
> "What I'm leaving with you. A working app — bidding, payment, settlement, SMS. A senior-engineer integration doc with shortcomings and a roadmap, not a celebration. A txt.co.zw integration doc with the four diagnostic gates a future integrator will hit. A research investigation that argues for a single architectural change you've already proven works on a sister product. And a benchmark report comparing Paynow against four other African payment providers. Where I'd put effort first: Paynow Core sub-host migration, idempotency-key header, sandbox without an integration request. Every one of those is in the doc."

> "Questions?"

---

## Q&A — anticipated questions, prepared answers

**"Why did you use Mermaid for the diagrams instead of draw.io?"**
> Source-controlled, renders inline in GitHub, doesn't drift from the code it documents. The Mermaid source pastes directly into mermaid.live, draw.io, or Lucid for PNG export. Best of both — review-able in Git, exportable for slides.

**"How does this scale beyond the demo?"**
> Single-pod Supabase Edge Functions handle ~100 concurrent payment initiations on the free tier. Paynow Core is the bottleneck not us — Express Checkout is sequential per phone number. The architecture in the integration doc supports horizontal scale because every state transition is idempotent and DB-keyed. SMS dispatch is parallel via Promise.allSettled — verified live this morning when end-auctions fired 8 SMS in one cron tick without exceeding the Edge Function CPU budget.

**"What if Paynow goes down?"**
> Three answers. (1) Webhook is best-effort — poll-sync replays every 20s. (2) Stripe is wired as a card fallback for diaspora buyers. (3) For agent flows, we mark `being_processed` and let `billpay-reconcile` resolve later — no double-charge, no lost payment.

**"What if txt.co.zw goes down?"**
> SMS is fire-and-forget, never blocks settlement. End-auctions logs the failure, the user's notification still lands in-app, and the bid still settles. Worst case: silent SMS, never silent payment.

**"Why React + Supabase instead of Go?"**
> Started there, removed it on March 30. Edge Functions cover the same surface in less code; RLS is the security backbone. Less infra to keep alive in a one-person team.

**"How do you test this without burning real EcoCash?"**
> Test numbers: `0771111111` success, `0772222222` delayed, `0773333333` cancel, `0774444444` insufficient. BillPay has prefix-based simulation per v1.33 spec — `AT*` auth-timeout, `PF*` pay-failure, `PFF*` flagged. txt.co.zw has a simulation mode when `TXT_USERNAME`/`TXT_PASSWORD` are unset.

**"What would you do with another 6 weeks?"**
> Three things. (1) Apply for a Paynow Core sandbox without the integration-request gate, wire the live diff against the relay version, prove the bot-wall recommendation moves the latency number. (2) Idempotency-key header on Paynow Core — co-author the spec change. (3) Open-source the Cloudflare relay + Mac mini txt relay so other ZW devs hit by these walls don't reinvent both.

**"What's the relay URL?"**
> Two: `paynow-relay.zimlivestock.workers.dev` for Paynow Core (Cloudflare Worker), and `replica-industry-haven-supplier.trycloudflare.com` for txt.co.zw (Cloudflare Quick Tunnel pointing at Mac mini). Happy to transfer either to Paynow's account if you want to control the egress.

**"You shipped a fix this morning — what was the change?"**
> Three lines in `payment-webhook/index.ts` and `payment-poll-sync/index.ts`. Per spec, `AwaitingDelivery` means funds settled to merchant wallet — the delivery flag is for physical-goods merchants on a 24h auto-confirm. For digital settlement it should be terminal-success. Was previously falling through to non-terminal pending. Caught in your spec review yesterday, shipped 09:00 today, deployed to production.

---

## Fallback plans

### Live Paynow Express refuses (rare, ~1 in 30 attempts)
Pivot:
> "Live demo just caught the exact failure mode the relay addresses — TCP RST from Paynow's bot wall." Show the simulator path in [`supabase/functions/initiate-payment/index.ts`](../../supabase/functions/initiate-payment/index.ts) and the ledger entry that records `live_paynow_blocked`. Then continue Act 3 onwards with no live payment loss.

### USSD doesn't arrive
- Check phone bars; flick airplane mode on/off.
- Check EcoCash wallet balance.
- Worst case: skip Act 2 live demo, show 30-sec recording, jump to Act 3.

### SMS doesn't land at 12:35:30 (Act 5)
Diagnostic order, fastest first:
1. **Tunnel down.** Hit `https://replica-industry-haven-supplier.trycloudflare.com/` — if 530, the Mac mini's tunnel dropped. Restart on the Mac (`./start.sh` in `~/paynow-txt-relay/`). Skip Act 5, mention "tunnel was up an hour ago, would have shown you the SMS".
2. **Cron didn't fire.** Hit the Supabase SQL editor: `SELECT status, return_message FROM cron.job_run_details WHERE jobid=(SELECT jobid FROM cron.job WHERE jobname='end-expired-auctions') ORDER BY start_time DESC LIMIT 3;`. If status='failed', vault.cron_secret regressed.
3. **txt.co.zw balance.** `curl https://replica-industry-haven-supplier.trycloudflare.com/balance`. If `0`, top up before next auction.
4. **End-auctions saw no winner.** Check that the bid landed: `SELECT * FROM bids WHERE livestock_id=<brahman-bull-id> AND user_id=<TATENDA-id>`. If empty, the Express payment race lost — pivot to manual bid via the SQL editor.

### Notifications don't fan out (Act 3)
- Refresh the second browser tab — realtime subscription may have lost session.
- Manual check: `SELECT count(*) FROM notifications WHERE created_at > now() - interval '2 minute' AND user_id = '<test-user-id>';`. If > 0, refresh fixes the UI; if 0, place_bid trigger regressed.

### Whole demo dies
PDF tabs pre-loaded:
- `/notifications` with the unread badge visible
- `/item/<id>` deep-linked from a notification
- BillPay AUTH→PAY wizard with token returned
- Integration doc opened to §1 (Mermaid sequence) and §12 (Shortcomings)
- Screenshot of phone with the winner SMS — taken this morning when end-auctions fired against the previous demo seed

---

## Hot keys / hot URLs

| What | Where |
|---|---|
| Local dev | `http://localhost:5173` |
| Notifications screen | `/notifications` |
| Agent dashboard | `/agents` |
| BillPay flow | `/pay-bill` |
| Won listings | `/my-listings` (Won tab) |
| Brahman Bull (Act 2) | `/item/bd5e10c0-13c1-421b-8abf-efdd30771d36` |
| Angus Calf (12:40 backup) | `/item/f88662f1-4885-424e-99bb-03d046d98665` |
| Boer Goat (12:45 backup) | `/item/9520e28f-bb2a-407b-a8a8-4bb4e1f6a17f` |
| Boer Kid (12:50 backup) | `/item/9cd3395f-03b6-4023-a503-2c30e5ab89de` |
| Supabase SQL | dashboard.supabase.com/project/hmeieslclzycyjjjflfh/sql |
| Cron health | `SELECT * FROM cron.job_run_details WHERE jobid=(SELECT jobid FROM cron.job WHERE jobname='end-expired-auctions') ORDER BY start_time DESC LIMIT 5;` |
| CF Worker logs | dash.cloudflare.com → Workers → paynow-relay → Logs |
| Mac mini relay | https://replica-industry-haven-supplier.trycloudflare.com/ |
| Integration doc | [paynow-supabase-integration.md](paynow-supabase-integration.md) |
| BillPay standalone | [billpay-supabase-integration.md](billpay-supabase-integration.md) |
| txt.co.zw standalone | [txt-supabase-integration.md](txt-supabase-integration.md) |
| Research investigation | [research-investigation.md](research-investigation.md) |
| Slide deck | [presentation-deck.md](presentation-deck.md) |

---

## Phone routing reference (for fallbacks)

| Phone | Recipients | SMS that lands |
|---|---|---|
| `0773819300` | 5 demo seller profiles (Chiedza, Farai, Rumbidzai, Tendai, Tapiwa) | "Your auction sold for US\$X" |
| `0781497764` | 3 demo buyer profiles (TATENDA, Test, tate) | "You won 'X' for US\$Y" |

If you're winning, the **winner SMS** lands on `0781497764` (your phone). The **sold SMS** for the same auction lands on `0773819300` (the seller's phone, which is also you — different SIM or just a notification you can ignore for the demo).

---

## Post-demo

- Send the integration doc + txt + BillPay + research investigation + benchmark report as a single tarball.
- If asked for a follow-up: offer a 30-min walk-through of §12 (Shortcomings) with whoever takes ownership.
- Note any specific question the panel raised that the doc *doesn't* answer — those become P11+ entries.
- Save the demo recording, ledger screenshots, and phone-screen photo of the SMS into [`deliverables/week-6/`](.).
- If the SMS landed live, screenshot the cron.job_run_details row for that minute — proves the chain end-to-end for the post-demo report.
