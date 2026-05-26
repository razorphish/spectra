import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { eq, sql } from 'drizzle-orm';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { migrate as migrateNeon } from 'drizzle-orm/neon-http/migrator';
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';

import * as schema from '../schema';
import { platformSettings } from '../schema/control-plane';
import {
  databasePackageLog,
  refreshDatabasePackageLoggingFromPlatform,
  resolveSpectraDatabaseUrl,
  type SpectraDb,
} from './connection';

type Schema = typeof schema;

const MIGRATIONS_SCHEMA = 'spectra';
const MIGRATIONS_TABLE = '__drizzle_migrations';
const RELATIVE_MIGRATIONS_DIR = join('packages', 'database', 'drizzle');

/** When `true`, admin `migrate()` uses the same Drizzle client as the API (Neon HTTP when configured). */
export const ADMIN_MIGRATIONS_USE_SHARED_HTTP_KEY = 'admin_migrations_use_shared_http_client';

/**
 * Default for {@link ADMIN_MIGRATIONS_USE_SHARED_HTTP_KEY} when no row exists in `platform_settings`.
 * Production: `false` (dedicated `node-pg` runner). Non-production: `true` (legacy shared client).
 */
export function defaultAdminMigrationsUseSharedHttpClient(): boolean {
  return process.env['NODE_ENV'] !== 'production';
}

export async function getAdminMigrationsUseSharedHttpClient(db: SpectraDb): Promise<boolean> {
  const rows = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.key, ADMIN_MIGRATIONS_USE_SHARED_HTTP_KEY))
    .limit(1);
  const raw = rows[0]?.value;
  if (raw === undefined || raw === null) {
    return defaultAdminMigrationsUseSharedHttpClient();
  }
  return Boolean(raw);
}

export async function getAdminMigrationsRunnerSource(
  db: SpectraDb,
): Promise<{ useSharedHttpClient: boolean; fromDatabase: boolean; environmentDefault: boolean }> {
  const rows = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.key, ADMIN_MIGRATIONS_USE_SHARED_HTTP_KEY))
    .limit(1);
  const envDefault = defaultAdminMigrationsUseSharedHttpClient();
  if (rows.length === 0) {
    return {
      useSharedHttpClient: envDefault,
      fromDatabase: false,
      environmentDefault: envDefault,
    };
  }
  return {
    useSharedHttpClient: Boolean(rows[0]!.value),
    fromDatabase: true,
    environmentDefault: envDefault,
  };
}

export async function setAdminMigrationsUseSharedHttpClient(
  db: SpectraDb,
  value: boolean,
): Promise<void> {
  await db
    .insert(platformSettings)
    .values({ key: ADMIN_MIGRATIONS_USE_SHARED_HTTP_KEY, value: value as never })
    .onConflictDoUpdate({
      target: platformSettings.key,
      set: { value: value as never },
    });
}

export async function clearAdminMigrationsUseSharedHttpClient(db: SpectraDb): Promise<void> {
  await db
    .delete(platformSettings)
    .where(eq(platformSettings.key, ADMIN_MIGRATIONS_USE_SHARED_HTTP_KEY));
}

export interface DrizzleJournalEntry {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
}

export interface MigrationPathInfo {
  migrationsFolder: string;
  journalPath: string;
  snapshotFolder: string;
}

export interface MigrationInventoryRow {
  idx: number;
  tag: string;
  hash: string;
  status: 'applied' | 'pending';
  /** ISO timestamp when applied, from DB `created_at` (journal ms when pending). */
  when: string | null;
}

export interface MigrationCheckResult {
  isValid: boolean;
  method: 'drizzle-journal-vs-spectra.__drizzle_migrations';
  hasGaps: boolean;
  pendingCount: number;
  orphanDbHashes: string[];
  message: string | null;
}

