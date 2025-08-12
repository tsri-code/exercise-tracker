import express from 'express';
import cors from 'cors';
import { z } from 'zod';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'exercise-tracker-api' });
});

app.get('/api/exercises', (_req, res) => {
  res.json({ data: [], message: 'Exercises list placeholder' });
});

app.post('/api/workouts', (req, res) => {
  res.status(201).json({ id: 'placeholder', ...req.body });
});

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () => {
  console.log(`[api] listening on http://localhost:${port}`);
});
