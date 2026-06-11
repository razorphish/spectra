import type { RequestHandler, Router } from 'express';
import { eq } from 'drizzle-orm';

import {
  fetchSandboxAiPlatformSettings,
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

const getSandboxAiSettings: RequestHandler = async (_req, res) => {
  if (!resolveSpectraDatabaseUrl()) {
    res.status(503).json({
      error: 'database_not_configured',
      message: 'DATABASE_URL / NEON_DATABASE_URL is not set.',
    });
    return;
  }
  try {
    const s = await fetchSandboxAiPlatformSettings(getDb());
    res.json(s);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(500).json({ error: 'sandbox_ai_settings_read_failed', message });
  }
};

const patchSandboxAiSettings: RequestHandler = async (req, res) => {
  if (!resolveSpectraDatabaseUrl()) {
    res.status(503).json({
      error: 'database_not_configured',
      message: 'DATABASE_URL / NEON_DATABASE_URL is not set.',
    });
    return;
  }
  const body = req.body as Record<string, unknown> | null;
  if (!body || typeof body !== 'object') {
    res.status(400).json({ error: 'invalid_request', message: 'Expected JSON body.' });
    return;
  }
  const db = getDb();
  try {
    if (typeof body['endpointsEnabled'] === 'boolean') {
      await db
        .insert(platformSettings)
        .values({ key: 'sandbox.ai.endpoints_enabled', value: body['endpointsEnabled'] as never })
        .onConflictDoUpdate({
          target: platformSettings.key,
          set: { value: body['endpointsEnabled'] as never },
        });
    }
    if (body['defaultLlmModelId'] === null || typeof body['defaultLlmModelId'] === 'string') {
      await db
        .insert(platformSettings)
        .values({
          key: 'sandbox.ai.default_llm_model_id',
          value: (body['defaultLlmModelId'] === null ? null : body['defaultLlmModelId']) as never,
        })
        .onConflictDoUpdate({
          target: platformSettings.key,
          set: { value: (body['defaultLlmModelId'] === null ? null : body['defaultLlmModelId']) as never },
        });
    }
    if (body['defaultPricingProfileId'] === null || typeof body['defaultPricingProfileId'] === 'string') {
      await db
        .insert(platformSettings)
        .values({
          key: 'sandbox.ai.default_pricing_profile_id',
          value: (body['defaultPricingProfileId'] === null ? null : body['defaultPricingProfileId']) as never,
        })
        .onConflictDoUpdate({
          target: platformSettings.key,
          set: { value: (body['defaultPricingProfileId'] === null ? null : body['defaultPricingProfileId']) as never },
        });
    }
    for (const key of [
      'precheckEnabled',
      'approvalAutomationEnabled',
      'machineAutoApproveEnabled',
    ] as const) {
      if (typeof body[key] === 'boolean') {
        const rowKey =
          key === 'precheckEnabled' ? 'sandbox.ai.precheck_enabled'
          : key === 'approvalAutomationEnabled' ? 'sandbox.ai.approval_automation_enabled'
          : 'sandbox.ai.machine_auto_approve_enabled';
        await db
          .insert(platformSettings)
          .values({ key: rowKey, value: body[key] as never })
          .onConflictDoUpdate({ target: platformSettings.key, set: { value: body[key] as never } });
      }
    }
    const s = await fetchSandboxAiPlatformSettings(db);
    res.json(s);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(500).json({ error: 'sandbox_ai_settings_write_failed', message });
  }
};

export function registerAdminPlatformUiRoutes(r: Router): void {
  r.get('/platform/developer-portal-ui', requireAuth0AccessToken, getPlatformUi);
  r.patch('/platform/developer-portal-ui', requireAuth0AccessToken, patchPlatformUi);
  r.get('/platform/sandbox-ai-settings', requireAuth0AccessToken, getSandboxAiSettings);
  r.patch('/platform/sandbox-ai-settings', requireAuth0AccessToken, patchSandboxAiSettings);
}
