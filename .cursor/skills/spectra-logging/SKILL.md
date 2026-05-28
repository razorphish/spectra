---
name: spectra-logging
description: >-
  Adds or reviews structured logging in Spectra Node services using @spectra/logger
  and @spectra/database transports. Use when implementing logging, debugging observability,
  editing admin-logging routes, application_logs, platform_settings logging_level,
  or replacing console.log in apps/services.
---

# Spectra structured logging

## Stack

| Piece | Package / location |
|-------|-------------------|
| Logger API | `@spectra/logger` — `createLogger`, `LogCallOptions`, `resolveLoggingRuntimeFromEnv` |
| DB sink | `@spectra/database` — `createApplicationLogTransport`, `fetchLoggingRuntimeFromPlatform` |
| Reference service | [admin-ui-api](apps/services/admin-ui-api) — `src/lib/service-logger.ts`, `request-logging.ts`, [admin-logging.ts](apps/services/admin-ui-api/src/routes/admin-logging.ts) |
| Library-only logger | `databasePackageLog` in `@spectra/database` — **stdout only**; never wire DB transport inside shared packages |

## When to log

| Situation | Level | Log? |
|-----------|-------|------|
| Process startup / config loaded | `info` | Yes |
| Staff mutation (settings, sync, migration run) | `info` | Yes — include actor `userId` |
| Successful read with meaningful filters (audit list) | `info` | Yes — counts/filters in `context`, not full rows |
| Validation / client error (400) | `warn` | Yes — no stack |
| Missing config (503 `database_not_configured`) | `warn` | Yes |
| Uncaught handler failure | `error` | Yes — `metadata.error` with `name`, `message`, `stack` |
| HTTP request completed | `info` / `warn` / `error` by status | Use `requestLoggingMiddleware` pattern |
| `/health`, `/ready`, `/` probes | `debug` only | Middleware — avoid `info` noise |
| Hot paths in shared packages | `debug` max | Prefer `databasePackageLog`; stdout-only |
| Secrets, tokens, passwords | — | **Never** log |

## When not to log

- Do not `console.log` in services (use `getServiceLog()`).
- Do not log full request bodies, JWTs, or PII beyond `sub` / email when required.
- Do not add DB transports inside `packages/*` libraries (app edge only).
- Do not throw from log transports; swallow internally (see `createApplicationLogTransport`).

## Service wiring (Node API)

1. **`src/lib/service-logger.ts`** — `getServiceLog()`, `initServiceLogging()`, `refreshServiceLoggingFromPlatform()`.
2. **`src/lib/request-logging.ts`** — Express middleware on `finish`.
3. **`main.ts`** — `app.use(requestLoggingMiddleware())`; `void initServiceLogging().then(() => app.listen(...))`.
4. **Routes** — `getServiceLog()` per handler; `logModule('file.ts', 'handlerName')` for `module`.

After changing `logging_level` / `logging_output` in DB, call `refreshServiceLoggingFromPlatform()` (see `putLoggingSetting` in admin-logging).

## Log call shape

```typescript
getServiceLog().info('Audit logs listed', {
  module: 'admin-logging.ts|listAuditLogs',
  action: 'query',
  context: { page, pageSize, total }, // request/transport facts
  metadata: {
    userId: req.auth?.sub,
    attrs: { optionalKey: 'value' },
  },
});
```

```typescript
getServiceLog().error('listAuditLogs failed', {
  module: 'admin-logging.ts|listAuditLogs',
  context: requestContext(req),
  metadata: {
    userId: req.auth?.sub,
    error: {
      name: e instanceof Error ? e.name : 'Error',
      message: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
    },
  },
});
```

## Env / platform

| Source | Keys |
|--------|------|
| Env | `LOG_LEVEL`, `LOGGING_OUTPUT` (`console` \| `database` \| `both`) |
| Platform | `logging_level`, `logging_output` in `spectra.platform_settings` |

Polyglot services (.NET / Python / Go): mirror the same levels and fields in JSON stdout; see [docs/api-polyglot.md](docs/api-polyglot.md).

## Checklist (new route or service)

- [ ] Uses `getServiceLog()` not `console.*`
- [ ] `module` is `file.ts|handler`
- [ ] Errors include `metadata.error`
- [ ] 4xx → `warn`, 5xx → `error`, happy path → `info` or `debug`
- [ ] Staff routes include `metadata.userId` from `req.auth?.sub`
- [ ] Settings changes trigger `refreshServiceLoggingFromPlatform()` when applicable

## More detail

See [reference.md](reference.md) for file map and audit vs application logs.
