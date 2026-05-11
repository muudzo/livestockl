# Customer Success Playbook — Operations Lead

> **Status:** v1.0 internal  ·  **Author:** Tatenda Nyemudzo  ·  **Date:** May 2026
> **Audience:** ZimLivestock operations lead (and the founder hiring them)
> **Companion docs:** [`business-case.md`](business-case.md) · [`gtm-strategy.md`](gtm-strategy.md) · [`pilot-proposal.md`](pilot-proposal.md)

This is the document a new operations hire reads on day one. It is not for customers. It is opinionated and specific to ZimLivestock at this stage — three engagements, one customer profile (Mr. Mawere), one core integration (Paynow), one critical day of the week (Saturday).

Numbers in this document are illustrative defaults. Where you see "<2h" or "30%" treat that as the starting baseline; adjust per engagement once we have data.

---

## 0. Read this first

Three things to internalise before anything else:

1. **The retainer exists because Mr. Mawere refuses to operate the platform himself.** Every time you find yourself thinking "the customer should just do X in the admin panel" — stop. *You* do X. That is the job. The retainer is not paying for occasional support; it is paying for you to be the person who never bothers him.
2. **Saturday is sacred.** Most auction houses run their main sale on Saturday morning. Everything we do — deploys, schema changes, communications, even a friendly check-in call — bends around that. There is no neutral Saturday on this team.
3. **You are the relationship.** The auction-house owner does not call "ZimLivestock." He calls *you* by name. If you leave the company without a 30-day handover, we lose the customer. That is not a flaw of the model; it is the model. Plan accordingly.

---

## 1. The role — what you own, what the founder/engineer owns

### One-page ownership map

| Domain | Operations lead (you) | Founder | Engineer |
|---|---|---|---|
| Day-to-day customer relationship | **Own** | Backup at month 1, 6, 12 | — |
| Buyer/seller support tickets | **Own end-to-end** | — | Escalation only |
| Payment reconciliation (monthly) | **Own** | Reviews | Builds the report tooling |
| Monthly reporting to the auction house | **Own (write + deliver)** | Reviews drafts in month 1–3 | — |
| Quarterly business reviews | **Own (run them)** | Attends in person | — |
| Renewal conversation at month 9–12 | Sets it up; in the room | **Owns the close** | — |
| Sale-day incident command | **Own (incident commander)** | Notified, joins if SEV-1 | **Fixes** under your direction |
| Schema / RLS / Edge Function changes | Surface symptoms; never edit | Approves | **Owns** |
| New feature decisions | Surface requests with context | **Owns** | Implements |
| Discovery calls with new prospects | Joins from engagement #2 onward | **Owns** | — |
| Pricing negotiations | Never alone | **Owns** | — |
| Pass-through cost itemisation | **Own (gather + report)** | — | Provides raw data |
| Constable workflow tuning | **Own (talk to constables)** | — | Implements changes |
| Sale-day monitoring (live dashboards) | **Own** | — | Builds + maintains |
| Onboarding (months 1–3) | **Own day-to-day** | On floor day 1, week 4, week 12 | Builds out the integration |

If you ever find yourself doing something not on the "Own" column in your row, stop and check whether you should be.

### What "ops lead owns" actually means at this stage

We are a small team. You will sometimes do things that, at a larger company, would not be your job — answer a buyer's WhatsApp at 8pm Friday, drive to the auction house at 5am Saturday to be on-site for the first sale, write a refund email by hand because the bulk-refund tool isn't built yet. That's the SaPS shape. The retainer prices it in.

What "ops lead owns" does *not* mean: writing code, touching the database, deploying. If a problem requires those, escalate. We pay an engineer for a reason.

---

## 2. Onboarding playbook — months 1–3

The first 90 days set the customer's perception of us for the entire 12-month commitment. The owner has not seen us run anything yet. We are still in the "did I make a mistake signing this?" window in his head, and every interaction either reinforces or undermines that.

### Phase 1 — Week 0 to Day 1 (pre-go-live)

Before the first sale day, you should have done all of this:

| Task | Why |
|---|---|
| Walked the floor with the auction house owner during a non-sale day | You need to recognise the people, layout, and routines before the first incident |
| Met the bookkeeper and exchanged WhatsApp + email | The bookkeeper is the second-most-important person at the customer. She validates every monthly report. |
| Met the auctioneer (often a different person from the owner) | The auctioneer controls the rhythm of sale day. If she doesn't like the platform, sale-day adoption stalls. |
| Met the on-site constable(s) | Constables verify brandings. We cannot ship without them. |
| Done a dry run of a sale on the platform with three test listings | You need to have personally pressed every button before you tell a customer to press it |
| Confirmed Paynow merchant ID, Paynow webhook destination, SMS sender ID, escrow account routing | If any of these are wrong on sale day, you can't fix it from the floor |
| Scheduled the four week-1 daily check-in calls already on the calendar | Don't ask the owner if you can call him daily — tell him you will, then do it |

