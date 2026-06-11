import { createHash } from 'node:crypto';

import { and, eq, isNull, sql } from 'drizzle-orm';

import { SYSTEM_ACTOR } from './actor';
import { CATALOG_IDS } from '../schema/catalog-seed-ids';
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
} from '../schema/sandbox-mrp';
import type { SpectraDb } from './connection';

const ACTIVE = CATALOG_IDS.status.active;

function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromTenantId(tenantId: string): number {
  const h = createHash('sha256').update(tenantId, 'utf8').digest();
  return h.readUInt32BE(0);
}

/**
 * Idempotent per-tenant MRP-shaped sandbox fixtures (G10). Skips when rows already exist.
 */
export async function seedSandboxMrpFixturesForTenant(db: SpectraDb, tenantId: string): Promise<void> {
  const [cnt] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(sandboxMrpItems)
    .where(and(eq(sandboxMrpItems.tenantId, tenantId), isNull(sandboxMrpItems.deletedAt)));
  if ((cnt?.n ?? 0) > 0) return;

  const rnd = mulberry32(seedFromTenantId(tenantId));
  const jitter = (base: number, spread: number) => Math.floor(base + rnd() * spread);

  await db.transaction(async (tx) => {
    const [itemA] = await tx
      .insert(sandboxMrpItems)
      .values({
        tenantId,
        sku: 'SKU-DEMO-A',
        description: 'Demo purchased component',
        unitOfMeasure: 'EA',
        itemType: 'purchased',
        defaultLeadTimeDays: jitter(3, 5),
        statusId: ACTIVE,
        createdBy: SYSTEM_ACTOR,
        updatedBy: SYSTEM_ACTOR,
      })
      .returning();

    const [itemB] = await tx
      .insert(sandboxMrpItems)
      .values({
        tenantId,
        sku: 'SKU-DEMO-FG',
        description: 'Demo finished good',
        unitOfMeasure: 'EA',
        itemType: 'manufactured',
        defaultLeadTimeDays: jitter(7, 4),
        statusId: ACTIVE,
        createdBy: SYSTEM_ACTOR,
        updatedBy: SYSTEM_ACTOR,
      })
      .returning();

    if (!itemA?.id || !itemB?.id) return;

    const [sup] = await tx
      .insert(sandboxMrpSuppliers)
      .values({
        tenantId,
        supplierCode: 'ACME',
        name: 'Acme Supply',
        contactNotes: 'Sandbox fixture supplier',
        defaultLeadTimeDays: 5,
        statusId: ACTIVE,
        createdBy: SYSTEM_ACTOR,
        updatedBy: SYSTEM_ACTOR,
      })
      .returning();
    if (!sup?.id) return;

    await tx.insert(sandboxMrpBomLines).values({
      tenantId,
      parentItemId: itemB.id,
      childItemId: itemA.id,
      quantityPer: 2,
      scrapFactor: 0.05,
      statusId: ACTIVE,
      createdBy: SYSTEM_ACTOR,
      updatedBy: SYSTEM_ACTOR,
    });

    await tx.insert(sandboxMrpInventoryBalances).values({
      tenantId,
      itemId: itemA.id,
      siteCode: 'MAIN',
      quantityOnHand: jitter(100, 50),
      quantityAllocated: 5,
      statusId: ACTIVE,
      createdBy: SYSTEM_ACTOR,
      updatedBy: SYSTEM_ACTOR,
    });

    const [wo] = await tx
      .insert(sandboxMrpWorkOrders)
      .values({
        tenantId,
        woNumber: `WO-${tenantId.slice(0, 8)}`,
        assemblyItemId: itemB.id,
        quantityReleased: 10,
        quantityCompleted: 2,
        status: 'released',
        dueDate: new Date(Date.now() + jitter(7, 10) * 86400000),
        statusId: ACTIVE,
        createdBy: SYSTEM_ACTOR,
        updatedBy: SYSTEM_ACTOR,
      })
      .returning();
    if (!wo?.id) return;

    const [po] = await tx
      .insert(sandboxMrpPurchaseOrders)
      .values({
        tenantId,
        poNumber: `PO-${tenantId.slice(0, 8)}`,
        lineNo: 1,
        supplierId: sup.id,
        itemId: itemA.id,
        quantity: 25,
        status: 'open',
        dueDate: new Date(Date.now() + jitter(14, 7) * 86400000),
        statusId: ACTIVE,
        createdBy: SYSTEM_ACTOR,
        updatedBy: SYSTEM_ACTOR,
      })
      .returning();
    if (!po?.id) return;

    await tx.insert(sandboxMrpRoutingOperations).values({
      tenantId,
      itemId: itemB.id,
      sequenceNo: 10,
      operationCode: 'ASM',
      operationName: 'Assembly',
      workCenter: 'WC-01',
      plannedTimeMinutes: 30,
      statusId: ACTIVE,
      createdBy: SYSTEM_ACTOR,
      updatedBy: SYSTEM_ACTOR,
    });

    await tx.insert(sandboxMrpInventoryTransactions).values({
      tenantId,
      itemId: itemA.id,
      transactionType: 'receipt',
      quantity: 40,
      workOrderId: null,
      purchaseOrderId: po.id,
      reference: `PO-${tenantId.slice(0, 8)}`,
      effectiveAt: new Date(),
      statusId: ACTIVE,
      createdBy: SYSTEM_ACTOR,
      updatedBy: SYSTEM_ACTOR,
    });

    await tx.insert(sandboxMrpDemandForecasts).values({
      tenantId,
      itemId: itemB.id,
      periodStart: new Date(),
      bucketLabel: 'W+0',
      forecastQty: jitter(20, 15),
      horizonWeeks: 8,
      statusId: ACTIVE,
      createdBy: SYSTEM_ACTOR,
      updatedBy: SYSTEM_ACTOR,
    });
  });
}
