# Plan: Post-MVP M2M client credentials (follow-on to edge auth)

## Purpose

This document captures **post-MVP and post-GA** work implied or deferred by [m2m-client-credentials-edge-auth.md](./m2m-client-credentials-edge-auth.md). It does **not** restate the MVP wire contract, phases, or ADR close-out sequence; it assumes those are shipped or in flight.

**Audience:** Product, security, and platform engineering prioritizing after GA M2M (`client_credentials`, Option C status cache, coarse scopes, sandbox provisioning, read-only admin audit).

## Principles (carry forward from parent plan)

- **No JWT wire-format churn without an ADR amendment** — e.g. granular scopes remain OAuth2 space-delimited `scope`; new behaviors prefer policy/resolver and infra changes over claim-shape roulette.
- **Defense in depth** — Any faster revocation (Option B) or new `aud` surfaces must preserve `iss` + `aud` + signature discipline from the parent plan.
- **Polyglot parity** — Node, Go, Python, and .NET stay aligned via shared artifacts and contract tests where the parent plan requires them.

## Dependency

| Prerequisite | Notes |
|--------------|--------|
| [m2m-client-credentials-edge-auth.md](./m2m-client-credentials-edge-auth.md) MVP + GA exit criteria | Phase 1 prod gate, token mint on `auth.aviate.com`, edge dual-issuer middleware, three-tier OpenAPI, scope-map CI, observability minimums |

---

## 1. Revocation, exposure, and incident response

| Item | Rationale (parent plan) | Outcome |
|------|-------------------------|---------|
| **Option B — edge `jti` denylist** | Option C deferred denylist; issuance log + unique `jti` already support later lookup | Sub–status-cache-TTL or “immediate” revoke when contracts or incidents require it; same JWT shape |
| **Kill outstanding JWTs on secret rotate** | MVP: rotate stops new mints; in-flight tokens valid until `exp` | Requires Option B (or equivalent) if customers need instant cutover after suspected leak |
| **Threat-model refresh** | Documented max exposure ~≤15 min (status cache + token tail) | Decide segment-by-segment when Option C is insufficient (e.g. regulated offboarding) |
| **Org-level suspend (`platform:integrations:suspend-org`)** | Post-GA RBAC; incident runbook step 3 | Admin procedure + audit + token mint hard-stop for org |

**Suggested sequencing:** Threat-model / customer SLAs first → Option B design (storage, TTL, hot-path cost) → implement denylist alongside existing status check if both are needed.

---

## 2. Scopes and authorization policy

| Item | Rationale | Outcome |
|------|-----------|---------|
| **Granular scope strings** | MVP: coarse `segment:read` / `segment:write` | Narrow to resources/actions (e.g. `seq:applications:read`) without changing JWT `scope` encoding |
| **DB-backed policy resolver** | MVP: `packages/auth/scope-map.ts` + deploy-only map | Policy rows or rules engine; still validated against OpenAPI in CI to prevent drift |
| **Admin: scope catalog** | Source of truth stays repo + CI in MVP; admin is “best practice” post | Display names, descriptions, implied route prefixes |
| **Admin: templates and tier defaults** | Least-privilege bundles for common integration types | Presets at provision time; optional org-plan defaults |
| **Audit: scope map and grants** | Parent plan calls out audit for global vs per-client changes | Who changed catalog/templates; client granted set stored and echoed in JWTs |

**Suggested sequencing:** Granular strings + static map extension in repo → CI still gates coverage → migrate map hot path to DB with migration-versioned tables → admin UI on top.

---

## 3. Admin UI, support, and platform operations

| Item | Rationale | Outcome |
|------|-----------|---------|
| **`platform:integrations:revoke`** | GA: audit-only; post-GA: force-revoke any org’s clients | Staff cross-tenant lifecycle with RBAC + audit |
| **Cross-tenant search/list** | Support workflows in parent “Sandbox portal vs admin UI” | Find Integration/M2M client by org, status, metadata |
| **Quotas and plan gating** | Max M2M clients per org; feature flags per tier | Product + billing alignment |
| **Token-endpoint tuning in UI** | Rate limits and abuse lockout numerics start fixed | Ops-adjustable ceilings where safe |
| **Abuse and mint dashboards** | Metrics named in parent observability section | On-call views: `m2m_token_error_total`, lockouts, `m2m_verify_total` by `result` |
| **Maintenance mode / global kill-switch** | Beyond per-flag `M2M_MINT_ENABLED` | Coordinated comms and safe degradation |
| **Signing-key rotation governance** | KMS + runbook exists; “who may trigger” is post-MVP clarity | Roles, approval, audit trail |

