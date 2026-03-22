"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

// Lazy load to avoid SSR issues with Leaflet
const MapView = dynamic(() => import("./MapView"), { ssr: false, loading: () => <div style={{ height: 500, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-base)" }}>Chargement de la carte...</div> });

export default function MapPage() {
  const [operators, setOperators] = useState<any[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetch("/api/pnpi/operateurs?limit=200")
      .then(r => r.json())
      .then(d => setOperators(d.operateurs || d || []))
      .catch(() => {});
  }, []);

  const filtered = filter ? operators.filter(o => o.secteur === filter) : operators;
  const sectors = [...new Set(operators.map(o => o.secteur))].sort();

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Carte interactive</h1>
          <p style={{ color: "var(--text-soft)", fontSize: 13, margin: 0 }}>{filtered.length} operateur(s) affiches</p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setFilter("")} style={{
            padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer",
            background: !filter ? "#006233" : "var(--bg-base)", color: !filter ? "#fff" : "var(--text-soft)",
          }}>Tous</button>
          {sectors.map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer",
              background: filter === s ? "#006233" : "var(--bg-base)", color: filter === s ? "#fff" : "var(--text-soft)",
              textTransform: "capitalize",
            }}>{s}</button>
          ))}
        </div>
      </div>
      <div style={{ borderRadius: 16, overflow: "hidden", border: "1.5px solid var(--line, #dce4ef)" }}>
        <MapView operators={filtered} />
      </div>
    </div>
  );
}
