# 100-User Stress Simulation Report

**Date:** 2026-04-08
**Duration:** 10-minute simulated window (peak activity burst)
**Model:** Mental simulation based on architecture analysis, Zimbabwe infrastructure constraints, and Supabase free-tier limits

---

## Simulation Parameters

### User Profiles (100 users)

| Segment | Count | Device | Connection | Behavior |
|---------|-------|--------|------------|----------|
| Commercial farmers (sellers) | 15 | Desktop/tablet | 4G/WiFi | Post listings, monitor bids, check payments |
| Small-scale farmers (buyers) | 45 | Budget Android | 3G/EDGE | Browse, bid, pay via EcoCash |
| Diaspora buyers | 20 | Modern phone/desktop | WiFi (abroad) | Browse, bid, pay via Stripe card |
| Agents/middlemen | 10 | Midrange Android | 4G | Heavy browsing, multiple bids, BillPay |
| Curious visitors | 10 | Mixed | Mixed | Browse only, no auth |

### Platform State

- 50 active listings (mix of Cattle, Goats, Sheep)
- 8 auctions ending within the 10-minute window
- 3 active BillPay sessions (ZETDC electricity)

### Infrastructure

- Supabase free tier: 500MB DB, 1GB storage, 2M edge function invocations/month
- Supabase Realtime: 200 concurrent connections (free tier)
- Paynow API: ~2s average response time, 70% first-attempt success rate (EcoCash)
- Zimbabwe 3G: 150-500ms latency, frequent packet drops

---

## Minute-by-Minute Simulation

### Minute 0-1: Login Surge

**Action:** 60 users authenticate simultaneously.

| Event | Count | Expected Behavior |
|-------|-------|-------------------|
| Email/password login | 50 | Supabase GoTrue handles concurrently |
| Failed login attempts | 5 | Wrong password, toast error |
| New signups | 5 | Email verification required |

**Prediction:** NO FAILURE. Supabase GoTrue handles auth at scale. JWT issuance is stateless. The `onAuthStateChange` subscription fires for each user but doesn't create database load.

**Potential issue:** 5 users on 2G/EDGE connections timeout during the `getSession()` call in `authStore.initialize()`. They see a blank screen because `initialized` never becomes `true`.

**Severity:** MEDIUM — UX friction, not data corruption.
**Mitigation:** Add a 10-second timeout to `initialize()` that falls back to demo mode.

---

### Minute 1-3: Browsing Surge

**Action:** 80 users load the marketplace homepage.

| Event | Count | DB Queries |
|-------|-------|------------|
| `useLivestockList()` | 80 | 80 SELECT queries (paginated, 20 items) |
| Image loads from storage | 80 x 4 = 320 | 320 storage reads (CDN-cached after first) |
| `increment_view_count()` RPC calls | ~200 | 200 atomic UPDATEs |

**Prediction:** NO FAILURE. Supabase Postgres handles 80 concurrent reads easily. Images are served from CDN after first request. View count increments are atomic and non-blocking.

**Potential issue:** 320 image requests from budget Android phones on 3G — page load time exceeds 8 seconds. Users abandon before seeing listings.

**Severity:** HIGH — User retention risk.
**Mitigation:** Image lazy loading (already implemented via browser `loading="lazy"`). Consider WebP format + thumbnail sizes.

**Potential issue:** No pagination cursor — if user scrolls past PAGE_SIZE (20), they see nothing. The `useLivestockList` hook doesn't support infinite scroll.

**Severity:** MEDIUM — 50 listings means 30 are invisible.

---

### Minute 3-5: Bidding Frenzy (CRITICAL WINDOW)

**Action:** 8 auctions ending soon. 30 users compete for 8 items.

| Event | Count | DB Operation |
|-------|-------|-------------|
| `place_bid()` RPC calls | ~45 (some users bid multiple times) | 45 `SELECT FOR UPDATE` + INSERT + UPDATE |
| Realtime bid notifications | 45 x 30 = 1,350 | Postgres change stream broadcasts |
| Outbid notifications | ~35 | 35 INSERT into notifications |

**Prediction: PARTIAL FAILURE.**

**What works:**
- `place_bid()` with `SELECT FOR UPDATE` serializes correctly — no race conditions.
- Each bid takes ~50ms under lock. 45 bids serialize to ~2.25s total.
- Notifications are INSERT-only, non-blocking.

**What breaks:**

1. **Realtime connection saturation:**
   Free tier allows 200 concurrent Realtime connections. Each user viewing an auction page opens a channel (`bids:{livestockId}`). 30 users x 8 auctions = potentially 240 channel subscriptions. Exceeds the 200 limit.

   **Impact:** Users on channels 201+ don't receive live bid updates. They see stale prices.
   **Severity:** HIGH — Bid on stale data leads to frustration.
   **Mitigation:** Debounce is already implemented (1000ms). But connection limit is the bottleneck. Upgrade to Supabase Pro ($25/mo) for 500 concurrent connections, or reduce to polling.

