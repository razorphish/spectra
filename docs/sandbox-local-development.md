# Local development — sandbox, OpenAPI, and auth

## Recommended stack

From the repository root:

- **Database:** `npm run dev:db` (or your Neon/DATABASE_URL workflow).
- **APIs:** `npm run dev:apis` — includes **local-edge**, **auth-api**, **aviate-api**, and segment services.
- **UIs:** `npm run dev:uis` — **spectra-ui** (marketing + `/docs`), **sandbox-ui** (developer portal).

## Sandbox UI env sync

```bash
npx nx run sandbox-ui:env-sync
```

Copies `SANDBOX_UI_*` from `.env` / `apps/sandbox-ui/.env` into `environment.auth0.local.ts`. See [`apps/sandbox-ui/docs/auth0.md`](../apps/sandbox-ui/docs/auth0.md).

| Variable | Role |
|----------|------|
| `SANDBOX_UI_API_BASE_URL` | Gateway for portal + API calls (often `http://127.0.0.1:3000` via **local-edge**). |
| `SANDBOX_UI_PUBLIC_API_DOCS_BASE_URL` | Optional: where **public** `/docs` lives if different from API host. Never use `/integration/docs` for customers. |
| `SANDBOX_UI_AUTH_API_PUBLIC_URL` | Optional: public origin of **auth-api** for OAuth metadata links (defaults to `http://127.0.0.1:9100` in generated env). |

## local-edge parity (M2M plan)

[`apps/local-edge`](../apps/local-edge) should proxy **token**, **JWKS**, and **`/docs`** consistently with production topology. If a path is not yet proxied, document the workaround (direct port to auth-api or aviate-api) in runbooks until parity is complete.

## CORS and browser Swagger

Swagger UI runs in the **browser**. If the OpenAPI “Try it” target origin differs from where Swagger is hosted, the gateway must allow **CORS** for that browser origin, or use **server-side** curl/Postman, or a **Try-it proxy** (Phase 4 embedded explorer).

## OpenAPI merge

```bash
npx nx run openapi:merge
```

Emits `spectra-public-api.json` (public limited) and `spectra-integration-api.json` (full) into `packages/openapi/dist/` and **aviate-api** `src/assets/`. CI and scope-map contract tests assume this has run (see `docs/contracts/scope-map-openapi-ci.md`).
