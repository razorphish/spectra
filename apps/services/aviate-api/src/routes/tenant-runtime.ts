import { and, eq, isNull } from 'drizzle-orm';
import { Router, type RequestHandler } from 'express';

import {
  developerAiEndpointVersions,
  developerAiEndpoints,
  fetchSandboxAiPlatformSettings,
  getDb,
  getEndpointPricingProfileId,
  hasApprovedProductionAccessForIntegration,
  resolveEffectivePricingPolicy,
  resolveSpectraDatabaseUrl,
  runtimeTenants,
  usageEvents,
  validateDeveloperAiEndpointSpec,
} from '@spectra/database';

import { executeHostedCustomEndpointSpec } from '@spectra/database';

function noDatabase(res: Parameters<RequestHandler>[1]): void {
  res.status(503).json({
    error: 'database_not_configured',
    message: 'Spectra database URL is not configured.',
  });
}

export function createTenantRuntimeRouter(): Router {
  const r = Router();

  const postInvoke: RequestHandler = async (req, res) => {
    if (!resolveSpectraDatabaseUrl()) {
      noDatabase(res);
      return;
    }
    const m2m = req.auth?.m2m;
    if (!m2m) {
      res.status(403).json({
        error: 'token_type_not_allowed',
        message: 'M2M client credentials token required for tenant-runtime invoke.',
      });
      return;
    }
    const claims = req.auth?.claims ?? {};
    const tenantIdClaim =
      typeof claims['tenant_id'] === 'string' ? claims['tenant_id'].trim()
      : typeof claims['tenantId'] === 'string' ? claims['tenantId'].trim()
      : '';
    if (!tenantIdClaim || !/^[0-9a-f-]{36}$/i.test(tenantIdClaim)) {
      res.status(403).json({
        error: 'invalid_tenant_claim',
        message: 'Access token must include string claim tenant_id (UUID).',
      });
      return;
    }
    const slug = req.params['slug']?.trim();
    if (!slug) {
      res.status(400).json({ error: 'bad_request', message: 'Missing slug.' });
      return;
    }

    const db = getDb();
    const platform = await fetchSandboxAiPlatformSettings(db);
    if (!platform.endpointsEnabled) {
      res.status(403).json({
        error: 'sandbox_ai_feature_disabled',
        message: 'Sandbox AI custom endpoints are disabled for this deployment.',
      });
      return;
    }

    const orgId = m2m.org_id;
    if (!orgId) {
      res.status(403).json({ error: 'invalid_token', message: 'M2M token missing org_id.' });
      return;
    }

    const [rt] = await db
      .select()
      .from(runtimeTenants)
      .where(
        and(
          eq(runtimeTenants.id, tenantIdClaim),
          eq(runtimeTenants.orgId, orgId),
          isNull(runtimeTenants.deletedAt),
        ),
      )
      .limit(1);
    if (!rt) {
      res.status(403).json({
        error: 'tenant_not_mapped',
        message: 'tenant_id is not mapped to this integration org.',
      });
      return;
    }

    const integrationId = m2m.id;
    const parOk = await hasApprovedProductionAccessForIntegration(db, integrationId);
    if (!parOk) {
      res.status(403).json({
        error: 'production_access_revoked',
        message: 'Production access (PAR) is not approved for this integration.',
      });
      return;
    }

    const [ep] = await db
      .select()
      .from(developerAiEndpoints)
      .where(
        and(
          eq(developerAiEndpoints.tenantId, rt.id),
          eq(developerAiEndpoints.slug, slug),
          isNull(developerAiEndpoints.deletedAt),
        ),
      )
      .limit(1);
    if (!ep) {
      res.status(404).json({ error: 'endpoint_not_found', message: 'Endpoint not found.' });
      return;
    }
    if (!ep.approvedProductionVersionId) {
      res.status(403).json({
        error: 'no_production_revision_pinned',
        message: 'No staff-approved production revision is pinned for this endpoint.',
      });
      return;
    }

    const [ver] = await db
      .select()
      .from(developerAiEndpointVersions)
      .where(
        and(
          eq(developerAiEndpointVersions.id, ep.approvedProductionVersionId),
          isNull(developerAiEndpointVersions.deletedAt),
        ),
      )
      .limit(1);
    if (!ver) {
      res.status(403).json({
        error: 'no_production_revision_pinned',
        message: 'Pinned revision row is missing.',
      });
      return;
    }

    const spec = ver.spec as Record<string, unknown>;
    const v = validateDeveloperAiEndpointSpec(spec);
    if (v.ok === false) {
      res.status(500).json({ error: 'policy_violation', message: v.error });
      return;
    }

    const ppId = await getEndpointPricingProfileId(db, ep.id);
    await resolveEffectivePricingPolicy(db, platform, rt.id, ppId);

    const out = await executeHostedCustomEndpointSpec({ db, tenantId: rt.id }, spec, req.body);
    await db.insert(usageEvents).values({
      tenantId: rt.id,
      endpointId: ep.id,
      dimension: 'request',
      quantity: 1,
      occurredAt: new Date(),
      m2mClientId: m2m.client_id,
      integrationId: integrationId || null,
    });
    res.status(out.httpStatus).json(out.json);
  };

  r.post('/endpoints/:slug/invoke', postInvoke);
  return r;
}
