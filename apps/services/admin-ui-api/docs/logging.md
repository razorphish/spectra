# admin-ui-api logging

Structured logs use [`@spectra/logger`](../../../../packages/logger), [`@spectra/logger-express`](../../../../packages/logger-express), and persist to `spectra.application_logs` when `logging_output` is `database` or `both` (from env or `platform_settings`).

## Local env

```bash
LOG_LEVEL=debug
LOGGING_OUTPUT=both
```

## Code entry points

- `src/lib/service-logger.ts` — thin wrapper around `createServiceLogging({ service: 'admin-ui-api' })`
- `src/lib/request-logging.ts` — `createRequestLoggingMiddleware({ getLog: getServiceLog })`
- `src/lib/route-helpers.ts` — `createRouteLoggingHelpers` + query parsers
- `src/routes/admin-logging.ts` — reference for route-level messages

Shared packages: [packages/logger-express/README.md](../../../../packages/logger-express/README.md).

Agent guidance: project skill [`.cursor/skills/spectra-logging`](../../../../.cursor/skills/spectra-logging/SKILL.md).