### Phase 2 — Week 1 to Week 4 (daily-touch period)

**Cadence: a 10-minute call every weekday, on-site every Saturday for the sale.**

Week-1 daily check-in script (this is a template — actually follow it for the first two weeks, then ease off the structure):

```
1. "What happened on the platform yesterday/this morning?"  (their narrative first)
2. "Here's what I saw on my side." (numbers: GMV, listings created, bids, tickets)
3. "One thing I noticed: ___" (a specific observation — never generic)
4. "Anything you want me to change before Saturday?"
5. Confirm tomorrow's call time.
```

What to monitor every day in week 1–4:

| Signal | Where to look | Red flag |
|---|---|---|
| Listings created since yesterday | Admin dashboard, listings tab | Zero new listings two days running |
| Bids placed | `bids` table, count by 24h | Zero bids on listings >24h old |
| Failed Paynow initiations | `payments` where status = failed | > 5% of attempts |
| Successful settlements vs. expected | Paynow merchant dashboard reconciled against our `payments` | Mismatch of any amount |
| SMS delivery failures | TXT.co.zw report | > 2% non-delivery rate |
| Open buyer/seller tickets | Support inbox | Anything > 24h old |
| Owner's WhatsApp tone | Read the room | Short answers, missed callbacks |

**The conversations to have in this period:**

1. **"Tell me about the regulars."** By week 2 you should know the names of the top 10 buyers at the floor. The owner expects you to recognise them.
2. **"What would you have done differently last Saturday?"** Asked every Monday. The answer is your weekly improvement queue.
3. **"Is your bookkeeper happy with the report?"** Asked at end of month 1, in person if possible. She is the person who renews you.
4. **"What's the next thing you want us to fix?"** Asked weekly. Surface to engineering with context.

**What to flag immediately to the founder:**

- Any complaint from the owner that doesn't get resolved within 48 hours
- Any sign the bookkeeper isn't reconciling against the monthly report
- Any settled-payment discrepancy of any size
- Any conversation containing "I'm not sure this is working"
- Any conversation with someone from a *different* auction house — these are inbound prospects and the founder needs to know

### Phase 3 — Week 5 to Month 3 (weekly-touch period)

Move from daily to weekly check-ins by week 5 *only if* week 4 went well. Definition of "well":
- Two consecutive sale days with no SEV-1 incidents
- Owner answering calls within 24 hours
- Bookkeeper confirms month-1 report matches her reconciliation
- ≥10% of one sale day's GMV through the platform — internal ramp milestone, not a contractual one. The day-90 contractual target in [`pilot-proposal.md`](pilot-proposal.md) is 30%.

Weekly cadence:

| Day | Touchpoint | Owner |
|---|---|---|
| Monday morning | Post-sale-day debrief call with owner | You |
| Wednesday | Mid-week listings/bids health check (internal) | You |
| Friday 5pm | Next-day sale list review call with the auctioneer | You |
| Saturday | On-site for the sale (month 1–2), then remote-but-available (month 3+) | You |

### Onboarding success criteria at day 90

These are the same three criteria from the pilot proposal — the operations lead is the person responsible for hitting them:

1. ≥30% of a single sale day's GMV through the platform.
2. At least one platform-active buyer or seller who was not previously a floor regular.
3. Owner willing to sign a 12-month operations commitment.

If at day 60 we are not on track for any of these, you escalate to the founder and we co-design a corrective plan. **Do not wait until day 89 to surface a miss.**

---

## 3. Steady-state operations — month 4 onward

After the 12-month commitment is signed, the relationship shape changes. You move from "proving it works" to "keeping it running quietly." This is the phase where most SaaS-style operators get complacent and customers churn at renewal. We do not.

### What "running well" looks like

