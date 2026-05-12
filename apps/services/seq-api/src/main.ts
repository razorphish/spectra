import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import express from 'express';

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
  [join(root, 'apps/services/seq-api', '.env.development'), true],
] as const) {
  if (existsSync(p)) {
    config({ path: p, override: o });
  }
}

/** Target implementation: C# / .NET (`/v1/seq/*`). This Express app is a dev stub. */
const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3003;

const app = express();
app.use(express.json());

const SEGMENT = 'seq';

app.get(`/v1/${SEGMENT}/health`, (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get(`/v1/${SEGMENT}/ready`, (_req, res) => {
  res.status(200).json({ status: 'ok', checks: { runtime: 'ok' } });
});

app.get('/', (_req, res) => {
  res.send({ message: 'Spectra seq-api (Node stub — replace with .NET)', segment: SEGMENT });
});

app.listen(port, host, () => {
  console.log(`[ ready ] http://${host}:${port}`);
});
