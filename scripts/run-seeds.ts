/**
 * Runs idempotent environment seed scripts (default AI model row + MRP demo fixtures)
 * against the configured database. For CI / deploy environments that don't use the admin UI.
 *
 *   DATABASE_URL=postgres://... npm run db:seed
 *
 * Loads .env from the repo root if present. Exits non-zero if any seed fails.
 */
import 'dotenv/config';

import { getDb, resolveSpectraDatabaseUrl, runEnvironmentSeeds } from '@spectra/database';

async function main(): Promise<void> {
  if (!resolveSpectraDatabaseUrl()) {
    console.error('[seed] DATABASE_URL / NEON_DATABASE_URL is not set.');
    process.exit(1);
  }
  const results = await runEnvironmentSeeds(getDb());
  for (const r of results) {
    const extra = r.status === 'ok' ? JSON.stringify(r.detail ?? {}) : r.error ?? 'error';
    console.log(`[seed] ${r.name}: ${r.status} ${extra}`);
  }
  const failed = results.filter((r) => r.status === 'error');
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
