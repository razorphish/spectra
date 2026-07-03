import type { RequestHandler, Router } from 'express';

import { createHash } from 'node:crypto';

import {
  analyzeMigrationSql,
  clearAdminMigrationsUseSharedHttpClient,
  deleteMigrationRecordByHash,
  formatMigrationHashDisplay,
  getAdminMigrationsRunnerSource,
  getDb,
  getFirstPendingTag,
  getMigrationInventory,
  getAdminMigrationsUseSharedHttpClient,
  readMigrationSqlFile,
  reconcileAndRunMigrations,
  resolveMigrationHashForTag,
  resolveSpectraDatabaseUrl,
  runDrizzleMigrationsWithRunnerMode,
  runEnvironmentSeeds,
  setAdminMigrationsUseSharedHttpClient,
} from '@spectra/database';

import { requireAuth0AccessToken } from '../lib/auth';
import { workspaceRoot } from '../workspace-root';

const listMigrations: RequestHandler = async (_req, res) => {
  const dbUrl = resolveSpectraDatabaseUrl();
  if (!dbUrl) {
    res.status(503).json({
      error: 'database_not_configured',
      message: 'DATABASE_URL / NEON_DATABASE_URL is not set.',
    });
    return;
  }

  try {
    const root = workspaceRoot();
    const inventory = await getMigrationInventory(getDb(), root);
    res.status(200).json(inventory);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(500).json({
      error: 'migrations_inventory_failed',
      message,
    });
  }
};

