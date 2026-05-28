import type { Request, Response } from 'express';

import type { SpectraLogger } from '@spectra/logger';

import { createRequestLoggingMiddleware, defaultIsProbePath } from './request-logging';

function mockLogger(): SpectraLogger & {
  calls: Array<{ level: string; message: string }>;
} {
  const calls: Array<{ level: string; message: string }> = [];
  const log = {
    service: 'test',
    calls,
    setLoggingRuntime: jest.fn(),
    debug: (message: string) => calls.push({ level: 'debug', message }),
    info: (message: string) => calls.push({ level: 'info', message }),
    warn: (message: string) => calls.push({ level: 'warn', message }),
    error: (message: string) => calls.push({ level: 'error', message }),
  };
  return log as SpectraLogger & { calls: Array<{ level: string; message: string }> };
}

describe('defaultIsProbePath', () => {
  it('matches health, ready, and root', () => {
    expect(defaultIsProbePath('/health')).toBe(true);
    expect(defaultIsProbePath('/v1/admin/health')).toBe(true);
    expect(defaultIsProbePath('/')).toBe(true);
    expect(defaultIsProbePath('/v1/foo')).toBe(false);
  });
});

describe('createRequestLoggingMiddleware', () => {
  it('logs info on 200 for non-probe paths', () => {
    const log = mockLogger();
    const mw = createRequestLoggingMiddleware({ getLog: () => log });
    const listeners: Record<string, () => void> = {};
    const res = {
      statusCode: 200,
      on(event: string, fn: () => void) {
        listeners[event] = fn;
      },
    } as unknown as Response;
    const req = {
      method: 'GET',
      originalUrl: '/v1/admin/logs',
    } as Request;

    mw(req, res, () => undefined);
    listeners['finish']?.();

    expect(log.calls).toHaveLength(1);
    expect(log.calls[0]?.level).toBe('info');
    expect(log.calls[0]?.message).toContain('GET /v1/admin/logs 200');
  });

  it('logs debug on 200 for probe paths', () => {
    const log = mockLogger();
    const mw = createRequestLoggingMiddleware({ getLog: () => log });
    const listeners: Record<string, () => void> = {};
    const res = {
      statusCode: 200,
      on(event: string, fn: () => void) {
        listeners[event] = fn;
      },
    } as unknown as Response;
    const req = { method: 'GET', originalUrl: '/health' } as Request;

    mw(req, res, () => undefined);
    listeners['finish']?.();

    expect(log.calls[0]?.level).toBe('debug');
  });
});
