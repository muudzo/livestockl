---
name: qa
description: Run the full QA suite - chaos test, consistency checker, and security agent. Use when the user says "run QA", "test everything", or "check the system".
user-invocable: true
---

Run all three QA agents against the deployed Supabase Edge Functions and report results.

## Steps

1. Run consistency checker:
```bash
curl -s -X POST "https://hmeieslclzycyjjjflfh.supabase.co/functions/v1/consistency-checker" \
  -H "Content-Type: application/json" -d '{}'
```

2. Run security agent:
```bash
curl -s -X POST "https://hmeieslclzycyjjjflfh.supabase.co/functions/v1/security-agent" \
  -H "Content-Type: application/json" -d '{}'
```

3. Run chaos test (all scenarios):
```bash
curl -s -X POST "https://hmeieslclzycyjjjflfh.supabase.co/functions/v1/chaos-test" \
  -H "Content-Type: application/json" -d '{"scenario": "all"}'
```

## Reporting

For each agent, show:
- Summary (total/passed/failed)
- Any failures with details
- Overall health grade

If `$ARGUMENTS` is a specific agent name (e.g., "chaos", "security", "consistency"), run only that one.

If any test fails, investigate the root cause and suggest a fix.
