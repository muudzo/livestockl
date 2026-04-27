#!/bin/bash

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

DANGEROUS_PATTERNS=(
  "(^|[ ;&|\`])git +push +(.*[ =])?--force"
  "(^|[ ;&|\`])git +push +(.*[ =])?-f($| )"
  "(^|[ ;&|\`])git +reset +(.*[ =])?--hard"
  "(^|[ ;&|\`])git +clean +(.*[ =])?-f"
  "(^|[ ;&|\`])git +branch +(.*[ =])?-D"
  "(^|[ ;&|\`])git +checkout +\\.($| )"
  "(^|[ ;&|\`])git +restore +\\.($| )"
  "(^|[ ;&|\`])git +commit +(.*[ =])?--amend"
  "(^|[ ;&|\`])git +add +-A($| )"
  "(^|[ ;&|\`])git +add +\\.($| )"
  "(^|[ ;&|\`])git +(.*[ =])?--no-verify"
)

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qE -e "$pattern"; then
    echo "BLOCKED: '$COMMAND' matches dangerous pattern '$pattern'. The user has prevented you from doing this. Per CLAUDE.md, ask the user explicitly before bypassing this." >&2
    exit 2
  fi
done

exit 0
