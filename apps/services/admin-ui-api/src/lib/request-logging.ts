import type { RequestHandler } from 'express';

import { getServiceLog } from './service-logger';
import { actorUserIdFromRequest } from './logging-helpers';

/** High-frequency probes — log at `debug` only when enabled. */
function isProbePath(path: string): boolean {
  return (
    path.endsWith('/health') ||
    path.endsWith('/ready') ||
    path === '/'
  );
}

/**
 * Logs one line per HTTP response (`finish`). Skips noisy health/ready at info;
 * still emits `debug` for probes when min level allows.
 */
export function requestLoggingMiddleware(): RequestHandler {
  return (req, res, next) => {
    const start = Date.now();
    const path = req.originalUrl.split('?')[0] ?? req.originalUrl;
    const probe = isProbePath(path);

    res.on('finish', () => {
      const durationMs = Date.now() - start;
      const status = res.statusCode;
      const message = `${req.method} ${path} ${status} ${durationMs}ms`;
      const base = {
        module: 'http|request',
        action: 'finish',
        context: {
          method: req.method,
          path,
          status,
          durationMs,
        },
        metadata: {
          userId: actorUserIdFromRequest(req),
        },
      };

      const log = getServiceLog();
      if (status >= 500) {
        log.error(message, base);
      } else if (status >= 400) {
        log.warn(message, base);
      } else if (probe) {
        log.debug(message, base);
      } else {
        log.info(message, base);
      }
    });

    next();
  };
}
