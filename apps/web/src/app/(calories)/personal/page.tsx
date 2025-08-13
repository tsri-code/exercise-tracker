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
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-xl font-semibold">Calorie Counter • Personal Info</h1>
        <a href="/calories/daily" className="text-xs px-3 py-1 rounded-full bg-white/10 text-white/80 hover:bg-white/15">Daily Info</a>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          <div className="flex gap-2">
            <input type="number" className="w-full rounded bg-white/5 ring-1 ring-white/10 px-2 py-1" placeholder="Weight" value={profile.weightValue}
              onChange={(e)=> setProfile(p=>({...p, weightValue: parseFloat(e.target.value||"0")}))} />
            <select className="rounded bg-white/5 ring-1 ring-white/10 px-2 py-1" value={profile.weightUnit}
              onChange={(e)=> setProfile(p=>({...p, weightUnit: e.target.value as any}))}>
              <option value="kg">kg</option>
              <option value="lbs">lbs</option>
            </select>
          </div>

          <div className="flex gap-2">
            <input type="number" className="w-full rounded bg-white/5 ring-1 ring-white/10 px-2 py-1" placeholder="Height" value={profile.heightValue}
              onChange={(e)=> setProfile(p=>({...p, heightValue: parseFloat(e.target.value||"0")}))} />
            <select className="rounded bg-white/5 ring-1 ring-white/10 px-2 py-1" value={profile.heightUnit}
              onChange={(e)=> setProfile(p=>({...p, heightUnit: e.target.value as any}))}>
              <option value="cm">cm</option>
              <option value="in">in</option>
            </select>
          </div>

          <input type="number" min={10} max={120} className="rounded bg-white/5 ring-1 ring-white/10 px-2 py-1" placeholder="Age" value={profile.age}
            onChange={(e)=> setProfile(p=>({...p, age: parseInt(e.target.value||"0",10)}))} />

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
              onChange={(e)=> setProfile(p=>({...p, rateLbsPerWeek: parseFloat(e.target.value||"0")}))} />
            <span className="text-xs text-white/60 self-center">max ±2</span>
          </div>

          <input type="number" step={0.1} min={0} max={75} className="rounded bg-white/5 ring-1 ring-white/10 px-2 py-1" placeholder="Body fat % (optional)"
            value={profile.bodyFatPercent ?? ""}
            onChange={(e)=> setProfile(p=>({...p, bodyFatPercent: e.target.value? parseFloat(e.target.value): undefined}))} />

          <input type="text" className="rounded bg-white/5 ring-1 ring-white/10 px-2 py-1" placeholder="Dietary preference (e.g., keto, vegan)" value={profile.dietaryPreference || ""}
            onChange={(e)=> setProfile(p=>({...p, dietaryPreference: e.target.value||undefined}))} />

          <input type="text" className="rounded bg-white/5 ring-1 ring-white/10 px-2 py-1" placeholder="Allergies (comma separated)" value={profile.allergies || ""}
            onChange={(e)=> setProfile(p=>({...p, allergies: e.target.value||undefined}))} />

          <input type="number" min={1} max={10} className="rounded bg-white/5 ring-1 ring-white/10 px-2 py-1" placeholder="Meals per day" value={profile.mealsPerDay ?? ""}
            onChange={(e)=> setProfile(p=>({...p, mealsPerDay: e.target.value? parseInt(e.target.value,10): undefined}))} />

          <input type="number" step={0.1} min={0} max={3} className="rounded bg-white/5 ring-1 ring-white/10 px-2 py-1" placeholder="Protein g per kg (optional)" value={profile.proteinPerKg ?? ""}
            onChange={(e)=> setProfile(p=>({...p, proteinPerKg: e.target.value? parseFloat(e.target.value): undefined}))} />
        </div>

        <div className="mt-3">
          <button onClick={save} disabled={saving} className="px-3 py-1 rounded-full text-xs font-semibold text-black bg-cyan-400 hover:bg-cyan-300">
            {saving? "Saving…" : "Save profile"}
          </button>
        </div>
      </div>

      <div className="text-xs text-white/60">
        Healthy goal limits enforced: up to ±2 lbs/week. You can also set a custom rate within that range.
      </div>
    </div>
  );
}


