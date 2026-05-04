# ZimLivestock × Paynow — Final Demo

**Date:** 2026-05-04
**Audience:** Paynow leadership + senior engineering team
**Runtime:** 8 min main + 5 min Q&A
**Reading time before stage:** ~6 minutes

---

## The problem

**Zimbabwe's livestock economy moves US$300m+ a year and almost none of it touches a digital rail.**

If you want to buy a cow today, here's what you do:

1. Take a kombi to a physical auction house — Mbare, Bulawayo Centenary, Gweru. Three hours each way if you live outside the city.
2. Stand in a pen for half a day until the animal you want comes up.
3. If you win, you pay **cash**. The seller writes a hand-receipt on a torn-out exercise book page.
4. You hire transport on the spot. The seller pays a 5–8% commission to the auction house. You pay another 2% "lot fee".
5. You don't know what the same animal sold for last week. The auctioneer does. The middleman does. You don't.

The opportunity cost compounds: a small farmer in Masvingo can't bid on a Hereford in Harare even if it's the right animal at the right price, because they can't physically be there. **The market doesn't clear** — it just clears *locally*, with whoever happened to walk in that morning.

### Why digital hasn't solved this

People have tried. WhatsApp groups, Facebook Marketplace, even three livestock listings sites. They all hit the same two walls:

1. **Payment trust.** "Pay first, then I send the goats" doesn't work between strangers, and there's no escrow rail in Zimbabwe that consumers trust the way they trust EcoCash.
2. **No agency for the buyer.** A farmer can't *delegate* a bid. They have to be physically present (or constantly watching their phone) to win. That's the same constraint as showing up to Mbare in person — just with a smaller seat.

### What modern commerce actually needs

If you've watched eBay or any major auction platform work, you know the missing piece: **agentic bidding**. You set a max price, a category preference, walk away. The system bids on your behalf. When you win, payment settles automatically.

In Zimbabwe that needs three things to work simultaneously:
- A digital marketplace people trust.
- A payment rail that handles micro-transactions instantly (EcoCash).
- An agent that can pay *without you tapping anything*.

The third one is where every previous attempt has died.

---

## Why our solution is the only one that fits

Three things, in order:

### 1. We picked the right rail — Paynow.

70% of Zimbabwean adults use EcoCash. Paynow is the only API that pushes USSD to an EcoCash subscriber and clears in 8–15 seconds. We didn't build a card processor. We didn't build crypto. We built on the rail people already use.

**Result:** Buyers don't learn anything new. The PIN prompt looks identical to paying for airtime.

### 2. We solved the agent-side egress block that nobody else had cracked.

Paynow Core's `interface/remotetransaction` endpoint sits behind Cloudflare bot protection. From a regular browser, fine. From a serverless backend (Supabase, Render, Railway, Vercel) — TCP RST. Every developer trying to do agent-initiated payments hits this wall.

We deployed a 70-line Cloudflare Worker that proxies the call. Because the Worker egresses through Cloudflare's own trusted network, the bot rules don't apply. Same signed request, same response, 400–800 ms round trip.

**Result:** the agent loop *closes*. Bid → win → push EcoCash → user types PIN → settled. Eight to fifteen seconds end-to-end.

### 3. We made every step auditable so finance and ops can sign off.

Every agent action lands in `agent_payment_orders` and `settlement_ledger`. Order created. Live Paynow accepted. Payment succeeded. Settlement complete. Four rows per win. Replay-able. Reconcilable. The kind of trail an auditor or a CFO will actually accept.

**Result:** you can deploy this in production tomorrow without writing a separate "what happened" service.

### What we are NOT claiming

- We're not replacing physical auctions overnight. Old farmers will still walk to Mbare. We're serving the next generation, the diaspora buyer, the small farmer in a rural district with a smartphone but no kombi fare.
- We're not the only payment app in Zimbabwe. We're the only *agent-native* one. That's a different category.

---

## The solution at a glance

```
Buyer (phone or browser)
    │
    ▼
ZimLivestock app  ──────────► Postgres + RLS  (auctions, bids, payments)
  React + Supabase                  │
    │                               │
    │  agent loop                   │
    ▼                               ▼
auction-sniper ──► place_bid ──► end-auctions ──► win-detector
                    (atomic)        (cron)         (cron)
                                                     │
                                                     ▼
                                          payment-orchestrator
                                                     │
                                                     ▼ (signed POST)
                                          Cloudflare Worker relay
                                                     │
                                                     ▼
                                            Paynow Core API
                                                     │
                                                     ▼
                                            EcoCash USSD push
                                                     │
                                                     ▼
                                              User PIN approves
                                                     │
                                                     ▼
                                       Webhook + settlement_ledger
```

