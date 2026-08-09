import { Router, type RequestHandler } from 'express';
import { and, desc, eq, isNull } from 'drizzle-orm';

import {
  aiEndpointProductionRequests,
  aiLlmModels,
  buildActorJson,
  CATALOG_IDS,
  developerAiEndpoints,
  developerAiEndpointVersions,
  fetchSandboxAiPlatformSettings,
  getDb,
  orgs,
  pricingProfiles,
  resolveEffectivePricingPolicy,
  resolveSpectraDatabaseUrl,
  runtimeTenants,
} from '@spectra/database';

import { requireAuth0AccessToken } from '../lib/auth';
import {
  requireStaffPermission,
  staffHasPermission,
  STAFF_PERMISSION_CUSTOM_ENDPOINTS_PRICING_OVERRIDE,
  STAFF_PERMISSION_CUSTOM_ENDPOINTS_REVIEW,
  STAFF_PERMISSION_PRICING_PROFILES_MANAGE,
  STAFF_PERMISSION_SANDBOX_AI_MODELS_MANAGE,
} from '../lib/staff-permissions';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function staffActor(req: { auth?: { claims?: Record<string, unknown>; sub?: string } }) {
  const sub = req.auth?.sub ?? 'staff';
  return buildActorJson({ name: sub, userId: null });
}

