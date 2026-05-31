import { Router, type RequestHandler } from 'express';

import { requireAuth0AccessToken } from '../lib/auth';

const proxyOpenApi: RequestHandler = async (_req, res) => {
  // Full merged OpenAPI on aviate-api — use .../integration/openapi.json (not /openapi.json, which is public limited).
  const url = process.env['AVIATE_API_OPENAPI_URL']?.trim();
  const key = process.env['SPECTRA_INTEGRATION_OPENAPI_KEY']?.trim();
  if (!url || !key) {
    res.status(503).json({
      error: 'not_configured',
      message: 'Set AVIATE_API_OPENAPI_URL and SPECTRA_INTEGRATION_OPENAPI_KEY on admin-ui-api.',
    });
    return;
  }
  try {
    const upstream = await fetch(url, {
      headers: { 'X-Spectra-Integration-Key': key },
    });
    const text = await upstream.text();
    res.status(upstream.status);
    const ct = upstream.headers.get('content-type');
    if (ct) res.setHeader('content-type', ct);
    res.send(text);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'fetch_failed';
    res.status(502).json({ error: 'bad_gateway', message: msg });
  }
};

export function registerAdminAviateOpenApiRoutes(r: Router): void {
  r.get('/catalog/aviate-openapi', requireAuth0AccessToken, proxyOpenApi);
}
