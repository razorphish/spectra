import express from 'express';

/** Thin optional BFF — routing usually maps API Gateway → Lambdas directly. */
const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const app = express();
app.use(express.json());

const SEGMENT = 'gateway';

app.get(`/v1/${SEGMENT}/health`, (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get(`/v1/${SEGMENT}/ready`, (_req, res) => {
  res.status(200).json({ status: 'ok', checks: { gateway: 'ok' } });
});

app.get('/', (_req, res) => {
  res.send({ message: 'Spectra api-gateway stub', segment: SEGMENT });
});

app.listen(port, host, () => {
  console.log(`[ ready ] http://${host}:${port}`);
});
