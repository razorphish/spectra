import type { RequestHandler, Router } from 'express';
import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  or,
  sql,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import {
  catalog,
  getDb,
  integrations,
  m2mOauthClients,
  m2mTokenIssuanceLog,
  orgs,
} from '@spectra/database';

import { requireAuth0AccessToken } from '../lib/auth';
import {
  ensureDatabaseConfigured,
  logHandlerError,
  parseIsoDateQuery,
  queryString,
  respondValidationError,
} from '../lib/route-helpers';
import {
  requireStaffPermission,
  STAFF_PERMISSION_INTEGRATIONS_EXPORT,
  STAFF_PERMISSION_INTEGRATIONS_READ,
} from '../lib/staff-permissions';

const MOD = 'admin-integrations.ts';

function escapeIlikePattern(raw: string): string {
  return raw.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parsePageParams(req: { query: unknown }): {
  page: number;
  pageSize: number;
  offset: number;
} {
  const q = req.query as Record<string, unknown>;
  const page = Math.max(1, parseInt(String(q['page'] ?? '1'), 10) || 1);
  const pageSizeRaw = parseInt(String(q['pageSize'] ?? '50'), 10) || 50;
  const pageSize = Math.min(200, Math.max(1, pageSizeRaw));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

const listIntegrations: RequestHandler = async (req, res) => {
  const handler = `${MOD}:listIntegrations`;
  if (!ensureDatabaseConfigured(req, res, handler, 'database not configured')) {
    return;
  }

  const { page, pageSize, offset } = parsePageParams(req);
  const q = queryString(req, 'q', true);
  const orgIdFilter = queryString(req, 'orgId', true);

  const catStatus = alias(catalog, 'integration_catalog_status');

  const conditions = [isNull(integrations.deletedAt)] as ReturnType<typeof and>[];
  if (orgIdFilter) {
    if (!UUID_RE.test(orgIdFilter)) {
      respondValidationError(req, res, handler, {
        error: 'invalid_org_id',
        message: 'orgId must be a UUID.',
      });
      return;
    }
    conditions.push(eq(integrations.orgId, orgIdFilter));
  }

  if (q) {
    const p = `%${escapeIlikePattern(q)}%`;
    conditions.push(
      or(
        ilike(integrations.name, p),
        ilike(orgs.name, p),
        ilike(m2mOauthClients.clientId, p),
        sql`${integrations.id}::text ILIKE ${p}`,
        sql`${integrations.orgId}::text ILIKE ${p}`
      )!
    );
  }

  const whereClause = and(...conditions);

  try {
    const db = getDb();

    const [totalRow] = await db
      .select({ c: count() })
      .from(integrations)
      .innerJoin(orgs, eq(integrations.orgId, orgs.id))
      .leftJoin(
        m2mOauthClients,
        and(
          eq(m2mOauthClients.integrationId, integrations.id),
          isNull(m2mOauthClients.deletedAt)
        )
      )
      .where(whereClause);

    const total = Number(totalRow?.c ?? 0);

    const rows = await db
      .select({
        id: integrations.id,
        name: integrations.name,
        description: integrations.description,
        orgId: integrations.orgId,
        orgName: orgs.name,
        clientId: m2mOauthClients.clientId,
        statusId: integrations.statusId,
        statusName: catStatus.name,
        createdAt: integrations.createdAt,
        updatedAt: integrations.updatedAt,
        createdBy: integrations.createdBy,
        updatedBy: integrations.updatedBy,
      })
      .from(integrations)
      .innerJoin(orgs, eq(integrations.orgId, orgs.id))
      .leftJoin(catStatus, eq(integrations.statusId, catStatus.id))
      .leftJoin(
        m2mOauthClients,
        and(
          eq(m2mOauthClients.integrationId, integrations.id),
          isNull(m2mOauthClients.deletedAt)
        )
      )
      .where(whereClause)
      .orderBy(desc(integrations.updatedAt))
      .limit(pageSize)
      .offset(offset);

    res.status(200).json({
      page,
      pageSize,
      total,
      items: rows,
    });
  } catch (e) {
    const message = logHandlerError(req, handler, e, `${handler} failed`);
    res.status(500).json({ error: 'integrations_list_failed', message });
  }
};

const getIntegration: RequestHandler = async (req, res) => {
  const handler = `${MOD}:getIntegration`;
  if (!ensureDatabaseConfigured(req, res, handler, 'database not configured')) {
    return;
  }
  const id = req.params['integrationId'];
  if (!id || !UUID_RE.test(id)) {
    respondValidationError(req, res, handler, {
      error: 'invalid_integration_id',
      message: 'integrationId must be a UUID.',
    });
    return;
  }

  const catInt = alias(catalog, 'cat_integration');
  const catM2m = alias(catalog, 'cat_m2m');

  try {
    const db = getDb();
    const rows = await db
      .select({
        integration: {
          id: integrations.id,
          name: integrations.name,
          description: integrations.description,
          orgId: integrations.orgId,
          statusId: integrations.statusId,
          statusName: catInt.name,
          createdAt: integrations.createdAt,
          updatedAt: integrations.updatedAt,
          deletedAt: integrations.deletedAt,
          createdBy: integrations.createdBy,
          updatedBy: integrations.updatedBy,
        },
        organization: {
          id: orgs.id,
          name: orgs.name,
        },
        m2mClient: {
          id: m2mOauthClients.id,
          clientId: m2mOauthClients.clientId,
          grantedScopes: m2mOauthClients.grantedScopes,
          statusId: m2mOauthClients.statusId,
          statusName: catM2m.name,
          createdAt: m2mOauthClients.createdAt,
          updatedAt: m2mOauthClients.updatedAt,
          deletedAt: m2mOauthClients.deletedAt,
          createdBy: m2mOauthClients.createdBy,
          updatedBy: m2mOauthClients.updatedBy,
        },
      })
      .from(integrations)
      .innerJoin(orgs, eq(integrations.orgId, orgs.id))
      .leftJoin(catInt, eq(integrations.statusId, catInt.id))
      .leftJoin(
        m2mOauthClients,
        and(
          eq(m2mOauthClients.integrationId, integrations.id),
          isNull(m2mOauthClients.deletedAt)
        )
      )
      .leftJoin(catM2m, eq(m2mOauthClients.statusId, catM2m.id))
      .where(eq(integrations.id, id))
      .limit(1);

    const row = rows[0];
    if (!row) {
      res.status(404).json({ error: 'not_found', message: 'Integration not found.' });
      return;
    }

    res.status(200).json({
      ...row,
      isDeleted: row.integration.deletedAt != null,
    });
  } catch (e) {
    const message = logHandlerError(req, handler, e, `${handler} failed`);
    res.status(500).json({ error: 'integration_detail_failed', message });
  }
};

const listTokenIssuance: RequestHandler = async (req, res) => {
  const handler = `${MOD}:listTokenIssuance`;
  if (!ensureDatabaseConfigured(req, res, handler, 'database not configured')) {
    return;
  }
  const id = req.params['integrationId'];
  if (!id || !UUID_RE.test(id)) {
    respondValidationError(req, res, handler, {
      error: 'invalid_integration_id',
      message: 'integrationId must be a UUID.',
    });
    return;
  }

  const { page, pageSize, offset } = parsePageParams(req);
  const from = parseIsoDateQuery(queryString(req, 'from', true) ?? undefined);
  if (from === null) {
    respondValidationError(req, res, handler, {
      error: 'invalid_from',
      message: 'from must be a valid ISO date string when provided.',
    });
    return;
  }
  const to = parseIsoDateQuery(queryString(req, 'to', true) ?? undefined);
  if (to === null) {
    respondValidationError(req, res, handler, {
      error: 'invalid_to',
      message: 'to must be a valid ISO date string when provided.',
    });
    return;
  }

  try {
    const db = getDb();

    const [intRow] = await db
      .select({ id: integrations.id })
      .from(integrations)
      .where(eq(integrations.id, id))
      .limit(1);

    if (!intRow) {
      res.status(404).json({ error: 'not_found', message: 'Integration not found.' });
      return;
    }

    const m2mIds = await db
      .select({ id: m2mOauthClients.id })
      .from(m2mOauthClients)
      .where(eq(m2mOauthClients.integrationId, id));

    const clientIdList = m2mIds.map((r) => r.id);
    if (clientIdList.length === 0) {
      res.status(200).json({
        page,
        pageSize,
        total: 0,
        items: [],
      });
      return;
    }

    const timeConds = [] as ReturnType<typeof and>[];
    if (from) timeConds.push(gte(m2mTokenIssuanceLog.issuedAt, from));
    if (to) timeConds.push(lte(m2mTokenIssuanceLog.issuedAt, to));

    const whereIssuance = and(
      inArray(m2mTokenIssuanceLog.m2mOauthClientId, clientIdList),
      ...(timeConds.length ? timeConds : [])
    );

    const [totalRow] = await db
      .select({ c: count() })
      .from(m2mTokenIssuanceLog)
      .where(whereIssuance);

    const total = Number(totalRow?.c ?? 0);

    const rows = await db
      .select({
        id: m2mTokenIssuanceLog.id,
        jti: m2mTokenIssuanceLog.jti,
        m2mOauthClientId: m2mTokenIssuanceLog.m2mOauthClientId,
        orgId: m2mTokenIssuanceLog.orgId,
        issuedAt: m2mTokenIssuanceLog.issuedAt,
        expiresAt: m2mTokenIssuanceLog.expiresAt,
        revokedAt: m2mTokenIssuanceLog.revokedAt,
        createdBy: m2mTokenIssuanceLog.createdBy,
      })
      .from(m2mTokenIssuanceLog)
      .where(whereIssuance)
      .orderBy(desc(m2mTokenIssuanceLog.issuedAt))
      .limit(pageSize)
      .offset(offset);

    res.status(200).json({
      page,
      pageSize,
      total,
      items: rows,
    });
  } catch (e) {
    const message = logHandlerError(req, handler, e, `${handler} failed`);
    res.status(500).json({ error: 'token_issuance_list_failed', message });
  }
};

const EXPORT_ISSUANCE_CAP = 10_000;

const exportIntegration: RequestHandler = async (req, res) => {
  const handler = `${MOD}:exportIntegration`;
  if (!ensureDatabaseConfigured(req, res, handler, 'database not configured')) {
    return;
  }
  const id = req.params['integrationId'];
  if (!id || !UUID_RE.test(id)) {
    respondValidationError(req, res, handler, {
      error: 'invalid_integration_id',
      message: 'integrationId must be a UUID.',
    });
    return;
  }

  const format = (queryString(req, 'format', true) ?? 'json').toLowerCase();
  if (format !== 'json' && format !== 'csv') {
    respondValidationError(req, res, handler, {
      error: 'invalid_format',
      message: 'format must be json or csv.',
    });
    return;
  }

  const catInt = alias(catalog, 'cat_integration');
  const catM2m = alias(catalog, 'cat_m2m');

  try {
    const db = getDb();
    const [bundle] = await db
      .select({
        integration: {
          id: integrations.id,
          name: integrations.name,
          description: integrations.description,
          orgId: integrations.orgId,
          statusId: integrations.statusId,
          statusName: catInt.name,
          createdAt: integrations.createdAt,
          updatedAt: integrations.updatedAt,
          deletedAt: integrations.deletedAt,
          createdBy: integrations.createdBy,
          updatedBy: integrations.updatedBy,
        },
        organization: {
          id: orgs.id,
          name: orgs.name,
        },
        m2mClient: {
          id: m2mOauthClients.id,
          clientId: m2mOauthClients.clientId,
          grantedScopes: m2mOauthClients.grantedScopes,
          statusId: m2mOauthClients.statusId,
          statusName: catM2m.name,
          createdAt: m2mOauthClients.createdAt,
          updatedAt: m2mOauthClients.updatedAt,
          deletedAt: m2mOauthClients.deletedAt,
          createdBy: m2mOauthClients.createdBy,
          updatedBy: m2mOauthClients.updatedBy,
        },
      })
      .from(integrations)
      .innerJoin(orgs, eq(integrations.orgId, orgs.id))
      .leftJoin(catInt, eq(integrations.statusId, catInt.id))
      .leftJoin(
        m2mOauthClients,
        and(
          eq(m2mOauthClients.integrationId, integrations.id),
          isNull(m2mOauthClients.deletedAt)
        )
      )
      .leftJoin(catM2m, eq(m2mOauthClients.statusId, catM2m.id))
      .where(eq(integrations.id, id))
      .limit(1);

    if (!bundle) {
      res.status(404).json({ error: 'not_found', message: 'Integration not found.' });
      return;
    }

    const allM2mIds = await db
      .select({ id: m2mOauthClients.id })
      .from(m2mOauthClients)
      .where(eq(m2mOauthClients.integrationId, id));

    const idList = allM2mIds.map((r) => r.id);
    const issuanceRows =
      idList.length > 0 ?
        await db
          .select({
            id: m2mTokenIssuanceLog.id,
            jti: m2mTokenIssuanceLog.jti,
            m2mOauthClientId: m2mTokenIssuanceLog.m2mOauthClientId,
            orgId: m2mTokenIssuanceLog.orgId,
            issuedAt: m2mTokenIssuanceLog.issuedAt,
            expiresAt: m2mTokenIssuanceLog.expiresAt,
            revokedAt: m2mTokenIssuanceLog.revokedAt,
            createdBy: m2mTokenIssuanceLog.createdBy,
          })
          .from(m2mTokenIssuanceLog)
          .where(inArray(m2mTokenIssuanceLog.m2mOauthClientId, idList))
          .orderBy(desc(m2mTokenIssuanceLog.issuedAt))
          .limit(EXPORT_ISSUANCE_CAP)
      : [];

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="integration-${id}-audit.json"`
      );
      res.status(200).json({
        exportedAt: new Date().toISOString(),
        integration: bundle.integration,
        organization: bundle.organization,
        m2mOauthClient: bundle.m2mClient ?? null,
        tokenIssuance: issuanceRows,
        issuanceTruncated: idList.length > 0 && issuanceRows.length >= EXPORT_ISSUANCE_CAP,
      });
      return;
    }

    const lines = [
      'id,jti,m2m_oauth_client_id,org_id,issued_at,expires_at,revoked_at',
      ...issuanceRows.map((r) =>
        [
          r.id,
          r.jti,
          r.m2mOauthClientId,
          r.orgId,
          r.issuedAt.toISOString(),
          r.expiresAt.toISOString(),
          r.revokedAt ? r.revokedAt.toISOString() : '',
        ]
          .map((c) => `"${String(c).replace(/"/g, '""')}"`)
          .join(',')
      ),
    ];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="integration-${id}-token-issuance.csv"`
    );
    res.status(200).send(lines.join('\n'));
  } catch (e) {
    const message = logHandlerError(req, handler, e, `${handler} failed`);
    res.status(500).json({ error: 'integration_export_failed', message });
  }
};

/** Supplementary metrics for Settings → Logging (M2M token activity). */
const m2mTokenActivity: RequestHandler = async (req, res) => {
  const handler = `${MOD}:m2mTokenActivity`;
  if (!ensureDatabaseConfigured(req, res, handler, 'database not configured')) {
    return;
  }

  const daysRaw = parseInt(String((req.query as { days?: string }).days ?? '7'), 10);
  const days = Math.min(90, Math.max(1, Number.isFinite(daysRaw) ? daysRaw : 7));

  try {
    const db = getDb();
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);

    const [totalRow] = await db
      .select({ c: count() })
      .from(m2mTokenIssuanceLog)
      .where(gte(m2mTokenIssuanceLog.issuedAt, since));

    const total = Number(totalRow?.c ?? 0);

    const byOrg = await db
      .select({
        orgId: m2mTokenIssuanceLog.orgId,
        orgName: orgs.name,
        c: count(),
      })
      .from(m2mTokenIssuanceLog)
      .innerJoin(orgs, eq(m2mTokenIssuanceLog.orgId, orgs.id))
      .where(gte(m2mTokenIssuanceLog.issuedAt, since))
      .groupBy(m2mTokenIssuanceLog.orgId, orgs.name)
      .orderBy(desc(count()))
      .limit(25);

    res.status(200).json({
      windowDays: days,
      since: since.toISOString(),
      totalIssuances: total,
      byOrg: byOrg.map((r) => ({
        orgId: r.orgId,
        orgName: r.orgName,
        count: Number(r.c),
      })),
    });
  } catch (e) {
    const message = logHandlerError(req, handler, e, `${handler} failed`);
    res.status(500).json({ error: 'm2m_activity_query_failed', message });
  }
};

export function registerAdminIntegrationsRoutes(r: Router): void {
  const read = [
    requireAuth0AccessToken,
    requireStaffPermission(STAFF_PERMISSION_INTEGRATIONS_READ),
  ];
  const exportPerm = [
    requireAuth0AccessToken,
    requireStaffPermission(STAFF_PERMISSION_INTEGRATIONS_EXPORT),
  ];

  r.get('/integrations', ...read, listIntegrations);
  r.get('/integrations/:integrationId', ...read, getIntegration);
  r.get('/integrations/:integrationId/token-issuance', ...read, listTokenIssuance);
  r.get('/integrations/:integrationId/export', ...exportPerm, exportIntegration);
  r.get('/m2m/token-activity', ...read, m2mTokenActivity);
}
