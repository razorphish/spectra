import {
  logModule,
  serializeError,
  validateLogLevelInput,
  validateLoggingOutputInput,
} from './logging-helpers';

describe('logModule', () => {
  it('joins file and handler with pipe', () => {
    expect(logModule('admin-logging.ts', 'listAuditLogs')).toBe(
      'admin-logging.ts|listAuditLogs',
    );
  });
});

describe('serializeError', () => {
  it('serializes Error instances', () => {
    const err = new Error('boom');
    const out = serializeError(err);
    expect(out.name).toBe('Error');
    expect(out.message).toBe('boom');
    expect(out.stack).toBeDefined();
  });

  it('serializes non-Error values', () => {
    const out = serializeError('oops');
    expect(out.name).toBe('Error');
    expect(out.message).toBe('oops');
    expect(out.stack).toBeUndefined();
  });
});

describe('validateLogLevelInput', () => {
  it('accepts valid levels', () => {
    expect(validateLogLevelInput('INFO')).toEqual({ ok: true, value: 'info' });
    expect(validateLogLevelInput('critical')).toEqual({ ok: true, value: 'error' });
  });

  it('rejects invalid values', () => {
    const r = validateLogLevelInput(42);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe('invalid_value');
    }
  });
});

describe('validateLoggingOutputInput', () => {
  it('accepts valid outputs', () => {
    expect(validateLoggingOutputInput('database')).toEqual({
      ok: true,
      value: 'database',
    });
  });

  it('rejects invalid outputs', () => {
    const r = validateLoggingOutputInput('stdout');
    expect(r.ok).toBe(false);
  });
});
