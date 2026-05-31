import { and, eq, isNull } from 'drizzle-orm';

import { CATALOG_IDS, getDb, integrations, m2mOauthClients } from '@spectra/database';

export async function loadM2mClientStatusForEdge(
  clientId: string
): Promise<'active' | 'revoked' | 'suspended'> {
  const db = getDb();
  const rows = await db
    .select({
      intStatus: integrations.statusId,
      intDeleted: integrations.deletedAt,
      clientDeleted: m2mOauthClients.deletedAt,
      clientStatus: m2mOauthClients.statusId,
    })
    .from(m2mOauthClients)
    .innerJoin(integrations, eq(m2mOauthClients.integrationId, integrations.id))
    .where(and(eq(m2mOauthClients.clientId, clientId), isNull(m2mOauthClients.deletedAt)))
    .limit(1);
  const row = rows[0];
  if (!row) return 'revoked';
  if (row.intDeleted || row.clientDeleted) return 'revoked';
  if (row.intStatus === CATALOG_IDS.status.deleted) return 'revoked';
  if (row.intStatus === CATALOG_IDS.status.archived) return 'suspended';
  if (row.clientStatus === CATALOG_IDS.status.deleted) return 'revoked';
  if (row.clientStatus === CATALOG_IDS.status.archived) return 'suspended';
  return 'active';
}
