# ADR: M2M client credentials — Phase 0 design lock

**Status:** Accepted  
**Date:** 2026-05-31  
**Supersedes:** —  
**Related:** [docs/plans/m2m-client-credentials-edge-auth.md](../plans/m2m-client-credentials-edge-auth.md)

## Context

Customer backends need OAuth2 `client_credentials` tokens issued by Spectra (not Auth0 M2M as primary store), validated on edge APIs alongside existing Auth0 user tokens. The product plan locks wire contracts, revocation Option C, scope map MVP, and three-tier routing.

## Decision summary

| Topic | Decision |
|-------|-----------|
| Auth service location | Nx app **`apps/services/auth-api`** — dedicated HTTP service for `POST /oauth/token` and `GET /.well-known/jwks.json` (paths configurable via `AUTH_API_BASE_PATH`, default root). |
| Canonical M2M issuer | `https://auth.aviate.com/` (trailing slash); override non-prod only via **`AUTH_ISSUER_OVERRIDE`** per parent plan. |
| M2M audience (`aud`) | Single string **`https://api.aviate.com/`**; env **`SPECTRA_M2M_AUDIENCE`**. Distinct from **`AUTH0_AUDIENCE`**. |
| Dual verification | **`@spectra/auth`** export **`createRequireSpectraAccessToken`** — `decodeJwt` → route by **`iss`** (exact string equality to expected M2M issuer vs Auth0 issuer) → **`jwtVerify`** with correct JWKS + audience; **no** try-until-works. |
| Revocation (MVP) | **Option C:** mint refuses revoked/suspended; edge checks **in-process LRU** status cache (TTL **120s**); access token TTL **600s**; customer doc ceiling **≤15m**; always **`jti`** + **`m2m_token_issuance_log`** row per mint. |
| Status cache failure modes | **Cold miss + DB down:** `503` + `error: auth_unavailable` (logs `error_sub_cause: status_db_unavailable`). **Stale entry + refresh fails:** fail-open until TTL. **JWKS stale exhausted:** same `503` body; logs `jwks_fetch_failed`. |
| Integration lifecycle | **`spectra.integrations`**: `status_id` uses existing catalog — **`active`**, **`deleted`** (revoked semantics + `deleted_at`), **`archived`** (suspended). Portal verbs: create, list, rotate secret, revoke (→ deleted), suspend (→ archived), resume (→ active). |
| M2M client storage | Table **`spectra.m2m_oauth_clients`**: FK **`integration_id`** → `integrations` (1:1 unique on `integration_id` for MVP); **`granted_scopes`** text (space-delimited ceiling); secret **Argon2id** via existing sandbox portal crypto helpers pattern. |
| Tier (c) routers | **`createSandboxPortalRouter()`** mounts only Auth0 middleware — **never** Spectra M2M verifier. **`createPlatformRouter()`** child **`/sandbox`** subtree is tier (c). **`/v1/platform/hello`** and future integrator routes use dual-issuer middleware when `M2M_VERIFY_ENABLED_*` is on. Staff-only **`/stats`**, **`/uploads`**, **`/health`** (as currently routed): **Auth0 staff** only for GA hardening — M2M rejected with `token_type_not_allowed` or staff-only guard (implementation tracks plan Phase 4). |
| Scope map | Source: [`packages/auth/src/lib/scope-map.ts`](../packages/auth/src/lib/scope-map.ts); build emits **`packages/auth/dist/scope-map.json`** via **`nx run auth:emit-scope-map`** (depends on build). |
| OpenAPI | **`GET /openapi.json`** — public limited (build filter TBD incremental). **`GET /integration/openapi.json`** — full spec; **`admin-ui-api`** proxies to **`AVIATE_API_OPENAPI_URL`** with header **`X-Spectra-Integration-Key`** = **`SPECTRA_INTEGRATION_OPENAPI_KEY`** (server env). |
| Rollout flags | **`M2M_MINT_ENABLED`**, **`M2M_VERIFY_ENABLED_AVIATE_API`**, optional **`M2M_ORG_ALLOWLIST`** — read at startup; prod mint default **false**. |
| Polyglot contract | MVP: **Node** authoritative; **`scripts/m2m-scope-contract-check.mjs`** loads `scope-map.json` and asserts sample matrix (Go/Python/.NET full parity deferred with owner — mirror validators follow same JSON in later PRs). |

## Environment contract (instantiation)

| Variable | Required when | Purpose |
|----------|----------------|---------|
| `AUTH0_DOMAIN`, `AUTH0_AUDIENCE` | User JWT path enabled | Auth0 JWKS verify |
| `SPECTRA_M2M_AUDIENCE` | M2M verify path | JWT `aud` for M2M branch |
| `SPECTRA_M2M_ISSUER` | M2M verify / mint | Expected `iss` (default `https://auth.aviate.com/`) |
| `SPECTRA_M2M_JWKS_URL` | Edge M2M verify | Default `{issuer}.well-known/jwks.json` resolved from issuer URL |
| `AUTH_ISSUER_OVERRIDE` | Local only | Replaces expected M2M issuer + mint issuer; **fatal** if `NODE_ENV=production` |
| `M2M_MINT_ENABLED` | auth-api | Gate token issuance |
| `M2M_VERIFY_ENABLED_AVIATE_API` | aviate-api | Gate M2M acceptance on platform routes |
| `M2M_ORG_ALLOWLIST` | Optional | Comma ULIDs; if set, mint only for listed orgs |
| `SPECTRA_INTEGRATION_OPENAPI_KEY` | aviate-api + admin-ui-api | Authenticated OpenAPI fetch |
| `AVIATE_API_OPENAPI_URL` | admin-ui-api | e.g. `http://127.0.0.1:3001/integration/openapi.json` |

## Non-goals (unchanged from parent plan)

Per-customer Auth0 M2M as primary store; browser-held M2M secrets; OAuth discovery metadata in MVP.

## Consequences

- New migrations and services must ship behind flags until Phase 1 prod gate clears.  
- Admin RBAC names `platform:integrations:read` / `export` for audit UI remain as in parent plan.  
- Deviations from parent **Solidified ADR contract** require amending **this ADR** and the parent plan link section.

## References

- Parent: [m2m-client-credentials-edge-auth.md](../plans/m2m-client-credentials-edge-auth.md)  
- Post-MVP: [m2m-client-credentials-post-mvp.md](../plans/m2m-client-credentials-post-mvp.md)
