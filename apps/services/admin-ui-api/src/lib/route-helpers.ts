import type { Request } from 'express';
import { createRouteLoggingHelpers } from '@spectra/logger-express';

import { getServiceLog } from './service-logger';

const routeLogging = createRouteLoggingHelpers({ getLog: getServiceLog });

export const {
  ensureDatabaseConfigured,
  logHandlerError,
  respondValidationError,
} = routeLogging;

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
