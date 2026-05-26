# ZimLivestock — Weekly Reflection

**Intern:** Tatenda Nyemudzo
**Host:** Paynow Zimbabwe (Webdev / Softwarehouse) — Developer Experience team
**Period covered:** 12 March 2026 → 26 May 2026 (~11 weeks)
**Compiled:** 26 May 2026

This document is the chronological reflection over the project — week-by-week, what was learnt, what worked, and what failed or required a workaround that can fairly be called a failure point. Every entry is grounded in a session log, a deliverable, or a commit. Companion to [`PROJECT_FINAL_SUMMARY.md`](PROJECT_FINAL_SUMMARY.md) (which gives the *outcome*) — this is the *journey*.

For supervisor reading: the **Failure Points** column is the most useful one. They are kept honest on purpose. The reflection is more valuable as evidence of learning than as a victory lap.

---

## Week 1 — Foundation (12–20 March 2026)

**Focus:** field research, DX benchmark setup, prototype scaffolding.

### Things learnt

- **What looks like technical debt from a Western-startup vantage point is often a deliberate accommodation of the operating environment.** Form-encoded POSTs, SHA-512 hashes, USSD push prompts — these aren't legacy; they're matched to feature-phone Zimbabwe. My first instinct on day one was to "modernise" things. That instinct was wrong.
- **Going to the auction floor in person beats two weeks of online research.** Eight findings from one Saturday at a working cattle auction (deposit barrier, fee structure, ~45 active bidders, ~90-second lots, trust hierarchy) shaped the platform's commission model, reserve logic, and seller onboarding. The gap between "researching online" and "sitting in the shed" was much bigger than I expected.
- **Best-in-class developer DX has a human element.** Paystack's onboarding came with a named CSM (Seike) emailing within 48 hours and a YouTube integration walkthrough. That single touch is the highest-ROI DX investment Paynow could replicate — and it's not technical.
- **Some integration blockers are environmental, not architectural.** Paynow's API behind Cloudflare bot protection is a deployment topology decision, not a code bug. Recognising that early reframed it from "fix this" to "document this as a finding".

### Things done well

- **Five providers benchmarked instead of three.** Hands-on integration into the same codebase, not paper comparison. Real production credentials, real first-attempt experiences. The methodology — deliberately lazy, one shot per provider — is what made the findings credible.
- **Same-codebase comparison.** Every provider got its own `test-<provider>-checkout` edge function plugged into the same `initiate-payment` shape. This made the LOC and time-to-200 numbers actually comparable.
- **Field research came back as 8 traceable product decisions**, not 8 bullet points in a Google Doc. Stock-card upload, fee transparency, 90-second auction cadence, trust badges — every one of them shipped because of something I saw on the floor.
- **Documentation was inline, not afterthought.** The 21-pitfall catalogue, per-provider DX notes, and pitfall doc were written *as* I integrated, not reconstructed later. This is why they read as honest first-attempt evidence.

### Failure points + workarounds

- **Paynow Core API unreachable from Supabase Edge Functions.** TCP RST from Cloudflare bot protection. Tested across 6 client stacks (curl, Node.js, Deno, SDK, local Express on Zimbabwean network) — all failed. *Workaround:* later shipped a Cloudflare Worker relay (`paynow-relay.zimlivestock.workers.dev`) that accepts form-encoded POSTs and forwards to Paynow. Added 400–800 ms of latency. **Failure-point classification:** this is the single biggest blocker the project hit, and the workaround is also the central piece of evidence in the Ecosystem Retrospective.
- **Pesepay returns malformed HTTP response headers.** Crashes Deno's strict parser. Incompatible with Supabase Edge Functions, Cloudflare Workers, or any strict-HTTP runtime. *No clean workaround* — recorded as a DX finding and excluded from runnable integrations.
- **DPOpay sandbox gated behind KYC.** Cannot access test credentials without business-registration documents. Every other provider issued test keys with email verification. *Workaround:* excluded from the benchmark and documented as a DX finding.
- **2nd auction visit not done by 25 March deadline.** Logged as a gap in the tracker. Recovered later (deep-dive visit on 25 March, written up as a separate research artefact).

