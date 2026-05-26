import { inArray } from 'drizzle-orm';

import type { LogLevel, LoggingOutput } from '@spectra/logger';
import {
  parseLogLevel,
  parseLoggingOutput,
  resolveLoggingRuntimeFromEnv,
} from '@spectra/logger';

import { platformSettings } from '../schema/control-plane';
import type { SpectraDb } from './connection';

/**
 * Keys read when resolving logging runtime from `spectra.platform_settings`.
 * Includes legacy `log_to_console` when `logging_output` is absent.
 */
export const LOGGING_PLATFORM_ROW_KEYS = [
  'logging_level',
  'logging_output',
  'log_to_console',
] as const;

/**
 * Effective min level and output: platform rows override, then env
 * (`LOG_LEVEL`, `LOGGING_OUTPUT`). Legacy boolean `log_to_console` maps to
 * `both` / `database` when `logging_output` is not set.
 */
export async function fetchLoggingRuntimeFromPlatform(
  db: SpectraDb,
): Promise<{ minLevel: LogLevel; output: LoggingOutput }> {
  const env = resolveLoggingRuntimeFromEnv();
  const rows = await db
    .select()
    .from(platformSettings)
    .where(inArray(platformSettings.key, [...LOGGING_PLATFORM_ROW_KEYS]));

  const byKey: Record<string, unknown> = {};
  for (const r of rows) {
    byKey[r.key] = r.value;
  }

  let minLevel = env.minLevel;
  const rawLevel = byKey['logging_level'];
  if (typeof rawLevel === 'string') {
    minLevel = parseLogLevel(rawLevel, env.minLevel);
  }

  let output = env.output;
  const rawOut = byKey['logging_output'];
  if (typeof rawOut === 'string') {
    output = parseLoggingOutput(rawOut, env.output);
  } else {
    const legacy = byKey['log_to_console'];
    if (typeof legacy === 'boolean') {
      output = legacy ? 'both' : 'database';
    }
  }

  return { minLevel, output };
}
