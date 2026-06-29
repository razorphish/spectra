# ADR meridian-003 — Task taxonomy / manifest

**Status:** Proposed
**Date:** 2026-06-28
**Supersedes:** —
**Related:** [Meridian charter](../meridian/charter.md) · [meridian-001 (executor)](meridian-001-executor-model-policy.md) · [meridian-002 (judge panel)](meridian-002-judge-panel.md) · seed §5 (draft taxonomy — verified here)

## Context

This is the project-specific core. The seed shipped a **draft** taxonomy from recon; the seed prompt requires verifying it against source, not copying it. Every surface below was confirmed in the actual repo (file evidence in the rationale). The organizing distinction — sharper than the seed's draft — is **authoring vs review**:

- **Authoring classes** — Meridian *produces* an artifact. Allowed only on low-risk surfaces; can earn autonomy.
- **Review/advisory classes** — Meridian *refutes/flags* a human's diff and never authors autonomously. This is where Spectra's fail-closed surfaces (M2M, PAR, RBAC, migrations, infra) live. Lower blast radius than authoring, so they can engage the model earlier *as a reviewer* while staying human-gated for the actual change.

## Decision

Meridian dispatches **only** these typed classes. Anything off-list, Meridian refuses rather than improvising.

### Authoring classes (can earn autonomy)

| Task class | Example work (verified) | Artifact shape | Executor tier | Verification | Autonomy ceiling |
|---|---|---|---|---|---|
| `ci_self_heal` | extend the `/monitor-ci` no-loop subagent | bounded / structured | small fetch + mid synth | L0 (re-run = ground truth) + L1 | Gated-auto (early) |
| `structured_logging_conformance` | `@spectra/logger` field/span conformance fixes | small / local edit | small | L0 + L1 | Gated-auto (early) |
| `openapi_contract_check` | public/private OpenAPI + scope-map drift detect & fix | structured / bounded | small | L1 (single vote) | **Mid** (gates public exposure) |
| `seed_fixture_author` | `sandbox_mrp_*` / catalog fixtures via `seed-runner` | bounded / structured | small | L0 (schema validate, dry run) | Gated-auto |
| `ui_scaffold` | admin-ui page/panel/service + route + RBAC-guard **wiring** (not grants) | **large free-form** | small | L0 + L1 | **Assisted-only (MVP — large artifact)** |
| `test_author` | Jest `*.spec.ts` (65 already in repo) | **large free-form** | small | L0 (tests run, coverage delta) | **Assisted-only (MVP — large artifact)** |
| `api_route_author` | Express route + error-catalog code + OpenAPI entry, **non-auth/PAR paths only** | **large free-form** | mid | L0 + L1 | **Assisted-only (MVP — large artifact)** |

**Artifact-shape lens (added from a live Shadow finding).** Four Shadow runs of `test_author` on a 187-line strict-TS module were all L0-rejected: one truncated at the token cap, the rest had compile errors a single no-loop pass didn't get right. The objective gate worked perfectly — but the lesson is that **one-shot no-loop (right for safety) cannot reliably produce a complete, gate-passing *large free-form* artifact.** So MVP autonomy (Gated-auto) is reserved for **bounded / structured** classes; large free-form authoring (`ui_scaffold`, `test_author`, `api_route_author`) is **Assisted-only regardless of low risk** — a human takes the draft and finishes it. Those become Gated-auto candidates only with an iteration loop or a stronger tier — explicitly deferred (it would relax the no-loop constraint, an ADR-001 change).

### Review / advisory classes (human-gated longest — Meridian refutes, never authors)

