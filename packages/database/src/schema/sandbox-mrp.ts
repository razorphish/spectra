import { sql } from 'drizzle-orm';
import { index, integer, jsonb, real, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { catalog, runtimeTenants, spectra } from './control-plane';

const systemActorJsonbDefault = sql.raw(`'{"name":"SYSTEM","userId":null}'::jsonb`);

/** Tenant-scoped demo items for sandbox MRP fixture reads (G10). */
export const sandboxMrpItems = spectra.table(
  'sandbox_mrp_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => runtimeTenants.id, { onDelete: 'cascade' }),
    sku: text('sku').notNull(),
    description: text('description'),
    unitOfMeasure: text('unit_of_measure'),
    itemType: text('item_type').notNull(),
    defaultLeadTimeDays: integer('default_lead_time_days'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    statusId: uuid('status_id')
      .notNull()
      .references(() => catalog.id, { onDelete: 'restrict' }),
    createdBy: jsonb('created_by').notNull().default(systemActorJsonbDefault),
    updatedBy: jsonb('updated_by').notNull().default(systemActorJsonbDefault),
  },
  (t) => [
    uniqueIndex('sandbox_mrp_items_tenant_sku_active_uq')
      .on(t.tenantId, t.sku)
      .where(sql`${t.deletedAt} is null`),
    index('sandbox_mrp_items_tenant_id_idx').on(t.tenantId),
  ],
);

export const sandboxMrpSuppliers = spectra.table(
  'sandbox_mrp_suppliers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => runtimeTenants.id, { onDelete: 'cascade' }),
    supplierCode: text('supplier_code').notNull(),
    name: text('name').notNull(),
    contactNotes: text('contact_notes'),
    defaultLeadTimeDays: integer('default_lead_time_days'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    statusId: uuid('status_id')
      .notNull()
      .references(() => catalog.id, { onDelete: 'restrict' }),
    createdBy: jsonb('created_by').notNull().default(systemActorJsonbDefault),
    updatedBy: jsonb('updated_by').notNull().default(systemActorJsonbDefault),
  },
  (t) => [
    uniqueIndex('sandbox_mrp_suppliers_tenant_code_active_uq')
      .on(t.tenantId, t.supplierCode)
      .where(sql`${t.deletedAt} is null`),
    index('sandbox_mrp_suppliers_tenant_id_idx').on(t.tenantId),
  ],
);

export const sandboxMrpBomLines = spectra.table(
  'sandbox_mrp_bom_lines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => runtimeTenants.id, { onDelete: 'cascade' }),
    parentItemId: uuid('parent_item_id')
      .notNull()
      .references(() => sandboxMrpItems.id, { onDelete: 'cascade' }),
    childItemId: uuid('child_item_id')
      .notNull()
      .references(() => sandboxMrpItems.id, { onDelete: 'cascade' }),
    quantityPer: real('quantity_per').notNull(),
    scrapFactor: real('scrap_factor'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    statusId: uuid('status_id')
      .notNull()
      .references(() => catalog.id, { onDelete: 'restrict' }),
    createdBy: jsonb('created_by').notNull().default(systemActorJsonbDefault),
    updatedBy: jsonb('updated_by').notNull().default(systemActorJsonbDefault),
  },
  (t) => [
    index('sandbox_mrp_bom_lines_tenant_parent_idx').on(t.tenantId, t.parentItemId),
    index('sandbox_mrp_bom_lines_tenant_child_idx').on(t.tenantId, t.childItemId),
  ],
);

export const sandboxMrpInventoryBalances = spectra.table(
  'sandbox_mrp_inventory_balances',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => runtimeTenants.id, { onDelete: 'cascade' }),
    itemId: uuid('item_id')
      .notNull()
      .references(() => sandboxMrpItems.id, { onDelete: 'cascade' }),
    siteCode: text('site_code').notNull(),
    quantityOnHand: integer('quantity_on_hand').notNull(),
    quantityAllocated: integer('quantity_allocated'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    statusId: uuid('status_id')
      .notNull()
      .references(() => catalog.id, { onDelete: 'restrict' }),
    createdBy: jsonb('created_by').notNull().default(systemActorJsonbDefault),
    updatedBy: jsonb('updated_by').notNull().default(systemActorJsonbDefault),
  },
  (t) => [
    uniqueIndex('sandbox_mrp_inv_bal_tenant_item_site_active_uq')
      .on(t.tenantId, t.itemId, t.siteCode)
      .where(sql`${t.deletedAt} is null`),
    index('sandbox_mrp_inventory_balances_tenant_id_idx').on(t.tenantId),
  ],
);

export const sandboxMrpWorkOrders = spectra.table(
  'sandbox_mrp_work_orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => runtimeTenants.id, { onDelete: 'cascade' }),
    woNumber: text('wo_number').notNull(),
    assemblyItemId: uuid('assembly_item_id')
      .notNull()
      .references(() => sandboxMrpItems.id, { onDelete: 'restrict' }),
    quantityReleased: integer('quantity_released').notNull(),
    quantityCompleted: integer('quantity_completed').notNull().default(0),
    status: text('status').notNull(),
    dueDate: timestamp('due_date', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    statusId: uuid('status_id')
      .notNull()
      .references(() => catalog.id, { onDelete: 'restrict' }),
    createdBy: jsonb('created_by').notNull().default(systemActorJsonbDefault),
    updatedBy: jsonb('updated_by').notNull().default(systemActorJsonbDefault),
  },
  (t) => [
    uniqueIndex('sandbox_mrp_work_orders_tenant_wo_active_uq')
      .on(t.tenantId, t.woNumber)
      .where(sql`${t.deletedAt} is null`),
    index('sandbox_mrp_work_orders_tenant_id_idx').on(t.tenantId),
  ],
);

