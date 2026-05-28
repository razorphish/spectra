import type { AdminUiLoggingSettingKey } from '@spectra/database';
import { parseLogLevel, parseLoggingOutput } from '@spectra/logger';

type ValidationError = {
  ok: false;
  error: string;
  message: string;
};

type ValidationSuccess = {
  ok: true;
  value: unknown;
};

export function validateLoggingSettingValue(
  key: AdminUiLoggingSettingKey,
  value: unknown,
): ValidationSuccess | ValidationError {
  if (key === 'logging_level') {
    if (typeof value !== 'string') {
      return {
        ok: false,
        error: 'invalid_value',
        message: 'logging_level must be a string.',
      };
    }
    const trimmed = value.trim();
    if (!/^(debug|info|warn|error|critical)$/i.test(trimmed)) {
      return {
        ok: false,
        error: 'invalid_value',
        message:
          'logging_level must be one of: DEBUG, INFO, WARN, ERROR, CRITICAL.',
      };
    }
    return { ok: true, value: parseLogLevel(trimmed) };
  }

  if (typeof value !== 'string') {
    return {
      ok: false,
      error: 'invalid_value',
      message: 'logging_output must be a string.',
    };
  }
  const norm = value.trim().toLowerCase();
  if (norm !== 'both' && norm !== 'console' && norm !== 'database') {
    return {
      ok: false,
      error: 'invalid_value',
      message: 'logging_output must be one of: both, console, database.',
    };
  }
  return { ok: true, value: parseLoggingOutput(norm) };
}
