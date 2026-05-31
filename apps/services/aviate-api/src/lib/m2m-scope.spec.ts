import { exportScopeMapForContract, scopesAllowRequest } from '../../../../../packages/auth/src/lib/scope-map';

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
