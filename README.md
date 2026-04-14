# ZimLivestock

A livestock auction marketplace for Zimbabwe — web + PWA, built on React 18 + Supabase, with a Paynow-first payment stack and integrated autonomous buyer/sniper agents. Built during the 2026 Paynow internship (12 Mar – 23 Apr 2026).

**Production:** https://app-nine-sigma-jgoqp90f2p.vercel.app

## What this is

- A working marketplace prototype that takes a seller from **list → bid → win → pay** end-to-end
- The research artifact behind a **5-provider payment DX benchmark** (Paynow vs Stripe, Paystack, Flutterwave, Pesepay) — see `benchmarks/`
- The engineering artifact behind an **internship deliverables package** — see `deliverables/`
- A security/reliability posture most prototypes skip: post-deploy QA, RLS on every table, atomic bid RPC, chaos + consistency + security edge functions gating main

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind + shadcn/ui, React Query, Zustand |
| PWA | vite-plugin-pwa + Workbox, offline fallback, manifest compliant |
| Backend | Supabase (PostgreSQL + Auth + RLS + Realtime + Storage + Edge Functions/Deno) |
| Payments | Paynow (primary), Stripe (card fallback), orchestrator with retry chain |
| CI/CD | GitHub Actions → Supabase Edge deploy + Vercel prod deploy, post-deploy QA gate |

## Running it

```bash
npm install
npm run dev
```

Required env for prod builds (see [CONTRIBUTING.md](CONTRIBUTING.md) for the full gate):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Builds now **hard-fail** when these are missing — no accidental mock-data prod deploys. Set `ALLOW_MISSING_SUPABASE_ENV=1` only for static preview builds.

## Where to find things

### Code

| Path | What's there |
|---|---|
| `src/` | Frontend (routes, hooks, stores, screens, components) |
| `supabase/schema.sql` | DB schema + atomic RPCs (`place_bid`, `end_expired_auctions`) |
| `supabase/rls_policies.sql` | All RLS policies (every table has at least one) |
| `supabase/functions/` | 18+ edge functions (payments, agents, QA, BillPay) |
| `scripts/` | Schema guard, QA runners, deploy helpers |

### Documentation

| Path | What's there |
|---|---|
| [docs/INTERNSHIP-HANDOVER.md](docs/INTERNSHIP-HANDOVER.md) | Supervisor-facing summary of everything shipped |
| [docs/internship-deliverables-tracker.md](docs/internship-deliverables-tracker.md) | Live criterion-by-criterion status |
| [docs/internship-brief.md](docs/internship-brief.md) | Original brief from the supervisor |
| [docs/paynow-integration-pitfalls.md](docs/paynow-integration-pitfalls.md) | 21 Paynow pitfalls with fixes |
| [docs/billpay-integration-plan.md](docs/billpay-integration-plan.md) | BillPay integration design |
| [docs/tawkto-integration-plan.md](docs/tawkto-integration-plan.md) | Tawk.to integration design |
| [docs/stanford-seed-meeting.md](docs/stanford-seed-meeting.md) | Investor-grade positioning doc |
| [docs/wireframes.html](docs/wireframes.html) | 12 interactive wireframes |
| [docs/architecture-diagram.html](docs/architecture-diagram.html) | Interactive system architecture |

### Research & benchmarks

| Path | What's there |
|---|---|
| [benchmarks/payment-provider-benchmark-report.md](benchmarks/payment-provider-benchmark-report.md) | Executive summary + rankings |
| [benchmarks/paynow-dx-notes.md](benchmarks/paynow-dx-notes.md) | Paynow baseline (4.2/10) |
| [benchmarks/stripe-dx-notes.md](benchmarks/stripe-dx-notes.md) | Stripe (9.7/10) |
| [benchmarks/paystack-dx-notes.md](benchmarks/paystack-dx-notes.md) | Paystack (8.0/10) |
| [benchmarks/flutterwave-dx-notes.md](benchmarks/flutterwave-dx-notes.md) | Flutterwave (7.2/10) |
| [benchmarks/pesepay-dx-notes.md](benchmarks/pesepay-dx-notes.md) | Pesepay (3.8/10, blocked) |
| [research/auction-field-visit-2026-03-19.md](research/auction-field-visit-2026-03-19.md) | Physical auction visit, 8 findings |
| [research/paynow-full-integration-plan.md](research/paynow-full-integration-plan.md) | Full Paynow product ecosystem plan |

### Deliverables

| Path | What's there |
|---|---|
| [deliverables/week-1-2/README.md](deliverables/week-1-2/README.md) | Research & Foundation phase |
| [deliverables/week-5/](deliverables/week-5/) | Testing, validation, audit, stakeholder feedback |
| [session-logs/](session-logs/) | Day-by-day session logs |

## CI gates

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full policy. Summary:

- **Schema Guard** — blocks removing RLS policies, tables, CHECKs, FKs without explicit `[force-schema]` ceremony
- **Frontend Build** + **Edge Functions Check** — fail on TS/Deno errors
- **Post-deploy QA** (main only) — runs `consistency-checker`, `security-agent`, `chaos-test` against prod. Any hard fail = CI red

## Currency

All prices are US$ (not plain $) — matches how Zimbabwean auctions actually quote.

## License & attributions

See [ATTRIBUTIONS.md](ATTRIBUTIONS.md).
