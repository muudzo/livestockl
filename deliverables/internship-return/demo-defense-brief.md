> **Demo Defense Brief**
> 2026-06-05
> Companion: demo-plan-2026-06-05.md
>
> How to use it: rehearse the Top 10 cold — say each answer out loud until the 15-25s version is muscle memory, not recall. Then pre-empt the "genuinely exposed" items yourself, before the panel reaches for them. Raising your own weakness first is the difference between self-aware and cornered.

---

## 1. The 10 questions most likely to hurt

Ranked across all domains: lethal first, then by likelihood of being asked. Memorize these ten cold. Each carries a stance — **defend** (hold the line), **concede-and-reframe** (give the point, redirect to the ask), **concede-fully** (own it flat, no spin).

---

### 1. Founder salary — is Year 1 unpaid labour subsidizing the model? `[concede-fully]` `lethal`

**"You assume zero founder salary, then call the surplus 'founder income.' Once it's live you earn US$6,081 in Year 1 — that's US$506 a month. Is the founder actually living in Zimbabwe on US$506 a month running deployment, ops, and sales? Or is this unpaid labour subsidizing the model?"**

You've named it correctly — in Year 1 this is the founder subsidizing the business with unpaid labour, and US$506 a month is not a living wage in Zimbabwe. I won't dress that up. The honest frame is that Year 1 isn't "income," it's a self-financed pilot where I'm paying myself back the roughly US$2,250 I put in pre-launch from savings. The model only becomes a real income at Year 2 and 3 — US$17.6k then US$32k — and even those assume I have other means of support in Year 1. That's precisely why one of my asks of Paynow is to formalize the partnership, because that's what shortens the unpaid stretch.

*If pushed:* Yes, this is closer to a funded apprenticeship than a salaried business in Year 1, and I'd rather state that plainly than pretend US$506 a month is a wage — the bet is that Years 2-3 are real, and the ask is help getting there faster.

---

### 2. USD receivables — can the house actually find US$1,500 every month? `[concede-and-reframe]` `lethal`

**"Your customer makes money in ZWL and converts through EcoCash to pay your US$1,500/month invoice in a USD-scarce economy. Have you actually asked a house operator if they can reliably find US$1,500 every month when rates swing and banks ration forex? Or only modelled the best case?"**

I haven't — I've modelled revenue but not receivables friction, and you've caught the real hole: my USD-scarcity mitigation is about pricing, not collection, and those are different problems. What I'd push back on slightly is the premise that the house earns only ZWL — anchor houses charge 12% combined fees and the higher-value end of the floor already transacts in USD, so a Tier A house touches more USD than the model implies. But that's an argument, not evidence. I have not sat across from an operator and asked "can you find US$1,500 every month," and that's a first-five-questions item for the pilot.

*If pushed:* The deeper point you're making is that my receivable is only as good as my customer's own USD liquidity — which is exactly why routing their GMV onto Paynow rails matters: if I settle their sales in USD through Paynow, I collect at the source instead of invoicing them to scrounge it later.

---

### 3. The ops team that unbinds the constraint — where is it? `[concede-fully]` `lethal`

**"You're founder-led for BD, ops, support, and product. By Q3 2027 you need house #2 live while hand-holding house #1 and visiting house #3. The brief mentions 'cheap part-time help' but never names an ops lead, shows no hiring plan. If operations is the binding constraint, where's the team that unbinds it?"**

This is the real one, and I'll own it cleanly: there is no named ops lead and no hiring plan, and that's a genuine gap in the doc. The earlier competitive one-pager even claimed a "named operations lead" — that was aspirational and I corrected it out of the v2 model. Here's the honest version: I am the binding constraint, and I've paced the milestones to that. House #2 isn't until Q3 2027 precisely because one operator plus part-time help is all I can run well — the schedule is throttled to my own capacity by design, not ambition. The part-time hire is funded from house #1's surplus, after it's earning, never ahead of it. But "cheap part-time help" is a placeholder, not a costed plan, and that's the first thing I'd harden before scaling past two houses.

*If pushed:* The model is safe at one-to-two houses on me alone; it's the jump to three where the team question becomes load-bearing, and I'd want a costed ops plan signed off before committing to house #3.

---

### 4. Residential Mac mini relaying SMS for a money platform — why isn't this Phase 1? `[concede-fully]` `lethal`

**"You're routing SMS through a Mac mini on a residential ISP with a dynamic IP. If the ISP rotates it — which you admit happens — the SMS pipeline dies until you re-whitelist. That's a security SPOF, an availability SPOF, needs manual recovery. How is that production-grade, and why isn't the static-IP fix Phase 1?"**

It isn't production-grade, and I shouldn't call the relay "permanent" while it runs on a Quick Tunnel that regenerates its URL on every restart — that wording in §11.4 is wrong and I'll fix it. What I'll defend is the blast-radius design: the password never leaves the Mac mini, so a Supabase compromise can't leak txt credentials. But you're right that availability is hope, not architecture. Critically, SMS is fire-and-forget — it never blocks settlement; the bid still settles and the in-app notification still lands. The Mac mini is the demo expedient; the static-IP VPS is the Phase-1 fix, and I had the order wrong.

*If pushed:* This is my third ask of Paynow: a Basic-Auth-only REMOTE tier, or one provisioned static IP, and the residential relay disappears entirely — infrastructure I want you to make obsolete, not defend.

---

### 5. The Cloudflare relay — unauthenticated payment proxy on your own account? `[concede-fully]` `lethal`

**"The Cloudflare relay is an unauthenticated mirror for every Paynow Core call, gated only by x-relay-secret. If that leaks, anyone initiates payments on your merchant ID. Your 'hostname allowlist' is a domain-suffix check — line 54 allows anything ending in paynow.co.zw. Have you assessed this as a PCI/compliance liability? Does the Merchant Agreement even permit you to run a payment proxy on your own Cloudflare account?"**

This is the strongest hit and I'll own it. The relay is a single-secret gate sitting in plaintext Supabase env, and line 54 is a suffix match, not an allowlist — worse than I documented, because "endsWith paynow.co.zw" would also match evilpaynow.co.zw, no leading-dot anchor. The relay forwards my signed body verbatim, so it adds no second signature — it only changes the origin IP. And no, I did not get this cleared against the Merchant Agreement, and I should have before pointing live payment traffic through my own Cloudflare account. That's a disclosure gap on me.

*If pushed:* The right move isn't to harden my proxy — it's to retire it: I'll transfer the Worker to Paynow's account today, but the real fix is the API sub-host so no integrator is delegating payment authority to a third-party hop at all.

---

### 6. RLS drift — which is live, the git file or the migration? `[concede-and-reframe]` `lethal`

