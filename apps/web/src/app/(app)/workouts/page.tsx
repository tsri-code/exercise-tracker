"use client";
import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../../lib/api";

type Exercise = {
  id: string;
  name: string;
  target?: string;
  equipment?: string;
  bodyPart?: string;
};

type WorkoutSet = { reps: number; weight: number };
type WorkoutItem = {
  uid: string; // unique per item instance
  exercise: Exercise;
  sets: WorkoutSet[];
};

export default function Page() {
  const [title, setTitle] = useState("");
  const [query, setQuery] = useState("bench");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Exercise[]>([]);
  const [items, setItems] = useState<WorkoutItem[]>([]);
  const [unit, setUnit] = useState<"kg" | "lbs">("kg");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Debounced search
  useEffect(() => {
    let cancelled = false;
    setSearching(true);
    const id = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/exercises/search?q=${encodeURIComponent(query)}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error("search error");
        const json = await res.json();
        if (!cancelled) setResults(json.data ?? []);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [query]);

  function addExercise(ex: Exercise) {
    // prevent duplicates by exercise id
    setItems((prev) => {
      if (prev.some((p) => p.exercise.id === ex.id)) return prev;
      const newItem: WorkoutItem = {
        uid:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? (crypto as any).randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        exercise: ex,
        sets: Array.from({ length: 3 }, () => ({ reps: 8, weight: 0 })),
      };
      return [...prev, newItem];
    });
  }

  function updateSet(
    itemIndex: number,
    setIndex: number,
    field: keyof WorkoutSet,
    value: number
  ) {
    setItems((prev) =>
      prev.map((it, i) =>
        i !== itemIndex
          ? it
          : {
              ...it,
              sets: it.sets.map((s, si) =>
                si === setIndex ? { ...s, [field]: value } : s
              ),
            }
      )
    );
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function addSetRow(itemIndex: number) {
    setItems((prev) =>
      prev.map((it, i) =>
        i !== itemIndex
          ? it
          : { ...it, sets: [...it.sets, { reps: 8, weight: 0 }] }
      )
    );
  }

  function removeSetRow(itemIndex: number, setIndex: number) {
    setItems((prev) =>
      prev.map((it, i) =>
        i !== itemIndex
          ? it
          : { ...it, sets: it.sets.filter((_, si) => si !== setIndex) }
      )
    );
  }

  const canSave = useMemo(
    () => title.trim().length > 0 && items.length > 0,
    [title, items]
  );

  function convertWeight(value: number, to: "kg" | "lbs") {
    if (!Number.isFinite(value)) return value;
    return to === "lbs"
      ? Math.round(value * 2.20462 * 10) / 10
      : Math.round((value / 2.20462) * 10) / 10;
  }

  function toggleUnit() {
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        sets: it.sets.map((s) => ({
          ...s,
          weight: convertWeight(s.weight, unit === "kg" ? "lbs" : "kg"),
        })),
      }))
    );
    setUnit((u) => (u === "kg" ? "lbs" : "kg"));
  }

  async function saveWorkout() {
    if (!canSave) return;
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        title: title.trim(),
        unit,
        items: items.map((it) => ({
          exerciseId: it.exercise.id,
          name: it.exercise.name,
          sets: it.sets,
        })),
      };
      const res = await fetch(`${API_BASE_URL}/api/routines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("save failed");
      const json = await res.json();
      setMessage(`Saved as #${json.id}`);
      // navigate to routines
      if (typeof window !== "undefined") {
        window.location.href = "/routines";
      }
      // reset form
      setItems([]);
      setTitle("");
      setQuery("bench");
    } catch (e) {
      setMessage("Save failed. Is the API running?");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="card p-6 glow">
        <h1 className="text-3xl md:text-4xl font-extrabold headline mb-4">Create workout</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Workout title (e.g., Push Day)"
            className="sm:col-span-3 rounded-md bg-white/5 ring-1 ring-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40"
          />

          <div className="md:col-span-1">
            <label className="text-xs text-white/60">Search exercises</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="bench, squat, pull up..."
              className="mt-1 w-full rounded-md bg-white/5 ring-1 ring-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40"
            />
            <div className="mt-3 overflow-y-auto max-h-[65vh] space-y-2 pr-1">
              {searching && (
                <div className="text-xs text-white/60">Searching…</div>
              )}
              {!searching && results.length === 0 && (
                <div className="text-xs text-white/60">No results.</div>
              )}
              {results.map((ex) => (
                <div
                  key={ex.id}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-white truncate">{ex.name}</div>
                    <div className="text-[11px] text-white/50 truncate">
                      {[ex.bodyPart, ex.target, ex.equipment]
                        .filter(Boolean)
                        .join(" • ")}
                    </div>
                  </div>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      addExercise(ex);
                    }}
                    onClick={() => addExercise(ex)}
                    className="relative z-10 shrink-0 px-2 py-1 rounded-md text-xs font-semibold text-black bg-cyan-400 hover:bg-cyan-300"
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-white/60">Workout items</label>
            <div className="mt-1 flex items-center justify-between">
              <div className="text-xs text-white/60">Unit</div>
              <button
                type="button"
                onClick={toggleUnit}
                className="px-3 py-1 rounded-full text-xs font-semibold text-black bg-cyan-400 hover:bg-cyan-300"
              >
                {unit.toUpperCase()} → {unit === "kg" ? "LBS" : "KG"}
              </button>
            </div>
            <div className="mt-2 space-y-2 overflow-y-auto max-h-[65vh] pr-1">
              {items.length === 0 && (
                <div className="text-xs text-white/60">
                  No exercises added yet.
                </div>
              )}
              {items.map((it, idx) => (
                <div
                  key={it.uid}
                  className="p-3 rounded-md bg-white/5 ring-1 ring-white/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-white truncate">
                        {it.exercise.name}
                      </div>
                      <div className="text-[11px] text-white/50 truncate">
                        {[
                          it.exercise.bodyPart,
                          it.exercise.target,
                          it.exercise.equipment,
                        ]
                          .filter(Boolean)
                          .join(" • ")}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => addSetRow(idx)}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold text-black bg-cyan-400 hover:bg-cyan-300"
                    >
                      Add set
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="px-2.5 py-1.5 rounded-md text-xs text-white/70 hover:bg-white/10"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mt-3 space-y-2">
                    {it.sets.map((s, si) => (
                      <div key={si} className="flex items-center gap-3">
                        <div className="text-xs text-white/60 w-10">
                          Set {si + 1}
                        </div>
                        <NumberField
                          label="Reps"
                          value={s.reps}
                          onChange={(v) => updateSet(idx, si, "reps", v)}
                          hideZeroAsEmpty
                        />
                        <NumberField
                          label="Weight"
                          value={s.weight}
                          onChange={(v) => updateSet(idx, si, "weight", v)}
                          suffix={unit}
                          step={unit === "kg" ? 0.5 : 1}
                          hideZeroAsEmpty
                        />
                        <button
                          type="button"
                          onClick={() => removeSetRow(idx, si)}
                          className="px-2 py-1 rounded-md text-xs text-white/70 hover:bg-white/10"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-white/60 min-h-[1rem]">{message}</div>
          <button
            disabled={!canSave || saving}
            onClick={saveWorkout}
            className="px-4 py-2 rounded-full text-sm font-semibold text-black disabled:opacity-50 bg-cyan-400 hover:bg-cyan-300"
          >
            {saving ? "Saving…" : "Save workout"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
  hideZeroAsEmpty,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  hideZeroAsEmpty?: boolean;
  step?: number;
}) {
  return (
    <label className="text-xs text-white/60 flex flex-col items-start">
      <span className="mb-1">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          step={step ?? 1}
          value={
            hideZeroAsEmpty && (!value || value === 0)
              ? ""
              : Number.isFinite(value)
              ? value
              : ""
          }
          onChange={(e) =>
            onChange(e.target.value === "" ? 0 : parseFloat(e.target.value))
          }
          placeholder={hideZeroAsEmpty ? "" : undefined}
          className="w-20 rounded-md bg-white/5 ring-1 ring-white/10 px-2 py-1 text-sm text-white"
        />
        {suffix ? (
          <span className="text-xs text-white/50">{suffix}</span>
        ) : null}
      </div>
    </label>
  );
}
