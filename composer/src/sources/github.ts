// GitHub REST — the observed layer. commits/pushes + Actions runs → activity & signals.
import type { Activity, RunSignal } from "../types";

const API = "https://api.github.com";

function headers(token?: string): Record<string, string> {
  const h: Record<string, string> = {
    accept: "application/vnd.github+json",
    "user-agent": "ai-studios-composer",
    "x-github-api-version": "2022-11-28",
  };
  if (token) h.authorization = `Bearer ${token}`;
  return h;
}

interface GhCommit {
  sha: string;
  html_url: string;
  commit: { message: string; author: { date: string } };
}

interface GhRun {
  name: string;
  status: string; // queued | in_progress | completed
  conclusion: string | null; // success | failure | ...
  html_url: string;
  updated_at: string;
}

function runSignal(run: GhRun | undefined): RunSignal {
  if (!run) return { status: "unknown", at: null };
  if (run.status !== "completed") return { status: "in_progress", at: run.updated_at };
  if (run.conclusion === "success") return { status: "success", at: run.updated_at };
  if (run.conclusion === "failure") return { status: "failure", at: run.updated_at };
  return { status: "unknown", at: run.updated_at };
}

export interface GitHubData {
  activity: Activity[];
  lastRun: RunSignal;
  deploy: RunSignal;
  freshnessDays: number | null;
}

export async function fetchGitHub(repo: string, now: Date, token?: string): Promise<GitHubData> {
  async function get<T>(path: string): Promise<T> {
    const res = await fetch(`${API}/repos/${repo}${path}`, { headers: headers(token) });
    if (!res.ok) throw new Error(`GitHub ${res.status} for ${repo}${path}`);
    return (await res.json()) as T;
  }

  const [commits, runs, deployments] = await Promise.all([
    get<GhCommit[]>("/commits?per_page=8").catch(() => [] as GhCommit[]),
    get<{ workflow_runs: GhRun[] }>("/actions/runs?per_page=5").catch(() => ({ workflow_runs: [] as GhRun[] })),
    get<{ created_at: string }[]>("/deployments?per_page=1").catch(() => [] as { created_at: string }[]),
  ]);

  const activity: Activity[] = commits.map((c) => ({
    at: c.commit.author.date,
    type: "commit",
    summary: c.commit.message.split("\n")[0],
    link: c.html_url,
  }));

  for (const r of runs.workflow_runs.slice(0, 3)) {
    activity.push({ at: r.updated_at, type: "run", summary: `${r.name}: ${r.conclusion ?? r.status}`, link: r.html_url });
  }
  activity.sort((a, b) => (a.at < b.at ? 1 : -1));

  const lastRun = runSignal(runs.workflow_runs[0]);
  const deploy: RunSignal = deployments[0]
    ? { status: "success", at: deployments[0].created_at }
    : { status: "unknown", at: null };

  const latestCommit = commits[0]?.commit.author.date;
  const freshnessDays = latestCommit
    ? Math.floor((now.getTime() - new Date(latestCommit).getTime()) / 86_400_000)
    : null;

  return { activity: activity.slice(0, 10), lastRun, deploy, freshnessDays };
}
