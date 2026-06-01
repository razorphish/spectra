# Phase 4 backlog — customer sandbox / API program

Priorities align with [`sandbox-phase3-phase4-product-decisions.md`](./sandbox-phase3-phase4-product-decisions.md).

## Ordered delivery

1. **Embedded API explorer (in-browser Try it)** — Primary UX; consider iframe (Redocly/Stoplight) or custom shell; address CORS via proxy where needed.
2. **Dedicated API / developer status** — v1 program requirement (not only corporate marketing status); component scope, URL, incident process.
3. **Per-integration “allowed operations”** — Read-only view from granted scopes × public OpenAPI; supports explorer gray-out and education.
4. **Self-serve request history** — Customer-visible recent calls; retention, PII minimization, RBAC; only for approved prod integrations where applicable.
5. **Admin-ui production access approvals** — Workflow for customers to use production APIs; gates prod credentials and history.

## Optional / parallel

- **Postman public workspace** or generated collection — helpful export, not the primary in-browser story.
- **Status embedded in** `spectra-ui` / `sandbox-ui` headers once URL exists.

## Dependencies

- Phases 1–3 stable (docs, portal context, OpenAPI merge + scope CI, OAuth metadata).
- Security + legal sign-off on explorer proxy and request log retention.