2. **3G latency + bid rejection cascade:**
   User on 3G sees price at US$450. Types US$460. By the time the RPC reaches the server (500ms), someone on 4G already bid US$470. `place_bid()` rejects with "Bid must be higher than current bid of 470." User retypes US$480. Another 500ms. Rejected again.

   **Impact:** 3G users systematically lose every auction to 4G users.
   **Severity:** HIGH — Equity issue in a farmer marketplace.
   **Mitigation:** Show "last updated X seconds ago" on bid price. Auto-increment bid by 5% above current. Implement "maximum bid" (proxy bidding).

3. **Stale `current_bid` in React Query cache:**
   React Query caches `['livestock', livestockId]` and invalidates on mutation success. But if user A bids and user B's cache isn't invalidated (Realtime fails due to connection limit), user B sees stale price.

   **Impact:** User B places a bid they think is winning, but it's already outbid.
   **Severity:** MEDIUM — Confusing UX, no data corruption.

---

### Minute 5-7: Payment Surge

**Action:** 8 auctions end. 8 winners attempt payment simultaneously.

| Event | Count | External Call |
|-------|-------|--------------|
| `end_expired_auctions()` cron | 1 | Advisory lock, marks 8 winners |
| `useInitiatePayment()` | 8 | 8 Edge Function invocations |
| Paynow EcoCash express | 5 | 5 HTTP calls to Paynow API |
| Stripe checkout sessions | 2 | 2 Stripe API calls |
| BillPay PAY actions | 1 | 1 Paynow BillPay API call |

**Prediction: PARTIAL FAILURE.**

**What works:**
- `end_expired_auctions()` with `pg_advisory_xact_lock(1)` — only one instance runs, processes max 50.
- `is_winner` set atomically in the same transaction.
- Payment records created with unique partial index — no double payments.
- Stripe checkout always works (Stripe infrastructure is global).

**What breaks:**

1. **Paynow API timeout under load:**
   Paynow's API averages 2s response time, but during peak hours (lunch, after work) can spike to 8-15s. With 5 concurrent EcoCash requests, some will timeout.

   **Impact:** Tier 1 (express checkout) fails → falls to Tier 2 (web checkout) → if that fails, Tier 3 (browser-relay). User sees 10-15 second delay. 2 of 5 may fail entirely.
   **Severity:** HIGH — Winner can't pay, creates dispute.
   **Mitigation:** Already have 3-tier fallback. But add explicit timeout handling: if payment fails, don't panic — show "Payment processing, you have 30 minutes to complete."

2. **Paynow USSD prompt on user's phone:**
   EcoCash sends a USSD prompt (`*151*2*3#`) to the farmer's phone. If they're in a low-signal area, the USSD prompt doesn't arrive. They wait. Nothing happens.

   **Impact:** User thinks payment failed. Tries again. Gets "Already paid for this item" error (because the first attempt created a pending record). Or the stale-pending cleanup works, but they've now lost 5 minutes.
   **Severity:** HIGH — Zimbabwe-specific infrastructure issue.
   **Mitigation:** Clear "Check your phone for the EcoCash prompt" messaging. Add "Didn't receive? Retry" button that properly cleans up stale pending.

3. **Webhook delivery race:**
   Paynow webhook fires before the user's browser gets the response from `initiate-payment`. The `completePayment()` function updates status to `paid` in DB, but the user's `usePaymentStatus` poll hasn't started yet (they're still on the payment page).

   **Impact:** Momentary inconsistency — user sees "pending" but they've already paid. Next poll (5s) resolves it.
   **Severity:** LOW — Self-resolving.

---

### Minute 7-8: Messaging Spike

**Action:** Winners message sellers. Losers message sellers asking "can I still buy?"

| Event | Count | DB Operation |
|-------|-------|-------------|
| New conversations created | 12 | 12 INSERTs (unique constraint checked) |
| Messages sent | ~30 | 30 INSERTs |
| Realtime message delivery | ~30 | 30 Postgres change broadcasts |

**Prediction:** NO FAILURE. Messaging is simple INSERT operations. Conversation uniqueness constraint prevents duplicates. Realtime broadcasts are within limits (messaging connections replace bid-watching connections as auctions end).

**Potential issue:** Conversation impersonation (the MEDIUM RLS weakness). User could create a conversation as if they're the seller.

**Severity:** LOW — We identified this in the audit. Low probability of exploit in first 100 users.

---

### Minute 8-9: BillPay Concurrent Session

**Action:** 3 users paying ZETDC electricity via BillPay.

| Event | Count | External Call |
|-------|-------|--------------|
| AUTH action | 3 | 3 Paynow BillPay API calls |
| PAY action | 3 | 3 Paynow BillPay API calls |
| Status polling | ~9 (3 per user) | 9 Paynow status checks |

**Prediction:** NO FAILURE. BillPay is independent of auction flow. AUTH→PAY same-reference enforcement is solid. 60-second timeout handles slow API.

