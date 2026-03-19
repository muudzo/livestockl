# ZimLivestock — Roadmap & Daily Tasks

> Internship window: 12 March → 23 April 2026 (6 weeks)
> Current date: 19 March 2026 — End of Week 1
> Copy this into Notion. Each section maps to a Notion database or board.

---

## Timeline Overview

| Week | Dates | Phase | Goal |
|------|-------|-------|------|
| 1 | Mar 12-19 | Foundation | Benchmarks + core build + field research |
| 2 | Mar 20-26 | Product Lock | Merge branches, lock features, first seller |
| 3 | Mar 27-Apr 2 | First Transaction | Real listing → real bid → real payment |
| 4 | Apr 3-9 | Transport + Trust | Transporter integration, stock card uploads |
| 5 | Apr 10-16 | Growth + Polish | Onboard 10 sellers, refine UX from feedback |
| 6 | Apr 17-23 | Presentation | SEED brief, benchmark report, demo day |

---

## Week 1: Foundation (Mar 12-19) — DONE

### What was delivered
- [x] React + TypeScript + Vite + Tailwind + shadcn/ui frontend
- [x] Supabase backend (PostgreSQL + Auth + RLS + Realtime + Edge Functions)
- [x] Go backend (23 files, 4,223 LOC, zero Supabase dependency)
- [x] 15 Edge Functions (agents, payments, QA)
- [x] Payment benchmarks: Stripe, Paystack, Flutterwave tested
- [x] Paynow integration attempted (6 methods, all blocked — Cloudflare + server down)
- [x] Pesepay blocked (malformed HTTP headers crash Deno)
- [x] DPOpay skipped (KYC required for sandbox)
- [x] Senior code review: 23 issues found, 23 fixed
- [x] QA suite: 29 scenarios passing, Grade A security
- [x] 12 interactive wireframes
- [x] Stanford SEED brief — investor-grade positioning
- [x] Livestock auction field visit — 8 findings documented
- [x] Paynow trust badges in checkout flow
- [x] Bid card data: ~45 active bidders per auction (liquidity target)
- [x] Transport partnership lead (2 truckers identified)

---

## Week 2: Product Lock (Mar 20-26)

> Goal: One codebase, one backend, feature-complete for first transaction.

### Monday Mar 20
- [ ] **Decision:** Go backend or Supabase Edge Functions? Pick one, kill the other
- [ ] Merge winning branch into `main`
- [ ] Rotate leaked keys (Paynow integration key, Supabase access token `sbp_20da7af4...`)
- [ ] Clean up dead branches (`agentic`, `benchmark/*`)

### Tuesday Mar 21
- [ ] Stock card photo upload field on listing creation (single file input, no fancy UI)
- [ ] Seller flow end-to-end: sign up → create listing → publish (test with mock data)
- [ ] Fix table name mismatch (`livestock` vs `livestock_items`) across all queries

### Wednesday Mar 22
- [ ] Buyer flow end-to-end: browse → view detail → place bid → win notification
- [ ] Timed auction countdown (real timers, not mock)
- [ ] "X people watching" badge on listing detail (even if hardcoded initially)

### Thursday Mar 23
- [ ] Paynow retry — test from Zimbabwean network again (server may be back up)
- [ ] If Paynow still down: implement manual payment confirmation flow (seller confirms receipt)
- [ ] Escrow logic: hold funds on bid win, release on buyer confirmation

### Friday Mar 24
- [ ] Write Go unit tests for `PlaceBid` and payment orchestrator
- [ ] Run full QA suite against merged codebase
- [ ] Fix anything that breaks

### Saturday Mar 25
- [ ] **Field work:** Visit auction again or visit a farmer directly
- [ ] Validate: "Would you list one animal on my app next week?"
- [ ] Get commitment from at least 1 seller

### Sunday Mar 26
- [ ] Week 2 retrospective — what's working, what's not
- [ ] Update SEED brief with any new data points
- [ ] Prep for Week 3: the first real transaction

