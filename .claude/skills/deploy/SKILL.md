---
name: deploy
description: Deploy Supabase Edge Functions or start the Go backend. Use when the user says "deploy", "push functions", or "start the server".
---

Deploy the specified target. Read credentials from `.env` or `.env.local` — never use inline secrets.

If `$ARGUMENTS` is empty, ask what to deploy.

## Supabase Edge Functions

```bash
source .env.local 2>/dev/null
SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN supabase functions deploy $ARGUMENTS --project-ref $SUPABASE_PROJECT_REF --no-verify-jwt
```

Available functions: `buyer-agent`, `seller-agent`, `market-intel`, `auction-sniper`, `payment-orchestrator`, `bid-executor`, `win-detector`, `chaos-test`, `consistency-checker`, `security-agent`, `initiate-payment`, `payment-webhook`

If `$ARGUMENTS` is "all" or "functions", deploy all of them in a loop.

## Go Backend

```bash
cd backend
lsof -ti:8080 | xargs kill -9 2>/dev/null
DATABASE_URL="postgres://$(whoami)@localhost:5432/zimlivestock?sslmode=disable" go run ./cmd/server
```

Ensure PostgreSQL is running first: `brew services start postgresql@16`