---

## Week 2 — Consolidation + research deepening (23–29 March 2026)

**Focus:** branch consolidation, security key rotation, second field visit.

### Things learnt

- **A second visit to the same auction surfaces patterns the first visit cannot.** The 25 March deep-dive produced the *Active Bidders per Listing (ABL)* metric — the leading indicator of auction-economic viability. Wasn't visible on visit 1.
- **Leaked tokens are not a "later" problem.** Rotating the Paynow integration key + Supabase access token early forced the discipline of `.env.local` + Supabase secrets that the rest of the project relies on.

### Things done well

- **10 branches → 1 main.** Cleaned up the branch state before it became unmanageable. Deleted 3 dead branches (`backup/main-before-merge`, `benchmark/paystack`, `benchmark/stripe`) and consolidated the rest.
- **`.gitignore` for confidential API docs.** BillPay vendor docs + TXT API reference are gitignored — they exist in the working tree for development but never go into commits.

### Failure points + workarounds

- **Initial commits had hardcoded tokens in `.claude/settings.json`.** Discovered during the key rotation. *Workaround:* purged from settings, moved to `~/.zshrc` and Supabase secrets, but the historical commits still contain the tokens — would need a `git filter-repo` to fully scrub if this codebase ever went public. Logged as residual risk.

---

## Week 3 — The Go-backend pivot + Paynow primary (30 March – 5 April 2026)

**Focus:** stack consolidation onto Supabase, Paynow becomes primary payment rail.

### Things learnt

- **Building both a Go backend (4,223 lines) and a Supabase stack in parallel was a mistake.** They were redundant. Removing the Go backend (−9,548 lines, 43 files deleted) was the right call but two weeks late. Lesson: pick the stack early and commit; don't keep two architectures alive "just in case".
- **The Paynow `authemail` field is a silent failure mode.** Test integration 23997 requires `tatendawalter62@gmail.com` specifically — not the buyer's email. Documented in the pitfalls catalogue, but cost real debugging time. The error response said nothing useful.
- **Browser-relay-as-architecture is sometimes the right answer.** When server-to-server is blocked by Cloudflare, having the user's browser do the POST is a legitimate pattern, not a hack. Documented this as a DX finding rather than treating it as an embarrassment.

### Things done well

- **First successful Paynow test transaction.** `status=Ok`, valid `browserurl`, "Test Case: Success". After two weeks of Cloudflare wrestling, the first real green light.
- **`payment-webhook` handles both Paynow (form-encoded + SHA-512) and Stripe (JSON + signature) cleanly.** One function, two providers, dispatched on payload shape. No duplication.
- **Security hygiene early.** All secrets moved to `.env.local` + Supabase Edge Function secrets before any integration ship. CI never had a chance to leak them.
- **Parallel webhook work.** `payment-webhook` parallelises mark-sold + notify-buyer + fetch-seller (3 sequential round-trips → 1 concurrent). Small but representative — defaulting to `Promise.all` where there's no data dependency.

### Failure points + workarounds

- **EcoCash/OneMoney selections silently saved as "Card".** A `paymentMethod` field was dropped on the floor in the form-state pipeline. Every mobile-money payment was being mislabelled in our own database. *Fixed* — but only caught by manually inspecting the `payments` table during a test. Would have shipped to production undetected.
- **Stale pending payments blocked retries.** First payment attempt creates a `pending` row; a partial unique index prevents a second `pending` for the same listing. So *every retry* failed until we deleted the stale row. *Workaround:* `initiate-payment` now deletes stale `pending` rows older than its idempotency window before creating a new one. The right fix is a `payment_expiry` cron — still on the backlog.
- **Browser form submission showed raw Paynow response text instead of redirecting.** `form.submit()` followed Paynow's URL-encoded text response as if it were HTML. *Workaround:* switched to `fetch()` → parse response → manually `window.location = browserurl`. Now documented as pitfall #11.
- **pg_cron not enabled in Supabase.** Auctions didn't auto-end; had to manually trigger `end_expired_auctions`. *Workaround:* GitHub Actions cron hitting an Edge Function endpoint every minute. Works but is more fragile than `pg_cron`.
- **EcoCash not showing on Paynow payment page.** Merchant config issue, blocked for ~half a day. Resolved by switching to the test integration and re-reading the merchant-settings doc.

