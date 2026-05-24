/**
 * Heuristics for admin “View migration SQL” and Cursor guidance.
 * Not a substitute for human review — Drizzle migrations are usually one-shot.
 */

export type MigrationSqlIdempotentBasis = 'manifest' | 'heuristic';

export interface MigrationSqlMetadata {
  /** UTF-8 byte length of the file body. */
  byteSize: number;
  /** Number of lines (split on newlines; matches editor line count). */
  lineCount: number;
  /** Best-effort: safe to re-execute on an already-migrated DB without destructive side effects. */
  idempotent: boolean;
  /** `manifest` when an explicit header overrides heuristics. */
  idempotentBasis: MigrationSqlIdempotentBasis;
  /** True when the file appears to change schema (DDL) vs data-only DML. */
  schemaMigration: boolean;
}

const HEADER_SCAN = 4000;

/** Opt-in / opt-out headers (first lines of the `.sql` file). */
const RE_IDEMPOTENT_MANIFEST = /--\s*@?spectra-migration:\s*idempotent\b/i;
const RE_NON_IDEMPOTENT_MANIFEST = /--\s*@?spectra-migration:\s*non-idempotent\b/i;

function stripSqlComments(sql: string): string {
  return sql.replace(/--[^\n]*/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ');
}

/**
 * DDL-heavy migrations (typical Drizzle output).
 */
export function inferSchemaMigration(sql: string): boolean {
  const s = stripSqlComments(sql).toLowerCase();
  if (/\b(create|alter|drop)\s+(table|schema|index|view|type|sequence|extension|domain)\b/.test(s)) {
    return true;
  }
  if (/\bcreate\s+unique\s+index\b/.test(s) || /\bcreate\s+index\b/.test(s)) {
    return true;
  }
  if (/\b(add|drop)\s+constraint\b/.test(s) || /\b(add|drop)\s+column\b/.test(s)) {
    return true;
  }
  return false;
}

/**
 * Conservative heuristic: **No** if common one-shot / destructive patterns appear.
 * **Yes** only when none of those patterns match (still not a formal proof).
 */
export function heuristicIdempotent(sql: string): boolean {
  const s = stripSqlComments(sql);

  if (/\bdrop\s+table\s+(?!if\s+exists)/i.test(s)) return false;
  if (/\bdrop\s+schema\s+(?!if\s+exists)/i.test(s)) return false;
  if (/\bdrop\s+materialized\s+view\s+(?!if\s+exists)/i.test(s)) return false;
  if (/\bdrop\s+view\s+(?!if\s+exists)/i.test(s)) return false;
  if (/\bdrop\s+index\s+(?!if\s+exists)/i.test(s)) return false;
  if (/\bdrop\s+column\b/i.test(s)) return false;
  if (/\bdrop\s+constraint\b/i.test(s)) return false;
  if (/\btruncate\b/i.test(s)) return false;
  if (/\bdelete\s+from\b/i.test(s)) return false;
  if (/\bcopy\s+/i.test(s)) return false;

  if (/\bcreate\s+table\s+(?!if\s+not\s+exists)/i.test(s)) return false;
  if (/\bcreate\s+extension\s+(?!if\s+not\s+exists)/i.test(s)) return false;
  if (/\bcreate\s+unique\s+index\s+(?!if\s+not\s+exists)/i.test(s)) return false;
  if (/\bcreate\s+index\s+(?!if\s+not\s+exists)/i.test(s)) return false;

  if (/\balter\s+table\b[^;]*\badd\s+column\b/i.test(s)) return false;
  if (/\balter\s+table\b[^;]*\brename\s+(column|to)\b/i.test(s)) return false;

  if (/\binsert\s+into\b/i.test(s)) return false;

  return true;
}

export function analyzeMigrationSql(sql: string): MigrationSqlMetadata {
  const byteSize = Buffer.byteLength(sql, 'utf8');
  const lineCount = sql.length === 0 ? 0 : sql.split(/\r\n|\r|\n/).length;
  const header = sql.slice(0, HEADER_SCAN);

  const schemaMigration = inferSchemaMigration(sql);

  if (RE_IDEMPOTENT_MANIFEST.test(header)) {
    return {
      byteSize,
      lineCount,
      idempotent: true,
      idempotentBasis: 'manifest',
      schemaMigration,
    };
  }
  if (RE_NON_IDEMPOTENT_MANIFEST.test(header)) {
    return {
      byteSize,
      lineCount,
      idempotent: false,
      idempotentBasis: 'manifest',
      schemaMigration,
    };
  }

  return {
    byteSize,
    lineCount,
    idempotent: heuristicIdempotent(sql),
    idempotentBasis: 'heuristic',
    schemaMigration,
  };
}

/** Truncate SHA-256 hex for display (e.g. first 20 chars + ellipsis). */
export function formatMigrationHashDisplay(fullHash: string, headChars = 20): string {
  if (!fullHash || fullHash.length <= headChars) return fullHash;
  return `${fullHash.slice(0, headChars)}…`;
}
