# M2M client credentials — GA enablement checklist

Use before enabling **`M2M_MINT_ENABLED=true`** in production and rolling **`M2M_VERIFY_ENABLED_*`** per segment.

1. **Phase 1 prod gate** — [m2m-client-credentials-edge-auth.md §GA ordering](m2m-client-credentials-edge-auth.md#ga-ordering-non-negotiable): Integrations schema migrated; sandbox portal create/list/rotate/revoke verified in prod; issuance log rows created on mint; audit events present.
2. **Auth service** — `auth.aviate.com` (or env) DNS/TLS; **`M2M_ES256_PRIVATE_JWK`** in KMS/secret store; **`AUTH_ISSUER_OVERRIDE`** unset in prod; JWKS reachable from edge pods.
3. **Edge** — `SPECTRA_M2M_AUDIENCE` / `SPECTRA_M2M_ISSUER` / JWKS URL set; **`M2M_VERIFY_ENABLED_AVIATE_API`** (and other segments) staged; dual-issuer middleware + status cache loader wired; tier **(c)** routes reject M2M (automated test).
4. **OpenAPI** — Public `GET /openapi.json` excludes sandbox BFF and staff-only paths; `GET /integration/openapi.json` protected; admin-ui-api proxy + integration key documented for staff.
5. **Observability** — Metrics from plan §Observability minimums dashboarded; `auth_unavailable` playbook; token-endpoint error rates alerted.
6. **Abuse / lockout** — Phase 6 tests for rate limit + lockout table (see parent plan Phase 6).
7. **Docs** — Integrator curl for `client_credentials`; max exposure (≤15m) documented; incident runbook linked.

Post-check: flip **`M2M_MINT_ENABLED`** only after sign-off; monitor first integrator traffic.
