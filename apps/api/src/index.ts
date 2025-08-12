import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { z } from 'zod';

// Load environment variables from .env.local (not committed)
dotenv.config({ path: '.env.local' });

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

// Safe config probe, does not reveal the actual key
app.get('/api/config', (_req, res) => {
  res.json({ ok: true, hasExercisesApiKey: Boolean(process.env.EXERCISES_API_KEY) });
});

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () => {
  const hasKey = Boolean(process.env.EXERCISES_API_KEY);
  console.log(`[api] listening on http://localhost:${port} (exercisesApiKeyLoaded=${hasKey})`);
});