---

## Week 4 — Hardening sprint (6–12 April 2026)

**Focus:** taking the platform from 6.3/10 (do not deploy) to 9/10 (production-ready). 34 commits in a single day on 8 April.

### Things learnt

- **The "second opinion" multi-agent pattern catches things humans miss.** After manually fixing 4 critical vulnerabilities, four specialist agents (RLS auditor, code reviewer, performance analyzer, UX reviewer) running in parallel surfaced 8 more unauthenticated edge functions, a payment-crash bug, an unbounded query, and 16 files of accessibility issues. Sequential review would have missed at least half of them.
- **Audit *every* function, not just the ones that look dangerous.** I started by auditing the 6 agent functions and missed the test payment functions (Stripe/Paystack/Flutterwave/Pesepay) and QA tools (chaos-test, consistency-checker, security-agent). All were either creating real payment sessions or modifying prod data with zero auth. Caught only by the multi-agent round 2.
- **When you add auth to backend, grep for all frontend callers.** `useAutoRunAgents` was added before the CRON_SECRET gates and silently spammed 401s every 15 seconds for days. Lesson encoded.
- **Demo-mode tests can mask Supabase-connected bugs.** The payment `onSuccess` ReferenceError (referenced `method` from `mutationFn` scope — would crash *every* successful payment) was found by a code-review agent, not by tests, because tests ran in demo mode where `onSuccess` doesn't log. Demo-mode tests give false confidence on hot paths.

### Things done well

- **Pivoted correctly from feature work to hardening.** Morning plan was chat fixes, PWA testing, app icons. The audit revealed structural vulnerabilities. Killing the plan and pivoting the entire day to security was the right call. You don't ship features on a leaking foundation.
- **Fix-verify-deploy loop was tight.** Every security fix was immediately verified against production with `curl`: 403 on forged webhooks, 401 on unauthenticated agent calls, `pg_constraint` query confirming the US$100k payment cap. No checkbox ticked without evidence.
- **Phased commits with clean diffs.** Phase 1 → Phase 2 → Phase 3 as separate commits so rollback surgery is possible. Each commit has a clear "why" block. The git log reads like a story, not a heap.
- **Vendor chunk splitting + image thumbnails actually moved the needle for 3G users.** 519 KB monolith → 224/176/49 KB chunks; thumbnails via Supabase Storage render API (400 px on feed, 800 px on detail). Zero infrastructure work — used what was already provisioned.

### Failure points + workarounds

- **`_shared/logger.ts` was never committed.** Deployed to production earlier but never staged into Git. Every subsequent agent-function deploy failed with "Module not found." Lost 10 minutes diagnosing. *Lesson:* verify the repo can deploy from scratch on a clean clone.
- **Merge conflicts after 35-commit divergence.** Main and `feature/billpay-integration` had drifted on the webhook function — main had a structured Logger class, feature branch had a simple one. Manual three-way merge. *Lesson:* merge more frequently; don't let a feature branch run 35 commits ahead.
- **8 unauthenticated edge functions missed in the first audit.** Round 2 caught them. They had been live for days. *Failure point:* the audit scope was too narrow on the first pass.
- **`useAutoRunAgents` silently spamming 401s every 15 seconds.** No alerting; only noticed because the network panel was open during another debugging session. Hook was disabled until the CRON_SECRET-gated functions had a browser-safe alternative.

