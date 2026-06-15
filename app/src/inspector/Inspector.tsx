import type { Studio } from "../types";
import { HEALTH_LABEL } from "../data";
import { ActivityList } from "../list/ActivityList";

const PRIORITY_LABEL: Record<number, string> = { 1: "Urgent", 2: "High", 3: "Med", 4: "Low" };

// Circular agent avatar with a status ring (color = health).
function AgentAvatar({ studio }: { studio: Studio }) {
  const initials = studio.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <div className={`avatar health--${studio.health}`} title={HEALTH_LABEL[studio.health]}>
      <span>{initials}</span>
    </div>
  );
}

function LinkRow({ links }: { links: NonNullable<Studio["links"]> }) {
  const entries = (["repo", "project", "dashboard", "figma"] as const).filter((k) => links[k]);
  return (
    <div className="links">
      {links.launch && (
        <a className="btn-launch" href={links.launch} target="_blank" rel="noreferrer">
          ▸ Launch
        </a>
      )}
      {entries.map((k) => (
        <a key={k} className="link-chip" href={links[k]} target="_blank" rel="noreferrer">
          {k}
        </a>
      ))}
    </div>
  );
}

export function Inspector({ studio, all }: { studio: Studio; all: Studio[] }) {
  const isHQ = studio.id === "hq";
  const soon = studio.health === "coming-soon";

  return (
    <div className="inspector">
      <header className="inspector-head">
        <AgentAvatar studio={studio} />
        <div>
          <h2>{studio.name}</h2>
          <div className="meta">
            <span className={`badge stage--${studio.stage}`}>{studio.stage}</span>
            <span className={`badge health--${studio.health}`}>{HEALTH_LABEL[studio.health]}</span>
            <span className="district">{studio.district}</span>
          </div>
        </div>
      </header>

      <p className="purpose">{studio.purpose}</p>

      {studio.links && <LinkRow links={studio.links} />}

      {soon && <p className="soon-note">🚧 Not built yet — just a name and a plan.</p>}

      {/* HQ rolls up everyone else's health */}
      {isHQ && (
        <section className="block">
          <h3>Studio health</h3>
          <ul className="rollup">
            {all
              .filter((s) => s.id !== "hq")
              .map((s) => (
                <li key={s.id}>
                  <span className={`dot health--${s.health}`} />
                  <span className="rollup-name">{s.name}</span>
                  <span className={`rollup-health health--${s.health}`}>{HEALTH_LABEL[s.health]}</span>
                </li>
              ))}
          </ul>
        </section>
      )}

      {!soon && studio.todos.length > 0 && (
        <section className="block">
          <h3>Open todos</h3>
          <ul className="todos">
            {studio.todos.slice(0, 8).map((t, i) => (
              <li key={i}>
                {t.priority ? <span className={`pri pri--${t.priority}`}>{PRIORITY_LABEL[t.priority] ?? ""}</span> : null}
                {t.link ? (
                  <a href={t.link} target="_blank" rel="noreferrer">{t.title}</a>
                ) : (
                  <span>{t.title}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {!soon && studio.roadmap.length > 0 && (
        <section className="block">
          <h3>Roadmap</h3>
          <ul className="roadmap">
            {studio.roadmap.map((r, i) => (
              <li key={i}>
                <span className="roadmap-state">{r.state}</span> {r.title}
              </li>
            ))}
          </ul>
        </section>
      )}

      {!soon && (
        <section className="block">
          <h3>Recent activity</h3>
          <ActivityList items={studio.activity} />
        </section>
      )}
    </div>
  );
}
