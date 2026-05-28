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
  serializeError,
  type SpectraLogger,
} from '@spectra/logger';

export interface ServiceLogging {
  getServiceLog(): SpectraLogger;
  initServiceLogging(): Promise<void>;
  refreshServiceLoggingFromPlatform(): Promise<void>;
}

/**
 * Process-wide logger for a Node API (stdout JSON + optional `application_logs`).
 * Wire DB transport at the app edge only.
 */
export function createServiceLogging(options: { service: string }): ServiceLogging {
  const { service } = options;
  let serviceLog: SpectraLogger | null = null;

  function buildServiceLogger(): SpectraLogger {
    const env = resolveLoggingRuntimeFromEnv();
    const dbUrl = resolveSpectraDatabaseUrl();
    const transports = dbUrl ? [createApplicationLogTransport(getDb())] : [];

    return createLogger({
      service,
      minLevel: env.minLevel,
      output: env.output,
      transports,
    });
  }

  function getServiceLog(): SpectraLogger {
    if (!serviceLog) {
      serviceLog = buildServiceLogger();
    }
    return serviceLog;
  }

  async function refreshServiceLoggingFromPlatform(): Promise<void> {
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
        module: 'service-logging|refreshServiceLoggingFromPlatform',
        metadata: { error: serializeError(e) },
      });
    }
  }

  async function initServiceLogging(): Promise<void> {
    const log = getServiceLog();
    const dbUrl = resolveSpectraDatabaseUrl();
    if (!dbUrl) {
      log.warn(`DATABASE_URL not set; ${service} logs go to stdout only`, {
        module: 'service-logging|initServiceLogging',
        action: 'startup',
      });
      return;
    }
    await refreshServiceLoggingFromPlatform();
    log.info('Service logging initialized', {
      module: 'service-logging|initServiceLogging',
      action: 'startup',
    });
  }

  return {
    getServiceLog,
    initServiceLogging,
    refreshServiceLoggingFromPlatform,
  };
}