export interface MigrationInventory {
  paths: MigrationPathInfo;
  status: {
    totalApplied: number;
    totalAvailable: number;
    pending: number;
    lastMigrationAt: string | null;
  };
  check: MigrationCheckResult;
  rows: MigrationInventoryRow[];
}

function isNodePostgresDb(db: SpectraDb): db is NodePgDatabase<Schema> {
  try {
    const PoolCtor = require('pg')?.Pool as typeof Pool | undefined;
    if (!PoolCtor) return false;
    const client = (db as unknown as { $client?: unknown }).$client;
    return client instanceof PoolCtor;
  } catch {
    return false;
  }
}

function rowsFromExecute(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) {
    return result as Record<string, unknown>[];
  }
  if (
    result &&
    typeof result === 'object' &&
    'rows' in result &&
    Array.isArray((result as { rows: unknown }).rows)
  ) {
    return (result as { rows: Record<string, unknown>[] }).rows;
  }
  return [];
}

function resolveMigrationsFolder(workspaceRoot: string): string {
  return join(workspaceRoot, RELATIVE_MIGRATIONS_DIR);
}

export function buildMigrationPaths(workspaceRoot: string): MigrationPathInfo {
  const migrationsFolder = resolveMigrationsFolder(workspaceRoot);
  return {
    migrationsFolder: RELATIVE_MIGRATIONS_DIR.replace(/\\/g, '/'),
    journalPath: `${RELATIVE_MIGRATIONS_DIR.replace(/\\/g, '/')}/meta/_journal.json`,
    snapshotFolder: `${RELATIVE_MIGRATIONS_DIR.replace(/\\/g, '/')}/meta`,
  };
}

function readJournalEntries(migrationsFolder: string): DrizzleJournalEntry[] {
  const journalPath = join(migrationsFolder, 'meta', '_journal.json');
  const raw = readFileSync(journalPath, 'utf8');
  const parsed = JSON.parse(raw) as { entries?: DrizzleJournalEntry[] };
  if (!Array.isArray(parsed.entries)) {
    throw new Error('Invalid _journal.json: missing entries array');
  }
  return parsed.entries;
}

/** Loads `.sql` for a journal tag (sanitized). */
export function readMigrationSqlFile(
  workspaceRoot: string,
  tag: string,
): { relativePath: string; sql: string } {
  if (!/^[a-zA-Z0-9_-]+$/.test(tag)) {
    throw new Error('Invalid migration tag');
  }
  const migrationsFolder = resolveMigrationsFolder(workspaceRoot);
  const relativePath = `${RELATIVE_MIGRATIONS_DIR.replace(/\\/g, '/')}/${tag}.sql`;
  const full = join(migrationsFolder, `${tag}.sql`);
  if (!existsSync(full)) {
    throw new Error(`Migration file not found: ${relativePath}`);
  }
  const sql = readFileSync(full, 'utf8');
  return { relativePath, sql };
}

async function selectApplied(db: SpectraDb): Promise<{ hash: string; created_at: number }[]> {
  try {
    const res = await db.execute(sql`
      select hash, created_at
      from ${sql.identifier(MIGRATIONS_SCHEMA)}.${sql.identifier(MIGRATIONS_TABLE)}
      order by created_at asc
    `);
    return rowsFromExecute(res).map((r) => ({
      hash: String(r['hash'] ?? ''),
      created_at: Number(r['created_at'] ?? 0),
    }));
  } catch {
    return [];
  }
}

