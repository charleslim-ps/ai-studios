import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { config, loadManifests, optionalEnv } from "./config";
import { fetchLinear } from "./sources/linear";
import { fetchGitHub } from "./sources/github";
import { computeHealth, aggregateHealth } from "./health";
import type { Manifest, Signals, Status, Studio, StudiosFile } from "./types";

const LINEAR_API_KEY = optionalEnv("LINEAR_API_KEY");
const GH_TOKEN = optionalEnv("GH_TOKEN");

/** Any single source failing degrades its fields to the fallback — never the whole run. */
async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    console.warn(`[compose] ${label} failed, using fallback: ${(e as Error).message}`);
    return fallback;
  }
}

const EMPTY_SIGNALS = (expectedCadenceDays: number): Signals => ({
  lastRun: { status: "unknown", at: null },
  deploy: { status: "unknown", at: null },
  freshnessDays: null,
  expectedCadenceDays,
});

async function composeStudio(m: Manifest, now: Date): Promise<Studio> {
  const generatedAt = now.toISOString();
  const expectedCadenceDays = config.defaultExpectedCadenceDays;

  // Coming-soon studios are manifest-only: no live pulls.
  if (m.stage === "coming-soon") {
    const status: Status = {
      health: "coming-soon",
      signals: EMPTY_SIGNALS(expectedCadenceDays),
      roadmap: [],
      todos: [],
      activity: [],
      generatedAt,
    };
    return { ...m, ...status };
  }

  const linear =
    m.sources?.linearProjectId && LINEAR_API_KEY
      ? await safe("linear", () => fetchLinear(m.sources!.linearProjectId!, LINEAR_API_KEY), { roadmap: [], todos: [] })
      : { roadmap: [], todos: [] };

  const github = m.sources?.repo
    ? await safe("github", () => fetchGitHub(m.sources!.repo!, now, GH_TOKEN), {
        activity: [],
        lastRun: { status: "unknown" as const, at: null },
        deploy: { status: "unknown" as const, at: null },
        freshnessDays: null,
      })
    : { activity: [], lastRun: { status: "unknown" as const, at: null }, deploy: { status: "unknown" as const, at: null }, freshnessDays: null };

  const signals: Signals = {
    lastRun: github.lastRun,
    deploy: github.deploy,
    freshnessDays: github.freshnessDays,
    expectedCadenceDays,
  };

  const status: Status = {
    health: computeHealth(signals, linear.todos),
    signals,
    roadmap: linear.roadmap,
    todos: linear.todos,
    activity: github.activity,
    generatedAt,
  };
  return { ...m, ...status };
}

async function main() {
  const now = new Date();
  const manifests = loadManifests();
  console.log(`[compose] ${manifests.length} studios · cadence ${config.cadence}`);

  const studios = await Promise.all(manifests.map((m) => composeStudio(m, now)));

  // HQ rolls up everyone else.
  const hq = studios.find((s) => s.id === "hq");
  if (hq) hq.health = aggregateHealth(studios);

  const out: StudiosFile = { generatedAt: now.toISOString(), studios };
  mkdirSync(dirname(config.outputPath), { recursive: true });
  writeFileSync(config.outputPath, JSON.stringify(out, null, 2) + "\n");
  console.log(`[compose] wrote ${studios.length} studios → ${config.outputPath}`);
  for (const s of studios) console.log(`   ${s.health.padEnd(11)} ${s.id}`);
}

main().catch((e) => {
  console.error("[compose] failed:", e);
  process.exit(1);
});
