# @spectra/meridian

Meridian — the dev-time AI Driver. See [`docs/meridian/charter.md`](../../docs/meridian/charter.md) and ADRs `docs/adr/meridian-00{1,2,3}-*.md`.

This package holds Meridian's mechanics:

- **`invokeExecutor(req, deps?)`** — one no-loop Claude call, tiered by task difficulty
  (`small`/`mid`/`frontier` → Haiku/Sonnet/Opus, env-overridable via `MERIDIAN_EXECUTOR_*`),
  behind a **fail-closed daily token budget** (`MERIDIAN_DAILY_TOKEN_BUDGET`). Returns token
  usage; it does **not** write the action-log row.
- **`runL0Gates(commands, runner?)`** — the objective verifier (lint/typecheck/build/test):
  runs commands in order, short-circuits on first failure, no gates ⇒ not trusted.
- **`runShadowTask(task, deps?)`** — the Shadow runner: executor → L0 → writes **one**
  append-only `meridian_action_log` row, applying nothing (`applied_at` stays null). Ships a
  `testAuthorTask(...)` factory as the first low-risk class. All deps are injectable for tests.
- Shared contract constants `EXECUTOR_TIERS` / `MERIDIAN_PHASES` / `MERIDIAN_DECISIONS` mirror
  the `meridian_action_log` CHECK constraints.

Reuses the `@anthropic-ai/sdk` + `env:`-secret pattern from the existing `sandbox-ai-*` invoke
path; adds no new infrastructure. Phases beyond Shadow (Assisted → Gated-auto) and the optional
LLM refuter are deferred — see [`docs/meridian/activation-plan.md`](../../docs/meridian/activation-plan.md).
