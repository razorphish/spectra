import {
  analyzeMigrationSql,
  formatMigrationHashDisplay,
  heuristicIdempotent,
  inferSchemaMigration,
} from './migration-sql-metadata';

describe('migration-sql-metadata', () => {
  describe('formatMigrationHashDisplay', () => {
    it('truncates long hex hashes', () => {
      const h = 'a'.repeat(64);
      expect(formatMigrationHashDisplay(h, 20)).toBe(`${'a'.repeat(20)}…`);
    });

    it('leaves short strings unchanged', () => {
      expect(formatMigrationHashDisplay('abc')).toBe('abc');
    });
  });

  describe('inferSchemaMigration', () => {
    it('detects CREATE TABLE', () => {
      expect(inferSchemaMigration('create table "x" (id int);')).toBe(true);
    });

    it('returns false for comment-only / empty DDL', () => {
      expect(inferSchemaMigration('-- just a note\nselect 1;')).toBe(false);
    });
  });

  describe('heuristicIdempotent', () => {
    it('flags raw CREATE TABLE', () => {
      expect(heuristicIdempotent('CREATE TABLE foo (id int);')).toBe(false);
    });

    it('allows CREATE TABLE IF NOT EXISTS without DML', () => {
      expect(heuristicIdempotent('CREATE TABLE IF NOT EXISTS foo (id int);')).toBe(true);
    });

    it('flags INSERT', () => {
      expect(heuristicIdempotent("INSERT INTO foo VALUES ('a');")).toBe(false);
    });

    it('flags ALTER ADD COLUMN', () => {
      expect(heuristicIdempotent('ALTER TABLE foo ADD COLUMN bar text;')).toBe(false);
    });
  });

  describe('analyzeMigrationSql', () => {
    it('computes byte size and line count', () => {
      const sql = 'a\nb\n';
      const m = analyzeMigrationSql(sql);
      expect(m.lineCount).toBe(3);
      expect(m.byteSize).toBe(Buffer.byteLength(sql, 'utf8'));
      expect(m.idempotentBasis).toBe('heuristic');
    });

    it('honors @spectra-migration: idempotent manifest', () => {
      const sql = `-- @spectra-migration: idempotent\nCREATE TABLE oops (id int);\n`;
      const m = analyzeMigrationSql(sql);
      expect(m.idempotent).toBe(true);
      expect(m.idempotentBasis).toBe('manifest');
    });

    it('honors @spectra-migration: non-idempotent manifest', () => {
      const sql = `-- @spectra-migration: non-idempotent\nSELECT 1;\n`;
      const m = analyzeMigrationSql(sql);
      expect(m.idempotent).toBe(false);
      expect(m.idempotentBasis).toBe('manifest');
    });
  });
});
