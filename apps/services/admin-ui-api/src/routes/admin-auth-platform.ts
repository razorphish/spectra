import { eq } from 'drizzle-orm';
import { Router, type RequestHandler } from 'express';

import { getDb, platformSettings, resolveSpectraDatabaseUrl } from '@spectra/database';

import { requireAuth0AccessToken } from '../lib/auth';

const AUTH_SETTINGS_KEY = 'auth.jwt_clock_skew_seconds';

const getAuthSettings: RequestHandler = async (_req, res) => {
  if (!resolveSpectraDatabaseUrl()) {
    res.status(503).json({ error: 'database_not_configured' });
    return;
  }
  const db = getDb();
  const [row] = await db
    .select({ value: platformSettings.value })
    .from(platformSettings)
    .where(eq(platformSettings.key, AUTH_SETTINGS_KEY))
    .limit(1);
  const seconds =
    row?.value && typeof row.value === 'object' && row.value !== null && 'seconds' in row.value ?
      Number((row.value as { seconds?: unknown }).seconds)
    : 30;
  res.json({ jwtClockSkewSeconds: Number.isFinite(seconds) ? seconds : 30 });
};

const patchAuthSettings: RequestHandler = async (req, res) => {
  if (!resolveSpectraDatabaseUrl()) {
    res.status(503).json({ error: 'database_not_configured' });
    return;
  }
  const body = req.body as { jwtClockSkewSeconds?: unknown };
  const raw = body?.jwtClockSkewSeconds;
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n < 0 || n > 300) {
    res.status(400).json({ error: 'invalid_request', message: 'jwtClockSkewSeconds must be 0–300.' });
    return;
  }
  const db = getDb();
  await db
    .insert(platformSettings)
    .values({ key: AUTH_SETTINGS_KEY, value: { seconds: Math.floor(n) } as never })
    .onConflictDoUpdate({
      target: platformSettings.key,
      set: { value: { seconds: Math.floor(n) } as never },
    });
  res.json({ jwtClockSkewSeconds: Math.floor(n) });
};

export function registerAdminAuthPlatformRoutes(r: Router): void {
  r.get('/platform/auth-settings', requireAuth0AccessToken, getAuthSettings);
  r.patch('/platform/auth-settings', requireAuth0AccessToken, patchAuthSettings);
}
