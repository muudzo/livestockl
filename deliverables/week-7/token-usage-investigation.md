# Claude Code Token Usage — Investigation & Optimization Plan

**Author:** Tatenda Nyemudzo (Paynow Internship)
**Date:** 2026-05-19
**Scope:** 30-day Claude Code usage audit + remediation plan with cited sources
**Audience:** Paynow Tech Ops

---

## 1. Executive Summary

Tech Ops flagged my Claude Code token consumption as high. This document investigates the underlying drivers, separates real cost from accounting artifacts, and commits to a concrete optimization plan.

**Top-line findings:**

1. **Gross volume (2.34B tokens / 30d) overstates real cost by ~25×.** 96% of those tokens are *cache reads*, which Anthropic bills at **0.1× base input price** — a 90% discount.
2. **The dominant waste pattern is long-running sessions that never get `/clear`'d.** One ZimLivestock session ran **5,589 turns** in a single context window. By Anthropic's own guidance, quality starts degrading at 50% context fill — most of those tokens were spent on a degraded baseline.
3. **Two structural drivers are addressable today:** repeated file reads inside one session (top file re-read 32 times), and unbounded Bash output dumps (DB queries, curl bodies, broad greps).
4. **Two optimizations I had not been using:** subagent delegation for verbose ops, and moving stable instructions out of `CLAUDE.md` into on-demand skills.

---

## 2. The Numbers (raw, from session logs)

Source: `~/.claude/projects/*/*.jsonl` — Claude Code writes per-turn `message.usage` records I can sum.

### 30-day rollup (all projects)

| Bucket | Tokens | Share | Billed rate¹ |
|---|---:|---:|---:|
| Cache reads | 2.25B | 96% | 0.1× base |
| Output | ~75M | 3% | base output |
| Cache writes | ~17M | 0.7% | 1.25× base |
| Fresh input | small | <1% | 1× base |
| **Total** | **2.34B** | | |
| **"Real work" (output + cache writes)** | **91.8M** | | |

