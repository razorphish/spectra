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

function loadMergedOpenApiSpec(): Record<string, unknown> {
  const candidates = [
    join(__dirname, 'assets', 'spectra-public-api.json'),
    join(root, 'apps/services/aviate-api/src/assets/spectra-public-api.json'),
    join(root, 'packages/openapi/dist/spectra-public-api.json'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      return JSON.parse(readFileSync(p, 'utf8')) as Record<string, unknown>;
    }
  }
  return {
    openapi: '3.0.3',
    info: { title: 'Spectra Public API', version: '0.0.1' },
    paths: {},
  };
}

const openApiSpec = loadMergedOpenApiSpec();

app.get('/openapi.json', (_req, res) => {
  res.json(openApiSpec);
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
  res.json(openApiSpec);
});

app.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec, {
    customSiteTitle: 'Spectra Public API',
  })
);

app.use(
  '/integration/docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec, {
    customSiteTitle: 'Spectra Integration API (authenticated spec)',
  })
);

app.get('/', (_req, res) => {
  res.send({ message: 'Spectra aviate-api', prefix: '/v1/platform' });
});

app.listen(port, host, () => {
  console.log(`[ ready ] http://${host}:${port}`);
});
