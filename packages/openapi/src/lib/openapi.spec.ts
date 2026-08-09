import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MERGED_INTEGRATION_SPEC_RELATIVE, MERGED_PUBLIC_SPEC_RELATIVE } from './openapi';

const ROOT = join(__dirname, '..', '..', '..', '..');
const PUBLIC_LIMITED_PREFIX_DENYLIST = [
  '/v1/platform/sandbox',
  '/v1/platform/uploads',
  '/v1/platform/health',
  '/v1/platform/stats',
] as const;

function pathMatchesPublicDenylist(pathKey: string): boolean {
  return PUBLIC_LIMITED_PREFIX_DENYLIST.some(
    (prefix) => pathKey === prefix || pathKey.startsWith(`${prefix}/`)
  );
}

function loadJson(relFromWorkspaceRoot: string): { paths?: Record<string, unknown> } {
  const abs = join(ROOT, relFromWorkspaceRoot);
  if (!existsSync(abs)) {
    throw new Error(`Missing merged spec (run nx run openapi:merge first): ${abs}`);
  }
  return JSON.parse(readFileSync(abs, 'utf8')) as { paths?: Record<string, unknown> };
}

describe('merged OpenAPI artifacts', () => {
  it('public limited JSON excludes denylisted prefixes and non-public audiences', () => {
    const doc = loadJson(MERGED_PUBLIC_SPEC_RELATIVE);
    const keys = Object.keys(doc.paths ?? {});
    for (const pathKey of keys) {
      expect(pathMatchesPublicDenylist(pathKey)).toBe(false);
      const item = doc.paths?.[pathKey] as Record<string, unknown> | undefined;
      const aud = item?.['x-spectra-audience'];
      expect(aud).toBe('public');
    }
  });

  it('full integration JSON includes sandbox paths', () => {
    const doc = loadJson(MERGED_INTEGRATION_SPEC_RELATIVE);
    expect(Object.keys(doc.paths ?? {})).toContain('/v1/platform/sandbox/session');
  });

  it('full artifact has at least as many paths as public limited', () => {
    const pub = loadJson(MERGED_PUBLIC_SPEC_RELATIVE);
    const full = loadJson(MERGED_INTEGRATION_SPEC_RELATIVE);
    expect(Object.keys(full.paths ?? {}).length).toBeGreaterThanOrEqual(
      Object.keys(pub.paths ?? {}).length
    );
  });
});
