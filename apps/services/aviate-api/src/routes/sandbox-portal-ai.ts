import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { Router, type RequestHandler } from 'express';

import {
  aiEndpointProductionRequests,
  buildActorJson,
  CATALOG_IDS,
  developerAiEndpointVersions,
  developerAiEndpoints,
  fetchSandboxAiPlatformSettings,
  getDb,
  getDefaultAiLlmModel,
  getEndpointPricingProfileId,
  resolveEffectivePricingPolicy,
  reseedSandboxMrpFixturesForTenant,
  resolveSpectraDatabaseUrl,
  runtimeTenants,
  sandboxMrpItems,
  seedSandboxMrpFixturesForTenant,
  sha256HexJson,
  validateDeveloperAiEndpointSpec,
} from '@spectra/database';

import { executeHostedCustomEndpointSpec } from '@spectra/database';
import { AiModelNotConfiguredError, generateEndpointSpecFromPrompt } from '../lib/sandbox-ai-llm';

import type { EnsureSessionFn } from './sandbox-portal-par';

const EXTERNAL_REF_MAX = 128;
const EXTERNAL_REF_RE = /^[a-zA-Z0-9._-]{1,128}$/;

function noDatabase(res: Parameters<RequestHandler>[1]): void {
  res.status(503).json({
    error: 'database_not_configured',
    message: 'Spectra database URL is not configured.',
  });
}

/** Derives a slug candidate from prompt words (frontend adds a uniqueness suffix). */
function suggestSlugFromPrompt(prompt: string): string {
  const base = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 5)
    .join('-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return base.length >= 2 ? base : 'endpoint';
}

type GeneratedEndpointSpec = {
  spec: Record<string, unknown>;
  llmRawResponse: string;
  modelId: string;
};

/** Resolves the model, calls the LLM, and validates the produced spec. Throws on config/validation failure. */
async function generateValidatedSpec(
  db: ReturnType<typeof getDb>,
  userPrompt: string,
  pinnedModelId?: string | null,
): Promise<GeneratedEndpointSpec> {
  const model = await getDefaultAiLlmModel(db, pinnedModelId ?? undefined);
  const { spec, llmRawResponse } = await generateEndpointSpecFromPrompt({ userPrompt, model });
  const validated = validateDeveloperAiEndpointSpec(spec);
  if (validated.ok === false) {
    const err = new Error(validated.error);
    err.name = 'SpecValidationError';
    throw err;
  }
  return { spec, llmRawResponse, modelId: model.id };
}

