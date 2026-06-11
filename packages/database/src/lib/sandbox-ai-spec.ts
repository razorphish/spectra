import { createHash } from 'node:crypto';

/** Allowlisted physical tables for `sandbox_mrp_fixture_read` (G10). */
export const SANDBOX_MRP_FIXTURE_TABLE_NAMES = [
  'sandbox_mrp_items',
  'sandbox_mrp_bom_lines',
  'sandbox_mrp_inventory_balances',
  'sandbox_mrp_work_orders',
  'sandbox_mrp_suppliers',
  'sandbox_mrp_purchase_orders',
  'sandbox_mrp_routing_operations',
  'sandbox_mrp_inventory_transactions',
  'sandbox_mrp_demand_forecasts',
] as const;
export type SandboxMrpFixtureTableName = (typeof SANDBOX_MRP_FIXTURE_TABLE_NAMES)[number];

/** GAP-1 v1 GA execution kinds persisted in `developer_ai_endpoint_versions.spec`. */
export const SANDBOX_AI_EXECUTION_KINDS = [
  'static_response',
  'json_transform',
  'sandbox_mrp_fixture_read',
] as const;
export type SandboxAiExecutionKind = (typeof SANDBOX_AI_EXECUTION_KINDS)[number];

export type SandboxAiSpecValidation = { ok: true; executionKind: SandboxAiExecutionKind } | { ok: false; error: string };

export function sha256HexJson(spec: unknown): string {
  const body = JSON.stringify(spec ?? null);
  return createHash('sha256').update(body, 'utf8').digest('hex');
}

/**
 * Minimal structural validation before persisting LLM or manual specs.
 * Extend with OpenAPI / JSON Schema validators as the product hardens.
 */
export function validateDeveloperAiEndpointSpec(spec: unknown): SandboxAiSpecValidation {
  if (!spec || typeof spec !== 'object') {
    return { ok: false, error: 'spec_must_be_object' };
  }
  const o = spec as Record<string, unknown>;
  const kind = o['execution_kind'];
  if (typeof kind !== 'string') {
    return { ok: false, error: 'invalid_execution_kind' };
  }

  if (kind === 'sandbox_mrp_fixture_read') {
    const table = o['table'];
    if (
      typeof table !== 'string' ||
      !(SANDBOX_MRP_FIXTURE_TABLE_NAMES as readonly string[]).includes(table)
    ) {
      return { ok: false, error: 'invalid_fixture_table' };
    }
    return { ok: true, executionKind: 'sandbox_mrp_fixture_read' };
  }

  if (kind === 'static_response' || kind === 'json_transform') {
    return { ok: true, executionKind: kind };
  }

  return { ok: false, error: 'invalid_execution_kind' };
}
