import { and, desc, eq, isNull } from 'drizzle-orm';

import { CATALOG_IDS } from '../schema/catalog-seed-ids';
import { productionAccessRequests } from '../schema/control-plane';
import type { SpectraDb } from './connection';

/** GAP-3: current PAR satisfied for production invoke (latest non-deleted approved row). */
export async function hasApprovedProductionAccessForIntegration(
  db: SpectraDb,
  integrationId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: productionAccessRequests.id })
    .from(productionAccessRequests)
    .where(
      and(
        eq(productionAccessRequests.integrationId, integrationId),
        isNull(productionAccessRequests.deletedAt),
        eq(productionAccessRequests.statusId, CATALOG_IDS.productionAccessRequestStates.approved),
      ),
    )
    .orderBy(desc(productionAccessRequests.updatedAt))
    .limit(1);
  return Boolean(row);
}
