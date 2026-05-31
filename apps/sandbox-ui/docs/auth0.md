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
| `SANDBOX_UI_PUBLIC_API_DOCS_BASE_URL` | Optional. Origin for public Swagger (`/docs`) only; defaults to `SANDBOX_UI_API_BASE_URL`. Use when API calls hit a private host but the “API reference” link must open the **public limited** catalog on the edge/public gateway (never `/integration/docs`). |
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

## M2M integrations (`client_credentials`)

Create **Integrations** from the developer dashboard (server-to-server OAuth2 clients). Tokens are minted by **`auth-api`** (default `http://127.0.0.1:9100`) when **`M2M_MINT_ENABLED=true`**.

Example token request (Basic auth):

```bash
curl -sS -u '$CLIENT_ID:$CLIENT_SECRET' \
  -d 'grant_type=client_credentials&scope=platform%3Aread' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  http://127.0.0.1:9100/oauth/token
```

From the **Developer dashboard** (`/dashboard`), each integration row has **Get token**: enter the client secret and the portal calls aviate-api `POST /v1/platform/sandbox/integrations/:id/mint-access-token`, which proxies to auth-api (no browser CORS to port 9100). Configure **`SPECTRA_AUTH_API_URL`** on **aviate-api** (e.g. `http://127.0.0.1:9100`) and keep **`M2M_MINT_ENABLED=true`** on auth-api.

Call the platform API with the JWT (requires **`M2M_VERIFY_ENABLED_AVIATE_API=true`** on aviate-api and matching `SPECTRA_M2M_*` env — see [docs/adr/m2m-client-credentials-phase0.md](../../../docs/adr/m2m-client-credentials-phase0.md)):

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" http://127.0.0.1:3001/v1/platform/hello
```

JWKS (local): `http://127.0.0.1:9100/.well-known/jwks.json` or via local-edge when `SPECTRA_AUTH_API_URL` points at auth-api.
