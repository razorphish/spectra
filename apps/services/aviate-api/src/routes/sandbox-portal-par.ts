import { and, desc, eq, isNull } from 'drizzle-orm';
import { Router, type RequestHandler } from 'express';

import { recordParWorkflowAuditDeferred } from '../lib/par-workflow-audit';
import {
  buildActorJson,
  CATALOG_IDS,
  fetchProductionAccessPortalFlags,
  getDb,
  insertParStaffQueueSubmissionNotifications,
  integrations,
  ParQuestionnaireValidationError,
  parseParDocumentsEnvelope,
  productionAccessRequests,
  resolveSpectraDatabaseUrl,
  type ParDocumentsEnvelope,
} from '@spectra/database';

export type EnsureSessionFn = (
  sub: string,
  claims: Record<string, unknown>,
) => Promise<{ userId: string; orgId: string; email: string } | null>;

type SessionRow = { userId: string; orgId: string; email: string };

function noDatabase(res: Parameters<RequestHandler>[1]): void {
  res.status(503).json({
    error: 'database_not_configured',
    message: 'Spectra database URL is not configured.',
  });
}

export function createSandboxPortalProductionAccessRouter(ensureSession: EnsureSessionFn): Router {
  const r = Router({ mergeParams: true });

  const requireParPortal: RequestHandler = async (_req, res, next) => {
    if (!resolveSpectraDatabaseUrl()) {
      noDatabase(res);
      return;
    }
    const db = getDb();
    const flags = await fetchProductionAccessPortalFlags(db);
    if (!flags.productionAccessIntegratorPortalEnabled) {
      res.status(403).json({
        error: 'production_access_disabled',
        message: 'Production access is disabled for this deployment.',
      });
      return;
    }
    next();
  };

  /** POST — new PAR row for M2M integration (v1 integration path only). */
  const postPar: RequestHandler = async (req, res) => {
    const sub = req.auth?.sub;
    if (!sub) {
      res.status(401).json({ error: 'unauthorized', message: 'Missing principal.' });
      return;
    }
    const sessionRow = (await ensureSession(sub, req.auth?.claims ?? {})) as SessionRow | null;
    if (!sessionRow) {
      res.status(500).json({ error: 'bootstrap_failed', message: 'Could not resolve developer org.' });
      return;
    }
    const integrationId = req.params['integrationId'];
    if (!integrationId) {
      res.status(400).json({ error: 'bad_request', message: 'Missing integrationId.' });
      return;
    }
    const db = getDb();
    const flags = await fetchProductionAccessPortalFlags(db);
    const [integ] = await db
      .select({ id: integrations.id })
      .from(integrations)
      .where(
        and(
          eq(integrations.id, integrationId),
          eq(integrations.orgId, sessionRow.orgId),
          isNull(integrations.deletedAt),
        ),
      )
      .limit(1);
    if (!integ) {
      res.status(404).json({ error: 'not_found', message: 'Integration not found.' });
      return;
    }
    if (!req.body || typeof req.body !== 'object' || !('documents' in req.body)) {
      res.status(400).json({ error: 'validation_error', message: 'documents envelope is required.' });
      return;
    }
    let documents: ParDocumentsEnvelope;
    try {
      documents = parseParDocumentsEnvelope((req.body as { documents?: unknown }).documents);
    } catch (e) {
      if (e instanceof ParQuestionnaireValidationError) {
        res.status(400).json({ error: 'validation_error', issues: e.issues });
        return;
      }
      throw e;
    }
    const actor = buildActorJson({ name: sessionRow.email, userId: sessionRow.userId });
    try {
      const row = await db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(productionAccessRequests)
          .values({
            integrationId,
            applicationId: null,
            submittedByUserId: sessionRow.userId,
            statusId: CATALOG_IDS.productionAccessRequestStates.pending,
            documents: documents as unknown as Record<string, unknown>,
            createdBy: actor,
            updatedBy: actor,
          })
          .returning();
        if (!inserted) throw new Error('insert_failed');
        if (flags.productionAccessStaffConsoleEnabled) {
          await insertParStaffQueueSubmissionNotifications(tx, {
            productionAccessRequestId: inserted.id,
            orgId: sessionRow.orgId,
            type: 'production_access.submitted',
            actorUserId: sessionRow.userId,
          });
        }
        return inserted;
      });
      recordParWorkflowAuditDeferred(db, {
        actorUserId: sessionRow.userId,
        action: 'production_access_request.submitted',
        resource: 'production_access_request',
        payload: { productionAccessRequestId: row.id, integrationId },
      });
      res.status(201).json({
        id: row.id,
        statusId: row.statusId,
        integrationId: row.integrationId,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'create_failed';
      if (msg.includes('unique') || msg.includes('duplicate')) {
        res.status(409).json({
          error: 'open_request_exists',
          message: 'An open production access request already exists for this integration.',
        });
        return;
      }
      console.error('[aviate-api] POST production-access-request', e);
      res.status(500).json({ error: 'create_failed', message: 'Could not create request.' });
    }
  };

  /** GET current PAR for integration (latest row). */
  const getPar: RequestHandler = async (req, res) => {
    const sub = req.auth?.sub;
    if (!sub) {
      res.status(401).json({ error: 'unauthorized', message: 'Missing principal.' });
      return;
    }
    const sessionRow = (await ensureSession(sub, req.auth?.claims ?? {})) as SessionRow | null;
    if (!sessionRow) {
      res.status(500).json({ error: 'bootstrap_failed', message: 'Could not resolve developer org.' });
      return;
    }
    const integrationId = req.params['integrationId'];
    if (!integrationId) {
      res.status(400).json({ error: 'bad_request', message: 'Missing integrationId.' });
      return;
    }
    const db = getDb();
    const [row] = await db
      .select()
      .from(productionAccessRequests)
      .where(
        and(
          eq(productionAccessRequests.integrationId, integrationId),
          isNull(productionAccessRequests.deletedAt),
        ),
      )
      .orderBy(desc(productionAccessRequests.createdAt))
      .limit(1);
    if (!row) {
      res.status(404).json({ error: 'not_found', message: 'No production access request for this integration.' });
      return;
    }
    const [integ] = await db
      .select({ orgId: integrations.orgId })
      .from(integrations)
      .where(eq(integrations.id, integrationId))
      .limit(1);
    if (!integ || integ.orgId !== sessionRow.orgId) {
      res.status(404).json({ error: 'not_found', message: 'Integration not found.' });
      return;
    }
    const flags = await fetchProductionAccessPortalFlags(db);
    res.json({
      id: row.id,
      statusId: row.statusId,
      customerStatusMessage: row.customerStatusMessage,
      documents: row.documents,
      productionAccessReviewSlaBusinessDays: flags.productionAccessReviewSlaBusinessDays,
      productionAccessReviewSlaDisclaimer: flags.productionAccessReviewSlaDisclaimer,
      productionAccessIntegratorPortalEnabled: flags.productionAccessIntegratorPortalEnabled,
      productionAccessIntegratorCredentialsUiEnabled: flags.productionAccessIntegratorCredentialsUiEnabled,
    });
  };

  r.use(requireParPortal);
  r.post('/production-access-requests', postPar);
  r.get('/production-access-request', getPar);

  return r;
}
