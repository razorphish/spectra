import { and, eq, gte, isNull, sql } from 'drizzle-orm';
import { Router, type RequestHandler } from 'express';

import {
  developerAiEndpoints,
  getDb,
  resolveSpectraDatabaseUrl,
  runtimeTenants,
  usageEvents,
} from '@spectra/database';

function noDatabase(res: Parameters<RequestHandler>[1]): void {
  res.status(503).json({ error: 'database_not_configured', message: 'Spectra database URL is not configured.' });
}

/** Extracts and validates tenant_id + org_id from M2M token claims. */
function resolveTenantClaims(req: Parameters<RequestHandler>[0]): { tenantId: string; orgId: string } | null {
  const m2m = req.auth?.m2m;
  if (!m2m) return null;
  const claims = req.auth?.claims ?? {};
  const tenantId =
    typeof claims['tenant_id'] === 'string' ? claims['tenant_id'].trim()
    : typeof claims['tenantId'] === 'string' ? claims['tenantId'].trim()
    : '';
  const orgId = m2m.org_id ?? '';
  if (!tenantId || !/^[0-9a-f-]{36}$/i.test(tenantId) || !orgId) return null;
  return { tenantId, orgId };
}

const getProfile: RequestHandler = async (req, res) => {
  if (!resolveSpectraDatabaseUrl()) { noDatabase(res); return; }
  const claims = resolveTenantClaims(req);
  if (!claims) {
    res.status(403).json({ error: 'invalid_token', message: 'M2M token missing required tenant_id / org_id claims.' });
    return;
  }
  const db = getDb();
  const [tenant] = await db
    .select({
      id: runtimeTenants.id,
      orgId: runtimeTenants.orgId,
      displayName: runtimeTenants.displayName,
      externalTenantRef: runtimeTenants.externalTenantRef,
      customEndpointTrustTierId: runtimeTenants.customEndpointTrustTierId,
      statusId: runtimeTenants.statusId,
      createdAt: runtimeTenants.createdAt,
      updatedAt: runtimeTenants.updatedAt,
    })
    .from(runtimeTenants)
    .where(
      and(
        eq(runtimeTenants.id, claims.tenantId),
        eq(runtimeTenants.orgId, claims.orgId),
        isNull(runtimeTenants.deletedAt),
      ),
    )
    .limit(1);
  if (!tenant) {
    res.status(404).json({ error: 'tenant_not_found', message: 'No runtime tenant found for this token.' });
    return;
  }
  res.status(200).json({ tenant });
};

const getUsageSummary: RequestHandler = async (req, res) => {
  if (!resolveSpectraDatabaseUrl()) { noDatabase(res); return; }
  const claims = resolveTenantClaims(req);
  if (!claims) {
    res.status(403).json({ error: 'invalid_token', message: 'M2M token missing required tenant_id / org_id claims.' });
    return;
  }
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const db = getDb();
  const rows = await db
    .select({
      dimension: usageEvents.dimension,
      total: sql<number>`cast(sum(${usageEvents.quantity}) as integer)`,
      eventCount: sql<number>`cast(count(*) as integer)`,
    })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.tenantId, claims.tenantId),
        gte(usageEvents.occurredAt, thirtyDaysAgo),
      ),
    )
    .groupBy(usageEvents.dimension);
  res.status(200).json({
    tenantId: claims.tenantId,
    periodDays: 30,
    summary: rows,
  });
};

const getEndpoints: RequestHandler = async (req, res) => {
  if (!resolveSpectraDatabaseUrl()) { noDatabase(res); return; }
  const claims = resolveTenantClaims(req);
  if (!claims) {
    res.status(403).json({ error: 'invalid_token', message: 'M2M token missing required tenant_id / org_id claims.' });
    return;
  }
  const db = getDb();
  const [rt] = await db
    .select({ id: runtimeTenants.id })
    .from(runtimeTenants)
    .where(
      and(
        eq(runtimeTenants.id, claims.tenantId),
        eq(runtimeTenants.orgId, claims.orgId),
        isNull(runtimeTenants.deletedAt),
      ),
    )
    .limit(1);
  if (!rt) {
    res.status(404).json({ error: 'tenant_not_found', message: 'No runtime tenant found for this token.' });
    return;
  }
  const items = await db
    .select({
      id: developerAiEndpoints.id,
      slug: developerAiEndpoints.slug,
      statusId: developerAiEndpoints.statusId,
      hasProductionRevision: sql<boolean>`(${developerAiEndpoints.approvedProductionVersionId} is not null)`,
      createdAt: developerAiEndpoints.createdAt,
      updatedAt: developerAiEndpoints.updatedAt,
    })
    .from(developerAiEndpoints)
    .where(
      and(
        eq(developerAiEndpoints.tenantId, claims.tenantId),
        isNull(developerAiEndpoints.deletedAt),
      ),
    )
    .orderBy(developerAiEndpoints.createdAt);
  res.status(200).json({ tenantId: claims.tenantId, items });
};

export function createPlatformTenantRouter(): Router {
  const r = Router();
  r.get('/profile', getProfile);
  r.get('/usage-summary', getUsageSummary);
  r.get('/endpoints', getEndpoints);
  return r;
}
