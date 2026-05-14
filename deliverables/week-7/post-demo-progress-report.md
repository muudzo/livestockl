# Post-Demo Progress Report

**Period covered:** 2026-05-08 (demo day) → 2026-05-14
**Author:** Tatenda Nyemudzo (Paynow Internship — NHL Stenden CMD Y3)
**Audience:** Supervisor + Paynow stakeholders who attended the 8 AM demo

---

## TL;DR

In the six working days since the demo, **two of the six panel asks are shipped and deployed to production** (BillPay biller + auction mechanics), **one is unblocked and scopable in half a day** (Paynow ID for sellers), and **three are blocked on external credentials** (Paab, Bisafe, txt.co.zw). On top of the panel list, the product framing pivoted from "ZimLivestock the marketplace" to "ZimLivestock the SaPS platform" — multi-tenant infrastructure so any auction house in Zimbabwe can run their own branded marketplace on the stack. End-to-end, deployed.

---

## Status against panel asks (2026-05-08)

The six asks were captured verbatim from the demo panel. Status as of 2026-05-14:

| # | Panel ask | Status | Detail |
|---|-----------|--------|--------|
| 1 | Cash payments via Paab | **Not started** | Awaiting Paab API docs / sandbox access from Paynow |
| 2 | Platform must be a BillPay biller | **Shipped & deployed** | Two endpoints live, idempotent, currency-validated, returns buyer name. See section 2 below. |
| 3 | Figure out auction mechanics | **Shipped** | Per-tenant settings UI — commission split, reserve required, dispute window, lot fee. No SQL needed. |
| 4 | Sellers register Paynow ID, not bank details | **Not started, unblocked** | Half-day scope: schema change + profile-edit field swap. Picking this up next. |
| 5 | Bisafe escrow for settlement | **Not started** | Awaiting Bisafe API docs / sandbox access from Paynow |
| 6 | Maximise accessibility (USSD reach) | **Partial** | Ask #2 indirectly enables USSD payment via Paynow's BillPay menu. Full USSD bidding flow not yet built. |

**Net: 2 shipped, 1 partial via #2, 1 unblocked-and-ready, 2 blocked on Paynow-supplied credentials.**

---

## 1. Ask #3 (auction mechanics) — shipped

Field research at physical auction houses showed every house runs slightly
different operational rules: different commission splits, different reserve
behaviour, different post-auction dispute windows, different per-lot fees. The
demo platform had none of this configurable.

**What shipped:**

- `public.tenants` table with a JSONB `config` per tenant
- Operator-facing settings UI at `/t/<slug>/settings` — sectioned form (Identity
  / Commission split / Auction mechanics) with sticky save bar
- Two tenants seeded with distinct configs to prove the configurability:
  - `zimlivestock-demo` — defaults (commission 3%/5%, US$0 lot fee, 3-day dispute, no reserve)
  - `harare-auction-house` — 5%/7% split, US$25 lot fee, 7-day dispute, reserves required
- Split RLS policy: tenant admins get full UPDATE, operators get config-only UPDATE
  (so an operator can tune mechanics but not rename the tenant)

**How to verify:** log in as a tenant admin → `/t/zimlivestock-demo/settings`
→ change a value → save → reload. Persists.

---

## 2. Ask #2 (BillPay biller) — shipped

Paynow asked us to expose two endpoints they can call when a buyer settles an
auction reference via the BillPay menu (USSD, EcoCash app, etc.). The first
cut shipped on demo day had three gaps the panel called out; all three closed
in this period.

**Gaps closed (commit `0b75500`):**

1. PAY now accepts `currency` in the request body, validates it's USD, and
   returns an explicit 400 with the supported list on anything else.
2. AUTH `name` now returns the buyer's name (joined from `profiles`); lot title
   moved to a separate `description` field — matches BillPay convention where
   `name` is the account holder.
3. Split from a single dispatcher (one URL with an `action` field) into two
   separate URLs, per Paynow's preference.

**Live endpoints:**

- AUTH — `https://hmeieslclzycyjjjflfh.supabase.co/functions/v1/billpay-biller-auth`
- PAY — `https://hmeieslclzycyjjjflfh.supabase.co/functions/v1/billpay-biller-pay`