Five Edge Functions, two atomic Postgres RPCs, one Cloudflare Worker. **No Go backend, no Kubernetes, no message queue.** Solo dev built it in 6 weeks.

---

## The demo (8 min, 6 acts)

### Act 1 — The shape of the problem (45s)

Open the homepage. Scroll the feed once.

> "Zimbabwe runs on EcoCash. Seventy percent of adult banking flows through it. So if you're building anything that needs to take money from a Zimbabwean buyer, you start with Paynow. ZimLivestock is a livestock auction app. The buyer wins, the buyer pays, the seller gets notified. That whole loop runs on Paynow."

Tap one active auction. Show the listing.

---

### Act 2 — Real EcoCash, real money (90s)

From the listing, tap **Bid Now**. Enter `0.05`. Submit.

App navigates to `/payment-status/<ref>`. Loading state.

**Hold the phone up.** USSD prompt arrives in 8–15 s. Type EcoCash PIN. Approve.

Screen flips to **Paid** in <20 s.

> "That was real EcoCash. Real Paynow Express Checkout. Five cents — but the protocol, the signing, the webhook, all real. The reason it flips green this fast isn't the webhook — it's a poll-sync hook on the browser that re-checks Paynow's status endpoint every 20 seconds. Belt and braces."

---

### Act 3 — Per-recipient deep links (90s) ← *new since April*

Switch to the second browser (incognito, signed in as a different test buyer who had also bid on this item).

Point at the green pill on "More" — it now reads `1`.

Tap **More → Notifications**. Tap the **You've been outbid!** row.

App routes to `/item/<id>`. Bid form already open, showing the new minimum.

> "Both the seller and the outbid buyer get a notification of type `bid`. They need different destinations — seller goes to their listings, buyer goes back to the item to re-bid. We solved it with a `link` column on the notifications table. The `place_bid` RPC populates it differently per recipient. One tap to fight back instead of three."

---

### Act 4 — BillPay, same merchant, different rail (75s)

Back to first browser. Tap **Pay Bills**.

Pick **ZETDC Prepaid Electricity**. Test meter `37132567431`. Amount `5`. Walk through AUTH → Confirm → PAY.

Token comes back. Receipt SMS toast.

> "Same Paynow merchant, different product family — this is BillPay Vendor API. Per spec v1.33, AUTH and PAY use the same Reference. The Edge Function generates it on AUTH, stores it in `bill_payments.reference`, and on PAY we look up the authorised row and send the same reference back. If we got this wrong — duplicate billing or rejected PAY. The database enforces it."

---

### Act 5 — The agents (90s)

Tap **Agents** in the nav.

Two cards: **Penny Sniper** (cattle/sheep, max $0.05) and **Boer Bargainer** (goats/pigs, max $0.05). Each has wins next to its name.

> "These ran overnight. Penny Sniper won 2 cattle auctions. Boer Bargainer won 2 goat auctions. Each agent decided independently whether to bid, placed the bid, watched the auction end, and pushed EcoCash to my phone. I typed my PIN. That's the full agentic-commerce loop — discovery, decision, execution, verification, payment, settlement. The only human input is the PIN, and that's an EcoCash security floor, not us."

If a phone buzzes mid-act because another seeded auction ended:

> "And here's another one settling, live."

Approve the PIN. Let it land.

---

### Act 6 — The handover + the ask (90s)

Open `deliverables/week-6/paynow-supabase-integration.md`. Scroll through it once.

> "Thirteen sections. Architecture, schema, hash signing, Express Checkout, Web Checkout, webhook, poll-sync, Cloudflare relay, BillPay AUTH/PAY, frontend hooks, gotchas, env vars, file index. Every snippet verbatim from current code with file-and-line citations. Your senior engineers can pick this app up tomorrow."

Pause on the gotchas table.

> "Ten things that bit us. Penny rounding, hash order, Technical Narration leaking to UI, double-submit duplication. Each has a one-line fix and the file it lives in."

Open `paynow-relay/src/index.js`.

> "Seventy lines. This shouldn't have to exist. Paynow Core's API rate-limits Supabase egress IPs because of Cloudflare bot rules. BillPay doesn't have that problem because it's on `billpay.paynow.co.zw` — a sub-host without the bot wall. BillPay integration took 90 minutes. Paynow Core took 3.5 hours plus this proxy. The recommendation in the retrospective is one line: do for Paynow Core what you already did for BillPay. One DNS change unblocks every Zimbabwean developer trying to build agent-native payments."

