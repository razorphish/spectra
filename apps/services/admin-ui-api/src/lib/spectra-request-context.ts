import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export type SpectraRequestContext = {
  requestId: string;
  correlationId?: string;
};

const store = new AsyncLocalStorage<SpectraRequestContext>();

export function getSpectraRequestContext(): SpectraRequestContext | undefined {
  return store.getStore();
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readUuidHeader(value: string | undefined): string | null {
  if (!value || typeof value !== 'string') return null;
  const t = value.trim().slice(0, 128);
  return UUID_RE.test(t) ? t : null;
}

export function createSpectraRequestContextMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestId = readUuidHeader(req.get('x-request-id')) ?? randomUUID();
    const correlationId = readUuidHeader(req.get('x-correlation-id')) ?? undefined;
    const ctx: SpectraRequestContext = { requestId, correlationId };
    store.run(ctx, () => {
      res.setHeader('X-Request-Id', requestId);
      next();
    });
  };
}
