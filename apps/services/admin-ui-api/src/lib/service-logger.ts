import {
  createApplicationLogTransport,
  fetchLoggingRuntimeFromPlatform,
  getDb,
  refreshDatabasePackageLoggingFromPlatform,
  resolveSpectraDatabaseUrl,
} from '@spectra/database';
import {
  createLogger,
  resolveLoggingRuntimeFromEnv,
  type SpectraLogger,
} from '@spectra/logger';

let serviceLog: SpectraLogger | null = null;

function buildServiceLogger(): SpectraLogger {
  const env = resolveLoggingRuntimeFromEnv();
  const dbUrl = resolveSpectraDatabaseUrl();
  const transports =
    dbUrl ? [createApplicationLogTransport(getDb())] : [];

  return createLogger({
    service: 'admin-ui-api',
    minLevel: env.minLevel,
    output: env.output,
    transports,
  });
}

/** Process-wide logger for admin-ui-api (stdout JSON + optional `application_logs`). */
export function getServiceLog(): SpectraLogger {
  if (!serviceLog) {
    serviceLog = buildServiceLogger();
  }
  return serviceLog;
}

/**
 * Loads `logging_level` / `logging_output` from platform settings (with env fallback)
 * and aligns {@link databasePackageLog} min level.
 */
export async function refreshServiceLoggingFromPlatform(): Promise<void> {
  const dbUrl = resolveSpectraDatabaseUrl();
  if (!dbUrl) {
    return;
  }
  try {
    const db = getDb();
    const cfg = await fetchLoggingRuntimeFromPlatform(db);
    getServiceLog().setLoggingRuntime(cfg);
    await refreshDatabasePackageLoggingFromPlatform(db);
  } catch (e) {
    getServiceLog().warn('Failed to refresh logging runtime from platform_settings', {
      module: 'service-logger.ts|refreshServiceLoggingFromPlatform',
      metadata: {
        error: {
          name: e instanceof Error ? e.name : 'Error',
          message: e instanceof Error ? e.message : String(e),
        },
      },
    });
  }
}

/** Call once at process startup (before accepting traffic). */
export async function initServiceLogging(): Promise<void> {
  const log = getServiceLog();
  const dbUrl = resolveSpectraDatabaseUrl();
  if (!dbUrl) {
    log.warn('DATABASE_URL not set; admin-ui-api logs go to stdout only', {
      module: 'service-logger.ts|initServiceLogging',
      action: 'startup',
    });
    return;
  }
  await refreshServiceLoggingFromPlatform();
  log.info('Service logging initialized', {
    module: 'service-logger.ts|initServiceLogging',
    action: 'startup',
  });
}
