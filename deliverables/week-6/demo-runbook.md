# Demo Runbook — Agent Autonomy + Paynow DX

**Audience:** Paynow supervisor + review panel
**Runtime:** 5–7 min (main) + 3 min Q&A buffer
**Date:** 2026-04-16

---

## One-liner

> *A buyer agent wins 10 penny auctions, settles each via EcoCash Express USSD — zero keyboard strokes between "won" and "paid". The twist: it only works because we routed around Cloudflare blocking Paynow Core from Supabase.*

---

## Pre-demo checklist (run ~10 min before)

```bash
cd /Users/tatendanyemudzo/Downloads/app

# 1. Reseed AGENT listings (3 pre-ended + 7 active staggered 2-14 min)
source .env.local
python3 -c "
import json, os, urllib.request
with open('supabase/seeds/demo-agent-auctions.sql') as f:
    sql = f.read()
req = urllib.request.Request(
    'https://api.supabase.com/v1/projects/hmeieslclzycyjjjflfh/database/query',
    data=json.dumps({'query': sql}).encode(),
    headers={'Authorization': f'Bearer {os.environ[\"SUPABASE_ACCESS_TOKEN\"]}', 'Content-Type': 'application/json', 'User-Agent': 'curl/8.4.0'},
    method='POST',
)
print(urllib.request.urlopen(req, timeout=60).read().decode())
"

# 2. Sanity-check relay is healthy
curl -sS -H 'User-Agent: Mozilla/5.0' https://paynow-relay.zimlivestock.workers.dev/health

# 3. Start dev server
npm run dev
```

**Confirm on screen:**
- 10 AGENT listings in feed (3 ending in the past labelled "won!", 7 labelled "ends Nm")
- Penny Sniper agent visible on Agent Dashboard
- Phone 0781497764 reachable (turn it on, unlocked, airplane mode OFF)

---

## Script (5 minutes)

### Act 1 — Setup the stakes (45s)

**Say.** "Zimbabwe has EcoCash mobile money — 70% of adults use it. But if you're building an agent that bids + pays autonomously, you hit a wall: Paynow Core's API is behind Cloudflare bot protection, which kills any request from a datacenter IP. Supabase Edge Functions, Render, Railway — all blocked."

**Show.** Navigate to `/my-listings` → Won tab. Point at the listings already showing `Agent · Hereford Heifer — won!` + `🤖 Penny Sniper` badge + `Paid` chip.

---

### Act 2 — The agent takes over (90s)

**Say.** "This is Penny Sniper — an agent I configured with a US$0.05 ceiling on livestock. It's already bid on 10 auctions. Three ended this morning; it won all three and settled via EcoCash Express Checkout pushed to my phone, no browser involved."

**Show.** Open Agent Dashboard → Penny Sniper card. Point at:
- `wins` counter (3, maybe climbing during demo)
- Activity log scrolling: `Won auction for "AGENT · Hereford Heifer" at US$0.01 — payment paid`
- Settlement entry: `EcoCash Express checkout initiated for US$0.01 on 0781497764`

**Optional live-fire.** If an active auction just ended during Act 1:

```bash
# Trigger win-detector manually (cron runs every 5 min; this demos "now")
curl -sS -X POST "https://hmeieslclzycyjjjflfh.supabase.co/functions/v1/end-auctions" \
  -H "Authorization: Bearer $CRON_SECRET"

curl -sS -X POST "https://hmeieslclzycyjjjflfh.supabase.co/functions/v1/win-detector" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -d '{"agentId":"3a136acb-3fd5-4a16-9c95-13842a457a81"}'
```

**USSD should arrive on the phone within 10–20s.** Hold it up. Approve. That's the money shot.

---

### Act 3 — The workaround (90s)

**Say.** "The autonomous loop only works because of this tiny piece of infra."

**Show.** Open `paynow-relay/src/index.js` in the editor.

