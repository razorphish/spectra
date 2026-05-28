# Spectra logging reference

## Packages

| Package | Role |
|---------|------|
| `@spectra/logger` | `createLogger`, `logModule`, `serializeError`, validators |
| `@spectra/logger-express` | `createServiceLogging`, `createRequestLoggingMiddleware`, `createRouteLoggingHelpers` |
| `@spectra/database` | `createApplicationLogTransport`, `fetchLoggingRuntimeFromPlatform` |

## admin-ui-api file map

| File | Role |
|------|------|
| `src/lib/service-logger.ts` | `createServiceLogging({ service: 'admin-ui-api' })` |
| `src/lib/request-logging.ts` | Bound request middleware |
| `src/lib/route-helpers.ts` | Bound route logging helpers + query parsers |
| `src/routes/admin-logging.ts` | Canonical route-level logging examples |
| `src/main.ts` | Wires middleware + `initServiceLogging()` |

## audit_logs vs application_logs

| Table | Purpose | Written by |
|-------|---------|------------|
| `spectra.audit_logs` | Staff **actions** on resources (who did what) | App code on domain mutations (future) |
| `spectra.application_logs` | **Runtime** structured logs | `@spectra/logger` via `createApplicationLogTransport` |

`GET /v1/admin/logs` reads **audit_logs** for the admin UI grid.  
`@spectra/logger` writes **application_logs** when `logging_output` is `database` or `both`.

## stdout record shape

Each line is JSON:

```json
{
  "timestamp": "2026-05-27T12:00:00.000Z",
  "service": "admin-ui-api",
  "level": "info",
  "message": "Audit logs listed",
  "module": "admin-logging.ts|listAuditLogs",
  "action": "query",
  "context": { "path": "/v1/admin/logs", "page": 1 },
  "metadata": { "schemaVersion": 1, "userId": "auth0|…" }
}
```

## New Node service

1. Add `src/lib/service-logger.ts`:

   ```typescript
   import { createServiceLogging } from '@spectra/logger-express';
   export const { getServiceLog, initServiceLogging, refreshServiceLoggingFromPlatform } =
     createServiceLogging({ service: 'your-api' });
   ```

2. Wire `createRequestLoggingMiddleware({ getLog: getServiceLog })` in `main.ts`; call `initServiceLogging()` before listen.
3. Use `createRouteLoggingHelpers({ getLog: getServiceLog })` for 503/400/500 helpers.
4. Import `logModule`, `serializeError` from `@spectra/logger` in routes.

See [packages/logger-express/README.md](../../../packages/logger-express/README.md).
