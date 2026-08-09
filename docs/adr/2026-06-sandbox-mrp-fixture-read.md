# ADR: `sandbox_mrp_fixture_read` execution kind

## Status

Accepted (2026-06).

## Context

Sandbox custom endpoint preview invoke (`POST .../ai-endpoints/:id/invoke`) executes a persisted JSON `spec`. Earlier kinds (`static_response`, `json_transform`) could not return tenant-scoped tabular demo data. Product needs **MRP-shaped fixture reads** for realistic portal demos without exposing arbitrary SQL from integrator-authored specs.

## Decision

Add execution kind **`sandbox_mrp_fixture_read`** validated in `validateDeveloperAiEndpointSpec` with a required string field **`table`** that must be one of **nine** allowlisted physical table names:

- `sandbox_mrp_items`
- `sandbox_mrp_bom_lines`
- `sandbox_mrp_inventory_balances`
- `sandbox_mrp_work_orders`
- `sandbox_mrp_suppliers`
- `sandbox_mrp_purchase_orders`
- `sandbox_mrp_routing_operations`
- `sandbox_mrp_inventory_transactions`
- `sandbox_mrp_demand_forecasts`

`executeHostedCustomEndpointSpec` receives **`{ db, tenantId }` from the server only**. Queries always filter by `tenant_id = tenantId` and `deleted_at IS NULL`. No other tables or raw SQL are reachable through this kind.

## MVP schema (locked)

- **Purchase orders:** line-level rows only; repeat `po_number` across lines; no separate PO header table in this phase.
- **Routings:** single combined `sandbox_mrp_routing_operations` table; no split `routings` / `operations` tables.

## Threat model

- **No arbitrary SQL** from client JSON: only fixed Drizzle `select()` branches on the allowlist.
- **Tenant isolation:** `tenant_id` is never taken from the request body for fixture reads; it is always the resolved runtime tenant from the authenticated invoke path.

## Consequences

- New migration `0010_sandbox_mrp_fixtures.sql` creates the nine tables.
- `POST /v1/platform/sandbox/runtime-tenants` seeds fixtures idempotently per tenant after bootstrap.
- Stub generate (`buildStubLlmSpec`) emits `sandbox_mrp_fixture_read` targeting `sandbox_mrp_items` so **Try it** returns non-trivial JSON when seeds ran.
