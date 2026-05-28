import type { Request, Response } from 'express';

import type { SpectraLogger } from '@spectra/logger';

import { createRouteLoggingHelpers } from './route-logging';

function mockLogger(): SpectraLogger & { last?: { level: string; message: string } } {
  const log = {
    service: 'test',
    setLoggingRuntime: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn(message: string) {
      (log as { last?: { level: string; message: string } }).last = {
        level: 'warn',
        message,
      };
    },
    error(message: string, opts?: { metadata?: { error?: { message: string } } }) {
      (log as { last?: { level: string; message: string } }).last = {
        level: 'error',
        message: opts?.metadata?.error?.message ?? message,
      };
    },
  };
  return log as SpectraLogger & { last?: { level: string; message: string } };
}

describe('createRouteLoggingHelpers', () => {
  it('logHandlerError returns error message', () => {
    const log = mockLogger();
    const { logHandlerError } = createRouteLoggingHelpers({ getLog: () => log });
    const req = { method: 'GET', originalUrl: '/x', auth: { sub: 'u1' } } as Request;
    const msg = logHandlerError(req, 'h', new Error('fail'), 'failed');
    expect(msg).toBe('fail');
    expect(log.last?.level).toBe('error');
  });

  it('respondValidationError sends 400', () => {
    const log = mockLogger();
    const { respondValidationError } = createRouteLoggingHelpers({ getLog: () => log });
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;
    const req = { method: 'PUT', originalUrl: '/y' } as Request;

    respondValidationError(
      req,
      res,
      'h',
      { error: 'invalid_value', message: 'bad' },
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ error: 'invalid_value', message: 'bad' });
  });
});
