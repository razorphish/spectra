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

/**
 * Allowlisted, queryable/selectable columns per fixture table — keyed by the Drizzle
 * model property name (camelCase). Filter/sort/select specs may only reference these,
 * and the executor maps them to column objects from this same allowlist (never raw SQL).
 */
export const SANDBOX_MRP_FIXTURE_COLUMNS: Record<SandboxMrpFixtureTableName, readonly string[]> = {
  sandbox_mrp_items: ['id', 'sku', 'description', 'unitOfMeasure', 'itemType', 'defaultLeadTimeDays', 'createdAt'],
  sandbox_mrp_bom_lines: ['id', 'parentItemId', 'childItemId', 'quantityPer', 'scrapFactor', 'createdAt'],
  sandbox_mrp_inventory_balances: ['id', 'itemId', 'siteCode', 'quantityOnHand', 'quantityAllocated', 'createdAt'],
  sandbox_mrp_work_orders: ['id', 'woNumber', 'assemblyItemId', 'quantityReleased', 'quantityCompleted', 'status', 'dueDate', 'createdAt'],
  sandbox_mrp_suppliers: ['id', 'supplierCode', 'name', 'contactNotes', 'defaultLeadTimeDays', 'createdAt'],
  sandbox_mrp_purchase_orders: ['id', 'poNumber', 'lineNo', 'supplierId', 'itemId', 'quantity', 'status', 'dueDate', 'createdAt'],
  sandbox_mrp_routing_operations: ['id', 'itemId', 'sequenceNo', 'operationCode', 'operationName', 'workCenter', 'plannedTimeMinutes', 'createdAt'],
  sandbox_mrp_inventory_transactions: ['id', 'itemId', 'transactionType', 'quantity', 'workOrderId', 'purchaseOrderId', 'reference', 'effectiveAt', 'createdAt'],
  sandbox_mrp_demand_forecasts: ['id', 'itemId', 'periodStart', 'bucketLabel', 'forecastQty', 'horizonWeeks', 'createdAt'],
};

/** Comparison operators allowed in a `sandbox_mrp_fixture_read` `where` clause. */
export const SANDBOX_AI_FILTER_OPERATORS = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'like', 'in'] as const;
export type SandboxAiFilterOperator = (typeof SANDBOX_AI_FILTER_OPERATORS)[number];

/** Maximum rows a fixture read may return (hard cap, also enforced in the executor). */
export const SANDBOX_MRP_FIXTURE_LIMIT_CAP = 500;

export type SandboxAiFilterClause = { col: string; op: SandboxAiFilterOperator; val: unknown };
export type SandboxAiSortClause = { col: string; dir: 'asc' | 'desc' };

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

function isAllowedColumn(table: SandboxMrpFixtureTableName, col: unknown): col is string {
  return typeof col === 'string' && SANDBOX_MRP_FIXTURE_COLUMNS[table].includes(col);
}

/** Validates the optional `where` / `sort` / `select` / `limit` of a fixture-read spec. */
function validateFixtureQuery(table: SandboxMrpFixtureTableName, o: Record<string, unknown>): string | null {
  if (o['where'] !== undefined) {
    if (!Array.isArray(o['where'])) return 'where_must_be_array';
    for (const raw of o['where']) {
      if (!raw || typeof raw !== 'object') return 'invalid_where_clause';
      const c = raw as Record<string, unknown>;
      if (!isAllowedColumn(table, c['col'])) return 'invalid_where_column';
      if (typeof c['op'] !== 'string' || !(SANDBOX_AI_FILTER_OPERATORS as readonly string[]).includes(c['op'])) {
        return 'invalid_where_operator';
      }
      if (c['op'] === 'in') {
        if (!Array.isArray(c['val']) || c['val'].length === 0) return 'in_requires_nonempty_array';
      } else if (c['val'] === undefined || c['val'] === null || typeof c['val'] === 'object') {
        return 'invalid_where_value';
      }
    }
  }
  if (o['sort'] !== undefined) {
    if (!Array.isArray(o['sort'])) return 'sort_must_be_array';
    for (const raw of o['sort']) {
      if (!raw || typeof raw !== 'object') return 'invalid_sort_clause';
      const s = raw as Record<string, unknown>;
      if (!isAllowedColumn(table, s['col'])) return 'invalid_sort_column';
      if (s['dir'] !== 'asc' && s['dir'] !== 'desc') return 'invalid_sort_direction';
    }
  }
  if (o['select'] !== undefined) {
    if (!Array.isArray(o['select']) || o['select'].length === 0) return 'select_must_be_nonempty_array';
    for (const col of o['select']) {
      if (!isAllowedColumn(table, col)) return 'invalid_select_column';
    }
  }
  if (o['limit'] !== undefined) {
    const limit = o['limit'];
    if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1 || limit > SANDBOX_MRP_FIXTURE_LIMIT_CAP) {
      return 'invalid_limit';
    }
  }
  return null;
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
    const queryError = validateFixtureQuery(table as SandboxMrpFixtureTableName, o);
    if (queryError) return { ok: false, error: queryError };
    return { ok: true, executionKind: 'sandbox_mrp_fixture_read' };
  }

  if (kind === 'static_response' || kind === 'json_transform') {
    return { ok: true, executionKind: kind };
  }

  return { ok: false, error: 'invalid_execution_kind' };
}
