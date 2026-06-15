import type { Studio, StudiosFile, District, Health } from "./types";

/** Fetch the composed studios file. Static, so a plain fetch is all we need. */
export async function loadStudios(): Promise<StudiosFile> {
  const res = await fetch(`${import.meta.env.BASE_URL}studios.json`, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Failed to load studios.json (${res.status})`);
  const data = (await res.json()) as StudiosFile;
  data.studios = [...data.studios].sort((a, b) => a.tier - b.tier || a.slot - b.slot);
  return data;
}

/** Group studios into tiers (cake layers), ordered top→bottom. */
export function byTier(studios: Studio[]): { tier: number; district: District; studios: Studio[] }[] {
  const map = new Map<number, Studio[]>();
  for (const s of studios) {
    if (!map.has(s.tier)) map.set(s.tier, []);
    map.get(s.tier)!.push(s);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([tier, list]) => ({
      tier,
      district: list[0].district,
      studios: [...list].sort((a, b) => a.slot - b.slot),
    }));
}

export const HEALTH_LABEL: Record<Health, string> = {
  ok: "Online",
  working: "Working",
  attention: "Needs attention",
  stale: "Stale",
  down: "Down",
  "coming-soon": "Coming soon",
};
