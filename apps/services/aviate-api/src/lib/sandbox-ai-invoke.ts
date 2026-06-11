import { and, eq, isNull } from 'drizzle-orm';

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
  SANDBOX_MRP_FIXTURE_TABLE_NAMES,
} from '@spectra/database';

export type HostedCustomEndpointInvokeContext = {
  db: SpectraDb;
  tenantId: string;
};

const FIXTURE_ROW_CAP = 500;

/**
 * Executes persisted `developer_ai_endpoint_versions.spec` (GAP-1 kinds + G10 fixture reads).
 * `sandbox_mrp_fixture_read` never executes client SQL; only allowlisted tables with injected `tenant_id`.
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

    switch (table) {
      case 'sandbox_mrp_items': {
        const rows = await ctx.db
          .select()
          .from(sandboxMrpItems)
          .where(and(eq(sandboxMrpItems.tenantId, ctx.tenantId), isNull(sandboxMrpItems.deletedAt)))
          .limit(FIXTURE_ROW_CAP);
        return { httpStatus: 200, json: { table, rows } };
      }
      case 'sandbox_mrp_bom_lines': {
        const rows = await ctx.db
          .select()
          .from(sandboxMrpBomLines)
          .where(and(eq(sandboxMrpBomLines.tenantId, ctx.tenantId), isNull(sandboxMrpBomLines.deletedAt)))
          .limit(FIXTURE_ROW_CAP);
        return { httpStatus: 200, json: { table, rows } };
      }
      case 'sandbox_mrp_inventory_balances': {
        const rows = await ctx.db
          .select()
          .from(sandboxMrpInventoryBalances)
          .where(
            and(eq(sandboxMrpInventoryBalances.tenantId, ctx.tenantId), isNull(sandboxMrpInventoryBalances.deletedAt)),
          )
          .limit(FIXTURE_ROW_CAP);
        return { httpStatus: 200, json: { table, rows } };
      }
      case 'sandbox_mrp_work_orders': {
        const rows = await ctx.db
          .select()
          .from(sandboxMrpWorkOrders)
          .where(and(eq(sandboxMrpWorkOrders.tenantId, ctx.tenantId), isNull(sandboxMrpWorkOrders.deletedAt)))
          .limit(FIXTURE_ROW_CAP);
        return { httpStatus: 200, json: { table, rows } };
      }
      case 'sandbox_mrp_suppliers': {
        const rows = await ctx.db
          .select()
          .from(sandboxMrpSuppliers)
          .where(and(eq(sandboxMrpSuppliers.tenantId, ctx.tenantId), isNull(sandboxMrpSuppliers.deletedAt)))
          .limit(FIXTURE_ROW_CAP);
        return { httpStatus: 200, json: { table, rows } };
      }
      case 'sandbox_mrp_purchase_orders': {
        const rows = await ctx.db
          .select()
          .from(sandboxMrpPurchaseOrders)
          .where(
            and(eq(sandboxMrpPurchaseOrders.tenantId, ctx.tenantId), isNull(sandboxMrpPurchaseOrders.deletedAt)),
          )
          .limit(FIXTURE_ROW_CAP);
        return { httpStatus: 200, json: { table, rows } };
      }
      case 'sandbox_mrp_routing_operations': {
        const rows = await ctx.db
          .select()
          .from(sandboxMrpRoutingOperations)
          .where(
            and(eq(sandboxMrpRoutingOperations.tenantId, ctx.tenantId), isNull(sandboxMrpRoutingOperations.deletedAt)),
          )
          .limit(FIXTURE_ROW_CAP);
        return { httpStatus: 200, json: { table, rows } };
      }
      case 'sandbox_mrp_inventory_transactions': {
        const rows = await ctx.db
          .select()
          .from(sandboxMrpInventoryTransactions)
          .where(
            and(
              eq(sandboxMrpInventoryTransactions.tenantId, ctx.tenantId),
              isNull(sandboxMrpInventoryTransactions.deletedAt),
            ),
          )
          .limit(FIXTURE_ROW_CAP);
        return { httpStatus: 200, json: { table, rows } };
      }
      case 'sandbox_mrp_demand_forecasts': {
        const rows = await ctx.db
          .select()
          .from(sandboxMrpDemandForecasts)
          .where(
            and(eq(sandboxMrpDemandForecasts.tenantId, ctx.tenantId), isNull(sandboxMrpDemandForecasts.deletedAt)),
          )
          .limit(FIXTURE_ROW_CAP);
        return { httpStatus: 200, json: { table, rows } };
      }
      default:
        return {
          httpStatus: 400,
          json: { error: 'policy_violation', message: 'Unsupported fixture table.' },
        };
    }
  }
  return { httpStatus: 500, json: { error: 'unsupported_execution_kind' } };
}
