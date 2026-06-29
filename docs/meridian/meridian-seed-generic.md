# Meridian Seed — Portable AI Driver ("Brain") Charter & ADR Template

> **What this is:** a stack-agnostic seed for adding an AI Driver — an "AI brain" that executes typed work under verification and gated rollout — to any project. Modeled on the Quantum Aviate **Track 15 (Meridian)** design. Drop this file into the target repo and prompt against it (see §0). Adapt every `«placeholder»`; do not copy values blindly.
>
> **Core principle:** an AI Driver is not a chatbot bolted onto a repo. It is **four** coupled subsystems — executor, judge panel, task taxonomy, gated activation. Build all four or you've built none.

---

## 0. How to use this seed (the prompt)

Paste this into the target project's coding agent. Do **not** ask it to "build an AI brain" cold — that produces drift.

> I want to add an AI Driver ("brain"), codename «Meridian», to this project, modeled on the attached Meridian Seed. **Before writing any code:**
> 1. Read this codebase and its CLAUDE.md / docs to understand the stack, risk profile, deployment model, and existing conventions.
> 2. Read this seed as the reference design — adapt it, don't invent from scratch.
> 3. Produce a **charter** for this project's AI Driver (§2), then **ADRs** for executor (§3), judge panel (§4), and task taxonomy (§5), plus an **activation plan** (§6).
> 4. Derive the task taxonomy from *this codebase's actual recurring work* — that's the project-specific part.
> 5. Make reasonable assumptions, note them, and **stop at the charter + ADRs for my review before implementing.**

The four moves that prevent drift: **research-first, adapt-don't-invent, charter-before-code, stop-for-review.**

---

## 1. The mental model — four subsystems

| Subsystem | What it is | Failure if skipped |
|-----------|-----------|--------------------|
| **Executor** | The model(s) that do the work, tiered by task difficulty | Over/under-powered model for the job; cost blowout or low quality |
| **Judge panel** | *Independent, differing* models that score/refute the executor's output before it's trusted | Self-grading — plausible-but-wrong output ships |
| **Task taxonomy** | The typed set of jobs the driver dispatches (not freeform chat) | It's a chatbot, not a driver — no determinism, no guardrails per task type |
| **Activation gating** | Phased rollout behind flags, with telemetry + rollback | The brain acts before its guardrails exist — unbounded blast radius |

---

## 2. Charter template — `«meridian»/charter.md`

```
# «Meridian» — AI Driver Charter

**Owns:** how AI executes typed work in this project — the executor model policy,
the verification (judge) policy, the task taxonomy, and the activation gating that
lets the driver act safely.

## Mission
Define and run the authoritative contract for AI-executed work: what the driver
may do, how its output is verified before trust, and how it is rolled out without
risking «production / users / data». The driver does not invent process — it
executes the typed tasks defined here, under the verification defined here.

## Why a driver and not ad-hoc prompting
«State the anti-drift reason: uncoordinated AI prompting causes architectural
drift / inconsistent patterns / unverified output. The taxonomy + judge panel ARE
the anti-drift mechanism.»

## Pre-conditions (cross-cutting dependencies)
| Dependency | Source | Status |
|---|---|---|
| Feature-flag service for gated activation | «...» | «open/resolved» |
| Observability / telemetry for driver actions | «...» | «...» |
| Rollback mechanism | «...» | «...» |
| Secrets/keys for executor + judge model access | «...» | «...» |

## Scope
- In: «typed task classes the driver runs»
- Out: «what stays human-only — irreversible/architectural decisions»

## Open Questions
«List the unresolved decisions; do not let the driver act until the activation
gate's OQs are closed.»

## Success criteria
- Every driver action is a typed task from the taxonomy (§5)
- No driver output is trusted without passing the judge panel (§4)
- Driver cannot act on «production/real» targets until activation gate passes (§6)
- Every driver action is observable and individually rollback-able
```

---

## 3. ADR template — Executor model policy