---

## Week 5 — PWA launch + the enterprise audit (13–19 April 2026)

**Focus:** PWA went live; user reported "things break"; parallel audit; 3 SEV-1s closed same day.

### Things learnt

- **Parallel specialist audits scale linearly with the number of agents.** 3 specialist agents (PWA config, build/runtime, functional) ran concurrently and surfaced 20 issues in ~2 minutes. Sequential walking would have taken hours and missed cross-domain interactions.
- **Silent CI failures are identical to no CI at all.** The `deploy-frontend` job had been failing for 3+ pushes because `VERCEL_TOKEN` was never added to GitHub Actions secrets. Production was stuck on a 1-day-old commit while three subsequent merges sat in the queue. Lesson encoded: README CI status badges would have surfaced this immediately.
- **Build-time assertions are cheaper than runtime detection.** Adding `vite.config.ts` hard-fail when `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are missing stopped one entire class of "we shipped mock-data to prod" bugs. Extending the pattern to all external integrations is on the backlog.

### Things done well

- **Three SEV-1s closed same-day after the enterprise audit:**
  1. `bf3da08` — direct-INSERT bids bypass. Any authed user could win any auction for $1 via `POST /rest/v1/bids`. Dropped the permissive INSERT policy; bids only insert via `place_bid()` RPC now.
  2. `921bc62` — CORS wildcard fallback. 7 user-facing edge functions had `|| "*"` on unset env; `initiate-payment` now has full allowlist, 6 others fail closed.
  3. `4cd7109` — paginated search broken. Was client `.filter()` on infinite-query pages; now server-side `Supabase.or(...ilike...)` with `useDeferredValue` and escape handling.
- **Phased commits per phase of the audit fix.** `84aed2e` (runtime crash + payment integrity), `5b0e1b0` (PWA correctness), `445d486` (CI hardening). Clean rollback surface.
- **Caught a circular import before commit.** First attempt at clearing demo favorites on logout created a `useFavorites ↔ authStore` cycle. Caught by inspection. Extracted to `src/stores/demoFavoritesStore.ts`.

### Failure points + workarounds

- **Paynow `0774444444` insufficient-funds case silently falls through to web-checkout fallback.** Paynow returns `status=error` in the `initiatetransaction` response; the edge function doesn't detect it and redirects to the generic web flow. User sees an unexpected redirect instead of a clear "insufficient funds" toast. *Workaround:* logged as a one-line fix; still pending implementation in `initiate-payment/index.ts:205-212`.
- **`PaymentStatus.tsx:128` copy says "Auto-checking every 5 seconds" — actually only polls the DB, not the provider.** If the webhook is delayed, the soft-timeout "Try Again" UX can fire on a legit delayed payment. *Workaround:* documented as a UX gap; `pollurl`-based active poll scoped but not yet shipped.
- **Server-returned `instructions` string ignored.** `initiate-payment` returns provider-specific USSD instructions but `PaymentStatus.tsx:98` hard-codes its own copy. *Workaround:* TODO logged.
- **CI deploy-frontend job silently failing for 3+ pushes.** *Failure point:* zero alerting on CI breakage. *Workaround:* shipped via `vercel deploy --prod --yes` from the CLI; planned removal of `amondnet/vercel-action@v25` in favour of inline `npx vercel`.
- **Vercel Preview env-vars rejected non-interactively.** Proposed cleaner path (configure Preview env vars then deploy) didn't survive contact with reality — the CLI plugin rejected "all preview branches" even with `--yes`, and the API rejected branch-scoped vars because there was no git integration. *Workaround:* `--build-env` inline, which turned out to be simpler. *Lesson:* spike the core command before committing to a 6-step plan.

---

## Week 6 — Presentation + Stanford SEED (20–26 April 2026)

**Focus:** 13-slide presentation deck (Slidev), Stanford SEED brief, deck dry-run.

### Things learnt

- **The framing of the DX gap matters more than the data.** "Paynow is bad" is a non-starter. "Paynow's own sibling products already implement the patterns Core needs" is actionable. The data is the same; the framing turns it into a roadmap.
- **A dry-run flips presentation prep from "anxiety" to "iteration".** First dry-run exposed 4 slides where the spoken cadence didn't match the on-screen flow. Fixing those after the dry-run was easier than fixing them during the actual demo.

### Things done well

- **3 code comparisons in the deck.** Not just "Paynow scored lower" — side-by-side Stripe vs Paynow snippets showing where the LOC delta comes from. Visual + technical + memorable.
- **Slidev as the deck tool.** Markdown-first, code-block-friendly, version-controlled. The deck is in the repo at [`deliverables/week-6/slides.md`](deliverables/week-6/slides.md) — reviewable in the same workflow as code.

### Failure points + workarounds

- **Stakeholder demos still outstanding at end of week.** Criterion #10 (2+ stakeholder demos with structured feedback) had 1 session run and 2 more scheduled. *Failure point* against the original timeline; the May 8 panel demo eventually covered it but the slip was real.

---

## Week 7–8 — Ecosystem integration + final demo prep (27 April – 10 May 2026)

**Focus:** BillPay + TXT integrated end-to-end into the live codebase; Ecosystem Retrospective written; final demo rehearsals.

### Things learnt

- **The TXT IP-allowlist is the same class of problem as the Paynow Cloudflare wall.** Both are environment-shape mismatches: Supabase Edge Functions have ephemeral IPs, both Paynow Core and txt.co.zw assume callers have stable IPs. Solving them with the *same* pattern (Cloudflare relay / Quick Tunnel from static-IP machine) is the case study in the Ecosystem Retrospective.
- **BillPay and TXT scoring 7.5/10 and 7/10 vs Core's 4.2/10 is the headline finding.** Paynow's own family already ships the patterns Core needs. The DX gap is internal-consistency, not capability. That reframes the recommendation set from "research" to "internal pattern adoption" — a much easier sell.
- **Senior-engineer integration writeups force you to defend every choice.** Writing the Paynow Core integration doc for *Paynow's own engineers* to audit ([`deliverables/week-6/paynow-supabase-integration.md`](deliverables/week-6/paynow-supabase-integration.md), 53 KB) was harder than building the integration. Every decision needed a citation; every workaround needed a defence. The writeup is sharper than the code because of it.

### Things done well

- **Live end-to-end demo on stage, 8 May 2026.** Three live agents pre-bidding on staggered auctions. Each agent win triggered: TXT SMS to buyer + TXT SMS to seller + Paynow Express USSD push to the buyer's phone. The panel saw a real US$0.02 USSD prompt arrive on the demonstrator's phone moments after the auction settled. Live end-to-end, on real phones, in front of leadership. Worked.
- **Ecosystem Retrospective with four independent evidence layers.** Time-to-first-200 per product, 8-criteria DX comparison table, three independent forum reports of the same Core blocker over 7 months, plus the working production workaround that quantifies the cost. Single-source claims don't survive scrutiny; four independent ones do.

### Failure points + workarounds

- **TXT requires IP allowlist; Supabase Edge IPs are ephemeral.** *Workaround:* Cloudflare Quick Tunnel from a static-IP Mac mini, documented as the relay pattern. Cost: an entire machine in the path for what should be a Supabase function call. Failure point in the system, not in our code.
- **Demo originally scheduled 07:34/07:37/07:40 — postponed to 08:00.** Agents fired at 08:04/08:07/08:10 (the cron picked up the next minute boundary after each scheduled time). The slight delays were visible to the panel. *Failure point:* didn't account for cron's minute granularity when scheduling demo events; should have built explicit "fire now" controls instead of relying on cron timing.
- **Demo runbook had a "Cloudflare relay" branch that nobody had tested in the previous 24 hours.** The relay had been stable but untouched — a code path that hadn't run since the last deploy. *Workaround:* a manual `curl` to the relay 2 hours before demo confirmed it was alive. *Lesson:* anything load-bearing for a live demo gets a smoke test that same morning.

---

## Week 9 — The SaPS pivot (11–17 May 2026)

**Focus:** Halfway ECTS assessment → strategic gap analysis → full multi-tenant pivot end-to-end in one day. 10 commits, 4 migrations, 15 edge function deploys, 4 marketing pages.

### Things learnt

- **Halfway assessment first, build second.** Spent 20 minutes mapping the actual ECTS evidence against the agreement before deciding what to build next. That made the SaPS pivot a *deliberate* choice ("the missing *Communicate* ECTS is the customer-visible half of the pivot, the missing *Research* ECTS is the case study") instead of a vibe.
- **Asking architectural decisions upfront via structured questions saves entire days.** Path-vs-subdomain routing and N:N-vs-1:1 membership were both hard to reverse. Locked in 30 seconds with strong-recommendation defaults instead of committing to one path mid-implementation and regretting it.
- **Atomic provisioning via SECURITY DEFINER RPC is the right pattern for cross-row commitments.** The "tenant exists" commitment crosses three rows (tenant + member + lead update). Doing those in JS would have left the door open to partial provisioning if the second write failed. The RPC makes it transactional at the DB layer.
- **Honest copy beats fake authority on a B2B marketing surface.** No fabricated quotes, no fake logos, no "Trusted by 10,000+". The Harare case study uses real numbers from the 19 March field visit, narrative voice, and observed behaviour only. Trust signals (Paynow Integration #23997, dated audit, named contact) are things that actually exist. This is the version we can defend in front of the panel.

### Things done well

- **Column-default + service-role audit instead of breaking changes.** Adding `NOT NULL tenant_id` to 10 transactional tables could have broken every running insert. The combination of `default_user_tenant()` for authenticated callers + an explicit `_shared/tenant.ts` helper for the 18 service-role sites means the migration was safe to apply without coordinating a frontend deploy.
- **Parallel design specialists for the marketing surface.** Four agents (visual + layout + interaction + ux) returned complementary specs in ~30 seconds. Implementation followed an opinionated brief rather than my own first instinct. The result feels intentionally editorial — credibility-shaped rather than SaaS-shaped — which matters more for B2B operator outreach.
- **Onboarding wizard ends with a *live tenant* an operator can sign into.** Lead → admin approval → 5-step wizard → working tenant URL + admin email + sign-in CTA. ~6 minutes end-to-end, no SQL editor. The whole pipeline runs without me being in the loop.

### Failure points + workarounds

- **Service-role bypasses the `tenant_id` column default.** Would have broken every cron + webhook path on day one if not caught. *Failure point:* the column-default pattern only works for authenticated calls; service-role calls bypass defaults entirely. *Workaround:* audited every `.insert()` into a tenant-scoped table across edge functions, patched 18 sites in 9 files. Cost: half a day. *Lesson:* when you set up RLS conveniences for authenticated callers, list every service-role caller in the same session.
- **`VITE_SUPER_ADMIN_EMAILS` requires a Vercel UI step + redeploy without build cache.** Vite bakes env vars at build time, so a CLI redeploy with cached build does not pick up new env. *Workaround:* manual UI step still outstanding. *Failure point:* the rest of the pipeline is fully automated except this single step — and it's easy to forget.
- **Pricing numbers on `/operators/pricing` are best-guess (Starter $200/mo, Growth $500/mo, Enterprise from $1,200/mo).** Not validated against actual cost model. *Workaround:* flagged for 15-minute supervisor validation before any external promotion.

---

## Week 10 — Post-demo asks + transport + multi-channel (18–26 May 2026)

**Focus:** working through the six panel asks from the 8 May demo; transport quoting; WhatsApp bot + USSD simulator productionised.

### Things learnt

- **Two of the six panel asks ship in a fortnight if you don't wait for credentials.** Ask #3 (auction mechanics) and ask #4 (Paynow merchant ID for sellers) had no external dependency and shipped same-week. The four asks that depend on Paynow-side action (Paab, Bisafe, BillPay vendor-portal registration, txt.co.zw REMOTE creds) are still blocked. The lesson: separate "blocked-by-us" from "blocked-by-them" early in every sprint.
- **A multi-channel access strategy is cheap once the data layer is multi-tenant.** WhatsApp bot, USSD simulator, Facebook Messenger bot — all of them write through the same tenant-scoped RLS. Adding a channel is mostly auth wiring and parser code, not a separate stack.
- **A SaPS commercial bundle (10 docs) is faster to write than to send.** All 10 are drafted; the bottleneck is supervisor sign-off and first-prospect identification. *Lesson:* commercial readiness is a different skill from product readiness; treat it like a separate work-stream.

### Things done well

- **5 of 6 panel asks verified end-to-end.** Documented per-ask in [`deliverables/week-7/post-demo-progress-report.md`](deliverables/week-7/post-demo-progress-report.md). The one red is the only one with zero local progress possible (Paab — awaiting sandbox + docs).
- **BillPay biller endpoints split AUTH + PAY correctly.** Paynow's spec was explicit about three gaps in the first cut (currency required, buyer name not lot title, two URLs not one dispatcher) — all three closed in commit `0b75500`. The deploy went live the same day.
- **Tenant RLS infinite-recursion bug fixed in one commit (2026-05-21).** The bug was blocking *every* `UPDATE` across the system — exactly the kind of bug that, if you ship it, you ship a brick. Caught it before the next deploy.

### Failure points + workarounds

- **Initial deploy of `billpay-biller-auth` / `billpay-biller-pay` returned 401 at the Supabase gateway** with `UNAUTHORIZED_INVALID_JWT_FORMAT`. The Supabase gateway expects a JWT by default; biller endpoints use HTTP Basic from Paynow. *Workaround:* marked both functions `verify_jwt = false` in `supabase/config.toml` and redeployed with `--no-verify-jwt`. Pattern now matches existing webhook-style functions (`payment-webhook`, `billpay-reconcile`).
- **Tenant RLS infinite-recursion bug shipped to prod for ~24 hours before being caught.** Every `UPDATE` was failing silently. *Workaround:* a security-definer helper function broke the policy recursion, deployed in commit `136a924`. *Failure point:* RLS policies that reference each other are exactly the class of bug that's invisible until a real workload hits them. The test suite didn't have a path that exercised `UPDATE` from one tenant on a row owned by another tenant.
- **Paynow Paab sandbox + docs still not received.** The red on the board for the panel asks. Blocking ask #1 entirely. *No workaround* — this is a "wait for Paynow" item.
- **txt.co.zw REMOTE credentials still not received.** Blocking the SMS notifications branch from going from simulation mode to live. *Workaround:* the branch is built and sitting in simulation mode (`feature/sms-notifications`).
- **WhatsApp bot still depends on a Mac mini in the path.** Productionisation blocked on internal access to a static-IP machine. *Workaround:* bot runs on my laptop today; works for demo but isn't production-grade.

---

## Cross-cutting themes

Patterns that show up week-to-week and are worth pulling out:

### Theme 1 — Environmental constraints dominate code

The biggest blockers on this project were not bugs in our code. They were the operating environment's shape colliding with cloud-platform assumptions. **Paynow's Cloudflare wall, txt.co.zw's IP allowlist, Pesepay's malformed headers, DPOpay's KYC sandbox, Supabase's ephemeral function IPs** — all of these are *environment topology* problems. Recognising that early made the project ship workarounds (Cloudflare relay, Quick Tunnel from static-IP Mac mini) instead of grinding against bug fixes that weren't bugs.

### Theme 2 — Audits scale better than reviews

Three times in the project a parallel multi-agent audit caught things sequential review missed: the 8 April security round-2 (8 more unauthenticated edge functions), the 13 April PWA audit (20 issues in 2 minutes), and the 11 May design surface (4 specialists in parallel for the marketing pages). The pattern is consistent enough that "parallel specialists, then synthesise" is now the project's default for any audit-shaped task.

### Theme 3 — Silent failures are the most expensive class

Every one of the costliest debug sessions on this project came from silent failure: `useAutoRunAgents` spamming 401s for days; CI `deploy-frontend` failing for 3+ pushes without alerting; payment `onSuccess` referencing an out-of-scope variable; `_shared/logger.ts` never committed; tenant RLS infinite-recursion shipping to prod for 24 hours; EcoCash selections being saved as "Card". **The unifying feature is that none of them threw a visible error.** The fixes were small; the discovery cost was large. The forward-looking lesson: add observability for *the silent path*, not just the error path. Sentry + structured logging + production curl evidence are the cheapest insurance against this class.

### Theme 4 — Demo-mode tests give false confidence on hot paths

The payment `onSuccess` bug, the EcoCash mislabelling, and the tenant RLS recursion all had test coverage that ran in demo / simulation mode and passed. The Supabase-connected path was where the bugs lived. **Tests against a real schema (even in a transactional test fixture) would have caught all three.** Adding a Supabase-test track to the existing Vitest suite is on the backlog and probably the single highest-ROI test improvement available.

### Theme 5 — Document failures *as* findings, not as embarrassments

The most valuable artefacts on this project are the ones that document things that *didn't work*: the Paynow pitfall catalogue (21 items), the Ecosystem Retrospective (Core 4.2/10 vs siblings 7–8/10), the integration writeups with §12 "Shortcomings & Areas of Improvement", this reflection. The framing of "we tried, this is what happened, here's what we'd change" produced the only outputs Paynow can actually action. Glossing the failures would have produced a thinner, less useful deliverable.

### Theme 6 — Strategy → tactics, not the other way around

Two of the three biggest project decisions came from sitting down with a framework *before* opening the editor: the 30 March stack consolidation (Go backend out, Supabase only) used a written cost-benefit comparison; the 11 May SaPS pivot started with a 20-minute halfway ECTS assessment mapped against the agreement. Both of those produced large, well-scoped, durable changes. The reverse — "I'll just start coding and figure it out" — produced the project's two biggest scope overruns (the Go backend, the autonomous-agent system).

---

## What I'd do differently next time

In one list, the things I would actually change if I were starting on day one again:

1. **Pick the stack on day one. Don't run two architectures in parallel.** The Go backend was a portfolio piece for two weeks and a deletion target after that. The lesson cost ~9,500 lines of code.
2. **Spike every external integration with the deployed runtime, not localhost.** Paynow worked from my laptop; broke from Supabase Edge Functions. txt.co.zw worked from a static IP; broke from Supabase. Localhost is the wrong dev surface for cloud-first deploys.
3. **Two field visits in week one, not weeks one and three.** The second visit's findings (90-second cadence, ABL metric, trust hierarchies) would have reshaped the build. Some of the week-2 decisions had to be revisited because of it.
4. **Add CI status badges + Sentry from week one.** The silent-failure tax was real and almost entirely preventable.
5. **Test against a real Supabase schema, not just demo mode.** Three of the five most expensive bugs in this reflection had tests that passed in demo mode.
6. **Separate "blocked-by-me" from "blocked-by-them" in every weekly plan.** Four of the six panel asks are still blocked on Paynow-side action; the two that weren't blocked shipped in days. Treating those four as a single pile would have starved the two that could move.

---

*Last updated 2026-05-26. This is the project's honest journal. Every claim is backed by the linked session log, deliverable, or commit in this repository.*
