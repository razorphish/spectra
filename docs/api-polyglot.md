# Polyglot API conventions

Spectra public APIs share URL layout and JSON contracts. Each service runs in its **target runtime**; OpenAPI under `apps/services/<name>/open-api/openapi.yaml` is the source of truth.

## URL layout

| Segment | Service | Local port | Path prefix |
|---------|---------|------------|-------------|
| `platform` | aviate-api | 3001 | `/v1/platform/` |
| `seq` | seq-api | 3003 | `/v1/seq/` |
| `quantum` | quantum-api | 3004 | `/v1/quantum/` |
| `corridor` | corridor-api | 3005 | `/v1/corridor/` |

**Unified local entry:** [local-edge](../apps/local-edge) on **:3000** reverse-proxies to each upstream. [sandbox-ui](../apps/sandbox-ui) should use `apiBaseUrl` `http://127.0.0.1:3000`.

**Merged API docs:** `GET http://127.0.0.1:3000/docs` (proxied to aviate-api) and `GET /openapi.json`.

## Standard endpoints

### Liveness — `GET /v1/<segment>/health`

Public. Response:

```json
{ "status": "ok" }
```

### Readiness — `GET /v1/<segment>/ready`

Public. Response:

```json
{ "status": "ok", "checks": { "runtime": "ok" } }
```

### Sandbox hello — `GET /v1/<segment>/hello`

Requires `Authorization: Bearer <Auth0 access token>` (public/sandbox API audience).

Response `200`:

```json
{
  "message": "Hello from seq-api",
  "segment": "seq",
  "service": "seq-api",
  "authenticated": true,
  "principal": { "sub": "auth0|…" }
}
```

Errors (aligned with admin-ui-api):

| Status | `error` | When |
|--------|---------|------|
| 401 | `missing_token` | No `Authorization: Bearer` header |
| 401 | `invalid_token` | JWT verification failed |
| 503 | `auth_not_configured` | Missing `AUTH0_DOMAIN` / `AUTH0_AUDIENCE` on server |

## Auth0 environment variables

Used by **all** public-segment backends (Node, .NET, Python, Go):

| Variable | Purpose |
|----------|---------|
| `AUTH0_DOMAIN` | Tenant host (no `https://`), e.g. `dev-xxx.us.auth0.com` |
| `AUTH0_AUDIENCE` | API identifier; must match sandbox-ui `SANDBOX_UI_AUTH0_AUDIENCE` |
| `AUTH0_ISSUER` | Optional issuer override |
| `AUTH0_VERIFY_DISABLED` | `true` = decode JWT without verify (**local trusted machine only**) |

Node services use [`@spectra/auth`](../packages/auth). Polyglot stacks validate the same issuer, audience, and JWKS URL (`https://{AUTH0_DOMAIN}/.well-known/jwks.json`).

Staff **admin-ui-api** uses the same middleware with a **staff** audience in its own `.env` — do not reuse that audience for sandbox.

## Local development

```bash
npm run dev:apis   # local-edge + all backends
```

| Service | Runtime | Nx serve |
|---------|---------|----------|
| aviate-api | Node / Express | `npx nx serve aviate-api` |
| seq-api | .NET 8 | `npx nx serve seq-api` |
| quantum-api | Python 3.12 | `npx nx serve quantum-api` |
| corridor-api | Go 1.22+ | `npx nx serve corridor-api` |

Polyglot services load `.env` from workspace root and `apps/services/<name>/.env.development` where applicable.

## CI packaging

| Service | Workflow | Artifact |
|---------|----------|----------|
| aviate-api, admin-ui-api | [spectra-build-lambdas.yml](../.github/workflows/spectra-build-lambdas.yml) | Node Lambda zip |
| seq-api | [spectra-build-seq.yml](../.github/workflows/spectra-build-seq.yml) | .NET publish zip |
| quantum-api | [spectra-build-quantum.yml](../.github/workflows/spectra-build-quantum.yml) | Python wheel (placeholder path) |
| corridor-api | [spectra-build-corridor.yml](../.github/workflows/spectra-build-corridor.yml) | Go binary zip |

Polyglot services are **not** in the Node lambda matrix once their native build is enabled.

## OpenAPI merge

```bash
npx nx run openapi:merge
```

Writes `packages/openapi/dist/spectra-public-api.json` and copies to aviate-api assets for `/docs`.
