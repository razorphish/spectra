import 'dotenv/config';

import { defineConfig } from 'drizzle-kit';

/**
 * Migrations: prefer a direct (non-pooler) Neon URL in `DATABASE_DIRECT_URL` if
 * `drizzle-kit migrate` warns about the serverless driver; otherwise `DATABASE_URL`
 * is enough. Runtime apps can use the pooled string from Neon.
 */
const migrationUrl =
  process.env['DATABASE_DIRECT_URL'] ??
  process.env['DATABASE_URL'] ??
  process.env['NEON_DATABASE_URL'] ??
  '';

export default defineConfig({
  schema: './packages/database/src/schema/index.ts',
  out: './packages/database/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: migrationUrl,
  },
});
