import type { Request, RequestHandler } from 'express';

import type { SpectraLogger } from '@spectra/logger';

import { defaultUserIdFromRequest } from './route-logging';

/** High-frequency probes — log at `debug` only when enabled. */
export function defaultIsProbePath(path: string): boolean {
  return path.endsWith('/health') || path.endsWith('/ready') || path === '/';
}

export interface RequestLoggingMiddlewareOptions {
  getLog: () => SpectraLogger;
  getUserId?: (req: Request) => string | undefined;
  isProbePath?: (path: string) => boolean;
}

/**
 * Logs one line per HTTP response (`finish`). Skips noisy health/ready at info;
 * still emits `debug` for probes when min level allows.
 */
export function createRequestLoggingMiddleware(
  options: RequestLoggingMiddlewareOptions,
): RequestHandler {
  const getLog = options.getLog;
  const getUserId = options.getUserId ?? defaultUserIdFromRequest;
  const isProbePath = options.isProbePath ?? defaultIsProbePath;

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
          userId: getUserId(req),
        },
      };

      const log = getLog();
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
