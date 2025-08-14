"use client";
import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../../lib/api";

type Food = {
  id: string;
  name: string;
  serving_size_g: number;
  calories: number;
  protein_g?: number;
  fat_total_g?: number;
  carbohydrates_total_g?: number;
};

type Entry = {
  id: string;
  date: string;
  meal: string;
  foodName: string;
  quantityGrams: number;
  calories: number;
  protein_g?: number;
  fat_g?: number;
  carbohydrates_g?: number;
};

const meals = ["breakfast", "lunch", "dinner", "snack"] as const;

export default function MealPlanPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [target, setTarget] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState<null | { meal: string }>(null);
  const [qty, setQty] = useState<number>(100);
  const [unit, setUnit] = useState<string>('g');

  useEffect(() => {
    (async () => {
      // load diary
      const res = await fetch(`${API_BASE_URL}/api/nutrition/diary?date=${date}`);
      const json = await res.json();
      setEntries(json.data || []);
      // load target from profile
      const p = await fetch(`${API_BASE_URL}/api/nutrition/profile`).then((r) => r.json());
      const prof = p.data;
      if (prof) {
        if (prof.lastTargetKcal) setTarget(prof.lastTargetKcal);
        else setTarget(computeTargetFromProfile(prof));
      }
    })();
  }, [date]);

  // When user updates Personal Info and returns, reflect new goal automatically
  useEffect(() => {
    const id = setInterval(async () => {
      const p = await fetch(`${API_BASE_URL}/api/nutrition/profile`).then((r) => r.json()).catch(()=>null);
      const prof = p?.data;
      if (prof) setTarget(prof.lastTargetKcal ?? computeTargetFromProfile(prof));
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const totals = useMemo(() => {
    const sum = entries.reduce(
      (acc, e) => {
        acc.cal += e.calories;
        acc.p += e.protein_g || 0;
        acc.f += e.fat_g || 0;
        acc.c += e.carbohydrates_g || 0;
        return acc;
      },
      { cal: 0, p: 0, f: 0, c: 0 }
    );
    return sum;
  }, [entries]);

  async function search() {
    if (!query.trim()) return setResults([]);
    const r = await fetch(`${API_BASE_URL}/api/nutrition/search?q=${encodeURIComponent(query)}`);
    const j = await r.json();
    setResults(j.data || []);
  }

  function toGrams(amount: number, u: string): number {
    const a = isFinite(amount) ? amount : 0;
    switch (u) {
      case 'g': return a;
      case 'ml': return a; // approximate water density
      case 'oz': return a * 28.3495;
      case 'cup': return a * 240;
      case 'tbsp': return a * 15;
      case 'tsp': return a * 5;
      default: return a;
    }
  }

  async function addFood(f: Food, meal: string) {
    const grams = toGrams(qty || 0, unit);
    const baseSize = f.serving_size_g || 100;
    const ratio = baseSize > 0 ? grams / baseSize : 1;
    const calories = (f.calories || 0) * ratio;
    const protein = (f.protein_g || 0) * ratio;
    const fat = (f.fat_total_g || 0) * ratio;
    const carbs = (f.carbohydrates_total_g || 0) * ratio;
    const payload = {
      date,
      meal,
      foodName: f.name,
      quantityGrams: Math.round(grams * 100) / 100,
      calories: Math.round(calories * 100) / 100,
      protein_g: Math.round(protein * 100) / 100,
      fat_g: Math.round(fat * 100) / 100,
      carbohydrates_g: Math.round(carbs * 100) / 100,
    } as any;
    await fetch(`${API_BASE_URL}/api/nutrition/diary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const res = await fetch(`${API_BASE_URL}/api/nutrition/diary?date=${date}`);
    const json = await res.json();
    setEntries(json.data || []);
    setModalOpen(null);
  }

  async function removeEntry(id: string) {
    await fetch(`${API_BASE_URL}/api/nutrition/diary/${id}`, { method: "DELETE" });
    setEntries((e) => e.filter((x) => x.id !== id));
  }

  const remaining = target != null ? Math.round(target - totals.cal) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Calorie Counter • Meal Plan</h1>
          <div className="text-sm text-white/60">{date}</div>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <input type="date" value={date} onChange={(e)=> setDate(e.target.value)} className="rounded bg-white/5 ring-1 ring-white/10 px-2 py-1 text-sm" />
          {target != null && (
            <div className="rounded-md bg-white/5 ring-1 ring-white/10 px-3 py-2 text-xs">
              <div className="text-white/70">Goal</div>
              <div className="text-white font-semibold">{target} kcal</div>
            </div>
          )}
          <div className="rounded-md bg-white/5 ring-1 ring-white/10 px-3 py-2 text-xs">
            <div className="text-white/70">Eaten</div>
            <div className="text-white font-semibold">{Math.round(totals.cal)} kcal</div>
          </div>
          {remaining != null && (
            <div className="rounded-md bg-white/5 ring-1 ring-white/10 px-3 py-2 text-xs">
              <div className="text-white/70">Remaining</div>
              <div className="text-white font-semibold">{remaining} kcal</div>
            </div>
          )}
          {target != null && (
            <div className="text-xs text-white/70 ml-2">{target} - {Math.round(totals.cal)} = <span className="text-white font-semibold">{remaining ?? (target - Math.round(totals.cal))}</span> kcal</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Left: diary columns */}
        <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {meals.map((m) => (
            <div key={m} className="card p-4">
              <div className="text-white font-semibold capitalize mb-2">{m}</div>
              <div className="mb-2 flex items-center justify-between text-xs text-white/70">
                <button onClick={()=> { setModalOpen({ meal: m }); setResults([]); setQuery(""); }} className="px-2 py-1 rounded-full bg-white/10 hover:bg-white/15">Search</button>
                <div>
                  {Math.round(entries.filter(e=>e.meal===m).reduce((s,e)=> s+e.calories,0))} kcal
                </div>
              </div>
              <div className="space-y-2">
                {entries.filter((e) => e.meal === m).map((e) => (
                  <div key={e.id} className="flex items-center justify-between rounded bg-white/5 ring-1 ring-white/10 px-3 py-2 text-sm">
                    <div className="truncate">
                      <div className="text-white truncate">{e.foodName}</div>
                      <div className="text-white/60 text-xs">{e.quantityGrams} g • {Math.round(e.calories)} kcal</div>
                    </div>
                    <button onClick={()=> removeEntry(e.id)} className="text-xs text-white/70 hover:underline">Remove</button>
                  </div>
                ))}
                {entries.filter((e)=> e.meal === m).length === 0 && (
                  <div className="text-xs text-white/50">No items yet.</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Right: macros pie chart */}
        <div className="card p-4">
          <div className="text-sm text-white/80 mb-2">Macros today</div>
          <MacrosPie protein={totals.p} carbs={totals.c} fat={totals.f} />
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-black/80 ring-1 ring-white/10 p-4">
            <div className="flex items-center justify-between">
              <div className="text-white font-semibold">Add to {modalOpen.meal}</div>
              <button className="text-white/70 text-sm" onClick={()=> setModalOpen(null)}>Close</button>
            </div>
            <div className="mt-3 flex gap-2">
              <input value={query} onChange={(e)=> setQuery(e.target.value)} placeholder="Search foods (e.g., salmon)" className="flex-1 rounded bg-white/5 ring-1 ring-white/10 px-2 py-1 text-sm" />
              <button onClick={search} className="px-3 py-1 rounded-full text-xs font-semibold text-black bg-cyan-400 hover:bg-cyan-300">Search</button>
            </div>
            <div className="mt-3 max-h-[60vh] overflow-y-auto space-y-2 pr-1">
              {results.map((f)=> (
                <div key={f.id} className="rounded bg-white/5 ring-1 ring-white/10 px-3 py-2">
                  <div className="text-sm text-white">{f.name}</div>
                  <div className="text-xs text-white/60">{f.serving_size_g} g • {Math.round(f.calories)} kcal • P {Math.round(f.protein_g||0)}g • C {Math.round(f.carbohydrates_total_g||0)}g • F {Math.round(f.fat_total_g||0)}g</div>
                  <div className="mt-2 flex items-center gap-2">
                    <input type="number" min={0} step={1} value={qty} onChange={(e)=> setQty(parseFloat(e.target.value||'0'))} className="w-24 rounded bg-white/5 ring-1 ring-white/10 px-2 py-1 text-xs" />
                    <select value={unit} onChange={(e)=> setUnit(e.target.value)} className="rounded bg-white/5 ring-1 ring-white/10 px-2 py-1 text-xs">
                      <option value="g">g</option>
                      <option value="oz">oz</option>
                      <option value="cup">cup</option>
                      <option value="tbsp">tbsp</option>
                      <option value="tsp">tsp</option>
                      <option value="ml">ml</option>
                    </select>
                    <button type="button" onClick={()=> addFood(f, modalOpen.meal)} className="px-2 py-1 rounded-full text-[11px] font-semibold text-black bg-cyan-400 hover:bg-cyan-300">Add</button>
                  </div>
                </div>
              ))}
              {results.length === 0 && (
                <div className="text-xs text-white/50">Search to see foods.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MacrosPie({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const total = Math.max(0.0001, protein + carbs + fat);
  const p = (protein / total) * 100;
  const c = (carbs / total) * 100;
  const f = (fat / total) * 100;
  // Build conic-gradient for a simple pie chart without extra deps
  const style = {
    backgroundImage: `conic-gradient(#22d3ee 0 ${p}%, #a78bfa ${p}% ${p + c}%, #fbbf24 ${p + c}% 100%)`,
  } as React.CSSProperties;
  return (
    <div className="flex items-center gap-4">
      <div className="w-36 h-36 rounded-full" style={style} />
      <div className="text-xs text-white/80 space-y-1">
        <div><span className="inline-block w-2 h-2 rounded-sm align-middle mr-2" style={{background:'#22d3ee'}}></span>Protein: {Math.round(protein)} g ({Math.round(p)}%)</div>
        <div><span className="inline-block w-2 h-2 rounded-sm align-middle mr-2" style={{background:'#a78bfa'}}></span>Carbs: {Math.round(carbs)} g ({Math.round(c)}%)</div>
        <div><span className="inline-block w-2 h-2 rounded-sm align-middle mr-2" style={{background:'#fbbf24'}}></span>Fat: {Math.round(f)} g ({Math.round(f)}%)</div>
      </div>
    </div>
  );
}

function computeTargetFromProfile(p: any): number | null {
  if (!p) return null;
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
  const weightKg = p.weightUnit === 'kg' ? p.weightValue : p.weightValue * LB_TO_KG;
  const heightCm = p.heightUnit === 'cm' ? p.heightValue : p.heightValue * IN_TO_CM;
  let BMR: number;
  if (typeof p.bodyFatPercent === 'number') {
    const lbmKg = weightKg * (1 - p.bodyFatPercent / 100);
    BMR = 370 + 21.6 * lbmKg;
  } else {
    const sexCoeff = p.gender === 'male' ? 5 : -161;
    BMR = 10 * weightKg + 6.25 * heightCm - 5 * p.age + sexCoeff;
  }
  const TDEE = BMR * (PAL[p.activityLevel] ?? 1.55);
  const weeklyDeltaLb = p.goal === 'recomp' ? 0 : (p.goal === 'gain' ? Math.abs(p.rateLbsPerWeek) : -Math.abs(p.rateLbsPerWeek));
  const dailyAdjust = (weeklyDeltaLb * KCAL_PER_LB) / 7.0;
  let targetKcal = TDEE + dailyAdjust;
  const maxDeficit = 0.25 * TDEE;
  const maxSurplus = 0.15 * TDEE;
  targetKcal = Math.max(TDEE - maxDeficit, Math.min(TDEE + maxSurplus, targetKcal));
  return Math.round(targetKcal);
}


