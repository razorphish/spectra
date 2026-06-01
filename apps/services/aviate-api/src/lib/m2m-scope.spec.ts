import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { exportScopeMapForContract, scopesAllowRequest } from '../../../../../packages/auth/src/lib/scope-map';

function loadPublicOpenApiSpec(): { paths: Record<string, Record<string, unknown>> } {
  const full = join(__dirname, '../assets/spectra-public-api.json');
  if (!existsSync(full)) {
    throw new Error(`Missing ${full}. Run \`nx run openapi:merge\` before this test.`);
  }
  return JSON.parse(readFileSync(full, 'utf8')) as {
    paths: Record<string, Record<string, unknown>>;
  };
}

function openApiHasOperation(
  paths: Record<string, Record<string, unknown>>,
  method: string,
  pathPrefix: string,
): boolean {
  const m = method.toLowerCase();
  for (const pathKey of Object.keys(paths)) {
    if (pathKey !== pathPrefix && !pathKey.startsWith(`${pathPrefix}/`)) continue;
    const item = paths[pathKey];
    if (!item || typeof item !== 'object') continue;
    if (m in item) return true;
  }
  return false;
}

describe('M2M scope map (contract)', () => {
  it('matches snapshot for known scopes', () => {
    const snap = exportScopeMapForContract();
    expect(snap.version).toBe(1);
    expect(snap.knownScopes).toContain('platform:read');
  });

  it('allows platform:read for GET /v1/platform/hello', () => {
    expect(scopesAllowRequest(['platform:read'], 'GET', '/v1/platform/hello').allowed).toBe(true);
    expect(scopesAllowRequest([], 'GET', '/v1/platform/hello').allowed).toBe(false);
  });
});

/**
 * CI contract: every scopePathRules entry must match an operation in the **public limited** OpenAPI artifact
 * (`spectra-public-api.json`). See `docs/contracts/scope-map-openapi-ci.md`.
 */
describe('scope map vs public OpenAPI (CI contract)', () => {
  it('every scopePathRules entry matches an operation in spectra-public-api.json', () => {
    const { paths } = loadPublicOpenApiSpec();
    const { rules } = exportScopeMapForContract();
    for (const rule of rules) {
      expect(openApiHasOperation(paths, rule.method, rule.pathPrefix)).toBe(true);
    }
  });
});