---

## Week 3: First Transaction (Mar 27-Apr 2)

> Goal: One real animal listed, real bids placed, real money moved.

### Monday Mar 27
- [ ] Onboard first seller — help them create listing (sit with them if needed)
- [ ] Take photos/video of the animal together
- [ ] Ensure stock card photo is uploaded

### Tuesday Mar 28
- [ ] Share listing link with 5-10 potential buyers (WhatsApp, word of mouth)
- [ ] Monitor bids in real-time — be available for support
- [ ] Document every friction point the seller and buyers hit

### Wednesday Mar 29
- [ ] If auction ends: coordinate payment (Paynow or manual fallback)
- [ ] If no bids: diagnose why — pricing? trust? reach? Fix and relist
- [ ] Contact the truckers — "I may have a transport job this week"

### Thursday Mar 30
- [ ] Handle post-sale: transport coordination, police clearance
- [ ] Do this manually via WhatsApp — you ARE the platform right now
- [ ] Document the full transaction flow (screenshots, messages, timeline)

### Friday Mar 31
- [ ] Write up the first transaction as a case study
- [ ] What worked, what broke, what the seller/buyer said
- [ ] This becomes slide material for SEED

### Saturday Apr 1
- [ ] Fix top 3 friction points from the first transaction
- [ ] These are real bugs from real users — highest priority work

### Sunday Apr 2
- [ ] Week 3 retrospective
- [ ] Update research doc with first transaction learnings

---

## Week 4: Transport + Trust (Apr 3-9)

> Goal: Solve the two biggest pain points from field research.

### Monday Apr 3
- [ ] Contact the 2 truckers — formalize the handshake deal
- [ ] Get their routes, pricing per km, availability
- [ ] Add "Transport available" info to listing detail page (even if static text)

### Tuesday Apr 4
- [ ] Build seller rating system (simple: completed sales count + buyer feedback)
- [ ] "ZimLivestock Verified" badge for sellers with stock card uploads
- [ ] Buyer confirmation flow: "I received the animal" → releases escrow

### Wednesday Apr 5
- [ ] Onboard 2-3 more sellers from auction contacts
- [ ] Help each one create their first listing
- [ ] Target: 5 active listings on the platform

