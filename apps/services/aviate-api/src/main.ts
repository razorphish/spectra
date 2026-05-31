import { config } from 'dotenv';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import express from 'express';
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

app.use(
  '/docs',
  ...swaggerUi.serveFiles(publicOpenApiSpec, publicSwaggerUiOptions),
  swaggerUi.setup(publicOpenApiSpec, publicSwaggerUiOptions),
);

app.use(
  '/integration/docs',
  ...swaggerUi.serveFiles(integrationOpenApiSpec, integrationSwaggerUiOptions),
  swaggerUi.setup(integrationOpenApiSpec, integrationSwaggerUiOptions),
);

app.get('/', (_req, res) => {
  res.send({ message: 'Spectra aviate-api', prefix: '/v1/platform' });
});

app.listen(port, host, () => {
  console.log(`[ ready ] http://${host}:${port}`);
});
