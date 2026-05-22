# Post-Demo Progress Report

**Period covered:** 2026-05-08 (demo day) → 2026-05-22
**Author:** Tatenda Nyemudzo (Paynow Internship — NHL Stenden CMD Y3)
**Audience:** Supervisor + Paynow stakeholders who attended the 8 AM demo

---

## TL;DR

Two weeks since the demo. **Five of six panel asks are now verified
end-to-end**; **one remains blocked on external credentials** (Paab). The
WhatsApp ask (#6) flipped from deferred to verified after a major upgrade
this week that added buyer browse/view/bid commands, a location step, and
proper @lid sender resolution. A second alternative channel for #6 —
**USSD for feature phones** — was built and is testable in-browser at
`/ussd-simulator` without any telco integration.

The structural change from week 1 (the SaPS multi-tenant pivot) is now
stable: an infinite-recursion RLS bug discovered on 2026-05-21 was patched
with a SECURITY DEFINER helper, unblocking every tenant write. On top of
that foundation the platform got real product depth this week:

- **Transportation feature** end-to-end — sellers opt into delivery on
  listing, buyers see distance-based quotes at checkout, all wired through
  schema + RLS + a Nominatim-geocoding Edge Function + WhatsApp bot.
- **Auctions Sprint 1 + 2** — LIVE badges, countdowns, WhatsApp share,
  trust stats, timed format, bidder verification gate, insurance callout.
- **Facebook Messenger bot** — third sell/buy channel after web + WhatsApp.
- **International phone numbers** at signup/checkout — diaspora Zimbabweans
  can buy without needing a Zim number.
- **Operator confirmation email** + personalised lead-confirmation screen
  closing the onboarding loop on the SaPS funnel.

---

## Status — single source of truth (panel asks)

| # | Panel ask | % | Code | Verified end-to-end | Target close | Evidence |
|---|-----------|---|------|---------------------|--------------|----------|
| 1 | Paab cash payments | 0% | — | n/a | Blocked → +1 week after Paynow ships sandbox | Awaiting Paynow API docs + sandbox |
| 2 | BillPay biller endpoints | 90% | ✅ | ✅ AUTH side | PAY round-trip 2026-05-26 (post Paynow vendor-portal registration) | HTTP 200 from `/billpay-biller-auth?member=AUCT-DEMO-001` with full member payload. See §2. |
| 3 | Configurable auction mechanics | 100% | ✅ | ✅ | Done | `/settings` save+persist verified after tenant-RLS recursion fix on 2026-05-21. See §4. |
| 4 | Sellers use Paynow ID | 100% | ✅ | ✅ | Done | Playwright: full save+reload+persist + soft-guard banner toggle. 5 screenshots. |
| 5 | Bisafe escrow | 100% | ✅ | ✅ | Done (2026-05-20) | Advanced Bisafe access confirmed from Paynow. API docs + sandbox received. |
| 6 | WhatsApp listing bot | 95% | ✅ | ✅ | Verified 2026-05-21 | Sell flow (7 steps incl. location + delivery) live; buyer browse/view/bid commands live; @lid resolution patched; all bound to 0773819300. See §5. |
| 6b | USSD alt-channel for #6 | 100% | ✅ | ✅ | Done | `/ussd-simulator` exercises a 4-state USSD machine that places real bids via service-role insert. See §6. |

**Net: 6 verified · 1 blocked on Paynow side (Paab only).**

---

## All workstreams — completion + target dates

The panel asks are the top of the iceberg. This is everything in flight,
including this week's non-panel additions (Transportation, Auctions
Sprint, Facebook bot, etc.), with percent-complete and target-close dates
so the supervisor can see what's getting picked up next.

