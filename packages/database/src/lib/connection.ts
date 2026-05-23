import { sql } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../schema';

type Schema = typeof schema;

/**
 * Drizzle client over the configured Postgres backend. The package targets two
 * drivers so the same code runs locally (Docker Postgres) and in Lambda (Neon
 * HTTP) without per-callsite branching:
 *
 * - `node-postgres` (`pg`) for local dev when `DATABASE_DRIVER=pg` or the URL
 *   host is loopback.
 * - `@neondatabase/serverless` HTTP for everything else (default).
 *
 * Active URL: {@link resolveSpectraDatabaseUrl} (`SPECTRA_DB_TARGET`, `DATABASE_URL`, etc.).
 */
export type SpectraDb = NeonHttpDatabase<Schema> | NodePgDatabase<Schema>;

/** Default Docker Compose Postgres (see repo `docker-compose.yml` / `npm run dev:db`). */
export const DEFAULT_LOCAL_DATABASE_URL =
  'postgresql://spectra:spectra@localhost:5432/spectra';

/**
 * Picks the active Postgres URL from env. Used by `getDb()`, HTTP readiness
 * checks, and drizzle config.
 *
 * - `SPECTRA_DB_TARGET=local` → `LOCAL_DATABASE_URL` ?? {@link DEFAULT_LOCAL_DATABASE_URL}
 * - `SPECTRA_DB_TARGET=neon` → `NEON_DATABASE_URL` ?? `DATABASE_URL`
 * - unset / unknown → `DATABASE_URL` ?? `NEON_DATABASE_URL` (legacy)
 */
export function resolveSpectraDatabaseUrl(): string | undefined {
  const raw = process.env['SPECTRA_DB_TARGET']?.trim().toLowerCase();
  if (raw === 'local') {
    return (
      process.env['LOCAL_DATABASE_URL']?.trim() || DEFAULT_LOCAL_DATABASE_URL
    );
  }
  if (raw === 'neon') {
    return (
      process.env['NEON_DATABASE_URL']?.trim() ||
      process.env['DATABASE_URL']?.trim() ||
      undefined
    );
  }
  if (
    raw &&
    raw !== '' &&
    process.env['NODE_ENV'] !== 'production' &&
    !process.env['CI']
  ) {
    console.warn(
      `[spectra/database] Ignoring invalid SPECTRA_DB_TARGET="${process.env['SPECTRA_DB_TARGET']}" — use local, neon, or omit.`
    );
  }
  return (
    process.env['DATABASE_URL']?.trim() ||
    process.env['NEON_DATABASE_URL']?.trim() ||
    undefined
  );
}

function shouldUsePg(connectionString: string): boolean {
  const explicit = process.env['DATABASE_DRIVER'];
  if (explicit) return explicit.toLowerCase() === 'pg';
  try {
    const { hostname } = new URL(connectionString);
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0'
    );
  } catch {
    return false;
  }
}

function createNeonDb(connectionString: string): NeonHttpDatabase<Schema> {
  const { neon } =
    require('@neondatabase/serverless') as typeof import('@neondatabase/serverless');
  const { drizzle } =
    require('drizzle-orm/neon-http') as typeof import('drizzle-orm/neon-http');
  return drizzle(neon(connectionString), { schema });
}

function createPgDb(connectionString: string): NodePgDatabase<Schema> {
  const pgModule = require('pg') as typeof import('pg');
  const { drizzle } =
    require('drizzle-orm/node-postgres') as typeof import('drizzle-orm/node-postgres');
  const pool = new pgModule.Pool({ connectionString });
  return drizzle(pool, { schema });
}

/** Build a Drizzle client over Neon HTTP or local Postgres (see SpectraDb). */
export function createDb(connectionString: string): SpectraDb {
  return shouldUsePg(connectionString)
    ? createPgDb(connectionString)
    : createNeonDb(connectionString);
}

function resolveConnectionString(): string {
  const url = resolveSpectraDatabaseUrl();
  if (!url) {
    throw new Error(
      'Missing Postgres URL — set DATABASE_URL or NEON_DATABASE_URL, or SPECTRA_DB_TARGET=local|neon with the matching vars (see .env.example).'
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
