import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { Router, type RequestHandler } from 'express';

import {
  aiEndpointProductionRequests,
  aiLlmModels,
  buildActorJson,
  CATALOG_IDS,
  developerAiEndpointVersions,
  developerAiEndpoints,
  fetchSandboxAiPlatformSettings,
  getDb,
  getEndpointPricingProfileId,
  resolveEffectivePricingPolicy,
  resolveSpectraDatabaseUrl,
  runtimeTenants,
  seedSandboxMrpFixturesForTenant,
  sha256HexJson,
  usageEvents,
  validateDeveloperAiEndpointSpec,
} from '@spectra/database';

import { executeHostedCustomEndpointSpec } from '../lib/sandbox-ai-invoke';

import type { EnsureSessionFn } from './sandbox-portal-par';

const EXTERNAL_REF_MAX = 128;
const EXTERNAL_REF_RE = /^[a-zA-Z0-9._-]{1,128}$/;

function noDatabase(res: Parameters<RequestHandler>[1]): void {
  res.status(503).json({
    error: 'database_not_configured',
    message: 'Spectra database URL is not configured.',
  });
}

function buildStubLlmSpec(slug: string): Record<string, unknown> {
  return {
    execution_kind: 'sandbox_mrp_fixture_read',
    table: 'sandbox_mrp_items',
    note: `stub for ${slug}`,
  };
}

