/**
 * MVP M2M scope → HTTP route rules (deploy-time source of truth).
 * @see docs/plans/m2m-client-credentials-edge-auth.md — Scope management (M2M)
 */

export const SCOPE_MAP_VERSION = 3 as const;

/** Ordered: first match wins (prefer longer prefixes first in array order). */
export const scopePathRules: readonly {
  readonly method: string;
  readonly pathPrefix: string;
  readonly requiredScope: string;
}[] = [
  // ── platform:read ─────────────────────────────────────────────────────────
  { method: 'GET', pathPrefix: '/v1/platform/hello', requiredScope: 'platform:read' },
  { method: 'GET', pathPrefix: '/v1/platform/tenant', requiredScope: 'platform:read' },
  { method: 'GET', pathPrefix: '/v1/platform/ai', requiredScope: 'platform:read' },
  { method: 'GET', pathPrefix: '/v1/platform/config', requiredScope: 'platform:read' },
  { method: 'GET', pathPrefix: '/v1/platform/notifications', requiredScope: 'platform:read' },
  { method: 'PATCH', pathPrefix: '/v1/platform/notifications', requiredScope: 'platform:read' },
  { method: 'DELETE', pathPrefix: '/v1/platform/notifications', requiredScope: 'platform:read' },
  { method: 'GET', pathPrefix: '/v1/platform/search', requiredScope: 'platform:read' },
  // ── custom_endpoints:invoke ────────────────────────────────────────────────
  { method: 'POST', pathPrefix: '/v1/platform/tenant-runtime/endpoints', requiredScope: 'custom_endpoints:invoke' },
  { method: 'POST', pathPrefix: '/v1/platform/ai/endpoints', requiredScope: 'custom_endpoints:invoke' },
  { method: 'POST', pathPrefix: '/v1/platform/ai/batch-invoke', requiredScope: 'custom_endpoints:invoke' },
  // ── analytics:read ─────────────────────────────────────────────────────────
  { method: 'GET', pathPrefix: '/v1/platform/analytics', requiredScope: 'analytics:read' },
  // ── integrations:read ──────────────────────────────────────────────────────
  { method: 'GET', pathPrefix: '/v1/platform/integrations', requiredScope: 'integrations:read' },
  // ── billing:read ───────────────────────────────────────────────────────────
  { method: 'GET', pathPrefix: '/v1/platform/billing', requiredScope: 'billing:read' },
  // ── webhooks:manage ────────────────────────────────────────────────────────
  { method: 'GET', pathPrefix: '/v1/platform/webhooks', requiredScope: 'webhooks:manage' },
  { method: 'POST', pathPrefix: '/v1/platform/webhooks', requiredScope: 'webhooks:manage' },
  { method: 'PATCH', pathPrefix: '/v1/platform/webhooks', requiredScope: 'webhooks:manage' },
  { method: 'DELETE', pathPrefix: '/v1/platform/webhooks', requiredScope: 'webhooks:manage' },
  // ── apikeys:manage ─────────────────────────────────────────────────────────
  { method: 'GET', pathPrefix: '/v1/platform/api-keys', requiredScope: 'apikeys:manage' },
  { method: 'POST', pathPrefix: '/v1/platform/api-keys', requiredScope: 'apikeys:manage' },
  { method: 'PATCH', pathPrefix: '/v1/platform/api-keys', requiredScope: 'apikeys:manage' },
  { method: 'DELETE', pathPrefix: '/v1/platform/api-keys', requiredScope: 'apikeys:manage' },
  // ── team:read ──────────────────────────────────────────────────────────────
  { method: 'GET', pathPrefix: '/v1/platform/team', requiredScope: 'team:read' },
];

/** Scopes that may appear on Integration / token ceiling (subset validated at mint). */
export const KNOWN_M2M_SCOPES = [
  'platform:read',
  'custom_endpoints:invoke',
  'analytics:read',
  'integrations:read',
  'billing:read',
  'webhooks:manage',
  'apikeys:manage',
  'team:read',
] as const;

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
