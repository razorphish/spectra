import type { RequestHandler, Router } from 'express';
import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  lte,
  or,
  sql,
} from 'drizzle-orm';

import {
  ADMIN_UI_LOGGING_SETTING_KEYS,
  auditLogs,
  fetchLoggingSettingsForAdminUi,
  getDb,
  isAdminUiLoggingSettingKey,
  platformSettings,
  users,
} from '@spectra/database';

import { requireAuth0AccessToken } from '../lib/auth';
import { mapAuditLogRowToAdminDto } from '../lib/audit-log-dto';
import {
  actorUserIdFromRequest,
  logModule,
  requestContext,
} from '../lib/logging-helpers';
import { validateLoggingSettingValue } from '../lib/logging-settings-validation';
import {
  ensureDatabaseConfigured,
  logHandlerError,
  parseIsoDateQuery,
  queryString,
  respondValidationError,
} from '../lib/route-helpers';
import { getServiceLog, refreshServiceLoggingFromPlatform } from '../lib/service-logger';

const MOD = 'admin-logging.ts';

function escapeIlikePattern(raw: string): string {
  return raw.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

const listAuditLogs: RequestHandler = async (req, res) => {
  const handler = logModule(MOD, 'listAuditLogs');
  if (!ensureDatabaseConfigured(req, res, handler, 'listAuditLogs: database not configured')) {
    return;
  }

  const page = Math.max(1, parseInt(String(req.query['page'] ?? '1'), 10) || 1);
  const pageSizeRaw = parseInt(String(req.query['pageSize'] ?? '20'), 10) || 20;
  const pageSize = Math.min(100, Math.max(1, pageSizeRaw));
  const offset = (page - 1) * pageSize;

  const search = queryString(req, 'search', true) ?? '';
  const userId = queryString(req, 'userId');
  const moduleFilter = queryString(req, 'module', true);
  const startDateRaw = queryString(req, 'startDate');
  const endDateRaw = queryString(req, 'endDate');

  const startDate = parseIsoDateQuery(startDateRaw);
  if (startDate === null) {
    respondValidationError(req, res, handler, {
      error: 'invalid_start_date',
      message: 'startDate must be a valid ISO date string.',
    });
    return;
  }
  const endDate = parseIsoDateQuery(endDateRaw);
  if (endDate === null) {
    respondValidationError(req, res, handler, {
      error: 'invalid_end_date',
      message: 'endDate must be a valid ISO date string.',
    });
    return;
  }

  const conditions = [];

  if (userId) {
    conditions.push(eq(auditLogs.actorUserId, userId));
  }
  if (startDate) {
    conditions.push(gte(auditLogs.createdAt, startDate));
  }
  if (endDate) {
    conditions.push(lte(auditLogs.createdAt, endDate));
  }
  if (search) {
    const p = `%${escapeIlikePattern(search)}%`;
    conditions.push(
      or(
        ilike(auditLogs.action, p),
        ilike(auditLogs.resource, p),
        sql`(${auditLogs.payload})::text ILIKE ${p}`
      )!
    );
  }
  if (moduleFilter) {
    const mp = `%${escapeIlikePattern(moduleFilter)}%`;
    conditions.push(
      or(ilike(auditLogs.resource, mp), sql`(${auditLogs.payload})::text ILIKE ${mp}`)!
    );
  }

  const whereClause = conditions.length ? and(...conditions) : undefined;

  try {
    const db = getDb();

    const [totalRow] = await db
      .select({ c: count() })
      .from(auditLogs)
      .where(whereClause);

    const total = Number(totalRow?.c ?? 0);

    const rows = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        resource: auditLogs.resource,
        payload: auditLogs.payload,
        createdAt: auditLogs.createdAt,
        actorUserId: auditLogs.actorUserId,
        userEmail: users.email,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorUserId, users.id))
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(pageSize)
      .offset(offset);

    const logs = rows.map(mapAuditLogRowToAdminDto);

    getServiceLog().debug('Audit logs listed', {
      module: handler,
      action: 'query',
      context: {
        ...requestContext(req),
        page,
        pageSize,
        total,
        hasSearch: Boolean(search),
        hasUserId: Boolean(userId),
      },
      metadata: { userId: actorUserIdFromRequest(req) },
    });

    res.status(200).json({
      logs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (e) {
    const message = logHandlerError(req, handler, e, 'listAuditLogs failed');
    res.status(500).json({ error: 'logs_query_failed', message });
  }
};

const getLoggingSettings: RequestHandler = async (req, res) => {
  const handler = logModule(MOD, 'getLoggingSettings');
  if (
    !ensureDatabaseConfigured(req, res, handler, 'getLoggingSettings: database not configured')
  ) {
    return;
  }

  try {
    const settings = await fetchLoggingSettingsForAdminUi(getDb());

    getServiceLog().debug('Logging settings read', {
      module: handler,
      context: requestContext(req),
      metadata: { userId: actorUserIdFromRequest(req) },
    });

    res.status(200).json({ settings });
  } catch (e) {
    const message = logHandlerError(req, handler, e, 'getLoggingSettings failed');
    res.status(500).json({ error: 'logging_settings_query_failed', message });
  }
};

const putLoggingSetting: RequestHandler = async (req, res) => {
  const handler = logModule(MOD, 'putLoggingSetting');
  if (
    !ensureDatabaseConfigured(req, res, handler, 'putLoggingSetting: database not configured')
  ) {
    return;
  }

  const body = req.body as { key?: unknown; value?: unknown };
  const key = typeof body.key === 'string' ? body.key : '';

  if (!isAdminUiLoggingSettingKey(key)) {
    respondValidationError(
      req,
      res,
      handler,
      {
        error: 'invalid_key',
        message: `key must be one of: ${ADMIN_UI_LOGGING_SETTING_KEYS.join(', ')}. log_to_console is legacy read-only.`,
      },
      { key },
    );
    return;
  }

  if (body.value === undefined) {
    respondValidationError(
      req,
      res,
      handler,
      { error: 'missing_value', message: 'value is required.' },
      { key },
    );
    return;
  }

  const validated = validateLoggingSettingValue(key, body.value);
  if (validated.ok === false) {
    respondValidationError(req, res, handler, validated, { key });
    return;
  }

  const valueToStore = validated.value;

  try {
    const db = getDb();
    await db
      .insert(platformSettings)
      .values({ key, value: valueToStore as never })
      .onConflictDoUpdate({
        target: platformSettings.key,
        set: { value: valueToStore as never },
      });

    await refreshServiceLoggingFromPlatform();

    getServiceLog().info('Logging setting updated', {
      module: handler,
      action: 'update',
      context: {
        ...requestContext(req),
        key,
        value: valueToStore,
      },
      metadata: { userId: actorUserIdFromRequest(req) },
    });

    res.status(200).json({ ok: true, key, value: valueToStore });
  } catch (e) {
    const message = logHandlerError(req, handler, e, 'putLoggingSetting failed');
    res.status(500).json({ error: 'logging_settings_update_failed', message });
  }
};

/** Staff audit log list + platform logging settings (admin UI parity). */
export function registerAdminLoggingRoutes(r: Router): void {
  r.get('/logs', requireAuth0AccessToken, listAuditLogs);
  r.get('/logging/settings', requireAuth0AccessToken, getLoggingSettings);
  r.put('/logging/settings', requireAuth0AccessToken, putLoggingSetting);
}