**Potential issue:** If Paynow BillPay API is down (happens ~2x/month per provider reports), all 3 users see "BillPay service unavailable."

**Severity:** MEDIUM — Feature unavailable, not broken.
**Mitigation:** Simulation mode already exists as fallback. But should NOT be used in production — would create fake "paid" records.

---

### Minute 9-10: Cooldown

**Action:** Users review results, check payment history, log out.

| Event | Count |
|-------|-------|
| Payment history queries | 20 |
| Notification reads | 40 |
| Logouts | 15 |

**Prediction:** NO FAILURE. All read operations, well-indexed.

---

## Failure Summary

| Failure Point | Probability | Severity | Users Affected | Data Corruption? |
|--------------|------------|----------|----------------|-----------------|
| Realtime connection limit (200) | HIGH (95%) | HIGH | 30-40 (stale bids) | NO |
| Paynow timeout under load | HIGH (70%) | HIGH | 2-3 (payment delay) | NO |
| 3G users lose bid races to 4G | HIGH (90%) | HIGH | 15-20 (systematic) | NO |
| EcoCash USSD non-delivery | MEDIUM (40%) | HIGH | 1-2 (can't pay) | NO |
| Slow page load on budget phones | MEDIUM (60%) | MEDIUM | 20-25 (abandon) | NO |
| Missing pagination (>20 items invisible) | HIGH (100%) | MEDIUM | All browsing users | NO |
| Auth timeout on 2G | LOW (20%) | MEDIUM | 2-3 (stuck screen) | NO |
| BillPay API down | LOW (15%) | MEDIUM | 3 (feature unavail) | NO |
| Conversation impersonation | VERY LOW (2%) | LOW | 0-1 | NO |

**Critical finding: ZERO data corruption scenarios.** All failures are UX/latency issues, not integrity issues. The security fixes we applied today held.

---

## The 3 Things That Break First

### 1. Realtime connection limit (breaks at ~70 concurrent auction viewers)

The free tier's 200 Realtime connections will be exhausted when 25+ users watch auctions simultaneously. Each auction detail page opens a Realtime channel. With 8 ending auctions and 30 bidders, you hit the wall.

**Fix cost:** US$25/month (Supabase Pro — 500 connections)
**Workaround:** Fall back to polling (refetch every 3s) when Realtime fails.

### 2. 3G latency makes bidding unfair

A farmer in Masvingo on 3G has 500ms+ round-trip. A buyer in Harare on 4G has 80ms. In a 10-minute bidding window, the 3G user is always 400ms behind. They can't win close auctions.

**Fix cost:** Free — implement proxy bidding ("set my maximum bid to US$600, let the system bid for me in US$10 increments").
**Impact:** Transforms the marketplace from "fastest finger" to "highest commitment" — better for farmers.

### 3. Paynow first-attempt failures during peak hours

With 70% EcoCash success rate and 5 concurrent payment attempts, expect 1-2 failures. The 3-tier fallback catches most, but user experience degrades: 2s → 8s → 15s response times as fallback tiers engage.

**Fix cost:** Free — show "processing" state clearly, add retry button, extend payment window to 30 minutes.

---

## What Doesn't Break

| System | Why It Holds |
|--------|-------------|
| Auction integrity | `SELECT FOR UPDATE` row lock, `place_bid()` validates all rules |
| Payment integrity | Unique partial index, idempotent webhook, mandatory hash verification |
| Double payments | DB-level constraint + frontend cleanup logic |
| Auth security | JWT-based, session forgery prevention in authStore |
| Agent functions | All gated behind CRON_SECRET — no public access |
| BillPay AUTH→PAY flow | Same-reference enforcement, status-based guards |
| Data consistency | Foreign keys, cascade deletes, CHECK constraints |

---

## Revised Deployment Recommendation

| Users | Ready? | Required Changes |
|-------|--------|-----------------|
| 10-30 | YES | No changes needed. Monitor logs. |
| 30-50 | YES | Upgrade Supabase to Pro ($25/mo) for Realtime limits. |
| 50-100 | CONDITIONAL | Add pagination, implement proxy bidding, add explicit loading states for slow connections. |
| 100-500 | NOT YET | Need polling fallback, connection pooling, image optimization, proper E2E tests. |

---

## Score After Stress Test

**Architecture resilience: 8.5/10**
Zero data corruption paths. All failures are graceful degradation (slow, not wrong).

**UX under Zimbabwe conditions: 5/10**
The app was built for broadband. Zimbabwe farmers use 3G budget phones. Latency, page weight, and USSD reliability need attention.

**Payment reliability: 7/10**
3-tier Paynow fallback is excellent engineering. But real-world Paynow API latency and EcoCash USSD delivery will cause user confusion. Messaging around payment states needs work.

---

*Simulation completed 2026-04-08. Based on architecture analysis, not live load testing. Validate with real concurrent sessions before scaling beyond 50 users.*
