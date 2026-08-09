# Sandbox / API program — Phase 3 & 4 product decisions

Captured from product direction (2026). Use this to align engineering, docs, and admin workflows.

## Try it (primary win)

- **Primary win:** **In-browser** “Try it” — embedded API explorer and/or **proxy** pattern, not “Postman + curl only” as the long-term answer.
- **Implication:** Phase 4 prioritizes **embedded explorer** (e.g. iframe Redocly/Stoplight, or custom) over shipping only a static Postman collection. Curl/Postman remain useful **adjacent** artifacts, not the sole experience.

## Data environments

| Environment   | Data                                                                 |
|---------------|----------------------------------------------------------------------|
| **Sandbox**   | **Synthetic / subset** — not production business data.              |
| **Staging**   | **Real-shaped data**, **PII-cleaned** — closest to prod behavior.    |
| **Production**| **Real data** — integrators only after controls below.               |

- **Copy / UX:** Sandbox and docs must **never** imply that “Try it” hits live prod rows. Staging/prod differences and PII handling must be explicit in API docs, sandbox UI, and **Production Access** flows.

## Production access and approvals

- **Production API access** requires an **approval process**; approvals are **managed in admin-ui** (workflow TBD: request → review → grant scopes/keys/org linkage).
- **Request history** is primarily for **customer self-serve debugging** (integrator sees their own traffic), with retention/RBAC designed for that audience—not only internal support tooling.
- **Gap:** Design how self-serve request logs interact with **approval-gated** prod credentials (e.g. only show history for approved prod integrations, TTL, export limits).
- **Engineering (v1 baseline, 2026-06):** Control-plane migration `0008_par_notifications_webhooks.sql` adds PAR catalog families (`production_access_request_states`, `user_principal`, `webhook_request_states`), `users.principal_kind_id`, `production_access_requests` extensions (submitter, integration vs application XOR, messages, notifications + `sandbox_outbound_webhook_requests` + optional `notification_outbox`), and `platform_settings` keys under `production_access.*`. **aviate-api:** `POST/GET …/integrations/:integrationId/production-access-request(s)` on sandbox-portal router (session + questionnaire validation); staff fan-out + deferred `audit_logs` wiring. **admin-ui-api:** `GET /v1/admin/production-access-requests` (+ `/:id`) gated by `production_access.staff_console_enabled`. **No public token status URL** — integrators use authenticated portal only.

## API status / incidents (v1 bar)

- **Corporate marketing status alone is not sufficient** for the API program v1.
- **Gap:** Provide a **dedicated API / developer status** surface (dedicated URL or embedded status component), with clear scope (gateway, auth mint, sandbox portal) and link strategy from `spectra-ui`, `sandbox-ui`, and error pages.

## Phase 4 engineering priority (ordered)

1. **Embedded explorer** (in-browser Try it) — first vertical after Phases 1–3 foundations.
2. **Dedicated API status** — parallel or immediately after; v1 requirement.
3. **Per-integration “allowed operations”** (scope × OpenAPI) — supports explorer + trust.
4. **Self-serve request history** — with retention, PII, and **prod approval** gates.
5. **Admin-ui production access approvals** — prerequisite or co-ship with prod request history.

Deferred as secondary unless product re-prioritizes: **Postman public workspace** as primary (still useful as export).

## Phase 3 adjustments (given in-browser goal)

- **3.1 OAuth metadata:** Still valuable for generic clients and codegen; ensure **public base URL** and **issuer** alignment behind proxies. Link from explorer shell and docs.
- **3.2 Swagger OAuth2:** Default remains **no confidential client_secret in Swagger**; in-browser Try it moves toward **embedded explorer / proxy**, not Swagger’s built-in OAuth2 for M2M secrets. Document that distinction.

## Related plans

- [m2m-client-credentials-edge-auth.md](./m2m-client-credentials-edge-auth.md) — M2M contract, tiers, revocation.
- [sandbox-phase4-backlog.md](./sandbox-phase4-backlog.md) — Phase 4 engineering backlog (embedded explorer, API status, etc.).
- Customer sandbox executable plan (Cursor: `customer_api_sandbox_gaps_b38e589c.plan.md`) — phased delivery; keep in sync with this file when decisions change.
