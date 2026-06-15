import type { Studio } from "../types";
import { byTier } from "../data";
import { Tier } from "./Tier";

// The cake: tiers stacked vertically, HQ (lowest tier number) on top.
export function Tower({
  studios,
  selectedId,
  onSelect,
}: {
  studios: Studio[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const tiers = byTier(studios);
  return (
    <div className="tower">
      {tiers.map((t) => (
        <Tier
          key={t.tier}
          district={t.district}
          studios={t.studios}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
      <div className="tower-base" aria-hidden />
    </div>
  );
}