export function registerAdminSandboxAiRoutes(r: Router): void {
  const g = Router();
  g.use(requireAuth0AccessToken);

  g.get(
    '/ai-llm-models',
    requireStaffPermission(STAFF_PERMISSION_SANDBOX_AI_MODELS_MANAGE),
    async (_req, res) => {
      if (!resolveSpectraDatabaseUrl()) {
        res.status(503).json({ error: 'database_not_configured' });
        return;
      }
      const db = getDb();
      const rows = await db
        .select({
          id: aiLlmModels.id,
          displayName: aiLlmModels.displayName,
          provider: aiLlmModels.provider,
          modelName: aiLlmModels.modelName,
          apiBaseUrl: aiLlmModels.apiBaseUrl,
          maxTokens: aiLlmModels.maxTokens,
          // secret_ref is a pointer (e.g. "env:ANTHROPIC_API_KEY"), not the secret value.
          secretRef: aiLlmModels.secretRef,
          statusId: aiLlmModels.statusId,
          updatedAt: aiLlmModels.updatedAt,
        })
        .from(aiLlmModels)
        .where(isNull(aiLlmModels.deletedAt))
        .orderBy(desc(aiLlmModels.createdAt))
        .limit(200);
      res.json({ items: rows });
    },
  );

  g.post(
    '/ai-llm-models',
    requireStaffPermission(STAFF_PERMISSION_SANDBOX_AI_MODELS_MANAGE),
    async (req, res) => {
      if (!resolveSpectraDatabaseUrl()) {
        res.status(503).json({ error: 'database_not_configured' });
        return;
      }
      const b = req.body as Record<string, unknown>;
      const displayName = typeof b['displayName'] === 'string' ? b['displayName'].trim() : '';
      const provider = typeof b['provider'] === 'string' ? b['provider'].trim() : '';
      const modelName = typeof b['modelName'] === 'string' ? b['modelName'].trim() : '';
      if (!displayName || !provider || !modelName) {
        res.status(400).json({ error: 'validation_error', message: 'displayName, provider, modelName required.' });
        return;
      }
      const db = getDb();
      const actor = staffActor(req);
      const [row] = await db
        .insert(aiLlmModels)
        .values({
          displayName,
          provider,
          modelName,
          apiBaseUrl: typeof b['apiBaseUrl'] === 'string' ? b['apiBaseUrl'] : null,
          maxTokens: typeof b['maxTokens'] === 'number' ? b['maxTokens'] : null,
          secretRef: typeof b['secretRef'] === 'string' ? b['secretRef'] : null,
          statusId: CATALOG_IDS.status.active,
          createdBy: actor,
          updatedBy: actor,
        })
        .returning();
      res.status(201).json(row);
    },
  );

  g.patch(
    '/ai-llm-models/:id',
    requireStaffPermission(STAFF_PERMISSION_SANDBOX_AI_MODELS_MANAGE),
    async (req, res) => {
      if (!resolveSpectraDatabaseUrl()) {
        res.status(503).json({ error: 'database_not_configured' });
        return;
      }
      const id = req.params['id'];
      if (!id || !UUID_RE.test(id)) {
        res.status(400).json({ error: 'validation_error' });
        return;
      }
      const b = req.body as Record<string, unknown>;
      const db = getDb();
      const actor = staffActor(req);
      const [row] = await db
        .update(aiLlmModels)
        .set({
          ...(typeof b['displayName'] === 'string' ? { displayName: b['displayName'] } : {}),
          ...(typeof b['provider'] === 'string' ? { provider: b['provider'] } : {}),
          ...(typeof b['modelName'] === 'string' ? { modelName: b['modelName'] } : {}),
          ...(typeof b['apiBaseUrl'] === 'string' ? { apiBaseUrl: b['apiBaseUrl'] } : {}),
          ...(b['maxTokens'] === null || typeof b['maxTokens'] === 'number' ?
            { maxTokens: b['maxTokens'] as number | null }
          : {}),
          ...(typeof b['secretRef'] === 'string' ? { secretRef: b['secretRef'] } : {}),
          updatedBy: actor,
        })
        .where(and(eq(aiLlmModels.id, id), isNull(aiLlmModels.deletedAt)))
        .returning();
      if (!row) {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      res.json(row);
    },
  );

  g.get(
    '/pricing-profiles',
    requireStaffPermission(STAFF_PERMISSION_PRICING_PROFILES_MANAGE),
    async (_req, res) => {
      if (!resolveSpectraDatabaseUrl()) {
        res.status(503).json({ error: 'database_not_configured' });
        return;
      }
      const db = getDb();
      const rows = await db
        .select()
        .from(pricingProfiles)
        .where(isNull(pricingProfiles.deletedAt))
        .orderBy(desc(pricingProfiles.createdAt))
        .limit(200);
      res.json({ items: rows });
    },
  );

  g.post(
    '/pricing-profiles',
    requireStaffPermission(STAFF_PERMISSION_PRICING_PROFILES_MANAGE),
    async (req, res) => {
      if (!resolveSpectraDatabaseUrl()) {
        res.status(503).json({ error: 'database_not_configured' });
        return;
      }
      const b = req.body as Record<string, unknown>;
      const displayName = typeof b['displayName'] === 'string' ? b['displayName'].trim() : '';
      if (!displayName) {
        res.status(400).json({ error: 'validation_error' });
        return;
      }
      const db = getDb();
      const actor = staffActor(req);
      const [row] = await db
        .insert(pricingProfiles)
        .values({
          displayName,
          policy: (b['policy'] ?? {}) as never,
          statusId: CATALOG_IDS.status.active,
          createdBy: actor,
          updatedBy: actor,
        })
        .returning();
      res.status(201).json(row);
    },
  );

  g.patch(
    '/pricing-profiles/:id',
    requireStaffPermission(STAFF_PERMISSION_PRICING_PROFILES_MANAGE),
    async (req, res) => {
      if (!resolveSpectraDatabaseUrl()) {
        res.status(503).json({ error: 'database_not_configured' });
        return;
      }
      const id = req.params['id'];
      if (!id || !UUID_RE.test(id)) {
        res.status(400).json({ error: 'validation_error' });
        return;
      }
      const b = req.body as Record<string, unknown>;
      const db = getDb();
      const actor = staffActor(req);
      const [row] = await db
        .update(pricingProfiles)
        .set({
          ...(typeof b['displayName'] === 'string' ? { displayName: b['displayName'] } : {}),
          ...(b['policy'] !== undefined ? { policy: b['policy'] as never } : {}),
          updatedBy: actor,
        })
        .where(and(eq(pricingProfiles.id, id), isNull(pricingProfiles.deletedAt)))
        .returning();
      if (!row) {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      res.json(row);
    },
  );

  g.get(
    '/runtime-tenants',
    requireStaffPermission(STAFF_PERMISSION_CUSTOM_ENDPOINTS_REVIEW),
    async (_req, res) => {
      if (!resolveSpectraDatabaseUrl()) {
        res.status(503).json({ error: 'database_not_configured' });
        return;
      }
      const db = getDb();
      const rows = await db
        .select({
          id: runtimeTenants.id,
          orgId: runtimeTenants.orgId,
          orgName: orgs.name,
          externalTenantRef: runtimeTenants.externalTenantRef,
          customEndpointTrustTierId: runtimeTenants.customEndpointTrustTierId,
          defaultPricingProfileId: runtimeTenants.defaultPricingProfileId,
        })
        .from(runtimeTenants)
        .innerJoin(orgs, eq(runtimeTenants.orgId, orgs.id))
        .where(isNull(runtimeTenants.deletedAt))
        .orderBy(desc(runtimeTenants.createdAt))
        .limit(200);
      res.json({ items: rows });
    },
  );

  g.patch(
    '/runtime-tenants/:id',
    requireStaffPermission(STAFF_PERMISSION_CUSTOM_ENDPOINTS_REVIEW),
    async (req, res) => {
      if (!resolveSpectraDatabaseUrl()) {
        res.status(503).json({ error: 'database_not_configured' });
        return;
      }
      const id = req.params['id'];
      if (!id || !UUID_RE.test(id)) {
        res.status(400).json({ error: 'validation_error' });
        return;
      }
      const b = req.body as Record<string, unknown>;
      const db = getDb();
      const actor = staffActor(req);
      const trustId =
        typeof b['customEndpointTrustTierId'] === 'string' && UUID_RE.test(b['customEndpointTrustTierId']) ?
          b['customEndpointTrustTierId']
        : undefined;
      const extRef =
        typeof b['externalTenantRef'] === 'string' || b['externalTenantRef'] === null ?
          (b['externalTenantRef'] as string | null)
        : undefined;
      const defaultPp =
        typeof b['defaultPricingProfileId'] === 'string' && UUID_RE.test(b['defaultPricingProfileId']) ?
          b['defaultPricingProfileId']
        : b['defaultPricingProfileId'] === null ? null
        : undefined;
      const [row] = await db
        .update(runtimeTenants)
        .set({
          ...(trustId !== undefined ? { customEndpointTrustTierId: trustId } : {}),
          ...(extRef !== undefined ? { externalTenantRef: extRef } : {}),
          ...(defaultPp !== undefined ? { defaultPricingProfileId: defaultPp } : {}),
          updatedBy: actor,
        })
        .where(and(eq(runtimeTenants.id, id), isNull(runtimeTenants.deletedAt)))
        .returning();
      if (!row) {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      res.json(row);
    },
  );

  g.get(
    '/ai-endpoint-production-requests',
    requireStaffPermission(STAFF_PERMISSION_CUSTOM_ENDPOINTS_REVIEW),
    async (_req, res) => {
      if (!resolveSpectraDatabaseUrl()) {
        res.status(503).json({ error: 'database_not_configured' });
        return;
      }
      const db = getDb();
      const rows = await db
        .select({
          id: aiEndpointProductionRequests.id,
          endpointId: aiEndpointProductionRequests.endpointId,
          endpointVersionId: aiEndpointProductionRequests.endpointVersionId,
          statusId: aiEndpointProductionRequests.statusId,
          createdAt: aiEndpointProductionRequests.createdAt,
          updatedAt: aiEndpointProductionRequests.updatedAt,
          endpointSlug: developerAiEndpoints.slug,
        })
        .from(aiEndpointProductionRequests)
        .leftJoin(developerAiEndpoints, eq(aiEndpointProductionRequests.endpointId, developerAiEndpoints.id))
        .where(isNull(aiEndpointProductionRequests.deletedAt))
        .orderBy(desc(aiEndpointProductionRequests.updatedAt))
        .limit(200);
      res.json({ items: rows });
    },
  );

  g.get(
    '/ai-endpoint-production-requests/:id',
    requireStaffPermission(STAFF_PERMISSION_CUSTOM_ENDPOINTS_REVIEW),
    async (req, res) => {
      if (!resolveSpectraDatabaseUrl()) {
        res.status(503).json({ error: 'database_not_configured' });
        return;
      }
      const id = req.params['id'];
      if (!id || !UUID_RE.test(id)) {
        res.status(400).json({ error: 'validation_error' });
        return;
      }
      const db = getDb();
      const [row] = await db
        .select()
        .from(aiEndpointProductionRequests)
        .where(and(eq(aiEndpointProductionRequests.id, id), isNull(aiEndpointProductionRequests.deletedAt)))
        .limit(1);
      if (!row) {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      const platform = await fetchSandboxAiPlatformSettings(db);
      const [ep] = await db
        .select()
        .from(developerAiEndpoints)
        .where(eq(developerAiEndpoints.id, row.endpointId))
        .limit(1);
      const [version] = await db
        .select({
          id: developerAiEndpointVersions.id,
          revision: developerAiEndpointVersions.revision,
          userPrompt: developerAiEndpointVersions.userPrompt,
          spec: developerAiEndpointVersions.spec,
        })
        .from(developerAiEndpointVersions)
        .where(eq(developerAiEndpointVersions.id, row.endpointVersionId))
        .limit(1);
      const effective =
        ep ?
          await resolveEffectivePricingPolicy(
            db,
            platform,
            ep.tenantId,
            ep.pricingProfileId ?? null,
          )
        : { profileId: null, policy: {} };
      res.json({
        request: row,
        endpoint: ep ? { id: ep.id, slug: ep.slug, tenantId: ep.tenantId, orgId: ep.orgId, statusId: ep.statusId } : null,
        version: version ?? null,
        effectivePricing: effective,
      });
    },
  );

  g.patch(
    '/ai-endpoint-production-requests/:id',
    requireStaffPermission(STAFF_PERMISSION_CUSTOM_ENDPOINTS_REVIEW),
    async (req, res) => {
      if (!resolveSpectraDatabaseUrl()) {
        res.status(503).json({ error: 'database_not_configured' });
        return;
      }
      const id = req.params['id'];
      if (!id || !UUID_RE.test(id)) {
        res.status(400).json({ error: 'validation_error' });
        return;
      }
      const b = req.body as Record<string, unknown>;
      const action = typeof b['action'] === 'string' ? b['action'] : '';
      const db = getDb();
      const actor = staffActor(req);
      const [reqRow] = await db
        .select()
        .from(aiEndpointProductionRequests)
        .where(and(eq(aiEndpointProductionRequests.id, id), isNull(aiEndpointProductionRequests.deletedAt)))
        .limit(1);
      if (!reqRow) {
        res.status(404).json({ error: 'not_found' });
        return;
      }

      const pricingOverride = staffHasPermission(
        req.auth?.claims,
        STAFF_PERMISSION_CUSTOM_ENDPOINTS_PRICING_OVERRIDE,
      );

      if (
        typeof b['pricingProfileId'] === 'string' &&
        UUID_RE.test(b['pricingProfileId']) &&
        b['pricingProfileId'] !== ''
      ) {
        if (!pricingOverride) {
          res.status(403).json({
            error: 'insufficient_scope',
            message: `Missing ${STAFF_PERMISSION_CUSTOM_ENDPOINTS_PRICING_OVERRIDE}`,
          });
          return;
        }
        await db
          .update(developerAiEndpoints)
          .set({ pricingProfileId: b['pricingProfileId'], updatedBy: actor })
          .where(eq(developerAiEndpoints.id, reqRow.endpointId));
      }

      if (action === 'approve') {
        await db
          .update(aiEndpointProductionRequests)
          .set({
            statusId: CATALOG_IDS.aiEndpointProductionRequestStates.approved,
            internalStaffNotes:
              typeof b['internalStaffNotes'] === 'string' ? b['internalStaffNotes'] : undefined,
            updatedBy: actor,
          })
          .where(eq(aiEndpointProductionRequests.id, id));
        await db
          .update(developerAiEndpoints)
          .set({
            approvedProductionVersionId: reqRow.endpointVersionId,
            statusId: CATALOG_IDS.developerAiEndpointLifecycle.active,
            updatedBy: actor,
          })
          .where(eq(developerAiEndpoints.id, reqRow.endpointId));
        res.json({ ok: true });
        return;
      }
      if (action === 'reject') {
        const reason =
          typeof b['staffVisibleRejectionReason'] === 'string' ? b['staffVisibleRejectionReason'].trim() : '';
        if (!reason) {
          res.status(400).json({ error: 'validation_error', message: 'staffVisibleRejectionReason required.' });
          return;
        }
        await db
          .update(aiEndpointProductionRequests)
          .set({
            statusId: CATALOG_IDS.aiEndpointProductionRequestStates.rejected,
            staffVisibleRejectionReason: reason,
            staffReasonCode: typeof b['staffReasonCode'] === 'string' ? b['staffReasonCode'] : null,
            internalStaffNotes:
              typeof b['internalStaffNotes'] === 'string' ? b['internalStaffNotes'] : undefined,
            updatedBy: actor,
          })
          .where(eq(aiEndpointProductionRequests.id, id));
        res.json({ ok: true });
        return;
      }
      if (action === 'needs_information') {
        const reason =
          typeof b['staffVisibleRejectionReason'] === 'string' ? b['staffVisibleRejectionReason'].trim() : '';
        if (!reason) {
          res.status(400).json({ error: 'validation_error', message: 'staffVisibleRejectionReason required.' });
          return;
        }
        await db
          .update(aiEndpointProductionRequests)
          .set({
            statusId: CATALOG_IDS.aiEndpointProductionRequestStates.needsInformation,
            staffVisibleRejectionReason: reason,
            internalStaffNotes:
              typeof b['internalStaffNotes'] === 'string' ? b['internalStaffNotes'] : undefined,
            updatedBy: actor,
          })
          .where(eq(aiEndpointProductionRequests.id, id));
        res.json({ ok: true });
        return;
      }

      res.status(400).json({ error: 'validation_error', message: 'Unknown action.' });
    },
  );

  r.use(g);
}
