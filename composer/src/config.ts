// Non-secret config + manifest loading. Secrets come from process.env (see README).
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { Manifest } from "./types";

const here = dirname(fileURLToPath(import.meta.url));

export interface RootConfig {
  /** Human-readable cadence, e.g. "daily". The GH Action cron is kept in sync with this. */
  cadence: string;
  /** GitHub org/owner the studio repos live under. */
  githubOrg: string;
  /** Linear team key (for reference / links). */
  linearTeamKey: string;
  /** Fallback staleness threshold when a manifest doesn't specify one. */
  defaultExpectedCadenceDays: number;
}

const root: RootConfig = JSON.parse(
  readFileSync(resolve(here, "../../config.json"), "utf8"),
);

export const config = {
  ...root,
  manifestsDir: resolve(here, "../../manifests"),
  /** Where the composed file is written (the app serves it from /public). */
  outputPath: resolve(here, "../../app/public/studios.json"),
};

/** Load every human-authored manifest, sorted by tier then slot. */
export function loadManifests(): Manifest[] {
  const files = readdirSync(config.manifestsDir).filter((f) => f.endsWith(".json"));
  const manifests = files.map(
    (f) => JSON.parse(readFileSync(resolve(config.manifestsDir, f), "utf8")) as Manifest,
  );
  return manifests.sort((a, b) => a.tier - b.tier || a.slot - b.slot);
}

/** Optional secret — returns undefined (with a log) rather than throwing, so a
 *  missing key degrades that source to empty instead of failing the whole run. */
export function optionalEnv(name: string): string | undefined {
  const v = process.env[name];
  if (!v) console.warn(`[config] ${name} not set — its source will be skipped`);
  return v || undefined;
}
