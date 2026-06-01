# Sandbox portal HTTP API (`/v1/platform/sandbox/...`)

Routes are implemented on **aviate-api** in [`apps/services/aviate-api/src/routes/sandbox-portal.ts`](../apps/services/aviate-api/src/routes/sandbox-portal.ts).

## Audience

- **Developer portal (sandbox-ui)** — Authenticated with Auth0 (SPA) against the **public API audience**. These routes bootstrap the developer org, list/create **sandbox applications** and **integrations**, upload assets, and **proxy M2M token mint** to **auth-api**.
- **Not callable with M2M integration tokens** — Self-service portal APIs stay out of the public limited OpenAPI catalog by design.

## Session bootstrap

- `GET /v1/platform/sandbox/session` — Returns `userId`, `orgId`, `email`, and `developerApplicationsUiEnabled` after ensuring a developer org exists. Errors include `401` (missing Auth0 principal), `500` with `bootstrap_failed` if the org cannot be created.

## Typical errors (portal JSON)

Responses often use `{ "error": "...", "message": "..." }` (exact fields vary by handler). Distinguish these from **public product API** error bodies.

- **`401` / `unauthorized`** — Missing or invalid Auth0 bearer for portal calls.
- **`validation_error`** — Bad input (e.g. missing redirect URIs for an application).
- **Mint proxy** — `POST .../integrations/:id/mint-access-token` forwards to auth-api; expect OAuth-style errors in the JSON payload (`invalid_client`, `invalid_scope`, etc.) on failure.

## Rate limits and lockout

- Abuse / lockout behavior for M2M mint is defined in the M2M plan and auth-api (e.g. `client_locked` when applicable). Surface user-facing messages from the mint response without logging full secrets.

## Correlation with edge errors

- Portal failures (bootstrap, validation) are independent of **edge** `401`/`403` on product routes. When debugging “works in portal but not API”, compare **Auth0 audience** (portal) vs **M2M JWT audience** (integration token) and **gateway base URL**.

## Related

- [m2m-client-credentials-edge-auth.md](./plans/m2m-client-credentials-edge-auth.md)
- [sandbox-local-development.md](./sandbox-local-development.md)