| Task class | Example work (verified) | Executor tier | Verification | Autonomy ceiling |
|---|---|---|---|---|
| `drizzle_migration_review` | migration safety, GAP-12 FK order, journal-repair sanity | frontier | L0 + human review | Assisted-only (review) |
| `m2m_auth_review` | `client_credentials` mint/verify/scope changes (`@spectra/auth`) | frontier | L0 + human review | Assisted-only |
| `par_gating_review` | production-access fail-closed logic (`sandbox-portal-par.ts`) | frontier | L0 + human review | **Never-auto (human-only)** |
| `rbac_review` | staff RBAC grants (`staff-permissions.ts`) | frontier | L0 + human review | Assisted-only |
| `terraform_review` | AWS HTTP API Gateway / infra modules | frontier | L0 + human review | Assisted-only |
| `doc_author` | ADR/plan/runbook/error-catalog **drafts** (human owns the decision) | frontier | L0 + human review (judgment artifact) | Assisted-only |

Refactors of the high-fan-in shared packages (`@spectra/database`, `@spectra/auth`) are not their own class — they route through the relevant review class plus the shared-asset owner agent (charter §7).

## Rationale

Typed classes give per-class model choice, per-class verification intensity ([meridian-002](meridian-002-judge-panel.md)), and per-class autonomy ceiling ([activation plan](../meridian/activation-plan.md)). Two levers set the ceiling: **risk** (the author/review split — Meridian *writes* only where a mistake is cheap and reversible, and only *reviews* the fail-closed surfaces PAR/M2M/RBAC/migrations/infra; `par_gating_review` never goes auto) and **artifact shape** (only bounded/structured outputs are one-shot-reliable enough for autonomy — see the lens above). A class needs *both* low risk and a bounded shape to be Gated-auto; failing either keeps it Assisted-only.

## Source evidence (verification, not recon)

| Class | Confirmed in |
|---|---|
| `ui_scaffold` | `apps/admin-ui` (dominant churn: 1108 changes); `d106242`, `c6bfec8` |
| `test_author` | 65 `*.spec.ts` across `apps`/`packages` |
| `seed_fixture_author` | `packages/database/src/lib/{sandbox-mrp-seed,seed-runner}.ts`, `scripts/run-seeds.ts` |
| `structured_logging_conformance` | `packages/logger-express/src/lib/{request,route}-logging.ts` (+ specs) |
| `openapi_contract_check` | `packages/openapi/src/lib/openapi.ts`, `docs/contracts/scope-map-openapi-ci.md`, `scripts/emit-scope-map-json.cjs` |
| `ci_self_heal` | `.github/agents/ci-monitor-subagent.agent.md`, `/monitor-ci` prompt |
| `api_route_author` | `f0161c2`, `1b9c28a` (hello endpoints, OpenAPI split, Swagger) |
| `drizzle_migration_review` | `packages/database/drizzle/0000–0009`, `apps/services/admin-ui-api/src/routes/admin-migrations.ts`, GAP-12 (`docs/sandbox-ai-endpoints.md`) |
| `m2m_auth_review` | `packages/auth/src/lib/scope-map.ts`, migration `0007_m2m_integrations.sql`, M2M ADR |
| `par_gating_review` | `apps/services/aviate-api/src/routes/{sandbox-portal-par,tenant-runtime}.ts`, `0008_par_notifications_webhooks.sql` |
| `rbac_review` | `apps/services/admin-ui-api/src/lib/staff-permissions.ts` (+ spec) |
| `terraform_review` | `terraform/modules/{api_http,jwt_authorizer,ssm_idp,upload_*}` |
| `doc_author` | `docs/{adr,plans,runbooks}` cadence |

## Consequences

- Each class needs a typed input/output contract (schema) before it runs — first implementation step after acceptance.
- The author/review boundary is a hard rule, not a default: a request to *author* on a review-surface (e.g. "write this migration") is refused; Meridian offers to *review* the human's version instead.
- Adding/retiring a class amends this ADR and the matching verification layer in [meridian-002](meridian-002-judge-panel.md) in the same change. Re-run the source-evidence pass on a cadence.

## References

- Seed §5 (draft taxonomy — treated as hypothesis, verified above), §8.
- Spectra source as cited in the evidence table.