**Idempotency contract (PAY):** same `paynowReference` returns byte-identical
`200 Paid` on every retry. Different `paynowReference` against an
already-settled member returns `409 AlreadyPaid`. Enforced at two layers —
application short-circuit + partial unique index on
`payments.paynow_reference WHERE method='BillPay'`.

**Auth:** HTTP Basic via Supabase secrets (`BILLPAY_BILLER_USERNAME`,
`BILLPAY_BILLER_PASSWORD`), plus optional IP allowlist
(`BILLPAY_BILLER_ALLOWED_IPS`). Every inbound call logged to
`public.billpay_inbound_log` for reconciliation + audit.

**Response shapes:**

| Endpoint | Status | Code |
|----------|--------|------|
| AUTH | Authorized / AlreadyPaid | 200 |
| AUTH | NonExistent | 404 |
| PAY | Paid (first call + idempotent retry) | 200 |
| PAY | Failed — missing field / amount mismatch / unsupported currency | 400 |
| PAY | NonExistent | 404 |
| PAY | AlreadyPaid (different `paynowReference`) | 409 |
| Both | Unauthorized | 401 |

**Tooling for Paynow engineering review:**

- Postman collection at repo root
  (`billpay-biller.postman_collection.json`) — pre-wired Basic auth,
  variables, and saved example responses for every status above
- Integration reference docs in `deliverables/week-6/` with file:line code
  references — written for Paynow senior engineers to audit in-tree
- API spec at `deliverables/week-7/billpay-biller-api-spec.md`

**What's left:** Paynow needs to register us in the BillPay vendor portal with
the two URLs above + the Basic auth creds.

---

## 3. Bonus delivery: SaPS pivot (not on panel list)

The framing shift that wasn't on the demo list but came out of post-demo
strategic reading (Fingent custom-enterprise-software framework, five
dimensions). Decided to fix the customer-visible gaps — no multi-tenancy, no
onboarding flow, no operator-facing marketing surface, no service contract
framing — in shippable slices over the rest of the internship.

**Shipped between 2026-05-11 and 2026-05-12 (10 commits):**

- **Multi-tenant schema** — `tenants` + `tenant_members` (N:N: a user can be
  admin of one tenant and buyer of another), `tenant_id NOT NULL` FK on 10
  transactional tables, RLS rewritten to enforce membership, helper functions
  (`user_tenant_ids`, `user_has_role`, `default_user_tenant`) installed as
  column defaults so authenticated callers can't accidentally skip the stamp
- **Atomic provisioning** — `provision_tenant()` SECURITY DEFINER RPC so a
  half-created tenant is impossible (either the tenant + the admin membership
  both exist, or neither does)
- **Frontend tenant context** — `/t/<slug>` route family, `TenantProvider` +
  `TenantSwitcher`, React Query hook for memberships so invalidation propagates
- **Tenant settings UI** at `/t/<slug>/settings`
- **Operator marketing surface** at `/operators` — editorial design (kraft +
  ink + sale-ring-red, Fraunces + Newsreader + IBM Plex Mono), landing,
  pricing, case study
- **Lead-capture form** at `/operators/request-access` — honeypot for spam,
  Resend hook for transactional email, anon INSERT gated to `status='new'`
  only
- **Admin review queue** at `/admin/leads` — status pills + one-click approval
  flow, super-admin email allowlist (`SUPER_ADMIN_EMAILS` server,
  `VITE_SUPER_ADMIN_EMAILS` client)
- **5-step onboarding wizard** (`/onboard?token=...`) — one-time `onboard_token`
  with 14-day TTL, walks an approved lead through brand → slug → commission
  split → dispute window → lot fee, finishes by calling `provision_tenant`
  and dropping the new admin into their fresh tenant dashboard

**End-to-end:** a real auction house can land on `/operators`, request access,
get approved, click the onboarding link, and be running on their own branded
tenant in ~6 minutes. **No SQL editor is touched.** That's the SaPS
productization point.

**Architectural notes worth flagging:**

- Service-role inserts across 9 edge functions were audited and patched to
  stamp `tenant_id` explicitly (commit `79896d0`) — the column default only
  fires for authenticated callers, not service role
- Cross-tenant SELECT is blocked at the database layer (RLS), not at the
  application layer. Verified via `supabase/tests/multi_tenancy_smoke.sql`
  (impersonates two users in different tenants and asserts only their own
  data is visible)

