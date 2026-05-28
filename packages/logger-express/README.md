# @spectra/logger-express

Express + database wiring for Spectra structured logging (`@spectra/logger`).

Use at the **app edge** (`apps/services/*`), not inside shared libraries.

## Quick start

```typescript
import {
  createServiceLogging,
  createRequestLoggingMiddleware,
  createRouteLoggingHelpers,
} from '@spectra/logger-express';
import { logModule } from '@spectra/logger';

const { getServiceLog, initServiceLogging, refreshServiceLoggingFromPlatform } =
  createServiceLogging({ service: 'my-api' });

const { ensureDatabaseConfigured, logHandlerError, respondValidationError } =
  createRouteLoggingHelpers({ getLog: getServiceLog });

app.use(createRequestLoggingMiddleware({ getLog: getServiceLog }));

void initServiceLogging().then(() => app.listen(port));

// In a route:
const handler = logModule('routes/foo.ts', 'getFoo');
if (!ensureDatabaseConfigured(req, res, handler, 'getFoo: database not configured')) {
  return;
}
```

## Exports

| Export | Role |
|--------|------|
| `createServiceLogging` | Singleton logger, platform refresh, startup init |
| `createRequestLoggingMiddleware` | Per-request access logs on `finish` |
| `createRouteLoggingHelpers` | `ensureDatabaseConfigured`, `logHandlerError`, `respondValidationError` |
| `requestContext` | `{ method, path }` for log `context` |

## Peer dependency

`express` ^4.21. Optional `req.auth` (from `@spectra/auth`) is read when present for `userId` in logs.

## Tests

`nx test logger-express`
