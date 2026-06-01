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
