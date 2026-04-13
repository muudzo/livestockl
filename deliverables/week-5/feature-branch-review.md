# Feature Branch Review — Supervisor Brief

**Prepared:** 2026-04-13
**Scope:** Two branches awaiting review before merge to `main`
**Context:** ZimLivestock PWA, Paynow internship project. `main` shipped Phase 1 + Phase 2 hardening today; both branches below were forked before that cycle and need rebase attention.

---

## Executive summary

| Branch | Verdict | One-line justification |
|---|---|---|
| `feature/sms-notifications` | **Needs work** | Architecturally broken client-side dispatch + regresses two features already shipped on main |
| `feature/tawkto-livechat` | **Hold** | No staffing plan; third-party PII access on every page; zero rebase work done in 13 days |

Both branches forked from commit `a6b5651` (March 31). `main` has advanced **70 commits** since. Naive merges will conflict heavily and silently regress shipped features.

---

## `feature/sms-notifications`

### What it does
Adds SMS notifications via **txt.co.zw** (Zimbabwean SMS provider) — primarily outbid alerts, payment confirmations, and auction-ended notices for buyers/sellers.

### Scope
- **6 commits** ahead of main
- **+1,114 LOC / 9 files**
- New edge function `send-sms` (reusable, Basic Auth to txt.co.zw, 10/user/hr rate limit, simulation mode)
- Wired into `payment-webhook`, `end-auctions`, and `usePlaceBid`
- New `sms_log` DB table for audit/cost tracking
- New env vars: `TXT_USERNAME`, `TXT_PASSWORD`
- Per-message cost: **US$0.03**

### External dependencies
- New vendor: txt.co.zw (Zimbabwe-registered SMS gateway)
- Credentials stored as Supabase secrets
- No new npm dependencies (edge function is fetch-only)

### Risks / concerns

1. **Client-side outbid dispatch is architecturally broken.** The branch calls `supabase.functions.invoke("send-sms", ...)` from `usePlaceBid` in the browser. But `send-sms` is guarded by service-role auth to prevent abuse — a client invocation will be rejected by the guard and the SMS will never send. **Silently broken in production.** Needs to be moved into a server-side trigger (DB trigger, or invocation from within the edge function that handles bid placement).

2. **No daily cost cap in code.** The plan document mentions a US$5/day cap but the implementation has no enforcement. A misbehaving loop or spam attack could exceed budget in minutes at US$0.03/SMS.

3. **No opt-out column on profiles.** Users cannot decline SMS. POPIA/Zimbabwe Data Protection Act compliance risk for non-consensual marketing-adjacent messages.

4. **`place_bid` SQL rewrite deletes functionality already shipped on main.** The branch's version of the `place_bid` RPC removes the seller-on-new-bid notification and the multi-bidder outbid loop that was added to main after the fork. A naive merge will silently regress shipped behaviour.

5. **`useBids.ts` removes the polling fallback added to main.** Same silent-regression risk — the realtime-drop safety net disappears.

### Merge recommendation

**Needs work.** Do NOT merge as-is. Required before merge:

- [ ] Rebase onto current `main` (resolve 70-commit gap)
- [ ] Fix outbid dispatch to run server-side (DB trigger or webhook invocation)
- [ ] Add daily cost cap enforcement in `send-sms` (query `sms_log` sum per-day, reject over cap)
- [ ] Add `sms_opt_out` column to profiles + respect it in `send-sms`
- [ ] Preserve main's `place_bid` notification loop and `useBids.ts` polling fallback

### Decisions to ask supervisor

1. **Approve sending real SMS in production?** US$0.03 × expected monthly volume (estimate provided at merge time). Kill switch in place?
2. **Scope of consent flow?** Opt-in by default at signup, or opt-out UI in settings only?
3. **Is txt.co.zw the committed vendor, or should we benchmark 1-2 alternatives?** Reliability data from their side is thin; no SLA shared yet.

---

## `feature/tawkto-livechat`

### What it does
Embeds the **Tawk.to** live-chat widget in every page of the app via `Root.tsx`. Auto-passes user's name, email, and phone to Tawk.to when logged in.

### Scope
- **1 commit** ahead of main (branch is the merge-base itself — zero work in 13 days)
- **+185 LOC / 4 files**
- Tawk.to JavaScript widget loaded on every route
- Free tier vendor

### External dependencies
- Third-party JS from `tawk.to` on every page load (performance + privacy vector)
- No new npm dependencies (script is injected dynamically)
- Free-tier account (no paid contract yet)

### Risks / concerns

1. **No staffing plan.** A live-chat widget with no one answering is worse than no chat at all — users bounce when messages go unread. Who staffs this, in what hours, and on what SLA?

2. **Third-party script with PII access on every page.** Tawk.to can read name, email, phone, and via script context can see any listing/bid content the user is viewing. Consent flow, privacy policy update, and vendor security review are all prerequisites.

3. **POPIA + Zimbabwe Data Protection Act data-residency.** Tawk.to is US-hosted. Zimbabwean user conversations would leave the country. Either acceptable with explicit consent, or a blocker — supervisor call.

4. **Free-tier vendor lock-in.** Free tier has no SLA and Tawk.to retains rights to use branding. Paid tier starts ~US$19/mo/agent. Cost will scale with volume.

5. **Zero rebase work in 13 days.** Suggests branch is stale / deprioritized, or the author is blocked on the questions above. Either way, not mergeable today.

### Merge recommendation

**Hold.** Do not merge until:

- [ ] Staffing commitment (who, when, SLA)
- [ ] Privacy policy + consent flow drafted
- [ ] POPIA data-residency question resolved
- [ ] Branch rebased onto current `main`

### Decisions to ask supervisor

1. **Are we ready to offer live chat at all?** If there's no one to staff it, better to ship nothing than to ship a chat that ignores users.
2. **Free-tier Tawk.to acceptable, or do we need a paid tier / local alternative (e.g. a WhatsApp Business link)?** WhatsApp is free, staff-async-friendly, and already installed on every Zimbabwean phone.
3. **POPIA sign-off required before we ship or can we accept the risk with a disclosed consent flow?**

---

## Recommended sequencing

1. **Tawkto — decide go/no-go first.** If no-go, close the branch and add a WhatsApp Business link instead (10 minutes of work). If go, block on staffing commitment.
2. **SMS — rebase + fix architectural issues.** Outbid dispatch fix is non-negotiable; the rest is policy.
3. **Phase 3 UX polish + smoke test prod** before any feature-branch merge. Don't compound branches into an unstable base.
