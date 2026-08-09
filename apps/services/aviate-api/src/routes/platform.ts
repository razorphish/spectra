import { createRequireSpectraAccessToken } from '@spectra/auth';
import { Router } from 'express';
import type { RequestHandler } from 'express';

import {
  getControlPlaneRowCounts,
  getDb,
  pingDatabase,
  resolveSpectraDatabaseUrl,
} from '@spectra/database';

import { loadM2mClientStatusForEdge } from '../lib/m2m-client-status';
import { createHelloHandler } from './hello';
import { createPlatformTenantRouter } from './platform-tenant';
import { createSandboxPortalRouter } from './sandbox-portal';
import { createTenantRuntimeRouter } from './tenant-runtime';

const SEGMENT = 'platform';

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
    service: 'aviate-api',
    segment: SEGMENT,
    version: '0.0.1',
  });
};

/** Database row counts — unauthenticated for MVP; lock behind auth later. */
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

export function createPlatformRouter() {
  const requireAccessToken = createRequireSpectraAccessToken({
    logLabel: 'aviate-api',
    m2mVerifyEnvSegment: 'AVIATE_API',
    loadM2mClientStatus: loadM2mClientStatusForEdge,
  });
  const r = Router();
  r.get('/health', health);
  r.get('/ready', ready);
  r.get('/info', info);
  r.get('/stats', stats);
  r.get('/hello', requireAccessToken, createHelloHandler('aviate-api', SEGMENT));
  r.use('/tenant', requireAccessToken, createPlatformTenantRouter());
  r.use('/tenant-runtime', requireAccessToken, createTenantRuntimeRouter());
  r.get(
    '/sandbox/production-access/status-by-token/:token',
    (_req, res) => {
      res.status(404).json({
        error: 'not_found',
        message:
          'Production access status is only available in the authenticated developer portal (no public token URL in v1).',
      });
    },
  );
  r.use('/sandbox', createSandboxPortalRouter());
  return r;
}
