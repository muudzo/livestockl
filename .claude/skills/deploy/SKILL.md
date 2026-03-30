---
name: deploy
description: Deploy Supabase Edge Functions. Use when the user says "deploy", "push functions", or "start the server".
---

Deploy the specified target. **Never use inline secrets.** Read `SUPABASE_ACCESS_TOKEN` from the shell environment.

If `$ARGUMENTS` is empty, ask what to deploy.

## Prerequisites

The user must have `SUPABASE_ACCESS_TOKEN` set in their shell:
```bash
export SUPABASE_ACCESS_TOKEN=your-token-here
```

If not set, tell the user to add it to `~/.zshrc` or `~/.zprofile`:
```bash
echo 'export SUPABASE_ACCESS_TOKEN=your-token' >> ~/.zshrc && source ~/.zshrc
```

## Deploy Edge Functions

```bash
supabase functions deploy $ARGUMENTS --project-ref hmeieslclzycyjjjflfh --no-verify-jwt
```

Available functions:
- **Payment**: `initiate-payment`, `payment-webhook`, `payment-orchestrator`
- **Agents**: `buyer-agent`, `seller-agent`, `market-intel`, `auction-sniper`, `bid-executor`, `win-detector`
- **QA**: `chaos-test`, `consistency-checker`, `security-agent`
- **Auctions**: `end-auctions`

If `$ARGUMENTS` is "all" or "functions", deploy all in a loop.

## Edge Function Secrets

Secrets are set via Supabase CLI (not in code):
```bash
supabase secrets set KEY=value --project-ref hmeieslclzycyjjjflfh
```

Required secrets: `PAYNOW_INTEGRATION_ID`, `PAYNOW_INTEGRATION_KEY`, `PAYNOW_RESULT_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ALLOWED_ORIGIN`

## Dev Server

```bash
npm run dev
```
