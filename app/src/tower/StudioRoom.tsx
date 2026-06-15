import type { Studio } from "../types";
import { HEALTH_LABEL } from "../data";

// Isometric open-front room ("cake slice"). Walls are tinted per district via CSS
// classes (see styles.css). When a real 1200² PNG exists it can be dropped onto the
// front face via <image>; until then this drawn placeholder renders everywhere.
//
// viewBox 0 0 240 210 — a cube seen front-top-left:
//   front face 24,56 → 184,176   (the open room)
//   depth d=34 → top + right faces give the slice its thickness.

const FACE = "24,56 184,56 184,176 24,176";
const TOP = "24,56 184,56 218,22 58,22";
const SIDE = "184,56 218,22 218,142 184,176";

// Studio ids whose real 1200² PNG has been added to public/assets/studios/.
// Until an id is listed here, the drawn placeholder room renders (avoids the
// browser's broken-image graphic for art that doesn't exist yet).
const ART_READY = new Set<string>([]);

export function StudioRoom({
  studio,
  selected,
  onSelect,
}: {
  studio: Studio;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const district = studio.district.toLowerCase();
  const working = studio.health === "working";
  const soon = studio.health === "coming-soon";
  const hasArt = !!studio.studioAsset && !soon && ART_READY.has(studio.id);
  const assetUrl = hasArt ? `assets/studios/${studio.studioAsset}` : null;

  return (
    <button
      className={`room-wrap ${selected ? "is-selected" : ""}`}
      onClick={() => onSelect(studio.id)}
      aria-pressed={selected}
      title={`${studio.name} — ${HEALTH_LABEL[studio.health]}`}
    >
      <svg
        className={`room room--${district} health--${studio.health}`}
        viewBox="0 0 240 210"
        role="img"
        aria-label={studio.name}
      >
        {/* slice body */}
        <polygon className="top" points={TOP} />
        <polygon className="side" points={SIDE} />
        <polygon className="face" points={FACE} />

        {/* real art swaps onto the front face when present */}
        {assetUrl && (
          <image href={assetUrl} x="24" y="56" width="160" height="120" preserveAspectRatio="xMidYMid slice" />
        )}

        {!hasArt && (
          <>
            {/* interior: floor strip + a desk/screen prop */}
            <polygon className="floor" points="24,158 184,158 184,176 24,176" />
            <rect className="prop" x="60" y="118" width="64" height="34" rx="3" />
            <rect className="prop-screen" x="120" y="92" width="44" height="34" rx="3" />
          </>
        )}

        {/* an agent is "in the room" while it's working */}
        {working && (
          <g className="agent">
            <circle cx="104" cy="120" r="11" />
            <rect x="92" y="131" width="24" height="22" rx="8" />
          </g>
        )}

        {/* under-construction overlay for coming-soon */}
        {soon && (
          <>
            <polygon className="hatch" points={FACE} />
            <g className="cone">
              <polygon points="96,150 112,150 108,124 100,124" />
              <rect x="94" y="150" width="20" height="5" rx="1" />
            </g>
          </>
        )}

        {/* status indicator */}
        <circle className="status-dot" cx="206" cy="34" r="9" />
      </svg>

      <div className="room-label">
        <span className="room-name">{studio.name}</span>
        <span className={`room-status health--${studio.health}`}>{HEALTH_LABEL[studio.health]}</span>
      </div>
    </button>
  );
}