**"You say 'multi-tenant RLS verified' and '11/11 PASS,' but rls_policies.sql in git still has 'Listings are viewable by everyone … using (true)' — no tenant filtering. Which is actually live, and how did this file drift from the deployed RLS?"**

You're right, and it's a real problem in that file. What's live in prod is the tenant-scoped policy from migration 20260511100000 — listings viewable only to tenant members via user_tenant_ids() — and that's what security-agent tests 11/11 against. What drifted is rls_policies.sql: I let it become stale documentation while the migrations became the source of truth. The deployed DB is correct; the curated SQL file is not, and I should not have shipped a report that pointed at a file I hadn't kept in sync.

*If pushed:* Concretely: I'll regenerate rls_policies.sql from prod today and add it to the CI diff gate so a drift like this fails the build instead of sitting in git.

---

### 7. Agent runaway spend — what stops US$2,500 across five goals? `[concede-fully]` `lethal`

**"The buyer-agent checks 'if currentPrice > goal.max_price' to skip bidding, but there's zero enforcement against total lifetime spend. If an agent has max_price US$500 on five goals, can it spend US$2,500? Any DB constraint, rate limit, or RPC guard against runaway agent spend?"**

You've found a real gap. max_price is enforced per listing, not cumulatively — there's no total_spend_limit or total_spent column on agent_goals, so an agent winning ten lots at US$400 each could spend US$4,000 with no circuit-breaker. That's a genuine runaway-spend vector and I won't pretend otherwise. The honest mitigation today is that auto-bid is opt-in per agent and the owner sets it up — but that's a guardrail, not a budget ceiling.

*If pushed:* The fix is a total_spend_limit column plus an agent_spend ledger checked atomically in place_bid — exactly the kind of payment-safety primitive I'd want to build with Paynow, not alone.

---

### 8. Mr. Mawere's forcing function — why wouldn't he just keep doing what he's doing? `[concede-and-reframe]` `lethal`

**"He takes home 12% on a physical floor with zero tech work. You're giving him maybe 1-2% more after your fees, at 15% adoption. Why wouldn't he just… keep doing what he's doing? What's the forcing function?"**

Honest answer: there is no forcing function, and I shouldn't pretend there is. He doesn't adopt to save a point on fees — my 0.75% surcharge barely moves his take. He adopts for reach he physically cannot get: new bidders his floor never sees — diaspora, salaried buyers who can't come on a Wednesday — and his buyer list captured as a remarketing asset he doesn't own today. The marginal remote bidder who pushes a price up 5% is incremental GMV on top of his floor, not a substitute for it. If that reach story doesn't land in the pilot, he walks — and the contract is deliberately 12-month renewable, not a lock-in, so he can.

*If pushed:* If new reach doesn't materially lift his GMV in 90 days, he shouldn't adopt and I'd tell him so — that's the whole reason the pilot is paid and gated, not free.

---

### 9. WhatsApp is free and entrenched — how do you beat that at US$1,500/mo? `[concede-and-reframe]` `lethal`

**"WhatsApp groups are free, instant, completely entrenched. You're charging US$1,200-1,500/month plus fees. No escrow, no police-clearance — but no middleman taking a cut either. For cash-preferring sellers that's a feature. How do you overcome that incumbency at that price point?"**

I concede the row in print: WhatsApp wins on time-to-start and it's free at point of use. For a US$80 goat between two people who know each other, I lose, and I shouldn't try to win that. Where I win is the trade above roughly US$200 between strangers, where the absence of escrow, settlement, audit trail, and police clearance stops being a feature and becomes the reason the higher-value end still walks into the physical shed today. And the house isn't paying US$1,200 to replace WhatsApp — he's paying for a branded surface that captures those buyers as HIS remarketing list, instead of the group admin's.

*If pushed:* I'm not selling against free chat for a goat — I'm selling trust for the trades where a stranger won't send cash first, and the field doc already shows those buyers walking into the shed, not the WhatsApp group.

---

### 10. Agent auth — if CRON_SECRET leaks, anyone bids for any user? `[concede-and-reframe]` `lethal`

**"You claim agentic auto-buy is 'production-hardened,' but buyer-agent shows Access-Control-Allow-Origin '*' with a CRON_SECRET gate. If an attacker leaks the secret they place arbitrary bids for any user. Is it rotated, in secrets, never logged? What stops a compromised dev exfiltrating it?"**

Let me separate two things. The CORS wildcard on the agent functions is real and inconsistent with the SEV-1 fix we applied to user-facing endpoints — that's a legitimate finding I'll close. On auth, these aren't open: authorizeAgent requires either the CRON_SECRET Bearer for cron, or a user JWT whose uid matches the agent owner. CRON_SECRET lives in Supabase secrets, not the browser, and the body is logged but the secret isn't. What I can't claim today is a rotation schedule — there isn't one, and a compromised dev with secret access is a real bus-factor risk.

*If pushed:* I'll lock CORS to the app origin on the agent functions and stand up scheduled CRON_SECRET rotation; "production-hardened" was too strong for endpoints without rotation.

---

## 2. Where we're genuinely exposed

The honest list — the concede items. Raise these yourself, in your own words, before the panel digs them out. Pre-empting reads as command of the material; getting caught reads as spin. Each comes with the graceful framing to lead with.

- **Year 1 is unpaid founder labour, not a salary.** Lead with: *"Let me be upfront that Year 1 is a self-financed pilot, not income — US$506 a month isn't a wage, and I'm treating it as paying back the ~US$2,250 I put in. The real income case is Years 2-3."* Saying it first turns a gotcha into a credibility marker.

- **No named ops lead, no costed hiring plan.** Lead with: *"The one thing I deliberately corrected out of v2 was the claim of a 'named operations lead' — there isn't one. I am the binding constraint and I've throttled the roadmap to that. The team question gets load-bearing at house #3, and I'd want it costed before I sign that."*

- **The Cloudflare payment relay was never cleared against the Merchant Agreement.** Lead with: *"Before you ask — I ran live payment traffic through a relay on my own Cloudflare account and never cleared it against the Merchant Agreement. That's a disclosure gap on me, and the fix isn't to harden it, it's to retire it."* This is the single highest-trust pre-emption available to you.

- **The SMS relay runs on a residential Mac mini and I called it 'permanent.'** Lead with: *"My wording in §11.4 is wrong — the relay isn't 'permanent,' it's a demo expedient on a residential box, and the static-IP fix should have been Phase 1. The saving grace is SMS never blocks settlement."*

- **Agent spend has no cumulative ceiling.** Lead with: *"There's a real gap I want to name: agent max_price is per-listing, not lifetime — there's no total-spend circuit-breaker yet. It's a guardrail short of a budget ceiling, and it's a primitive I'd build with you."*

