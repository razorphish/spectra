import { and, desc, eq, isNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { Router, type RequestHandler } from 'express';

import {
  applications,
  catalog,
  fetchProductionAccessPortalFlags,
  getDb,
  integrations,
  productionAccessRequests,
  resolveSpectraDatabaseUrl,
  users,
} from '@spectra/database';

import { requireAuth0AccessToken } from '../lib/auth';

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
    if (!id) {
      res.status(400).json({ error: 'bad_request' });
      return;
    }
    const db = getDb();
    const [row] = await db
      .select()
      .from(productionAccessRequests)
      .where(and(eq(productionAccessRequests.id, id), isNull(productionAccessRequests.deletedAt)))
      .limit(1);
    if (!row) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    res.json(row);
  });

  r.use(g);
}
