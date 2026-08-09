# QA — Customer sandbox acceptance (manual matrix)

Run per **environment** (at minimum **local** and **staging**) before calling the sandbox “done” for a release train.

## Row A — M2M + public Swagger (required)

| Step | Action | Expected |
|------|--------|----------|
| 1 | New Auth0 user (or clean browser) → open **sandbox-ui** → log in | Session loads; dashboard shows environment + org context. |
| 2 | Create **Integration** with granted scopes | `client_id` visible; secret stored once. |
| 3 | **Get access token** (mint) with secret | Bearer JWT returned; optional claims preview matches `iss`/`aud`/`scope`. |
| 4 | Open **public** `GET /docs` on gateway → Authorize with Bearer | Authorize succeeds. |
| 5 | Invoke one **documented read** (e.g. `GET /v1/platform/hello` when exposed) | **200** with body; confirms M2M verify + scope map for that route. |

## Row B — Sandbox application path (optional)

When `developerApplicationsUiEnabled` is **true** for the org:

| Step | Action | Expected |
|------|--------|----------|
| 1 | Create sandbox **application** with redirect URIs | Client created; secret shown once. |
| 2 | Complete OAuth flow per product (out of band here) | User-delegated token obtained where applicable. |

## Synthetic data note

Sandbox data must be **synthetic/subset**; staging is **PII-cleaned**; production requires **approved** access — see [`sandbox-phase3-phase4-product-decisions.md`](../plans/sandbox-phase3-phase4-product-decisions.md).

## OAuth discovery smoke

| Step | Action | Expected |
|------|--------|----------|
| 1 | `GET {auth-api}/.well-known/oauth-authorization-server` | JSON with `issuer`, `token_endpoint`, `jwks_uri`, `grant_types_supported`. |

## Row C — Production access (PAR) v1 (baseline)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Session/bootstrap includes `productionAccess*` flags from `platform_settings` | Booleans + SLA fields present when DB seeded (`0008` migration). |
| 2 | `POST /v1/platform/sandbox/integrations/{id}/production-access-requests` with valid `documents.questionnaire` v1 | **201** + row id; **403** when `production_access.integrator_portal_enabled` is false. |
| 3 | `GET /v1/platform/sandbox/integrations/{id}/production-access-request` | Latest row JSON for org-owned integration. |
| 4 | `GET /v1/platform/sandbox/production-access/status-by-token/{any}` | **404** — no public token status (use authenticated portal). |
| 5 | Staff `GET /v1/admin/production-access-requests` | **200** list when staff console enabled; **404** when disabled. |
