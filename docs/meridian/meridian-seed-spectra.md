# Meridian Seed — Spectra Edition (AI Driver Charter & ADR reference)

> **What this is:** a warm-start reference for adding an AI Driver ("brain"), codename **Meridian**, to the Spectra monorepo. It is pre-filled from a recon pass of the actual Spectra stack — adapt every `«placeholder»` and **verify the draft taxonomy (§5) against source before trusting it**. This is a reference to *adapt*, not a spec to copy.
>
> **Core principle:** an AI Driver is four coupled subsystems — **executor, judge panel, task taxonomy, gated activation**. Build all four or you've built none. Spectra already has the raw materials for all four (see §1.1).

---

## 0. How to use this seed (the prompt)

> I want to add an AI Driver ("brain"), codename Meridian, to Spectra, using the attached Spectra-edition seed as the reference design. **Before writing any code:**
> 1. Re-confirm the recon in §1 against current source (stack, risk surfaces, the existing `/monitor-ci` agent pattern). Correct anything stale.
> 2. Produce a **charter** (§2), then **ADRs** for executor (§3), judge panel (§4), and task taxonomy (§5), plus an **activation plan** (§6) — **matching Spectra's existing ADR format** (Status/Date/Supersedes/Related → Context → Decision-summary table → Environment contract → Non-goals → Consequences → References).
> 3. **Build on the existing house style:** the `/monitor-ci` subagent (one-MCP-call, no-loop constrained driver) and the `sandbox-ai-*` LLM-invoke files are the precedent — extend them, don't reinvent a parallel agent framework.
> 4. Derive the §5 taxonomy from Spectra's *actual* recurring work; treat the draft below as a hypothesis to confirm.
> 5. Make reasonable assumptions, note them, and **stop at the charter + ADRs for review before implementing.**

Moves that prevent drift: **research-first, adapt-don't-invent, build-on-house-style, charter-before-code, stop-for-review.**

---

## 1. Spectra recon (pre-filled — re-confirm against source)

**Stack:** Nx 22 monorepo. Angular 21 UIs (`spectra-ui`, `sandbox-ui`, `admin-ui`) + a frozen Expo client. Node/Express services (`aviate-api`, `admin-ui-api`, `auth-api`, + stubs). `@spectra/*` packages (`auth`, `database`, `logger`, `openapi`, `upload`, `shared-ui`). Drizzle ORM on Postgres (Neon). Auth0 (staff + sandbox tenants). Production via AWS HTTP API Gateway, provisioned with Terraform.

**High-stakes surfaces (the risk profile that sets judge intensity + autonomy ceiling):**
- M2M OAuth `client_credentials` minting / verification
- Production-access (PAR) gating that **fails closed**
- Staff RBAC
- Append-only audit rows
- Drizzle migrations (including journal repair)
- Public-vs-private OpenAPI exposure
- **Convention:** all of the above roll out behind **env flags with prod defaults `false`** — Meridian must adopt this same gating convention natively.

### 1.1 Spectra already has all four subsystem seeds
| Subsystem | Existing Spectra material to build on |
|-----------|---------------------------------------|
| Executor | `@anthropic-ai/sdk` is already a dependency; `sandbox-ai-*` LLM-invoke files exist |
| Judge panel | *(none yet — this is the main net-new build; see §4)* |
| Task taxonomy | Recurring work is well-defined (§5 draft) |
| Gated activation | The env-flag-with-prod-default-`false` pattern is already the house standard; the `/monitor-ci` subagent is a working constrained-driver precedent |

> **House style for constrained agents already exists:** the CI-monitor subagent + `/monitor-ci` prompt under `.github/` use a **one-MCP-call, no-loop** driver pattern. Meridian's executors should follow this constrained shape, not an open-ended autonomous loop.

---

## 2. Charter template — `«meridian»/charter.md` (match Spectra ADR doc conventions)

```
# Meridian — AI Driver Charter (Spectra)

Owns: how AI executes typed work in Spectra — executor model policy, the
verification (judge) policy, the task taxonomy, and the env-flag activation
gating that lets the driver act safely.

## Mission
Run the authoritative contract for AI-executed work in Spectra: typed tasks,
independent verification before trust, and prod-default-false gated rollout that
never weakens the fail-closed posture of PAR, M2M, RBAC, audit, or migrations.

## Pre-conditions
| Dependency | Source | Status |
|---|---|---|
| Env-flag service / config (prod defaults false) | existing house pattern | «confirm» |
| Structured logging for driver actions | @spectra/logger | «confirm» |
| Audit row schema for driver actions (append-only) | @spectra/database | «confirm» |
| Model API keys (executor + judges) secrets injection | «...» | «...» |

## Scope
- In: «typed task classes the driver runs»
- Out: anything touching M2M minting, PAR gating, RBAC grants, audit-row
  semantics, or migration application autonomously until late-phase + full panel

## Open Questions
«unresolved decisions; driver does not act until the activation gate's OQs close»

## Success criteria
- Every driver action is a typed task from the taxonomy (§5)
- No output trusted without passing the judge panel (§4)
- Driver cannot act on prod surfaces until its env flag is true AND the gate passes
- Every driver action is observable (@spectra/logger) and individually reversible
```

---

## 3. ADR — Executor model policy (Spectra)

```
# ADR-«M»-001 — Executor model policy
Status: Proposed | Date: «...» | Supersedes: — | Related: sandbox-ai-* invoke files

## Context
@anthropic-ai/sdk is already in use; the /monitor-ci agent shows the constrained
no-loop pattern. Executor must tier by task difficulty and follow that pattern.

## Decision (summary table)
| Task difficulty | Executor | Notes |
|---|---|---|
| mechanical (scaffold, lint-fix, fixture gen) | «small fast model» | one-shot, no loop |
| reasoning (migration review, OpenAPI diff, RBAC change analysis) | «frontier model» | full judge panel |

## Environment contract
- Model keys injected per env; prod executor gated behind Meridian env flag (default false).

## Non-goals
- No open-ended autonomous loop; follow the /monitor-ci constrained shape.

## Consequences / References
«...»
```

