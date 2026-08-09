# ADR meridian-002 — Verification (judge) panel

**Status:** Proposed (OQ-1 resolved — L0-first; multi-provider panel deferred)
**Date:** 2026-06-28
**Supersedes:** —
**Related:** [Meridian charter](../meridian/charter.md) · [meridian-001 (executor)](meridian-001-executor-model-policy.md) · [meridian-003 (taxonomy)](meridian-003-task-taxonomy.md)

## Context

**This is the one net-new subsystem.** Spectra already has executors, env-flag gating, and the `/monitor-ci` constrained-driver pattern — but **no independent verification layer**. Per the seed, that is the entire point of building Meridian rather than prompting ad hoc.

The seed's central claim: an executor that grades its own work confirms its own errors, so output is not trustworthy until *independent* verification passes. Spectra raises the stakes — a wrong migration corrupts the journal, a wrong auth-touching route weakens token verification. But Spectra also has a strong asset most projects lack: **objective, deterministic verification is already wired** (`nx affected -t lint,test,build`, `db:verify`, the `scope-map` contract check, the client-error-catalog). That objective signal is the cheapest independent judge available and must be exhausted before any LLM panel is paid for.

## Decision

Verification is **layered by task risk** ([meridian-003](meridian-003-task-taxonomy.md) sets the intensity per class). A task's output is trusted only when **every layer its class requires passes**; default-to-reject on any failure or uncertainty.

| Layer | What runs | Independence | Applies to |
|---|---|---|---|
| **L0 — Objective gates** | `nx affected -t lint,test,build`, `tsc --noEmit`, `db:verify`, `scope-map` contract check, OpenAPI lint. Ground truth, not opinion. | **Fully independent** of the executor — a compiler/test runner, not a model. | **Every** task class, always. The MVP backbone. |
| **L1 — Advisory refuter** | One **Anthropic** model of a **different model than the executor** (e.g. Opus refuting Haiku's output), prompted to **refute**, default-reject. | Same family → *weaker* independence, so **advisory only** — never the sole gate for an autonomous action. | No-objective-check classes (e.g. `doc_author`) and any class wanting extra scrutiny, while in **Assisted** (human still reviews). |
| **L2 — Multi-provider panel** | **Deferred.** N≥3 diverse-family models (e.g. via Bedrock), each prompted to refute, majority "cannot refute". | Diverse families; executor never on its own panel. | Introduce **only if** a no-check class is ever promoted to autonomous (none are today — see OQ-1). Until then, high-risk classes are gated by **L0 + human review** (all assisted-only / never-auto), a stronger gate than any LLM. |

Judges are prompted to **refute, not approve**, and **default to reject** when uncertain. L0 failure short-circuits — no LLM judge is invoked on code that doesn't compile or breaks tests.

## OQ-1 — Model diversity (RESOLVED: defer — not needed for MVP)

The seed requires *different model families* so judges fail differently. But Spectra **already owns a fully independent verifier** in its CI gates (L0): a compiler and test suite are not a model grading itself. For every class Meridian can run autonomously (the low-risk authoring classes), **L0 + human PR review is the gate** — no second LLM required. The multi-provider panel only matters for autonomously trusting a class with **no objective check and no human in the loop**, and the taxonomy ([meridian-003](meridian-003-task-taxonomy.md)) has none of those: every no-check / high-risk class is assisted-only or never-auto.

**Decision:** do **not** build a multi-provider panel (Bedrock or a gateway) now — it solves a problem the taxonomy doesn't yet have (YAGNI). Verification for MVP = **L0 gates** (always) + an **optional single Anthropic refuter** (different model than the executor) for no-check classes, advisory while Assisted.

**Introduce a diverse-family panel only when** a no-check class is promoted toward autonomous action. At that point the cheapest route is AWS Bedrock (already on AWS; non-Claude families behind existing IAM; one dep, `@aws-sdk/client-bedrock-runtime`). That's a deliberate, gated upgrade — not MVP scope.

## Environment contract

| Variable | Required when | Purpose |
|---|---|---|
| `MERIDIAN_JUDGE_MODEL` | L1 (optional) | Anthropic model id for the advisory refuter — must differ from the executor's model. Omit to run L0-only. |
| `MERIDIAN_JUDGE_PROVIDER` / `BEDROCK_REGION` / `MERIDIAN_JUDGE_PANEL` / `MERIDIAN_JUDGE_QUORUM` | only if L2 enabled later | Unset by default. Configure the deferred multi-provider panel **only** when OQ-1's upgrade trigger fires. |

**Judges are read-only.** A judge process never holds write credentials, DB write access, or deploy/IaC permissions — it receives the diff + context and returns a verdict, nothing more. This is enforced at the credential layer, not by prompt.

## Rationale

- Self-grading is worthless; N identical judges are redundant, not diverse — both forbidden.
- Exhausting L0 first means most rejections cost nothing (a failed `nx test` is a better, cheaper refutation than any LLM for "does this code work").
- Reserving the expensive L2 panel for irreversible/judgment classes keeps verification cost proportional to blast radius.

## Anti-patterns forbidden

- Executor grades its own output (any layer).
- N copies of one model presented as a "panel".
- Judges prompted to "confirm" / "is this good?" rather than "refute / find why this is wrong".
- Skipping L0 because the LLM panel "looks confident".
- Treating diverse-Anthropic-snapshots as satisfying L2 for autonomous high-risk tasks.

## Consequences

- `meridian_action_log` records, per action: task class, executor model, each judge model + verdict, L0 results, final decision. This is the audit trail and the "executor ≠ judge" enforcement point.
- High-risk classes stay assisted-only / never-auto, gated by **L0 + human review** (see [activation plan](activation-plan.md)); the deferred L2 panel is only needed if one is ever promoted to autonomous.
- Adding a new task class requires assigning its verification layer here in the same change.

## References

- Seed §4 (judge panel — "the part people skip"), §8 non-negotiable #1.
- Reused objective gates: `nx affected`, `scripts/m2m-scope-contract-check.mjs`, `npm run db:verify`, client-error-catalog (`docs/sandbox-ai-endpoints.md`).
