import type { RequestHandler } from 'express';

/** GA audit RBAC — namespaced Auth0 API permissions (see M2M plan §RBAC). */
export const STAFF_PERMISSION_INTEGRATIONS_READ = 'platform:integrations:read';
export const STAFF_PERMISSION_INTEGRATIONS_EXPORT = 'platform:integrations:export';
export const STAFF_PERMISSION_SANDBOX_AI_MODELS_MANAGE = 'platform:sandbox_ai_models:manage';
export const STAFF_PERMISSION_PRICING_PROFILES_MANAGE = 'platform:pricing_profiles:manage';
export const STAFF_PERMISSION_CUSTOM_ENDPOINTS_REVIEW = 'platform:custom_endpoints:review';
export const STAFF_PERMISSION_CUSTOM_ENDPOINTS_PRICING_OVERRIDE = 'platform:custom_endpoints:pricing_override';
export const STAFF_PERMISSION_API_CATALOG_MANAGE = 'platform:api_catalog:manage';

/**
 * Auth0 RBAC typically emits `permissions: string[]` on access tokens.
 * Also accepts OAuth2 `scope` as a space-delimited fallback.
 */
export function staffPermissionSet(claims: Record<string, unknown> | undefined): Set<string> {
  const out = new Set<string>();
  if (!claims) return out;
  const perms = claims['permissions'];
  if (Array.isArray(perms)) {
    for (const p of perms) {
      if (typeof p === 'string' && p.trim()) out.add(p.trim());
    }
  }
  const scope = claims['scope'];
  if (typeof scope === 'string' && scope.trim()) {
    for (const s of scope.trim().split(/\s+/)) {
      if (s) out.add(s);
    }
  }
  return out;
}

export function staffHasPermission(
  claims: Record<string, unknown> | undefined,
  permission: string
): boolean {
  return staffPermissionSet(claims).has(permission);
}

/** When true, missing `permissions` on the token does not block (local dev only). */
function devBypassPermissions(): boolean {
  return (
    process.env['AUTH0_VERIFY_DISABLED'] === 'true' &&
    process.env['ADMIN_UI_API_DEV_GRANT_ALL_STAFF_PERMISSIONS'] === 'true'
  );
}

export function requireStaffPermission(permission: string): RequestHandler {
  return (req, res, next) => {
    const claims = req.auth?.claims;
    if (staffHasPermission(claims, permission)) {
      next();
      return;
    }
    if (devBypassPermissions()) {
      next();
      return;
    }
    res.status(403).json({
      error: 'insufficient_scope',
      message: `Missing required API permission: ${permission}. Enable Auth0 RBAC for this API and grant the permission to the staff role, or set ADMIN_UI_API_DEV_GRANT_ALL_STAFF_PERMISSIONS=true only with AUTH0_VERIFY_DISABLED=true for local development.`,
    });
  };
}
