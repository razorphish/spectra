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
const DAY_MS = 86_400_000;

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

/** Purchased components (raw materials / parts). */
const PURCHASED_PARTS: { name: string; uom: string }[] = [
  { name: 'Hex bolt M6x20', uom: 'EA' },
  { name: 'Hex nut M6', uom: 'EA' },
  { name: 'Flat washer M6', uom: 'EA' },
  { name: 'Steel sheet 2mm', uom: 'KG' },
  { name: 'Aluminum extrusion 40x40', uom: 'M' },
  { name: 'Ball bearing 608ZZ', uom: 'EA' },
  { name: 'O-ring 20mm', uom: 'EA' },
  { name: 'Copper wire 1.5mm', uom: 'M' },
  { name: 'PCB blank 4-layer', uom: 'EA' },
  { name: 'Resistor 10k 0603', uom: 'EA' },
  { name: 'Capacitor 100uF', uom: 'EA' },
  { name: 'Microcontroller MCU-32', uom: 'EA' },
  { name: 'DC motor 12V', uom: 'EA' },
  { name: 'Power connector 4-pin', uom: 'EA' },
  { name: 'Plastic housing ABS', uom: 'EA' },
  { name: 'Cooling fan 40mm', uom: 'EA' },
  { name: 'Thermal paste tube', uom: 'EA' },
  { name: 'Rubber gasket 50mm', uom: 'EA' },
  { name: 'Hydraulic seal kit', uom: 'EA' },
  { name: 'Stainless shaft 10mm', uom: 'M' },
];

/** Manufactured assemblies / finished goods. */
const MANUFACTURED_PARTS: string[] = [
  'Control board (PCBA)',
  'Motor driver module',
  'Power supply unit',
  'Gearbox assembly',
  'Pump head assembly',
  'Sensor array module',
  'Enclosure subassembly',
  'Finished pump unit',
  'Conveyor drive unit',
  'Valve manifold assembly',
];

const SUPPLIERS: { code: string; name: string }[] = [
  { code: 'ACME', name: 'Acme Supply Co.' },
  { code: 'GLOBEX', name: 'Globex Components' },
  { code: 'INITECH', name: 'Initech Fasteners' },
  { code: 'UMBRELLA', name: 'Umbrella Materials' },
  { code: 'STARK', name: 'Stark Industrial' },
];

const WO_STATUSES = ['planned', 'released', 'in_progress', 'completed', 'closed'];
const PO_STATUSES = ['open', 'partially_received', 'received', 'closed'];
const TXN_TYPES = ['receipt', 'issue', 'adjustment'];
const OPERATIONS = [
  { code: 'CUT', name: 'Cutting', wc: 'WC-CUT' },
  { code: 'MILL', name: 'Milling', wc: 'WC-MILL' },
  { code: 'WELD', name: 'Welding', wc: 'WC-WELD' },
  { code: 'ASM', name: 'Assembly', wc: 'WC-ASM' },
  { code: 'QA', name: 'Inspection', wc: 'WC-QA' },
  { code: 'PACK', name: 'Packaging', wc: 'WC-PACK' },
];

const pad3 = (n: number): string => String(n).padStart(3, '0');

/**
 * Idempotent per-tenant MRP-shaped sandbox fixtures (G10). Skips when rows already exist.
 * Generates a "living MRP"–sized dataset (items, suppliers, BOM, inventory, work/purchase
 * orders, routings, transactions, forecasts), deterministic per tenant id.
 */
