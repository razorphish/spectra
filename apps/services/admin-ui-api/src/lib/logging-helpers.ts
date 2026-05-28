import type { Request } from 'express';

/** `module` field: `relativeFile|handlerName` (see `.cursor/skills/spectra-logging`). */
export function logModule(file: string, handler: string): string {
  return `${file}|${handler}`;
}

export function actorUserIdFromRequest(req: Request): string | undefined {
  return req.auth?.sub;
}

export function requestContext(req: Request): Record<string, unknown> {
  return {
    method: req.method,
    path: req.originalUrl.split('?')[0],
  };
}
