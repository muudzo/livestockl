# ZimLivestock — Claude Code Project Rules

React 18 + TS + Vite + Tailwind + shadcn on top of Supabase (Postgres + Auth + RLS + Realtime + Storage + Edge Functions). Paynow is the primary payment rail. Solo developer (Paynow internship).

Project ref: `hmeieslclzycyjjjflfh`. Currency is **US$** (not `$`).

## Where context lives

- [AGENTIC.md](AGENTIC.md) — agentic commerce architecture (stakeholder-facing, not Claude-facing).
- `supabase/schema.sql` — schema + atomic RPCs (`place_bid`, `end_expired_auctions`).
- `supabase/rls_policies.sql` — RLS policies. **Never bypass RLS to "make it work" — find the missing policy.**
- `supabase/functions/` — Edge Functions (Deno).
- `.claude/agents/` — sub-agents. `.claude/skills/` — slash commands.
- MEMORY.md (auto-memory) — session findings, decisions, rationale.

## Workflow (per Anthropic guidance)

**Explore → Plan → Code → Verify** for any multi-file change, payment/RLS/schema edit, or Edge Function work. Small scoped fixes (one file, describable in one sentence) can skip planning.

**Verification is non-negotiable.** Before declaring a task complete: run the relevant test (`/test`, `/qa`, or the specific curl against the deployed function). UI changes require browser verification — typecheck passing is not proof.

**Parallel sub-agents, not serial.** For PR review fan out `code-reviewer` + `rls-auditor` + `payment-tester` in one message. For the enterprise audit pattern: 3 specialists in parallel, then synthesize. Don't chain A → B → C when they're independent.

**`/clear` between unrelated tasks.** Switching from payment work to UI polish? Clear. After 2 failed corrections on the same problem, clear and re-prompt with what was learned. Long context degrades performance.

## Stack conventions not derivable from code

- `(supabase.rpc as any)(...)` — type workaround for RPC calls, keep it.
- Dual-mode Supabase + mock fallback gated by `isSupabaseConfigured`.
- Browser-relay pattern for Paynow (Cloudflare blocks server-to-server from Supabase).
- Idempotency keys live on `bids` and `payments` — new write paths must honor them.
- Atomic DB ops preferred (single RPC) over check-then-act.
- Malformed JSON on user-facing edge functions → 400, never 500.
- No `stack` field in error responses on public endpoints (leak P0).

## Paynow testing

Test phone numbers: `0771111111` success, `0772222222` delayed, `0773333333` cancel, `0774444444` insufficient. Poll URL fallback is live — don't rely on webhook alone.

## Security ground rules

- RLS writes tested via `security-agent` Edge Function — must stay 11/11 PASS.
- Credentials live in `.env` / Supabase secrets. Never inline, never committed.
- CORS wildcard fallback was removed on user-facing functions (SEV-1 fix). Don't reintroduce.

## Commit behavior

Commit after completing work without asking. Use conventional prefixes (`feat:`, `fix:`, `docs:`, `chore:`). Never `--no-verify`. If a hook fails, fix the root cause and make a new commit (not `--amend`).
