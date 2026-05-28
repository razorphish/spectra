import type { RequestHandler, Router } from 'express';
import { eq } from 'drizzle-orm';

import { getDb, platformSettings, resolveSpectraDatabaseUrl } from '@spectra/database';

import { requireAuth0AccessToken } from '../lib/auth';

/** Namespaced key in `spectra.platform_settings` (avoid collisions with logging / migrations). */
export const ADMIN_UI_SIDEBAR_NAV_HIDDEN_MENU_KEYS = 'admin_ui.sidebar_nav_hidden_menu_keys' as const;

/** Keep in sync with admin-ui `template-nav-menu.ts` menuKey values. */
export const TEMPLATE_NAV_MENU_KEYS = [
  'authentication_pages',
  'error_pages',
  'user_profile',
  'landing',
  'iconography',
  'tables',
  'tanstack_table',
  'blank_page',
] as const;

export type TemplateNavMenuKey = (typeof TEMPLATE_NAV_MENU_KEYS)[number];

const ALLOWED = new Set<string>(TEMPLATE_NAV_MENU_KEYS);

export function defaultHiddenSidebarNavKeys(): string[] {
  return [...TEMPLATE_NAV_MENU_KEYS];
}

/** Strict parse for GET: must be a JSON array of allowed keys only (duplicates OK). */
function parseStoredHiddenKeys(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const seen = new Set<string>();
  for (const el of value) {
    if (typeof el !== 'string') return null;
    if (!ALLOWED.has(el)) return null;
    seen.add(el);
  }
  return [...seen];
}

function normalizePutBodyKeys(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const seen = new Set<string>();
  for (const el of raw) {
    if (typeof el !== 'string') return null;
    if (!ALLOWED.has(el)) return null;
    seen.add(el);
  }
  return [...seen];
}

const getNavVisibility: RequestHandler = async (_req, res) => {
  const dbUrl = resolveSpectraDatabaseUrl();
  if (!dbUrl) {
    res.status(503).json({
      error: 'database_not_configured',
      message: 'DATABASE_URL / NEON_DATABASE_URL is not set.',
    });
    return;
  }

  try {
    const db = getDb();
    const rows = await db
      .select({ value: platformSettings.value })
      .from(platformSettings)
      .where(eq(platformSettings.key, ADMIN_UI_SIDEBAR_NAV_HIDDEN_MENU_KEYS))
      .limit(1);

    const row = rows[0];
    if (!row) {
      res.status(200).json({ sidebarNavHiddenMenuKeys: defaultHiddenSidebarNavKeys() });
      return;
    }

    const parsed = parseStoredHiddenKeys(row.value);
    if (parsed === null) {
      res.status(200).json({ sidebarNavHiddenMenuKeys: defaultHiddenSidebarNavKeys() });
      return;
    }

    res.status(200).json({ sidebarNavHiddenMenuKeys: parsed });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(500).json({
      error: 'nav_visibility_read_failed',
      message,
    });
  }
};

const putNavVisibility: RequestHandler = async (req, res) => {
  const dbUrl = resolveSpectraDatabaseUrl();
  if (!dbUrl) {
    res.status(503).json({
      error: 'database_not_configured',
      message: 'DATABASE_URL / NEON_DATABASE_URL is not set.',
    });
    return;
  }

  const body = req.body as { sidebarNavHiddenMenuKeys?: unknown } | null;
  if (!body || !('sidebarNavHiddenMenuKeys' in body)) {
    res.status(400).json({
      error: 'missing_body',
      message: 'Expected JSON body { "sidebarNavHiddenMenuKeys": string[] }.',
    });
    return;
  }

  const normalized = normalizePutBodyKeys(body.sidebarNavHiddenMenuKeys);
  if (normalized === null) {
    res.status(400).json({
      error: 'invalid_sidebarNavHiddenMenuKeys',
      message: `sidebarNavHiddenMenuKeys must be an array of known keys: ${TEMPLATE_NAV_MENU_KEYS.join(', ')}.`,
    });
    return;
  }

  try {
    const db = getDb();
    await db
      .insert(platformSettings)
      .values({
        key: ADMIN_UI_SIDEBAR_NAV_HIDDEN_MENU_KEYS,
        value: normalized as never,
      })
      .onConflictDoUpdate({
        target: platformSettings.key,
        set: { value: normalized as never },
      });

    res.status(200).json({ sidebarNavHiddenMenuKeys: normalized });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(500).json({
      error: 'nav_visibility_write_failed',
      message,
    });
  }
};

export function registerAdminNavVisibilityRoutes(r: Router): void {
  r.get('/nav-sidebar-visibility', requireAuth0AccessToken, getNavVisibility);
  r.put('/nav-sidebar-visibility', requireAuth0AccessToken, putNavVisibility);
}
