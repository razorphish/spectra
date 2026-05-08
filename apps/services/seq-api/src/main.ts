import express from 'express';

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
