import { and, eq, isNull, sql } from 'drizzle-orm';

import { runtimeTenants } from '../schema/control-plane';
import { sandboxMrpItems } from '../schema/sandbox-mrp';
import { databasePackageLog, type SpectraDb } from './connection';
import { getDefaultAiLlmModel } from './sandbox-ai-model';
import { seedSandboxMrpFixturesForTenant } from './sandbox-mrp-seed';

const SEEDS_SCHEMA = 'spectra';
const SEEDS_TABLE = '__spectra_seeds';

/** Outcome of one seed step. */
export interface SeedResult {
  name: string;
  status: 'ok' | 'error';
  detail?: Record<string, unknown>;
  error?: string;
}

/**
 * An environment seed step. Steps MUST be idempotent — `runEnvironmentSeeds` runs every step on
 * each invocation (so newly-created tenants / fresh environments converge), recording the last
 * run in `spectra.__spectra_seeds` for visibility only (not to skip).
 */
interface EnvironmentSeed {
  name: string;
  description: string;
  run: (db: SpectraDb) => Promise<Record<string, unknown>>;
}

/** Registry of idempotent environment seeds, run in order. */
const SEEDS: EnvironmentSeed[] = [
  {
    name: 'default_ai_llm_model',
    description: 'Ensure a default Anthropic model row exists for sandbox custom AI generation.',
    run: async (db) => {
      const model = await getDefaultAiLlmModel(db);
      return { modelId: model.id, provider: model.provider, modelName: model.modelName };
    },
  },
  {
    name: 'sandbox_mrp_fixtures',
    description: 'Backfill MRP demo fixtures for every runtime tenant (idempotent per tenant).',
    run: async (db) => {
      const tenants = await db
        .select({ id: runtimeTenants.id })
        .from(runtimeTenants)
        .where(isNull(runtimeTenants.deletedAt));
      let seeded = 0;
      for (const t of tenants) {
        const [before] = await db
          .select({ n: sql<number>`count(*)::int` })
          .from(sandboxMrpItems)
          .where(and(eq(sandboxMrpItems.tenantId, t.id), isNull(sandboxMrpItems.deletedAt)));
        await seedSandboxMrpFixturesForTenant(db, t.id);
        if ((before?.n ?? 0) === 0) seeded++;
      }
      return { tenants: tenants.length, seeded, skipped: tenants.length - seeded };
    },
  },
];

async function ensureSeedsTable(db: SpectraDb): Promise<void> {
  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS ${sql.identifier(SEEDS_SCHEMA)}`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ${sql.identifier(SEEDS_SCHEMA)}.${sql.identifier(SEEDS_TABLE)} (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now(),
      detail jsonb
    )
  `);
}

/** Lists the registered seeds without running them (for UIs / dry runs). */
export function listEnvironmentSeeds(): { name: string; description: string }[] {
  return SEEDS.map((s) => ({ name: s.name, description: s.description }));
}

/**
 * Runs every registered environment seed in order (idempotent). Records each run in
 * `spectra.__spectra_seeds` and returns a per-seed report. A failing seed is captured in the
 * report and does not abort the remaining seeds.
 */
export async function runEnvironmentSeeds(db: SpectraDb): Promise<SeedResult[]> {
  await ensureSeedsTable(db);
  const results: SeedResult[] = [];
  for (const seed of SEEDS) {
    try {
      const detail = await seed.run(db);
      const detailJson = JSON.stringify(detail);
      await db.execute(sql`
        insert into ${sql.identifier(SEEDS_SCHEMA)}.${sql.identifier(SEEDS_TABLE)} (name, applied_at, detail)
        values (${seed.name}, now(), ${detailJson}::jsonb)
        on conflict (name) do update set applied_at = now(), detail = ${detailJson}::jsonb
      `);
      results.push({ name: seed.name, status: 'ok', detail });
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      results.push({ name: seed.name, status: 'error', error });
      databasePackageLog.error('Environment seed failed', {
        module: 'database|src/lib/seed-runner.ts|runEnvironmentSeeds',
        action: 'database.seeds.run_error',
        metadata: { attrs: { seed: seed.name, error } },
      });
    }
  }
  databasePackageLog.info('Environment seeds finished', {
    module: 'database|src/lib/seed-runner.ts|runEnvironmentSeeds',
    action: 'database.seeds.run_complete',
    metadata: { attrs: { total: results.length, failed: results.filter((r) => r.status === 'error').length } },
  });
  return results;
}
