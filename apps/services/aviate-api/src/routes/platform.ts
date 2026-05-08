import { Router } from 'express';
import type { RequestHandler } from 'express';

const SEGMENT = 'platform';

const health: RequestHandler = (_req, res) => {
  res.status(200).json({ status: 'ok' });
};

const ready: RequestHandler = async (_req, res) => {
  const checks: Record<string, string> = { runtime: 'ok' };
  const dbUrl =
    process.env['DATABASE_URL'] ?? process.env['NEON_DATABASE_URL'];
  if (!dbUrl) {
    checks.database = 'not_configured';
    res.status(200).json({ status: 'ok', checks });
    return;
  }
  try {
    const { getDb, pingDatabase } = await import('@spectra/database');
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
  const dbUrl =
    process.env['DATABASE_URL'] ?? process.env['NEON_DATABASE_URL'];
  if (!dbUrl) {
    res.status(200).json({ database: 'not_configured', counts: null });
    return;
  }
  try {
    const { getDb, getControlPlaneRowCounts } = await import(
      '@spectra/database'
    );
    const counts = await getControlPlaneRowCounts(getDb());
    res.status(200).json({ database: 'ok', counts });
  } catch {
    res.status(503).json({ database: 'error', counts: null });
  }
};

export function createPlatformRouter() {
  const r = Router();
  r.get('/health', health);
  r.get('/ready', ready);
  r.get('/info', info);
  r.get('/stats', stats);
  return r;
}