**Suggested sequencing:** Revoke permission + audit completeness → search/support → quotas → dashboards → tuning UI → key-rotation governance.

---

## 4. Product and data model

| Item | Rationale | Outcome |
|------|-----------|---------|
| **Optional `application_id` on Integration** | MVP: greenfield Integration only; no FK to Application | Group browser Application with server Integration in portal and APIs |
| **Per-segment (or multiple) M2M `aud`** | Parent [Gaps and follow-ups](./m2m-client-credentials-edge-auth.md): single `aud` for MVP | Distinct API resources per segment if isolation or JWKS routing requires it; ADR + verifier matrix update |
| **Configurable access token TTL** | Parent: fixed default (e.g. 10 min); leak response mentions shorter if “product allows” | Per-org or per-client caps within safe bounds; document integrator expectations |

---

## 5. Token endpoint, standards, and discovery

| Item | Rationale | Outcome |
|------|-----------|---------|
| **OAuth authorization-server metadata** | Optional backlog: `/.well-known/oauth-authorization-server` | Easier generic client integration |
| **RFC 7662 token introspection** | Parent: post-GA revisit if introspection added | Resolve `client_id` vs `sub` collisions with introspection parsers |
| **Mixed-credential and error surface** | Already normative in MVP | Keep appendix in sync when adding endpoints or grant types |

---

## 6. OpenAPI, docs, and integrator experience

| Item | Rationale | Outcome |
|------|-----------|---------|
| **Header-gated single OpenAPI URL** | Optional pattern vs `/integration/openapi.json` | Only after threat model; prefer separate authenticated path if unclear |
| **Versioned specs + deprecation** | Parent: `/openapi/v2/...` example + RFC 8594-style sunset | Breaking doc changes without surprise; 301 / sunset / restrict sequence |
| **SDKs and richer samples** | Phase 5: curl + env docs | First-party or generated SDKs; language snippets in portal |

---

## 7. Infrastructure and verifier behavior at scale

| Item | Rationale | Outcome |
|------|-----------|---------|
| **Shared status cache (e.g. Redis)** | MVP: in-process LRU per pod | Cross-pod consistency and tighter effective revocation latency without full denylist |
| **JWKS fail-open beyond stale-ok** | Parent: explicit opt-in only | Higher availability with documented risk acceptance |
| **Auth service SLO / error budget** | ADR instantiates numbers | Customer-facing availability commitments for mint + JWKS |

---

## 8. Non-goals to reconsider (explicit parent exclusions)

| Topic | Parent stance | Revisit if |
|-------|---------------|------------|
| **Per-customer Auth0 M2M as primary store** | Initial non-goal | Enterprise mandates Auth0 as credential system of record; would be a major product/security fork |

---

## Cross-cutting exit criteria (per major theme)

Use these as **definition of done** when prioritizing themes above.

| Theme | Exit criteria (examples) |
|-------|----------------------------|
| Option B | Denylist wired on edge; p99 latency and cardinality budgets met; runbooks for Redis/outage; contract tests for revoke → deny within SLO |
| Granular scopes + DB policy | New scopes in CI + OpenAPI check; admin catalog reflects truth; no orphan routes |
| Post-GA admin | RBAC enforced; every revoke/suspend audited; least-privilege staff roles |
| Per-segment `aud` | All verifiers and docs list expected audiences; no ambiguous branch routing |

---

## Document control

| Field | Value |
|-------|--------|
| Parent plan | [m2m-client-credentials-edge-auth.md](./m2m-client-credentials-edge-auth.md) |
| Status | Backlog — prioritize after MVP/GA sign-off |
| Owner | TBD per theme (security vs platform vs product) |

When an item ships, add a one-line pointer in the parent plan’s “Gaps and follow-ups” or a short “Implemented” subsection there, or link to the ADR that superseded this row.
