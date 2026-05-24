# Admin UI — Auth0 (staff)

Admin UI uses the **Single Page Application** flow with `@auth0/auth0-angular`: Universal Login, then **access tokens** attached to `admin-ui-api` requests under `/v1/admin`.

Sandbox UI will use a **separate** Auth0 application and API audience when you add it; do not reuse this tenant configuration for public sandbox users.

## Auth0 Dashboard setup

1. **Create an API** (Applications → APIs → Create)  
   - **Identifier** (this is the **audience**): e.g. `https://spectra.admin.api` (any unique identifier string Auth0 accepts).  
   - The SPA and `admin-ui-api` must both use this exact value.

2. **Create an Application** of type **Single Page Application**  
   - Copy **Domain** and **Client ID** into admin UI env (`ADMIN_UI_AUTH0_*` in `.env`; see below).  
   - **Application Login URI** (in the application settings): the URL of your staff sign-in page. Auth0 uses this when a user must be sent back to your app to start login (e.g. IdP-initiated flows, some error paths). Use the **login route**, not the OAuth callback route:  
     - Local: `http://localhost:4202/auth/login` and, if you use it, `http://127.0.0.1:4202/auth/login` (add `?auth0=1` to jump straight to Universal Login via the SPA SDK).  
     - Production: `https://your-staff-admin.example.com/auth/login`  
   - **Allowed Callback URLs** must include the SPA OAuth callback for each origin you use, for example:  
     - `http://localhost:4202/auth/callback` and `http://127.0.0.1:4202/auth/callback` for local `nx serve admin-ui`  
     - `https://your-staff-admin.example.com/auth/callback` for production staff UI  
   - Auth0 error **“Callback URL mismatch”** means the `redirect_uri` your app sent (by default `{browserOrigin}/auth/callback`) is **not** listed verbatim in Allowed Callback URLs — add the exact URL (scheme, host, port, path). `localhost` and `127.0.0.1` are different hosts; allowlist both if you use both. Optional: set **`ADMIN_UI_AUTH0_REDIRECT_URI`** to a single fixed callback URL and allowlist that exact string.
   - If Auth0 redirects to `/auth/callback` with **`invalid_request`** and **“Client … is not authorized to access resource server …”**, the callback URL is fine: your API’s **user-delegated access** policy is blocking this SPA until it is explicitly allowed. Open **Applications → APIs** → select the API whose **Identifier** matches your audience (e.g. `https://spectra.admin.api`) → **Application Access** tab → **Edit** → find your staff SPA and grant **User-Delegated Access** (choose permissions, or “always grant all” if your team uses that). If the API’s access policy is **All apps allowed** for user-delegated access, first-party SPAs can request that audience without this step; **Per-app authorization** requires the Application Access grant. See Auth0: [API access policies for applications](https://auth0.com/docs/get-started/apis/api-access-policies-for-applications). **Third-party** applications always need an explicit grant regardless of “allow all.”
   - **User-delegated vs client access:** **User-delegated access** is what the staff SPA needs (tokens on behalf of the signed-in user). **Client access** is for **machine-to-machine** applications using the `client_credentials` grant; a public SPA does not use that, so you can leave **Client access** disabled for this SPA unless you have an unusual setup. Prefer granting only the API permissions you need in production rather than “all” forever.
   - **Allowed Logout URLs** must include the **exact** post-logout URL the SPA sends as `returnTo` (Auth0 shows a generic error if it is missing or mismatched). By default the app uses `{origin}/auth/login` (e.g. `http://localhost:4202/auth/login` and `http://127.0.0.1:4202/auth/login`). Add each URL you use, or set **`ADMIN_UI_AUTH0_LOGOUT_RETURN_TO`** / **`STAFF_AUTH0_LOGOUT_RETURN_TO`** to a single fixed URL and allowlist that string exactly.
   - **Allowed Web Origins** should list the **origins** only (scheme + host + port), e.g. `http://localhost:4202` (no path).  
   - Authorize this application to request your Admin API so access tokens include the correct `aud`.

3. **Refresh tokens (recommended for local dev and browsers that block third-party cookies)**  
   The admin UI configures `@auth0/auth0-angular` with **`useRefreshTokens: true`** and **`cacheLocation: 'localstorage'`** so a **full page reload** can restore the session without relying on silent `prompt=none` iframe auth (which often fails with **HTTP 400** on `/authorize` when Auth0 cookies are third-party).  
   In Auth0: open your **SPA** application → **Settings** → enable **Refresh Token Rotation** (and allow the **Refresh Token** grant if your tenant shows grant toggles). After changing this, users may need to **sign in once** to receive a refresh token.

4. **Users**  
   - **User Management → Users → Create User** for database username/password, or enable social / enterprise connections for this application only.

5. **Backend (`admin-ui-api`)**  
   - Set `AUTH0_DOMAIN` (tenant host, no `https://`) and `AUTH0_AUDIENCE` (same as API Identifier).  
   - Optional: `AUTH0_ISSUER` if tokens use a custom issuer (e.g. custom domain).  
   - Local-only escape hatch: `AUTH0_VERIFY_DISABLED=true` (never in shared environments).

## Repo configuration

| Auth0 / deploy value | Admin UI (local dev) | admin-ui-api |
| --- | --- | --- |
| Tenant domain | `ADMIN_UI_AUTH0_DOMAIN` in `.env` → generated `auth0.domain` | `AUTH0_DOMAIN` |
| SPA Client ID | `ADMIN_UI_AUTH0_CLIENT_ID` | — |
| API Identifier (audience) | `ADMIN_UI_AUTH0_AUDIENCE` | `AUTH0_AUDIENCE` |
| Staff API base URL | `ADMIN_UI_API_BASE_URL` (optional) | — |

## Local development (`.env`)

Local admin UI reads **Auth0 and API base URL from dotenv**, not from hand-editing `environment.development.ts`.

1. Copy [apps/admin-ui/.env.example](../.env.example) to **`apps/admin-ui/.env`** (gitignored), or set the same keys in the **workspace root** `.env` using the `ADMIN_UI_*` prefix only (those keys are merged first; `apps/admin-ui/.env` then overrides).

2. Variables:

| Variable | Purpose |
| --- | --- |
| `ADMIN_UI_API_BASE_URL` | Optional. Default `http://127.0.0.1:3002`. |
| `ADMIN_UI_AUTH0_ENABLED` | `true` / `1` / `yes` when you want Universal Login (requires domain + client id). |
| `ADMIN_UI_AUTH0_DOMAIN` | Auth0 tenant domain (no `https://`). |
| `ADMIN_UI_AUTH0_CLIENT_ID` | SPA Client ID. |
| `ADMIN_UI_AUTH0_AUDIENCE` | API identifier (audience). |
| `ADMIN_UI_AUTH0_REDIRECT_URI` | Optional. Full callback URL if it cannot be `{origin}/auth/callback` (must match an **Allowed Callback URL** in Auth0 exactly). |
| `ADMIN_UI_AUTH0_LOGOUT_RETURN_TO` | Optional. Full post-logout `returnTo` URL (must match an **Allowed Logout URL** exactly). Default: `{origin}/auth/login`. |

3. **`nx run admin-ui:env-sync`** (or any `nx build` / `nx serve` for admin-ui) runs [scripts/sync-admin-ui-env.mjs](../../../scripts/sync-admin-ui-env.mjs) and writes **`src/environments/environment.auth0.local.ts`** (gitignored). [environment.development.ts](../src/environments/environment.development.ts) imports that file.

4. Optional: **`apps/admin-ui/.env.local`** for overrides (loaded after `apps/admin-ui/.env`).

Enable Auth0 in practice by setting `ADMIN_UI_AUTH0_ENABLED=true` plus non-empty `ADMIN_UI_AUTH0_DOMAIN` and `ADMIN_UI_AUTH0_CLIENT_ID` (same rule as `provideAuth0` / the auth guard).

**Intent vs runtime:** `env-sync` writes `auth0.requested` from `ADMIN_UI_AUTH0_ENABLED` and `auth0.enabled` only when domain **and** client id are set (Auth0 SDK on). If `requested` is true but `enabled` is false (e.g. missing client id), the staff login page **does not** use the dev email/password bypass — fix env and re-run `nx run admin-ui:env-sync`. To allow dev session login locally, set `ADMIN_UI_AUTH0_ENABLED=false` or omit it.

## Access control (dashboard and staff shell)

- **Auth0 enabled:** `mainLayoutAuthGuard` requires an Auth0 session before the main layout (dashboards, settings, tables, etc.). The same guard is applied to standalone routes **`/landing`** and **`/tables/style-generator`** so they are not reachable without login.
- **Auth0 entry:** The auth layout navbar and landing header link to `/auth/login?auth0=1`, which starts Universal Login via `loginWithRedirect()` on the login route (same as **Continue with Auth0**). Other links (e.g. forgot password → back to login) use `/auth/login` without the query so the full login screen is shown.
- **Register entry:** Links use `/auth/register?auth0=signup` to open Universal Login with **`screen_hint: signup`** (Auth0 hosted sign-up). Enable **sign ups** on your Database connection (Authentication → Database → connection → **Disable Sign Ups** off). If `screen_hint` does not show sign-up in your tenant’s New Universal Login experience, verify Auth0 docs for your login flow version.
- **Auth0 disabled (local only):** the email/password form sets a **`sessionStorage`** flag via `AdminSessionService`. Logout clears it. Use Auth0 for any shared or deployed environment; the dev session is not a real auth boundary.

## CI / staff deploy (`STAFF_API_URL`)

The reusable workflow [.github/workflows/spectra-build-frontends.yml](../../../.github/workflows/spectra-build-frontends.yml) passes `STAFF_API_URL`. For **admin-ui** only, when the selected Angular configuration is `production`, the workflow:

1. Runs [scripts/write-admin-ui-build-environment.mjs](../../../scripts/write-admin-ui-build-environment.mjs) to overwrite [environment.generated.ts](../src/environments/environment.generated.ts) (tracked stub; CI writes staff URLs and optional Auth0 fields before the build).
2. Builds with Nx configuration **`ci-staff`**, which replaces [environment.ts](../src/environments/environment.ts) with that generated file for the bundle.

Optional env vars for the same script (set in CI when you are ready):

| Variable | Purpose |
| --- | --- |
| `STAFF_AUTH0_ENABLED` | Set to `true` to enable Auth0 in the generated bundle |
| `STAFF_AUTH0_DOMAIN` | Auth0 tenant domain |
| `STAFF_AUTH0_CLIENT_ID` | SPA client ID |
| `STAFF_AUTH0_AUDIENCE` | API identifier |
| `STAFF_AUTH0_REDIRECT_URI` | Optional full OAuth callback URL (must match Auth0 Allowed Callback URLs) |
| `STAFF_AUTH0_LOGOUT_RETURN_TO` | Optional post-logout URL (must match Auth0 Allowed Logout URLs) |

Local staff bundle without editing committed `environment.ts`:

```bash
export STAFF_API_URL='https://your-staff-api.example.com'
# optional Auth0 for a local production-like bundle:
# export STAFF_AUTH0_ENABLED=true
# export STAFF_AUTH0_DOMAIN='...'
# export STAFF_AUTH0_CLIENT_ID='...'
# export STAFF_AUTH0_AUDIENCE='...'
# export STAFF_AUTH0_REDIRECT_URI='https://admin.example.com/auth/callback'
# export STAFF_AUTH0_LOGOUT_RETURN_TO='https://admin.example.com/auth/login'
node scripts/write-admin-ui-build-environment.mjs
npx nx build admin-ui --configuration=ci-staff
```

Running `ci-staff` without the script uses the committed defaults in `environment.generated.ts` (empty `apiBaseUrl`, Auth0 off).

## Verify new or rotated Auth0 settings

Use this whenever the tenant, SPA, API identifier, or URLs change.

1. **Copy parity** — values must match exactly between Auth0 and both the SPA env and `admin-ui-api` env. Mismatches cause `invalid_token`, `login_required`, or silent-auth failures.  
   - Confirm **audience** in the SPA equals **API Identifier** and `AUTH0_AUDIENCE`.  
   - Confirm **issuer** in JWTs matches middleware expectations (`https://{AUTH0_DOMAIN}/` unless you set `AUTH0_ISSUER`).

2. **URL allowlists** — **Application Login URI** in the Auth0 app must match your deployed `/auth/login` URL (see dashboard setup above). **Allowed Callback URLs** must list each full callback URL (default pattern `{origin}/auth/callback`, e.g. `http://localhost:4202/auth/callback`). **Allowed Logout URLs** must list each full **post-logout** URL (default `{origin}/auth/login`). **Allowed Web Origins** use origins only (no path). Include both `localhost` and `127.0.0.1` if you switch between them.

### Blank UI after refresh + HTTP `400` on `/authorize` (`prompt=none`, `response_mode=web_message`)

- **Wrong audience** — If the failing URL includes `audience=…/api/v2`, you pointed the SPA at the **Auth0 Management API**. Use your **custom API** Identifier from Auth0 → APIs (same string as `AUTH0_AUDIENCE` on `admin-ui-api`), e.g. `https://spectra.admin.api`. The SPA prints a **console error** when it detects an `/api/v2` audience.
- **Silent renewal** — Browsers often block third-party cookies, so iframe-based silent auth fails. The app uses **`useRefreshTokens: true`** and **`cacheLocation: 'localstorage'`**; in Auth0 enable **Refresh Token Rotation** on the staff SPA application, then sign in once.

3. **Runtime** — After login, browser **Network** tab: requests to `{apiBaseUrl}/v1/admin/*` should include `Authorization: Bearer …`.  
   - `401` + `invalid_token`: decode the JWT and check `iss` and `aud`.  
   - `503` + `auth_not_configured` on the API: missing `AUTH0_DOMAIN` / `AUTH0_AUDIENCE`.

4. **Manual probe** — `GET {apiBaseUrl}/v1/admin/stats` with a fresh Bearer access token from the browser should return `200` when auth is configured.

## Settings → Migrations (`/v1/admin/migrations`)

The migrations tab uses the same **Auth0 access token** as `GET /v1/admin/logs` and `GET /v1/admin/stats`. Endpoints:

- `GET /v1/admin/migrations` — journal + `spectra.__drizzle_migrations` inventory  
- `GET /v1/admin/migrations/sql?tag=…` — `{ path, sql, hash, hashDisplay, byteSize, lineCount, idempotent, idempotentBasis, schemaMigration }` (hash SHA-256 of file body; idempotency is heuristic unless overridden by `-- @spectra-migration: …` in the SQL file; see `.cursor/rules/sql-migrations-idempotent.mdc`)  
- `GET /v1/admin/migrations/rollback-guide?tag=…` — static guidance + optional SQL preview  
- `POST /v1/admin/migrations/run` — body `{ "scope": "pending" | "all" | "single", "tag"?: "…" }` (Drizzle `migrate()`; `single` only runs when that tag is the **next** pending migration). Honors `spectra.platform_settings` key `admin_migrations_use_shared_http_client` and `NODE_ENV` default (see Runner tab).  
- `GET /v1/admin/migrations/runner-config` — effective runner mode, whether a DB row overrides, and the environment default  
- `PUT /v1/admin/migrations/runner-config` — body `{ "useSharedHttpClient": boolean }` persists the override  
- `DELETE /v1/admin/migrations/runner-config` — removes the override (revert to `NODE_ENV` default)  
- `DELETE /v1/admin/migrations/record` — body `{ "tag": "…" }` removes one applied row (dangerous; see `packages/database/README.md`)

The API resolves `packages/database/drizzle` from the monorepo root (`NX_WORKSPACE_ROOT` or walking up to `nx.json`).

## Settings → General / sidebar visibility (`/v1/admin/nav-sidebar-visibility`)

Uses the same **Auth0 access token** as other `/v1/admin/*` routes. Persists in **`spectra.platform_settings`** under key **`admin_ui.sidebar_nav_hidden_menu_keys`** (JSON array of hidden template `menuKey` strings).

- `GET /v1/admin/nav-sidebar-visibility` — returns `{ "sidebarNavHiddenMenuKeys": string[] }`. If the row is missing or invalid, the API returns the default (all eight template sections hidden).
- `PUT /v1/admin/nav-sidebar-visibility` — body `{ "sidebarNavHiddenMenuKeys": string[] }`; only known keys are allowed; **empty array** means show all template sections.

## Local staff user row (`POST /v1/admin/me/sync`)

After Auth0 login, the SPA calls **`POST {apiBaseUrl}/v1/admin/me/sync`** once per browser session (see auth callback). The API upserts **`spectra.users`** using:

- **`sub`** from the access token → column **`auth_subject`** (unique when set).
- **Email**: first the custom claim **`https://spectra.inc/admin/email`**, then top-level **`email`** on the access token if present. If neither is present, **`admin-ui-api`** calls Auth0 **`/userinfo`** with the same Bearer access token (requires login scopes to include **`email`**; `@auth0/auth0-spa-js` defaults include `openid profile email`). Prefer a Post Login Action so the access token is self-contained and other callers do not depend on Userinfo.

**v1 scope:** no **`org_memberships`** row is created. Add org assignment, roles, or invite-only flows in a later change.

Responses include **`409`** when the email is already tied to a different Auth0 subject. OpenAPI: [`apps/services/admin-ui-api/open-api/openapi.yaml`](../../services/admin-ui-api/open-api/openapi.yaml).

## Access token email claim (Auth0 Action — recommended)

Custom API access tokens often omit **`email`**. Add an **Auth0 Action** (trigger **Login / Post Login** — use the flow that runs when your SPA requests this API’s audience) that sets a custom claim on the access token, for example:

```javascript
exports.onExecutePostLogin = async (event, api) => {
  const email = event.user.email;
  if (email) {
    api.accessToken.setCustomClaim('https://spectra.inc/admin/email', email);
  }
};
```

Deploy the Action and add it to the **Actions** flow for your login pipeline. The claim **`https://spectra.inc/admin/email`** must match the constant in [`apps/services/admin-ui-api/src/lib/staff-access-token-claims.ts`](../../services/admin-ui-api/src/lib/staff-access-token-claims.ts).

## Security: self-service sign-up and staff APIs

A valid access token for your **API audience** can call **`/v1/admin/*`** today. If **anyone** can register in Auth0, tighten access with one or more of: **invite-only** (disable public sign-ups), **Auth0 roles / Organizations**, **Post-Login Action** to deny unauthorized sign-ups, or **API-side** checks after `me/sync`. Document your chosen policy for production.

## Enterprise federation (later)

Use Auth0 **Enterprise** connections (OIDC / SAML / Azure AD, etc.) and enable them only for this staff SPA so company IdPs stay separate from sandbox end users.
