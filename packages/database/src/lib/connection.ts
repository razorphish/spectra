import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import * as schema from '../schema';

/** Build a Drizzle client over Neon HTTP (Lambda-friendly). */
export function createDb(connectionString: string) {
  const query = neon(connectionString);
  return drizzle(query, { schema });
}

export type SpectraDb = ReturnType<typeof createDb>;

function resolveConnectionString(): string {
  const url =
    process.env['DATABASE_URL'] ?? process.env['NEON_DATABASE_URL'];
  if (!url) {
    throw new Error(
      'Missing DATABASE_URL or NEON_DATABASE_URL — set one for Neon PostgreSQL.'
    );
  }
  return url;
}

let singleton: SpectraDb | undefined;

/** Process-wide singleton for serverless handlers (warm container). */
export function getDb(): SpectraDb {
  if (!singleton) {
    singleton = createDb(resolveConnectionString());
  }
  return singleton;
}

/** Reset singleton (tests). */
export function resetDbSingleton(): void {
  singleton = undefined;
}

/** Shallow readiness probe — bounded SELECT 1. */
export async function pingDatabase(db: SpectraDb): Promise<boolean> {
  await db.execute(sql`select 1 as ok`);
  return true;
}
