import { Router } from 'express';
import type { RequestHandler } from 'express';

import {
  getControlPlaneRowCounts,
  getDb,
  pingDatabase,
  resolveSpectraDatabaseUrl,
} from '@spectra/database';

import { requireAuth0AccessToken } from '../lib/auth';
import { registerAdminAuthPlatformRoutes } from './admin-auth-platform';
import { registerAdminAviateOpenApiRoutes } from './admin-aviate-openapi';
import { createAdminMeSyncHandler } from './admin-me-sync';
import { registerAdminLoggingRoutes } from './admin-logging';
import { registerAdminMigrationsRoutes } from './admin-migrations';
import { registerAdminNavVisibilityRoutes } from './admin-nav-visibility';

const SEGMENT = 'admin';

const meSync = createAdminMeSyncHandler();

const health: RequestHandler = (_req, res) => {
  res.status(200).json({ status: 'ok' });
};

const ready: RequestHandler = async (_req, res) => {
  const checks: Record<string, string> = { runtime: 'ok' };
  const dbUrl = resolveSpectraDatabaseUrl();
  if (!dbUrl) {
    checks.database = 'not_configured';
    res.status(200).json({ status: 'ok', checks });
    return;
  }
  try {
    await pingDatabase(getDb());
    checks.database = 'ok';
    res.status(200).json({ status: 'ok', checks });
  } catch {
    res.status(503).json({
      status: 'degraded',
      checks: { ...checks, database: 'fail' },
    });
  }
};

const info: RequestHandler = (_req, res) => {
  res.status(200).json({
    service: 'admin-ui-api',
    segment: SEGMENT,
    version: '0.0.1',
  });
};

const stats: RequestHandler = async (_req, res) => {
  const dbUrl = resolveSpectraDatabaseUrl();
  if (!dbUrl) {
    res.status(200).json({ database: 'not_configured', counts: null });
    return;
  }
  try {
    const counts = await getControlPlaneRowCounts(getDb());
    res.status(200).json({ database: 'ok', counts });
  } catch {
    res.status(503).json({ database: 'error', counts: null });
  }
};

export function createAdminRouter() {
  const r = Router();
  r.get('/health', health);
  r.get('/ready', ready);
  r.get('/info', info);
  r.get('/stats', requireAuth0AccessToken, stats);
  r.post('/me/sync', requireAuth0AccessToken, meSync);
  registerAdminAuthPlatformRoutes(r);
  registerAdminAviateOpenApiRoutes(r);
  registerAdminLoggingRoutes(r);
  registerAdminMigrationsRoutes(r);
  registerAdminNavVisibilityRoutes(r);
  return r;
}
