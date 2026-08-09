import { Router } from 'express';

import { KNOWN_M2M_SCOPES } from '@spectra/auth';

import {
  getEffectivePlatformApiCatalog,
  PLATFORM_API_CATALOG,
  setPlatformApiScopeOverride,
  getDb,
  resolveSpectraDatabaseUrl,
} from '@spectra/database';

import { requireAuth0AccessToken } from '../lib/auth';
import { requireStaffPermission, STAFF_PERMISSION_API_CATALOG_MANAGE } from '../lib/staff-permissions';

export function registerAdminPlatformApiCatalogRoutes(r: Router): void {
  const g = Router();
  g.use(requireAuth0AccessToken);
  g.use(requireStaffPermission(STAFF_PERMISSION_API_CATALOG_MANAGE));

  g.get('/platform/api-catalog', async (_req, res) => {
    if (!resolveSpectraDatabaseUrl()) {
      // Return static catalog without overrides when DB is unavailable
      const items = PLATFORM_API_CATALOG.map((ep) => ({
        ...ep,
        effectiveScope: ep.defaultScope,
        isOverridden: false,
      }));
      res.status(200).json({ items, knownScopes: [...KNOWN_M2M_SCOPES] });
      return;
    }
    try {
      const items = await getEffectivePlatformApiCatalog(getDb());
      res.status(200).json({ items, knownScopes: [...KNOWN_M2M_SCOPES] });
    } catch {
      res.status(500).json({ error: 'catalog_load_failed' });
    }
  });

  g.patch('/platform/api-catalog/:key', async (req, res) => {
    if (!resolveSpectraDatabaseUrl()) {
      res.status(503).json({ error: 'database_not_configured' });
      return;
    }
    const key = decodeURIComponent(req.params['key'] ?? '');
    if (!key) {
      res.status(400).json({ error: 'bad_request', message: 'Missing endpoint key.' });
      return;
    }
    const entry = PLATFORM_API_CATALOG.find((e) => e.key === key);
    if (!entry) {
      res.status(404).json({ error: 'not_found', message: `No catalog entry found for key: ${key}` });
      return;
    }
    const { scope } = req.body as { scope?: string | null };
    // scope can be a known scope string, null (open), or undefined (restore to default)
    if (scope !== undefined && scope !== null && typeof scope !== 'string') {
      res.status(400).json({ error: 'bad_request', message: 'scope must be a string or null.' });
      return;
    }
    if (scope !== undefined && scope !== null && !(KNOWN_M2M_SCOPES as readonly string[]).includes(scope)) {
      res.status(400).json({
        error: 'unknown_scope',
        message: `Unknown scope: ${scope}. Known scopes: ${[...KNOWN_M2M_SCOPES].join(', ')}`,
      });
      return;
    }
    try {
      // scope === undefined means "restore to default" — we store null to indicate open, or the scope string
      const effectiveScope = scope === undefined ? entry.defaultScope : scope;
      await setPlatformApiScopeOverride(getDb(), key, effectiveScope);
      res.status(200).json({ key, effectiveScope, isOverridden: effectiveScope !== entry.defaultScope });
    } catch {
      res.status(500).json({ error: 'update_failed' });
    }
  });

  r.use(g);
}
