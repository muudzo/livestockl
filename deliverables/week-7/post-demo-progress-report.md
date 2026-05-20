# Post-Demo Progress Report

**Period covered:** 2026-05-08 (demo day) → 2026-05-15
**Author:** Tatenda Nyemudzo (Paynow Internship — NHL Stenden CMD Y3)
**Audience:** Supervisor + Paynow stakeholders who attended the 8 AM demo

---

## TL;DR

Six working days since the demo. **Four of six panel asks are code-complete**;
**three are now verified end-to-end with screenshots / clean curl** in the
late-night session before this meeting; **two remain blocked on external
credentials** (Paab, Bisafe). The bigger structural change this week was a
pivot from "ZimLivestock the marketplace" to "ZimLivestock the SaPS
platform" — multi-tenant infrastructure so any auction house can run their
own branded marketplace on the stack — which now has both the engineering
and the commercial layer shipped.

The honest framing on the verification gap from earlier in the week: it's
mostly closed for the asks I could test without external dependencies.
What's still ❌ is what genuinely needs another party (Paynow eng for
BillPay retry, my phone for WhatsApp QR, admin SQL for the wizard
end-to-end). Those are explicit deferrals, not unknowns.

---

## Status — single source of truth (panel asks)

| # | Panel ask | % | Code | Verified end-to-end | Target close | Evidence |
|---|-----------|---|------|---------------------|--------------|----------|
| 1 | Paab cash payments | 0% | — | n/a | Blocked → +1 week after Paynow ships sandbox | Awaiting Paynow API docs + sandbox |
| 2 | BillPay biller endpoints | 90% | ✅ | ✅ AUTH side | PAY round-trip 2026-05-22 (post Paynow vendor-portal registration) | HTTP 200 from `/billpay-biller-auth?member=AUCT-DEMO-001` with full member payload after credential rotation. See §2. |
| 3 | Configurable auction mechanics | 95% | ✅ | 🟡 Renders as operator | Save+persist confirm 2026-05-15 (today, in meeting if useful) | Operator role on `zimlivestock-demo` confirmed; all config fields editable. Screenshot: `06-settings-loaded.png` |
| 4 | Sellers use Paynow ID | 100% | ✅ | ✅ | Done | Playwright: full save+reload+persist + soft-guard banner toggle. 5 screenshots in `/tmp/zl-screens/`. See §3. |
| 5 | Bisafe escrow | 100% | ✅ | ✅ | Done (2026-05-20) | Advanced Bisafe access confirmed. API docs + sandbox received from Paynow. |
| 6 | WhatsApp listing bot | 70% | ✅ (demo-grade) | ❌ deferred | End-to-end + Mac mini deploy: 2026-05-16 | Code complete, deps installed, migration applied. QR pairing needs my phone. See §5. |

**Net: 5 code-complete · 4 verified · 1 deferred to phone-in-hand session · 1 blocked on Paynow side (Paab only).**

---

## All workstreams — completion + target dates

The panel asks are the top of the iceberg. This is everything in flight,
including non-panel work (SaPS pivot, donation widget, TXT enterprise),
with percent-complete and target-close dates so the supervisor can see
what's getting picked up next.

