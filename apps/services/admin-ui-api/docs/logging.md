# admin-ui-api logging

Structured logs use [`@spectra/logger`](../../../../packages/logger) and persist to `spectra.application_logs` when `logging_output` is `database` or `both` (from env or `platform_settings`).

## Local env

```bash
LOG_LEVEL=debug
LOGGING_OUTPUT=both
```

## Code entry points

- `src/lib/service-logger.ts` — `getServiceLog()`, startup, platform refresh
- `src/lib/request-logging.ts` — per-request access logs
- `src/lib/route-helpers.ts` — `ensureDatabaseConfigured`, `logHandlerError`, `respondValidationError`
- `src/routes/admin-logging.ts` — reference for route-level messages

Agent guidance: project skill [`.cursor/skills/spectra-logging`](../../../../.cursor/skills/spectra-logging/SKILL.md).
