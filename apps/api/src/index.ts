import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { z } from "zod";
import { PrismaClient } from "./generated/prisma";

// Load environment variables from .env.local (not committed)
dotenv.config({ path: ".env.local" });

const app = express();
app.use(cors());
app.use(express.json());

const prisma = new PrismaClient();

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "exercise-tracker-api" });
});

app.get("/api/exercises", (_req, res) => {
  res.json({ data: [], message: "Exercises list placeholder" });
});

// Provider-aware exercise search proxy
const exerciseProvider = (
  process.env.EXERCISES_API_PROVIDER || "api-ninjas"
).toLowerCase();
const exercisesApiBase = process.env.EXERCISES_API_BASE || "";

app.get("/api/exercises/search", async (req, res) => {
  const query = String(req.query.q || "").trim();
  if (!query) {
    return res.status(400).json({ error: "Missing query parameter q" });
  }

  try {
    let url: string;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (exerciseProvider === "api-ninjas") {
      url = `${
        exercisesApiBase || "https://api.api-ninjas.com/v1/exercises"
      }?name=${encodeURIComponent(query)}`;
      headers["X-Api-Key"] = process.env.EXERCISES_API_KEY || "";
    } else if (exerciseProvider === "rapidapi-exercisedb") {
      const base = exercisesApiBase || "https://exercisedb.p.rapidapi.com";
      url = `${base}/exercises/name/${encodeURIComponent(query)}`;
      headers["X-RapidAPI-Key"] = process.env.EXERCISES_API_KEY || "";
      headers["X-RapidAPI-Host"] = "exercisedb.p.rapidapi.com";
    } else {
      return res
        .status(500)
        .json({ error: "Unsupported EXERCISES_API_PROVIDER" });
    }

    if (!headers["X-Api-Key"] && !headers["X-RapidAPI-Key"]) {
      return res.status(500).json({ error: "Missing EXERCISES_API_KEY" });
    }

    const external = await fetch(url, { headers });
    if (!external.ok) {
      const text = await external.text();
      return res
        .status(external.status)
        .json({ error: "Upstream error", details: text });
    }
    const data = await external.json();

    const items = Array.isArray(data) ? data : data?.data ?? [];

    const buildExerciseId = (source: string, it: any, idx: number) => {
      const name = String(it.name ?? it.exercise_name ?? "")
        .trim()
        .toLowerCase();
      const target = String(it.target ?? it.muscle ?? it.bodyPart ?? "")
        .trim()
        .toLowerCase();
      const equipment = String(it.equipment ?? "")
        .trim()
        .toLowerCase();
      const base = [source, name, target, equipment].filter(Boolean).join(":");
      return base || `${source}:${idx}`;
    };

    const normalized = items.map((it: any, idx: number) => {
      const fallbackId = buildExerciseId(exerciseProvider, it, idx);
      return {
        id: String(it.id ?? it.exerciseId ?? fallbackId),
        name: String(it.name ?? it.exercise_name ?? "Exercise"),
        target: it.target ?? it.muscle ?? it.bodyPart ?? "",
        equipment: it.equipment ?? "",
        bodyPart: it.bodyPart ?? it.type ?? "",
        gifUrl: it.gifUrl ?? "",
      };
    });

    res.json({ data: normalized });
  } catch (err: any) {
    res
      .status(500)
      .json({ error: "Search failed", details: err?.message || String(err) });
  }
});

app.post("/api/workouts", (req, res) => {
  res.status(201).json({ id: "placeholder", ...req.body });
});

// Create routine
app.post("/api/routines", async (req, res) => {
  try {
    const schema = z.object({
      title: z.string().min(1),
      unit: z.string().default("kg"),
      items: z.array(
        z.object({
          exerciseId: z.string(),
          name: z.string(),
          sets: z.array(
            z.object({ reps: z.number().min(0), weight: z.number().min(0) })
          ),
        })
      ),
    });
    const data = schema.parse(req.body);
    const created = await prisma.routine.create({
      data: {
        title: data.title,
        unit: data.unit,
        items: {
          create: data.items.map((it) => ({
            exerciseId: it.exerciseId,
            name: it.name,
            sets: it.sets as unknown as any,
          })),
        },
      },
      include: { items: true },
    });
    res.status(201).json({ id: created.id });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || "Invalid payload" });
  }
});