---

### Close (15s)

> "Working app. Senior-engineer integration doc. One infrastructure ask. Questions?"

---

## Anticipated Q&A

**"How does this scale beyond the demo?"**
Single-pod Supabase Edge Functions handle ~100 concurrent payment initiations on the free tier. Paynow Core is the bottleneck, not us — Express Checkout is sequential per phone number. Every state transition is idempotent and DB-keyed, so horizontal scale is just more pods.

**"What if Paynow goes down?"**
Three answers. (1) Webhook is best-effort — `payment-poll-sync` replays every 20s. (2) Stripe wired as a card fallback for diaspora buyers. (3) For agent flows, we mark `being_processed` and let `billpay-reconcile` resolve later. No double-charge.

**"Why React + Supabase, no Go backend?"**
Started with Go, removed it on March 30. Edge Functions cover the same surface in less code, RLS policies are the security backbone, and there's less infra to keep alive in a one-person team.

**"How do you test without burning real EcoCash?"**
Test numbers: `0771111111` success, `0772222222` delayed, `0773333333` cancel, `0774444444` insufficient. BillPay uses prefix-based simulation per v1.33 — `AT*` auth-timeout, `PF*` pay-failure, `PFF*` flagged. All in `supabase/functions/billpay/index.ts` with comments matching the spec.

**"What would you do with another 6 weeks?"**
Three things. (1) Apply for Paynow Core sandbox creds and prove the recommendation moves the number. (2) Add per-item deep links to all notification insert sites — same pattern we applied to `place_bid` today. (3) Push the Cloudflare relay open-source so other Zimbabwean devs hit by the same wall don't reinvent it.

**"What's the relay URL?"**
`paynow-relay.zimlivestock.workers.dev` — Cloudflare free tier, my account. Happy to transfer to Paynow's account if you want to control egress.

**"Is this a product or a thesis?"**
Both. The product solves the buyer problem. The thesis — the integration doc + the retrospective — solves Paynow's developer-experience problem. Either one is shippable on its own. Together they make the case that fixing the sub-host issue unblocks an entire category of Zimbabwean apps.

---

## If something breaks on stage

| Failure | What to say | What to do |
|---|---|---|
| USSD doesn't arrive | "Live demo just caught the bug the relay addresses." | Show the simulator path. Point at the `live_paynow_blocked` ledger row. Move on. |
| Notification doesn't fire on the second browser | Refresh that browser tab — realtime channel may have lost session. | If still nothing in 5s, skip to Act 4. |
| App freezes | "Refreshing — Vite HMR being temperamental." | Refresh. Don't apologise twice. |
| You forget your line | (silence is fine) | Point at the screen. Describe what's on it. The story sells itself. |
| Phone signal drops | "EcoCash needs the network — this is exactly why we built the poll-sync fallback." | Pivot to showing the poll-sync code. |

---

## Pre-stage checklist (T-15 min)

```bash
cd /Users/tatendanyemudzo/Downloads/app

# 1. Re-seed (already run — only re-run if needed for second showing)
# supabase db query --linked -f supabase/seeds/demo-final-auctions.sql

# 2. Relay alive
/usr/bin/curl https://paynow-relay.zimlivestock.workers.dev/health

# 3. Smoke fire one win to confirm USSD path works today
source .env.local
/usr/bin/curl -sS -X POST "https://hmeieslclzycyjjjflfh.supabase.co/functions/v1/win-detector" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -d '{"agentId":"<penny-sniper-uuid>"}'

# 4. Dev server with --host so phone-on-same-wifi can hit it
npm run dev -- --host
```

**Eyeball:**
- [ ] Two agent cards on `/agents` (Penny + Boer; Auction Sniper + Buyer Agent paused)
- [ ] 12 DEMO listings in feed (4 won, 8 ticking)
- [ ] Bell pill on "More" shows a number
- [ ] Phone has signal, EcoCash wallet > US$0.50
- [ ] Smoke fire produced a USSD push you approved successfully

---

## After the demo

- Tar up `deliverables/week-6/` and send: this script, the integration doc, the retrospective, the slide deck, the test-suite report.
- Save a recording of the demo into the same folder.
- Note any panel question that the integration doc *doesn't* answer — those become the v2 additions.
- If asked: yes, you can open-source the relay, and yes, you'd happily walk a junior through the gotchas table for an hour.
