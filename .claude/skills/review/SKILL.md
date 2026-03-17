---
name: review
description: Run a senior engineer code review on changed files. Use when the user says "review my code", "check this", or "what did I break".
---

Review code changes for bugs, security issues, and best practices.

## Scope

If `$ARGUMENTS` specifies files or a directory, review those. Otherwise, review all uncommitted changes:

```bash
git diff --name-only
git diff --cached --name-only
```

## Review Criteria

For each changed file, check:

1. **Bugs** — nil/null risks, off-by-one, logic errors, missing error handling
2. **Security** — SQL injection, auth bypass, credential exposure, XSS
3. **Concurrency** — race conditions, missing locks, goroutine leaks
4. **Resource leaks** — unclosed connections, files, rows
5. **API contract** — wrong status codes, missing validation, inconsistent errors
6. **SRP** — is any function doing too many things?

## Output Format

For each issue:
- File and line number
- Severity (critical/high/medium/low)
- What's wrong
- How to fix it

End with a summary table and an overall grade (A-F).

Always push back if the code is actually fine — don't invent issues that don't exist.