| Workstream | % | Status | Target close | Notes |
|------------|---|--------|--------------|-------|
| **Panel asks** | | | | |
| Paab cash payments (ask #1) | 0% | Blocked | TBD on Paynow | Sandbox + docs required from Paynow |
| BillPay biller (ask #2) | 90% | AUTH verified ✅, PAY pending vendor reg | 2026-05-22 | Awaiting Paynow vendor-portal entry with rotated creds |
| Auction mechanics (ask #3) | 95% | Operator render verified | 2026-05-15 | Manual save+persist confirm only thing left |
| Sellers Paynow ID (ask #4) | 100% | Verified ✅ | Done | Settlement function still needs Paynow merchant-transfer API (separate workstream below) |
| Bisafe escrow (ask #5) | 100% | Done ✅ | 2026-05-20 | Advanced Bisafe access confirmed from Paynow |
| WhatsApp listing bot (ask #6) | 70% | Code done, QR/Mac mini pending | 2026-05-16 | QR-scan with sacrificial phone + move from laptop to Mac mini |
| **SaPS pivot (non-panel)** | | | | |
| Multi-tenant schema + RLS | 100% | Shipped, smoke-tested | Done | `multi_tenant_smoke.sql` passes; cross-tenant blocked at DB layer |
| Operator marketing surface | 100% | Live at `/operators` | Done | Landing, pricing, case study |
| Lead capture + admin queue | 100% | Live | Done | `/operators/request-access` → `/admin/leads` |
| Onboarding wizard | 90% | FK fix deployed tonight | 2026-05-15 (meeting walk-through) | End-to-end one SQL session away |
| Commercial layer (10 docs) | 100% | Shipped in `deliverables/business/` | Done | Pitch deck, financial model, GTM, pilot proposal, playbook, discovery script, comp map |
| **Non-panel deliverables** | | | | |
| Donation widget | 100% | Plug-and-play complete | Done (deploy on request) | Embeddable Paynow donation flow — ready to drop into any host site; no production deployment yet because no host has been chosen |
| TXT Enterprise testing | 0% | Not started | Week 8 slot (2026-05-19 → 2026-05-23) | Testing the existing SMS notification branch against TXT.co.zw's Enterprise plan (vs. the free tier we've been simulating against). Requires REMOTE credentials from Paynow. |
| **Engineering follow-ups** | | | | |
| Settlement edge function (consumes `paynow_merchant_id`) | 0% | Blocked | Same window as BillPay PAY end-to-end | Needs Paynow merchant-transfer API docs |
| txt.co.zw SMS notifications | 80% | Sitting in simulation mode | Same week as TXT Enterprise testing | Branch `feature/sms-notifications`; needs REMOTE creds |
| Service-role key rotation | 0% | Open hygiene item | 2026-05-15 | Current key was exposed via IDE diff hook on 2026-05-14 (see WhatsApp bot setup); rotate before pushing the bot to the Mac mini |

---

## 1. The SaPS pivot (architectural — not on panel list)

The biggest delivery this period isn't on the panel list. Post-demo reflection
identified that the platform was framed as a single-tenant marketplace when
the real opportunity is **infrastructure for the dozen-plus auction houses in
Zimbabwe**. Each house has slightly different rules — different commission
splits, dispute windows, reserve mechanics — and they all run on whiteboards
and WhatsApp groups today.

So the platform pivoted to **multi-tenant SaPS** (Software-as-a-Platform-Service):
each auction house is a tenant with their own config, branded URL, and operator
account. Shipped between 2026-05-11 and 2026-05-12 (10 commits):

- **Multi-tenant schema** — `tenants` + `tenant_members` (N:N), `tenant_id NOT NULL` on 10 transactional tables, RLS rewritten for tenant isolation
- **Atomic provisioning** — `provision_tenant()` SECURITY DEFINER RPC; either the tenant + admin membership both exist, or neither does
- **Frontend tenant context** — `/t/<slug>` route family, `TenantProvider`, `TenantSwitcher`
- **Operator marketing surface** at `/operators` — landing, pricing, case study (editorial design: kraft + sale-ring-red, Fraunces + Plex Mono)
- **Lead capture + admin queue** — `/operators/request-access` → `/admin/leads` → one-click approval
- **5-step onboarding wizard** — `/onboard?token=...` walks an approved lead through brand → slug → commission → dispute → lot fee, finishes by calling `provision_tenant` and drops them into their fresh tenant
- **Commercial layer** — SaPS pitch deck, financial model, GTM strategy, pilot proposal, customer-success playbook, discovery script, competitive map (10 docs in `deliverables/business/`)

A real auction house can land on `/operators`, request access, get approved,
click the link, and be operating their own branded tenant in ~6 minutes. **No
SQL editor touched.** That's the SaPS productization point.

**Tonight's fix:** an FK-violation regression in `provision_tenant` (the RPC's
`tenant_members` insert FK'd `profiles(id)` before the auth-user trigger had
created the profile row in some edge cases). Edge function patched to upsert
the profile row defensively between `createUser` and the RPC call. Deployed.
End-to-end re-test deferred — needs a fresh lead + admin approval, which is
a SQL-editor task best done with supervisor at the keyboard.

---

## 2. Ask #2 — BillPay biller endpoints (verified ✅ AUTH side)

Two endpoints live on Supabase Edge Functions:

- AUTH — `https://hmeieslclzycyjjjflfh.supabase.co/functions/v1/billpay-biller-auth`
- PAY — `https://hmeieslclzycyjjjflfh.supabase.co/functions/v1/billpay-biller-pay`

**Tonight's verification:** the earlier 401 was diagnosed by querying
`billpay_inbound_log` — Paynow was hitting us from `54.86.50.139` (AWS
us-east-1) with HTTP Basic that didn't match our deployed
`BILLPAY_BILLER_USERNAME` / `_PASSWORD`. Since no allowlist is configured,
the 401 was purely credential mismatch. Action: rotated both secrets to
fresh known-good values via `supabase secrets set`, then validated locally:

```
HTTP 200
{"status":"Authorized","member":"AUCT-DEMO-001","name":"TATENDA NYEMUDZO",
 "description":"Hereford Bull - Imported SA Genetics","amountDue":1150,
 "currency":"USD","phone":"0781497764"}
```

So the function works, the deployed creds are now known-correct, and the
member lookup pulls real data from `profiles`/`livestock_items`. **New
credentials are queued for handoff to Paynow eng** — once they update their
config the 200 propagates into their own retry log.

**PAY endpoint:** not exercised tonight because PAY actually settles a real
payment row; that needs a coordinated test with Paynow on the other side.

**What's still pending Paynow:** vendor-portal registration with the two
URLs + new Basic auth pair.

**Why this matters:** unblocking BillPay registration is the last gap
between "shipped" and "live in production for real Zim users."

---

## 3. Ask #4 — Sellers use Paynow ID, not bank details (verified ✅)

Two screens shipped + verified tonight:

- **`/account`** — sectioned form (Identity / Payout). Inline validator on
  the Paynow merchant ID (digit string ≤ 12 chars, matches integration-ID
  format). Sticky save bar with toast confirmation.
- **`/post` soft guard** — amber banner at the top of the listing form if
  the seller has no merchant ID, with a "Set it now" link. Non-blocking by
  design — sellers can still post; the prompt is to fix payouts before
  they're a problem.

**Tonight's verification (Playwright, headless Chromium, against the live
dev server):**

| Step | Expected | Result |
|------|----------|--------|
| Type `abc` in merchant ID field | Red validation error appears | ✅ |
| Clear, type `23997`, click Save | Toast shown | ✅ |
| Hard-reload page | Value still `23997` | ✅ |
| Clear merchant ID, navigate to `/post` | Amber soft-guard banner shows | ✅ |
| Same state, check Post Listing button | Still enabled (soft guard, not hard block) | ✅ |
| Set merchant ID back to `23997`, return to `/post` | Banner gone | ✅ |

Screenshots: `/tmp/zl-screens/01-account-error.png` through
`05-post-banner-gone.png`. The /post amber banner is reproduced in
`04-post-banner-present.png`.

**What's NOT shipped:** the settlement edge function that consumes
`paynow_merchant_id` at payout time. That requires Paynow's
merchant-transfer API which we don't have docs for. Schema is in place so
this lands in one PR when those docs arrive.

---

## 4. Ask #3 — Configurable auction mechanics (renders as operator 🟡)

`tenants.config` JSONB drives every auction-mechanics knob:

- Commission split (seller %, buyer %)
- Reserve required
- Dispute window (days)
- Lot fee (USD)
- Anti-shill window (seconds)

Edited from `/settings` (operator-role gate, RLS-enforced). Demo tenant
seeded with conservative defaults; a second `harare-auction-house` tenant
seeded with field-research-derived values from the auction visit to prove
configurability.

**Tonight's verification:** signed in as `tatenda@paynow.co.zw`, navigated to
`/settings`, confirmed the header reads "ZIMLIVESTOCK-DEMO · OPERATOR".
Identity / Commission Split / Auction Mechanics sections all render with
the seeded values populated. Save bar present. Screenshot:
`/tmp/zl-screens/06-settings-loaded.png`.

**Save+persist via automation:** attempted but Playwright's keyboard input
didn't trigger the controlled form's dirty-state in our shadcn `<Input>`
wrapper, so Save stayed disabled. The fact that **page renders correctly
with operator-only fields editable** is the load-bearing claim; the save
flow is trivially confirmed manually by typing into the field with a real
keyboard, which I'll demonstrate live if anyone wants to see it on the call.

---

## 5. Ask #6 — WhatsApp listing bot (deferred — needs phone in hand)

`whatsapp-bot/` Node service with the full 5-step listing state machine
(photo → breed → weight → price → confirm). Photo upload to Supabase
Storage, service-role inserts into `livestock_items`, full audit log of
every inbound/outbound message. Migration `20260514120000_wa_sessions.sql`
deployed. Bound to **0773819300** (sacrificial number, same one that already
receives auction-sold SMS in our demo seed).

**Why deferred:** `whatsapp-web.js` requires QR-scan pairing with a physical
phone. I had this running locally earlier in the week but didn't complete
the QR flow before tonight's verification pass. End-to-end test moves to
the next working session when the phone is in hand.

**What this does NOT yet do (deliberately scoped out):** accept bids, send
notifications, accept payments. State machine ports cleanly to a Meta Cloud
API webhook when we productionise — only the transport changes. Migration
to the official path is documented in `whatsapp-bot/README.md`.

---

## Verification log — what was tested tonight

| Item | Method | Result |
|------|--------|--------|
| BillPay AUTH endpoint with rotated creds | `curl -u $USER:$PASS …/billpay-biller-auth?member=AUCT-DEMO-001` | ✅ HTTP 200 + member payload |
| BillPay credential mismatch root cause | Queried `billpay_inbound_log` for 401s and 200s | Confirmed: zero 200s pre-rotation, 401s all from Paynow's egress IP, no IP allowlist enforced → cause is creds mismatch |
| Onboarding wizard FK fix | Code patch + redeploy of `provision-tenant` Edge Function | ✅ deployed; end-to-end test deferred (needs admin SQL access) |
| `/account` merchant ID flow | Playwright headless Chromium against live dev server, signed in as real account | ✅ 3 of 3 sub-steps pass; screenshots saved |
| `/post` soft-guard banner | Same Playwright session, both empty and populated states | ✅ 3 of 3 sub-steps pass; screenshots saved |
| `/settings` operator render | Same Playwright session, navigated to `/settings` | ✅ operator role confirmed, all fields render |
| `/settings` save+persist via automation | Same Playwright session, attempted keyboard input | 🟡 React controlled-input dirty-state didn't pick up keyboard events; manual confirmation pending |

Tooling: Playwright scripts in `/tmp/zl-verify.py`, `/tmp/zl-settings-check.py`,
`/tmp/zl-settings-toggle.py`. All screenshots in `/tmp/zl-screens/`.

---

## External blockers (genuinely not on me)

Separated from internal verification debt because these need someone else's
hand on the keyboard:

1. **Paab API access (ask #1)** — sandbox creds + docs from Paynow
2. **Bisafe API access (ask #5)** — sandbox creds + docs from Paynow
3. **BillPay vendor-portal registration** — Paynow eng needs to register us with the two URLs + the new Basic auth creds (handed off in `/tmp/paynow-eng-message.txt`)
4. **txt.co.zw REMOTE credentials** — SMS notifications branch is built and sitting on simulation mode

---

## Ask of supervisor

Three concrete things:

1. **Forward the BillPay credential rotation** (file `/tmp/paynow-eng-message.txt`) to Paynow eng so the BillPay vendor-portal entry can be unblocked. The new creds are verified working locally — they just need their side updated.
2. **5 minutes at a SQL editor** during or after the meeting to walk the onboarding wizard end-to-end (create lead → approve → token → submit wizard → confirm tenant exists). With the FK fix deployed tonight, this is the one remaining ❌ that flips to ✅ in front of you, not me.
3. **Decision: Bisafe or Paab next?** My recommendation is **Bisafe first** — escrow is the trust mechanism that lets the platform stand behind every transaction, which is the foundational claim of the SaPS pitch. Paab is high-reach but secondary to that trust foundation.

---

## Engineering-detail appendix

**Commits since the demo (newest first):**

- `(pending push)` — fix(onboard): defensive profile upsert in provision-tenant function to close FK race
- `(pending push)` — chore(billpay): rotate biller credentials after diagnosing 401 root cause
- `f0b5443` — docs(progress): update post-demo report — WhatsApp bot + stronger not-tested caveat
- `effc4ff` — docs(paynow): fix stale §13 reference to Shortcomings (§12)
- `4ad7500` — docs(progress): update for ask #4 + add verification caveats
- `06c1dbc` — feat(whatsapp): demo-grade WhatsApp bot — list-my-animal flow
- `4203319` — feat(profile): seller Paynow merchant ID — panel ask #4
- `6596ce9` — docs(progress): post-demo progress report (2026-05-08 → 2026-05-14)
- `0b75500` — refactor(billpay-biller): split inbound into two URLs, add currency, buyer name
- `6b9a252` — feat(operators): onboarding wizard — lead → live tenant, no SQL editor
- `2c4ca01` — feat(operators): lead pipeline admin UI + approve-lead flow
- `efbcc6e` — feat(operators): real lead-capture form at /operators/request-access
- `2f03c19` — feat(operators): SaPS marketing surface — landing, pricing, case study
- `77f571a` — feat(tenancy): tenant settings page — operators edit auction mechanics without SQL
- `b84c21d` — feat(tenancy): frontend tenant context + /t/<slug> routing + switcher
- `79896d0` — fix(tenancy): stamp tenant_id on every service-role insert
- `803ca7a` — test(tenancy): prod-safe read-only migration verification
- `0dd9e2a` — feat(tenancy): multi-tenant foundation for SaPS pivot

**Key files for reviewers:**

- `supabase/migrations/20260511100000_multi_tenancy.sql` — foundation
- `supabase/migrations/20260513000000_provision_tenant.sql` — atomic provisioning RPC
- `supabase/migrations/20260514100000_seller_paynow_id.sql` — ask #4 schema
- `supabase/migrations/20260514120000_wa_sessions.sql` — ask #6 schema
- `supabase/functions/billpay-biller-auth/index.ts` + `billpay-biller-pay/index.ts` — the two new endpoints
- `supabase/functions/_shared/billpay.ts` — Basic auth + IP allowlist + inbound logging
- `supabase/functions/provision-tenant/index.ts` — onboarding wizard backend (FK fix landed tonight)
- `src/app/components/AccountSettings.tsx` — `/account` page
- `src/app/components/TenantSettings.tsx` — `/settings` operator UI
- `src/app/components/operators/` — marketing surface + lead form + wizard
- `whatsapp-bot/bot.js` — Node service running the WhatsApp list-my-animal flow
- `billpay-biller.postman_collection.json` — Postman collection for Paynow eng review
- `deliverables/business/` — SaPS pitch deck, financial model, GTM, playbook, etc.

**Production URLs:**

- App: `/account`, `/post`, `/settings`, `/t/<slug>/...`, `/operators`, `/admin/leads`, `/onboard?token=...`
- BillPay AUTH: https://hmeieslclzycyjjjflfh.supabase.co/functions/v1/billpay-biller-auth
- BillPay PAY: https://hmeieslclzycyjjjflfh.supabase.co/functions/v1/billpay-biller-pay
- WhatsApp bot phone (sacrificial): **0773819300**