export async function seedSandboxMrpFixturesForTenant(db: SpectraDb, tenantId: string): Promise<void> {
  const [cnt] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(sandboxMrpItems)
    .where(and(eq(sandboxMrpItems.tenantId, tenantId), isNull(sandboxMrpItems.deletedAt)));
  if ((cnt?.n ?? 0) > 0) return;

  const rnd = mulberry32(seedFromTenantId(tenantId));
  const int = (min: number, max: number): number => min + Math.floor(rnd() * (max - min + 1));
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)] as T;
  const short = tenantId.slice(0, 8);
  const audit = { statusId: ACTIVE, createdBy: SYSTEM_ACTOR, updatedBy: SYSTEM_ACTOR } as const;
  const now = Date.now();

  type ItemRow = typeof sandboxMrpItems.$inferSelect;
  type SupplierRow = typeof sandboxMrpSuppliers.$inferSelect;
  type WorkOrderRow = typeof sandboxMrpWorkOrders.$inferSelect;
  type PurchaseOrderRow = typeof sandboxMrpPurchaseOrders.$inferSelect;

  await db.transaction(async (tx) => {
    // Suppliers
    const supRows: SupplierRow[] = await tx
      .insert(sandboxMrpSuppliers)
      .values(
        SUPPLIERS.map((s) => ({
          tenantId,
          supplierCode: s.code,
          name: s.name,
          contactNotes: 'Sandbox fixture supplier',
          defaultLeadTimeDays: int(3, 21),
          ...audit,
        })),
      )
      .returning();

    // Purchased items — lead times spread 2–21 days (most > 5).
    const purchasedRows: ItemRow[] = await tx
      .insert(sandboxMrpItems)
      .values(
        PURCHASED_PARTS.map((p, i) => ({
          tenantId,
          sku: `RM-${pad3(i + 1)}`,
          description: p.name,
          unitOfMeasure: p.uom,
          itemType: 'purchased',
          defaultLeadTimeDays: int(2, 21),
          ...audit,
        })),
      )
      .returning();

    // Manufactured items — longer lead times 7–35 days.
    const mfgRows: ItemRow[] = await tx
      .insert(sandboxMrpItems)
      .values(
        MANUFACTURED_PARTS.map((name, i) => ({
          tenantId,
          sku: `FG-${pad3(i + 1)}`,
          description: name,
          unitOfMeasure: 'EA',
          itemType: 'manufactured',
          defaultLeadTimeDays: int(7, 35),
          ...audit,
        })),
      )
      .returning();

    const allItems = [...purchasedRows, ...mfgRows];

    // Inventory balances — every item at MAIN, ~half at a second site.
    const invValues: (typeof sandboxMrpInventoryBalances.$inferInsert)[] = [];
    for (const it of allItems) {
      invValues.push({
        tenantId,
        itemId: it.id,
        siteCode: 'MAIN',
        quantityOnHand: int(0, 600),
        quantityAllocated: int(0, 60),
        ...audit,
      });
      if (rnd() < 0.5) {
        invValues.push({
          tenantId,
          itemId: it.id,
          siteCode: pick(['WEST', 'EAST']),
          quantityOnHand: int(0, 300),
          quantityAllocated: int(0, 30),
          ...audit,
        });
      }
    }
    await tx.insert(sandboxMrpInventoryBalances).values(invValues);

    // BOM lines — each manufactured item consumes 2–4 distinct purchased components.
    const bomValues: (typeof sandboxMrpBomLines.$inferInsert)[] = [];
    for (const fg of mfgRows) {
      const k = int(2, 4);
      const used = new Set<string>();
      for (let j = 0; j < k; j++) {
        const child = pick(purchasedRows);
        if (used.has(child.id)) continue;
        used.add(child.id);
        bomValues.push({
          tenantId,
          parentItemId: fg.id,
          childItemId: child.id,
          quantityPer: int(1, 6),
          scrapFactor: pick([0, 0.02, 0.05, 0.1]),
          ...audit,
        });
      }
    }
    await tx.insert(sandboxMrpBomLines).values(bomValues);

    // Routing operations — 2–4 sequential ops per manufactured item.
    const routingValues: (typeof sandboxMrpRoutingOperations.$inferInsert)[] = [];
    for (const fg of mfgRows) {
      const ops = int(2, 4);
      for (let o = 0; o < ops; o++) {
        const op = OPERATIONS[o % OPERATIONS.length];
        routingValues.push({
          tenantId,
          itemId: fg.id,
          sequenceNo: (o + 1) * 10,
          operationCode: op.code,
          operationName: op.name,
          workCenter: op.wc,
          plannedTimeMinutes: int(10, 120),
          ...audit,
        });
      }
    }
    await tx.insert(sandboxMrpRoutingOperations).values(routingValues);

    // Work orders — 1–2 per manufactured item.
    const woValues: (typeof sandboxMrpWorkOrders.$inferInsert)[] = [];
    let woSeq = 1;
    for (const fg of mfgRows) {
      const count = int(1, 2);
      for (let w = 0; w < count; w++) {
        const released = int(5, 120);
        woValues.push({
          tenantId,
          woNumber: `WO-${short}-${pad3(woSeq++)}`,
          assemblyItemId: fg.id,
          quantityReleased: released,
          quantityCompleted: int(0, released),
          status: pick(WO_STATUSES),
          dueDate: new Date(now + int(3, 45) * DAY_MS),
          ...audit,
        });
      }
    }
    const woRows: WorkOrderRow[] = await tx.insert(sandboxMrpWorkOrders).values(woValues).returning();

    // Purchase orders — several POs, each with 1–3 lines against purchased items.
    const poValues: (typeof sandboxMrpPurchaseOrders.$inferInsert)[] = [];
    const numPos = 8;
    for (let p = 0; p < numPos; p++) {
      const supplier = pick(supRows);
      const lines = int(1, 3);
      for (let line = 1; line <= lines; line++) {
        poValues.push({
          tenantId,
          poNumber: `PO-${short}-${pad3(p + 1)}`,
          lineNo: line,
          supplierId: supplier.id,
          itemId: pick(purchasedRows).id,
          quantity: int(5, 250),
          status: pick(PO_STATUSES),
          dueDate: new Date(now + int(7, 60) * DAY_MS),
          ...audit,
        });
      }
    }
    const poRows: PurchaseOrderRow[] = await tx.insert(sandboxMrpPurchaseOrders).values(poValues).returning();

    // Inventory transactions — receipts/issues/adjustments over the last ~30 days.
    const txnValues: (typeof sandboxMrpInventoryTransactions.$inferInsert)[] = [];
    for (let t = 0; t < 24; t++) {
      const type = pick(TXN_TYPES);
      const isReceipt = type === 'receipt';
      const po = isReceipt ? pick(poRows) : null;
      const wo = !isReceipt && rnd() < 0.5 ? pick(woRows) : null;
      txnValues.push({
        tenantId,
        itemId: pick(allItems).id,
        transactionType: type,
        quantity: type === 'issue' ? -int(1, 80) : int(1, 120),
        workOrderId: wo?.id ?? null,
        purchaseOrderId: po?.id ?? null,
        reference: po?.poNumber ?? wo?.woNumber ?? `ADJ-${pad3(t + 1)}`,
        effectiveAt: new Date(now - int(0, 30) * DAY_MS),
        ...audit,
      });
    }
    await tx.insert(sandboxMrpInventoryTransactions).values(txnValues);

    // Demand forecasts — 6 weekly buckets per manufactured item.
    const fcValues: (typeof sandboxMrpDemandForecasts.$inferInsert)[] = [];
    const weekStart = now - (now % (7 * DAY_MS));
    for (const fg of mfgRows) {
      for (let w = 0; w < 6; w++) {
        fcValues.push({
          tenantId,
          itemId: fg.id,
          periodStart: new Date(weekStart + w * 7 * DAY_MS),
          bucketLabel: `W+${w}`,
          forecastQty: int(5, 200),
          horizonWeeks: 12,
          ...audit,
        });
      }
    }
    await tx.insert(sandboxMrpDemandForecasts).values(fcValues);
  });
}