- **rls_policies.sql and schema.sql have both drifted from prod.** Lead with: *"Two of my own artifacts are stale: rls_policies.sql still shows the old using(true), and schema.sql doesn't even contain agent_goals. The deployed DB is correct and tested 11/11, but the git files aren't the source of truth yet — that's a today fix plus a CI diff gate."*

- **Zero signed pilots, zero LOIs — demand is observed, not validated.** Lead with: *"I want to be precise that I have no signed pilot and no paying customer yet. What I have is pain I watched with my own eyes on one sale day. The next milestone is converting that into one signature, and until then this is built on observed pain, not proven willingness to pay."*

- **The 100-user load test is a mental simulation, not a measured run.** Lead with: *"The April load number is architecture analysis, not a real concurrent test, so I'd ask we drive the live demo from one screen — 'demo-ready' and 'validated for 30-plus concurrent' are different claims and I won't conflate them."*

- **Bus-factor is one.** Lead with: *"All 396 commits are mine, the payment paths haven't had a second human reviewer, and the audit was agent-driven. For a customer pilot that's not acceptable as-is — which is exactly why one of my asks is a Paynow engineer with project access."*

- **'Cash-positive' is pre-tax; 25% corporate tax was modelled as zero.** Lead with: *"One label I'll correct: 'cash-positive' is at the operating line, pre-tax. At 25% corporate, Year 1 take-home is closer to US$3k than US$6k — barely-solvent-after-tax, not comfortable. Years 2-3 are where tax-adjusted income actually matters."*

---

## 3. Three bridges back to the ask

When attacked along a common line, these are the sentences that pivot the defense back toward the three asks: **unblock the rails / formalize the partnership / open one door.** Don't end a concession in the open — land it on a bridge.

**Bridge 1 — Unblock the rails.** When the attack is *technical* (relay, SMS SPOF, Paab red, blocked Core):
> *"Every one of these is a symptom of the same root cause — I'm an integrator routing around infrastructure I don't own. The relay, the Mac mini, the Paab red — they all disappear the moment Paynow gives the machine-to-machine API the same posture billpay already has. I'm not asking you to harden my workarounds; I'm asking you to make them obsolete."*

**Bridge 2 — Formalize the partnership.** When the attack is *capacity, bus-factor, or unsigned terms* (one-person team, no reviewer, no MOU, Paynow could reprice):
> *"You've put your finger on why ask number two is to formalize the partnership, not assume it. A Paynow engineer with project access reviews the payment paths before any customer goes live, and locked terms mean my unit economics aren't riding on a handshake. I'd rather lock it than assume it."*

**Bridge 3 — Open one door.** When the attack is *demand, credibility, or willingness-to-pay* (one field visit, no pilot, not known in the auction community, why would Mawere adopt):
> *"This is exactly the gap ask number three closes. I can't manufacture credibility with an auction-house owner from an internship CV — but a Paynow referral can, because he already trusts your rails. Open one door, and observed pain becomes a signed pilot. That's the cheapest, highest-leverage thing you could give me."*

---

## 4. Full Q&A by domain

Every question and answer, grouped for thorough rehearsal. Stance marked on each.

---

### FINANCIALS

**Q — Part-time ops capacity. `[concede-and-reframe]`**
*"You're projecting US$400/month for part-time help from month 18 — US$4,800 a year to run two houses with US$28k gross. How many hours is that, and what happens when a constable workflow breaks, a seller can't reconcile settlement, or you deploy house #3 — all while supporting house #1's monthly review? Have you stress-tested ops capacity when it's failing?"*

You're right that the model prices the part-timer but never specifies hours or an incident SLA — that's a real gap, and the US$400 is a wage assumption, not a capacity proof. What I can defend is that I made operator capacity the explicit binding constraint, not adoption: the whole plan is paced to add house #3 only when house #1 is in steady-state and house #2's surplus funds the help. What I haven't done is build a staffing model with hours-per-house and a failure-cascade plan, and I'd want that before signing house #3.
*If pushed:* The honest answer is the part-time line is a placeholder for "cheap local labour exists," not a costed ops plan — and the right fix is to instrument operations-hours-per-house on the pilot before I trust any number here.

**Q — Is 15% a real ceiling or a convenient number? `[concede-and-reframe]`**
*"Your 15% adoption ceiling — observed data, or a number that makes the unit economics work? The model jumps from 70% in May to 15% in June. Walk me through the field evidence that 15% is real and not one you set because you can't afford higher support costs."*

Honest answer: 15% is a judgment call, not a measured plateau — I have no live floor data yet, so I can't claim it's empirically the ceiling. What I can defend is the direction of the revision: I cut my own number from 70% to 15% because 70% assumed I could break a cash market fast, and field research said I couldn't. The reason I'm relaxed about being wrong here is the sensitivity — doubling adoption to 30% adds only about US$200 a month, so the model isn't anchored to 15% to survive. If a real house hits 25%, my revenue goes up, not down.
*If pushed:* The part that would actually break me isn't adoption being higher — it's whether higher adoption raises my support cost per house faster than the surcharge revenue, and I haven't modelled that coupling; the pilot is exactly how I'd get the real number.

