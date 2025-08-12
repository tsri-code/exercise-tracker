import Image from "next/image";
import GradientBackground from "./components/GradientBackground";

async function getApiStatus() {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
  try {
    const res = await fetch(`${base}/api/config`, { cache: "no-store" });
    if (!res.ok) return { ok: false } as const;
    const json = (await res.json()) as {
      ok: boolean;
      hasExercisesApiKey?: boolean;
    };
    return { ok: true, hasKey: Boolean(json.hasExercisesApiKey) } as const;
  } catch {
    return { ok: false } as const;
  }
}

export default async function Home() {
  const api = await getApiStatus();
  return (
    <div className="relative min-h-[90vh]">
      <GradientBackground />
      <main className="mx-auto max-w-6xl px-6 sm:px-8 pt-24 pb-28 text-center">
        <div className="inline-flex items-center gap-3 mb-6">
          <span className="text-2xl">水</span>
        </div>
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-extrabold tracking-tight text-white drop-shadow-[0_6px_24px_rgba(34,211,238,0.35)]">
          PLAN • TRAIN • TRACK
        </h1>
        <p className="mt-6 text-zinc-300 text-lg max-w-2xl mx-auto">
          Build smarter routines, log sets and reps, and progress week by week. Designed for people who love the grind.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <a href="/planner" className="px-6 py-3 rounded-full text-sm font-semibold text-black bg-cyan-400 hover:bg-cyan-300 transition-colors">Open planner</a>
          <a href="/workouts" className="px-6 py-3 rounded-full text-sm font-semibold text-white/90 ring-1 ring-white/15 hover:bg-white/5 transition-colors">View workouts</a>
        </div>
        <div className="mt-16 flex items-center justify-center gap-6">
          <Image className="rounded-2xl shadow-lg" src="/next.svg" alt="" width={80} height={40} />
          <div className={`px-2 py-1 rounded text-xs font-semibold ${api.ok ? (api.hasKey ? 'bg-green-500/20 text-green-200' : 'bg-yellow-500/20 text-yellow-200') : 'bg-red-500/20 text-red-200'}`}>
            {api.ok ? (api.hasKey ? 'API connected' : 'API connected (no key)') : 'API unreachable'}
          </div>
        </div>
      </main>
    </div>
  );
}
