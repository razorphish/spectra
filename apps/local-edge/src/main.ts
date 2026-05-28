import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import express from 'express';
import { mountServiceProxies } from './proxy';

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
  [join(root, 'apps/local-edge', '.env.development'), true],
] as const) {
  if (existsSync(p)) {
    config({ path: p, override: o });
  }
}

/** Local dev only — CORS + optional passthrough. Not deployed. Production edge is AWS HTTP API (Terraform api_http). */
const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

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
app.use(express.json());

const SEGMENT = 'local-edge';

app.get(`/v1/${SEGMENT}/health`, (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get(`/v1/${SEGMENT}/ready`, (_req, res) => {
  res.status(200).json({ status: 'ok', checks: { local_edge: 'ok' } });
});

mountServiceProxies(app);

app.get('/', (_req, res) => {
  res.send({
    message: 'Spectra local-edge — local development only; not deployed to AWS.',
    segment: SEGMENT,
    proxy: {
      platform: process.env['AVIATE_API_URL'] ?? 'http://127.0.0.1:3001',
      seq: process.env['SEQ_API_URL'] ?? 'http://127.0.0.1:3003',
      quantum: process.env['QUANTUM_API_URL'] ?? 'http://127.0.0.1:3004',
      corridor: process.env['CORRIDOR_API_URL'] ?? 'http://127.0.0.1:3005',
    },
  });
});

app.listen(port, host, () => {
  console.log(`[ ready ] http://${host}:${port}`);
});
