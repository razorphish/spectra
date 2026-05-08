import 'dotenv/config';
import express from 'express';
import { createAdminRouter } from './routes/admin';

const host = process.env['HOST'] ?? 'localhost';
const port = process.env['PORT'] ? Number(process.env['PORT']) : 3002;

const app = express();
app.use(express.json());

app.use('/v1/admin', createAdminRouter());

app.get('/', (_req, res) => {
  res.send({ message: 'Spectra admin-ui-api', prefix: '/v1/admin' });
});

app.listen(port, host, () => {
  console.log(`[ ready ] http://${host}:${port}`);
});
