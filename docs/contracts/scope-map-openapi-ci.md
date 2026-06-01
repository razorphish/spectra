# Scope map vs public OpenAPI — CI contract

**Input artifact:** `apps/services/aviate-api/src/assets/spectra-public-api.json` (same as `GET /openapi.json` public limited catalog). Produced by `nx run openapi:merge`.

**Source of truth for rules:** [`packages/auth/src/lib/scope-map.ts`](../../packages/auth/src/lib/scope-map.ts) — `exportScopeMapForContract().rules`.

## Rule direction A (enforced)

For every entry `{ method, pathPrefix, requiredScope }` in `scopePathRules`, there MUST exist at least one OpenAPI **path + operation** in the public limited JSON where:

- the OpenAPI path key equals `pathPrefix` or starts with `` `${pathPrefix}/` ``, and  
- the HTTP verb (e.g. `get`, `post`) matches `method` case-insensitively.

If no match → **CI fails** (see `apps/services/aviate-api/src/lib/m2m-scope.spec.ts`).

## Rule direction B (deferred)

Requiring every public OpenAPI operation to have a scope rule is **deferred** until `scopePathRules` covers all M2M-exposed routes; otherwise CI becomes noisy and is disabled.

## Orphan policy

“Orphan” here means a scope rule whose prefix does not match any path in the public spec → **fail** (same test as direction A).

## Related

- [m2m-client-credentials-edge-auth.md](../plans/m2m-client-credentials-edge-auth.md)
