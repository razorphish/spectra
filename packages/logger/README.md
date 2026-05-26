# @spectra/logger

Structured logging for Spectra Node services: **JSON lines to stdout** by default, with optional **transports** (for example inserting into `spectra.application_logs` via `@spectra/database`).

## Usage

```typescript
import { createLogger } from '@spectra/logger';

const log = createLogger({ service: 'aviate-api', minLevel: 'info' });

log.info('Upload accepted', {
  module: 'aviate-api|src/routes/uploads.ts|postPresign',
  action: 'upload.presign.create',
  context: { httpMethod: 'POST', route: '/v1/uploads/presign', traceId: '…' },
  metadata: { attrs: { orgId: '…', bytesExpected: 1024 } },
});
```

## Field mapping (DB `application_logs`)

| Logger / stdout field | DB column | Notes |
|----------------------|-----------|--------|
| `level`, `message`, `timestamp`, `service` | `level`, `message`, (stdout only for `timestamp`/`service`) | `created_at` is set by the database on insert. |
| `context` | `context` jsonb | **Request / transport / correlation only** (method, route, trace ids, bounded client hints). |
| `module` | `module` | Code location: `{origin}\|{path}\|{function}`. |
| `action` | `action` | Stable operation tag (`resource.verb` style). |
| `metadata` | `metadata` jsonb | Envelope: `schemaVersion` (default `1`), optional `sessionId`, `userId`, `attrs`, `error`. |

**Do not** put domain or code-location data in `context`—use `metadata.attrs` or the `module` / `action` columns. The table is **append-only** (no `updated_*`); use a new row + shared trace id for follow-up narratives.

## Metadata envelope

- `schemaVersion`: number, default `1`.
- `sessionId` / `userId`: optional opaque strings (no FK on `userId`).
- `attrs`: arbitrary JSON-safe key/value for business context.
- `error`: optional `{ name, message, stack? }` for failures.

## Environment (fallback)

When `spectra.platform_settings` is unavailable (or before the DB client exists), use:

- `LOG_LEVEL` (optional): `debug` | `info` | `warn` | `error` — use `resolveLoggingRuntimeFromEnv()` or `parseLogLevel()` when constructing the logger.
- `LOGGING_OUTPUT` (optional): `both` | `console` | `database` — same tokens as the `logging_output` platform setting.

`@spectra/database` exports `fetchLoggingRuntimeFromPlatform()` to read `logging_level` and `logging_output` (with legacy `log_to_console` mapping) and merge with the env defaults. App services should call `logger.setLoggingRuntime(...)` on their own loggers after loading from the DB. The package’s `databasePackageLog` is different: `getDb()` calls `refreshDatabasePackageLoggingFromPlatform()`, which applies **only** `logging_level` from platform/env and keeps output **stdout-only** so library diagnostics never follow `logging_output` into DB transports.

## Output modes

- `console`: JSON lines on **stdout** only (not the browser `console.log` API).
- `database`: only `transports` (for example `createApplicationLogTransport`).
- `both`: stdout and transports.

If `output` is `database` or `both` but no transports are configured, the implementation falls back to stdout so lines are not dropped.

## Platform settings (control plane)

Admin API: `GET/PUT /v1/admin/logging/settings` — keys `logging_level` (e.g. `INFO`, `CRITICAL`) and `logging_output` (`both` | `console` | `database`). Services should apply these at runtime via `setLoggingRuntime` on their `SpectraLogger` instance.

## Tests

`nx test logger`
