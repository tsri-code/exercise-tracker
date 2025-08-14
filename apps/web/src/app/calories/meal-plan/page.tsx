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

  useEffect(() => {
    (async () => {
      // load diary
      const res = await fetch(`${API_BASE_URL}/api/nutrition/diary?date=${date}`);
      const json = await res.json();
      setEntries(json.data || []);
      // load target from profile
      const p = await fetch(`${API_BASE_URL}/api/nutrition/profile`).then((r) => r.json());
      const prof = p.data;
      if (prof) setTarget(prof.lastTargetKcal ?? null);
    })();
  }, [date]);

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

  async function addFood(f: Food, meal: string) {
    const qty = f.serving_size_g || 100;
    const payload = {
      date,
      meal,
      foodName: f.name,
      quantityGrams: qty,
      calories: f.calories,
      protein_g: f.protein_g,
      fat_g: f.fat_total_g,
      carbohydrates_g: f.carbohydrates_total_g,
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
        <div className="flex gap-2 items-center">
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

        {/* Right: search/add panel */}
        <div className="card p-4">
          <div className="text-sm text-white/80 mb-2">Tips</div>
          <div className="text-xs text-white/60">Use the Search button under each meal to add foods.</div>
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
              <input value={query} onChange={(e)=> setQuery(e.target.value)} placeholder="Search foods (e.g., salmon 100g)" className="flex-1 rounded bg-white/5 ring-1 ring-white/10 px-2 py-1 text-sm" />
              <button onClick={search} className="px-3 py-1 rounded-full text-xs font-semibold text-black bg-cyan-400 hover:bg-cyan-300">Search</button>
            </div>
            <div className="mt-3 max-h-[60vh] overflow-y-auto space-y-2 pr-1">
              {results.map((f)=> (
                <div key={f.id} className="rounded bg-white/5 ring-1 ring-white/10 px-3 py-2">
                  <div className="text-sm text-white">{f.name}</div>
                  <div className="text-xs text-white/60">{f.serving_size_g} g • {Math.round(f.calories)} kcal • P {Math.round(f.protein_g||0)}g • C {Math.round(f.carbohydrates_total_g||0)}g • F {Math.round(f.fat_total_g||0)}g</div>
                  <button type="button" onClick={()=> addFood(f, modalOpen.meal)} className="mt-2 px-2 py-1 rounded-full text-[11px] font-semibold text-black bg-cyan-400 hover:bg-cyan-300">Add</button>
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


