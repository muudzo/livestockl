# ECC components (curated import)

A curated subset of [affaan-m/ECC](https://github.com/affaan-m/ECC) (MIT, v2.0.0,
"Everything Claude Code" by Affaan Mustafa) was imported on 2026-06-22, selected for
this project's stack (React 18 + Vite 6 + TS 5 + Tailwind 4 + Supabase + payments).

**Imported (do not confuse with the project's own tailored components):**

- Agents: security-reviewer, typescript-reviewer, react-reviewer, database-reviewer,
  silent-failure-hunter, build-error-resolver, react-build-resolver, tdd-guide,
  e2e-runner, refactor-cleaner, code-simplifier, type-design-analyzer,
  pr-test-analyzer, code-explorer, performance-optimizer
- Skills: react-patterns, react-testing, react-performance, tdd-workflow,
  verification-loop, e2e-testing, security-review, postgres-patterns,
  frontend-patterns, frontend-a11y, vite-patterns, design-system, api-design, browser-qa
- Commands: code-review, build-fix, security-scan, test-coverage, react-review,
  react-build, react-test, plan, refactor-clean, quality-gate, feature-dev, pr

**Deliberately NOT imported:** the ECC global hook system (auto-runs Node on every
Bash/Write/Edit/MCP call, SessionStart, PreCompact, Stop), language packs irrelevant
to this stack (Java/Kotlin/Rust/C++/Flutter/Django/etc.), and prediction-market/
video/marketing skills. The project's own code-reviewer agent was preserved (ECC's
was skipped to avoid overwrite).

Note: the `/security-scan` command expects the `ecc-agentshield` npm package; without
it, use the `security-reviewer` agent + `/code-review` instead.
