#!/usr/bin/env bash
# schema-guard — block destructive schema/RLS changes from merging silently.
#
# Diffs supabase/schema.sql + supabase/rls_policies.sql against a base ref
# (default origin/main) and fails if any of the following were REMOVED
# without an explicit override:
#   - CREATE POLICY ...                       (RLS coverage shrinking)
#   - CHECK (...)                             (input-validation constraint)
#   - REFERENCES ... (foreign key clause)     (referential integrity loss)
#   - CREATE TABLE ...                        (schema deletion)
#   - ENABLE ROW LEVEL SECURITY               (entire table goes open)
#
# Override: include the literal token [force-schema] in any commit message
# in the PR (or in the most-recent commit on push). This documents the
# intentional change in the git history without requiring a CI bypass.
#
# Exit codes:
#   0 — no destructive changes detected, OR override token present
#   1 — destructive change detected and not overridden
#
# Usage:
#   scripts/schema-guard.sh                          # diff vs origin/main
#   BASE_REF=origin/develop scripts/schema-guard.sh  # diff vs other base
#   FORCE=1 scripts/schema-guard.sh                  # bypass (CI emergency only)

set -euo pipefail

BASE_REF="${BASE_REF:-origin/main}"
FORCE="${FORCE:-0}"
SCHEMA_FILES=("supabase/schema.sql" "supabase/rls_policies.sql")

if [[ "$FORCE" == "1" ]]; then
  echo "schema-guard: FORCE=1 set, skipping checks"
  exit 0
fi

# Make sure we have the base ref locally (CI fetch shallow by default)
if ! git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
  echo "schema-guard: base ref '$BASE_REF' not found locally; fetching..."
  git fetch --no-tags --depth=50 origin "${BASE_REF#origin/}" 2>/dev/null || true
fi

# If base ref still doesn't exist (first commit / orphan branch), skip — nothing to compare against.
if ! git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
  echo "schema-guard: no base ref to compare against, skipping"
  exit 0
fi

# If schema files unchanged, nothing to check
CHANGED=0
for f in "${SCHEMA_FILES[@]}"; do
  if [[ -f "$f" ]] && ! git diff --quiet "$BASE_REF" -- "$f" 2>/dev/null; then
    CHANGED=1
    break
  fi
done

if [[ "$CHANGED" == "0" ]]; then
  echo "schema-guard: no schema/RLS file changes vs $BASE_REF"
  exit 0
fi

# Check for the override token in any commit between BASE_REF..HEAD
if git log "$BASE_REF..HEAD" --pretty=%B 2>/dev/null | grep -qi '\[force-schema\]'; then
  echo "schema-guard: [force-schema] override found in commit messages — allowing destructive changes"
  exit 0
fi

# Build a unified diff of just the schema files. Look at REMOVED lines (^-)
# excluding the file header lines (^---).
DIFF=$(git diff "$BASE_REF" -- "${SCHEMA_FILES[@]}" 2>/dev/null || true)

if [[ -z "$DIFF" ]]; then
  echo "schema-guard: no diff content despite changed files — skipping"
  exit 0
fi

# Each pattern below captures a destructive removal. We look at lines starting
# with a single '-' (i.e. removed in this PR), case-insensitive.
declare -A PATTERNS=(
  ["dropped_policy"]='^-[^-].*[Cc][Rr][Ee][Aa][Tt][Ee][[:space:]]+[Pp][Oo][Ll][Ii][Cc][Yy]'
  ["dropped_table"]='^-[^-].*[Cc][Rr][Ee][Aa][Tt][Ee][[:space:]]+[Tt][Aa][Bb][Ll][Ee]'
  ["dropped_check"]='^-[^-].*[Cc][Hh][Ee][Cc][Kk][[:space:]]*\('
  ["dropped_fk"]='^-[^-].*[Rr][Ee][Ff][Ee][Rr][Ee][Nn][Cc][Ee][Ss][[:space:]]'
  ["dropped_rls_enable"]='^-[^-].*[Ee][Nn][Aa][Bb][Ll][Ee][[:space:]]+[Rr][Oo][Ww][[:space:]]+[Ll][Ee][Vv][Ee][Ll]'
)

VIOLATIONS=()
DETAILS=()

for kind in "${!PATTERNS[@]}"; do
  pattern="${PATTERNS[$kind]}"
  matches=$(echo "$DIFF" | grep -cE "$pattern" || true)
  if [[ "$matches" -gt 0 ]]; then
    VIOLATIONS+=("$kind: $matches removal(s)")
    sample=$(echo "$DIFF" | grep -E "$pattern" | head -3 | sed 's/^/    /')
    DETAILS+=("$kind:"$'\n'"$sample")
  fi
done

if [[ ${#VIOLATIONS[@]} -eq 0 ]]; then
  echo "schema-guard: schema changes detected but no destructive removals — pass"
  exit 0
fi

echo
echo "════════════════════════════════════════════════════════════════════"
echo "  SCHEMA GUARD: destructive schema/RLS changes detected"
echo "════════════════════════════════════════════════════════════════════"
echo "Comparing vs: $BASE_REF"
echo
echo "Violations:"
for v in "${VIOLATIONS[@]}"; do echo "  - $v"; done
echo
echo "Sample removed lines:"
for d in "${DETAILS[@]}"; do echo "$d"; echo; done
echo "If this removal is intentional, add [force-schema] to a commit"
echo "message in this PR/push. Example:"
echo "    git commit -m 'refactor(schema): drop legacy policy [force-schema]'"
echo "════════════════════════════════════════════════════════════════════"
exit 1
