import { config } from 'dotenv';
import { timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import express, { type RequestHandler } from 'express';
import swaggerUi from 'swagger-ui-express';
import { createPlatformRouter } from './routes/platform';
import { createUploadsRouter } from './routes/uploads';

function workspaceRoot(): string {
  const env = process.env['NX_WORKSPACE_ROOT'];
  if (env && existsSync(join(env, 'nx.json'))) return env;
  let dir = __dirname;
  for (let i = 0; i < 24; i++) {
    if (existsSync(join(dir, 'nx.json'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

const root = workspaceRoot();
for (const [p, o] of [
  [join(root, '.env'), false],
  [join(root, '.env.local'), true],
  [join(root, 'apps/services/aviate-api', '.env.development'), true],
] as const) {
  if (existsSync(p)) {
    config({ path: p, override: o });
  }
}

const host = process.env['HOST'] ?? 'localhost';
const port = process.env['PORT'] ? Number(process.env['PORT']) : 3001;

const app = express();
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});
app.use(express.json({ limit: '64kb' }));

app.use('/v1/platform', createPlatformRouter());
app.use('/v1/platform/uploads', createUploadsRouter());

function loadJsonCandidates(filenames: string[]): Record<string, unknown> {
  const candidates: string[] = [];
  for (const name of filenames) {
    candidates.push(
      join(__dirname, 'assets', name),
      join(root, 'apps/services/aviate-api/src/assets', name),
      join(root, 'packages/openapi/dist', name)
    );
  }
  for (const p of candidates) {
    if (existsSync(p)) {
      return JSON.parse(readFileSync(p, 'utf8')) as Record<string, unknown>;
    }
  }
  return {
    openapi: '3.0.3',
    info: { title: 'Spectra API', version: '0.0.1' },
    paths: {},
  };
}

function loadMergedOpenApiSpecs(): {
  publicLimited: Record<string, unknown>;
  full: Record<string, unknown>;
} {
  return {
    publicLimited: loadJsonCandidates(['spectra-public-api.json']),
    full: loadJsonCandidates(['spectra-integration-api.json']),
  };
}

function truthyEnv(name: string): boolean {
  const v = process.env[name]?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

/** Optional HTML banner in public OpenAPI description — off by default so /docs stays integrator-only. */
function applyDeveloperDashboardBanner(spec: Record<string, unknown>): Record<string, unknown> {
  const base = process.env['SPECTRA_SANDBOX_UI_URL']?.trim();
  if (!base || !truthyEnv('SPECTRA_SWAGGER_SHOW_DASHBOARD_LINK')) return spec;
  const dashboardUrl = `${base.replace(/\/$/, '')}/dashboard`;
  const info = (spec['info'] as Record<string, unknown> | undefined) ?? {};
  const existing =
    typeof info['description'] === 'string' ? (info['description'] as string) : '';
  const banner = `<p><a href="${dashboardUrl}">Sandbox UI (dashboard)</a></p>\n\n`;
  return {
    ...spec,
    info: {
      ...info,
      description: banner + existing,
    },
  };
}

const { publicLimited: publicOpenApiSpecRaw, full: integrationOpenApiSpec } =
  loadMergedOpenApiSpecs();
const publicOpenApiSpec = applyDeveloperDashboardBanner(publicOpenApiSpecRaw);

app.get('/openapi.json', (_req, res) => {
  res.json(publicOpenApiSpec);
});

app.get('/integration/openapi.json', (req, res) => {
  const key = process.env['SPECTRA_INTEGRATION_OPENAPI_KEY']?.trim();
  if (!key || req.get('x-spectra-integration-key') !== key) {
    res.status(401).json({
      error: 'unauthorized',
      message: 'Valid X-Spectra-Integration-Key header is required.',
    });
    return;
  }
  res.json(integrationOpenApiSpec);
});

/** Public limited Swagger — must use serveFiles (not shared serve) so init.js is not overwritten by /integration/docs. */
const publicSwaggerUiOptions = {
  customSiteTitle: 'Spectra API reference (public)',
  // swagger-ui-express defaults `url` to `window.location.origin` when unset, which is not a spec.
  // Point at unauthenticated public contract so the UI always loads the limited catalog.
  swaggerUrl: '/openapi.json',
};

const integrationSwaggerUiOptions = {
  customSiteTitle: 'Spectra Integration API (authenticated spec)',
};

function timingSafeStringEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function parseBasicAuthHeader(header: string | undefined): { user: string; pass: string } | null {
  if (!header?.toLowerCase().startsWith('basic ')) return null;
  const raw = header.slice(6).trim();
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf8');
    const i = decoded.indexOf(':');
    if (i < 0) return null;
    return { user: decoded.slice(0, i), pass: decoded.slice(i + 1) };
  } catch {
    return null;
  }
}

/**
 * When `SPECTRA_INTEGRATION_OPENAPI_KEY` is set, the full OpenAPI JSON is header-gated.
 * Browser Swagger needs HTTP Basic on every asset request, so gate `/integration/docs` with
 * `SPECTRA_INTEGRATION_DOCS_BASIC_USER` + `SPECTRA_INTEGRATION_DOCS_BASIC_PASSWORD`.
 * Without the integration key (local dev only), the UI stays open. In production without
 * the key, the full-catalog UI is disabled.
 */
const integrationSwaggerUiGate: RequestHandler = (req, res, next) => {
  const intKey = process.env['SPECTRA_INTEGRATION_OPENAPI_KEY']?.trim();
  const isProd = process.env['NODE_ENV'] === 'production';

  if (!intKey) {
    if (isProd) {
      res.status(404).json({
        error: 'not_found',
        message: 'Integration Swagger UI is not enabled in this deployment.',
      });
      return;
    }
    next();
    return;
  }

  const docUser = process.env['SPECTRA_INTEGRATION_DOCS_BASIC_USER']?.trim();
  const docPass = process.env['SPECTRA_INTEGRATION_DOCS_BASIC_PASSWORD']?.trim();
  if (!docUser || !docPass) {
    res.status(503).json({
      error: 'integration_docs_unavailable',
      message:
        'Full-catalog Swagger UI requires SPECTRA_INTEGRATION_DOCS_BASIC_USER and SPECTRA_INTEGRATION_DOCS_BASIC_PASSWORD when SPECTRA_INTEGRATION_OPENAPI_KEY is set. Use GET /integration/openapi.json with header X-Spectra-Integration-Key, or the public catalog at GET /docs.',
    });
    return;
  }

  const creds = parseBasicAuthHeader(req.headers.authorization);
  if (
    !creds ||
    !timingSafeStringEqual(creds.user, docUser) ||
    !timingSafeStringEqual(creds.pass, docPass)
  ) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Spectra integration API docs"');
    res.status(401).send('Authentication required');
    return;
  }
  next();
};

app.use(
  '/docs',
  ...swaggerUi.serveFiles(publicOpenApiSpec, publicSwaggerUiOptions),
  swaggerUi.setup(publicOpenApiSpec, publicSwaggerUiOptions),
);

app.use(
  '/integration/docs',
  integrationSwaggerUiGate,
  ...swaggerUi.serveFiles(integrationOpenApiSpec, integrationSwaggerUiOptions),
  swaggerUi.setup(integrationOpenApiSpec, integrationSwaggerUiOptions),
);

app.get('/', (_req, res) => {
  res.send({ message: 'Spectra aviate-api', prefix: '/v1/platform' });
});

app.listen(port, host, () => {
  console.log(`[ ready ] http://${host}:${port}`);
});
