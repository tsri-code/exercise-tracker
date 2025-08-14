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

// Basic request logger for debugging
app.use((req, _res, next) => {
  if (req.path.startsWith("/api/nutrition")) {
    console.log(`[api] ${req.method} ${req.path}`);
  }
  next();
});

// Graceful JSON parse error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (err && err.type === "entity.parse.failed") {
      return res.status(400).json({ error: "Invalid JSON body" });
    }
    return next(err);
  }
);

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

// Nutrition profile CRUD
const profileSchema = z.object({
  weightValue: z.number().positive(),
  weightUnit: z.enum(["kg", "lbs"]),
  heightValue: z.number().positive(),
  heightUnit: z.enum(["cm", "in"]),
  age: z.number().int().min(10).max(120),
  gender: z.enum(["male", "female", "other"]).default("other"),
  goal: z.enum(["recomp", "lose", "gain"]),
  rateLbsPerWeek: z.number().min(-2).max(2).default(0),
  activityLevel: z.enum([
    "sedentary",
    "light",
    "moderate",
    "active",
    "very",
    "athlete",
  ]),
  bodyFatPercent: z.number().min(0).max(75).nullable().optional(),
  dietaryPreference: z.string().nullable().optional(),
  allergies: z.string().nullable().optional(),
  mealsPerDay: z.number().int().min(1).max(10).nullable().optional(),
  proteinPerKg: z.number().min(0).max(3).nullable().optional(),
  customTargetKcal: z.number().int().positive().nullable().optional(),
  lastTargetKcal: z.number().int().positive().nullable().optional(),
});

function computeTargetKcal(p: z.infer<typeof profileSchema>): number {
  const LB_TO_KG = 0.45359237;
  const IN_TO_CM = 2.54;
  const KCAL_PER_LB = 3500.0;
  const PAL: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very: 1.725,
    athlete: 1.9,
  };
  const weightKg =
    p.weightUnit === "kg" ? p.weightValue : p.weightValue * LB_TO_KG;
  const heightCm =
    p.heightUnit === "cm" ? p.heightValue : p.heightValue * IN_TO_CM;
  let BMR: number;
  if (typeof p.bodyFatPercent === "number") {
    const lbmKg = weightKg * (1 - p.bodyFatPercent / 100);
    BMR = 370 + 21.6 * lbmKg;
  } else {
    const sexCoeff = p.gender === "male" ? 5 : -161;
    BMR = 10 * weightKg + 6.25 * heightCm - 5 * p.age + sexCoeff;
  }
  const TDEE = BMR * (PAL[p.activityLevel] ?? 1.55);
  const weeklyDeltaLb =
    p.goal === "recomp"
      ? 0
      : p.goal === "gain"
      ? Math.abs(p.rateLbsPerWeek)
      : -Math.abs(p.rateLbsPerWeek);
  const dailyAdjust = (weeklyDeltaLb * KCAL_PER_LB) / 7.0;
  let targetKcal = TDEE + dailyAdjust;
  const maxDeficit = 0.25 * TDEE;
  const maxSurplus = 0.15 * TDEE;
  targetKcal = Math.max(
    TDEE - maxDeficit,
    Math.min(TDEE + maxSurplus, targetKcal)
  );
  return Math.round(targetKcal);
}

app.get("/api/nutrition/profile", async (_req, res) => {
  const profile = await prisma.nutritionProfile.findFirst({
    orderBy: { updatedAt: "desc" },
  });
  res.json({ data: profile || null });
});

app.post("/api/nutrition/profile", async (req, res) => {
  try {
    console.log("[api] SAVE profile (POST) payload:", req.body);
    const data = profileSchema.parse(req.body);
    const target = computeTargetKcal(data);
    const created = await prisma.nutritionProfile.create({
      data: {
        ...data,
        computedTargetKcal: target,
        lastTargetKcal: data.customTargetKcal ?? target,
      },
    });
    res.status(201).json({ data: created });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "Invalid payload" });
  }
});

app.put("/api/nutrition/profile/:id", async (req, res) => {
  const { id } = req.params as { id: string };
  try {
    console.log("[api] SAVE profile (PUT by id) payload:", req.body);
    const data = profileSchema.parse(req.body);
    const target = computeTargetKcal(data);
    const updated = await prisma.nutritionProfile.update({
      where: { id },
      data: {
        ...data,
        computedTargetKcal: target,
        lastTargetKcal: data.customTargetKcal ?? target,
      },
    });
    res.json({ data: updated });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "Invalid payload" });
  }
});