export function createSandboxPortalAiRouter(ensureSession: EnsureSessionFn): Router {
  const r = Router();

  const requireSandboxAi: RequestHandler = async (_req, res, next) => {
    if (!resolveSpectraDatabaseUrl()) {
      noDatabase(res);
      return;
    }
    const db = getDb();
    const flags = await fetchSandboxAiPlatformSettings(db);
    if (!flags.endpointsEnabled) {
      res.status(403).json({
        error: 'sandbox_ai_feature_disabled',
        message: 'Sandbox AI custom endpoints are disabled for this deployment.',
      });
      return;
    }
    next();
  };

  r.use(requireSandboxAi);

  const postRuntimeTenants: RequestHandler = async (req, res) => {
    const sub = req.auth?.sub;
    if (!sub) {
      res.status(401).json({ error: 'unauthorized', message: 'Missing principal.' });
      return;
    }
    const session = await ensureSession(sub, req.auth?.claims ?? {});
    if (!session) {
      res.status(500).json({ error: 'bootstrap_failed', message: 'Could not resolve developer org.' });
      return;
    }
    const db = getDb();
    const body = (req.body ?? {}) as { externalTenantRef?: unknown };
    const extRef =
      typeof body.externalTenantRef === 'string' && body.externalTenantRef.trim() ?
        body.externalTenantRef.trim()
      : null;
    if (extRef) {
      if (extRef.length > EXTERNAL_REF_MAX || !EXTERNAL_REF_RE.test(extRef)) {
        res.status(400).json({
          error: 'validation_error',
          message: 'externalTenantRef must match /^[a-zA-Z0-9._-]{1,128}$/.',
        });
        return;
      }
    }

    const [existing] = await db
      .select()
      .from(runtimeTenants)
      .where(and(eq(runtimeTenants.orgId, session.orgId), isNull(runtimeTenants.deletedAt)))
      .limit(1);
    if (existing) {
      await seedSandboxMrpFixturesForTenant(db, existing.id);
      res.status(200).json({
        tenantId: existing.id,
        orgId: existing.orgId,
        externalTenantRef: existing.externalTenantRef,
        created: false,
      });
      return;
    }

    const actor = buildActorJson({ name: session.email, userId: session.userId });
    const trustTier = CATALOG_IDS.customEndpointTrustTier.standard;
    const [inserted] = await db
      .insert(runtimeTenants)
      .values({
        orgId: session.orgId,
        externalTenantRef: extRef,
        statusId: CATALOG_IDS.status.active,
        customEndpointTrustTierId: trustTier,
        createdBy: actor,
        updatedBy: actor,
      })
      .returning();
    if (!inserted) {
      res.status(500).json({ error: 'insert_failed' });
      return;
    }
    await seedSandboxMrpFixturesForTenant(db, inserted.id);
    res.status(201).json({
      tenantId: inserted.id,
      orgId: inserted.orgId,
      externalTenantRef: inserted.externalTenantRef,
      created: true,
    });
  };

  const listAiEndpoints: RequestHandler = async (req, res) => {
    const sub = req.auth?.sub;
    if (!sub) {
      res.status(401).json({ error: 'unauthorized', message: 'Missing principal.' });
      return;
    }
    const session = await ensureSession(sub, req.auth?.claims ?? {});
    if (!session) {
      res.status(500).json({ error: 'bootstrap_failed', message: 'Could not resolve developer org.' });
      return;
    }
    const db = getDb();
    const [rt] = await db
      .select({ id: runtimeTenants.id })
      .from(runtimeTenants)
      .where(and(eq(runtimeTenants.orgId, session.orgId), isNull(runtimeTenants.deletedAt)))
      .limit(1);
    if (!rt) {
      res.json({ items: [], tenantId: null as string | null });
      return;
    }
    const rows = await db
      .select({
        id: developerAiEndpoints.id,
        slug: developerAiEndpoints.slug,
        statusId: developerAiEndpoints.statusId,
        approvedProductionVersionId: developerAiEndpoints.approvedProductionVersionId,
        createdAt: developerAiEndpoints.createdAt,
      })
      .from(developerAiEndpoints)
      .where(and(eq(developerAiEndpoints.tenantId, rt.id), isNull(developerAiEndpoints.deletedAt)))
      .orderBy(desc(developerAiEndpoints.createdAt));
    res.json({ items: rows, tenantId: rt.id });
  };

  const postAiEndpoints: RequestHandler = async (req, res) => {
    const sub = req.auth?.sub;
    if (!sub) {
      res.status(401).json({ error: 'unauthorized', message: 'Missing principal.' });
      return;
    }
    const session = await ensureSession(sub, req.auth?.claims ?? {});
    if (!session) {
      res.status(500).json({ error: 'bootstrap_failed', message: 'Could not resolve developer org.' });
      return;
    }
    const body = req.body as { slug?: unknown; userPrompt?: unknown; modelId?: unknown };
    const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
    const userPrompt = typeof body.userPrompt === 'string' ? body.userPrompt.trim() : '';
    if (!slug || !/^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/.test(slug)) {
      res.status(400).json({
        error: 'validation_error',
        message: 'slug is required (lowercase letters, digits, hyphens; 2–64 chars).',
      });
      return;
    }
    if (!userPrompt) {
      res.status(400).json({ error: 'validation_error', message: 'userPrompt is required.' });
      return;
    }

    const db = getDb();
    const [rt] = await db
      .select({ id: runtimeTenants.id })
      .from(runtimeTenants)
      .where(and(eq(runtimeTenants.orgId, session.orgId), isNull(runtimeTenants.deletedAt)))
      .limit(1);
    if (!rt) {
      res.status(400).json({
        error: 'tenant_not_bootstrapped',
        message: 'POST /v1/platform/sandbox/runtime-tenants first.',
      });
      return;
    }

    const actor = buildActorJson({ name: session.email, userId: session.userId });
    const modelId = typeof body.modelId === 'string' ? body.modelId : null;

    const [ep] = await db
      .insert(developerAiEndpoints)
      .values({
        tenantId: rt.id,
        orgId: session.orgId,
        slug,
        createdByUserId: session.userId,
        statusId: CATALOG_IDS.developerAiEndpointLifecycle.draft,
        createdBy: actor,
        updatedBy: actor,
      })
      .returning();
    if (!ep) {
      res.status(500).json({ error: 'insert_failed' });
      return;
    }

    const spec = buildStubLlmSpec(slug);
    const validated = validateDeveloperAiEndpointSpec(spec);
    if (validated.ok === false) {
      res.status(500).json({ error: 'internal', message: validated.error });
      return;
    }
    const specSha = sha256HexJson(spec);
    const [ver] = await db
      .insert(developerAiEndpointVersions)
      .values({
        endpointId: ep.id,
        revision: 1,
        userPrompt,
        modelId,
        spec: spec as never,
        specSha256: specSha,
        statusId: CATALOG_IDS.status.active,
        createdBy: actor,
        updatedBy: actor,
      })
      .returning();
    if (!ver) {
      res.status(500).json({ error: 'version_insert_failed' });
      return;
    }

    res.status(201).json({ endpoint: ep, version: ver });
  };

  const getAiEndpoint: RequestHandler = async (req, res) => {
    const sub = req.auth?.sub;
    if (!sub) {
      res.status(401).json({ error: 'unauthorized', message: 'Missing principal.' });
      return;
    }
    const session = await ensureSession(sub, req.auth?.claims ?? {});
    if (!session) {
      res.status(500).json({ error: 'bootstrap_failed', message: 'Could not resolve developer org.' });
      return;
    }
    const id = req.params['id'];
    if (!id) {
      res.status(400).json({ error: 'bad_request' });
      return;
    }
    const db = getDb();
    const [row] = await db
      .select({ endpoint: developerAiEndpoints })
      .from(developerAiEndpoints)
      .innerJoin(runtimeTenants, eq(developerAiEndpoints.tenantId, runtimeTenants.id))
      .where(
        and(
          eq(developerAiEndpoints.id, id),
          eq(runtimeTenants.orgId, session.orgId),
          isNull(developerAiEndpoints.deletedAt),
          isNull(runtimeTenants.deletedAt),
        ),
      )
      .limit(1);
    if (!row) {
      res.status(404).json({ error: 'endpoint_not_found', message: 'Endpoint not found.' });
      return;
    }
    const versions = await db
      .select()
      .from(developerAiEndpointVersions)
      .where(
        and(
          eq(developerAiEndpointVersions.endpointId, id),
          isNull(developerAiEndpointVersions.deletedAt),
        ),
      )
      .orderBy(desc(developerAiEndpointVersions.revision));
    res.json({ endpoint: row.endpoint, versions });
  };

  const postGenerate: RequestHandler = async (req, res) => {
    const sub = req.auth?.sub;
    if (!sub) {
      res.status(401).json({ error: 'unauthorized', message: 'Missing principal.' });
      return;
    }
    const session = await ensureSession(sub, req.auth?.claims ?? {});
    if (!session) {
      res.status(500).json({ error: 'bootstrap_failed', message: 'Could not resolve developer org.' });
      return;
    }
    const id = req.params['id'];
    if (!id) {
      res.status(400).json({ error: 'bad_request' });
      return;
    }
    const body = (req.body ?? {}) as { userPrompt?: unknown };
    const userPrompt = typeof body.userPrompt === 'string' ? body.userPrompt.trim() : '';
    const db = getDb();
    const [epJoin] = await db
      .select({ ep: developerAiEndpoints })
      .from(developerAiEndpoints)
      .innerJoin(runtimeTenants, eq(developerAiEndpoints.tenantId, runtimeTenants.id))
      .where(
        and(
          eq(developerAiEndpoints.id, id),
          eq(runtimeTenants.orgId, session.orgId),
          isNull(developerAiEndpoints.deletedAt),
        ),
      )
      .limit(1);
    if (!epJoin) {
      res.status(404).json({ error: 'endpoint_not_found', message: 'Endpoint not found.' });
      return;
    }
    const ep = epJoin.ep;
    const [latest] = await db
      .select()
      .from(developerAiEndpointVersions)
      .where(and(eq(developerAiEndpointVersions.endpointId, id), isNull(developerAiEndpointVersions.deletedAt)))
      .orderBy(desc(developerAiEndpointVersions.revision))
      .limit(1);
    const nextRev = (latest?.revision ?? 0) + 1;
    const prompt = userPrompt || latest?.userPrompt || '';
    const actor = buildActorJson({ name: session.email, userId: session.userId });
    const spec = buildStubLlmSpec(ep.slug);
    const validated = validateDeveloperAiEndpointSpec(spec);
    if (validated.ok === false) {
      res.status(400).json({ error: 'validation_error', message: validated.error });
      return;
    }
    const specSha = sha256HexJson(spec);
    const [ver] = await db
      .insert(developerAiEndpointVersions)
      .values({
        endpointId: id,
        revision: nextRev,
        userPrompt: prompt,
        modelId: latest?.modelId ?? null,
        spec: spec as never,
        specSha256: specSha,
        llmRawResponse: '{"stub":true}' as never,
        statusId: CATALOG_IDS.status.active,
        createdBy: actor,
        updatedBy: actor,
      })
      .returning();
    res.status(201).json({ version: ver });
  };

  const postSubmitApproval: RequestHandler = async (req, res) => {
    const sub = req.auth?.sub;
    if (!sub) {
      res.status(401).json({ error: 'unauthorized', message: 'Missing principal.' });
      return;
    }
    const session = await ensureSession(sub, req.auth?.claims ?? {});
    if (!session) {
      res.status(500).json({ error: 'bootstrap_failed', message: 'Could not resolve developer org.' });
      return;
    }
    const id = req.params['id'];
    if (!id) {
      res.status(400).json({ error: 'bad_request' });
      return;
    }
    const db = getDb();
    const [epJoin] = await db
      .select({ ep: developerAiEndpoints })
      .from(developerAiEndpoints)
      .innerJoin(runtimeTenants, eq(developerAiEndpoints.tenantId, runtimeTenants.id))
      .where(
        and(
          eq(developerAiEndpoints.id, id),
          eq(runtimeTenants.orgId, session.orgId),
          isNull(developerAiEndpoints.deletedAt),
        ),
      )
      .limit(1);
    if (!epJoin) {
      res.status(404).json({ error: 'endpoint_not_found', message: 'Endpoint not found.' });
      return;
    }
    const [latest] = await db
      .select()
      .from(developerAiEndpointVersions)
      .where(and(eq(developerAiEndpointVersions.endpointId, id), isNull(developerAiEndpointVersions.deletedAt)))
      .orderBy(desc(developerAiEndpointVersions.revision))
      .limit(1);
    if (!latest) {
      res.status(400).json({ error: 'validation_error', message: 'No versions to submit.' });
      return;
    }

    const actor = buildActorJson({ name: session.email, userId: session.userId });
    const [open] = await db
      .select()
      .from(aiEndpointProductionRequests)
      .where(
        and(
          eq(aiEndpointProductionRequests.endpointId, id),
          isNull(aiEndpointProductionRequests.deletedAt),
          inArray(aiEndpointProductionRequests.statusId, [
            CATALOG_IDS.aiEndpointProductionRequestStates.pendingReview,
            CATALOG_IDS.aiEndpointProductionRequestStates.needsInformation,
            CATALOG_IDS.aiEndpointProductionRequestStates.awaitingUser,
          ]),
        ),
      )
      .limit(1);

    if (open) {
      await db
        .update(aiEndpointProductionRequests)
        .set({
          endpointVersionId: latest.id,
          statusId: CATALOG_IDS.aiEndpointProductionRequestStates.pendingReview,
          updatedBy: actor,
        })
        .where(eq(aiEndpointProductionRequests.id, open.id));
      res.status(200).json({ requestId: open.id, status: 'pending_review' });
      return;
    }

    const [reqRow] = await db
      .insert(aiEndpointProductionRequests)
      .values({
        endpointId: id,
        endpointVersionId: latest.id,
        statusId: CATALOG_IDS.aiEndpointProductionRequestStates.pendingReview,
        createdBy: actor,
        updatedBy: actor,
      })
      .returning();
    await db
      .update(developerAiEndpoints)
      .set({ statusId: CATALOG_IDS.developerAiEndpointLifecycle.active, updatedBy: actor })
      .where(eq(developerAiEndpoints.id, id));
    res.status(201).json({ requestId: reqRow?.id, status: 'pending_review' });
  };

  const getApproval: RequestHandler = async (req, res) => {
    const sub = req.auth?.sub;
    if (!sub) {
      res.status(401).json({ error: 'unauthorized', message: 'Missing principal.' });
      return;
    }
    const session = await ensureSession(sub, req.auth?.claims ?? {});
    if (!session) {
      res.status(500).json({ error: 'bootstrap_failed', message: 'Could not resolve developer org.' });
      return;
    }
    const id = req.params['id'];
    if (!id) {
      res.status(400).json({ error: 'bad_request' });
      return;
    }
    const db = getDb();
    const [epJoin] = await db
      .select({ ep: developerAiEndpoints })
      .from(developerAiEndpoints)
      .innerJoin(runtimeTenants, eq(developerAiEndpoints.tenantId, runtimeTenants.id))
      .where(
        and(
          eq(developerAiEndpoints.id, id),
          eq(runtimeTenants.orgId, session.orgId),
          isNull(developerAiEndpoints.deletedAt),
        ),
      )
      .limit(1);
    if (!epJoin) {
      res.status(404).json({ error: 'endpoint_not_found', message: 'Endpoint not found.' });
      return;
    }
    const [reqRow] = await db
      .select()
      .from(aiEndpointProductionRequests)
      .where(and(eq(aiEndpointProductionRequests.endpointId, id), isNull(aiEndpointProductionRequests.deletedAt)))
      .orderBy(desc(aiEndpointProductionRequests.updatedAt))
      .limit(1);
    res.json({
      endpointId: id,
      approvedProductionVersionId: epJoin.ep.approvedProductionVersionId,
      request: reqRow ?? null,
    });
  };

  const postApprovalUserResponse: RequestHandler = async (req, res) => {
    const sub = req.auth?.sub;
    if (!sub) {
      res.status(401).json({ error: 'unauthorized', message: 'Missing principal.' });
      return;
    }
    const session = await ensureSession(sub, req.auth?.claims ?? {});
    if (!session) {
      res.status(500).json({ error: 'bootstrap_failed', message: 'Could not resolve developer org.' });
      return;
    }
    const id = req.params['id'];
    const body = req.body as { message?: unknown };
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!id || !message) {
      res.status(400).json({ error: 'validation_error', message: 'message is required.' });
      return;
    }
    const db = getDb();
    const [epJoin] = await db
      .select({ ep: developerAiEndpoints })
      .from(developerAiEndpoints)
      .innerJoin(runtimeTenants, eq(developerAiEndpoints.tenantId, runtimeTenants.id))
      .where(
        and(
          eq(developerAiEndpoints.id, id),
          eq(runtimeTenants.orgId, session.orgId),
          isNull(developerAiEndpoints.deletedAt),
        ),
      )
      .limit(1);
    if (!epJoin) {
      res.status(404).json({ error: 'endpoint_not_found', message: 'Endpoint not found.' });
      return;
    }
    const [reqRow] = await db
      .select()
      .from(aiEndpointProductionRequests)
      .where(and(eq(aiEndpointProductionRequests.endpointId, id), isNull(aiEndpointProductionRequests.deletedAt)))
      .orderBy(desc(aiEndpointProductionRequests.updatedAt))
      .limit(1);
    if (!reqRow) {
      res.status(404).json({ error: 'endpoint_not_found', message: 'No approval request.' });
      return;
    }
    const actor = buildActorJson({ name: session.email, userId: session.userId });
    const prev = (reqRow.userFollowUp as { replies?: unknown[] } | null)?.replies;
    const replies = Array.isArray(prev) ? [...prev] : [];
    replies.push({ at: new Date().toISOString(), message });
    await db
      .update(aiEndpointProductionRequests)
      .set({
        userFollowUp: { replies } as never,
        statusId: CATALOG_IDS.aiEndpointProductionRequestStates.pendingReview,
        updatedBy: actor,
      })
      .where(eq(aiEndpointProductionRequests.id, reqRow.id));
    res.status(200).json({ ok: true });
  };

  const postInvokePreview: RequestHandler = async (req, res) => {
    const sub = req.auth?.sub;
    if (!sub) {
      res.status(401).json({ error: 'unauthorized', message: 'Missing principal.' });
      return;
    }
    const session = await ensureSession(sub, req.auth?.claims ?? {});
    if (!session) {
      res.status(500).json({ error: 'bootstrap_failed', message: 'Could not resolve developer org.' });
      return;
    }
    const id = req.params['id'];
    if (!id) {
      res.status(400).json({ error: 'bad_request' });
      return;
    }
    const db = getDb();
    const platform = await fetchSandboxAiPlatformSettings(db);
    const [epJoin] = await db
      .select({ ep: developerAiEndpoints, rt: runtimeTenants })
      .from(developerAiEndpoints)
      .innerJoin(runtimeTenants, eq(developerAiEndpoints.tenantId, runtimeTenants.id))
      .where(
        and(
          eq(developerAiEndpoints.id, id),
          eq(runtimeTenants.orgId, session.orgId),
          isNull(developerAiEndpoints.deletedAt),
        ),
      )
      .limit(1);
    if (!epJoin) {
      res.status(404).json({ error: 'endpoint_not_found', message: 'Endpoint not found.' });
      return;
    }
    const qRev = req.query['revision'];
    const revision =
      typeof qRev === 'string' && /^\d+$/.test(qRev) ? Number.parseInt(qRev, 10) : undefined;
    const baseVer = and(
      eq(developerAiEndpointVersions.endpointId, id),
      isNull(developerAiEndpointVersions.deletedAt),
    );
    const verWhere =
      revision !== undefined ? and(baseVer, eq(developerAiEndpointVersions.revision, revision)) : baseVer;
    const [ver] = await db
      .select()
      .from(developerAiEndpointVersions)
      .where(verWhere)
      .orderBy(desc(developerAiEndpointVersions.revision))
      .limit(1);
    if (!ver) {
      res.status(404).json({ error: 'endpoint_not_found', message: 'Version not found.' });
      return;
    }
    const spec = ver.spec as Record<string, unknown>;
    const v = validateDeveloperAiEndpointSpec(spec);
    if (v.ok === false) {
      res.status(400).json({ error: 'policy_violation', message: v.error });
      return;
    }
    const ppId = await getEndpointPricingProfileId(db, id);
    await resolveEffectivePricingPolicy(db, platform, epJoin.rt.id, ppId);
    const out = await executeHostedCustomEndpointSpec({ db, tenantId: epJoin.rt.id }, spec, req.body);
    res.status(out.httpStatus).json(out.json);
  };

  const getOpenApiMerge: RequestHandler = async (req, res) => {
    const sub = req.auth?.sub;
    if (!sub) {
      res.status(401).json({ error: 'unauthorized', message: 'Missing principal.' });
      return;
    }
    const session = await ensureSession(sub, req.auth?.claims ?? {});
    if (!session) {
      res.status(500).json({ error: 'bootstrap_failed', message: 'Could not resolve developer org.' });
      return;
    }
    const db = getDb();
    const [rt] = await db
      .select({ id: runtimeTenants.id })
      .from(runtimeTenants)
      .where(and(eq(runtimeTenants.orgId, session.orgId), isNull(runtimeTenants.deletedAt)))
      .limit(1);
    if (!rt) {
      res.json({
        openapi: '3.0.3',
        info: { title: 'Org private custom endpoints', version: '0.0.1' },
        paths: {},
      });
      return;
    }
    const raw = await db
      .select({
        endpointId: developerAiEndpoints.id,
        slug: developerAiEndpoints.slug,
        revision: developerAiEndpointVersions.revision,
        spec: developerAiEndpointVersions.spec,
      })
      .from(developerAiEndpoints)
      .innerJoin(
        developerAiEndpointVersions,
        and(
          eq(developerAiEndpointVersions.endpointId, developerAiEndpoints.id),
          isNull(developerAiEndpointVersions.deletedAt),
        ),
      )
      .where(and(eq(developerAiEndpoints.tenantId, rt.id), isNull(developerAiEndpoints.deletedAt)))
      .orderBy(desc(developerAiEndpointVersions.revision));

    const paths: Record<string, unknown> = {};
    const seen = new Set<string>();
    for (const row of raw) {
      if (seen.has(row.endpointId)) continue;
      seen.add(row.endpointId);
      const frag = row.spec && typeof row.spec === 'object' ? (row.spec as { openapi_fragment?: unknown }).openapi_fragment : undefined;
      if (frag && typeof frag === 'object' && 'paths' in (frag as object)) {
        Object.assign(paths, (frag as { paths: Record<string, unknown> }).paths);
      } else {
        paths[`/${row.slug}`] = {
          get: {
            summary: `Custom endpoint ${row.slug} (private preview)`,
            responses: { '200': { description: 'OK' } },
          },
        };
      }
    }
    res.json({
      openapi: '3.0.3',
      info: { title: 'Org private custom endpoints (sandbox)', version: '0.0.1' },
      paths,
    });
  };

  r.post('/runtime-tenants', postRuntimeTenants);
  r.get('/ai-endpoints', listAiEndpoints);
  r.post('/ai-endpoints', postAiEndpoints);
  r.get('/ai-endpoints/openapi', getOpenApiMerge);
  r.get('/ai-endpoints/:id', getAiEndpoint);
  r.post('/ai-endpoints/:id/generate', postGenerate);
  r.post('/ai-endpoints/:id/submit-approval', postSubmitApproval);
  r.get('/ai-endpoints/:id/approval', getApproval);
  r.post('/ai-endpoints/:id/approval/user-response', postApprovalUserResponse);
  r.post('/ai-endpoints/:id/invoke', postInvokePreview);

  return r;
}