function computeCheck(
  orderedJournalHashes: string[],
  appliedOrdered: { hash: string; created_at: number }[],
  pendingCount: number,
  /** Parallel to `orderedJournalHashes` — used for clearer gap messages. */
  journalTags?: string[],
): MigrationCheckResult {
  const journalSet = new Set(orderedJournalHashes);
  const orphanDbHashes = appliedOrdered
    .map((r) => r.hash)
    .filter((h) => h && !journalSet.has(h));

  let consecutiveFromJournal = 0;
  for (const h of orderedJournalHashes) {
    const found = appliedOrdered.some((a) => a.hash === h);
    if (found) consecutiveFromJournal++;
    else break;
  }

  /** True when every applied hash appears in the journal prefix (no skipped migrations). */
  const prefixOk = consecutiveFromJournal === appliedOrdered.length;
  const hasGaps = !prefixOk;
  const isValid = prefixOk && orphanDbHashes.length === 0;

  let message: string | null = null;
  if (orphanDbHashes.length) {
    message =
      'Database contains migration hash(es) not present in the repo journal. See packages/database/README.md.';
  } else if (!prefixOk) {
    let firstMissingTag: string | undefined;
    if (journalTags && journalTags.length === orderedJournalHashes.length) {
      for (let i = 0; i < orderedJournalHashes.length; i++) {
        const h = orderedJournalHashes[i]!;
        if (!appliedOrdered.some((a) => a.hash === h)) {
          firstMissingTag = journalTags[i];
          break;
        }
      }
    }
    message =
      firstMissingTag ?
        `Applied history is missing "${firstMissingTag}" (its current on-disk hash is not in spectra.__drizzle_migrations) while a later migration is already recorded. Use Run Pending to apply missing migrations in journal order. See packages/database/README.md.`
      : 'Applied migrations do not form a clean prefix of the repo journal (a migration may have been skipped or reordered).';
  } else if (pendingCount > 0) {
    message = `${pendingCount} migration(s) pending — run from the list or use Run Pending.`;
  }

  return {
    isValid,
    method: 'drizzle-journal-vs-spectra.__drizzle_migrations',
    hasGaps,
    pendingCount,
    orphanDbHashes,
    message,
  };
}

/**
 * Reads `drizzle/meta/_journal.json`, matches `spectra.__drizzle_migrations` by SHA-256 of each `.sql`
 * (same as Drizzle migrator), and returns rows for the admin UI.
 */
export async function getMigrationInventory(
  db: SpectraDb,
  workspaceRoot: string,
): Promise<MigrationInventory> {
  await refreshDatabasePackageLoggingFromPlatform(db);
  const migrationsFolder = resolveMigrationsFolder(workspaceRoot);
  if (!existsSync(join(migrationsFolder, 'meta', '_journal.json'))) {
    throw new Error(
      `Migrations folder not found at ${migrationsFolder}. Is NX_WORKSPACE_ROOT set correctly?`,
    );
  }

  const journalEntries = readJournalEntries(migrationsFolder);
  const meta = readMigrationFiles({
    migrationsFolder,
    migrationsSchema: MIGRATIONS_SCHEMA,
    migrationsTable: MIGRATIONS_TABLE,
  });

  if (meta.length !== journalEntries.length) {
    throw new Error('Journal entry count does not match readable migration files');
  }

  const applied = await selectApplied(db);
  const appliedByHash = new Map(applied.map((r) => [r.hash, r.created_at]));

  const orderedJournalHashes = meta.map((m) => m.hash);
  const rows: MigrationInventoryRow[] = journalEntries.map((entry, i) => {
    const hash = meta[i]?.hash ?? '';
    const created = appliedByHash.get(hash);
    const appliedHere = created !== undefined;
    return {
      idx: entry.idx,
      tag: entry.tag,
      hash,
      status: appliedHere ? 'applied' : 'pending',
      when: appliedHere ? new Date(created!).toISOString() : null,
    };
  });

  const totalAvailable = rows.length;
  const totalApplied = rows.filter((r) => r.status === 'applied').length;
  const pending = totalAvailable - totalApplied;

  let lastMigrationAt: string | null = null;
  if (applied.length) {
    const maxTs = Math.max(...applied.map((a) => a.created_at));
    lastMigrationAt = new Date(maxTs).toISOString();
  }

  const check = computeCheck(
    orderedJournalHashes,
    applied,
    pending,
    journalEntries.map((e) => e.tag),
  );

  databasePackageLog.info('Migration inventory computed', {
    module: 'database|src/lib/admin-migrations.ts|getMigrationInventory',
    action: 'database.migrations.inventory',
    metadata: {
      attrs: {
        totalApplied,
        totalAvailable,
        pending,
        isValid: check.isValid,
      },
    },
  });

  return {
    paths: buildMigrationPaths(workspaceRoot),
    status: {
      totalApplied,
      totalAvailable,
      pending,
      lastMigrationAt,
    },
    check,
    rows,
  };
}