// Upsert profile without needing id on the client
app.put("/api/nutrition/profile", async (req, res) => {
  try {
    console.log("[api] UPSERT profile (PUT) payload:", req.body);
    const data = profileSchema.parse(req.body);
    const target = computeTargetKcal(data);
    const existing = await prisma.nutritionProfile.findFirst({
      orderBy: { updatedAt: "desc" },
    });
    const saved = existing
      ? await prisma.nutritionProfile.update({
          where: { id: existing.id },
          data: {
            ...data,
            computedTargetKcal: target,
            lastTargetKcal: data.customTargetKcal ?? target,
          },
        })
      : await prisma.nutritionProfile.create({
          data: {
            ...data,
            computedTargetKcal: target,
            lastTargetKcal: data.customTargetKcal ?? target,
          },
        });
    res.json({ data: saved });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "Invalid payload" });
  }
});

// Calories diary CRUD
app.get("/api/nutrition/diary", async (req, res) => {
  const dateStr = String(
    req.query.date || new Date().toISOString().slice(0, 10)
  );
  const start = new Date(`${dateStr}T00:00:00`);
  const end = new Date(`${dateStr}T23:59:59`);
  const items = await prisma.mealEntry.findMany({
    where: { date: { gte: start, lte: end } },
    orderBy: { createdAt: "asc" },
  });
  res.json({ data: items });
});

app.post("/api/nutrition/diary", async (req, res) => {
  try {
    const schema = z.object({
      date: z.string(), // YYYY-MM-DD
      meal: z.string(),
      foodName: z.string(),
      quantityGrams: z.number().positive(),
      calories: z.number().nonnegative(),
      protein_g: z.number().nonnegative().optional(),
      fat_g: z.number().nonnegative().optional(),
      carbohydrates_g: z.number().nonnegative().optional(),
    });
    console.log("[api] ADD diary entry payload:", req.body);
    const data = schema.parse(req.body);
    const created = await prisma.mealEntry.create({
      data: {
        date: new Date(`${data.date}T12:00:00`),
        meal: data.meal,
        foodName: data.foodName,
        quantityGrams: data.quantityGrams,
        calories: data.calories,
        protein_g: data.protein_g,
        fat_g: data.fat_g,
        carbohydrates_g: data.carbohydrates_g,
      },
    });
    res.status(201).json({ data: created });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "Invalid payload" });
  }
});

app.delete("/api/nutrition/diary/:id", async (req, res) => {
  const { id } = req.params as { id: string };
  await prisma.mealEntry.delete({ where: { id } }).catch(() => undefined);
  res.json({ ok: true });
});

// Simple nutrition food search proxy (API Ninjas Nutrition)
// https://api-ninjas.com/api/nutrition
app.get("/api/nutrition/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "Missing q" });
  const key =
    process.env.EXERCISES_API_KEY || process.env.NUTRITION_API_KEY || "";
  if (!key) return res.status(500).json({ error: "Missing API key" });
  const url = `https://api.api-ninjas.com/v1/nutrition?query=${encodeURIComponent(
    q
  )}`;
  const r = await fetch(url, { headers: { "X-Api-Key": key } });
  if (!r.ok) return res.status(r.status).json({ error: await r.text() });
  const data = await r.json();
  // Normalize to a small shape
  const num = (x: any): number | null => {
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  };
  const items = (Array.isArray(data) ? data : []).map((it: any, i: number) => {
    const p = num(it.protein_g);
    const c = num(it.carbohydrates_total_g);
    const f = num(it.fat_total_g);
    let cal = num(it.calories);
    if (cal == null && (p != null || c != null || f != null)) {
      cal = (p ?? 0) * 4 + (c ?? 0) * 4 + (f ?? 0) * 9;
    }
    const size = num(it.serving_size_g) ?? 100;
    return {
      id: `${String(it.name || "food").toLowerCase()}-${i}`,
      name: String(it.name || "Food"),
      serving_size_g: size,
      calories: cal ?? 0,
      protein_g: p ?? undefined,
      fat_total_g: f ?? undefined,
      carbohydrates_total_g: c ?? undefined,
    };
  });
  res.json({ data: items });
});

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () => {
  const hasKey = Boolean(process.env.EXERCISES_API_KEY);
  console.log(
    `[api] listening on http://localhost:${port} (exercisesApiKeyLoaded=${hasKey})`
  );
});
