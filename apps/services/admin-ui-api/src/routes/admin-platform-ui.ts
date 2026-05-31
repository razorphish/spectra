import type { RequestHandler, Router } from 'express';
import { eq } from 'drizzle-orm';

import {
  getDb,
  parseDeveloperApplicationsUiEnabled,
  platformSettings,
  PLATFORM_DEVELOPER_APPLICATIONS_UI_KEY,
  resolveSpectraDatabaseUrl,
} from '@spectra/database';

import { requireAuth0AccessToken } from '../lib/auth';

const getPlatformUi: RequestHandler = async (_req, res) => {
  if (!resolveSpectraDatabaseUrl()) {
    res.status(503).json({
      error: 'database_not_configured',
      message: 'DATABASE_URL / NEON_DATABASE_URL is not set.',
    });
    return;
  }
  try {
    const db = getDb();
    const [row] = await db
      .select({ value: platformSettings.value })
      .from(platformSettings)
      .where(eq(platformSettings.key, PLATFORM_DEVELOPER_APPLICATIONS_UI_KEY))
      .limit(1);
    res.json({
      developerApplicationsUiEnabled: parseDeveloperApplicationsUiEnabled(row?.value),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(500).json({ error: 'platform_ui_read_failed', message });
  }
};

const patchPlatformUi: RequestHandler = async (req, res) => {
  if (!resolveSpectraDatabaseUrl()) {
    res.status(503).json({
      error: 'database_not_configured',
      message: 'DATABASE_URL / NEON_DATABASE_URL is not set.',
    });
    return;
  }
  const body = req.body as { developerApplicationsUiEnabled?: unknown } | null;
  if (!body || typeof body.developerApplicationsUiEnabled !== 'boolean') {
    res.status(400).json({
      error: 'invalid_request',
      message: 'Expected JSON body { "developerApplicationsUiEnabled": boolean }.',
    });
    return;
  }
  try {
    const db = getDb();
    await db
      .insert(platformSettings)
      .values({
        key: PLATFORM_DEVELOPER_APPLICATIONS_UI_KEY,
        value: { enabled: body.developerApplicationsUiEnabled } as never,
      })
      .onConflictDoUpdate({
        target: platformSettings.key,
        set: { value: { enabled: body.developerApplicationsUiEnabled } as never },
      });
    res.json({ developerApplicationsUiEnabled: body.developerApplicationsUiEnabled });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(500).json({ error: 'platform_ui_write_failed', message });
  }
};

export function registerAdminPlatformUiRoutes(r: Router): void {
  r.get('/platform/developer-portal-ui', requireAuth0AccessToken, getPlatformUi);
  r.patch('/platform/developer-portal-ui', requireAuth0AccessToken, patchPlatformUi);
}