```
# ADR-«M»-001 — Executor model policy
Status: «Proposed»

## Decision
Tier executor models by task difficulty:
- Cheap/mechanical tasks → «small fast model»
- Hard reasoning/judgment tasks → «frontier model»
Default to the smaller tier; escalate only when the task class warrants it.

## Rationale
«Cost vs. quality. Most tasks don't need the frontier tier; reserve it for the
hardest verify/design/judgment work.»

## Reference (Quantum Meridian)
Executor: a small-fast tier + a frontier tier, chosen per task class. Orchestrator
runs on the frontier tier; mechanical fan-out runs on the cheaper tier.
```

---

## 4. ADR template — Judge / verification panel (the part people skip)

```
# ADR-«M»-002 — Verification (judge) panel
Status: «Proposed»

## Decision
The executor's output is verified by a panel of «N≥3» INDEPENDENT models —
deliberately DIFFERENT model families so they fail differently — each prompted to
REFUTE the output. Accept only on «majority/consensus». 

## Rationale
- Self-grading is worthless: a model checking its own work confirms its own errors.
- Diverse models catch failure modes a single model (or N copies of one) cannot.
- Prompt judges to refute, not approve; default-to-reject on uncertainty.

## Reference (Quantum Meridian)
Judge panel = three different non-executor model families via a managed gateway,
chosen for divergence. Executor model is NOT on its own judge panel.

## Anti-pattern to forbid
Executor grades itself; or N identical judges (redundant, not diverse); or judges
prompted to "confirm" rather than "refute".
```

---

## 5. ADR template — Task taxonomy (the project-specific core)

```
# ADR-«M»-003 — Task manifest / taxonomy
Status: «Proposed»

## Decision
The driver dispatches only these typed task classes (derived from THIS project's
recurring work):
| Task class | Input | Output | Executor tier | Judge intensity |
|---|---|---|---|---|
| «e.g. scaffold_component» | «...» | «...» | small | single-vote |
| «e.g. design_review»      | «...» | «...» | frontier | full panel |
...

## Rationale
Typed tasks give determinism, per-class model choice, per-class verification
intensity, and observability. Freeform = none of these.

## How to derive (do this against the real codebase)
Map the recurring AI-amenable work in this repo → cluster into stable task classes
→ assign executor tier + judge intensity by risk. Don't copy another project's
taxonomy; the classes are domain-specific.
```

---

## 6. Activation gating & observability plan

```
# «Meridian» activation plan
Phases (each gated — the driver cannot reach the next until the gate passes):
1. Shadow      — driver runs, output logged, NEVER applied. Compare to human work.
2. Assisted    — driver proposes; human approves each action.
3. Gated-auto  — driver acts on LOW-risk task classes behind a feature flag;
                 judge panel must pass; every action telemetered + rollback-able.
4. Broad-auto  — expand task classes as confidence + telemetry justify.

Hard gates before ANY autonomous action:
- [ ] Feature flag wired; driver off by default
- [ ] Telemetry on every driver action (what task, which models, judge verdict, outcome)
- [ ] Per-action rollback path
- [ ] Judge panel live and independent
- [ ] OQs in the charter closed
```

---

## 7. Agent decomposition — follow the real seams

When the driver fans out into multiple agents, **shape the agents around the codebase's true coupling seams, not its surface structure** (folders/modules/files).

- First have the driver **map the dependency/coupling structure** (what calls what, what writes what) — from *source*, not from summaries.
- Decompose agents by **role/capability** (assess → scaffold → implement → verify) and by **shared-asset ownership** (one agent owns each high-fan-in shared component), plus a **coordinator** that holds the dependency graph and sequences work.
- Surface-structure decomposition (one agent per folder/module) fails when the modules aren't actually independent — agents re-derive shared context inconsistently and drift.

> Lesson from Quantum: the system looked like 36 independent modules but was a 28-module strongly-connected monolith. Per-module agents would have mapped to a boundary that didn't exist. The decomposition only became correct after the real coupling graph was derived from source and verified by an independent signal.

---

## 8. Two non-negotiables

1. **Independent verification, prompted to refute.** Never self-grading; never N identical judges. Diverse models, skeptical prompts, default-to-reject.
2. **Charter + ADRs before code; gated before autonomous.** The brain does not touch real targets until its guardrails (flags, telemetry, rollback, judge panel) exist and its open questions are closed.
```
