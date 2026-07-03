import { Router, type RequestHandler } from 'express';

import { getDb, pingDatabase, resolveSpectraDatabaseUrl } from '@spectra/database';

import { requireAuth0AccessToken } from '../lib/auth';

/** Base URL for aviate-api (public/sandbox API). Defaults to the local dev port. */
function aviateApiBaseUrl(): string {
  return (process.env['AVIATE_API_URL']?.trim() || 'http://127.0.0.1:3001').replace(/\/$/, '');
}

/** Checks admin-ui-api's own database connectivity. */
async function checkAdminDatabase(): Promise<{ configured: boolean; ok: boolean }> {
  if (!resolveSpectraDatabaseUrl()) return { configured: false, ok: false };
  try {
    await pingDatabase(getDb());
    return { configured: true, ok: true };
  } catch {
    return { configured: true, ok: false };
  }
}

/** Server-side fetch of aviate-api `/healthz` (avoids browser CORS / cross-origin auth). */
async function checkAviateApi(): Promise<{
  url: string;
  reachable: boolean;
  status: number | null;
  sandboxAi: boolean | null;
  database: boolean | null;
  error: string | null;
}> {
  const base = aviateApiBaseUrl();
  const url = `${base}/healthz`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const resp = await fetch(url, { signal: controller.signal });
    const body = (await resp.json().catch(() => ({}))) as {
      sandboxAi?: unknown;
      database?: unknown;
    };
    return {
      url,
      reachable: resp.ok,
      status: resp.status,
      sandboxAi: typeof body.sandboxAi === 'boolean' ? body.sandboxAi : null,
      database: typeof body.database === 'boolean' ? body.database : null,
      error: resp.ok ? null : `HTTP ${resp.status}`,
    };
  } catch (e) {
    const error = e instanceof Error && e.name === 'AbortError' ? 'timeout after 3000ms' : e instanceof Error ? e.message : 'unreachable';
    return { url, reachable: false, status: null, sandboxAi: null, database: null, error };
  } finally {
    clearTimeout(timer);
  }
}

const getPlatformHealth: RequestHandler = async (_req, res) => {
  const [adminDb, aviate] = await Promise.all([checkAdminDatabase(), checkAviateApi()]);
  res.status(200).json({
    checkedAt: new Date().toISOString(),
    adminApi: { ok: true, database: adminDb },
    aviateApi: aviate,
  });
};

export function registerAdminPlatformHealthRoutes(r: Router): void {
  r.get('/platform/health', requireAuth0AccessToken, getPlatformHealth);
}