### Thursday Apr 6
- [ ] Push notifications for bid activity (or SMS if push isn't feasible)
- [ ] "Auction ending soon" alerts for watched listings
- [ ] Test the full buyer notification journey

### Friday Apr 7
- [ ] Second Paynow integration attempt (if blocked, document for benchmark report)
- [ ] Refine payment flow based on Week 3 transaction learnings
- [ ] Update benchmark report with latest findings

### Weekend Apr 8-9
- [ ] Field work: visit 1-2 sellers, check how listings are performing
- [ ] Collect testimonials (even informal WhatsApp quotes)
- [ ] Week 4 retrospective

---

## Week 5: Growth + Polish (Apr 10-16)

> Goal: 10 sellers, multiple completed transactions, polished UX.

### Monday Apr 10
- [ ] UX audit: fix the top 5 issues from user feedback
- [ ] Mobile responsiveness pass — test on cheap Android phones (the real user device)
- [ ] Loading states for slow connections (3G simulation)

### Tuesday Apr 11
- [ ] Onboard 5 more sellers — can you do this without sitting next to them?
- [ ] If not, the onboarding flow needs simplification
- [ ] Self-serve test: give someone the link and see if they can list without help

### Wednesday Apr 12
- [ ] Dispute resolution flow (what happens when buyer says animal isn't as described?)
- [ ] Even if it's just "contact support" — there must be a path
- [ ] Terms of service / listing guidelines (basic, one page)

### Thursday Apr 13
- [ ] Analytics: how many views per listing? bid-to-view ratio? dropout points?
- [ ] Add basic tracking if not already in place
- [ ] These numbers go in the SEED presentation

### Friday Apr 14
- [ ] Video listing support — can sellers upload a 30-second walk-around?
- [ ] If storage costs are a concern, compress aggressively or use external hosting
- [ ] Test on slow connections

### Weekend Apr 15-16
- [ ] Collect all metrics: users, listings, bids, transactions, transport requests
- [ ] Start drafting the SEED presentation deck
- [ ] Week 5 retrospective

---

## Week 6: Presentation (Apr 17-23)

> Goal: Ship the benchmark report, nail the SEED presentation, demo day.

### Monday Apr 17
- [ ] Finalize payment provider benchmark report
  - Stripe, Paystack, Flutterwave: full DX analysis
  - Paynow: 21 pitfalls documented, Cloudflare issues, 6 failed integration methods
  - Pesepay: HTTP header parsing bug
  - DPOpay: KYC sandbox blocker
  - Recommendations for Paynow developer experience improvements

### Tuesday Apr 18
- [ ] Build SEED presentation deck (slides, not doc)
  - Problem: 12% fees, US$1,000 barrier, Wednesday-only, one location
  - Solution: Auction-level trust at lower fees, 24/7, nationwide
  - Traction: X sellers, Y listings, Z completed transactions
  - Market: 45 bidders per auction × hundreds of auctions nationwide
  - Business model: 5-6% total fees + transport referral cuts
  - Field research: the comparison table from your research doc

### Wednesday Apr 19
- [ ] Practice pitch — 5 minutes, no filler
- [ ] Get feedback from someone honest (not someone who'll just say "great")
- [ ] Refine based on feedback

### Thursday Apr 20
- [ ] Final demo prep — make sure the app works end-to-end on a live demo
- [ ] Have a backup recording in case live demo fails
- [ ] Prepare FAQ answers (pricing, competition, scale, regulation)

### Friday Apr 21
- [ ] Buffer day — fix anything that's broken
- [ ] Final benchmark report review
- [ ] Submit deliverables

### Weekend Apr 22-23
- [ ] Internship wrap-up
- [ ] Session log: full 6-week retrospective
- [ ] What's next for ZimLivestock beyond the internship?

---

## Key Metrics to Track (Notion Dashboard)

| Metric | Week 2 Target | Week 4 Target | Week 6 Target |
|--------|--------------|--------------|--------------|
| Sellers onboarded | 1 | 5 | 10+ |
| Active listings | 1 | 10 | 20+ |
| Bids placed | 5 | 30 | 100+ |
| Completed transactions | 0 | 1-2 | 5+ |
| Transport requests | 0 | 1 | 3+ |
| Benchmark providers documented | 3 | 4-5 | 6 (all) |

---

## Daily Standup Template (Copy to Notion recurring task)

```
### Date: ____

**Yesterday:** What I shipped
**Today:** What I'm building
**Blockers:** What's stopping me
**Field notes:** Anything I learned from users/market
```

---

## Branch Cleanup Checklist (Do Monday Mar 20)

| Branch | Action | Reason |
|--------|--------|--------|
| `go-backend` | Merge to main OR keep as primary | Decision needed: Go vs Supabase |
| `agenticv2` | Merge agent logic to main | Contains QA + SRP refactors |
| `agentic` | Delete | Superseded by agenticv2 |
| `benchmark/stripe` | Merge to main | Work complete |
| `benchmark/paystack` | Merge to main | Work complete |
| `benchmark/pesepay` | Merge to main | Document the blocker |
| `benchmark/dpopay` | Delete | Abandoned — KYC blocker |

---

## Security Debt (Do This Week)

- [ ] Rotate Paynow integration key (exposed in dashboard)
- [ ] Rotate Supabase access token (`sbp_20da7af4...`)
- [ ] Audit `.env` files — nothing in git history
- [ ] Check Edge Functions for hardcoded secrets

---

*Last updated: 19 March 2026. Paste into Notion, convert headers to databases, and assign dates to each task.*