export const sandboxMrpPurchaseOrders = spectra.table(
  'sandbox_mrp_purchase_orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => runtimeTenants.id, { onDelete: 'cascade' }),
    poNumber: text('po_number').notNull(),
    lineNo: integer('line_no').notNull(),
    supplierId: uuid('supplier_id')
      .notNull()
      .references(() => sandboxMrpSuppliers.id, { onDelete: 'restrict' }),
    itemId: uuid('item_id')
      .notNull()
      .references(() => sandboxMrpItems.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull(),
    status: text('status').notNull(),
    dueDate: timestamp('due_date', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    statusId: uuid('status_id')
      .notNull()
      .references(() => catalog.id, { onDelete: 'restrict' }),
    createdBy: jsonb('created_by').notNull().default(systemActorJsonbDefault),
    updatedBy: jsonb('updated_by').notNull().default(systemActorJsonbDefault),
  },
  (t) => [
    uniqueIndex('sandbox_mrp_po_tenant_po_line_active_uq')
      .on(t.tenantId, t.poNumber, t.lineNo)
      .where(sql`${t.deletedAt} is null`),
    index('sandbox_mrp_purchase_orders_tenant_id_idx').on(t.tenantId),
  ],
);

export const sandboxMrpRoutingOperations = spectra.table(
  'sandbox_mrp_routing_operations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => runtimeTenants.id, { onDelete: 'cascade' }),
    itemId: uuid('item_id')
      .notNull()
      .references(() => sandboxMrpItems.id, { onDelete: 'cascade' }),
    sequenceNo: integer('sequence_no').notNull(),
    operationCode: text('operation_code').notNull(),
    operationName: text('operation_name').notNull(),
    workCenter: text('work_center').notNull(),
    plannedTimeMinutes: integer('planned_time_minutes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    statusId: uuid('status_id')
      .notNull()
      .references(() => catalog.id, { onDelete: 'restrict' }),
    createdBy: jsonb('created_by').notNull().default(systemActorJsonbDefault),
    updatedBy: jsonb('updated_by').notNull().default(systemActorJsonbDefault),
  },
  (t) => [
    uniqueIndex('sandbox_mrp_routing_tenant_item_seq_active_uq')
      .on(t.tenantId, t.itemId, t.sequenceNo)
      .where(sql`${t.deletedAt} is null`),
    index('sandbox_mrp_routing_operations_tenant_id_idx').on(t.tenantId),
  ],
);

export const sandboxMrpInventoryTransactions = spectra.table(
  'sandbox_mrp_inventory_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => runtimeTenants.id, { onDelete: 'cascade' }),
    itemId: uuid('item_id')
      .notNull()
      .references(() => sandboxMrpItems.id, { onDelete: 'cascade' }),
    transactionType: text('transaction_type').notNull(),
    quantity: integer('quantity').notNull(),
    workOrderId: uuid('work_order_id').references(() => sandboxMrpWorkOrders.id, {
      onDelete: 'set null',
    }),
    purchaseOrderId: uuid('purchase_order_id').references(() => sandboxMrpPurchaseOrders.id, {
      onDelete: 'set null',
    }),
    reference: text('reference'),
    effectiveAt: timestamp('effective_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    statusId: uuid('status_id')
      .notNull()
      .references(() => catalog.id, { onDelete: 'restrict' }),
    createdBy: jsonb('created_by').notNull().default(systemActorJsonbDefault),
    updatedBy: jsonb('updated_by').notNull().default(systemActorJsonbDefault),
  },
  (t) => [index('sandbox_mrp_inv_txn_tenant_effective_idx').on(t.tenantId, t.effectiveAt)],
);

export const sandboxMrpDemandForecasts = spectra.table(
  'sandbox_mrp_demand_forecasts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => runtimeTenants.id, { onDelete: 'cascade' }),
    itemId: uuid('item_id')
      .notNull()
      .references(() => sandboxMrpItems.id, { onDelete: 'cascade' }),
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    bucketLabel: text('bucket_label'),
    forecastQty: integer('forecast_qty').notNull(),
    horizonWeeks: integer('horizon_weeks'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    statusId: uuid('status_id')
      .notNull()
      .references(() => catalog.id, { onDelete: 'restrict' }),
    createdBy: jsonb('created_by').notNull().default(systemActorJsonbDefault),
    updatedBy: jsonb('updated_by').notNull().default(systemActorJsonbDefault),
  },
  (t) => [
    uniqueIndex('sandbox_mrp_forecast_tenant_item_period_active_uq')
      .on(t.tenantId, t.itemId, t.periodStart)
      .where(sql`${t.deletedAt} is null`),
    index('sandbox_mrp_demand_forecasts_tenant_id_idx').on(t.tenantId),
  ],
);
