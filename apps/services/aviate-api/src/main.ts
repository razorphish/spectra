import 'dotenv/config';
import express from 'express';
import { createPlatformRouter } from './routes/platform';
import { createUploadsRouter } from './routes/uploads';

const host = process.env['HOST'] ?? 'localhost';
const port = process.env['PORT'] ? Number(process.env['PORT']) : 3001;

const app = express();
app.use(express.json({ limit: '64kb' }));

app.use('/v1/platform', createPlatformRouter());
app.use('/v1/platform/uploads', createUploadsRouter());

app.get('/', (_req, res) => {
  res.send({ message: 'Spectra aviate-api', prefix: '/v1/platform' });
});

app.listen(port, host, () => {
  console.log(`[ ready ] http://${host}:${port}`);
});
