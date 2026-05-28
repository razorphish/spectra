import type { LogLevel, LoggingOutput } from './logger';
import { parseLogLevel, parseLoggingOutput } from './logger';

/** Serialized error for `metadata.error` on log calls. */
export type SerializedError = {
  name: string;
  message: string;
  stack?: string;
};

export type ValidationError = {
  ok: false;
  error: string;
  message: string;
};

export type ValidationSuccess<T> = {
  ok: true;
  value: T;
};

export type ValidationResult<T> = ValidationSuccess<T> | ValidationError;

/** `module` field: `relativeFile|handlerName`. */
export function logModule(file: string, handler: string): string {
  return `${file}|${handler}`;
}

/** Maps thrown values to the metadata `error` envelope shape. */
export function serializeError(e: unknown): SerializedError {
  return {
    name: e instanceof Error ? e.name : 'Error',
    message: e instanceof Error ? e.message : String(e),
    stack: e instanceof Error ? e.stack : undefined,
  };
}

/** Validates admin/API input for `logging_level` platform setting. */
export function validateLogLevelInput(value: unknown): ValidationResult<LogLevel> {
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
      message: 'logging_level must be one of: DEBUG, INFO, WARN, ERROR, CRITICAL.',
    };
  }
  return { ok: true, value: parseLogLevel(trimmed) };
}

/** Validates admin/API input for `logging_output` platform setting. */
export function validateLoggingOutputInput(
  value: unknown,
): ValidationResult<LoggingOutput> {
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
