# Sandbox UI — Auth0 (public / developer)

Sandbox UI uses a **separate** Auth0 SPA and **public** API audience from the staff admin UI. See [admin-ui/docs/auth0.md](../../admin-ui/docs/auth0.md) for staff setup — do not reuse that tenant configuration for sandbox users.

## Dashboard

1. Create an **API** with an Identifier (audience), e.g. `https://spectra.public.api`.
2. Create a **Single Page Application** for sandbox-ui.
3. Grant the SPA **user-delegated access** to the public API.
4. Allow callback URLs: `http://localhost:4201` (and `127.0.0.1:4201` if needed).
5. Allow web origins for the sandbox dev server.

## Local `.env`

Copy [apps/sandbox-ui/.env.example](../.env.example) to `apps/sandbox-ui/.env`:

| Variable | Purpose |
|----------|---------|
| `SANDBOX_UI_API_BASE_URL` | Default `http://127.0.0.1:3000` (local-edge) |
| `SANDBOX_UI_AUTH0_ENABLED` | `true` to enable Universal Login |
| `SANDBOX_UI_AUTH0_DOMAIN` | Auth0 tenant host |
| `SANDBOX_UI_AUTH0_CLIENT_ID` | SPA client ID |
| `SANDBOX_UI_AUTH0_AUDIENCE` | Public API identifier |

The header “Spectra” link uses `environment.spectraMarketingUrl` (`http://localhost:4200` in the development build for local `nx serve spectra-ui`; set in [environment.ts](../src/environments/environment.ts) for production when the marketing app is on another origin).

Run `npx nx run sandbox-ui:env-sync` before serve/build.

## Backend alignment

Set the same audience on every public-segment API:

- `apps/services/aviate-api/.env.development`
- `apps/services/seq-api/.env.development`
- `apps/services/quantum-api/.env.development`
- `apps/services/corridor-api/.env.development`

See [docs/api-polyglot.md](../../../docs/api-polyglot.md).
