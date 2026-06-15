import { useEffect, useState } from "react";
import type { Studio } from "./types";
import { loadStudios } from "./data";
import { Tower } from "./tower/Tower";
import { Inspector } from "./inspector/Inspector";

export default function App() {
  const [studios, setStudios] = useState<Studio[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>("hq");
  const [generatedAt, setGeneratedAt] = useState<string>("");

  useEffect(() => {
    loadStudios()
      .then((f) => {
        setStudios(f.studios);
        setGeneratedAt(f.generatedAt);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="state">Couldn’t load the lot: {error}</div>;
  if (!studios) return <div className="state">Loading the cake…</div>;

  const selected = studios.find((s) => s.id === selectedId) ?? studios[0];

  return (
    <div className="page">
      <header className="masthead">
        <h1>Charles AI Studios</h1>
        <p className="tagline">A stack of studios. Click to launch or inspect.</p>
      </header>

      <main className="layout">
        <div className="tower-col">
          <Tower studios={studios} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <aside className="panel-col">
          <Inspector studio={selected} all={studios} />
        </aside>
      </main>

      <footer className="footnote">
        Generated {generatedAt ? new Date(generatedAt).toLocaleString() : "—"} · manifest + Linear + GitHub
      </footer>
    </div>
  );
}
