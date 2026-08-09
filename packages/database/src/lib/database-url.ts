/**
 * Pure Postgres URL resolution — **no `@spectra/logger` (or any package) imports**.
 *
 * Lives apart from {@link file://./connection.ts} so tooling that bundles via plain
 * Node resolution (notably `drizzle-kit`, which does not honor the repo's tsconfig
 * path aliases) can import the URL logic without dragging in the logger and the
 * rest of the connection module. `connection.ts` re-exports these symbols, so
 * `@spectra/database` consumers are unaffected.
 */

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
    // Plain console.warn (not the package logger) keeps this module dependency-free.
    console.warn(
      `[database] Ignoring invalid SPECTRA_DB_TARGET="${process.env['SPECTRA_DB_TARGET']}" — use local, neon, or omit.`,
    );
  }
  return (
    process.env['DATABASE_URL']?.trim() ||
    process.env['NEON_DATABASE_URL']?.trim() ||
    undefined
  );
}