¹ Per [Anthropic prompt-caching pricing](https://platform.claude.com/docs/en/build-with-claude/prompt-caching): cache writes 1.25× base input, cache reads 0.1× base input.

### Per-project (30d)

| Project | Tokens | Notes |
|---|---:|---|
| ZimLivestock (`~/Downloads/app`) | 1.43B | Primary internship work |
| Zippie Payment App | 192M | Side project |
| youtube | 181M | |
| widget | 173M | |
| BIGMAMA$ | 136M | |
| Others (~6) | <500M combined | |

ZimLivestock alone is 61% of total — expected, since it's the actual internship work.

### Last 7 days

1.31B total / 60M real work / **ZL = 827M (63%)**. Distribution roughly matches 30d, no recent anomaly.

---

## 3. Why "2.34B" Looks Scary But Isn't

A common dashboard artifact: gross token count counts cache reads at the same weight as fresh input, but **cache reads cost 10% of base input**. From Anthropic's docs:

> "Cache reads cost 10% of the standard input price, a 90% discount." — [Anthropic Prompt Caching docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)

Translated:

- **Real billable equivalent** ≈ output (75M @ output rate) + cache writes (17M @ 1.25×) + cache reads (2.25B @ 0.1×) + fresh input.
- The 2.25B cache-read line is the prior conversation being replayed each turn. It's **why long Claude Code sessions look enormous on a token meter** — every turn re-reads the full conversation from cache.
- Anthropic's own published benchmark for enterprise Claude Code use: **$13/dev/active-day, $150–250/dev/month, with 90% of users under $30/active-day** ([Manage costs effectively](https://code.claude.com/docs/en/costs)).

**Implication:** the right metric for Tech Ops is **cost-per-shipped-feature**, not gross tokens. A single session that produced the BillPay integration + diagnostic + tested fix is one billed unit of work, regardless of how many turns ran.

---

## 4. What's Actually Driving High Usage (Root Causes)

Audit of the 5 largest ZL session logs:

### 4.1 Mega-sessions that should've been `/clear`'d

| Session ID | Turns | Log size |
|---|---:|---:|
| `09b7b5e8…` | **5,589** | 17 MB |
| `202083c0…` | 3,089 | 8.2 MB |
| `41291abf…` | 1,365 | 4.7 MB |

Anthropic guidance:

> "Use `/clear` to start fresh when switching to unrelated work. Stale context wastes tokens on every subsequent message." — [Anthropic, Manage costs effectively](https://code.claude.com/docs/en/costs)

> "Claude Code's context quality starts degrading at around 50% full" — [claudefa.st context-management guide](https://claudefa.st/blog/guide/mechanics/context-management)

A 5,589-turn session was effectively 5–7 different units of work (BillPay → demo prep → progress report → SaPS pivot) sharing one context. Each subsequent turn paid full freight on the prior 5,000 turns of cache replay.

### 4.2 Repeated reads of the same file in one session

Same-session re-read counts:

- `supabase/functions/billpay/index.ts` — **32 reads** in session `202083c0`
- `deliverables/week-6/research-investigation.md` — 19 reads
- `supabase/functions/send-sms/index.ts` — 18 reads
- `supabase/functions/end-auctions/index.ts` — 18 reads
- `docs/INTERNSHIP-HANDOVER.md` — 22 reads

Each Read tool call adds the full file to the next turn's input. A 500-line edge function read 32× ≈ 16,000 lines of redundant context.

### 4.3 Oversized Bash outputs

In session `09b7b5e8` (767 Bash calls):

- `supabase db query --linked` executed **112 times** — typical output 10–20K tokens (table dumps, policy listings)
- API curl calls with full JSON bodies (5–15K each) repeated 16–34 times
- `grep -rn` across the repo without `--max-count` or path narrowing — 44 invocations

Estimated cumulative bloat: **200–300K tokens per heavy session** from Bash output alone.

### 4.4 Subagent under-utilization

- Bash calls: 767 in one session
- Agent (subagent) calls: **4–12** in the same session

Anthropic guidance:

> "Delegate verbose operations to subagents… so the verbose output stays in the subagent's context while only a summary returns to your main conversation." — [Anthropic, Manage costs effectively](https://code.claude.com/docs/en/costs)

I was doing broad codebase greps and full-file reads in the main thread when an Explore subagent would have returned a 200-token summary instead.

### 4.5 CLAUDE.md sizing (minor)

- Project `CLAUDE.md`: 48 lines, ~759 tokens
- Global `CLAUDE.md`: 41 lines, ~636 tokens

Within Anthropic's "keep under 200 lines" recommendation. **Not a primary driver** — flagging for completeness only.

---

## 5. Optimization Plan (commitments, with sources)

Each commitment has an Anthropic-documented mechanism behind it.

### 5.1 Session hygiene

- **`/clear` between unrelated tasks.** Hard rule. No more 5,000-turn sessions. Source: [Anthropic costs doc](https://code.claude.com/docs/en/costs).
- **`/compact` at 60% context load** before the next big task. Source: same doc + community consensus ([MindStudio guide](https://www.mindstudio.ai/blog/how-to-stop-burning-through-claude-code-tokens-context-management-guide-beginners)).
- **Built a `/budget` skill** that reads my session logs and reports current context % + recommendation. This makes the limit visible instead of theoretical.

### 5.2 Subagent delegation (highest leverage)

Rule: any task involving >3 file reads, broad greps, or "find where X is defined" goes to the **Explore subagent** by default.

> "A single 'go to definition' call replaces what might otherwise be a grep followed by reading multiple candidate files." — [Anthropic costs doc](https://code.claude.com/docs/en/costs)

### 5.3 Bounded Bash output

- Pipe `supabase db query` results through `| head -N` or specific column selection.
- Add `--max-count` to `grep`.
- For test runs, configure a hook to filter to failures only (Anthropic provides a sample script — [costs doc](https://code.claude.com/docs/en/costs)).

### 5.4 Model selection

- Currently running Opus 4.7 for everything.
- Switch to **Sonnet 4.6** for routine edits, doc writing, file moves. Reserve Opus for architectural decisions and multi-step payment/RLS reasoning.
- Source: > "Sonnet handles most coding tasks well and costs less than Opus. Reserve Opus for complex architectural decisions or multi-step reasoning." — [Anthropic costs doc](https://code.claude.com/docs/en/costs)

### 5.5 Adjust extended thinking

For simpler tasks, lower effort via `/effort` or set `MAX_THINKING_TOKENS=8000`. Thinking tokens bill as output. Source: [Anthropic costs doc](https://code.claude.com/docs/en/costs).

### 5.6 Plan mode for multi-file work

Shift+Tab into plan mode before any payment/RLS/schema edit. Prevents expensive re-work when the initial direction is wrong. Source: [Anthropic costs doc](https://code.claude.com/docs/en/costs).

---

## 6. Expected Impact

Rough estimate using current 30d numbers as baseline:

| Lever | Mechanism | Estimated reduction |
|---|---|---:|
| `/clear` discipline (no mega-sessions) | Stops cache-read replay accumulation | 30–40% of cache reads |
| Subagent delegation for grep/explore | Verbose ops kept in subagent context | 15–20% of input |
| Sonnet for routine work | ~5× cheaper per token than Opus | 20–30% of "real work" cost |
| Bounded Bash output | Smaller tool_result payloads | 5–10% |
| **Combined target** | | **~40–50% lower billed cost** for same shipped output |

Numbers are estimates, not guarantees. I'll re-measure 30 days from the date this report is filed.

---

## 7. Caveats & Honest Framing

- **I can't see Anthropic's actual billing dashboard.** All cost analysis here is derived from local jsonl session logs and the published Anthropic pricing tiers. Tech Ops has the authoritative number.
- **Fintech work skews higher than average.** Payment-provider integration involves RLS audits, schema migrations, multi-file reads of edge functions, and compliance cross-checks. Anthropic's $13/dev/active-day average bundles all dev types — I'd expect to be above the median but below outlier.
- **Cache reads inflating gross tokens is real but not a "free lunch."** They still count against rate limits and account-level token quotas even if billed cheap. Reducing them is still the right move — both for cost and for keeping the agent in the "<50% context" quality zone.
- **The 5,589-turn session predates this audit.** I wasn't measuring at the time. Now I am, via the `/budget` skill.

---

## 8. What I'd Ask Tech Ops For

1. **Visibility into the actual billed line items** for my workspace (cache-read $ vs. output $ vs. cache-write $). The Anthropic Console Usage page exposes this — I have local estimates but not the authoritative split.
2. **An agreed cost target** framed as $/active-day rather than gross tokens. Anthropic's published 90th-percentile is $30/active-day; I'd like to know where I sit and what the team considers acceptable.
3. **30-day re-audit window.** Let me apply the levers in §5, then we re-measure. If consumption doesn't materially drop, I'll escalate to additional mitigations (Haiku for trivial tasks, stricter hook-based output filtering, etc.).

---

## Sources

Primary (Anthropic-published):

- [Anthropic — Manage costs effectively (Claude Code docs)](https://code.claude.com/docs/en/costs) — official guidance on `/clear`, `/compact`, model selection, subagent delegation, CLAUDE.md sizing, hooks for output filtering, agent team cost mechanics, extended thinking budgets, and enterprise spend benchmarks ($13/active-day avg, $150–250/dev/month).
- [Anthropic — Prompt Caching (API docs)](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) — definitive source on `cache_read_input_tokens` (0.1× base price), `cache_creation_input_tokens` (1.25× base for 5-min TTL), 5-min default TTL, cache invalidation hierarchy (tools → system → messages), and minimum cache lengths (4,096 tokens for Opus 4.7).
- [Anthropic — Pricing](https://platform.claude.com/docs/en/about-claude/pricing) — current per-model token prices.

Secondary (community syntheses, used for thresholds & framing):

- [claudefa.st — Context window optimization](https://claudefa.st/blog/guide/mechanics/context-management) — quality degradation at ~50% context fill.
- [MindStudio — Token management hacks](https://www.mindstudio.ai/blog/claude-code-token-management-hacks) and [Context management for beginners](https://www.mindstudio.ai/blog/how-to-stop-burning-through-claude-code-tokens-context-management-guide-beginners) — practical `/clear` vs. `/compact` patterns.
- [Build to Launch — Claude Code Token Optimization (2026 Guide)](https://buildtolaunch.substack.com/p/claude-code-token-optimization) — anti-patterns and large-session case studies.
- [Du'An Lightfoot — Prompt Caching is a Must (Medium)](https://medium.com/@labeveryday/prompt-caching-is-a-must-how-i-went-from-spending-720-to-72-monthly-on-api-costs-3086f3635d63) — real-world 10× cost reduction with caching, useful framing for cache-read economics.

Local instrumentation:

- `~/.claude/skills/budget/budget.py` — script I wrote to parse `~/.claude/projects/*/*.jsonl` and produce the rollup numbers in §2. Reproducible: `python3 ~/.claude/skills/budget/budget.py --range 30`.
