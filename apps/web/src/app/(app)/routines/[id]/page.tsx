"use client";
import { useEffect, useState, use as usePromise } from "react";
import { API_BASE_URL } from "../../../../lib/api";
import Link from "next/link";

type Routine = {
  id: string;
  title: string;
  unit: "kg" | "lbs" | string;
  items: {
    id: string;
    exerciseId: string;
    name: string;
    sets: { reps: number; weight: number }[];
  }[];
};

export default function RoutineEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: routineId } = usePromise(params);
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`${API_BASE_URL}/api/routines/${routineId}`);
      const json = await res.json();
      setRoutine(json.data);
    })();
  }, [routineId]);

  if (!routine) return <div className="text-sm text-white/60">Loading…</div>;

  function updateTitle(v: string) {
    setRoutine((r) => (r ? { ...r, title: v } : r));
  }
  function updateUnit(u: "kg" | "lbs") {
    setRoutine((r) => (r ? { ...r, unit: u } : r));
  }
  function updateSet(
    itemIdx: number,
    setIdx: number,
    key: "reps" | "weight",
    value: number
  ) {
    setRoutine((r) => {
      if (!r) return r;
      const items = [...r.items];
      const sets = [...items[itemIdx].sets];
      sets[setIdx] = { ...sets[setIdx], [key]: value } as any;
      items[itemIdx] = { ...items[itemIdx], sets };
      return { ...r, items };
    });
  }
  function addExercise() {
    setRoutine((r) =>
      r
        ? {
            ...r,
            items: [
              ...r.items,
              {
                id: crypto.randomUUID(),
                exerciseId: "custom",
                name: "New exercise",
                sets: [{ reps: 8, weight: 0 }],
              },
            ],
          }
        : r
    );
  }
  function removeExercise(idx: number) {
    setRoutine((r) =>
      r ? { ...r, items: r.items.filter((_, i) => i !== idx) } : r
    );
  }
  function move(idx: number, dir: -1 | 1) {
    setRoutine((r) => {
      if (!r) return r;
      const items = [...r.items];
      const ni = Math.max(0, Math.min(items.length - 1, idx + dir));
      const [it] = items.splice(idx, 1);
      items.splice(ni, 0, it);
      return { ...r, items };
    });
  }

  async function save() {
    setSaving(true);
    await fetch(`${API_BASE_URL}/api/routines/${routine.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: routine.title,
        unit: routine.unit,
        items: routine.items.map((it) => ({
          exerciseId: it.exerciseId,
          name: it.name,
          sets: it.sets,
        })),
      }),
    });
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={routine.title}
          onChange={(e) => updateTitle(e.target.value)}
          className="rounded-md bg-white/5 ring-1 ring-white/10 px-3 py-2 text-sm text-white"
        />
            <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/routines"
            className="text-xs text-white/70 hover:underline"
          >
            Back
          </Link>
          <button
            onClick={addExercise}
            className="px-3 py-1 rounded-full text-xs font-semibold text-black bg-cyan-400 hover:bg-cyan-300"
          >
            Add exercise
          </button>
          <button
            onClick={save}
            className="px-3 py-1 rounded-full text-xs font-semibold text-black bg-cyan-400 hover:bg-cyan-300"
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
      <div className="space-y-3">
        {routine.items.map((it, idx) => (
          <div
            key={it.id}
            className="p-3 rounded-md bg-white/5 ring-1 ring-white/10"
          >
            <div className="flex items-center justify-between">
              <input
                value={it.name}
                onChange={(e) => {
                  const v = e.target.value;
                  setRoutine((r) => {
                    if (!r) return r;
                    const items = [...r.items];
                    items[idx] = { ...items[idx], name: v };
                    return { ...r, items };
                  });
                }}
                className="text-sm bg-transparent outline-none text-white"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => move(idx, -1)}
                  className="text-xs text-white/70 hover:bg-white/10 px-2 py-1 rounded"
                >
                  Up
                </button>
                <button
                  onClick={() => move(idx, 1)}
                  className="text-xs text-white/70 hover:bg-white/10 px-2 py-1 rounded"
                >
                  Down
                </button>
                <button
                  onClick={() => removeExercise(idx)}
                  className="text-xs text-white/70 hover:bg-white/10 px-2 py-1 rounded"
                >
                  Remove
                </button>
              </div>
            </div>
            <div className="mt-2 space-y-2">
              {it.sets.map((s, si) => (
                <div key={si} className="flex flex-wrap items-center gap-3">
                  <div className="text-xs text-white/60 w-10">Set {si + 1}</div>
                  <input
                    type="number"
                    min={0}
                    value={s.reps}
                    onChange={(e) =>
                      updateSet(
                        idx,
                        si,
                        "reps",
                        parseInt(e.target.value || "0", 10)
                      )
                    }
                    className="w-20 rounded-md bg-white/5 ring-1 ring-white/10 px-2 py-1 text-sm text-white"
                  />
                  <input
                    type="number"
                    min={0}
                    step={routine.unit === "kg" ? 0.5 : 1}
                    value={s.weight}
                    onChange={(e) =>
                      updateSet(
                        idx,
                        si,
                        "weight",
                        parseFloat(e.target.value || "0")
                      )
                    }
                    className="w-24 rounded-md bg-white/5 ring-1 ring-white/10 px-2 py-1 text-sm text-white"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
