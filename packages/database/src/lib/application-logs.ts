import type {
  LogTransport,
  SpectraActorJson,
  SpectraLogRecord,
} from '@spectra/logger';
import { DEFAULT_SYSTEM_ACTOR } from '@spectra/logger';

import { applicationLogs } from '../schema/control-plane';
import type { SpectraDb } from './connection';

export type InsertApplicationLogRow = {
  level: string;
  message: string;
  context?: unknown;
  module?: string | null;
  action?: string | null;
  metadata?: unknown;
  createdBy?: SpectraActorJson;
};

/** Append-only insert into `spectra.application_logs`. */
export async function insertApplicationLog(
  db: SpectraDb,
  row: InsertApplicationLogRow,
): Promise<void> {
  await db.insert(applicationLogs).values({
    level: row.level,
    message: row.message,
    context: row.context ?? null,
    module: row.module ?? null,
    action: row.action ?? null,
    metadata: row.metadata ?? null,
    createdBy: row.createdBy ?? DEFAULT_SYSTEM_ACTOR,
  });
}

/**
 * Persists structured {@link SpectraLogRecord}s to Postgres. Swallows errors so logging never breaks callers.
 */
export function createApplicationLogTransport(db: SpectraDb): LogTransport {
  return {
    emit(record: SpectraLogRecord): void {
      void insertApplicationLog(db, {
        level: record.level,
        message: record.message,
        context: record.context ?? null,
        module: record.module ?? null,
        action: record.action ?? null,
        metadata: record.metadata ?? null,
        createdBy: DEFAULT_SYSTEM_ACTOR,
      }).catch(() => {
        /* never throw from logging transport */
      });
    },
  };
}
