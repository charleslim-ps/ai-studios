import type { Activity } from "../types";

function ago(at: string): string {
  const d = Math.floor((Date.now() - new Date(at).getTime()) / 86_400_000);
  if (Number.isNaN(d)) return "";
  if (d <= 0) return "today";
  if (d === 1) return "1d";
  return `${d}d`;
}

// Tight, small-font activity feed.
export function ActivityList({ items }: { items: Activity[] }) {
  if (items.length === 0) return <p className="empty">No recent activity.</p>;
  return (
    <ul className="feed">
      {items.map((a, i) => (
        <li key={i} className="feed-row">
          <span className={`feed-type type--${a.type}`}>{a.type}</span>
          {a.link ? (
            <a className="feed-summary" href={a.link} target="_blank" rel="noreferrer">
              {a.summary}
            </a>
          ) : (
            <span className="feed-summary">{a.summary}</span>
          )}
          <span className="feed-at">{ago(a.at)}</span>
        </li>
      ))}
    </ul>
  );
}