// List routines
app.get("/api/routines", async (_req, res) => {
  const routines = await prisma.routine.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });
  res.json({ data: routines });
});

// Get single routine
app.get("/api/routines/:id", async (req, res) => {
  const { id } = req.params as { id: string };
  const routine = await prisma.routine.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!routine) return res.status(404).json({ error: "Not found" });
  res.json({ data: routine });
});

// Update routine (replace title/unit/items)
app.put("/api/routines/:id", async (req, res) => {
  const { id } = req.params as { id: string };
  try {
    const schema = z.object({
      title: z.string().min(1),
      unit: z.string().default("kg"),
      items: z.array(
        z.object({
          exerciseId: z.string(),
          name: z.string(),
          sets: z.array(
            z.object({ reps: z.number().min(0), weight: z.number().min(0) })
          ),
        })
      ),
    });
    const data = schema.parse(req.body);
    // Replace items: delete old, create new in a transaction
    const updated = await prisma.$transaction(async (tx) => {
      await tx.routineItem.deleteMany({ where: { routineId: id } });
      return tx.routine.update({
        where: { id },
        data: {
          title: data.title,
          unit: data.unit,
          items: {
            create: data.items.map((it) => ({
              exerciseId: it.exerciseId,
              name: it.name,
              sets: it.sets as unknown as any,
            })),
          },
        },
        include: { items: true },
      });
    });
    res.json({ data: updated });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || "Invalid payload" });
  }
});

// Create schedule entry
app.post("/api/schedules", async (req, res) => {
  try {
    const schema = z.object({
      routineId: z.string(),
      startDate: z.string(), // ISO string
      time: z.string(),
      repeat: z.enum(["none", "daily", "weekly", "monthly"]).default("none"),
      interval: z.number().int().positive().default(1),
      daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    });
    const data = schema.parse(req.body);
    const created = await prisma.schedule.create({
      data: {
        routineId: data.routineId,
        startDate: new Date(data.startDate),
        time: data.time,
        repeat: data.repeat,
        interval: data.interval,
        daysOfWeek: data.daysOfWeek as any,
      },
    });
    res.status(201).json({ id: created.id });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "Invalid payload" });
  }
});

// List schedules with routine
app.get("/api/schedules", async (_req, res) => {
  const sched = await prisma.schedule.findMany({
    include: { routine: true },
    orderBy: { startDate: "asc" },
  });
  res.json({ data: sched });
});

// Update a schedule
app.put("/api/schedules/:id", async (req, res) => {
  const { id } = req.params as { id: string };
  try {
    const schema = z.object({
      routineId: z.string(),
      startDate: z.string(),
      time: z.string(),
      repeat: z.enum(["none", "daily", "weekly", "monthly"]).default("none"),
      interval: z.number().int().positive().default(1),
      daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    });
    const data = schema.parse(req.body);
    const updated = await prisma.schedule.update({
      where: { id },
      data: {
        routineId: data.routineId,
        startDate: new Date(data.startDate),
        time: data.time,
        repeat: data.repeat,
        interval: data.interval,
        daysOfWeek: data.daysOfWeek as any,
      },
    });
    res.json({ data: updated });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "Invalid payload" });
  }
});

// Delete a schedule
app.delete("/api/schedules/:id", async (req, res) => {
  const { id } = req.params as { id: string };
  await prisma.schedule.delete({ where: { id } }).catch(() => undefined);
  res.json({ ok: true });
});

// Safe config probe, does not reveal the actual key
app.get("/api/config", (_req, res) => {
  res.json({
    ok: true,
    hasExercisesApiKey: Boolean(process.env.EXERCISES_API_KEY),
  });
});

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () => {
  const hasKey = Boolean(process.env.EXERCISES_API_KEY);
  console.log(
    `[api] listening on http://localhost:${port} (exercisesApiKeyLoaded=${hasKey})`
  );
});
