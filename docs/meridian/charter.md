# Meridian — AI Driver Charter

**Status:** Draft (for review — not yet activated)
**Date:** 2026-06-28
**Codename:** Meridian
**Modeled on:** [`meridian-seed-spectra.md`](meridian-seed-spectra.md) (Spectra edition; generic template archived alongside as `meridian-seed-generic.md`)
**Related:** [ADR meridian-001 (executor)](../adr/meridian-001-executor-model-policy.md) · [meridian-002 (judge panel)](../adr/meridian-002-judge-panel.md) · [meridian-003 (task taxonomy)](../adr/meridian-003-task-taxonomy.md) · [activation plan](activation-plan.md)

## Owns

How AI executes **typed development work in the Spectra repo** — the executor model policy, the verification (judge) policy, the task taxonomy, and the activation gating that lets the driver act safely.

## Mission

Run the authoritative contract for AI-executed engineering work in Spectra: what the driver may do, how its output is verified before it is trusted, and how it is rolled out without risking production auth, customer data, or the migration journal. The driver does not invent process — it executes the typed tasks in [meridian-003](../adr/meridian-003-task-taxonomy.md) under the verification in [meridian-002](../adr/meridian-002-judge-panel.md).

## Scope boundary — Meridian ≠ the product's sandbox AI

**Critical distinction.** Spectra has a *customer-facing* AI capability — the sandbox AI custom endpoints (`sandbox-ai-*`, `developer_ai_endpoints`, `custom_endpoints:invoke`, PAR gating). That is a **product feature** the system exposes, not an active runtime component driving the platform. **Meridian is neither.** Meridian is a **development-time driver** that operates on the *repository and CI* — it scaffolds code, authors migrations, writes docs/tests, triages CI. It never sits in the customer request path and never shares a trust boundary with the sandbox AI feature.

