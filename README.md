# Charles AI Studios — the Cake

An internal launchpad shaped like a **cake tower**: a vertical stack of tiers where each slice is
an isometric **room** — and each room is a **Studio** (a project) you click to launch or inspect.
The launchpad itself is a studio — **HQ**, the cake topper — whose panel rolls up the health of
every other studio.

> Work-account project (`charleslim-ps`). Pushes only to `charleslim-ps/*` (a `pre-push` guard hook
> enforces it). See the workspace [CLAUDE.md](../../CLAUDE.md).

## How it works — two layers, merged by `id`

| Layer | File | Author | Changes |
|---|---|---|---|
| **Manifest** | `manifests/<id>.json` | human | slow — name, purpose, stage, district, tier/slot, links, sources |
| **Status** | (generated) | composer | every run — health, signals, roadmap, todos, activity |

The **composer** (`composer/`) pulls **Linear** (project status → roadmap, issues → todos) and
**GitHub** (commits + Actions runs → activity & signals), applies one health rule, and writes the
merged result to `app/public/studios.json`. The **app** (`app/`, Vite + React) fetches that one
static file and renders the tower.

```
manifests/*.json ─┐
                  ├─► composer ──► app/public/studios.json ──► app (the cake)
Linear + GitHub ──┘     (daily GH Action)
```

## Health rule (one for every studio)
failed run/deploy → `down` · open blockers → `attention` · past expected cadence → `stale` ·
run in flight → `working` · else `ok`. HQ aggregates the rest (worst-wins). `coming-soon`
studios skip all pulls.

## Adding a studio
Drop a file in `manifests/`. A full studio needs `sources.repo` (and a `linearProjectId` for
todos/roadmap). A **COMING SOON** studio needs only a name + description:

```json
{ "id": "ad-studio", "name": "Ad Studio",
  "purpose": "COMING SOON — replicate our top HubSpot ads with new styling in Figma.",
  "stage": "coming-soon", "district": "Attribution", "tier": 4, "slot": 1 }
```

Run `node schema/validate.mjs` to check it.

## Develop
```bash
# validate manifests
cd schema && npm i && npm run validate

# compose (needs secrets; degrades gracefully without them)
cd composer && npm i && LINEAR_API_KEY=… GH_TOKEN=… npm run compose

# run the app
cd app && npm i && npm run dev
```

## Secrets (GitHub Actions)
- `LINEAR_API_KEY` — Linear Personal API key (read). Never committed.
- `GH_TOKEN` — token with read access to the studio repos.

## Assets
Studio art is 1200² isometric room PNGs in `app/public/assets/studios/`. Until a studio's PNG
exists, a drawn placeholder room renders. Add the id to `ART_READY` in
`app/src/tower/StudioRoom.tsx` once its PNG is in place.

## Hosting
This launchpad ships on **GitHub Pages** (`deploy.yml`) at
**https://charleslim-ps.github.io/ai-studios/**, redeploying on every push to `main` and 15 min
after the daily `studios.json` refresh.

⚠️ **GitHub Pages is public** — `studios.json` (Linear todos, priorities, health) is world-readable
to anyone with the URL. That's an accepted tradeoff for *this* meta-launchpad. **Studios whose own
data is sensitive should NOT use GitHub Pages** — host them privately instead:
**Cloudflare Pages** (private repo) behind **Cloudflare Access** with **Google** as IdP and a policy
allowing *Emails ending in* `@partnerstack.com`.
