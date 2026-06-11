/**
 * MVP M2M scope → HTTP route rules (deploy-time source of truth).
 * @see docs/plans/m2m-client-credentials-edge-auth.md — Scope management (M2M)
 */

export const SCOPE_MAP_VERSION = 2 as const;

/** Ordered: first match wins (prefer longer prefixes first in array order). */
export const scopePathRules: readonly {
  readonly method: string;
  readonly pathPrefix: string;
  readonly requiredScope: string;
}[] = [
  { method: 'GET', pathPrefix: '/v1/platform/hello', requiredScope: 'platform:read' },
  {
    method: 'POST',
    pathPrefix: '/v1/platform/tenant-runtime/endpoints',
    requiredScope: 'custom_endpoints:invoke',
  },
];

/** Scopes that may appear on Integration / token ceiling (subset validated at mint). */
export const KNOWN_M2M_SCOPES = ['platform:read', 'custom_endpoints:invoke'] as const;

export type KnownM2mScope = (typeof KNOWN_M2M_SCOPES)[number];

export function isKnownM2mScope(s: string): s is KnownM2mScope {
  return (KNOWN_M2M_SCOPES as readonly string[]).includes(s);
}

export function requiredScopeForRequest(method: string, path: string): string | null {
  const upper = method.toUpperCase();
  for (const rule of scopePathRules) {
    if (rule.method !== upper) continue;
    if (path === rule.pathPrefix || path.startsWith(`${rule.pathPrefix}/`)) {
      return rule.requiredScope;
    }
  }
  return null;
}

/**
 * Returns true if the caller holds every required scope (space-delimited JWT scope → array).
 */
export function scopesAllowRequest(
  grantedScopes: readonly string[],
  method: string,
  path: string
): { allowed: boolean; requiredScope: string | null } {
  const required = requiredScopeForRequest(method, path);
  if (required === null) return { allowed: false, requiredScope: null };
  const set = new Set(grantedScopes);
  return { allowed: set.has(required), requiredScope: required };
}

/** Snapshot for `scope-map.json` artifact + contract tests. */
export function exportScopeMapForContract(): {
  version: typeof SCOPE_MAP_VERSION;
  rules: typeof scopePathRules;
  knownScopes: typeof KNOWN_M2M_SCOPES;
} {
  return {
    version: SCOPE_MAP_VERSION,
    rules: [...scopePathRules],
    knownScopes: [...KNOWN_M2M_SCOPES],
  };
}