- **In scope — authoring:** dev-time, repo-facing artifacts on low-risk surfaces (UI scaffold, tests, fixtures, logging conformance, OpenAPI/scope-map drift, CI self-heal, non-sensitive routes). See [taxonomy](../adr/meridian-003-task-taxonomy.md).
- **In scope — review/advisory only:** the fail-closed surfaces (M2M, PAR, RBAC, Drizzle migrations, Terraform). Meridian *refutes/flags* a human's diff here; it **never authors them autonomously**, and `par_gating_review` never goes auto at all.
- **Out of scope entirely:** anything in the customer request path (that's the separate `sandbox-ai` product, below), and any irreversible/architectural *decision* — Meridian may *draft* a `doc_author` ADR, but humans decide and merge.

## Why a driver and not ad-hoc prompting

Spectra is built under a "human-guided AI development" model with strong normative conventions (ADR house style, error-catalog versioning, GAP-12 migration order, append-only M2M audit, flag-gated rollout with prod-default-`false`). Uncoordinated AI prompting drifts away from these conventions — inconsistent route patterns, migrations that ignore FK order, ADRs that contradict locked plans. **The typed taxonomy + the judge panel are the anti-drift mechanism**: every action is a known task class, verified before trust.

## The headline gap: independent verification

Spectra already has three of the four subsystems in raw form — executors (`@anthropic-ai/sdk`, `sandbox-ai-*`), gated activation (env-flag-with-prod-default-`false` is the house standard), and a constrained-driver precedent (`/monitor-ci`: one-MCP-call, **no-loop**). The net-new piece is the **independent-verification policy** ([meridian-002](../adr/meridian-002-judge-panel.md)) — but it builds on the verifier Spectra *already owns* (the L0 CI gates), so it's mostly wiring, not a new model farm. A multi-provider LLM panel is deferred until a task class actually needs autonomous trust without an objective check (none do today). Meridian's executors follow the `/monitor-ci` constrained shape — no open-ended autonomous loop.

## Pre-conditions (cross-cutting dependencies)

| Dependency | Source in Spectra | Status |
|---|---|---|
| Feature-flag service for gated activation | Env flags (e.g. `M2M_*`) + DB `platform_settings` (e.g. `sandbox.ai.endpoints_enabled`). Meridian reuses this — **new flag `MERIDIAN_ENABLED` (default false)** + per-task-class platform_settings keys. | Resolved (reuse) |
| Observability / telemetry for driver actions | `@spectra/logger` + `application_logs` table. Add append-only `meridian_action_log` (mirrors the M2M `m2m_token_issuance_log` append-only pattern). | Resolved (extend) |
| Rollback mechanism | Code tasks: `git revert` per action. Migrations: [rollback runbook](../runbooks/rollback.md) + Neon pre-migration branch. Instant kill: `MERIDIAN_ENABLED=false`. | Resolved (reuse) |
| Executor model access | `@anthropic-ai/sdk` already a dependency (Claude tiers). | Resolved (reuse) |
| Independent verification | **L0 objective CI gates** (`nx lint/test/build`, `tsc`, `db:verify`, scope-map) — already wired, fully independent — plus an optional single Anthropic refuter. No new infra/dep. See OQ-1. | Resolved (no new infra) |

## Resolved decisions (formerly Open Questions)

All three closed — this unblocks the activation gate. Each is recorded here for the audit trail (the *why*), with the mechanism in the linked ADR.

- **OQ-1 — Judge-panel model diversity → RESOLVED: defer; L0-first.** Spectra already owns a fully independent verifier (the L0 CI gates — a compiler/test suite, not a model grading itself). For every class Meridian can run autonomously, L0 + human PR review is the gate; a multi-provider LLM panel solves a problem the taxonomy doesn't yet have (YAGNI). MVP verification = L0 always + an optional single Anthropic refuter (different model than the executor) for classes with no objective check, advisory while Assisted. A diverse-family panel (cheapest via AWS Bedrock, +1 dep) is introduced **only if** such a class is ever promoted to autonomous — a deliberate, gated upgrade. Mechanism: [meridian-002](../adr/meridian-002-judge-panel.md).
- **OQ-2 — Cost ceiling → RESOLVED: fail-closed token budget.** Per-day and per-task token ceilings enforced *before* dispatch; Meridian refuses to dispatch when the day's budget is spent. Per-action spend recorded in `meridian_action_log`. Defaults are conservative calibration knobs. Mechanism: [meridian-001](../adr/meridian-001-executor-model-policy.md).
- **OQ-3 — Git provenance → RESOLVED: one task = one branch + one PR; never a direct commit to `main`.** Branch `meridian/<class>/<slug>`; commit trailers `Meridian-Task: <class>` and `Meridian-Run: <ulid>` linking the `meridian_action_log` row; PR body carries task class, executor model, L0/L1/L2 verdicts, and the one-line rollback command. This is what makes each action individually revert-able. Mechanism: [activation plan](activation-plan.md).

## Success criteria

- Every driver action is a typed task from [the taxonomy](../adr/meridian-003-task-taxonomy.md) — no freeform repo edits.
- No driver output is trusted without passing the verification policy in [meridian-002](../adr/meridian-002-judge-panel.md) (objective CI gates always; LLM panel by task risk).
- Driver cannot act on high-risk classes (migrations, auth-touching routes, refactors of shared `@spectra/*` packages) until its activation gate passes (see [activation plan](activation-plan.md)).
- Every driver action is observable (`meridian_action_log`) and individually rollback-able (one PR / one revert per action).
- Driver is off by default (`MERIDIAN_ENABLED=false`); prod targets stay human-only.

## Agent decomposition principle (seed §7 — derived from source, not assumed)

The seed warns not to inherit the Quantum monolith conclusion. I derived Spectra's actual dependency graph from `@spectra/*` import edges in source, and **Spectra is genuinely separable** — not a monolith:

| Package | In-edges (importers) | Role |
|---|---|---|
| `@spectra/database` | **28** | High-fan-in hub (Drizzle schema, migrations, audit) — the dominant shared seam |
| `@spectra/logger` | 12 | Cross-cutting, layered cleanly (`logger → database`) |
| `@spectra/auth` | 5 | Fail-closed seam (M2M/scope) |
| `@spectra/{upload,shared-ui,logger-express}` | ≤4 | Low fan-in; UIs import **only** `shared-ui` (cleanly isolated) |

The graph is layered and acyclic. So: **capability-specialized agents per project** (assess → implement → verify) are viable here — a per-folder split is *not* the trap it was in Quantum. The only seams needing dedicated **owner agents** are the two high-fan-in shared packages: a `@spectra/database` owner (schema/migration/audit — highest stakes) and a `@spectra/auth` owner. A coordinator holds this graph and sequences work. Re-derive the graph (`nx graph` + import edges) before each major fan-out; don't assume it stayed separable.

## Non-negotiables (from seed §8)

1. **Independent verification, prompted to refute.** Never self-grading; never N identical judges. Objective CI signals first; diverse skeptical models for high-risk classes; default-to-reject on uncertainty.
2. **Charter + ADRs before code; gated before autonomous.** Meridian touches no real target until flags, telemetry, rollback, and an independent judge exist and the charter's OQs are closed.