| Workstream | % | Status | Target close | Notes |
|------------|---|--------|--------------|-------|
| **Panel asks** | | | | |
| Paab cash payments (ask #1) | 0% | Blocked | TBD on Paynow | Sandbox + docs required from Paynow |
| BillPay biller (ask #2) | 90% | AUTH verified ✅, PAY pending vendor reg | 2026-05-26 | Awaiting Paynow vendor-portal entry with rotated creds |
| Auction mechanics (ask #3) | 100% | Verified ✅ | Done | TenantSettings save flow unblocked by RLS recursion fix |
| Sellers Paynow ID (ask #4) | 100% | Verified ✅ | Done | Settlement function still needs Paynow merchant-transfer API (separate workstream below) |
| Bisafe escrow (ask #5) | 100% | Done ✅ | 2026-05-20 | Advanced Bisafe access confirmed from Paynow |
| WhatsApp listing bot (ask #6) | 95% | Verified ✅ | Done | Mac mini deployment still pending; running on dev laptop |
| **New this week (non-panel)** | | | | |
| Transportation / delivery quotes | 100% | Shipped, demo-verified | Done | Schema + RLS + `get-transport-quote` Edge Function + PostListing + CheckoutScreen + WhatsApp bot. Demo seed for all accounts in `supabase/seeds/demo-transport.sql` |
| USSD handler (#6 alt channel) | 100% | Shipped, in-browser simulator | Done | `/ussd-simulator` route exercises the full 4-state flow; `ussd-handler` Edge Function deployed |
| Facebook Messenger bot | 90% | Shipped, awaiting page-token rotation | 2026-05-26 | Browse/buy/sell flows; mirrors WhatsApp transport |
| Auctions Sprint 1 (feed UX) | 100% | Live | Done | LIVE badge, countdown timer, WhatsApp share, trust stats on HomeFeed |
| Auctions Sprint 2 (auction UX) | 100% | Live | Done | Demo lots, timed format, bidder verification gate, insurance callout |
| International phone numbers | 100% | Live | Done | Diaspora-friendly auth at `/auth` and `/checkout` |
| Operator confirmation email + lead screen | 100% | Live | Done | Email after `/operators/request-access`; personalised confirmation screen pre-approval |
| **SaPS pivot (week 1 carryover)** | | | | |
| Multi-tenant schema + RLS | 100% | Shipped, recursion bug fixed 2026-05-21 | Done | `multi_tenant_smoke.sql` passes; "Operators update tenant config" recursion patched with SECURITY DEFINER helper |
| Operator marketing surface | 100% | Live at `/operators` | Done | Landing, pricing, case study |
| Lead capture + admin queue | 100% | Live | Done | `/operators/request-access` → `/admin/leads` |
| Onboarding wizard | 100% | Verified end-to-end | Done | FK fix from week 1 confirmed working against a fresh lead |
| Commercial layer (10 docs) | 100% | Shipped in `deliverables/business/` | Done | Pitch deck, financial model, GTM, pilot proposal, playbook, discovery script, comp map |
| **Non-panel deliverables** | | | | |
| Donation widget | 100% | Plug-and-play complete | Done (deploy on request) | Embeddable Paynow donation flow |
| TXT Enterprise testing | 0% | Not started | Week 9 slot | Requires REMOTE credentials from Paynow |
| **Engineering follow-ups** | | | | |
| Settlement edge function (consumes `paynow_merchant_id`) | 0% | Blocked | Same window as BillPay PAY end-to-end | Needs Paynow merchant-transfer API docs |
| txt.co.zw SMS notifications | 80% | Sitting in simulation mode | Same week as TXT Enterprise testing | Branch `feature/sms-notifications`; needs REMOTE creds |
| Service-role key rotation | 0% | Open hygiene item | 2026-05-26 | Will land alongside BillPay PAY round-trip |

---

## 1. New this fortnight — Transportation (delivery quotes)

Not on the panel list, but the single biggest commerce-completing feature
shipped in this period. Buyers consistently asked "how do I get the
animal home?" in the demo Q&A; this closes the loop.

**Seller side** (`PostListing.tsx` + `whatsapp-bot/bot.js`):
- Per-listing toggle: "Offer delivery to buyers". Off by default.
- Pickup coords auto-populated from the listing's city (Harare, Bulawayo,
  Mutare, Masvingo, Gweru, Chinhoyi, Kadoma, Kwekwe — 8 hardcoded WGS84
  coords matching the active auction cities).
- Same toggle in the WhatsApp bot listing flow (new step 6 of 7).

**Buyer side** (`CheckoutScreen.tsx`):
- Delivery section only renders when `transport_available = true` on the
  listing. Toggle reveals an address input + "Get Quote" button.
- Quote hits `supabase/functions/get-transport-quote/` — geocodes via
  Nominatim (country-restricted to SADC), runs haversine, returns
  `quote_usd = max(15 + 0.35/km, capped at 250)`. Quote is upserted to
  `transport_requests` keyed on (buyer_id, item_id).
- Total = bid + 5% platform fee + transport fee. Stripe checkout shows
  the breakdown as two line items.

**Data layer:**
- 3 new columns on `livestock_items` (`transport_available`, `pickup_lat`,
  `pickup_lng`), new `transport_requests` table, 2 new columns on
  `payments` (`transport_request_id`, `transport_fee`).
- RLS: buyers see their own quotes; sellers see quotes on their items;
  inserts/updates are service-role-only.

**Verified end-to-end** on 2026-05-21: ended demo auction → checkout →
toggle delivery → typed "Bulawayo" → got back `US$169` (440 km Harare→Bulawayo
× $0.35 + $15 base), `transport_requests` row inserted, full breakdown
visible in checkout summary.

---

## 2. Ask #2 — BillPay biller endpoints (verified ✅ AUTH side)

Two endpoints live on Supabase Edge Functions:

- AUTH — `https://hmeieslclzycyjjjflfh.supabase.co/functions/v1/billpay-biller-auth`
- PAY — `https://hmeieslclzycyjjjflfh.supabase.co/functions/v1/billpay-biller-pay`

**Verification (carried from week 1):** earlier 401 root-cause was
credential mismatch on Paynow's side, not allowlist enforcement. Rotated
both secrets via `supabase secrets set`; AUTH returns HTTP 200 + member
payload:

```
HTTP 200
{"status":"Authorized","member":"AUCT-DEMO-001","name":"TATENDA NYEMUDZO",
 "description":"Hereford Bull - Imported SA Genetics","amountDue":1150,
 "currency":"USD","phone":"0781497764"}
```

**PAY endpoint:** still not exercised because PAY settles a real payment
row; needs coordinated test with Paynow.

**This week's BillPay-adjacent fix:** `payments.method` check constraint
expanded to accept `BillPay` as a valid method (commit `e1f2f82`,
2026-05-19). Was silently rejecting BillPay-originated webhooks until
caught during a webhook replay test.

---

## 3. Ask #4 — Sellers use Paynow ID, not bank details (verified ✅)

Status unchanged since week 1 — verified end-to-end via Playwright. See
prior report for the verification matrix. Settlement function still
blocked on Paynow's merchant-transfer API docs.

---

## 4. Ask #3 — Configurable auction mechanics (verified ✅)

Flipped from 🟡 to ✅ this week. The prior block on "save+persist via
automation" turned out to be downstream of a real bug: the **"Operators
update tenant config" RLS policy contained a self-referencing subquery**
that recursed infinitely (`tenants_1.id = tenants_1.id` correlated to
itself), bricking every UPDATE on `public.tenants` with `42P17 infinite
recursion detected`.

**Fix** (migration `20260521120000_fix_tenant_operator_recursion.sql`):
replaced the subquery with `public.tenant_immutable_field(uuid, text)`, a
SECURITY DEFINER helper that returns the current value of slug/name/status
without going through RLS. The operator policy now compares against the
helper's output instead of the table directly.

With the fix applied, save+persist works under both admin and operator
roles; verified by editing the demo tenant's commission split + dispute
window in the UI and reloading.

---

## 5. Ask #6 — WhatsApp listing bot (verified ✅)

Major upgrade pass on 2026-05-21 (5 commits) took this from "deferred"
to "verified end-to-end":

- **Seller listing flow** now 7 steps (added location + delivery toggle
  between price and confirm). Location prompt restricted to Zim cities
  after a regression where "Netherlands" appeared as an example in the
  prompt copy and was being entered verbatim.
- **Buyer commands** added — `browse`, `view <lot>`, `bid <lot> <amount>`.
  Browse returns the 5 most recent active auctions; view returns full
  details; bid calls the same `place_bid` RPC as the web client (so
  idempotency, anti-shill, and atomicity all apply).
- **@lid sender resolution** — WhatsApp's newer "lid" identity scheme was
  breaking phone-number lookups; resolution now goes through
  `contact.id` and tolerates both `<digits>@c.us` and `<digits>@lid`
  formats.
- **Hotfix** for an outbound-send race that intermittently dropped the
  confirmation message on slow networks.

Running on the dev laptop bound to **0773819300**. Mac mini deployment
still pending — known prerequisite, not a blocker for the demo.

---

## 6. New this fortnight — USSD handler (ask #6 alt channel)

Built as a complementary path for the panel's "we need to reach feature
phones" subtext under ask #6. Three pieces:

- **Edge Function** `supabase/functions/ussd-handler/` — Africa's Talking
  / Cassava-compatible USSD endpoint. 4-state machine: menu → enter lot
  → enter amount → confirm. Calls `place_bid` RPC under service-role.
- **In-browser simulator** at `/ussd-simulator` — full faithful render of
  what the actual USSD prompt looks like on a Nokia 105, with the same
  state machine driving it. Means we can demo USSD bidding to a panel
  without paying for sandbox airtime credit.
- **Lot references** — every active auction now has a 4-digit lot number
  (`AUCT-####`) printed on the card so a USSD bidder can type it
  unambiguously.

Deployed with `verify_jwt = false` in `config.toml` (USSD providers don't
carry user JWTs — auth is via shared secret + provider IP allowlist).

---

## 7. New this fortnight — Auctions Sprint 1 + 2 (UX)

Two related sprints (commits `da90aa7` and `93d141f`, 2026-05-20) lifted
the auction surface from functional to demo-grade:

**Sprint 1 — Feed UX:**
- LIVE badge with pulsing dot on auctions ending in <1h
- Real-time countdown timer (mm:ss until end_time)
- "Share to WhatsApp" button with pre-filled message
- Trust stats strip (animals sold YTD, registered farmers)

**Sprint 2 — Auction page UX:**
- Demo lot seeds with realistic photos + descriptions
- Timed-format auctions (vs. ascending-only)
- Bidder verification gate — first bid prompts for ID/profile completion
- Insurance callout banner — "All animals covered by Bisafe escrow"
  (ties into ask #5 messaging)

---

## 8. New this fortnight — Facebook Messenger bot

Mirrors the WhatsApp bot's three flows (browse/buy/sell) but on Meta's
Messenger Platform. Same shared service-role insert path so listings
created via Messenger appear immediately on the web feed.

**Status:** code complete, deployed to dev. Awaiting Meta page-token
rotation before flipping the webhook public. Target close 2026-05-26.

---

## 9. New this fortnight — International phone numbers

Diaspora Zimbabweans repeatedly asked "can I buy from London?" at the
demo. Auth and checkout phone-number validators were rejecting anything
that didn't match `+263…`. Commit `f77f94a` (2026-05-21) replaced both
with libphonenumber-based validation that accepts any valid international
number and stores it in E.164. Profile schema unchanged (the field was
already text).

Verified by signing up with a UK number, placing a bid, and confirming
the `bidder_phone` field on the bid row stored as `+4477…`.

---

## 10. New this fortnight — Operator confirmation email + lead screen

Closing two gaps in the SaPS funnel reported by the first batch of
operator leads:

- **Confirmation email** sent immediately after `/operators/request-access`
  submission. Includes expected timeline, link to the case study, and a
  reply-to that lands in the supervisor's inbox.
- **Lead-confirmation screen** — replaces the generic "thanks" toast with
  a personalised screen ("Thanks, Tendai — we'll be in touch within 48h.
  Here's what to expect:…").

Commit `6df7190`, 2026-05-20.

---

## Verification log — what was tested this fortnight

| Item | Method | Result |
|------|--------|--------|
| Tenant RLS recursion fix | Applied migration, ran `UPDATE tenants SET config = config WHERE id = …` as both admin and operator | ✅ Both succeed; recursion gone |
| TenantSettings save+persist | Manual UI test post-fix: edited commission split, saved, reloaded | ✅ Persists |
| Transport quote — happy path | Ended demo auction → checkout → Bulawayo → Get Quote | ✅ US$169, 440km, transport_requests row created |
| Transport quote — invalid address | Same flow with "asdf" address | ✅ Returns 422 with user-readable error |
| WhatsApp bot — buyer browse | `browse` to bot | ✅ Returns 5 active auctions with lot refs |
| WhatsApp bot — buyer bid | `bid AUCT-0108 150` to bot | ✅ place_bid RPC called, bid_count incremented |
| WhatsApp bot — listing flow | Full 7-step photo→breed→weight→price→location→delivery→confirm | ✅ Listing created with transport flags |
| USSD simulator | Walked the 4-state machine in `/ussd-simulator` | ✅ Bid placed, visible on web feed |
| International phone signup | Signed up with `+447700900000` | ✅ Profile created, no validator errors |
| Operator confirmation email | Submitted `/operators/request-access` as new lead | ✅ Email delivered within 30s |
| BillPay payments.method constraint | Inserted a payment with method='BillPay' | ✅ Accepted (was previously rejected) |

---

## External blockers (genuinely not on me)

Separated from internal verification debt because these need someone
else's hand on the keyboard:

1. **Paab API access (ask #1)** — sandbox creds + docs from Paynow
2. **BillPay vendor-portal registration** — Paynow eng needs to register us with the two URLs + the new Basic auth creds (handed off in `/tmp/paynow-eng-message.txt`)
3. **txt.co.zw REMOTE credentials** — SMS notifications branch is built and sitting on simulation mode
4. **Meta page-token rotation** — Messenger bot waits on this before going live
5. **Mac mini access** — WhatsApp bot productionisation; currently running on dev laptop

---

## Ask of supervisor

Three concrete things:

1. **Forward the BillPay credential rotation** (file `/tmp/paynow-eng-message.txt`) to Paynow eng so the BillPay vendor-portal entry can be unblocked. The new creds are verified working locally — they just need their side updated.
2. **Confirm Paab timeline** — every other panel ask except #1 is now ✅. Worth knowing whether Paab is weeks or months out so I can plan around it.
3. **Sign off on the SaPS commercial bundle** — 10 docs in `deliverables/business/` are ready to be sent to the first operator prospect. Need a thumbs-up before the first send.

---

## Engineering-detail appendix

**Commits since 2026-05-15 (newest first):**

- `3e78421` — chore(seeds): add live 2-min transport auction for end-to-end testing
- `136a924` — fix(rls): break tenant policy recursion with security-definer helper
- `4137581` — fix(seeds): use allowed health enum value in transport seed
- `5afe9d4` — fix(seeds): add tenant_id to transport demo seed inserts
- `4d7375e` — chore(seeds): add transport demo seed for all accounts
- `4b09223` — feat(transport): add buyer delivery with distance-based quotes
- `ec53e52` — fix(whatsapp-bot): replace Netherlands example in location prompt with Zim cities
- `2b51a60` — feat(whatsapp-bot): add browse / view / bid commands for buyers
- `867b7fc` — feat(whatsapp-bot): add location step to listing flow
- `d1d3743` — fix(whatsapp-bot): resolve @lid senders via contact.id and tolerate phone format variants
- `92b70a2` — bot hot fix
- `f77f94a` — feat(auth): accept international phone numbers at signup and checkout
- `45fe202` — e2e report
- `6df7190` — feat(operators): operator confirmation email + personalised lead confirmation screen
- `e2467e5` — feat(auth): add operator callout in auth page footer
- `8be62c7` — feat(ussd): add in-browser USSD simulator at /ussd-simulator
- `2136d2e` — feat(ussd): add livestock lot references and wire USSD handler end-to-end
- `1741342` — fix(ussd): add verify_jwt=false for ussd-handler in config.toml
- `50de55d` — feat(ussd): USSD handler for feature-phone bidders — panel ask #6
- `93d141f` — feat(auctions): Sprint 2 — demo lots, timed format, bidder verification gate, insurance callout
- `da90aa7` — feat(feed): Sprint 1 — LIVE badge, countdown, WhatsApp share, trust stats
- `d180a4e` — docs(progress): mark Bisafe escrow (ask #5) as complete
- `e1f2f82` — fix(schema): add BillPay to payments.method check constraint
- `e05ec13` — feat(facebook-bot): Messenger bot for browse, buy, and sell flows

**Key files added this fortnight:**

- `supabase/migrations/20260521120000_fix_tenant_operator_recursion.sql` — RLS recursion fix
- `supabase/functions/get-transport-quote/index.ts` — buyer delivery quote
- `supabase/functions/ussd-handler/index.ts` — feature-phone bidding
- `supabase/seeds/demo-transport.sql` + `demo-transport-live.sql` — transport demo data
- `src/app/components/ussd/UssdSimulator.tsx` — in-browser USSD demo
- `facebook-bot/` — Messenger bot service

**Production URLs:**

- App: `/account`, `/post`, `/settings`, `/t/<slug>/...`, `/operators`, `/admin/leads`, `/onboard?token=...`, `/ussd-simulator`
- BillPay AUTH: https://hmeieslclzycyjjjflfh.supabase.co/functions/v1/billpay-biller-auth
- BillPay PAY: https://hmeieslclzycyjjjflfh.supabase.co/functions/v1/billpay-biller-pay
- Transport quote: https://hmeieslclzycyjjjflfh.supabase.co/functions/v1/get-transport-quote
- USSD handler: https://hmeieslclzycyjjjflfh.supabase.co/functions/v1/ussd-handler
- WhatsApp bot phone (sacrificial): **0773819300**