| Indicator | Steady-state target |
|---|---|
| Sale-day uptime | 99.5% during the sale window (8am–2pm Saturday) |
| Listings created per week | ≥ baseline week 4 number, ideally growing month-over-month |
| Bids per listing | ≥ 3 average; ≥ 1 from a non-regular |
| Settlement success rate | ≥ 95% of initiated payments settle within 30 minutes |
| GMV share through platform | ≥ 30% of sale-day total, ideally 50%+ by month 6 |
| Owner-initiated calls per month | 0–2 (more than 2 = something's off) |
| Open tickets at end of week | < 5 |
| Tickets resolved within SLA | ≥ 95% |

### Response time SLAs

These are the response SLAs we commit to internally. Communicate them to the customer only if asked — over-deliver against them, don't market them.

| Ticket category | Business hours response | Weekend response | Resolution target |
|---|---|---|---|
| **SEV-1 — sale day platform broken** | < 15 min | < 15 min (always) | 1 hour |
| **SEV-2 — payment failed / stuck for a real buyer** | < 1 h | < 2 h | 4 h |
| **SEV-3 — buyer/seller confused, can't proceed** | < 2 h | < 8 h | 24 h |
| **SEV-4 — feature request, minor bug, cosmetic** | < 24 h | next business day | next sprint |
| **SEV-5 — owner asking a question** | < 30 min, always | < 1 h, always | same day |

"Business hours" for us = Monday–Friday 8am–6pm Africa/Harare time. Saturday is on-call by default for everyone on the operations team.

**SEV-5 sits above the buyer-and-seller tickets.** When the owner reaches out, we respond before anyone except a SEV-1 (where we're already calling him anyway). That is intentional. He is the customer; everyone else is a user.

### When to escalate to the engineer

Escalate immediately if:
- Any RLS or auth error appears in logs (security boundary)
- Settlement reconciliation mismatch of any size
- A schema/migration question
- Anything involving Edge Functions, atomic RPCs, or webhook signatures
- A Paynow integration warning (rate limit, signature failure, suspended account)
- An auction did not close at its scheduled time
- An incorrect bid amount got recorded
- Two failed attempts at the same fix

Do not escalate for:
- Buyer forgot password (you reset it manually if needed)
- Seller wants to edit a listing (use admin tools)
- Refund for a buyer who didn't collect (use the refund flow we built for this)
- Owner asks "can we add X" (note for the founder, don't ping the engineer)

The rough rule: if it touches **data correctness, money, or security**, page the engineer immediately. If it's a usability or workflow question, you own it.

---

## 4. Communication cadence per customer

Each engaged auction house has the following baseline cadence in steady state. Adjust upward (more touch) when you see health indicators slipping; never adjust downward without the founder agreeing.

### Daily — internal only

| When | What | Where |
|---|---|---|
| 8am | Read overnight logs, ticket queue, payment reconciliation deltas | Slack `#ops-daily` post |
| 6pm | Close-of-day note: any open tickets, anything for tomorrow | Slack `#ops-daily` post |

You do not call the customer daily after week 4. But you check on them daily.

### Weekly — customer-facing

| When | Touchpoint | Channel | Length |
|---|---|---|---|
| **Monday 9am** | Post-sale-day debrief with owner | Phone call | 15 min |
| **Wednesday 2pm** | Listings/bids check with the bookkeeper (data validation, not a sales call) | WhatsApp | 5 min |
| **Friday 5pm** | Next-day sale list review with the auctioneer | Phone call | 10 min |
| **Saturday 8am–2pm** | On-call, optionally on-site, watching the live dashboard | Phone available | full window |

The Friday 5pm call is the single most important call of the week. It is what catches issues before sale day. Never skip it. Reschedule it if you must, but never skip.

### Monthly — customer-facing

| When | Touchpoint | Channel | Length |
|---|---|---|---|
| **First Monday of the month** | Monthly report delivered + walked through | In person if local, video call otherwise | 30 min |
| **Third Friday** | Mid-month informal check-in: "anything coming up?" | WhatsApp voice note or call | 10 min |

The monthly report is also delivered to the bookkeeper in writing. Do not assume the owner forwards it.

### Quarterly — customer-facing

A formal **Quarterly Business Review (QBR)** on-site at the auction house. Structure is in section 7. You run it. The founder attends in person.

### Annually — customer-facing

The renewal conversation (section 10). Founder leads, you set it up and are in the room.

### Cadence by engagement age

| Customer age | Daily | Weekly | Monthly | Quarterly |
|---|---|---|---|---|
| Week 1–4 | Daily call | (rolled up) | — | — |
| Week 5–12 | Internal monitoring | 3 calls/week + Sat on-site | First-month report at week 4 | — |
| Month 4–9 | Internal monitoring | 3 calls/week (Sat remote) | Report + walkthrough | Q1 QBR (month 3) |
| Month 10–12 | Internal monitoring | 3 calls/week | Report + renewal prep | Q4 QBR + renewal conversation |
| Year 2+ | Internal monitoring | 2 calls/week (Mon + Fri only) | Report | Standing QBR |

---

## 5. Incident response — the sale-day-critical playbook

This is the section you reread at 5am every Saturday until you have done it ten times.

### Severity definitions

| Severity | Definition | Examples |
|---|---|---|
| **SEV-1** | Platform unavailable or core function broken during a sale window, or money is at risk | Site down 30 min before sale; bids not registering; settlement webhook failing; auction not closing |
| **SEV-2** | A real, named buyer or seller is stuck and the auction house notices | Buyer's USSD prompt not arriving; seller's listing won't publish; SMS confirmation not sent |
| **SEV-3** | Degraded but workable | Dashboard slow; one ticket category broken; intermittent SMS failures |
| **SEV-4** | Cosmetic or minor | Typo, layout bug, low-priority feature gap |

### SEV-1 sale-day runbook — "platform down 30 minutes before Saturday sale"

This is the worst-case incident. Plan for it. Practise it.

**T-minus 30 minutes — alert fires.**

1. **You acknowledge in Slack within 60 seconds.** "I have it. Acknowledged at 07:30."
2. **You call the engineer.** Not Slack-ping — call. Same time you open Slack.
3. **You call the owner.** Script below.
4. **You start the incident log** in a shared doc (template: `incidents/YYYY-MM-DD-customer-shortdesc.md`). Timestamp everything.

**Owner-call script — first call, plain language:**

> "Mr. Mawere — Tatenda from ZimLivestock. We have a platform issue that's affecting the site right now, half an hour before your sale. My engineer is on it, I am the incident commander, and I'll call you back in 10 minutes with an update. The physical floor is unaffected — your sale runs as normal. If a buyer asks why the website is slow, tell them we're aware and fixing it. I'll have an update for you by 7:40."

Then call back at 7:40. Whatever the state. Even if it's "still working on it." Especially if it's "still working on it." Silence is what makes the owner lose trust.

**T-minus 30 to T-zero — what you do:**

| You | The engineer |
|---|---|
| Monitor: are bids landing? Are payments initiating? | Diagnose root cause |
| Call owner every 10 min with status | Implement fix |
| Draft customer comms (SMS to platform users) | Deploy fix |
| Decide whether to broadcast a fallback message | Verify in production |
| Log every action with timestamp | Confirm green |

**Customer (platform-user-facing) comms template:**

```
SMS broadcast to active bidders:
"ZimLivestock notice: our platform is experiencing a brief issue.
Bids placed in the last 15 minutes are safe. We'll send an
update by [time]. The physical sale at [auction house name]
is unaffected. — ZimLivestock ops"
```

Do not send this unless the founder has approved the wording. Pre-approve a template now so you're not asking permission in an incident.

**T-zero — sale begins:**

- If the platform is healthy by sale time: send an SMS update to the bidder list. "Platform fully restored. Good luck this morning."
- If the platform is not healthy by sale time: this is now a SEV-1 with customer-impact. Owner gets a call immediately. We honour any bid in flight at the time of failure. The auction house's physical sale is unaffected.

**Post-incident, same day:**

1. **Send the owner a same-day "what happened" note** by WhatsApp. Plain language. No engineering jargon.
2. **Schedule a 15-minute Monday morning call** with the owner — not just the regular Monday debrief. This is its own conversation about the incident.
3. **Internal post-mortem within 72 hours.** Engineer + founder + you. Document: root cause, customer impact in money terms, what we change to prevent recurrence.
4. **Tell the founder whether to call the owner personally.** For a SEV-1 that affected real money, the answer is always yes.

### Who pages whom

| Trigger | First page | Second page | Third page |
|---|---|---|---|
| SEV-1 alert during sale window | You (you're on-call) | Engineer | Founder |
| SEV-1 alert outside sale window | You | Engineer (if money at risk) | Founder if not resolved in 2h |
| SEV-2 during sale window | You | Engineer | — |
| SEV-2 outside sale window | You | Engineer next business hour | — |
| SEV-3 / SEV-4 | You, queue normally | — | — |

**You are always the first page.** Even at 5am on Saturday. That is what the retainer pays for.

### Common incidents and their first-step playbooks

| Incident | First action |
|---|---|
| Site loads but bids not registering | Check `bids` table inserts; check `place_bid` RPC errors; check RLS denials in logs |
| Paynow USSD prompt never arrives at buyer's phone | Check `payments` row for that buyer; check `initiate-payment` Edge Function logs; if Paynow side, contact Paynow ops |
| Auction did not auto-close | Check `end-auctions` Edge Function last-run timestamp; manually trigger if needed; never close the auction by hand without engineer approval |
| Seller's listing won't publish | Check listing record; check RLS for the seller; check image-upload status |
| SMS confirmations not arriving | Check TXT.co.zw delivery logs; check sender ID balance |
| Settlement webhook silent for >10 min | Check Paynow merchant dashboard for the settlement; fall back to poll-URL; raise with Paynow if neither resolves |
| Bookkeeper says her reconciliation doesn't match our report | **Page engineer immediately.** Reconciliation discrepancies are SEV-1 in every other sense, even if the platform is up. |

---

## 6. Monthly report template

The monthly report is the single most important artefact you produce. The bookkeeper validates it. The owner reads it. It is what justifies the retainer to the auction house every 30 days.

Deliver it on the **first Monday of the month**, in person (if local) or by video call, with a PDF and a CSV attached for the bookkeeper.

### Report structure (one page + appendix)

```
ZimLivestock — Monthly Report for [Auction House Name]
Reporting period: [Month YYYY]
Prepared by: [Operations lead name], delivered [date]

────────────────────────────────────────
1. Sale-day GMV processed by the platform
   - Total settled GMV this month:        US$ ______
   - Number of sale days:                 _____
   - Avg per sale day:                    US$ ______
   - % of total floor GMV through platform: ____%

2. Transaction surcharge
   - 0.75% of settled GMV:                US$ ______
   - Invoiced this month
   - Itemised line-by-line in appendix A

3. Buyer & seller activity
   - New buyers registered:               _____
   - New sellers registered:              _____
   - Buyers active this month:            _____
   - Sellers with at least one listing:   _____
   - Listings created:                    _____
   - Bids placed:                         _____
   - % bids from non-regulars:            ____%

4. Support tickets
   - Opened:                              _____
   - Resolved:                            _____
   - Still open at month-end:             _____
   - Average time-to-resolution:          ___h
   - Tickets resolved within SLA:         ____%

5. Operations notes
   - Incidents this month:                _____
   - Of which SEV-1:                      _____
   - Significant events: [free text, 2–4 lines]

6. What's next
   - [3 specific things we are doing in the coming month, plain language]

────────────────────────────────────────
Appendix A: Transaction-surcharge line items
Appendix B: Pass-through costs (Bisafe, SMS)
Appendix C: Settlement reconciliation
            (each settled payment, matched to Paynow dashboard ID)
```

### Rules for writing the report

- **Plain language.** No platform jargon. "USSD prompt" is fine; "Edge Function 404" is not.
- **Show negative numbers honestly.** If listings were down month-on-month, say so, and say why.
- **No marketing fluff in "What's next".** Three concrete actions with named owners and dates.
- **Attach the CSV.** The bookkeeper will not trust a number she can't reconcile against her own books.
- **Sign your name.** This is your monthly accountability moment.

### Reading the room when delivering

Watch for:
- The owner skips the GMV number and asks about something else → he doesn't trust the number yet
- The bookkeeper opens a notebook before you start → she has questions; pause and ask now
- The owner asks "where's the receipt from Paynow?" → he is reconciling in his head; you need a better reconciliation appendix next month
- He says "this looks fine" without reading it → that is *not* a good sign. Slow down and walk through the numbers anyway

---

## 7. Quarterly Business Review (QBR) structure

The QBR is the conversation that earns you the renewal nine months before it's due. Held on-site at the auction house, 90 minutes, every three months.

### Who's in the room

| Their side | Our side |
|---|---|
| The owner (Mr. Mawere) | Operations lead (you) |
| The bookkeeper | Founder |
| Optional: the auctioneer | — |
| Optional: a constable for Q1 only | — |

### Agenda (90 minutes total)

| Time | Section | Who leads | Output |
|---|---|---|---|
| 0:00–0:10 | Coffee, small talk, the owner's recent news | The owner | Relationship temp-check |
| 0:10–0:25 | Quarter in numbers — GMV, transactions, buyers, listings, incidents | You | Shared understanding of the quarter |
| 0:25–0:40 | What worked / what didn't (theirs first) | The owner | Honest feedback you write down |
| 0:40–0:55 | What we changed in response to last quarter's feedback | You | Demonstrates that the retainer pays for itself |
| 0:55–1:10 | What we're seeing on other floors — anonymised | Founder | Demonstrates we are in the market |
| 1:10–1:25 | Next quarter plan — three concrete things we'll do | Founder + you | Signed-off priorities |
| 1:25–1:30 | Anything else | Anyone | Catch the unspoken |

### Q4 QBR is special

The Q4 QBR (month 9) is the renewal-staging conversation. Section 10 covers this in detail.

### What never goes in a QBR

- A pitch for new add-ons. (Save those for the next month's check-in, not the quarterly review — it's a trust day, not a sales day.)
- A defensive response to feedback. Write it down, say "thank you, we'll come back on this," and move on.
- A forward-looking commitment you haven't cleared with the engineer. ("Yes, we'll build that for you in three weeks" — never say this in a QBR unless engineer has agreed.)
- The phrase "best practice." Mr. Mawere doesn't care. He cares about his floor.

---

## 8. Customer health metrics — leading indicators of churn

A SaPS customer rarely churns suddenly. They go cold for two months, then announce at renewal that "we're going back to the way we did it before." By the time they tell you, you've already lost them.

The leading indicators below catch the slide early, while you can still do something about it.

### The six signals

Track these per customer, every Monday. Score each red / amber / green.

| # | Signal | Green | Amber | Red |
|---|---|---|---|---|
| 1 | **Owner returns calls within 24h** | Yes, every time | Once missed in 30d | Twice missed in 30d, or stops returning |
| 2 | **Platform engagement (listings + bids)** | At or above 30-day avg | 10–30% below avg | >30% below avg for 2 weeks |
| 3 | **Open tickets aging out of SLA** | < 5% breach | 5–15% | > 15%, or any owner-raised ticket breached |
| 4 | **Bookkeeper validates monthly report without questions** | Signs off in <48h | Asks questions, eventually signs | Doesn't sign off, or raises a discrepancy |
| 5 | **GMV share through the platform** | ≥30%, growing | ≥30%, flat | <30%, or declining 2 months running |
| 6 | **Owner brings up other vendors / asks "what does X cost"** | Never | Mentions in passing | Asks for a comparison or names a competitor |

**Composite rule:**
- All green → steady state, normal cadence
- Any amber → you raise it in the weekly internal review; consider an extra mid-week call this week
- Any red, or two ambers in the same month → **escalate to the founder, start a save play**

### The one signal that matters most

If you only have time to track one signal, track **#1 — does the owner return your call within 24 hours?**

Everything else has a technical or commercial explanation. A non-returning owner has *only* one explanation: he is mentally checking out. By the time the GMV signal flips, he has already decided. By the time the call-return signal flips, he is deciding.

### NPS — treat as one input among several

Quarterly NPS surveys are a real metric in the GTM doc, and we run them. But weight them lightly against the behavioural signals above: Mr. Mawere will tell a survey he likes us and then not renew. The call-return signal and the GMV signal are stronger predictors. Use NPS to spot delight or distress that the other signals didn't catch, not as the primary thermometer.

---

## 9. Save plays — when a customer signals churn

The moment a customer hits red on any signal, you have ~30 days to save them. Move with urgency but not panic — the owner will read panic as a confirmation he was right to be sceptical.

### The four save plays

#### Save play 1 — "Show up in person, no agenda"

**Trigger:** Owner stops returning calls, or composite goes red.

**Move:** You drive to the auction house on a non-sale weekday. No meeting agenda, no slide deck. Coffee. "I wanted to come see how things are." Spend two hours. Listen.

Most often, what you'll learn is not a product problem — it's a relationship gap. Someone at the auction house told the owner a story we didn't get to counter, or he had a bad month for non-platform reasons, or the bookkeeper's been complaining and he didn't tell us.

**Result:** 60% of save situations resolve here. The relationship was the problem.

#### Save play 2 — "Bring the engineer"

**Trigger:** A specific technical issue keeps recurring; owner has lost confidence in our ability to fix it.

**Move:** The engineer goes to the auction house in person with you. They sit with the owner, explain what happened in plain language, show what they're doing to prevent it, and answer questions for as long as the owner wants.

This is unusual — we deliberately keep the engineer off the customer-facing front line. Pulling them in is a strong signal that we take this seriously. Don't overuse it.

**Result:** 70% of "I don't trust your tech anymore" situations resolve.

#### Save play 3 — "Restructure the engagement"

**Trigger:** Owner says "I don't see what I'm paying for."

**Move:** Founder steps in. The conversation is: "What if we changed the retainer to be tied to GMV through the platform — you pay more only as you make more?" or "What if we dropped the retainer 30% for the next 90 days while we re-prove the value, then revisit?"

**Important:** This is the founder's conversation. You set it up. You are in the room. You do not propose terms yourself.

**Result:** Saves about 40% of these situations. The ones it doesn't save were already lost before the conversation.

#### Save play 4 — "Bring a third party in"

**Trigger:** Owner is genuinely conflicted, not antagonistic. He wants someone to tell him it's working.

**Move:** Arrange a peer call with another auction-house owner we work with (only one with a strong relationship; ask permission first). 30 minutes, peer-to-peer, no us in the room.

**Result:** Powerful but only usable once we have a second engaged customer. By engagement #2, this becomes our strongest save play.

### What to never do in a save play

- Discount the retainer below 30% off. We anchor our retainer firm; deeper than 30% off means we'd rather lose the customer than reset the pricing benchmark.
- Promise a feature that isn't on the engineering roadmap. Promises broken in a save situation kill the relationship for good.
- Apologise without action. "I'm sorry you feel that way" is worse than not calling.
- Move alone. Save plays go through the founder. Always.

### When to stop trying to save

After two save plays in a 30-day window with no movement, the relationship is over. Stop spending operations capacity on it; finish the contractual term cleanly, write a postmortem, and use what you learn for the next customer.

Losing a customer cleanly is a skill. Burning a year of operations capacity trying to save a customer who's already gone is the more expensive mistake.

---

## 10. Renewal motion — month 9 to month 12

The 12-month commitment ends at month 12. The renewal conversation begins at month 9. Started early, the renewal is a continuation. Started at month 11, it is a negotiation. We always want a continuation.

### Timeline

| Month | What happens | Who |
|---|---|---|
| **Month 9 (Q4 QBR)** | Soft introduction: "Next quarter we'll talk about the year-2 plan." | Founder, with you in the room |
| **Month 10 monthly report** | Include a "Year 1 in review" section — full year numbers, before-and-after | You write, founder reviews |
| **Month 10 month-end** | Dedicated 60-min Year-1 retrospective call | You + founder + owner + bookkeeper |
| **Month 11** | Renewal proposal delivered in writing | Founder owns, you support |
| **Month 11 mid-month** | Renewal conversation, on-site | Founder leads, you in room |
| **Month 12, week 1** | Renewal signed (or not) | Founder closes |
| **Month 12, week 4** | Year-2 kickoff (if signed) — first sale-day of new term | You |

### What we offer at renewal

| Tier | Year-1 terms | Year-2 standard renewal terms |
|---|---|---|
| Engagement fee | One-off, already paid | None — no re-engagement fee |
| Retainer | Pilot rate (often discounted) | Standard rate for their tier (per GTM doc) |
| Transaction surcharge | 0.75% | 0.75%, unchanged |
| Commitment | 12 months | 12 months |
| Add-ons | None | Quoted separately if asked: branded mobile app, deeper analytics, transport referrals |

### What we never offer

- A multi-year lock-in. We always renew at 12 months. The owner needs the option to walk for the relationship to feel mutual.
- A retainer discount in year 2. The reason we discounted year 1 was pilot risk; year 2 is a proven engagement.
- A volume-based retainer tier-down. If their GMV grew, retainer holds (tier-up only).

### The script the founder uses

```
"Mr. Mawere — we're at month 11 now. Time to talk about year two.

Here's what year one looked like: [GMV through platform, surcharge collected,
buyers reached, incidents handled]. Compared to your floor twelve months ago,
that's [specific delta].

For year two we're proposing:
  - same operations engagement, no new engagement fee
  - retainer at our standard tier-B rate of US$1,500/month (up from your
    pilot rate of US$1,200), reflecting what we now operate for you
  - same 0.75% transaction surcharge
  - same 12-month term, your option to walk at month 24

If there's anything in this you want to change, that's the conversation
we have today. If not, my colleague [bookkeeper-friendly name] will send
the paperwork next week.

What would you change?"
```

The "what would you change" question is the one that matters. Mr. Mawere will answer it honestly. Whatever he says next is the negotiation.

### Renewal outcomes — what to do for each

| Outcome | What it means | What we do |
|---|---|---|
| **Signs at standard terms** | Default-good outcome | Celebrate quietly; year 2 begins; reset the cadence |
| **Signs with a discount** | Founder negotiated something; you implement | Document precisely; this is the new benchmark for him |
| **Asks for time to think** | Real concern not yet voiced | Schedule the follow-up in two weeks; meanwhile run save-play 1 |
| **Says he wants month-to-month** | Lost confidence in us | Treat as save-play 3 + founder-led restructure |
| **Doesn't renew** | We lost | Run a clean handover; offer 60 days of read-only access to data; write the postmortem |

### Renewal target

The GTM doc targets **~90% renewal at month 12.** It's a forecast, not a measured rate. The 10% we lose teaches us more than the 90% we keep — every non-renewal triggers a written internal postmortem (founder + you + engineer) within 30 days.

---

## 11. The daily/weekly/monthly checklist — operations lead routines

A one-glance routine reference. Print this and put it on your desk.

### Every weekday

- [ ] 8am: read overnight logs + ticket queue
- [ ] 8:30am: post `#ops-daily` status to Slack
- [ ] Throughout day: respond to tickets within SLA
- [ ] 6pm: close-of-day note to Slack
- [ ] 6pm: check tomorrow's calendar for customer touchpoints

### Every Monday

- [ ] Customer post-sale-day debrief calls (1 per active customer)
- [ ] Score the six health signals for each customer
- [ ] Escalate any reds to the founder

### Every Wednesday

- [ ] Bookkeeper data check-in (WhatsApp, 5 min per customer)
- [ ] Mid-week internal ops review (Slack thread is fine)

### Every Friday

- [ ] 5pm next-day sale list review with each customer's auctioneer
- [ ] Pre-flight the sale-day dashboards (alerts armed, on-call sorted)

### Every Saturday

- [ ] On-call from 7am, available through 2pm
- [ ] On-site for any customer in month 1–2; remote-but-available after
- [ ] Sale-day report by 5pm Sunday, internal

### Every first Monday of the month

- [ ] Monthly report delivered to each customer
- [ ] CSV reconciliation attached
- [ ] Walkthrough call done
- [ ] Bookkeeper sign-off chased within 48h

### Every quarter

- [ ] QBR run on-site, founder present
- [ ] Year-progress update against the three pilot success criteria
- [ ] Action items from QBR captured; first one shipped within two weeks (visible follow-through is the point of a QBR)

### Every month 9 (per customer)

- [ ] Year-1 retrospective drafted
- [ ] Renewal conversation calendar held
- [ ] Founder briefed on customer health going into renewal

---

## 12. Tools you'll actually use

Not an exhaustive list — just the ones you'll touch daily.

| Tool | Purpose | How often |
|---|---|---|
| Supabase admin (read-only) | Inspect listings, bids, payments | Daily |
| Paynow merchant dashboard | Reconcile settlements | Daily on sale days, weekly otherwise |
| TXT.co.zw sender dashboard | SMS delivery, balance, sender ID health | Weekly |
| Linear / GitHub issues | Surface customer requests to engineering | As-needed |
| Slack `#ops-daily`, `#incidents` | Internal comms + paging | Daily |
| WhatsApp Business | Direct customer comms | Daily |
| Google Calendar | Customer touchpoint scheduling | Daily |
| The incident-log doc template | SEV-1 / SEV-2 incident command | Per incident |
| The monthly report template | Customer reporting | Monthly |
| This document | Reread the relevant section before any unfamiliar situation | As needed |

You do **not** get write access to the Supabase database, the Paynow integration credentials, or the Edge Function deploy pipeline. Those live with the engineer. This is deliberate; the SaPS service is *operations*, not *engineering*. If you find yourself needing write access, the answer is to escalate to the engineer, not to get the access.

---

## 13. The mindset section (read this last)

A few things the role does not teach itself:

**The customer is not the buyer or seller on the platform — it is the auction house owner.** When the owner's interests and a buyer's interests conflict, you advocate for the owner. (Within the law and within fair-trade rules. We do not run scams. But marginal product calls go to the owner.)

**The retainer is paying for invisibility, not visibility.** Mr. Mawere is happiest when he does not have to think about us. Counterintuitive for someone in a customer-success role to internalise, but: the best month is the one where you spoke to him three times, the platform processed half a million USD, and he never had to mention us to his bookkeeper.

**Boring is the goal.** Every "good news" story is a story about a sale day that ran without incident. Every "bad news" story is a SEV-1 we wish hadn't happened. The job is to make next month's report boring in the same way last month's was.

**You will be tempted to take credit.** Resist. The auction house's success is the auction house's story. We are infrastructure. The case study credits Mr. Mawere first.

**You will be tempted to skip Saturday morning once it's "running well."** Resist that for the first two years. The Saturday-morning presence — even remote, even just "I'm awake, here's my number, call if anything happens" — is the operational tax that earns the retainer, and the trust we accumulate by being there compounds in ways no one will write down.

**When in doubt, write it down.** Memory degrades. The next ops lead — and there will be one — needs to be able to read your notes and pick up where you left off. The handover discipline starts the day you start, not the day you leave.

---

## 14. The escalation tree (one card)

```
┌─────────────────────────────────────────────────────┐
│ Something is happening. What do I do?               │
├─────────────────────────────────────────────────────┤
│ 1. Is money at risk right now?                      │
│    → YES: page engineer + founder simultaneously.   │
│    → NO: go to 2.                                   │
│                                                     │
│ 2. Is a real named user blocked?                    │
│    → YES, and within SLA window: handle yourself.   │
│    → YES, and SLA breach risk: page engineer.       │
│    → NO: go to 3.                                   │
│                                                     │
│ 3. Is it the auction-house owner asking?            │
│    → YES: respond within 30 minutes, always.        │
│    → NO: go to 4.                                   │
│                                                     │
│ 4. Is it a question about pricing, contract, scope? │
│    → ALWAYS the founder. Never quote yourself.      │
│                                                     │
│ 5. Does it require code or data changes?            │
│    → Engineer. You log the context; they fix it.    │
│                                                     │
│ 6. Is it a feature request or product feedback?     │
│    → Capture it (Linear/doc), surface to founder    │
│      at the weekly internal review.                 │
└─────────────────────────────────────────────────────┘
```

---

## 15. Things to update in this document over time

This is a v1 playbook for a three-customer business. Re-read it every quarter and update specifically:

- Response SLA numbers, once we have 90 days of real ticket data
- The six health signals — drop any that don't correlate with churn, add any that do
- The save plays — based on which ones actually work
- The monthly report template — based on what the bookkeeper actually asks for
- The QBR agenda — based on which sections generate the best conversations
- The incident runbook — based on which incidents actually happened

If you change something material in this document, leave a one-line note at the top of the changed section: `// updated [date] by [name] — reason in one sentence.`

A playbook that doesn't change with the business stops being a playbook and starts being decoration. Don't let that happen.

---

*This document is the operations lead's home page. Bookmark it. Reread the relevant section before any unfamiliar situation. When you find a gap — and you will — fix it here so the next ops lead doesn't have to learn it the same hard way.*
