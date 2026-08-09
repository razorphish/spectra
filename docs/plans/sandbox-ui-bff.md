# Sandbox-UI BFF (token-handler pattern)

Status: **proposed** — spike landed in `apps/local-edge` behind `BFF_ENABLED`.
Owner: (you). Related: `m2m-client-credentials-edge-auth.md`.

## Problem

`sandbox-ui` is an Auth0 SPA that does Authorization Code + PKCE **in the browser**
and holds the Auth0 access + refresh tokens client-side. Any XSS on the origin can
exfiltrate them (the refresh token is long-lived → persistent account takeover). We
mitigated by moving the Auth0 cache to `memory` (`app.config.ts`), but that only
shrinks the window and degrades reload UX.

The correct fix is a **Backend-For-Frontend**: the browser holds only an `HttpOnly`
session cookie; a server-side component performs the OAuth dance, custodies the
tokens, and injects the Bearer when proxying API calls.

## Target architecture

```
Browser (HttpOnly cookie only)
   │  same-origin
   ▼
BFF  ── /bff/login, /bff/callback, /bff/me, /bff/logout
     ── /v1/*  (proxy: inject Bearer from session, auto-refresh)
   │                         │
   ▼                         ▼
Auth0 (code+PKCE,        aviate-api / admin-ui-api
 confidential client)    (unchanged — still verify Auth0 JWT via AUTH0_DOMAIN/AUDIENCE)
```

Services need **zero changes**: they already verify Auth0 access-token JWTs
(`packages/auth/require-auth0-access-token.ts`). The BFF simply obtains a token for
the same `AUTH0_AUDIENCE` and forwards it.

## Recommendations (decisions)

1. **Session store → stateless encrypted cookie (JWE via `jose`), not Redis.**
   No new infra; fits a stateless prod runtime (Lambda). Cost: no server-side
   revocation and a size ceiling (~4 KB) — refresh tokens fit. Add Redis/DynamoDB
   later *only if* you need instant revocation or the cookie gets too big.

2. **Scope → sandbox-ui pilot first, then reuse for admin-ui.**
   Build the BFF as a small reusable module so admin-ui is a config-only follow-up.
   Prove the pattern on the lower-risk surface first.

3. **Prod edge → deploy the BFF as a Lambda behind the existing AWS HTTP API, with
   CloudFront path behaviors putting the SPA, `/bff/*`, and `/v1/*` on ONE origin.**
   `local-edge` is dev-only; today's prod edge is a managed gateway with no session
   state. Same-origin is mandatory for the cookie. Stateless-cookie sessions (rec #1)
   make Lambda a clean fit. This is the main infra lift and should be validated early.

## Phases & effort

| Phase | Work | Effort |
|-------|------|--------|
| 0 (done) | Dev spike: `/bff/login,/callback,/me,/logout` + JWE session in `local-edge` behind `BFF_ENABLED` | — |
| 1 (done) | `/v1/*` Bearer injection from session + refresh-on-expiry (single-flight); cookie stripped upstream; client Authorization ignored in BFF mode | — |
| 2 (done) | CSRF: SameSite=Lax + same-origin check + double-submit `bff_csrf`/`X-CSRF-Token` on unsafe methods (`/v1/*` + `/bff/logout`) | — |
| 3 (done, flag-gated) | Angular BFF mode behind `environment.bffAuth`: `BffAuthService`, CSRF+credentials interceptor, unified `authGuard`, shell/landing/account branches. Auth0 stays default (flag off). Logout returns `{logoutUrl}` JSON | — |
| 4 (scaffold) | `terraform/modules/bff_lambda` scaffold; **blocked** on prereqs below | M–L (infra) |
| 5 | Repeat config for admin-ui | S |

Total: **~1–1.5 weeks** for the sandbox-ui pilot incl. infra.

## New CSRF surface

Moving from `Authorization: Bearer` (immune) to cookies **reintroduces CSRF**. Implemented
in phase 2: `SameSite=Lax` cookies + a same-origin (Origin/Referer) check **and** a
double-submit token on every unsafe method (`/v1/*` and `/bff/logout`).

**Phase-3 SPA requirement:** the `bff_csrf` cookie is JS-readable; the Angular HTTP layer
must read it and send its value as the `X-CSRF-Token` header on POST/PUT/PATCH/DELETE, with
`withCredentials: true`. Safe methods (GET/HEAD) need nothing.

## Auth0 config required

- A **new confidential** Auth0 application (Regular Web App) with a client secret —
  the existing SPA client stays only until Angular is cut over, then is retired.
- Allowed callback: `{origin}/bff/callback`; allowed logout: `{origin}`.
- Grant: Authorization Code + Refresh Token (rotating). Request `offline_access`.

## Env (BFF)

```
BFF_ENABLED=true
BFF_PUBLIC_ORIGIN=http://127.0.0.1:3000      # where the browser reaches the edge
BFF_SESSION_SECRET=<32+ random bytes>         # derives the A256GCM cookie key
AUTH0_DOMAIN=dev-xxx.us.auth0.com
AUTH0_AUDIENCE=https://api.spectra.com        # must match services' AUTH0_AUDIENCE
AUTH0_BFF_CLIENT_ID=<confidential client id>
AUTH0_BFF_CLIENT_SECRET=<confidential client secret>
```

## Phase 4 prerequisites (why it's blocked)

The current Terraform is at "Phase A": APIs use MOCK integrations and there is **no CloudFront
distribution or SPA-hosting module**. Before `bff_lambda` can be applied end-to-end:

1. **CloudFront same-origin distribution** — behaviors routing `/bff/*` and `/v1/*` to the HTTP
   API and `/*` to the SPA S3 origin. Mandatory for the cookie. Does not exist yet.
2. **Real API integrations** — `modules/api_http` must move from MOCK to AWS_PROXY (the BFF
   forwards a Bearer to the services).
3. **Lambda package** — build the BFF (`apps/local-edge` handlers + a `serverless-http` adapter
   exporting `main.handler`) into the deploy-bucket zip.
4. **Secrets** — Secrets Manager entries for the Auth0 confidential client secret + BFF session
   secret; the Lambda reads them at cold start.

The scaffold module (`terraform/modules/bff_lambda`) creates the Lambda, IAM, AWS_PROXY
integration, `ANY /bff/{proxy+}` + `ANY /v1/{proxy+}` routes, and invoke permission — `terraform
fmt`-clean, not wired into any environment.

## Gotchas

- **Refresh concurrency**: parallel API calls must not each refresh — single-flight lock.
- **Cookie size**: if a stateless cookie exceeds ~4 KB, move to server-side sessions.
- **Same-origin**: SPA + `/bff` + `/v1` must share an origin, or the cookie won't flow.
- **Streaming/websocket** endpoints (if any) need the same Bearer injection.
- **Logout** clears the local session cookie *and* redirects to Auth0 `/v2/logout`.
