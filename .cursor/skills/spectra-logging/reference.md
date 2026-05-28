# Spectra logging reference

## admin-ui-api file map

| File | Role |
|------|------|
| `src/lib/service-logger.ts` | Logger singleton, platform refresh, startup init |
| `src/lib/request-logging.ts` | HTTP access-style logs on response `finish` |
| `src/lib/logging-helpers.ts` | `logModule`, `requestContext`, `actorUserIdFromRequest` |
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

## Copying to another Node service

1. Copy `service-logger.ts` and `request-logging.ts`; change `service: 'your-api'`.
2. Copy `logging-helpers.ts` or import shared helpers if extracted to a package later.
3. Call `initServiceLogging()` before listen.
4. Add route logs following `admin-logging.ts` patterns.
