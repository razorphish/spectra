# ADR meridian-001 — Executor model policy

**Status:** Proposed
**Date:** 2026-06-28
**Supersedes:** —
**Related:** [Meridian charter](../meridian/charter.md) · [meridian-002 (judge panel)](meridian-002-judge-panel.md) · [meridian-003 (taxonomy)](meridian-003-task-taxonomy.md) · `apps/services/aviate-api/src/lib/sandbox-ai-{invoke,llm}.ts` · `.github/agents/ci-monitor-subagent.agent.md`

## Context

Meridian executes typed development tasks ([meridian-003](meridian-003-task-taxonomy.md)) of widely varying difficulty — from mechanical Angular scaffolding to migration *review*. Spectra already depends on `@anthropic-ai/sdk` and has a working LLM-invoke path (`sandbox-ai-invoke.ts` / `sandbox-ai-llm.ts`); the executor reuses that integration rather than adding a parallel one. Model diversity is a *judge*-panel concern, not an executor one (see [meridian-002](meridian-002-judge-panel.md)). The `/monitor-ci` subagent sets the house shape: **one bounded call, no open-ended loop.**

## Decision

Tier executor models by task difficulty; **default to the smallest tier and escalate only when the task class warrants it** (per the tier column in [meridian-003](meridian-003-task-taxonomy.md)).

| Tier | Model | Used for |
|---|---|---|
| **Small / mechanical** | Haiku 4.5 (`claude-haiku-4-5`) | Scaffolding, test authoring, seed/fixture data, CI status fetch — bounded, pattern-following work. |
| **Mid / reasoning** | Sonnet 4.6 (`claude-sonnet-4-6`) | API route + OpenAPI authoring, CI fix synthesis, RBAC-guard logic. |
| **Frontier / judgment** | Opus 4.8 (`claude-opus-4-8`) | Migration authoring (FK order, reversibility), ADR/plan drafting, shared-package refactors, and the **coordinator/orchestrator** that holds the dependency graph and sequences sub-agents. |

Tier per task class is fixed in the taxonomy, not chosen ad hoc. A task may escalate one tier on judge rejection + retry (logged); it may not silently downgrade.

## Rationale

Most recurring Spectra work (admin-ui churn dominates the history) is mechanical and does not need a frontier model — running Opus on every scaffolded panel is cost blowout for no quality gain. The frontier tier is reserved for irreversible/judgment work (migrations, ADRs, shared-asset refactors) where a wrong answer is expensive and a human is the fallback. The orchestrator runs on the frontier tier because decomposition errors (wrong coupling seams — charter §7) are the costliest failure mode.

## Environment contract

| Variable | Required when | Purpose |
|---|---|---|
| `MERIDIAN_ENABLED` | always | Master gate; default `false`. |
| `ANTHROPIC_API_KEY` | executor active | Claude access (already used by `sandbox-ai-*`). |
| `MERIDIAN_EXECUTOR_SMALL` / `_MID` / `_FRONTIER` | optional | Override default model IDs per tier (pin/upgrade without code change). |
| `MERIDIAN_MAX_ESCALATIONS` | optional | Cap tier escalations per task (default 1). |
| `MERIDIAN_DAILY_TOKEN_BUDGET` | always | Fail-closed daily token ceiling (executor + judges). Dispatch refused when spent. (OQ-2) |
| `MERIDIAN_MAX_TOKENS_PER_TASK` | always | Output-token ceiling per call (default 8192); an explicit over-ask aborts rather than silently truncating. (OQ-2) |

## Non-goals

- **No open-ended autonomous loop.** Each task is a bounded executor call (or a short fixed pipeline), following the `/monitor-ci` constrained-driver shape — no self-directed "keep going until done" loops.
- No fine-tuned or self-hosted executor models in MVP.
- No per-token-cost routing heuristics beyond the fixed per-class tier map (revisit if OQ-2 budget telemetry shows a class is mis-tiered).
- No parallel agent framework: extend the existing `sandbox-ai-*` invoke path and `/monitor-ci` pattern.

## Consequences

- Model IDs are env-overridable so a tier can be re-pointed (e.g. to a newer snapshot) without a code change or redeploy.
- Tier assignment lives in one place (the taxonomy), so retuning cost/quality is a taxonomy edit + ADR amendment, not scattered config.
- Executor identity must be recorded per action in `meridian_action_log` so the judge panel can enforce "executor is never its own judge" ([meridian-002](meridian-002-judge-panel.md)).
- **Budget is fail-closed (OQ-2):** the day's token spend (executor + judges, including escalation retries) is checked before each dispatch; when exhausted Meridian stops dispatching and logs, rather than degrading silently. Per-action spend is recorded in `meridian_action_log`. Defaults are conservative calibration knobs, tuned from telemetry.

## References

- Seed §3 (executor template), §1 (subsystem model).
- Model IDs per current Claude lineup (Opus 4.8 / Sonnet 4.6 / Haiku 4.5).
