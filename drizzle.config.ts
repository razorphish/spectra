import 'dotenv/config';

import { resolveSpectraDatabaseUrl } from './packages/database/src/lib/database-url';
import { defineConfig } from 'drizzle-kit';

/**
 * Migrations: `DATABASE_DIRECT_URL` wins (non-pooler Neon or local). Otherwise
 * uses the same URL resolution as runtime (`resolveSpectraDatabaseUrl`, including
 * `SPECTRA_DB_TARGET`). Set `DATABASE_DIRECT_URL` to match your active target when
 * drizzle-kit warns about the serverless driver.
 */
const migrationUrl =
  process.env['DATABASE_DIRECT_URL']?.trim() ||
  resolveSpectraDatabaseUrl() ||
  '';

export default defineConfig({
  schema: './packages/database/src/schema/index.ts',
  out: './packages/database/drizzle',
  dialect: 'postgresql',
  /** Introspect / push only the app schema (not public noise). */
  schemaFilter: ['spectra'],
  migrations: {
    schema: 'spectra',
  },
  dbCredentials: {
    url: migrationUrl,
  },
});
