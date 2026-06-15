// The one health rule for every studio (and the HQ aggregation).
import type { Health, Signals, Studio, Todo } from "./types";

/**
 * failed run/deploy → down; open blockers → attention;
 * stale (freshness past cadence) → stale; run in flight → working; else ok.
 * coming-soon studios short-circuit upstream (never reach here).
 */
export function computeHealth(signals: Signals, todos: Todo[]): Health {
  if (signals.lastRun.status === "failure" || signals.deploy.status === "failure") {
    return "down";
  }
  const hasBlocker = todos.some(
    (t) => t.priority === 1 && t.state !== "done" && t.state !== "canceled",
  );
  if (hasBlocker) return "attention";

  if (signals.freshnessDays !== null && signals.freshnessDays > signals.expectedCadenceDays) {
    return "stale";
  }
  if (signals.lastRun.status === "in_progress" || signals.deploy.status === "in_progress") {
    return "working";
  }
  return "ok";
}

// Worst-wins precedence for the HQ rollup.
const RANK: Record<Health, number> = {
  down: 5,
  attention: 4,
  stale: 3,
  working: 2,
  ok: 1,
  "coming-soon": 0,
};

/** HQ aggregates the health of every other (non-coming-soon, non-HQ) studio. */
export function aggregateHealth(studios: Studio[]): Health {
  const others = studios.filter((s) => s.id !== "hq" && s.health !== "coming-soon");
  if (others.length === 0) return "ok";
  return others.reduce<Health>(
    (worst, s) => (RANK[s.health] > RANK[worst] ? s.health : worst),
    "ok",
  );
}
