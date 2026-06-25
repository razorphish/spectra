import { and, desc, eq, isNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { Router, type RequestHandler } from 'express';

import {
  applications,
  buildActorJson,
  catalog,
  CATALOG_IDS,
  developerAiEndpoints,
  fetchProductionAccessPortalFlags,
  getDb,
  integrations,
  orgs,
  productionAccessRequests,
  resolveSpectraDatabaseUrl,
  runtimeTenants,
  users,
} from '@spectra/database';

import { requireAuth0AccessToken } from '../lib/auth';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function staffActor(req: { auth?: { claims?: Record<string, unknown>; sub?: string } }) {
  const sub = req.auth?.sub ?? 'staff';
  return buildActorJson({ name: sub, userId: null });
}

const requireStaffParConsole: RequestHandler = async (_req, res, next) => {
  if (!resolveSpectraDatabaseUrl()) {
    res.status(503).json({ error: 'database_not_configured' });
    return;
  }
  const flags = await fetchProductionAccessPortalFlags(getDb());
  if (!flags.productionAccessStaffConsoleEnabled) {
    res.status(404).json({ error: 'not_found', message: 'Production access console is disabled.' });
    return;
  }
  next();
};

export function registerAdminProductionAccessRoutes(r: Router): void {
  const g = Router();
  g.use(requireAuth0AccessToken);
  g.use(requireStaffParConsole);

  g.get('/production-access-requests', async (_req, res) => {
    const db = getDb();
    const parStatusCat = alias(catalog, 'par_status_cat');
    const parSubmitUser = alias(users, 'par_submit_user');
    const rows = await db
      .select({
        id: productionAccessRequests.id,
        statusId: productionAccessRequests.statusId,
        statusName: parStatusCat.name,
        statusDescription: parStatusCat.description,
        integrationId: productionAccessRequests.integrationId,
        integrationName: integrations.name,
        applicationId: productionAccessRequests.applicationId,
        applicationName: applications.name,
        submittedByUserId: productionAccessRequests.submittedByUserId,
        submittedByEmail: parSubmitUser.email,
        createdAt: productionAccessRequests.createdAt,
      })
      .from(productionAccessRequests)
      .leftJoin(parStatusCat, eq(productionAccessRequests.statusId, parStatusCat.id))
      .leftJoin(parSubmitUser, eq(productionAccessRequests.submittedByUserId, parSubmitUser.id))
      .leftJoin(integrations, eq(productionAccessRequests.integrationId, integrations.id))
      .leftJoin(applications, eq(productionAccessRequests.applicationId, applications.id))
      .where(isNull(productionAccessRequests.deletedAt))
      .orderBy(desc(productionAccessRequests.createdAt))
      .limit(100);
    res.json({ items: rows });
  });

  g.get('/production-access-requests/:id', async (req, res) => {
    const id = req.params['id'];
    if (!id || !UUID_RE.test(id)) {
      res.status(400).json({ error: 'bad_request' });
      return;
    }
    const db = getDb();
    const parStatusCat = alias(catalog, 'par_status_cat');
    const parSubmitUser = alias(users, 'par_submit_user');
    const integrationOrg = alias(orgs, 'integration_org');
    const applicationOrg = alias(orgs, 'application_org');
    const [row] = await db
      .select({
        id: productionAccessRequests.id,
        statusId: productionAccessRequests.statusId,
        statusName: parStatusCat.name,
        statusDescription: parStatusCat.description,
        integrationId: productionAccessRequests.integrationId,
        integrationName: integrations.name,
        applicationId: productionAccessRequests.applicationId,
        applicationName: applications.name,
        orgId: integrations.orgId,
        orgName: integrationOrg.name,
        applicationOrgId: applications.orgId,
        applicationOrgName: applicationOrg.name,
        submittedByUserId: productionAccessRequests.submittedByUserId,
        submittedByEmail: parSubmitUser.email,
        customerStatusMessage: productionAccessRequests.customerStatusMessage,
        staffInternalNotes: productionAccessRequests.staffInternalNotes,
        documents: productionAccessRequests.documents,
        publicReferenceToken: productionAccessRequests.publicReferenceToken,
        approvedM2mOauthClientId: productionAccessRequests.approvedM2mOauthClientId,
        approvedProductionOrgId: productionAccessRequests.approvedProductionOrgId,
        createdAt: productionAccessRequests.createdAt,
        updatedAt: productionAccessRequests.updatedAt,
        createdBy: productionAccessRequests.createdBy,
        updatedBy: productionAccessRequests.updatedBy,
      })
      .from(productionAccessRequests)
      .leftJoin(parStatusCat, eq(productionAccessRequests.statusId, parStatusCat.id))
      .leftJoin(parSubmitUser, eq(productionAccessRequests.submittedByUserId, parSubmitUser.id))
      .leftJoin(integrations, eq(productionAccessRequests.integrationId, integrations.id))
      .leftJoin(applications, eq(productionAccessRequests.applicationId, applications.id))
      .leftJoin(integrationOrg, eq(integrations.orgId, integrationOrg.id))
      .leftJoin(applicationOrg, eq(applications.orgId, applicationOrg.id))
      .where(and(eq(productionAccessRequests.id, id), isNull(productionAccessRequests.deletedAt)))
      .limit(1);
    if (!row) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    // A request targets either an integration OR an application; surface the owning org of whichever it is.
    const { applicationOrgId, applicationOrgName, ...rest } = row;
    res.json({
      ...rest,
      orgId: row.orgId ?? applicationOrgId,
      orgName: row.orgName ?? applicationOrgName,
    });
  });

  // Custom APIs (developer AI endpoints) owned by the org behind this request.
  g.get('/production-access-requests/:id/custom-apis', async (req, res) => {
    const id = req.params['id'];
    if (!id || !UUID_RE.test(id)) {
      res.status(400).json({ error: 'bad_request' });
      return;
    }
    const db = getDb();
    const [par] = await db
      .select({
        integrationOrgId: integrations.orgId,
        applicationOrgId: applications.orgId,
      })
      .from(productionAccessRequests)
      .leftJoin(integrations, eq(productionAccessRequests.integrationId, integrations.id))
      .leftJoin(applications, eq(productionAccessRequests.applicationId, applications.id))
      .where(and(eq(productionAccessRequests.id, id), isNull(productionAccessRequests.deletedAt)))
      .limit(1);
    if (!par) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    const orgId = par.integrationOrgId ?? par.applicationOrgId;
    if (!orgId) {
      res.json({ orgId: null, items: [] });
      return;
    }
    const statusCat = alias(catalog, 'endpoint_status_cat');
    const items = await db
      .select({
        id: developerAiEndpoints.id,
        slug: developerAiEndpoints.slug,
        statusId: developerAiEndpoints.statusId,
        statusName: statusCat.name,
        approvedProductionVersionId: developerAiEndpoints.approvedProductionVersionId,
        createdAt: developerAiEndpoints.createdAt,
        updatedAt: developerAiEndpoints.updatedAt,
      })
      .from(developerAiEndpoints)
      .innerJoin(runtimeTenants, eq(developerAiEndpoints.tenantId, runtimeTenants.id))
      .leftJoin(statusCat, eq(developerAiEndpoints.statusId, statusCat.id))
      .where(and(eq(runtimeTenants.orgId, orgId), isNull(developerAiEndpoints.deletedAt)))
      .orderBy(desc(developerAiEndpoints.createdAt))
      .limit(200);
    res.json({ orgId, items });
  });

  // Approve / revoke / update a production access request.
  g.patch('/production-access-requests/:id', async (req, res) => {
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
      .select({ id: productionAccessRequests.id })
      .from(productionAccessRequests)
      .where(and(eq(productionAccessRequests.id, id), isNull(productionAccessRequests.deletedAt)))
      .limit(1);
    if (!reqRow) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    const note = typeof b['note'] === 'string' ? b['note'].trim() : '';

    if (action === 'approve') {
      const [row] = await db
        .update(productionAccessRequests)
        .set({
          statusId: CATALOG_IDS.productionAccessRequestStates.approved,
          ...(note ? { customerStatusMessage: note } : {}),
          updatedBy: actor,
        })
        .where(eq(productionAccessRequests.id, id))
        .returning();
      res.json(row);
      return;
    }

    if (action === 'revoke') {
      const [row] = await db
        .update(productionAccessRequests)
        .set({
          statusId: CATALOG_IDS.productionAccessRequestStates.rejected,
          ...(note ? { customerStatusMessage: note } : {}),
          updatedBy: actor,
        })
        .where(eq(productionAccessRequests.id, id))
        .returning();
      res.json(row);
      return;
    }

    if (action === 'update') {
      const [row] = await db
        .update(productionAccessRequests)
        .set({
          ...(typeof b['customerStatusMessage'] === 'string' || b['customerStatusMessage'] === null ?
            { customerStatusMessage: b['customerStatusMessage'] as string | null }
          : {}),
          ...(typeof b['staffInternalNotes'] === 'string' || b['staffInternalNotes'] === null ?
            { staffInternalNotes: b['staffInternalNotes'] as string | null }
          : {}),
          updatedBy: actor,
        })
        .where(eq(productionAccessRequests.id, id))
        .returning();
      res.json(row);
      return;
    }

    res.status(400).json({ error: 'validation_error', message: 'Unknown action.' });
  });

  r.use(g);
}
