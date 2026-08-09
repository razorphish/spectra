# ADR: Swagger UI OAuth2 preset vs confidential M2M (decision)

## Status

Accepted — **do not** enable Swagger UI’s built-in OAuth2 client flow for **confidential** Spectra integrations (`client_id` + `client_secret` in the browser).

## Context

- Spectra **Integrations** use `client_credentials` with a **hashed client secret**.
- Swagger UI OAuth2 presets often encourage entering **client_secret** in the browser for the “Authorize” dialog.
- That pattern increases XSS / exfiltration risk and is hard to reconcile with confidential clients and support expectations.

## Decision

1. **Default:** Developers mint tokens via **sandbox-ui** (“Get access token”) for local testing, or via **server-side** `POST /oauth/token` (curl, Postman, backend) in all serious environments.
2. **Discovery:** `GET /.well-known/oauth-authorization-server` on **auth-api** is supported for generic OAuth clients and documentation; it does **not** imply Swagger will collect secrets.
3. **In-browser “Try it” (Phase 4):** Prefer an **embedded explorer** and/or **Try-it proxy** that does not require pasting integration secrets into Swagger’s OAuth2 dialog. See [`sandbox-phase3-phase4-product-decisions.md`](../plans/sandbox-phase3-phase4-product-decisions.md).

## Consequences

- No `initOAuth` wiring for M2M confidential clients on `/docs` unless a **separate security review** approves a dedicated **public** or **dev-only** client with tight limits.
- Documentation and support scripts emphasize **Bearer paste** or **server-side mint**.

## Related

- [m2m-client-credentials-edge-auth.md](../plans/m2m-client-credentials-edge-auth.md)
