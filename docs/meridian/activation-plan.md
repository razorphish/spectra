# Meridian — activation gating & observability plan

**Status:** Draft (for review)
**Date:** 2026-06-28
**Related:** [charter](charter.md) · [meridian-001](../adr/meridian-001-executor-model-policy.md) · [meridian-002](../adr/meridian-002-judge-panel.md) · [meridian-003](../adr/meridian-003-task-taxonomy.md)

## Phases (each gated — the driver cannot reach the next until its gate passes)

| Phase | Behavior | Exit gate |
|---|---|---|
| **1. Shadow** | Driver runs on real inputs; output logged to `meridian_action_log`, **never applied**. Compared against the human PR for the same work. | Output quality matches/beats human baseline on a sample of each task class; L0 gates wired and green. |
| **2. Assisted** | Driver opens a PR per action (one task = one PR); a human reviews and merges every one. No direct commits, ever. | Stable PR acceptance rate per class; telemetry complete; OQ-1 (judge diversity) **closed** for any class targeting Gated-auto. |
| **3. Gated-auto** | Driver acts autonomously on **low-risk + bounded-shape classes only** (`ci_self_heal`, `structured_logging_conformance`, `seed_fixture_author`; `openapi_contract_check` at the mid ceiling) behind `MERIDIAN_ENABLED` + per-class platform_settings flags. Large free-form authoring (`ui_scaffold`, `test_author`, `api_route_author`) stays **Assisted-only** — see the artifact-shape lens in [meridian-003](../adr/meridian-003-task-taxonomy.md). Required verification ([meridian-002](../adr/meridian-002-judge-panel.md)) must pass; every action telemetered + revert-able. | Per-class autonomous success rate + zero unrolled-back incidents over a defined window. |
| **4. Broad-auto** | Expand authoring classes as telemetry justifies. The **review/advisory classes** (`drizzle_migration_review`, `m2m_auth_review`, `rbac_review`, `terraform_review`, `doc_author`) stay **Assisted-only and L2-verified** — Meridian reviews, humans author. `par_gating_review` is **never-auto** by policy. | Per-class review, not automatic. |

## Hard gates before ANY autonomous action

- [ ] `MERIDIAN_ENABLED` flag wired; **default `false`**; per-class platform_settings keys exist.
- [ ] Telemetry on every action in append-only `meridian_action_log`: task class, executor model, each judge model + verdict, L0 results, final decision, resulting PR/commit SHA. (Mirrors the M2M `m2m_token_issuance_log` append-only audit pattern.)
- [ ] Per-action rollback path proven: `git revert` for code; [rollback runbook](../runbooks/rollback.md) + Neon pre-migration branch for DB; `MERIDIAN_ENABLED=false` as instant global kill.
- [ ] Independent verification wired — **L0 objective gates required on every class** (a class can't pass without them); executor never grades itself; multi-provider panel deferred (introduce only if a class with no objective check is promoted to autonomous). (OQ-1 ✓)
- [ ] Fail-closed token budget wired (`MERIDIAN_DAILY_TOKEN_BUDGET`, `MERIDIAN_MAX_TOKENS_PER_TASK`); dispatch refused when exhausted. (OQ-2 ✓)
- [ ] Provenance enforced: branch `meridian/<class>/<slug>`, one task = one PR, **no direct commits to `main`**, `Meridian-Task` / `Meridian-Run` trailers linking the audit row. (OQ-3 ✓)
- [ ] Charter decisions closed (OQ-1/2/3 ✓).

## Observability

- **Per-action record** → `meridian_action_log` (append-only; the audit + "executor ≠ judge" enforcement point).
- **Structured logs** → existing `@spectra/logger` / `application_logs`, redacting prompts/secrets per existing telemetry rules.
- **Dashboards** → per-class volume, judge reject rate, L0 failure rate, escalation rate, rollback count, token spend (OQ-2 budget).

## Blast-radius rule

A class's activation phase is set by its risk rating in [meridian-003](../adr/meridian-003-task-taxonomy.md), not by convenience. Auth/M2M, PAR, Terraform, and customer-request-path changes are out of every phase. Production targets stay human-only.