const getSql: RequestHandler = async (req, res) => {
  const tag =
    typeof req.query['tag'] === 'string' && req.query['tag'].length > 0 ?
      req.query['tag']
    : '';
  if (!tag) {
    res.status(400).json({ error: 'missing_tag', message: 'Query tag is required.' });
    return;
  }

  try {
    const root = workspaceRoot();
    const { relativePath, sql } = readMigrationSqlFile(root, tag);
    const hash = createHash('sha256').update(sql).digest('hex');
    const meta = analyzeMigrationSql(sql);
    res.status(200).json({
      path: relativePath,
      sql,
      hash,
      hashDisplay: formatMigrationHashDisplay(hash),
      byteSize: meta.byteSize,
      lineCount: meta.lineCount,
      idempotent: meta.idempotent,
      idempotentBasis: meta.idempotentBasis,
      schemaMigration: meta.schemaMigration,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(400).json({ error: 'migration_sql_failed', message });
  }
};

const getRollbackGuide: RequestHandler = async (req, res) => {
  const tag =
    typeof req.query['tag'] === 'string' && req.query['tag'].length > 0 ?
      req.query['tag']
    : '';
  if (!tag) {
    res.status(400).json({ error: 'missing_tag', message: 'Query tag is required.' });
    return;
  }

  let sqlPreview: string | null = null;
  try {
    const root = workspaceRoot();
    const { sql } = readMigrationSqlFile(root, tag);
    sqlPreview = sql.slice(0, 1200).trimEnd();
  } catch {
    sqlPreview = null;
  }

  res.status(200).json({
    tag,
    bullets: [
      'Drizzle does not auto-rollback applied migrations.',
      'Restore from a snapshot taken before this migration, or ship a forward migration that reverses the change.',
      'Use a database branch or clone for rehearsal before production.',
    ],
    sqlPreview,
  });
};

const postRun: RequestHandler = async (req, res) => {
  const dbUrl = resolveSpectraDatabaseUrl();
  if (!dbUrl) {
    res.status(503).json({
      error: 'database_not_configured',
      message: 'DATABASE_URL / NEON_DATABASE_URL is not set.',
    });
    return;
  }

  const body = req.body as { scope?: unknown; tag?: unknown; runSeeds?: unknown };
  const scope = typeof body.scope === 'string' ? body.scope : '';
  const tag = typeof body.tag === 'string' && body.tag.length > 0 ? body.tag : undefined;
  const runSeeds = body.runSeeds === true;

  if (scope !== 'pending' && scope !== 'all' && scope !== 'single') {
    res.status(400).json({
      error: 'invalid_scope',
      message: 'scope must be pending, all, or single.',
    });
    return;
  }

  const root = workspaceRoot();
  const db = getDb();

  if (scope === 'single') {
    if (!tag) {
      res.status(400).json({
        error: 'missing_tag',
        message: 'tag is required when scope is single.',
      });
      return;
    }
    try {
      const inventory = await getMigrationInventory(db, root);
      const first = getFirstPendingTag(inventory.rows);
      if (!first) {
        res.status(409).json({
          error: 'nothing_pending',
          message: 'No pending migrations to run.',
        });
        return;
      }
      if (first !== tag) {
        res.status(409).json({
          error: 'not_next_pending',
          message: `Only the next pending migration can be run individually: "${first}". Run Pending applies migrations in journal order.`,
          nextPendingTag: first,
        });
        return;
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      res.status(500).json({ error: 'migrations_precheck_failed', message });
      return;
    }
  }

  try {
    const useShared = await getAdminMigrationsUseSharedHttpClient(db);
    const hashRepairedTags = await runDrizzleMigrationsWithRunnerMode(db, root, useShared);
    const seeds = runSeeds ? await runEnvironmentSeeds(db) : undefined;
    const inventory = await getMigrationInventory(db, root);
    res.status(200).json({ ok: true, inventory, hashRepairedTags, ...(seeds ? { seeds } : {}) });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    let cause: string | undefined;
    if (e instanceof Error && 'cause' in e && e.cause instanceof Error) {
      cause = e.cause.message;
    }
    res.status(500).json({
      error: 'migrate_failed',
      message,
      ...(cause ? { cause } : {}),
    });
  }
};

const postSeed: RequestHandler = async (_req, res) => {
  const dbUrl = resolveSpectraDatabaseUrl();
  if (!dbUrl) {
    res.status(503).json({
      error: 'database_not_configured',
      message: 'DATABASE_URL / NEON_DATABASE_URL is not set.',
    });
    return;
  }
  try {
    const seeds = await runEnvironmentSeeds(getDb());
    const failed = seeds.filter((s) => s.status === 'error');
    res.status(failed.length ? 207 : 200).json({ ok: failed.length === 0, seeds });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(500).json({ error: 'seed_failed', message });
  }
};

const postReconcile: RequestHandler = async (_req, res) => {
  const dbUrl = resolveSpectraDatabaseUrl();
  if (!dbUrl) {
    res.status(503).json({
      error: 'database_not_configured',
      message: 'DATABASE_URL / NEON_DATABASE_URL is not set.',
    });
    return;
  }

  const root = workspaceRoot();
  const db = getDb();

  try {
    const useShared = await getAdminMigrationsUseSharedHttpClient(db);
    const result = await reconcileAndRunMigrations(db, root, useShared);
    if (result.nothingToDo) {
      res.status(409).json({
        error: 'nothing_to_reconcile',
        message: 'Migration journal and spectra.__drizzle_migrations already match (no reconcile needed).',
        inventory: result.inventory,
      });
      return;
    }
    res.status(200).json({
      ok: true,
      inventory: result.inventory,
      deletedOrphanHashes: result.deletedOrphanHashes,
      hashRepairedTags: result.hashRepairedTags,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    let cause: string | undefined;
    if (e instanceof Error && 'cause' in e && e.cause instanceof Error) {
      cause = e.cause.message;
    }
    res.status(500).json({
      error: 'reconcile_failed',
      message,
      ...(cause ? { cause } : {}),
    });
  }
};

const deleteRecord: RequestHandler = async (req, res) => {
  const dbUrl = resolveSpectraDatabaseUrl();
  if (!dbUrl) {
    res.status(503).json({
      error: 'database_not_configured',
      message: 'DATABASE_URL / NEON_DATABASE_URL is not set.',
    });
    return;
  }

  const body = req.body as { tag?: unknown };
  const tag = typeof body.tag === 'string' && body.tag.length > 0 ? body.tag : '';
  if (!tag) {
    res.status(400).json({ error: 'missing_tag', message: 'tag is required.' });
    return;
  }

  const root = workspaceRoot();
  const db = getDb();

  try {
    const { hash } = resolveMigrationHashForTag(root, tag);
    const inventory = await getMigrationInventory(db, root);
    const row = inventory.rows.find((r) => r.tag === tag);
    if (!row || row.status !== 'applied') {
      res.status(409).json({
        error: 'not_applied',
        message: 'Can only delete a migration record that is currently applied.',
      });
      return;
    }
    if (row.hash !== hash) {
      res.status(500).json({
        error: 'hash_mismatch',
        message: 'On-disk migration file hash does not match inventory row.',
      });
      return;
    }

    await deleteMigrationRecordByHash(db, hash);
    const next = await getMigrationInventory(db, root);
    res.status(200).json({ ok: true, inventory: next });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(500).json({
      error: 'delete_migration_record_failed',
      message,
    });
  }
};

const getRunnerConfig: RequestHandler = async (_req, res) => {
  const dbUrl = resolveSpectraDatabaseUrl();
  if (!dbUrl) {
    res.status(503).json({
      error: 'database_not_configured',
      message: 'DATABASE_URL / NEON_DATABASE_URL is not set.',
    });
    return;
  }
  try {
    const cfg = await getAdminMigrationsRunnerSource(getDb());
    res.status(200).json(cfg);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(500).json({
      error: 'migrations_runner_config_failed',
      message,
    });
  }
};

const putRunnerConfig: RequestHandler = async (req, res) => {
  const dbUrl = resolveSpectraDatabaseUrl();
  if (!dbUrl) {
    res.status(503).json({
      error: 'database_not_configured',
      message: 'DATABASE_URL / NEON_DATABASE_URL is not set.',
    });
    return;
  }
  const body = req.body as { useSharedHttpClient?: unknown };
  if (typeof body.useSharedHttpClient !== 'boolean') {
    res.status(400).json({
      error: 'invalid_body',
      message: 'JSON body must include useSharedHttpClient (boolean).',
    });
    return;
  }
  try {
    await setAdminMigrationsUseSharedHttpClient(getDb(), body.useSharedHttpClient);
    const cfg = await getAdminMigrationsRunnerSource(getDb());
    res.status(200).json(cfg);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(500).json({
      error: 'migrations_runner_config_update_failed',
      message,
    });
  }
};

const deleteRunnerConfig: RequestHandler = async (_req, res) => {
  const dbUrl = resolveSpectraDatabaseUrl();
  if (!dbUrl) {
    res.status(503).json({
      error: 'database_not_configured',
      message: 'DATABASE_URL / NEON_DATABASE_URL is not set.',
    });
    return;
  }
  try {
    await clearAdminMigrationsUseSharedHttpClient(getDb());
    const cfg = await getAdminMigrationsRunnerSource(getDb());
    res.status(200).json(cfg);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(500).json({
      error: 'migrations_runner_config_delete_failed',
      message,
    });
  }
};

export function registerAdminMigrationsRoutes(r: Router): void {
  r.get('/migrations', requireAuth0AccessToken, listMigrations);
  r.get('/migrations/sql', requireAuth0AccessToken, getSql);
  r.get('/migrations/rollback-guide', requireAuth0AccessToken, getRollbackGuide);
  r.get('/migrations/runner-config', requireAuth0AccessToken, getRunnerConfig);
  r.put('/migrations/runner-config', requireAuth0AccessToken, putRunnerConfig);
  r.delete('/migrations/runner-config', requireAuth0AccessToken, deleteRunnerConfig);
  r.post('/migrations/run', requireAuth0AccessToken, postRun);
  r.post('/migrations/seed', requireAuth0AccessToken, postSeed);
  r.post('/migrations/reconcile', requireAuth0AccessToken, postReconcile);
  r.delete('/migrations/record', requireAuth0AccessToken, deleteRecord);
}