**Q — Zero founder salary, US$506/month. `[concede-fully]`** *(See Top 10 #1.)*
*"You assume zero founder salary, then call the surplus 'founder income.' Where does the US$2,250 come from in months 1-5 before launch? And US$506/month — is the founder living in Zimbabwe on that running deployment, ops, and sales? Or is this unpaid labour subsidizing the model?"*

You've named it correctly — in Year 1 this is the founder subsidizing the business with unpaid labour, and US$506 a month is not a living wage in Zimbabwe. I won't dress that up. Year 1 isn't "income," it's a self-financed pilot where I'm paying myself back the roughly US$2,250 I put in pre-launch from savings. The model only becomes real income at Year 2 and 3 — US$17.6k then US$32k — and even those assume I have other means of support in Year 1. That's precisely why one of my asks is to formalize the partnership, because that shortens the unpaid stretch.
*If pushed:* Yes, this is closer to a funded apprenticeship than a salaried business in Year 1, and I'd rather state that plainly than pretend US$506 a month is a wage — the bet is that Years 2-3 are real, and the ask is help getting there faster.

**Q — Can the house find US$1,500 every month? `[concede-and-reframe]`** *(See Top 10 #2.)*
*"Your customer makes money in ZWL and converts through EcoCash to pay your US$1,500/month invoice in a USD-scarce economy. Have you asked a house operator if they can reliably find US$1,500 every month when rates swing and banks ration forex?"*

I haven't — I've modelled revenue but not receivables friction, and you've caught the real hole: my USD-scarcity mitigation is about pricing, not collection, and those are different problems. What I'd push back on slightly is the premise that the house earns only ZWL — anchor houses charge 12% combined fees and the higher-value end already transacts in USD, so a Tier A house touches more USD than the model implies. But that's an argument, not evidence. I have not sat across from an operator and asked the question, and that's a first-five item for the pilot.
*If pushed:* My receivable is only as good as my customer's own USD liquidity — which is exactly why routing their GMV onto Paynow rails matters: settle their sales in USD through Paynow and I collect at the source instead of invoicing them to scrounge it later.

**Q — 'Cash-positive' with zero tax modelled. `[concede-and-reframe]`**
*"You claim 'cash-positive from the first live house.' But Year 1 is US$12,321 on a house live at month 6 — only 7 months. Break out Year 1 month-by-month: inflows, tax at Zimbabwe's 25% corporate rate which you modelled as zero, and when the founder actually sees a dollar."*

Two fair hits and one I'll defend. Fair: the model explicitly excludes corporate tax — it says so in the notes — and at 25% on a positive surplus that erodes Year 1 from ~US$6,081 toward roughly US$3,000, so "cash-positive" is pre-tax and I should label it that way. Also fair: Year 1 is genuinely only 6-7 months of one house. What I'll defend: the monthly P&L is built, the surplus is positive every live month from month 6, and the engagement fee bills 50% at signing, 50% on go-live — so the first inflow is front-loaded. But "cash-positive" should read "pre-tax operating surplus," and I'll correct that.
*If pushed:* The honest restatement is Year 1 is barely-solvent-after-tax, not comfortably cash-positive — the claim is real at the operating line and overstated at the take-home line; Years 2-3 are where tax-adjusted income matters.

**Q — No bad-debt reserve. `[concede-and-reframe]`**
*"You list bad debt and collection friction as known risks but carry no reserve. If a Tier A house delays the US$1,500 retainer for two months — completely normal in Zimbabwe — you have zero cushion, paying US$400/mo support and drawing income from surplus. What happens operationally if one house stops paying on time?"*

Operationally, a two-month delay on one house in a two-house book is brutal — roughly US$3,000 of receivable against a thin surplus and a US$400 support obligation I can't pause, with no reserve, so the hit lands on my own income. You're right the model assumes 100% on-time collection, which in this economy is optimistic. The one structural defence I have is no fixed payroll or capital repayment behind it — a bad month dents my income, not my solvency, because I owe no investor and no lender. But that's resilience, not a cushion, and I haven't modelled a bad-debt reserve. I should.
*If pushed:* The real mitigation isn't a reserve I can't fund — it's collecting the surcharge at settlement on Paynow rails so part of my revenue clears automatically with each sale, instead of all of it riding on the house remembering to pay an invoice.

**Q — Surcharge on settled vs placed GMV. `[concede-and-reframe]`**
*"Your surcharge is 0.75% of settled GMV — 'settled' being operative. If a buyer bids but doesn't complete, you earn nothing. How much of your 15% is bids completed vs placed? If a US$90k sale day sees 3 of 10 bids close, your surcharge is on US$27k, not US$90k."*

You're technically right that the model treats the penetration percentage as already-settled GMV — there's no separate bid-to-settlement conversion factor, so closure rate is folded into the 15%. The reason this doesn't worry me much is scale: the surcharge is the smallest line by design — about US$4,087 of US$48,987 in Year 3 — so even halving effective settled GMV moves total revenue by low single-digit percent, not a third of the business. The retainer is the spine and doesn't depend on closure rate at all. But you're correct that if I ever lean on the surcharge, I need to split placed from settled.
*If pushed:* I'll concede the 15% is doing double duty — both "how much goes digital" and "how much of that clears" — and the clean fix is to break those apart on the pilot, the only place I'll get a real closure number anyway.

---

### GTM

**Q — Why would Paynow cede BD to an intern-founder? `[concede-and-reframe]`**
*"The GTM says Paynow will 'formalize' you as their livestock vertical and refer prospects, but BD is their core competency. Why cede that to an intern-returning founder instead of building in-house or with an established agency? What's in that MOU?"*

You're right to push, and I'll be precise: there is no signed MOU yet, and I'm not asking Paynow to do my sales. The trade is narrow and self-interested for you: I route US$43k of livestock GMV onto your rails in Year 1, growing to US$545k by Year 3, in a vertical you have zero presence in and no appetite to operate a managed service for. Paynow BD doesn't sit in an auction shed on a Saturday. The ask isn't "sell for me" — it's "when an auction house asks you about EcoCash settlement, name us, for 5% of the engagement and first-year retainer." That's a referral on incremental GMV, not ceded territory.
*If pushed:* If Paynow would rather build it in-house, that's a fair outcome too — but the unit economics only work as a managed service one operator runs, and that's exactly the work a payments company doesn't want to own.

**Q — Where's the team? `[concede-fully]`** *(See Top 10 #3.)*
*"You're founder-led for BD, ops, support, and product. By Q3 2027 you need house #2 live while hand-holding house #1 and visiting house #3. The brief never names an ops lead, shows no hiring plan or team budget. If operations is the binding constraint, where's the team that unbinds it?"*

This is the real one, and I'll own it cleanly: no named ops lead, no hiring plan, a genuine gap in the doc. The earlier one-pager claimed a "named operations lead" — aspirational, and I corrected it out of v2. The honest version: I am the binding constraint and I've paced the milestones to that. House #2 isn't until Q3 2027 precisely because one operator plus part-time help is all I can run well — the schedule is throttled to my own capacity by design. The part-time hire is funded from house #1's surplus, after it's earning, never ahead. But "cheap part-time help" is a placeholder, not a costed plan, and it's the first thing I'd harden before scaling past two.
*If pushed:* Safe at one-to-two houses on me alone; it's the jump to three where the team question becomes load-bearing, and I'd want a costed ops plan signed off before house #3.

**Q — One observation day, no signed pilots. `[concede-and-reframe]`**
*"The GTM cites '8 findings' from field research that became 'load-bearing product decisions.' Which owners did you talk to, and did any agree to be a reference or pilot? Or is this built on assumptions from one observation day, not validated demand?"*

Straight answer: one full sale day in March 2026, and as of today zero signed LOIs and zero paying customers — the Q3 2026 milestone is literally "signed pilot #1," so I won't pretend demand is validated. What I have is a problem I watched with my own eyes: the 12% combined house fee bleeding sub-US$500 trades to WhatsApp, the US$1,000 cash deposit gate, the constable workflow on paper. That's evidence the pain is real, not that a specific owner will buy. The next milestone converts that into one signed pilot, and until I have that signature, this is product built on observed pain, not proven willingness to pay.
*If pushed:* The single most valuable thing Paynow could give me is the third ask — open one door to an auction-house owner — because that's how observed pain becomes a signed pilot.

**Q — Why five channels if the constraint is capacity, not adoption? `[concede-and-reframe]`**
*"Adoption is 15% at maturity, and pushing it to 30% moves Year-3 monthly net by ~US$200. So why build five distribution channels if the constraint is operator capacity, not adoption? Doesn't multi-channel just spread a fixed 15% across web, WhatsApp, USSD, BillPay, Facebook?"*

Fair challenge, and you've caught a real tension between two sections. The channels aren't there to push adoption past 15% — you're right that's not the lever. They're there to reach the 15% at all on a floor where buyers are split across smartphones, feature phones, and chat. USSD isn't extra adoption; it's the only way a feature-phone bidder participates in that 15% at all. So it's an accessibility floor, not a growth ceiling. Where I'll concede: I don't have segmentation data proving each channel unlocks a distinct cohort, so I can't claim the fifth pays for itself. The first three are load-bearing; Facebook and BillPay-PAY are reach insurance, not proven segment unlocks.
*If pushed:* The right test is the multi-channel adoption metric on house #1 — if WhatsApp and USSD bids don't materially overlap with web, the channels earned their place; if they do, I'd cut the marginal ones.

**Q — Relationship credibility with a 50-something owner. `[concede-and-reframe]`**
*"A 50-something owner runs a cash-based, paper-based business on Saturdays. The pitch is he'll trust a 20-something founder returning from an internship with his buyers, his float, his digital identity. Where does relationship credibility come from if you're not already known in the auction community?"*

You've named the honest gap: I'm not yet known in the auction community, the Saturday visits haven't happened, and the ZLPA appearance is a Year-1 target, not done. So the relationship moat is aspirational right now, not banked — I won't oversell it. What I can offer a skeptical owner is three things that don't depend on my reputation: it's branded under his name not mine; the pilot is risk-shared so I lose if it fails — discounted deployment, month-to-month retainer, he can walk at day 90; and the credibility I borrow is Paynow's, the rails he already trusts. I don't ask him to trust me; I ask him to trust a 90-day trial he can cancel, on Paynow's name.
*If pushed:* This is exactly why Paynow naming us as the livestock vertical matters more than my CV — the owner trusts Paynow, and a Paynow referral is the credibility I haven't earned yet.

**Q — Go-live plan if Paynow delays the blockers 6 months. `[defend]`**
*"You're banking on Paynow unblocking Paab cash (RED), BillPay PAY round-trip, and merchant-transfer API docs by Q3 2026, ~90 days out. Those are external dependencies you've marked as failures if they don't land. What's your go-live plan if Paynow delays any by 6 months?"*

Right, and I deliberately listed these as Paynow's risk, not pretended I control them. The honest separation is which blockers are go-live-critical and which aren't. Only BillPay PAY is on the Q3 go-live path, and the pilot runs without it: web plus WhatsApp plus USSD plus EcoCash via Paynow Core Express is already live, so a pilot settles GMV day one even if BillPay PAY slips. Paab cash and merchant-transfer are accessibility and seller-settlement upside — they make the product better, they don't gate the first house. A 6-month Paab delay doesn't kill go-live; it parks one channel. What it hurts is the richness I can show. The mitigation is multi-rail by design — no single Paynow blocker stops the platform.
*If pushed:* The one that would actually hurt is merchant-transfer, because seller settlement is core — so if I'm asking you to prioritise one of the three, it's the transfer API docs over Paab.

**Q — US$7,500 of annual runway — what's the real minimum? `[concede-fully]`**
*"Year-1 founder income is US$6,081 on one house — under US$7,500 of annual runway. How do you cover living costs, tax, equipment, travel to floor visits, and surprises on that? What's the real minimum you need to keep going?"*

You're right that the doc shows operating surplus and doesn't reconcile it against what I live on — a missing line. The honest reckoning: travel, equipment, SMS and hosting are already inside that US$6,240 operating cost line, so US$6,081 is cleaner than a pure revenue number — but it is not a living wage, and I won't pretend a person survives on it. The real answer is this is a side-built bootstrap in Year 1, not my sole income — I carry personal costs separately, the same ~US$2,250 self-financed exposure I name in the doc, while house #1 proves out. The business doesn't have to feed me until Year 2, when surplus roughly triples to US$17.6k. If it can't clear my personal floor by then, that's the signal to stop.
*If pushed:* The honest gate is Year 2: if two houses can't get me past my personal living floor, the model has failed, and I'd rather know that on house #2 than pretend Year 1's US$6k is a salary.

---

### TECHNICAL

**Q — Is '142 TCP resets' your entire root-cause evidence? `[concede-and-reframe]`**
*"You say 'TCP RST mid-handshake' proves the bot wall is the problem, 142 failures. Did you ever measure HTTP response headers, rate-limit fields, any diagnostic from Paynow itself — or is '142 TCP resets' your entire evidence? A reset could mean egress rate-limiting at the CF boundary. What distinguishes your diagnosis from 'something upstream is rejecting the connection'?"*

You're right to push — and I flagged it myself. §3.1 shows zero bytes received and no HTTP status across all 142 attempts, so I never saw a Cloudflare challenge header or a rate-limit field. My diagnosis is inferred from absence of response, not from Paynow's own signals. What I can defend is narrower: the failure is origin-correlated, not rate-correlated — single isolated requests fail identically to bursts, inconsistent with volumetric limiting, and §2.6 documents exactly that. But I labelled "path-selective WAF rule" as an open question only your WAF team can close.
*If pushed:* That's precisely why the recommendation survives either reading: a separate API host fixes it whether the block is a hostname bot wall OR an ASN-level rate classifier — so I'm not betting the fix on my diagnosis being exactly right.

**Q — Does the sub-host just relocate the wall? `[concede-and-reframe]`**
*"The sub-host recommendation rests on billpay being wall-free. Did you measure that, or does it just apply a different wall that lets Basic Auth through while Core's rejects form-encoded SHA-512? If the wall is per-hostname but still present, a new hostname relocates the problem. And your security team might have left billpay open for a reason."*

Fair. What I measured is behavioural, not configurational: BillPay integrated direct from Supabase Edge in ~90 minutes — no relay, no TCP RST — and my own txt.co.zw doc proves I know "no bot wall" doesn't mean "no gates," because txt enforces an IP whitelist even with Basic Auth configured. So I'm not claiming billpay has zero controls; I'm claiming its controls don't reject serverless egress at the transport layer, which I verified end-to-end. You're correct a new hostname needs you to explicitly whitelist its traffic — that's the one week of platform work I scoped, not something I can hand-wave.
*If pushed:* So the honest ask isn't "disable security" — it's "give Core the same machine-to-machine posture billpay already has, and you decide what controls ride on it."

**Q — Residential Mac mini SMS relay — why not Phase 1? `[concede-fully]`** *(See Top 10 #4.)*
*"You're routing SMS through a Mac mini on a residential ISP with a dynamic IP. Paynow whitelisted your home IP. If it rotates — which you admit happens — the SMS pipeline dies until you re-whitelist. That's a security SPOF, an availability SPOF, manual recovery. How is that production-grade, and why isn't this Phase 1?"*

It isn't production-grade, and I shouldn't call the relay "permanent" while it runs on a Quick Tunnel that regenerates its URL on every restart — §11.4 wording is wrong and I'll fix it. What I'll defend is the blast-radius design: the password never leaves the Mac mini, so a Supabase compromise can't leak txt credentials. But you're right availability is hope, not architecture. Critically, SMS is fire-and-forget — it never blocks settlement; the bid still settles and the in-app notification still lands. The Mac mini is the demo expedient; the static-IP VPS is the Phase-1 fix, and I had the order wrong.
*If pushed:* This is my third ask: a Basic-Auth-only REMOTE tier, or one provisioned static IP, and the residential relay disappears — infrastructure I want you to make obsolete, not defend.

**Q — Unauthenticated payment proxy on your own Cloudflare account. `[concede-fully]`** *(See Top 10 #5.)*
*"The Cloudflare relay is an unauthenticated mirror for every Paynow Core call, gated only by x-relay-secret. If that leaks, anyone initiates payments on your merchant ID. Your 'hostname allowlist' is a suffix check — line 54 allows anything ending in paynow.co.zw. PCI/compliance liability? Does the Merchant Agreement permit a payment proxy on your own Cloudflare account?"*

This is the strongest hit and I'll own it. The relay is a single-secret gate in plaintext Supabase env, and line 54 is a suffix match, not an allowlist — worse than I documented, because "endsWith paynow.co.zw" would also match evilpaynow.co.zw, no leading-dot anchor. The relay forwards my signed body verbatim, so it adds no second signature — it only changes the origin IP. And no, I did not clear this against the Merchant Agreement, and I should have before pointing live payment traffic through my own Cloudflare account. That's a disclosure gap on me.
*If pushed:* The right move isn't to harden my proxy — it's to retire it: I'll transfer the Worker to Paynow's account today, but the real fix is the API sub-host so no integrator delegates payment authority to a third-party hop at all.

**Q — Poll-sync strands payment if tab closes. `[concede-and-reframe]`**
*"Poll-sync detects state in under 20s before the webhook. But Core doesn't retry on 5xx — if your webhook returns 500, Paynow gives up and you rely on poll-sync, which runs from the browser only while the tab is open. Close the tab after approving USSD and the payment sits pending forever. You flagged this as Z6. What percentage of auctions hit this, and why isn't the fix in production?"*

I can't give you a real percentage — I have ~20 relayed transactions, not a sample big enough to estimate a tab-close rate, and I won't invent one. The gap is real and self-reported as Z6: poll-sync is browser-bound, so tab-close plus a dropped webhook strands the row at pending. I scoped the fix at two hours — an hourly cron sweeping pendings older than 30 minutes and polling the stored pollurl one final time — and you're right it's a backstop, not a nice-to-have, so it should have shipped before I stood up here.
*If pushed:* For the demo the exposure is bounded — four auctions, four phones I control — but for production I'd block launch on that cron, because "user pays, tab closes, stock marked sold, payment in limbo" is a loss vector, not a UX wrinkle.

**Q — send-sms doesn't fail over; silent SMS failure. `[concede-and-reframe]`**
*"You claim the three-tier routing 'falls through cleanly,' but if TXT_RELAY_URL is set it only tries the relay — no fallback to a direct call if it's down. The auction-ending cron calls send-sms fire-and-forget. Tunnel drops mid-SMS, winner never gets confirmation, the error nobody acts on. How is silent failure of the final customer touchpoint not critical in a payment system?"*

You've read the code correctly — "falls through cleanly" describes config selection at startup, not runtime failover. Once the relay tier is chosen, a dropped tunnel returns relay_unreachable to the cron, which logs it and moves on. No retry, no escalation. That's a genuine gap. My defense is only the boundary I drew deliberately: SMS is transactional trust transport, but it is explicitly non-blocking — the payment settles and the in-app notification still lands, so the failure is a missed SMS, never a lost or double payment.
*If pushed:* The honest fix is small and unshipped: a delivery-status closeback plus resend-on-failure — §11.6, four hours — and until that lands I shouldn't describe the SMS path as production-hardened.

**Q — Intern wants Core opened to abuse for easier dev? `[concede-and-reframe]`**
*"Your recommendation moves Core off the bot wall — but you don't own that infrastructure. Paynow put the wall on www and not billpay deliberately. That could be a security choice: the wall stops portal abuse, billpay is lower-risk. If I'm your infosec lead, I hear 'intern wants us to open the Core API to more abuse for an easier dev experience.' How did you validate the wall is harmful versus protective?"*

I didn't validate it against your abuse metrics — I don't have them, and I say so in §7.1: no internal Paynow context, no threat model, no CDN config. So I can't claim the wall is misplaced on the portal. What my 142 blocked attempts actually show is that the wall works — it's effective at stopping programmatic callers. My recommendation is narrower than "turn off protection": keep the JS challenge on the human-facing portal where it belongs, and expose the machine-to-machine API on a surface that doesn't depend on solving a browser challenge — exactly the split billpay already runs.
*If pushed:* If your security read is that Core genuinely needs a heavier gate than billpay, that's your call with data I don't have — my contribution is the evidence that the current topology silently blocks the entire agentic-commerce cohort, so you weigh that trade-off deliberately instead of by accident.

---

### PRODUCT

**Q — RLS drift, which is live? `[concede-and-reframe]`** *(See Top 10 #6.)*
*"You say 'multi-tenant RLS verified' and '11/11 PASS,' but rls_policies.sql in git still has 'Listings are viewable by everyone … using (true)' — no tenant filtering. Which is actually live, and how did this file drift?"*

You're right, and it's a real problem in that file. Live in prod is the tenant-scoped policy from migration 20260511100000 — listings viewable only to tenant members via user_tenant_ids() — and that's what security-agent tests 11/11 against. What drifted is rls_policies.sql: I let it become stale documentation while the migrations became the source of truth. The deployed DB is correct; the curated SQL file is not, and I should not have shipped a report pointing at a file I hadn't kept in sync.
*If pushed:* I'll regenerate rls_policies.sql from prod today and add it to the CI diff gate so a drift like this fails the build instead of sitting in git.

**Q — Agent runaway spend across goals. `[concede-fully]`** *(See Top 10 #7.)*
*"The buyer-agent checks 'if currentPrice > goal.max_price' to skip bidding, but zero enforcement against total lifetime spend. max_price US$500 on five goals — can it spend US$2,500? Any DB constraint, rate limit, or RPC guard against runaway agent spend?"*

You've found a real gap. max_price is enforced per listing, not cumulatively — no total_spend_limit or total_spent column on agent_goals, so an agent winning ten lots at US$400 each could spend US$4,000 with no circuit-breaker. A genuine runaway-spend vector, I won't pretend otherwise. The honest mitigation today is that auto-bid is opt-in per agent and the owner sets it up — but that's a guardrail, not a budget ceiling.
*If pushed:* The fix is a total_spend_limit column plus an agent_spend ledger checked atomically in place_bid — exactly the payment-safety primitive I'd want to build with Paynow, not alone.

**Q — Agent CORS wildcard + CRON_SECRET. `[concede-and-reframe]`** *(See Top 10 #10.)*
*"You claim auto-buy is 'production-hardened,' but buyer-agent shows Access-Control-Allow-Origin '*' with a CRON_SECRET gate. Leak the secret, place arbitrary bids for any user. Is it rotated, in secrets, never logged? What stops a compromised dev exfiltrating it?"*

Let me separate two things. The CORS wildcard on the agent functions is real and inconsistent with the SEV-1 fix on user-facing endpoints — a legitimate finding I'll close. On auth, these aren't open: authorizeAgent requires either the CRON_SECRET Bearer for cron, or a user JWT whose uid matches the agent owner. CRON_SECRET lives in Supabase secrets, not the browser, and the body is logged but the secret isn't. What I can't claim today is a rotation schedule — there isn't one, and a compromised dev with secret access is a real bus-factor risk.
*If pushed:* I'll lock CORS to the app origin on the agent functions and stand up scheduled CRON_SECRET rotation; "production-hardened" was too strong for endpoints without rotation.

**Q — 100-user stress sim is mental, not load-tested. `[concede-and-reframe]`**
*"The 100-user simulation is dated 2026-04-08 and marked 'mental simulation, not live load testing.' It predicts Realtime breaks at 70 users and Paynow timeouts 70% of the time. You're demoing today — what happens when 50 people open the marketplace and bid? Validated?"*

Honestly, no — no real concurrent load test in the last two weeks, and the April number is architecture analysis, not measured. I won't claim it holds 50 simultaneous bidders. What I'd ask is that the live demo be driven from one screen rather than a 50-person free-for-all, because "demo-ready" and "validated for 30-plus concurrent users" are different claims and I shouldn't conflate them. The free-tier Realtime ceiling is a known constraint, not a surprise.
*If pushed:* Running a real k6/Artillery load test before any customer pilot is exactly the thing I'd want Paynow's infra eyes on — it ties straight into formalizing the partnership.

**Q — Is schema.sql actually current? `[concede-fully]`**
*"The audit says '5 of 5 waves remediated,' dated 2026-06-03, but lists 'regenerate supabase/schema.sql' as a remaining sync task. Is schema.sql current as of this morning? If not, the CI gate comparing against schema.sql is false."*

You're right to press, and the evidence is plain: agent_goals isn't even in schema.sql, so the dump is demonstrably stale. The RLS fix is applied and validated 11/11 on the live DB — that part is true and tested against prod. But the git schema.sql regeneration is still pending, which means the diff gate isn't trustworthy yet and running schema.sql against a fresh DB would not reproduce prod. I shouldn't present the CI gate as green while that's outstanding.
*If pushed:* Regenerating the dump from prod is a today task, not a someday task — until it's done I'd treat the migrations, not schema.sql, as the source of truth.

**Q — Bus-factor one; who debugs at 3am? `[concede-fully]`**
*"You're a solo developer on a 12-week internship now positioned for a customer demo. Every commit is tatenda-source. If you leave, who debugs a production Paynow failure at 3am? Is there a runbook, is the Supabase project shared, can another Paynow engineer deploy?"*

You're right — bus-factor-one today. All 396 commits are mine, the critical RLS and payment paths haven't had a second human reviewer, and the audit was agent-driven, not a human peer. I have a paynow-debug runbook and the QA suite, but no on-call rotation and the Supabase project isn't shared with a second Paynow engineer. For a customer pilot that's not acceptable as-is, and I won't pretend a runbook substitutes for a second human.
*If pushed:* This is precisely one of my three asks — formalize the partnership so a Paynow engineer gets project access and reviews the payment paths before any customer goes live.

**Q — Paab is red and it's ask #1. `[concede-and-reframe]`**
*"The report claims '5 of 6 asks verified end-to-end' but lists Paab as red — and Paab is ask #1. If the foundational ask is blocked, how is this 'demo-ready'? Why can't you process cash deposits into escrow? If Paab is blocked indefinitely, that's a showstopper for SaPS."*

Fair hit on the scorekeeping — 5-of-6 flatters it, because the one red is the one that matters most for commercial houses: cash deposits held in escrow to stop no-shows. What's true is four of five core rails run today — Paynow Core, BillPay AUTH, Stripe, and Bisafe sandbox — and Paab is red because it's blocked on your side: I'm awaiting the sandbox and docs from Paynow. So it's not that I can't build it; it's that I can't start it.
*If pushed:* That's ask number one of my three: unblock Paab plus BillPay PAY. Give me the sandbox and I'll have escrow holds demoable the same way the other rails are.

---

### MARKET

**Q — One field visit — representative sample? `[concede-and-reframe]`**
*"One field visit on 19 March — one house, one Wednesday. How is that representative? WhatsApp groups already work for the long tail you're targeting. What evidence that the same people who choose free WhatsApp will switch to paying for a platform with a constable workflow they don't understand?"*

You're right — one visit, one floor, one day, and I won't dress it up as a survey. What it gave me is structural facts that don't need a sample: the US$1,000 deposit gate, the 12% take, a constable stamping by hand. Those are real and verifiable. The behavioral claim — that sub-US$500 trades will pay to leave WhatsApp — is exactly what I have NOT tested, which is why the whole ask is a paid 90-day pilot with a 30%-of-GMV success gate. The pilot IS the validation; if I miss 30%, the doc says I revisit product-market fit before signing house #2.
*If pushed:* I'd rather buy that evidence with one paid pilot than fake it with a survey of people who lie about willingness-to-pay — a paid pilot is the only signal that actually counts.

**Q — Mr. Mawere's forcing function. `[concede-and-reframe]`** *(See Top 10 #8.)*
*"Mawere cares about volume and brand. You offer 15% digital adoption at maturity. He takes home 12% on a physical floor with zero tech work, you give maybe 1-2% more after fees — why wouldn't he keep doing what he's doing? What's the forcing function?"*

Honest answer: there is no forcing function, and I shouldn't pretend there is. He doesn't adopt to save a point on fees — my 0.75% surcharge barely moves his take. He adopts for reach he physically cannot get: new bidders his floor never sees — diaspora, salaried buyers who can't come on a Wednesday — and his buyer list as a remarketing asset he doesn't own today. The marginal remote bidder who pushes a price up 5% is incremental GMV on top of his floor, not a substitute. If that reach story doesn't land in the pilot, he walks — and the contract is 12-month renewable, not a lock-in, so he can.
*If pushed:* If new reach doesn't materially lift his GMV in 90 days, he shouldn't adopt and I'd tell him so — that's the whole reason the pilot is paid and gated, not free.

**Q — Dealers profit from opacity — why evangelize transparency? `[concede-and-reframe]`**
*"You noted attendees are 'professional dealers and resellers' — most comfortable with the deposit gate, in-person verification, opaque pricing. These are the people who benefit from information asymmetry. Why would they evangelize a digital floor that makes deals transparent and shows everyone the bid history?"*

They won't — and I'm not pitching them. The dealers are the incumbents who profit from opacity; you're right they have no reason to evangelize transparency. My own field doc names the real market as the people who want cattle but can't attend — diaspora, salaried buyers, smallholders outside the catchment. The customer is the house OWNER, and his interest diverges from his dealers': those new bidders are net-new GMV and a remarketing list he keeps. The honest tension is the dealers will resist, which is precisely why this is a digital extension capped around 15% adoption, not a replacement that declares war on his best buyers.
*If pushed:* If the dealers' resistance kills it, that surfaces in the pilot — and a 12-month renewable term means neither of us is trapped if the floor's politics reject it.

**Q — Unsigned Paynow contract, zero hedging. `[concede-and-reframe]`**
*"You do 0.75% surcharge on top of Paynow's fee, but the partnership isn't signed — Bisafe is 'awaiting spec.' If Paynow prices aggressively or changes terms, your unit economics collapse. Zero hedging. And if they don't want the vertical, no Plan B."*

Fair on the contract — it isn't signed, and the risk table calling Paynow-dependency "Low, we're internal-friendly" is thinner than I'd like. But look at where the money is: my Tier B unit is US$14,400 retainer plus US$2,430 surcharge — the surcharge is barely a seventh of revenue, and it's a pass-through I price ON TOP of Paynow's fee, so their pricing doesn't crush my margin, it changes the buyer's bill. The retainer is the spine. On Plan B, the design is already multi-rail: Paynow primary, EcoCash USSD direct as fallback, Stripe for diaspora. And this is literally why ask number two is to formalize the partnership — I'd rather lock terms than assume them.
*If pushed:* If Paynow doesn't want the vertical at all, I still have a managed-service business on EcoCash USSD direct — smaller and uglier, but the retainer doesn't depend on the surcharge.

**Q — TAM is tiny — why should Paynow spend resources here? `[concede-and-reframe]`**
*"Your TAM is 40-60 houses. Land all three tiers and that's a US$50-60k/year business at full maturity. Not nothing, but why should Paynow invest partnership resources in a channel moving that much volume when we could focus on commodity e-commerce instead?"*

You're right that my founder income — US$6k, US$17k, US$32k over three years — is small and I won't inflate it. But the number that matters to Paynow isn't my income, it's GMV onto your rails: US$43k, then US$223k, then US$545k, growing 5x in three years from a standing start, in USD, in a cash-entrenched market you're trying to digitize. The ask isn't capital — it's three near-zero-cost doors: unblock Paab and BillPay PAY, formalize the partnership, open one introduction. That's a cheap call option on a vertical that drags physical cash trade onto Paynow, with me carrying all the operating risk.
*If pushed:* Commodity e-commerce and this aren't either-or — I'm a self-funded channel routing offline cash trade onto your rails at no cost to you, which is the part general e-commerce can't reach.

**Q — When does the digital channel threaten the Saturday floor? `[concede-and-reframe]`**
*"You position this as 'digital extension, not replacement,' but the economics assume 15% digital adoption — the house still does 85% in person. At what point does the digital channel get big enough to threaten the Saturday operation? Because that's when Mawere kills it."*

That's the real tension and the doc should state it more plainly. Here's what keeps the incentives aligned: doubling adoption from 15% to 30% adds only about US$200 a month — the surcharge is small by design, so I have no incentive to cannibalize his floor, and neither of us is chasing 50%. The honest framing is the digital channel mostly adds bidders who were never going to walk into his shed anyway — diaspora, remote, salaried — so it's incremental, not substitutive. If it ever did start eating his Saturday, that's his call, and the 12-month renewable term means he can throttle or exit.
*If pushed:* My revenue barely grows whether he's at 15% or 30%, so I'm structurally incentivized to protect his floor, not replace it — the alignment a pure-commission model wouldn't give him.

**Q — WhatsApp is free and entrenched. `[concede-and-reframe]`** *(See Top 10 #9.)*
*"WhatsApp groups are free, instant, entrenched. You charge US$1,200-1,500/month plus fees. No police-clearance, no formal settlement — but no middleman cut either. For cash-preferring sellers and informal dealers that's a feature. How do you overcome that incumbency at that price?"*

I concede the row in print: WhatsApp wins on time-to-start and it's free at point of use. For a US$80 goat between two people who know each other, I lose, and I shouldn't try to win that. Where I win is the trade above roughly US$200 between strangers, where the absence of escrow, settlement, audit trail, and police clearance stops being a feature and becomes the reason the higher-value end still walks into the physical shed today. And the house isn't paying US$1,200 to replace WhatsApp — he's paying for a branded surface that captures those buyers as HIS remarketing list, instead of the group admin's.
*If pushed:* I'm not selling against free chat for a goat — I'm selling trust for the trades where a stranger won't send cash first, and the field doc already shows those buyers walking into the shed, not the WhatsApp group.

---

## 5. One-line mantra

**Honesty buys the room. "The small number is mine, the big number is yours" — I carry all the operating risk for a US$6k income; you get US$43k→US$545k of cash trade onto your rails for the price of three doors. Concede the weakness flat, then land every answer on unblock / formalize / open one door.**
