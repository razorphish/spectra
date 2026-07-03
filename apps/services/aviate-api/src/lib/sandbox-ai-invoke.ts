import { and, asc, desc, eq, gt, gte, inArray, isNull, like, lt, lte, ne, type SQL } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';

import type { SpectraDb } from '@spectra/database';
import {
  sandboxMrpBomLines,
  sandboxMrpDemandForecasts,
  sandboxMrpInventoryBalances,
  sandboxMrpInventoryTransactions,
  sandboxMrpItems,
  sandboxMrpPurchaseOrders,
  sandboxMrpRoutingOperations,
  sandboxMrpSuppliers,
  sandboxMrpWorkOrders,
  SANDBOX_MRP_FIXTURE_COLUMNS,
  SANDBOX_MRP_FIXTURE_LIMIT_CAP,
  SANDBOX_MRP_FIXTURE_TABLE_NAMES,
  type SandboxAiFilterClause,
  type SandboxAiFilterOperator,
  type SandboxAiSortClause,
  type SandboxMrpFixtureTableName,
} from '@spectra/database';

export type HostedCustomEndpointInvokeContext = {
  db: SpectraDb;
  tenantId: string;
};

const FIXTURE_ROW_CAP = SANDBOX_MRP_FIXTURE_LIMIT_CAP;

/** Allowlisted table objects, keyed by physical table name (matches SANDBOX_MRP_FIXTURE_TABLE_NAMES). */
const FIXTURE_TABLES: Record<SandboxMrpFixtureTableName, PgTable> = {
  sandbox_mrp_items: sandboxMrpItems,
  sandbox_mrp_bom_lines: sandboxMrpBomLines,
  sandbox_mrp_inventory_balances: sandboxMrpInventoryBalances,
  sandbox_mrp_work_orders: sandboxMrpWorkOrders,
  sandbox_mrp_suppliers: sandboxMrpSuppliers,
  sandbox_mrp_purchase_orders: sandboxMrpPurchaseOrders,
  sandbox_mrp_routing_operations: sandboxMrpRoutingOperations,
  sandbox_mrp_inventory_transactions: sandboxMrpInventoryTransactions,
  sandbox_mrp_demand_forecasts: sandboxMrpDemandForecasts,
};

function columnFor(table: SandboxMrpFixtureTableName, prop: string): PgColumn | null {
  if (!SANDBOX_MRP_FIXTURE_COLUMNS[table].includes(prop)) return null;
  const col = (FIXTURE_TABLES[table] as unknown as Record<string, PgColumn>)[prop];
  return col ?? null;
}

function buildFilter(col: PgColumn, op: SandboxAiFilterOperator, val: unknown): SQL | null {
  switch (op) {
    case 'eq':
      return eq(col, val);
    case 'ne':
      return ne(col, val);
    case 'gt':
      return gt(col, val);
    case 'gte':
      return gte(col, val);
    case 'lt':
      return lt(col, val);
    case 'lte':
      return lte(col, val);
    case 'like':
      return like(col, String(val));
    case 'in':
      return Array.isArray(val) ? inArray(col, val) : null;
    default:
      return null;
  }
}

/**
 * Executes persisted `developer_ai_endpoint_versions.spec` (GAP-1 kinds + G10 fixture reads).
 * `sandbox_mrp_fixture_read` never executes client SQL; it only queries allowlisted tables and
 * columns with an injected `tenant_id` filter and `deleted_at IS NULL`. Optional `where` / `sort`
 * / `select` / `limit` are mapped from the validated spec to Drizzle operators via the allowlist.
 */
export async function executeHostedCustomEndpointSpec(
  ctx: HostedCustomEndpointInvokeContext,
  spec: Record<string, unknown>,
  requestBody: unknown,
): Promise<{ httpStatus: number; json: unknown }> {
  const kind = spec['execution_kind'];
  if (kind === 'static_response') {
    const resp = spec['response'];
    if (resp && typeof resp === 'object') {
      const r = resp as Record<string, unknown>;
      const status = typeof r['status'] === 'number' && r['status'] >= 100 && r['status'] < 600 ? r['status'] : 200;
      return { httpStatus: status, json: r['body'] ?? {} };
    }
    return { httpStatus: 200, json: {} };
  }
  if (kind === 'json_transform') {
    return { httpStatus: 200, json: { input: requestBody ?? null } };
  }
  if (kind === 'sandbox_mrp_fixture_read') {
    const table = spec['table'];
    if (typeof table !== 'string' || !(SANDBOX_MRP_FIXTURE_TABLE_NAMES as readonly string[]).includes(table)) {
      return {
        httpStatus: 400,
        json: { error: 'policy_violation', message: 'Invalid fixture table for execution_kind.' },
      };
    }
    const tableName = table as SandboxMrpFixtureTableName;
    const tableObj = FIXTURE_TABLES[tableName];
    const cols = tableObj as unknown as Record<string, PgColumn>;

    // Tenant scope + soft-delete are always injected — never client-controlled.
    const conditions: SQL[] = [eq(cols['tenantId'], ctx.tenantId), isNull(cols['deletedAt'])];

    const where = Array.isArray(spec['where']) ? (spec['where'] as SandboxAiFilterClause[]) : [];
    for (const clause of where) {
      const col = columnFor(tableName, clause.col);
      if (!col) {
        return { httpStatus: 400, json: { error: 'policy_violation', message: `Invalid filter column: ${clause.col}` } };
      }
      const cond = buildFilter(col, clause.op, clause.val);
      if (!cond) {
        return { httpStatus: 400, json: { error: 'policy_violation', message: `Invalid filter operator: ${clause.op}` } };
      }
      conditions.push(cond);
    }

    const select = Array.isArray(spec['select']) ? (spec['select'] as string[]) : [];
    const projection: Record<string, PgColumn> = {};
    for (const prop of select) {
      const col = columnFor(tableName, prop);
      if (!col) {
        return { httpStatus: 400, json: { error: 'policy_violation', message: `Invalid select column: ${prop}` } };
      }
      projection[prop] = col;
    }

    const sort = Array.isArray(spec['sort']) ? (spec['sort'] as SandboxAiSortClause[]) : [];
    const orderBy: SQL[] = [];
    for (const s of sort) {
      const col = columnFor(tableName, s.col);
      if (!col) {
        return { httpStatus: 400, json: { error: 'policy_violation', message: `Invalid sort column: ${s.col}` } };
      }
      orderBy.push(s.dir === 'desc' ? desc(col) : asc(col));
    }

    const rawLimit = typeof spec['limit'] === 'number' ? spec['limit'] : FIXTURE_ROW_CAP;
    const limit = Math.min(Math.max(1, Math.trunc(rawLimit)), FIXTURE_ROW_CAP);

    // Cast to a permissive builder for conditional chaining; safety is enforced by the allowlist above.
    /* eslint-disable @typescript-eslint/no-explicit-any */
    let query: any = (Object.keys(projection).length ? ctx.db.select(projection) : ctx.db.select())
      .from(tableObj)
      .where(and(...conditions));
    if (orderBy.length) {
      query = query.orderBy(...orderBy);
    }
    const rows = (await query.limit(limit)) as Record<string, unknown>[];
    /* eslint-enable @typescript-eslint/no-explicit-any */
    return { httpStatus: 200, json: { table, rows } };
  }
  return { httpStatus: 500, json: { error: 'unsupported_execution_kind' } };
}