const migrationConfig = (migrationsFolder: string) => ({
  migrationsFolder,
  migrationsSchema: MIGRATIONS_SCHEMA,
  migrationsTable: MIGRATIONS_TABLE,
});

async function ensureSpectraMigrationsTable(db: SpectraDb): Promise<void> {
  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS ${sql.identifier(MIGRATIONS_SCHEMA)}`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ${sql.identifier(MIGRATIONS_SCHEMA)}.${sql.identifier(MIGRATIONS_TABLE)} (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);
}

/**
 * Drizzle's built-in `migrate()` only considers the **latest** row in `__drizzle_migrations`
 * (`order by created_at desc limit 1`) and skips any migration whose journal `when` is not
 * greater than that row. If a **later** migration was applied while an **earlier** journal file
 * was never recorded (hash drift repair, manual deletes, etc.), `migrate()` will never run the
 * skipped file. This pass applies every journal migration whose **hash** is missing, in order,
 * then normal `migrate()` can no-op safely.
 */
async function applyMissingJournalMigrationsByHash(
  db: SpectraDb,
  workspaceRoot: string,
): Promise<string[]> {
  const migrationsFolder = resolveMigrationsFolder(workspaceRoot);
  const cfg = migrationConfig(migrationsFolder);
  await ensureSpectraMigrationsTable(db);
  const migrations = readMigrationFiles(cfg);
  const journalEntries = readJournalEntries(migrationsFolder);
  if (migrations.length !== journalEntries.length) {
    throw new Error('Journal entry count does not match migration files');
  }

  const applied = await selectApplied(db);
  const appliedSet = new Set(applied.map((r) => r.hash));
  const appliedTags: string[] = [];

  for (let i = 0; i < migrations.length; i++) {
    const m = migrations[i]!;
    const tag = journalEntries[i]!.tag;
    if (appliedSet.has(m.hash)) continue;

    if (isNodePostgresDb(db)) {
      try {
        await db.transaction(async (tx) => {
          for (const stmt of m.sql) {
            const t = stmt.trim();
            if (!t) continue;
            await tx.execute(sql.raw(t));
          }
          await tx.execute(sql`
            insert into ${sql.identifier(MIGRATIONS_SCHEMA)}.${sql.identifier(MIGRATIONS_TABLE)}
              ("hash", "created_at")
            values (${m.hash}, ${m.folderMillis})
          `);
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const err = new Error(`Hash-order migration "${tag}" failed: ${msg}`);
        (err as Error & { cause?: unknown }).cause = e;
        throw err;
      }
    } else {
      try {
        for (const stmt of m.sql) {
          const t = stmt.trim();
          if (!t) continue;
          await db.execute(sql.raw(t));
        }
        await db.execute(sql`
          insert into ${sql.identifier(MIGRATIONS_SCHEMA)}.${sql.identifier(MIGRATIONS_TABLE)}
            ("hash", "created_at")
            values (${m.hash}, ${m.folderMillis})
        `);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const err = new Error(`Hash-order migration "${tag}" failed: ${msg}`);
        (err as Error & { cause?: unknown }).cause = e;
        throw err;
      }
    }

    appliedSet.add(m.hash);
    appliedTags.push(tag);
  }

  return appliedTags;
}

/**
 * Runs Drizzle `migrate()` using the same journal + `spectra.__drizzle_migrations` as `drizzle-kit migrate`.
 */
export async function runDrizzleMigrations(
  db: SpectraDb,
  workspaceRoot: string,
): Promise<string[]> {
  await refreshDatabasePackageLoggingFromPlatform(db);
  databasePackageLog.info('Drizzle migrate starting', {
    module: 'database|src/lib/admin-migrations.ts|runDrizzleMigrations',
    action: 'database.migrations.run_start',
  });
  const migrationsFolder = resolveMigrationsFolder(workspaceRoot);
  const repairedTags = await applyMissingJournalMigrationsByHash(db, workspaceRoot);
  const cfg = migrationConfig(migrationsFolder);
  if (isNodePostgresDb(db)) {
    await migratePg(db, cfg);
  } else {
    await migrateNeon(db as NeonHttpDatabase<Schema>, cfg);
  }
  databasePackageLog.info('Drizzle migrate finished', {
    module: 'database|src/lib/admin-migrations.ts|runDrizzleMigrations',
    action: 'database.migrations.run_complete',
    metadata: {
      attrs: { repairedJournalMigrations: repairedTags.length },
    },
  });
  return repairedTags;
}

async function runDedicatedPgMigrate(
  connectionString: string,
  workspaceRoot: string,
): Promise<string[]> {
  const pgModule = require('pg') as typeof import('pg');
  const { drizzle } =
    require('drizzle-orm/node-postgres') as typeof import('drizzle-orm/node-postgres');
  const pool = new pgModule.Pool({ connectionString });
  try {
    const db = drizzle(pool, { schema });
    const repairedTags = await applyMissingJournalMigrationsByHash(db, workspaceRoot);
    await migratePg(db, migrationConfig(resolveMigrationsFolder(workspaceRoot)));
    return repairedTags;
  } finally {
    await pool.end();
  }
}

/**
 * Runs migrations either through the shared API `getDb()` client (Neon HTTP when applicable) or a
 * short-lived `node-pg` pool (prefers `DATABASE_DIRECT_URL`, then active Spectra URL).
 */
export async function runDrizzleMigrationsWithRunnerMode(
  sharedDb: SpectraDb,
  workspaceRoot: string,
  useSharedHttpClient: boolean,
): Promise<string[]> {
  if (useSharedHttpClient) {
    return runDrizzleMigrations(sharedDb, workspaceRoot);
  }
  const direct =
    process.env['DATABASE_DIRECT_URL']?.trim() ||
    resolveSpectraDatabaseUrl()?.trim() ||
    undefined;
  if (!direct) {
    throw new Error(
      'Dedicated migration runner needs a Postgres URL (set DATABASE_URL / NEON_DATABASE_URL, or DATABASE_DIRECT_URL for migrate).',
    );
  }
  return runDedicatedPgMigrate(direct, workspaceRoot);
}

export function resolveMigrationHashForTag(
  workspaceRoot: string,
  tag: string,
): { hash: string; migrationsFolder: string } {
  const { sql: body } = readMigrationSqlFile(workspaceRoot, tag);
  const hash = createHash('sha256').update(body).digest('hex');
  return { hash, migrationsFolder: resolveMigrationsFolder(workspaceRoot) };
}

/** Deletes one applied migration row so the file can be re-run (dangerous; admin-only). */
export async function deleteMigrationRecordByHash(db: SpectraDb, hash: string): Promise<void> {
  if (!/^[a-f0-9]{64}$/.test(hash)) {
    throw new Error('Invalid migration hash');
  }
  await db.execute(sql`
    delete from ${sql.identifier(MIGRATIONS_SCHEMA)}.${sql.identifier(MIGRATIONS_TABLE)}
    where hash = ${hash}
  `);
}

/** First pending migration tag in journal order, if any. */
export function getFirstPendingTag(rows: MigrationInventoryRow[]): string | null {
  const pending = rows.filter((r) => r.status === 'pending');
  if (!pending.length) return null;
  return pending.reduce((a, b) => (a.idx <= b.idx ? a : b)).tag;
}
