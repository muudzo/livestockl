# Agentic Commerce Architecture — ZimLivestock

## What We Built

An autonomous multi-agent system that buys and sells livestock on behalf of users. Instead of humans browsing listings, placing bids, and monitoring auctions — agents do it all automatically.

```
Human → marketplace → payment       (traditional)
Agent → marketplace → payment       (agentic)
```

---

## System Architecture

```
                    USER
                     │
                     │ Define goals + budget
                     ▼
          ┌──────────────────────┐
          │   Agent Dashboard    │
          │  (React + Realtime)  │
          └──────────┬───────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
   ┌─────────┐ ┌──────────┐ ┌──────────┐
   │  Buyer  │ │  Seller  │ │  Market  │
   │  Agent  │ │  Agent   │ │  Intel   │
   └────┬────┘ └────┬─────┘ └────┬─────┘
        │           │             │
        │    ┌──────┴──────┐      │
        │    │   Auction   │      │
        │    │   Sniper    │      │
        │    └──────┬──────┘      │
        │           │             │
        ▼           ▼             ▼
   ┌─────────────────────────────────┐
   │     Supabase (PostgreSQL)       │
   │  Listings · Bids · Payments     │
   │  Realtime · RLS · Edge Funcs    │
   └─────────────────────────────────┘
```

---

## The 4 Agents

### 1. Buyer Agent (`buyer-agent`)
Scans the marketplace, evaluates listings against user-defined goals, and places bids automatically.

**Decision Engine Scoring (0-100):**
- Price vs budget (0-30 pts)
- Location match (0-15 pts)
- Breed match (0-10 pts)
- Health rating (0-10 pts)
- Competition level (bid count)
- Time urgency (ending soon bonus)

**Actions:** `ignore` | `monitor` | `bid`

**Example reasoning:**
```
BID: Score 100/100 — placing bid of US$607.21.
Price US$578.30 is 52% below budget.
Location Harare matches preference.
Breed "Brahman" matches preference.
Health: Excellent.
High competition (10 bids).
Ending very soon — needs quick decision.
```

### 2. Auction Sniper (`auction-sniper`)
Monitors auctions ending within a 5-minute window and places last-second bids.

**Strategy:**
- Scans for auctions ending in < 5 minutes
- Only bids if price is within budget
- Bids 3% above current price (minimum US$5 increment)
- Skips listings it already bid on

**Actions:** `snipe` | `ignore`

### 3. Seller Agent (`seller-agent`)
Analyzes your active listings and suggests pricing optimizations.

**Strategies:** `aggressive` | `moderate` | `conservative`

**Detects:**
- No bids + ending soon → suggest reprice
- Price above market average → suggest reduction
- High traction (5+ bids) → suggest promotion
- Ending soon with bids → alert

### 4. Market Intel Agent (`market-intel`)
Generates market intelligence reports with price trends and anomaly detection.

**Outputs:**
- Category-level price averages
- Location-based pricing
- Sell-through rates
- Overpriced/underpriced anomalies (>50% deviation from average)

---

## Database Schema

6 new tables deployed to Supabase:

| Table | Purpose |
|-------|---------|
| `agents` | Core agent registry (type, status, config, stats) |
| `agent_goals` | What agents are trying to buy (category, breed, location, budget, quantity) |
| `agent_decisions` | Reasoning log — every evaluation with score and explanation |
| `agent_bids` | Bids placed by agents (linked to actual `bids` table) |
| `agent_activity_log` | Full audit trail of every agent action |
| `market_intel` | Historical price data by category/breed/location |

**Key features:**
- Row Level Security (RLS) — users only see their own agents
- Realtime subscriptions — dashboard updates live
- Polymorphic agent table — all 4 types share one table with `agent_type` discriminator
- Atomic bid placement — direct inserts with service role key

---

## Edge Functions (Deployed)

| Function | Trigger | What It Does |
|----------|---------|-------------|
| `buyer-agent` | Auto (15s) or manual | Scan → evaluate → bid cycle |
| `auction-sniper` | Auto (15s) or manual | Find ending auctions → snipe |
| `seller-agent` | Manual | Analyze listings → suggest repricing |
| `market-intel` | Manual | Generate market report + anomalies |

All functions use `SUPABASE_SERVICE_ROLE_KEY` for DB access and `--no-verify-jwt` for invocation.

---

## Frontend

### Agent Dashboard (`/agents`)
- Lists all user agents with status (active/paused/stopped)
- Play/pause controls per agent
- Lightning bolt for manual trigger
- Green pulse "Auto-running every 15s" indicator
- **Live Activity Feed** — realtime via Supabase subscriptions
- **Decision Log** — shows reasoning with confidence scores and color-coded decisions
- **Goals Panel** — shows progress (quantity fulfilled / target)

### Agent Setup (`/agents/new`)
- Choose agent type (buyer, seller, market intel, sniper)
- Name the agent
- Set buying goals (category, breed, location, health, price, quantity)
- One-click activation

### Navigation
- Bot icon added to bottom nav bar
- Protected routes (login required)
- Lazy-loaded components

---

## Test Run Results

**Setup:**
- 27 livestock listings seeded (cattle, goats, sheep)
- 5 test seller accounts
- 2 competing agents with US$5,000 each

**Agent 1 — Harare Brahman Buyer:**
- Goal: 5 purebred Brahman in Harare, max US$1,200/head
- Result: Evaluated 6 listings, placed 5 bids
- Spent: ~US$4,225 on 5 cattle
- Ignored 1 listing (US$1,284 — over budget)
- Confidence scores: 92-100/100

**Agent 2 — Nationwide Cattle Sniper:**
- Goal: 5 cattle anywhere, max US$1,000/head
- Result: Scanning for last-minute auctions
- Executed snipes on ending auctions when available

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind |
| State | React Query (TanStack) + Zustand |
| Backend | Supabase Edge Functions (Deno) |
| Database | Supabase PostgreSQL |
| Realtime | Supabase Realtime (postgres_changes) |
| Auth | Supabase Auth + RLS |
| AI/Decision | Rule-based scoring engine (extensible to LLM) |

---

## File Map

```
src/
  hooks/
    useAgents.ts              — All agent hooks (CRUD, activity, auto-run)
  app/
    components/
      AgentDashboard.tsx      — Main dashboard with live feed
      AgentSetup.tsx          — Agent creation wizard
    routes.tsx                — Added /agents and /agents/new
    components/Root.tsx       — Added Bot icon to nav

supabase/
  functions/
    buyer-agent/index.ts      — Buyer agent Edge Function
    seller-agent/index.ts     — Seller agent Edge Function
    market-intel/index.ts     — Market intel Edge Function
    auction-sniper/index.ts   — Auction sniper Edge Function
```

---

## Why This Matters for Paynow

This demonstrates **agentic commerce** — the next evolution of payments:

1. **Agents need payment rails.** When an agent wins an auction, it needs to pay automatically. Paynow is the natural payment layer for this in Zimbabwe.

2. **Volume multiplier.** One user with 4 agents generates more transactions than 10 manual users. Agents bid on every relevant listing, every 15 seconds.

3. **New API requirements.** Agents need reliable, low-latency APIs. The Cloudflare blocker and form-encoded API become even more critical when an agent needs to place a bid and pay within seconds.

4. **Recommendation:** Paynow should build an agent-friendly API tier — JSON, Bearer auth, no Cloudflare challenge, webhook guarantees, and idempotent payment initiation. This positions Paynow as the payment infrastructure for Zimbabwe's agentic economy.
