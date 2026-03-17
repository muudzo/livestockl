---
name: test
description: Run tests for the Go backend or check the Vite frontend builds. Use when the user says "run tests", "does it build", or "check for errors".
---

Run tests based on `$ARGUMENTS` or auto-detect what to test.

## Go Backend

```bash
cd backend && go build ./... && echo "BUILD OK" || echo "BUILD FAILED"
```

If `$ARGUMENTS` includes "full" or "stress":
1. Start the server in background
2. Run the full curl-based QA suite (auth, livestock, bids, agents, concurrent stress)
3. Report results
4. Kill the server

## Frontend (React/Vite)

```bash
npx vite build 2>&1
```

Check for TypeScript errors. If any, show the errors and suggest fixes.

## Both

If `$ARGUMENTS` is empty, run both Go build check and Vite build check.
