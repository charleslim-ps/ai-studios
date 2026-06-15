import type { Studio, District } from "../types";
import { StudioRoom } from "./StudioRoom";

const DISTRICT_LABEL: Record<District, string> = {
  HQ: "HQ",
  AEO: "AEO",
  Enablement: "Enablement",
  Research: "Research",
  Attribution: "Attribution",
};

// One cake layer: a labelled slab carrying its studio room-slices side by side.
export function Tier({
  district,
  studios,
  selectedId,
  onSelect,
}: {
  district: District;
  studios: Studio[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <section className={`tier tier--${district.toLowerCase()}`}>
      <div className="tier-label">{DISTRICT_LABEL[district]}</div>
      <div className="tier-rooms">
        {studios.map((s) => (
          <StudioRoom key={s.id} studio={s} selected={s.id === selectedId} onSelect={onSelect} />
        ))}
      </div>
    </section>
  );
}
