# Runbook: Production access (PAR) — staff review (v1 stub)

This runbook will expand as staff workflows ship. **v1 today:**

- **List / detail:** `GET /v1/admin/production-access-requests` and `GET …/:id` (requires Auth0 staff token; blocked when `production_access.staff_console_enabled` is false in `platform_settings`).
- **Integrator submit:** Sandbox portal `POST /v1/platform/sandbox/integrations/:integrationId/production-access-requests` with `documents.questionnaire` v1 payload.
- **Never** put `client_secret`, JWT material, or `staff_internal_notes` prose in customer-visible fields or `audit_logs.payload`.

See the Cursor plan **Production access approvals** for full lifecycle, webhooks, and notification durability.
