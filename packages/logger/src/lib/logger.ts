/** Severity for log lines and `application_logs.level`. */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Where structured logs go: JSON lines on stdout (`console`), optional `transports`
 * (e.g. `application_logs`), or both. Env / platform settings use the same string tokens.
 */
export type LoggingOutput = 'console' | 'database' | 'both';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

/** Default actor shape aligned with `spectra.*.created_by` jsonb. */
export interface SpectraActorJson {
  name: string;
  userId: string | null;
}

export const DEFAULT_SYSTEM_ACTOR: SpectraActorJson = {
  name: 'SYSTEM',
  userId: null,
};

/**
 * Versioned envelope stored in `application_logs.metadata` and mirrored on stdout records.
 * Reserved top-level keys: `schemaVersion`, `sessionId`, `userId`, `attrs`, `error`.
 */
export interface ApplicationLogMetadataEnvelope {
  schemaVersion: number;
  sessionId?: string;
  userId?: string;
  attrs?: Record<string, unknown>;
  error?: { name: string; message: string; stack?: string };
}

export interface LogCallOptions {
  module?: string;
  action?: string;
  /** Request / transport / correlation only (maps to `application_logs.context`). */
  context?: Record<string, unknown> | null;
  /** Merged into envelope; `schemaVersion` defaulted to 1 if omitted. */
  metadata?: Partial<ApplicationLogMetadataEnvelope> | null;
}

/** One structured log event (stdout and optional DB transport). */
export interface SpectraLogRecord {
  timestamp: string;
  service: string;
  level: LogLevel;
  message: string;
  module?: string;
  action?: string;
  context?: Record<string, unknown> | null;
  metadata?: ApplicationLogMetadataEnvelope | null;
}

export interface LogTransport {
  /** Emit a fully-built record; implementors must not throw to callers (catch internally for DB). */
  emit(record: SpectraLogRecord): void | Promise<void>;
}

export interface CreateLoggerOptions {
  service: string;
  /** Minimum level to emit (default `info`). */
  minLevel?: LogLevel;
  /** Extra sinks after default stdout JSON. */
  transports?: LogTransport[];
  /**
   * Where to emit. If `database` or `both` but `transports` is empty, falls back to
   * `console` so messages are not silently dropped.
   */
  output?: LoggingOutput;
}

export interface SpectraLogger {
  readonly service: string;
  /**
   * Apply runtime config (e.g. from `spectra.platform_settings`); merges with current values.
   */
  setLoggingRuntime(config: Partial<{ minLevel: LogLevel; output: LoggingOutput }>): void;
  debug(message: string, options?: LogCallOptions): void;
  info(message: string, options?: LogCallOptions): void;
  warn(message: string, options?: LogCallOptions): void;
  error(message: string, options?: LogCallOptions): void;
}

/** Parse admin / env log level strings into {@link LogLevel} (`critical` → `error`). */
export function parseLogLevel(raw: string | undefined, fallback: LogLevel = 'info'): LogLevel {
  const v = raw?.trim().toLowerCase();
  if (v === 'debug' || v === 'info' || v === 'warn' || v === 'error') return v;
  if (v === 'critical') return 'error';
  return fallback;
}

export function parseLoggingOutput(
  raw: string | undefined,
  fallback: LoggingOutput = 'both',
): LoggingOutput {
  const v = raw?.trim().toLowerCase();
  if (v === 'console' || v === 'database' || v === 'both') return v;
  return fallback;
}

/** Defaults from `LOG_LEVEL` and `LOGGING_OUTPUT` when platform settings are unavailable. */
export function resolveLoggingRuntimeFromEnv(): {
  minLevel: LogLevel;
  output: LoggingOutput;
} {
  return {
    minLevel: parseLogLevel(process.env['LOG_LEVEL']),
    output: parseLoggingOutput(process.env['LOGGING_OUTPUT']),
  };
}

function effectiveOutput(output: LoggingOutput, transportCount: number): LoggingOutput {
  if ((output === 'database' || output === 'both') && transportCount === 0) {
    return 'console';
  }
  return output;
}

function normalizeMetadata(
  partial: Partial<ApplicationLogMetadataEnvelope> | null | undefined,
): ApplicationLogMetadataEnvelope | null {
  if (partial === undefined || partial === null) {
    return null;
  }
  const schemaVersion = partial.schemaVersion ?? 1;
  const out: ApplicationLogMetadataEnvelope = { schemaVersion };
  if (partial.sessionId !== undefined) out.sessionId = partial.sessionId;
  if (partial.userId !== undefined) out.userId = partial.userId;
  if (partial.attrs !== undefined) out.attrs = partial.attrs;
  if (partial.error !== undefined) out.error = partial.error;
  const hasMore =
    partial.sessionId !== undefined ||
    partial.userId !== undefined ||
    partial.attrs !== undefined ||
    partial.error !== undefined;
  if (!hasMore && schemaVersion === 1) {
    return null;
  }
  return out;
}

function safeJsonLine(obj: unknown): string {
  try {
    return JSON.stringify(obj) + '\n';
  } catch {
    return (
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        service: 'logger',
        message: 'Log serialization failed',
        metadata: { schemaVersion: 1, error: { name: 'SerializeError', message: 'circular or non-JSON value' } },
      }) + '\n'
    );
  }
}

function writeStdout(record: SpectraLogRecord): void {
  process.stdout.write(safeJsonLine(record));
}

function shouldEmit(minLevel: LogLevel, level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[minLevel];
}

function buildRecord(
  service: string,
  level: LogLevel,
  message: string,
  options?: LogCallOptions,
): SpectraLogRecord {
  return {
    timestamp: new Date().toISOString(),
    service,
    level,
    message,
    module: options?.module,
    action: options?.action,
    context: options?.context ?? undefined,
    metadata: normalizeMetadata(options?.metadata ?? undefined),
  };
}

/**
 * Creates a logger that writes JSON lines to stdout and optionally forwards to `transports`.
 * DB persistence: use `createApplicationLogTransport` from `@spectra/database` at the app edge.
 */
export function createLogger(options: CreateLoggerOptions): SpectraLogger {
  const service = options.service;
  const transports = options.transports ?? [];
  const runtime = {
    minLevel: options.minLevel ?? 'info',
    output: options.output ?? 'both',
  };

  const emit = (level: LogLevel, message: string, opts?: LogCallOptions): void => {
    if (!shouldEmit(runtime.minLevel, level)) return;
    const record = buildRecord(service, level, message, opts);
    const out = effectiveOutput(runtime.output, transports.length);
    if (out === 'console' || out === 'both') {
      writeStdout(record);
    }
    if (out === 'database' || out === 'both') {
      for (const t of transports) {
        try {
          const r = t.emit(record);
          if (r !== undefined && typeof (r as Promise<void>).then === 'function') {
            void (r as Promise<void>).catch(() => {
              /* swallow — transport must not break logging */
            });
          }
        } catch {
          /* swallow */
        }
      }
    }
  };

  return {
    service,
    setLoggingRuntime(config) {
      if (config.minLevel !== undefined) {
        runtime.minLevel = config.minLevel;
      }
      if (config.output !== undefined) {
        runtime.output = config.output;
      }
    },
    debug: (message, opts) => emit('debug', message, opts),
    info: (message, opts) => emit('info', message, opts),
    warn: (message, opts) => emit('warn', message, opts),
    error: (message, opts) => emit('error', message, opts),
  };
}