/**
 * Dev/sandbox helper: deletes a tenant's MRP fixtures (FK-safe order) and re-seeds them.
 * Used by the "reset demo data" path so an already-seeded tenant can pick up richer fixtures.
 */
export async function reseedSandboxMrpFixturesForTenant(db: SpectraDb, tenantId: string): Promise<void> {
  await db.transaction(async (tx) => {
    // Order matters: delete dependents before items/suppliers (some FKs are ON DELETE restrict).
    await tx.delete(sandboxMrpInventoryTransactions).where(eq(sandboxMrpInventoryTransactions.tenantId, tenantId));
    await tx.delete(sandboxMrpDemandForecasts).where(eq(sandboxMrpDemandForecasts.tenantId, tenantId));
    await tx.delete(sandboxMrpRoutingOperations).where(eq(sandboxMrpRoutingOperations.tenantId, tenantId));
    await tx.delete(sandboxMrpBomLines).where(eq(sandboxMrpBomLines.tenantId, tenantId));
    await tx.delete(sandboxMrpInventoryBalances).where(eq(sandboxMrpInventoryBalances.tenantId, tenantId));
    await tx.delete(sandboxMrpPurchaseOrders).where(eq(sandboxMrpPurchaseOrders.tenantId, tenantId));
    await tx.delete(sandboxMrpWorkOrders).where(eq(sandboxMrpWorkOrders.tenantId, tenantId));
    await tx.delete(sandboxMrpItems).where(eq(sandboxMrpItems.tenantId, tenantId));
    await tx.delete(sandboxMrpSuppliers).where(eq(sandboxMrpSuppliers.tenantId, tenantId));
  });
  await seedSandboxMrpFixturesForTenant(db, tenantId);
}
