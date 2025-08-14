"use client";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../../lib/api";

type Profile = {
  id?: string;
  weightValue: number;
  weightUnit: "kg" | "lbs";
  heightValue: number;
  heightUnit: "cm" | "in";
  age: number;
  gender: "male" | "female" | "other";
  goal: "recomp" | "lose" | "gain";
  rateLbsPerWeek: number;
  activityLevel: "sedentary" | "light" | "moderate" | "active" | "very";
  bodyFatPercent?: number;
  dietaryPreference?: string;
  allergies?: string;
  mealsPerDay?: number;
  proteinPerKg?: number;
};

const defaults: Profile = {
  weightValue: 75,
  weightUnit: "kg",
  heightValue: 175,
  heightUnit: "cm",
  age: 25,
  gender: "other",
  goal: "recomp",
  rateLbsPerWeek: 0,
  activityLevel: "moderate",
};

export default function PersonalInfoPage() {
  const [profile, setProfile] = useState<Profile>(defaults);
  const [saving, setSaving] = useState(false);
  const [target, setTarget] = useState<number | null>(null);

  const toNumber = (v: string, fallback = 0) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  };

  useEffect(() => {
    (async () => {
      const res = await fetch(`${API_BASE_URL}/api/nutrition/profile`, { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      if (json?.data) setProfile(json.data);
    })();
  }, []);

  async function save() {
    setSaving(true);
    const method = profile.id ? "PUT" : "POST";
    const url = profile.id
      ? `${API_BASE_URL}/api/nutrition/profile/${profile.id}`
      : `${API_BASE_URL}/api/nutrition/profile`;
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    const res = await fetch(`${API_BASE_URL}/api/nutrition/profile`, { cache: "no-store" });
    const json = await res.json();
    if (json?.data) setProfile(json.data);
    setSaving(false);
    computeTarget();
  }

  function computeTarget() {
    const LB_TO_KG = 0.45359237;
    const IN_TO_CM = 2.54;
    const KCAL_PER_LB = 3500.0;
    const PAL: Record<string, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very: 1.9,
      athlete: 1.9,
    } as any;

    const weightKg = profile.weightUnit === "kg" ? profile.weightValue : profile.weightValue * LB_TO_KG;
    const heightCm = profile.heightUnit === "cm" ? profile.heightValue : profile.heightValue * IN_TO_CM;
    const age = profile.age;
    const sexCoeff = profile.gender === "male" ? 5 : -161;

    let BMR: number;
    if (profile.bodyFatPercent !== undefined && profile.bodyFatPercent !== null && !Number.isNaN(profile.bodyFatPercent)) {
      const lbmKg = weightKg * (1 - (profile.bodyFatPercent / 100));
      BMR = 370 + 21.6 * lbmKg;
    } else {
      BMR = 10 * weightKg + 6.25 * heightCm - 5 * age + sexCoeff;
    }
    const pal = PAL[profile.activityLevel] || 1.55;
    const TDEE = BMR * pal;
    const weeklyDeltaLb = profile.goal === "recomp" ? 0 : (profile.goal === "gain" ? Math.abs(profile.rateLbsPerWeek) : -Math.abs(profile.rateLbsPerWeek));
    const dailyAdjust = (weeklyDeltaLb * KCAL_PER_LB) / 7.0;
    let targetKcal = TDEE + dailyAdjust;
    const maxDeficit = 0.25 * TDEE;
    const maxSurplus = 0.15 * TDEE;
    targetKcal = Math.max(TDEE - maxDeficit, Math.min(TDEE + maxSurplus, targetKcal));
    const rounded = Math.round(targetKcal);
    setTarget(rounded);
    return rounded;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-xl font-semibold">Calorie Counter • Personal Info</h1>
        <a href="/calories/daily" className="text-xs px-3 py-1 rounded-full bg:white/10 text-white/80 hover:bg-white/15">Daily Info</a>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          <div className="flex gap-2">
            <input type="number" className="w-full rounded bg-white/5 ring-1 ring-white/10 px-2 py-1" placeholder="Weight" value={profile.weightValue}
              onChange={(e)=> setProfile(p=>({...p, weightValue: toNumber(e.target.value, p.weightValue)}))} />
            <select className="rounded bg-white/5 ring-1 ring-white/10 px-2 py-1" value={profile.weightUnit}
              onChange={(e)=> setProfile(p=>({...p, weightUnit: e.target.value as any}))}>
              <option value="kg">kg</option>
              <option value="lbs">lbs</option>
            </select>
          </div>

          <div className="flex gap-2">
            <input type="number" className="w-full rounded bg-white/5 ring-1 ring-white/10 px-2 py-1" placeholder="Height" value={profile.heightValue}
              onChange={(e)=> setProfile(p=>({...p, heightValue: toNumber(e.target.value, p.heightValue)}))} />
            <select className="rounded bg-white/5 ring-1 ring-white/10 px-2 py-1" value={profile.heightUnit}
              onChange={(e)=> setProfile(p=>({...p, heightUnit: e.target.value as any}))}>
              <option value="cm">cm</option>
              <option value="in">in</option>
            </select>
          </div>

          <input type="number" min={10} max={120} className="rounded bg-white/5 ring-1 ring-white/10 px-2 py-1" placeholder="Age" value={profile.age}
            onChange={(e)=> setProfile(p=>({...p, age: Math.max(10, Math.min(120, Math.round(toNumber(e.target.value, p.age))))}))} />

          <select className="rounded bg-white/5 ring-1 ring-white/10 px-2 py-1" value={profile.gender}
            onChange={(e)=> setProfile(p=>({...p, gender: e.target.value as any}))}>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>

          <select className="rounded bg-white/5 ring-1 ring-white/10 px-2 py-1" value={profile.activityLevel}
            onChange={(e)=> setProfile(p=>({...p, activityLevel: e.target.value as any}))}>
            <option value="sedentary">Sedentary</option>
            <option value="light">Light</option>
            <option value="moderate">Moderate</option>
            <option value="active">Active</option>
            <option value="very">Very Active</option>
            <option value="athlete">Athlete</option>
          </select>

          <select className="rounded bg-white/5 ring-1 ring-white/10 px-2 py-1" value={profile.goal}
            onChange={(e)=> setProfile(p=>({...p, goal: e.target.value as any}))}>
            <option value="recomp">Recomp</option>
            <option value="lose">Lose</option>
            <option value="gain">Gain</option>
          </select>

          <div className="flex gap-2">
            <input type="number" step={0.1} min={-2} max={2} className="w-full rounded bg-white/5 ring-1 ring-white/10 px-2 py-1" placeholder="Rate (lbs/week)"
              value={profile.rateLbsPerWeek}
              onChange={(e)=> setProfile(p=>({...p, rateLbsPerWeek: Math.max(-2, Math.min(2, toNumber(e.target.value, p.rateLbsPerWeek)))}))} />
            <span className="text-xs text-white/60 self-center">max ±2</span>
          </div>

          <input type="number" step={0.1} min={0} max={75} className="rounded bg-white/5 ring-1 ring-white/10 px-2 py-1" placeholder="Body fat % (optional)"
            value={profile.bodyFatPercent ?? ""}
            onChange={(e)=> setProfile(p=>({...p, bodyFatPercent: e.target.value!==""? Math.max(0, Math.min(75, toNumber(e.target.value, p.bodyFatPercent ?? 0))): undefined}))} />

          <input type="text" className="rounded bg-white/5 ring-1 ring-white/10 px-2 py-1" placeholder="Dietary preference (e.g., keto, vegan)" value={profile.dietaryPreference || ""}
            onChange={(e)=> setProfile(p=>({...p, dietaryPreference: e.target.value||undefined}))} />

          <input type="text" className="rounded bg-white/5 ring-1 ring-white/10 px-2 py-1" placeholder="Allergies (comma separated)" value={profile.allergies || ""}
            onChange={(e)=> setProfile(p=>({...p, allergies: e.target.value||undefined}))} />

          <input type="number" min={1} max={10} className="rounded bg:white/5 ring-1 ring-white/10 px-2 py-1" placeholder="Meals per day" value={profile.mealsPerDay ?? ""}
            onChange={(e)=> setProfile(p=>({...p, mealsPerDay: e.target.value!==""? Math.max(1, Math.min(10, Math.round(toNumber(e.target.value, p.mealsPerDay ?? 1)))): undefined}))} />

          <input type="number" step={0.1} min={0} max={3} className="rounded bg-white/5 ring-1 ring-white/10 px-2 py-1" placeholder="Protein g per kg (optional)" value={profile.proteinPerKg ?? ""}
            onChange={(e)=> setProfile(p=>({...p, proteinPerKg: e.target.value!==""? Math.max(0, Math.min(3, toNumber(e.target.value, p.proteinPerKg ?? 0))): undefined}))} />
        </div>

        <div className="mt-3">
          <button onClick={save} disabled={saving} className="px-3 py-1 rounded-full text-xs font-semibold text-black bg-cyan-400 hover:bg-cyan-300 mr-2">
            {saving? "Saving…" : "Save profile"}
          </button>
          <button onClick={computeTarget} className="px-3 py-1 rounded-full text-xs font-semibold text-black bg-white/20 hover:bg-white/30">Calculate target</button>
        </div>
      </div>

      <div className="text-xs text-white/60">Healthy goal limits enforced: up to ±2 lbs/week. You can also set a custom rate within that range.</div>
      {target !== null && (
        <div className="text-sm text-white">Target calories: <span className="font-semibold">{target} kcal/day</span></div>
      )}
    </div>
  );
}