**Say.** "70 lines of Cloudflare Worker. Accepts signed requests from Supabase, forwards them to Paynow. Because Workers egress through Cloudflare's own trusted network, the bot rules don't apply — the same request that dies with a TCP RST going direct, lands cleanly through this relay. Free tier, 100k requests a day, deploy time was under 20 minutes."

**Show.** `deliverables/week-5/ecosystem-integration-retrospective.md` — scroll to "Workarounds During Integration" table. Point at the side-by-side:

| Direct from Supabase | Via CF Worker relay |
|---|---|
| TCP RST | HTTP 200 |
| Fail fast | 400–800 ms |

**Say.** "This isn't a long-term answer. The long-term answer is recommendation #1 in this retrospective: move Paynow Core to its own subdomain without the bot wall, exactly like `billpay.paynow.co.zw` already does. BillPay was our reference — integrating it took 90 minutes. Paynow Core took 3.5 hours and we still had to build a proxy."

---

### Act 4 — The ledger (60s)

**Say.** "Every step is auditable. Here's the settlement ledger for the last agent win."

**Show.** Supabase dashboard → SQL editor, paste:
```sql
SELECT event, details->'phone' as phone, details->'poll_url' as poll_url, created_at
FROM settlement_ledger
WHERE payment_order_id IN (
  SELECT id FROM agent_payment_orders ORDER BY created_at DESC LIMIT 1
) ORDER BY created_at;
```

**Show the rows.** Point at:
- `order_created` → payer_phone captured
- `live_paynow_accepted` → real pollurl from Paynow, `network_blocked: false`
- `payment_succeeded` → reference `AG-xxxx-1`
- `settlement_complete`

**Say.** "Agent to bank in four ledger rows. Finance team can reconcile, ops can replay failures, and the whole thing fits in a Supabase dashboard."

---

### Act 5 — Close (15s)

**Say.** "So — two outcomes from 6 weeks: a working agent-native auction platform, and a benchmark that tells Paynow exactly which recommendations from their own BillPay team would unblock every other ZW developer trying to do this."

---

## Fallback plans

### If relay fails mid-demo
Ledger will show `live_paynow_blocked`. Pivot the story:
> *"Live demo caught the exact bug the workaround addresses. In production we'd retry or fall back to the simulator — here's what the simulator would've done."*
Point at the `payment_succeeded` row (simulator fallback fires automatically).

### If USSD doesn't arrive
- Check phone signal bars
- Check EcoCash wallet balance (needs > US$0.01)
- Ask audience: "Show of hands, anyone else's EcoCash push miss occasionally?" (it's not rare in ZW — turn it into a point about why the retry chain matters)

### If wins don't trigger
```bash
# Force-end the next auction
source .env.local
curl -sS -X POST "https://api.supabase.com/v1/projects/hmeieslclzycyjjjflfh/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" -H "User-Agent: curl/8.4.0" \
  --data-binary "{\"query\": \"UPDATE livestock_items SET status='ended', end_time = NOW() - interval '1 second' WHERE status='active' AND title LIKE 'AGENT · %' ORDER BY end_time LIMIT 1 RETURNING title, current_bid;\"}"
```

Then re-fire win-detector.

### If the whole app is down
Have `deliverables/week-6/presentation-deck.md` + ledger screenshots on hand. The retrospective doc carries the story without the live flow.

---

## Hot keys

| What | Where |
|---|---|
| Agent Dashboard | `/agents` |
| My Listings → Won | `/my-listings` (Won tab) |
| Supabase SQL editor | dashboard.supabase.com/project/hmeieslclzycyjjjflfh/sql |
| CF Worker logs | dash.cloudflare.com → Workers → paynow-relay → Logs |
| Retrospective doc | `deliverables/week-5/ecosystem-integration-retrospective.md` |

---

## Post-demo

- Paste the ledger screenshot into the retrospective's "Verified live" section
- If supervisor asks for the relay URL: `paynow-relay.zimlivestock.workers.dev` (free-tier, my account)
- Offer to open-source the relay if other Paynow integrators hit the same wall
