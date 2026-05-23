import type { RequestHandler, Router } from 'express';
import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  or,
  sql,
} from 'drizzle-orm';

import {
  auditLogs,
  getDb,
  platformSettings,
  resolveSpectraDatabaseUrl,
  users,
} from '@spectra/database';

import { createRequireAuth0AccessToken } from '../middleware/require-auth0-access-token';

const requireAuth0AccessToken = createRequireAuth0AccessToken();

/** Keys surfaced in the admin UI (aligned with Vital Woman Reset `LoggingSettingsTab`). */
const LOGGING_SETTING_KEYS = ['logging_level', 'log_to_console'] as const;

type LoggingSettingKey = (typeof LOGGING_SETTING_KEYS)[number];

function isLoggingSettingKey(k: string): k is LoggingSettingKey {
  return (LOGGING_SETTING_KEYS as readonly string[]).includes(k);
}

function escapeIlikePattern(raw: string): string {
  return raw.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * Maps control-plane `audit_logs` rows to a Vital Woman Reset–style admin log DTO
 * (`apps/server/src/routers/logs.router.ts` `adminList` response shape).
 */
const listAuditLogs: RequestHandler = async (req, res) => {
  const dbUrl = resolveSpectraDatabaseUrl();
  if (!dbUrl) {
    res.status(503).json({
      error: 'database_not_configured',
      message: 'DATABASE_URL / NEON_DATABASE_URL is not set.',
    });
    return;
  }

  const page = Math.max(1, parseInt(String(req.query['page'] ?? '1'), 10) || 1);
  const pageSizeRaw = parseInt(String(req.query['pageSize'] ?? '20'), 10) || 20;
  const pageSize = Math.min(100, Math.max(1, pageSizeRaw));
  const offset = (page - 1) * pageSize;

  const search = typeof req.query['search'] === 'string' ? req.query['search'].trim() : '';
  const userId =
    typeof req.query['userId'] === 'string' && req.query['userId'].length > 0 ?
      req.query['userId']
    : undefined;
  const moduleFilter =
    typeof req.query['module'] === 'string' && req.query['module'].length > 0 ?
      req.query['module'].trim()
    : undefined;
  const startDate =
    typeof req.query['startDate'] === 'string' && req.query['startDate'].length > 0 ?
      req.query['startDate']
    : undefined;
  const endDate =
    typeof req.query['endDate'] === 'string' && req.query['endDate'].length > 0 ?
      req.query['endDate']
    : undefined;

  const conditions = [];

  if (userId) {
    conditions.push(eq(auditLogs.actorUserId, userId));
  }
  if (startDate) {
    conditions.push(gte(auditLogs.createdAt, new Date(startDate)));
  }
  if (endDate) {
    conditions.push(lte(auditLogs.createdAt, new Date(endDate)));
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

    const logs = rows.map((row) => {
      const payload = row.payload as Record<string, unknown> | null;
      const level =
        payload && typeof payload['level'] === 'string' ?
          payload['level']
        : 'INFO';
      const module =
        payload && typeof payload['module'] === 'string' ?
          payload['module']
        : 'control-plane';
      const message = `${row.action} · ${row.resource}`;

      return {
        id: row.id,
        level,
        message,
        context: null as string | null,
        sessionId: null as string | null,
        userId: row.actorUserId,
        module,
        action: row.action,
        metadata: row.payload,
        createdAt: row.createdAt,
        createdBy: null as string | null,
        updatedAt: null as Date | null,
        updatedBy: null as string | null,
        user:
          row.actorUserId && row.userEmail ?
            {
              id: row.actorUserId,
              email: row.userEmail,
              firstName: null as string | null,
              lastName: null as string | null,
            }
          : null,
      };
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
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(500).json({
      error: 'logs_query_failed',
      message,
    });
  }
};

const getLoggingSettings: RequestHandler = async (_req, res) => {
  const dbUrl = resolveSpectraDatabaseUrl();
  if (!dbUrl) {
    res.status(503).json({
      error: 'database_not_configured',
      message: 'DATABASE_URL / NEON_DATABASE_URL is not set.',
    });
    return;
  }

  const defaults: Record<LoggingSettingKey, unknown> = {
    logging_level: 'INFO',
    log_to_console: true,
  };

  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(platformSettings)
      .where(inArray(platformSettings.key, [...LOGGING_SETTING_KEYS]));

    const byKey = new Map(rows.map((r) => [r.key as LoggingSettingKey, r.value]));

    const settings = LOGGING_SETTING_KEYS.map((key) => ({
      key,
      value: byKey.has(key) ? byKey.get(key) : defaults[key],
    }));

    res.status(200).json({ settings });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(500).json({
      error: 'logging_settings_query_failed',
      message,
    });
  }
};

const putLoggingSetting: RequestHandler = async (req, res) => {
  const dbUrl = resolveSpectraDatabaseUrl();
  if (!dbUrl) {
    res.status(503).json({
      error: 'database_not_configured',
      message: 'DATABASE_URL / NEON_DATABASE_URL is not set.',
    });
    return;
  }

  const body = req.body as { key?: unknown; value?: unknown };
  const key = typeof body.key === 'string' ? body.key : '';
  if (!isLoggingSettingKey(key)) {
    res.status(400).json({
      error: 'invalid_key',
      message: `key must be one of: ${LOGGING_SETTING_KEYS.join(', ')}`,
    });
    return;
  }

  if (body.value === undefined) {
    res.status(400).json({ error: 'missing_value', message: 'value is required.' });
    return;
  }

  if (key === 'logging_level' && typeof body.value !== 'string') {
    res.status(400).json({
      error: 'invalid_value',
      message: 'logging_level must be a string.',
    });
    return;
  }
  if (key === 'log_to_console' && typeof body.value !== 'boolean') {
    res.status(400).json({
      error: 'invalid_value',
      message: 'log_to_console must be a boolean.',
    });
    return;
  }

  try {
    const db = getDb();
    await db
      .insert(platformSettings)
      .values({ key, value: body.value as never })
      .onConflictDoUpdate({
        target: platformSettings.key,
        set: { value: body.value as never },
      });

    res.status(200).json({ ok: true, key, value: body.value });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(500).json({
      error: 'logging_settings_update_failed',
      message,
    });
  }
};

/**
 * Registers admin logging routes (Vital Woman Reset `logs.router` / `LoggingSettingsTab` parity).
 * Protected with the same Auth0 access-token middleware as `GET /v1/admin/stats`.
 */
export function registerAdminLoggingRoutes(r: Router): void {
  r.get('/logs', requireAuth0AccessToken, listAuditLogs);
  r.get('/logging/settings', requireAuth0AccessToken, getLoggingSettings);
  r.put('/logging/settings', requireAuth0AccessToken, putLoggingSetting);
}