---

## 4. ADR — Judge / verification panel (the main net-new build for Spectra)

```
# ADR-«M»-002 — Verification (judge) panel
Status: Proposed | Date: «...» | Related: ADR-«M»-001

## Context
Spectra has executors but NO independent verification layer yet. This is the
highest-value net-new piece. High-stakes surfaces (M2M, PAR, RBAC, audit,
migrations) demand independent refutation before any output is trusted.

## Decision
Output verified by a panel of «N≥3» INDEPENDENT models — DIFFERENT families from
the executor, each prompted to REFUTE. Accept only on majority. Judge intensity
scales with task risk: full panel for prod/high-risk classes, single-vote for
mechanical ones.

## Environment contract
- Judges read-only; never hold write credentials. Panel runs in all envs; in
  local/dev a single configurable judge with the dev's own key (clearly marked
  indicative, not promotion-eligible).

## Non-goals
- Executor never grades itself. No N-identical judges (diverse families only).

## Consequences / References
«...»
```

---

## 5. ADR — Task taxonomy (DRAFT from recon — VERIFY against source)

```
# ADR-«M»-003 — Task manifest / taxonomy
Status: Proposed | Date: «...»

## Context
Derived from Spectra's recurring work. DRAFT — confirm each class against real
source and adjust executor tier + judge intensity by risk before accepting.

## Decision (draft taxonomy — verify)
| Task class | Example work | Executor tier | Judge intensity | Autonomy ceiling |
|---|---|---|---|---|
| openapi_contract_check | public/private OpenAPI + Swagger drift, spec validation | small | single-vote | mid |
| structured_logging_lint | @spectra/logger conformance, span/field checks | small | single-vote | early |
| ci_self_heal | extend the /monitor-ci no-loop pattern | small | single-vote | early |
| sandbox_ai_endpoint | sandbox AI custom endpoints + MRP fixtures | small→frontier | single→panel | mid |
| drizzle_migration_review | migration safety, journal-repair sanity (REVIEW only) | frontier | FULL PANEL | late / assisted-only |
| m2m_auth_change | client_credentials minting/verify changes | frontier | FULL PANEL | late / assisted-only |
| par_gating_change | production-access fail-closed logic | frontier | FULL PANEL | never-auto (human-only) |
| rbac_change | staff RBAC grants | frontier | FULL PANEL | late / assisted-only |
| terraform_change | AWS HTTP API Gateway / infra | frontier | FULL PANEL | late / assisted-only |

## Rationale
Typed classes give per-class model choice, per-class verification intensity, and
observability. Fail-closed/security surfaces (PAR, M2M, RBAC, migrations) get the
full panel and the lowest autonomy ceiling regardless of how routine they seem.

## How to verify
Map recurring AI-amenable work in the actual repo → confirm/adjust these classes
→ set autonomy ceiling by blast radius. The PAR/M2M/RBAC/migration classes are
the ones to keep human-gated longest.
```

---

## 6. Activation gating (use Spectra's existing env-flag convention)

```
Phases — each gated by a Meridian env flag (prod default false), mirroring
Spectra's existing rollout convention:
1. Shadow      — runs, logs to @spectra/logger, NEVER applied.
2. Assisted    — proposes; human approves each action.
3. Gated-auto  — acts on LOW-risk classes (openapi_check, logging_lint,
                 ci_self_heal) behind the flag; judge panel must pass; every
                 action audit-rowed + reversible.
4. Broad-auto  — expand classes as telemetry justifies. PAR/M2M/RBAC/migration
                 classes NEVER reach full-auto without explicit human gate.

Hard gates before ANY autonomous action:
- [ ] Meridian env flag wired, prod default false
- [ ] Judge panel live and independent
- [ ] Every action logged (@spectra/logger) + append-only audit row
- [ ] Per-action reversal path
- [ ] Charter OQs closed
```

---

## 7. Agent decomposition — map Spectra's seams fresh

Spectra is a **clean Nx monorepo with explicit `@spectra/*` package boundaries** — *not* a monolith. So unlike the Quantum case (a 28-module strongly-connected Delphi monolith that forced anchor-owner agents), Spectra's package graph may already give real, separable seams.

**Do this before deciding agent topology:** derive Spectra's actual dependency graph (Nx project graph + `@spectra/*` import edges) from source. Then:
- If the package boundaries are genuinely separable → capability-specialized agents (assess → implement → verify) per project/package may suffice.
- Watch for hidden coupling through the shared `@spectra/*` packages (`auth`, `database`) — those are the likely high-fan-in shared seams that may need owner agents (the `database`/Drizzle owner especially, given migrations + audit rows).
- Build on the **`/monitor-ci` constrained no-loop driver** as the agent shape; add a coordinator only if multi-step orchestration is needed.

> Lesson carried over: shape agents around the *real* coupling seams derived from source, not the folder layout. Quantum looked separable and wasn't; Spectra looks separable and might be — but verify with the Nx graph, don't assume.

---

## 8. Two non-negotiables

1. **Independent verification, prompted to refute.** Never self-grading; never N identical judges. This is Spectra's biggest net-new gap (§4) — it's the point of the whole exercise.
2. **Charter + ADRs before code; gated before autonomous.** Meridian touches no prod surface until its env flag is true, its judge panel is live, and its OQs are closed — and PAR/M2M/RBAC/migration surfaces stay human-gated the longest.
