import type { Request, Response } from 'express';
import { resolveSpectraDatabaseUrl } from '@spectra/database';
import { serializeError, type SpectraLogger } from '@spectra/logger';

const DATABASE_NOT_CONFIGURED = {
  error: 'database_not_configured',
  message: 'DATABASE_URL / NEON_DATABASE_URL is not set.',
} as const;

export function requestContext(req: Request): Record<string, unknown> {
  return {
    method: req.method,
    path: req.originalUrl.split('?')[0],
  };
}

export function defaultUserIdFromRequest(req: Request): string | undefined {
  return req.auth?.sub;
}

export interface RouteLoggingHelpersOptions {
  getLog: () => SpectraLogger;
  getUserId?: (req: Request) => string | undefined;
}

export interface RouteLoggingHelpers {
  ensureDatabaseConfigured(
    req: Request,
    res: Response,
    handler: string,
    logMessage: string,
  ): boolean;
  logHandlerError(
    req: Request,
    handler: string,
    e: unknown,
    logMessage: string,
  ): string;
  respondValidationError(
    req: Request,
    res: Response,
    handler: string,
    body: { error: string; message: string },
    contextExtra?: Record<string, unknown>,
  ): void;
}

export function createRouteLoggingHelpers(
  options: RouteLoggingHelpersOptions,
): RouteLoggingHelpers {
  const getLog = options.getLog;
  const getUserId = options.getUserId ?? defaultUserIdFromRequest;

  return {
    ensureDatabaseConfigured(req, res, handler, logMessage) {
      if (resolveSpectraDatabaseUrl()) {
        return true;
      }
      getLog().warn(logMessage, {
        module: handler,
        context: requestContext(req),
        metadata: { userId: getUserId(req) },
      });
      res.status(503).json(DATABASE_NOT_CONFIGURED);
      return false;
    },

    logHandlerError(req, handler, e, logMessage) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      getLog().error(logMessage, {
        module: handler,
        context: requestContext(req),
        metadata: {
          userId: getUserId(req),
          error: serializeError(e),
        },
      });
      return message;
    },

    respondValidationError(req, res, handler, body, contextExtra) {
      getLog().warn(body.message, {
        module: handler,
        action: 'validate',
        context: { ...requestContext(req), ...contextExtra },
        metadata: { userId: getUserId(req) },
      });
      res.status(400).json(body);
    },
  };
}
