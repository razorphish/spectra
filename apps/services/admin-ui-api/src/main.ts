import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import express from 'express';
import { requestLoggingMiddleware } from './lib/request-logging';
import { initServiceLogging, getServiceLog } from './lib/service-logger';
import { createAdminRouter } from './routes/admin';
import { workspaceRoot } from './workspace-root';

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
app.use(requestLoggingMiddleware);

app.use('/v1/admin', createAdminRouter());

app.get('/', (_req, res) => {
  res.send({ message: 'Spectra admin-ui-api', prefix: '/v1/admin' });
});

void initServiceLogging().then(() => {
  app.listen(port, host, () => {
    getServiceLog().info(`Listening on http://${host}:${port}`, {
      module: 'main.ts',
      action: 'listen',
      context: { host, port },
    });
  });
});
