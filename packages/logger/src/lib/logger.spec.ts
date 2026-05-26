import { createLogger } from './logger';

describe('createLogger', () => {
  let writeSpy: jest.SpyInstance;

  beforeEach(() => {
    writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    writeSpy.mockRestore();
  });

  it('writes JSON line with required fields', () => {
    const log = createLogger({ service: 'test-svc', minLevel: 'debug' });
    log.info('hello', { module: 'test|a.ts|fn' });
    expect(writeSpy).toHaveBeenCalledTimes(1);
    const line = String(writeSpy.mock.calls[0][0]);
    const obj = JSON.parse(line.trim()) as Record<string, unknown>;
    expect(obj['service']).toBe('test-svc');
    expect(obj['level']).toBe('info');
    expect(obj['message']).toBe('hello');
    expect(obj['module']).toBe('test|a.ts|fn');
    expect(typeof obj['timestamp']).toBe('string');
  });

  it('respects minLevel', () => {
    const log = createLogger({ service: 'x', minLevel: 'warn' });
    log.info('nope');
    log.warn('yep');
    expect(writeSpy).toHaveBeenCalledTimes(1);
    const obj = JSON.parse(String(writeSpy.mock.calls[0][0]).trim()) as Record<string, unknown>;
    expect(obj['message']).toBe('yep');
  });

  it('includes metadata envelope when provided', () => {
    const log = createLogger({ service: 'x', minLevel: 'debug' });
    log.error('fail', {
      metadata: { schemaVersion: 1, userId: 'u-1', attrs: { k: 1 } },
    });
    const obj = JSON.parse(String(writeSpy.mock.calls[0][0]).trim()) as {
      metadata?: { schemaVersion: number; userId?: string; attrs?: Record<string, unknown> };
    };
    expect(obj.metadata?.userId).toBe('u-1');
    expect(obj.metadata?.attrs).toEqual({ k: 1 });
  });
});