/** Maps spec-generation errors to an HTTP response. Returns true if it handled (responded). */
function handleGenerationError(res: Parameters<RequestHandler>[1], e: unknown): boolean {
  if (e instanceof AiModelNotConfiguredError) {
    res.status(503).json({ error: 'ai_model_not_configured', message: e.message });
    return true;
  }
  if (e instanceof Error && e.name === 'SpecValidationError') {
    res.status(422).json({ error: 'spec_validation_error', message: `Generated spec was invalid: ${e.message}` });
    return true;
  }
  res.status(502).json({
    error: 'ai_generation_failed',
    message: e instanceof Error ? e.message : 'Failed to generate endpoint spec.',
  });
  return true;
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

  /** Deletes and regenerates this org's MRP demo fixtures (so an existing tenant picks up richer data). */
  const postReseedFixtures: RequestHandler = async (req, res) => {
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
      res.status(400).json({
        error: 'tenant_not_bootstrapped',
        message: 'POST /v1/platform/sandbox/runtime-tenants first.',
      });
      return;
    }
    await reseedSandboxMrpFixturesForTenant(db, rt.id);
    const [cnt] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(sandboxMrpItems)
      .where(and(eq(sandboxMrpItems.tenantId, rt.id), isNull(sandboxMrpItems.deletedAt)));
    res.status(200).json({ tenantId: rt.id, itemCount: cnt?.n ?? 0 });
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

    // Flag endpoints with an open production request (pending review / needs info / awaiting user).
    const endpointIds = rows.map((r) => r.id);
    const openReqs =
      endpointIds.length > 0 ?
        await db
          .select({ endpointId: aiEndpointProductionRequests.endpointId })
          .from(aiEndpointProductionRequests)
          .where(
            and(
              inArray(aiEndpointProductionRequests.endpointId, endpointIds),
              isNull(aiEndpointProductionRequests.deletedAt),
              inArray(aiEndpointProductionRequests.statusId, [
                CATALOG_IDS.aiEndpointProductionRequestStates.pendingReview,
                CATALOG_IDS.aiEndpointProductionRequestStates.needsInformation,
                CATALOG_IDS.aiEndpointProductionRequestStates.awaitingUser,
              ]),
            ),
          )
      : [];
    const pendingSet = new Set(openReqs.map((r) => r.endpointId));
    const items = rows.map((r) => ({ ...r, pendingProductionRequest: pendingSet.has(r.id) }));
    res.json({ items, tenantId: rt.id });
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
    const pinnedModelId = typeof body.modelId === 'string' ? body.modelId : null;

    // Generate the spec from the prompt before persisting anything, so a config/LLM
    // failure doesn't leave an orphaned endpoint with no version.
    let generated: GeneratedEndpointSpec;
    try {
      generated = await generateValidatedSpec(db, userPrompt, pinnedModelId);
    } catch (e: unknown) {
      handleGenerationError(res, e);
      return;
    }

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

    const specSha = sha256HexJson(generated.spec);
    const [ver] = await db
      .insert(developerAiEndpointVersions)
      .values({
        endpointId: ep.id,
        revision: 1,
        userPrompt,
        modelId: generated.modelId,
        spec: generated.spec as never,
        specSha256: specSha,
        llmRawResponse: generated.llmRawResponse as never,
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
    const [latest] = await db
      .select()
      .from(developerAiEndpointVersions)
      .where(and(eq(developerAiEndpointVersions.endpointId, id), isNull(developerAiEndpointVersions.deletedAt)))
      .orderBy(desc(developerAiEndpointVersions.revision))
      .limit(1);
    const nextRev = (latest?.revision ?? 0) + 1;
    const prompt = userPrompt || latest?.userPrompt || '';
    if (!prompt) {
      res.status(400).json({ error: 'validation_error', message: 'userPrompt is required to generate.' });
      return;
    }
    const actor = buildActorJson({ name: session.email, userId: session.userId });

    let generated: GeneratedEndpointSpec;
    try {
      generated = await generateValidatedSpec(db, prompt, latest?.modelId ?? null);
    } catch (e: unknown) {
      handleGenerationError(res, e);
      return;
    }

    const specSha = sha256HexJson(generated.spec);
    const [ver] = await db
      .insert(developerAiEndpointVersions)
      .values({
        endpointId: id,
        revision: nextRev,
        userPrompt: prompt,
        modelId: generated.modelId,
        spec: generated.spec as never,
        specSha256: specSha,
        llmRawResponse: generated.llmRawResponse as never,
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

  const postPreview: RequestHandler = async (req, res) => {
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
    const body = (req.body ?? {}) as { userPrompt?: unknown; modelId?: unknown };
    const userPrompt = typeof body.userPrompt === 'string' ? body.userPrompt.trim() : '';
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
    // Dry run: generate a spec from the prompt and execute it read-only — persists nothing.
    let generated: GeneratedEndpointSpec;
    try {
      generated = await generateValidatedSpec(db, userPrompt, typeof body.modelId === 'string' ? body.modelId : null);
    } catch (e: unknown) {
      handleGenerationError(res, e);
      return;
    }
    const out = await executeHostedCustomEndpointSpec({ db, tenantId: rt.id }, generated.spec, {});
    res.status(200).json({
      spec: generated.spec,
      result: out.json,
      httpStatus: out.httpStatus,
      slugSuggestion: suggestSlugFromPrompt(userPrompt),
    });
  };

  r.post('/runtime-tenants', postRuntimeTenants);
  r.post('/reseed-fixtures', postReseedFixtures);
  r.get('/ai-endpoints', listAiEndpoints);
  r.post('/ai-endpoints', postAiEndpoints);
  r.post('/ai-endpoints/preview', postPreview);
  r.get('/ai-endpoints/openapi', getOpenApiMerge);
  r.get('/ai-endpoints/:id', getAiEndpoint);
  r.post('/ai-endpoints/:id/generate', postGenerate);
  r.post('/ai-endpoints/:id/submit-approval', postSubmitApproval);
  r.get('/ai-endpoints/:id/approval', getApproval);
  r.post('/ai-endpoints/:id/approval/user-response', postApprovalUserResponse);
  r.post('/ai-endpoints/:id/invoke', postInvokePreview);

  return r;
}
