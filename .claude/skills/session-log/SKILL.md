---
name: session-log
description: Write the daily session log. Use when the user says "wrap up", "that's it for today", "session log", or "what did we do".
---

Write a session log to `session-logs/YYYY-MM-DD.md` (use today's date).

## Structure

```markdown
# Session Log — {date}

## What We Built
- List everything built, with branch names
- Include line counts, file counts where relevant

## What We Did Well
- Numbered list of things that went right and why

## Great Ideas
- Ideas worth remembering for future sessions

## Pitfalls
- What went wrong, what we'd do differently

## Action Items Before Next Session
- [ ] Concrete tasks to complete before tomorrow
```

After writing, commit the file with message "Add session log for {date}".

Don't ask the user for input — derive everything from the conversation context.
