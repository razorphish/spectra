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

/** Keys editable in admin UI (`LoggingSettingsTab`). `log_to_console` is read-only legacy. */
export const ADMIN_UI_LOGGING_SETTING_KEYS = [
  'logging_level',
  'logging_output',
] as const;

export type AdminUiLoggingSettingKey =
  (typeof ADMIN_UI_LOGGING_SETTING_KEYS)[number];

async function readLoggingPlatformRows(
  db: SpectraDb,
): Promise<Record<string, unknown>> {
  const rows = await db
    .select()
    .from(platformSettings)
    .where(inArray(platformSettings.key, [...LOGGING_PLATFORM_ROW_KEYS]));

  const byKey: Record<string, unknown> = {};
  for (const r of rows) {
    byKey[r.key] = r.value;
  }
  return byKey;
}

function resolveLoggingOutputFromRows(
  byKey: Record<string, unknown>,
  fallback: LoggingOutput,
): LoggingOutput {
  const rawOut = byKey['logging_output'];
  if (typeof rawOut === 'string') {
    return parseLoggingOutput(rawOut, fallback);
  }
  const legacy = byKey['log_to_console'];
  if (typeof legacy === 'boolean') {
    return legacy ? 'both' : 'database';
  }
  return fallback;
}

/**
 * Settings payload for admin UI (`GET /v1/admin/logging/settings`).
 */
export async function fetchLoggingSettingsForAdminUi(
  db: SpectraDb,
): Promise<{ key: AdminUiLoggingSettingKey; value: unknown }[]> {
  const env = resolveLoggingRuntimeFromEnv();
  const byKey = await readLoggingPlatformRows(db);

  const loggingOutput = resolveLoggingOutputFromRows(byKey, env.output);
  const rawLevel = byKey['logging_level'];
  const loggingLevel =
    typeof rawLevel === 'string' ? rawLevel : env.minLevel;

  return ADMIN_UI_LOGGING_SETTING_KEYS.map((key) => {
    if (key === 'logging_output') {
      return { key, value: loggingOutput };
    }
    return { key, value: loggingLevel };
  });
}

export function isAdminUiLoggingSettingKey(
  k: string,
): k is AdminUiLoggingSettingKey {
  return (ADMIN_UI_LOGGING_SETTING_KEYS as readonly string[]).includes(k);
}

/**
 * Effective min level and output: platform rows override, then env
 * (`LOG_LEVEL`, `LOGGING_OUTPUT`). Legacy boolean `log_to_console` maps to
 * `both` / `database` when `logging_output` is not set.
 */
export async function fetchLoggingRuntimeFromPlatform(
  db: SpectraDb,
): Promise<{ minLevel: LogLevel; output: LoggingOutput }> {
  const env = resolveLoggingRuntimeFromEnv();
  const byKey = await readLoggingPlatformRows(db);

  let minLevel = env.minLevel;
  const rawLevel = byKey['logging_level'];
  if (typeof rawLevel === 'string') {
    minLevel = parseLogLevel(rawLevel, env.minLevel);
  }

  const output = resolveLoggingOutputFromRows(byKey, env.output);

  return { minLevel, output };
}
