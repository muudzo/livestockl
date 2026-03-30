# ZimLivestock Demo Script — Boss Presentation

## Setup Before Demo
1. Have the live URL open (Vercel or localhost:5173)
2. Be logged in as `tatenda@paynow.co.zw`
3. Have a fresh auction ready (or create one during demo)
4. Have Paynow test numbers handy:
   - **0771111111** → Success
   - **0772222222** → Delayed success
   - **0774444444** → Insufficient balance

---

## Demo Flow (5-7 minutes)

### 1. The Problem (30 seconds)
> "Physical livestock auctions in Zimbabwe charge 12% fees, require a US$1,000 cash deposit, and only happen on Wednesdays at one location. Small farmers are priced out."

### 2. The Solution — Browse Marketplace (1 minute)
- Show **HomeFeed** — listings with live photos, breeds, locations, countdown timers
- Tap into a listing → **ItemDetail** page with bid history, seller profile
- Point out: "Anyone with a phone can browse and bid — no US$1,000 deposit needed"

### 3. Post a Listing (1 minute)
- Go to **Post Listing** → show the form
- Point out **stock card upload** — "Sellers upload their vet certificate for trust"
- Show category, breed, location dropdowns — "We've standardized the data"
- Point out: "5% platform fee vs 12% at physical auctions"

### 4. Place a Bid (30 seconds)
- Go to an active listing
- Place a bid → show the confirmation dialog
- "Atomic bidding — the database prevents race conditions even with concurrent bids"

### 5. Win & Pay via Paynow (2 minutes) — THE KEY DEMO
- Go to a won auction → **Checkout Screen**
- Show payment method options: **EcoCash, OneMoney, Card**
- Select EcoCash → enter test number **0771111111**
- Hit **Pay Now**
- Show: "USSD prompt sent to phone — Dial *151*2*7#"
- Payment status page polls every 5 seconds
- **Payment confirmed!** — seller notified automatically

> "This is Paynow's express checkout — the buyer never leaves the app. No redirect, no browser window. Just a USSD prompt on their phone. 80% of Zimbabwe transacts via EcoCash."

### 6. Paynow Integration Depth (1 minute)
- "We support the full Paynow ecosystem:"
  - **EcoCash** express checkout (USSD)
  - **OneMoney** express checkout (USSD)
  - **Card payments** via Stripe fallback (diaspora buyers)
  - **BuySafe escrow** — funds held until delivery confirmed
  - **Webhooks** — both Paynow and Stripe callbacks handled
- "The Cloudflare blocker? We solved it with a browser-relay pattern — documented in our DX benchmark"

### 7. Technical Highlights (30 seconds)
- "React + Supabase + Edge Functions — 18 serverless functions deployed"
- "Row-Level Security on every table — Grade A security audit"
- "AI agents for autonomous bidding and market intelligence"
- "Full QA suite: chaos tests, consistency checker, security agent"

### 8. What's Next (30 seconds)
- BuySafe escrow confirmation flow
- First real seller onboarding
- SEED presentation preparation
- Transport partnership integration

---

## If Something Breaks During Demo
- **Payment fails**: Use web checkout (redirect to Paynow page) as fallback
- **USSD not received**: "Test mode — in production, the USSD arrives in 5-10 seconds"
- **Page errors**: Refresh and try again — the DB state is consistent
- **Auth expired**: Log in again at /auth

## Test Accounts
| Email | Role | Password |
|---|---|---|
| tatenda@paynow.co.zw | Buyer (you) | Your password |
| seller-a@test.zl | Seller (Tendai Moyo) | Test account |

## Key Numbers to Quote
- Physical auction: **12% fees**, US$1,000 deposit, ~45 bidders
- ZimLivestock: **5% fees**, no deposit, unlimited bidders
- Farmer saves: **US$72+ per US$1,200 transaction**
- Payment benchmark: **5 providers tested**, Paynow integrated end-to-end
