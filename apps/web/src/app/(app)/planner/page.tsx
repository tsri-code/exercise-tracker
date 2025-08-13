"use client";
import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../../lib/api";

type Routine = { id: string; title: string };
type Schedule = {
  id: string;
  routineId: string;
  startDate: string;
  time: string;
  repeat: string;
  interval: number;
  daysOfWeek?: number[];
  routine?: Routine;
};

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Page() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [events, setEvents] = useState<Schedule[]>([]);
  const [month, setMonth] = useState(() => new Date());
  const [draft, setDraft] = useState<{
    date?: string;
    routineId?: string;
    time?: string;
    repeat?: string;
    interval?: number;
    daysOfWeek?: number[];
  }>({ repeat: "none", interval: 1, time: "07:00", daysOfWeek: [] });
  const [edit, setEdit] = useState<{
    id: string;
    date: string;
    time: string;
    repeat: string;
    interval: number;
    daysOfWeek: number[];
    routineId: string;
  } | null>(null);

  useEffect(() => {
    (async () => {
      const rs = await fetch(`${API_BASE_URL}/api/routines`).then((r) =>
        r.json()
      );
      setRoutines(rs.data || []);
      const sc = await fetch(`${API_BASE_URL}/api/schedules`).then((r) =>
        r.json()
      );
      setEvents(sc.data || []);
    })();
  }, []);

  const grid = useMemo(() => buildMonthGrid(month), [month]);

  async function createSchedule() {
    if (!draft.date || !draft.routineId) return;
    await fetch(`${API_BASE_URL}/api/schedules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        routineId: draft.routineId,
        startDate: new Date(
          `${draft.date}T${draft.time || "07:00"}:00`
        ).toISOString(),
        time: draft.time || "07:00",
        repeat: draft.repeat || "none",
        interval: draft.interval || 1,
        daysOfWeek: draft.daysOfWeek,
      }),
    });
    const sc = await fetch(`${API_BASE_URL}/api/schedules`).then((r) =>
      r.json()
    );
    setEvents(sc.data || []);
    setDraft({ repeat: "none", interval: 1, time: "07:00" });
  }

  async function saveEdit() {
    if (!edit) return;
    await fetch(`${API_BASE_URL}/api/schedules/${edit.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        routineId: edit.routineId,
        startDate: new Date(`${edit.date}T${edit.time}:00`).toISOString(),
        time: edit.time,
        repeat: edit.repeat,
        interval: edit.interval,
        daysOfWeek: edit.daysOfWeek,
      }),
    });
    const sc = await fetch(`${API_BASE_URL}/api/schedules`).then((r) =>
      r.json()
    );
    setEvents(sc.data || []);
    setEdit(null);
  }

  async function deleteEdit() {
    if (!edit) return;
    await fetch(`${API_BASE_URL}/api/schedules/${edit.id}`, {
      method: "DELETE",
    });
    const sc = await fetch(`${API_BASE_URL}/api/schedules`).then((r) =>
      r.json()
    );
    setEvents(sc.data || []);
    setEdit(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">Planner</h1>
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setMonth(addMonths(month, -1))}
            className="px-2 py-1 rounded bg-white/10"
          >
            Prev
          </button>
          <div>
            {month.toLocaleString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </div>
          <button
            onClick={() => setMonth(addMonths(month, 1))}
            className="px-2 py-1 rounded bg-white/10"
          >
            Next
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
        {days.map((d) => (
          <div key={d} className="text-xs text-white/60 px-2">
            {d}
          </div>
        ))}
        {grid.map((d) => (
          <div
            key={d.iso}
            className={`rounded-md ring-1 ring-white/10 min-h-[110px] p-2 ${
              d.inMonth ? "bg-white/5" : "bg-white/[0.03]"
            }`}
          >
            <div className="text-xs text-white/60 flex items-center justify-between">
              <span>{d.date.getDate()}</span>
              {d.inMonth && (
                <button
                  className="text-[11px] px-1 py-0.5 rounded bg-cyan-400 text-black font-semibold"
                  onClick={() => setDraft((x) => ({ ...x, date: d.iso }))}
                >
                  Add
                </button>
              )}
            </div>
            <div className="mt-1 space-y-1">
              {events
                .filter((e) => occursOnDate(e, d.date))
                .map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() =>
                      setEdit({
                        id: e.id,
                        date: e.startDate.slice(0, 10),
                        time: e.time,
                        repeat: e.repeat,
                        interval: e.interval,
                        daysOfWeek: e.daysOfWeek || [],
                        routineId: e.routineId,
                      })
                    }
                    className="w-full text-left text-[11px] truncate px-1 py-0.5 rounded bg-white/10 hover:bg-white/15"
                  >
                    {e.routine?.title || e.routineId} • {e.time}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card p-4">
        <div className="text-sm text-white/80 mb-2">Schedule routine</div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-sm">
          <input
            type="date"
            value={draft.date || ""}
            onChange={(e) => setDraft((x) => ({ ...x, date: e.target.value }))}
            className="rounded bg-white/5 ring-1 ring-white/10 px-2 py-1"
          />
          <select
            value={draft.routineId || ""}
            onChange={(e) =>
              setDraft((x) => ({ ...x, routineId: e.target.value }))
            }
            className="rounded bg-white/5 ring-1 ring-white/10 px-2 py-1"
          >
            <option value="">Select routine…</option>
            {routines.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
          <input
            type="time"
            value={draft.time || "07:00"}
            onChange={(e) => setDraft((x) => ({ ...x, time: e.target.value }))}
            className="rounded bg-white/5 ring-1 ring-white/10 px-2 py-1"
          />
          <select
            value={draft.repeat || "none"}
            onChange={(e) =>
              setDraft((x) => ({ ...x, repeat: e.target.value }))
            }
            className="rounded bg-white/5 ring-1 ring-white/10 px-2 py-1"
          >
            <option value="none">Does not repeat</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <input
            type="number"
            min={1}
            value={draft.interval || 1}
            onChange={(e) =>
              setDraft((x) => ({
                ...x,
                interval: parseInt(e.target.value || "1", 10),
              }))
            }
            className="rounded bg-white/5 ring-1 ring-white/10 px-2 py-1"
          />
        </div>
        {draft.repeat === "weekly" && (
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {days.map((d, i) => (
              <label
                key={d}
                className={`px-2 py-1 rounded cursor-pointer ring-1 ring-white/10 ${
                  draft.daysOfWeek?.includes(i)
                    ? "bg-cyan-400 text-black"
                    : "bg-white/5 text-white"
                }`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={draft.daysOfWeek?.includes(i) || false}
                  onChange={() =>
                    setDraft((x) => ({
                      ...x,
                      daysOfWeek: toggleIndex(x.daysOfWeek || [], i),
                    }))
                  }
                />
                {d}
              </label>
            ))}
          </div>
        )}
        <div className="mt-2">
          <button
            onClick={createSchedule}
            className="px-3 py-1 rounded-full text-xs font-semibold text-black bg-cyan-400 hover:bg-cyan-300"
          >
            Add to calendar
          </button>
        </div>
      </div>

      {edit && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-white/80">Edit reminder</div>
            <button
              type="button"
              onClick={() => setEdit(null)}
              className="text-xs text-white/60 hover:underline"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-sm">
            <input
              type="date"
              value={edit.date}
              onChange={(e) =>
                setEdit((x) => x && { ...x, date: e.target.value })
              }
              className="rounded bg-white/5 ring-1 ring-white/10 px-2 py-1"
            />
            <select
              value={edit.routineId}
              onChange={(e) =>
                setEdit((x) => x && { ...x, routineId: e.target.value })
              }
              className="rounded bg-white/5 ring-1 ring-white/10 px-2 py-1"
            >
              {routines.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
            <input
              type="time"
              value={edit.time}
              onChange={(e) =>
                setEdit((x) => x && { ...x, time: e.target.value })
              }
              className="rounded bg-white/5 ring-1 ring-white/10 px-2 py-1"
            />
            <select
              value={edit.repeat}
              onChange={(e) =>
                setEdit((x) => x && { ...x, repeat: e.target.value })
              }
              className="rounded bg-white/5 ring-1 ring-white/10 px-2 py-1"
            >
              <option value="none">Does not repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <input
              type="number"
              min={1}
              value={edit.interval}
              onChange={(e) =>
                setEdit(
                  (x) =>
                    x && { ...x, interval: parseInt(e.target.value || "1", 10) }
                )
              }
              className="rounded bg-white/5 ring-1 ring-white/10 px-2 py-1"
            />
          </div>
          {edit.repeat === "weekly" && (
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {days.map((d, i) => (
                <label
                  key={d}
                  className={`px-2 py-1 rounded cursor-pointer ring-1 ring-white/10 ${
                    edit.daysOfWeek.includes(i)
                      ? "bg-cyan-400 text-black"
                      : "bg-white/5 text-white"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={edit.daysOfWeek.includes(i)}
                    onChange={() =>
                      setEdit(
                        (x) =>
                          x && {
                            ...x,
                            daysOfWeek: toggleIndex(x.daysOfWeek, i),
                          }
                      )
                    }
                  />
                  {d}
                </label>
              ))}
            </div>
          )}
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={saveEdit}
              className="px-3 py-1 rounded-full text-xs font-semibold text-black bg-cyan-400 hover:bg-cyan-300"
            >
              Save
            </button>
            <button
              type="button"
              onClick={deleteEdit}
              className="px-3 py-1 rounded-full text-xs font-semibold text-white bg-white/10 hover:bg-white/15"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function buildMonthGrid(anchor: Date) {
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const startOfGrid = new Date(start);
  startOfGrid.setDate(start.getDate() - start.getDay());
  const endOfGrid = new Date(end);
  endOfGrid.setDate(end.getDate() + (6 - end.getDay()));
  const days: { date: Date; iso: string; inMonth: boolean }[] = [];
  for (
    let d = new Date(startOfGrid);
    d <= endOfGrid;
    d.setDate(d.getDate() + 1)
  ) {
    const copy = new Date(d);
    days.push({
      date: copy,
      iso: copy.toISOString().slice(0, 10),
      inMonth: copy.getMonth() === anchor.getMonth(),
    });
  }
  return days;
}

function addMonths(date: Date, n: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function toggleIndex(arr: number[], idx: number) {
  const next = new Set(arr);
  if (next.has(idx)) next.delete(idx);
  else next.add(idx);
  return Array.from(next).sort();
}

function occursOnDate(e: Schedule, onDate: Date) {
  const start = new Date(e.startDate);
  const date = new Date(onDate);
  start.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diffDays = Math.floor(
    (date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays < 0) return false;
  const interval = e.interval || 1;
  switch (e.repeat) {
    case "none":
      return (
        date.toISOString().slice(0, 10) === start.toISOString().slice(0, 10)
      );
    case "daily":
      return diffDays % interval === 0;
    case "weekly": {
      const dow = date.getDay();
      const allowed =
        e.daysOfWeek && e.daysOfWeek.length > 0
          ? e.daysOfWeek
          : [start.getDay()];
      if (!allowed.includes(dow)) return false;
      const weeks = Math.floor(diffDays / 7);
      return weeks % interval === 0;
    }
    case "monthly": {
      const months =
        (date.getFullYear() - start.getFullYear()) * 12 +
        (date.getMonth() - start.getMonth());
      if (months < 0) return false;
      if (date.getDate() !== start.getDate()) return false;
      return months % interval === 0;
    }
    default:
      return false;
  }
}

async function saveEdit(this: any) {
  /* placeholder to satisfy TS */
}
async function deleteEdit(this: any) {
  /* placeholder to satisfy TS */
}
