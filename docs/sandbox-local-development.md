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
| `SANDBOX_UI_API_BASE_URL` | Gateway for portal + API calls (often `http://localhost:3000` via **local-edge**). Prefer **`localhost`** over `127.0.0.1` when using a **Windows** browser against APIs in **WSL2** (see CORS section below). |
| `SANDBOX_UI_PUBLIC_API_DOCS_BASE_URL` | Optional: where **public** `/docs` lives if different from API host. Never use `/integration/docs` for customers. |
| `SANDBOX_UI_AUTH_API_PUBLIC_URL` | Optional: public origin of **auth-api** for OAuth metadata links (defaults to `http://localhost:9100` in generated env). |

### WSL2 + Windows browser (“CORS request did not succeed”, status null)

Firefox and Chrome often report a **failed connection** (nothing listening on the target from the browser’s OS) as **“CORS request did not succeed”** with **no HTTP status**. Typical causes:

1. **`SANDBOX_UI_API_BASE_URL` uses `http://127.0.0.1:…`** — on Windows, that is **Windows loopback**, not your WSL VM. Use **`http://localhost:3000`** (or the port you expose) so WSL’s localhost relay is used.
2. **`HOST=127.0.0.1` on aviate-api** — binds only loopback inside Linux; remove it or set **`HOST=0.0.0.0`** so port forwarding can reach the process (aviate-api defaults to `0.0.0.0` when `HOST` is unset).
3. **API not running** — confirm `nx serve aviate-api` / `npm run dev:apis` is up, then `curl -sS -o /dev/null -w '%{http_code}' http://localhost:3001/` from the **same machine as the browser** (e.g. Windows PowerShell).

## local-edge parity (M2M plan)

[`apps/local-edge`](../apps/local-edge) should proxy **token**, **JWKS**, and **`/docs`** consistently with production topology. If a path is not yet proxied, document the workaround (direct port to auth-api or aviate-api) in runbooks until parity is complete.

## CORS and browser Swagger

Swagger UI runs in the **browser**. If the OpenAPI “Try it” target origin differs from where Swagger is hosted, the gateway must allow **CORS** for that browser origin, or use **server-side** curl/Postman, or a **Try-it proxy** (Phase 4 embedded explorer).

**aviate-api** allows all origins (`Access-Control-Allow-Origin: *`) and answers `OPTIONS` with **204** for sandbox portal development. If the browser still reports a CORS error with **HTTP status `(null)`**, treat it as a **connectivity** problem first (wrong host such as `127.0.0.1` from Windows to WSL, API not listening on `0.0.0.0`, or service down) — see the WSL2 subsection in the env table above.

## OpenAPI merge

```bash
npx nx run openapi:merge
```

Emits `spectra-public-api.json` (public limited) and `spectra-integration-api.json` (full) into `packages/openapi/dist/` and **aviate-api** `src/assets/`. CI and scope-map contract tests assume this has run (see `docs/contracts/scope-map-openapi-ci.md`).
