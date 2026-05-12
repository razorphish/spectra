import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import express from 'express';
import { createAdminRouter } from './routes/admin';

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
  [join(root, 'apps/services/admin-ui-api', '.env.development'), true],
] as const) {
  if (existsSync(p)) {
    config({ path: p, override: o });
  }
}

const host = process.env['HOST'] ?? 'localhost';
const port = process.env['PORT'] ? Number(process.env['PORT']) : 3002;

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

app.use('/v1/admin', createAdminRouter());

app.get('/', (_req, res) => {
  res.send({ message: 'Spectra admin-ui-api', prefix: '/v1/admin' });
});

app.listen(port, host, () => {
  console.log(`[ ready ] http://${host}:${port}`);
});