---

## Blockers I need help unblocking

These are the dependencies preventing me from picking up more of the panel
asks:

1. **Paab API access (ask #1)** — sandbox creds + API docs from Paynow
2. **Bisafe API access (ask #5)** — sandbox creds + API docs from Paynow
3. **txt.co.zw REMOTE credentials** — SMS notifications branch
   (`feature/sms-notifications`) is built and sitting on simulation mode
4. **Paynow BillPay vendor portal registration** — endpoints live, but Paynow
   needs to add us to the catalog with the two URLs + the Basic auth creds

---

## What I'd like to land next — supervisor call

- **Quick win**: ask #4 (Paynow ID for sellers) — half-day scope, no external
  dependency. I can pick this up immediately if you greenlight.
- **Documentation refresh**: update
  `deliverables/week-6/billpay-supabase-integration.md` to reflect the new
  two-URL structure so Paynow's engineering team has a single source of truth
  for the live design
- **Strategic**: pick between Paab (ask #1) and Bisafe (ask #5) as the next
  major workstream once credentials land. My recommendation: **Bisafe first**
  — escrow is the trust mechanism that lets the platform stand behind every
  transaction, which is the foundational claim of the SaPS pitch. Paab is
  high-reach but secondary to that trust foundation.

---

## Engineering-detail appendix

Items that may interest reviewers wanting to audit the work:

**Commits since the demo (newest first):**

- `5d2c781` — docs(session-log): 2026-05-14 — post-demo status against panel asks
- `0b75500` — refactor(billpay-biller): split inbound into two URLs, add currency, buyer name
- `7465137` — docs(session-log): 2026-05-11 — SaPS pivot shipped end-to-end
- `7bfd413` — chore(operators): point all contact references at tatenda@paynow.co.zw
- `6b9a252` — feat(operators): onboarding wizard — lead → live tenant, no SQL editor
- `2c4ca01` — feat(operators): lead pipeline admin UI + approve-lead flow
- `efbcc6e` — feat(operators): real lead-capture form at /operators/request-access
- `2f03c19` — feat(operators): SaPS marketing surface — landing, pricing, case study
- `77f571a` — feat(tenancy): tenant settings page — operators edit auction mechanics without SQL
- `b84c21d` — feat(tenancy): frontend tenant context + /t/<slug> routing + switcher
- `b8412e3` — docs(business): verification + fixes — 4 blockers, 8 issues, nits
- `79896d0` — fix(tenancy): stamp tenant_id on every service-role insert
- `561f205` — docs(business): MD pitch deck, financial model, playbook, discovery script, competitive map
- `803ca7a` — test(tenancy): prod-safe read-only migration verification
- `0dd9e2a` — feat(tenancy): multi-tenant foundation for SaPS pivot
- `7e761de` — docs(business): SaPS business case + GTM strategy + pilot proposal

**Key files for reviewers:**

- `supabase/migrations/20260511100000_multi_tenancy.sql` — foundation
- `supabase/migrations/20260513000000_provision_tenant.sql` — atomic provisioning RPC
- `supabase/functions/billpay-biller-auth/index.ts` + `billpay-biller-pay/index.ts` — the two new endpoints
- `supabase/functions/_shared/billpay.ts` — Basic auth + IP allowlist + inbound logging
- `supabase/tests/multi_tenancy_verify.sql` — prod-safe verification (run in Supabase SQL editor)
- `src/app/components/operators/` — marketing surface + lead form + wizard
- `src/app/components/admin/LeadAdmin.tsx` — admin review queue
- `billpay-biller.postman_collection.json` — ready for Paynow engineering to import

**Production URLs:**

- App: https://app.zimlivestock.com (or your Vercel domain)
- Operators marketing: `/operators`
- Lead form: `/operators/request-access`
- Admin queue: `/admin/leads` (super-admin only)
- Onboarding: `/onboard?token=...` (one-time, 14-day TTL)
- Tenant route family: `/t/<slug>/...`
- BillPay AUTH: https://hmeieslclzycyjjjflfh.supabase.co/functions/v1/billpay-biller-auth
- BillPay PAY: https://hmeieslclzycyjjjflfh.supabase.co/functions/v1/billpay-biller-pay
