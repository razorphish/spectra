import type { Request, Response } from 'express';
import { resolveSpectraDatabaseUrl } from '@spectra/database';

import {
  actorUserIdFromRequest,
  requestContext,
} from './logging-helpers';
import { getServiceLog } from './service-logger';

const DATABASE_NOT_CONFIGURED = {
  error: 'database_not_configured',
  message: 'DATABASE_URL / NEON_DATABASE_URL is not set.',
} as const;

export function errorMetadata(e: unknown): {
  name: string;
  message: string;
  stack?: string;
} {
  return {
    name: e instanceof Error ? e.name : 'Error',
    message: e instanceof Error ? e.message : String(e),
    stack: e instanceof Error ? e.stack : undefined,
  };
}

/** Returns false after sending 503 when the database URL is missing. */
export function ensureDatabaseConfigured(
  req: Request,
  res: Response,
  handler: string,
  logMessage: string,
): boolean {
  if (resolveSpectraDatabaseUrl()) {
    return true;
  }
  getServiceLog().warn(logMessage, {
    module: handler,
    context: requestContext(req),
    metadata: { userId: actorUserIdFromRequest(req) },
  });
  res.status(503).json(DATABASE_NOT_CONFIGURED);
  return false;
}

export function logHandlerError(
  req: Request,
  handler: string,
  e: unknown,
  logMessage: string,
): string {
  const message = e instanceof Error ? e.message : 'Unknown error';
  getServiceLog().error(logMessage, {
    module: handler,
    context: requestContext(req),
    metadata: {
      userId: actorUserIdFromRequest(req),
      error: errorMetadata(e),
    },
  });
  return message;
}

export function respondValidationError(
  req: Request,
  res: Response,
  handler: string,
  body: { error: string; message: string },
  contextExtra?: Record<string, unknown>,
): void {
  getServiceLog().warn(body.message, {
    module: handler,
    action: 'validate',
    context: { ...requestContext(req), ...contextExtra },
    metadata: { userId: actorUserIdFromRequest(req) },
  });
  res.status(400).json(body);
}

export function queryString(
  req: Request,
  name: string,
  trim = false,
): string | undefined {
  const raw = req.query[name];
  if (typeof raw !== 'string' || raw.length === 0) {
    return undefined;
  }
  const v = trim ? raw.trim() : raw;
  return v.length > 0 ? v : undefined;
}

/** Parses an ISO date query param; returns undefined when absent, null when invalid. */
export function parseIsoDateQuery(
  value: string | undefined,
): Date | undefined | null {
  if (value === undefined) {
    return undefined;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
