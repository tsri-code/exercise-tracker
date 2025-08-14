import { API_BASE_URL } from "../../../lib/api";

async function getRoutines() {
  const res = await fetch(`${API_BASE_URL}/api/routines`, {
    cache: "no-store",
  });
  if (!res.ok) return [] as any[];
  const json = await res.json();
  return json.data as any[];
}

export default async function Page() {
  const routines = await getRoutines();
  return (
    <div className="space-y-4">
      <h1 className="text-3xl md:text-4xl font-extrabold headline">Routines</h1>
      {routines.length === 0 ? (
        <div className="text-sm text-white/60">No routines yet.</div>
      ) : (
        <div className="space-y-4">
          {routines.map((r) => (
            <div key={r.id} className="card p-5 md:p-6 glow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold text-white">
                    {r.title}
                  </div>
                  <div className="text-xs text-white/50">
                    {new Date(r.createdAt).toLocaleString()} • {r.unit}
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {r.items?.map((it: any) => (
                  <div key={it.id} className="rounded-md bg-white/5 ring-1 ring-white/10 p-3">
                    <div className="text-sm text-white">{it.name}</div>
                    <div className="text-[11px] text-white/50 mt-1">
                      {(it.sets || [])
                        .map(
                          (s: any, i: number) =>
                            `S${i + 1}:${s.reps}x${s.weight}`
                        )
                        .join("  ")}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-right">
                <a
                  href={`/routines/${r.id}`}
                  className="text-xs text-black bg-cyan-400 hover:bg-cyan-300 px-4 py-1.5 rounded-full font-semibold"
                >
                  Edit
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
