export default function RoadmapPage() {
  const phases = [
    {
      phase: "Phase 1 — Fondation", period: "2024-2025", statut: "complete", color: "#006233",
      items: [
        { text: "Plateforme PNPI operationnelle", done: true },
        { text: "Workflow ATI complet (soumission → decision)", done: true },
        { text: "Inspections de conformite", done: true },
        { text: "2FA et securite renforcee", done: true },
        { text: "Mobile Flutter + PWA", done: true },
      ],
    },
    {
      phase: "Phase 2 — Intelligence", period: "2025-2026", statut: "en_cours", color: "#0c7eb4",
      items: [
        { text: "Recommandation IA pour decisions ATI", done: true },
        { text: "Scoring de risque automatise", done: true },
        { text: "Alertes intelligentes (anomalies)", done: true },
        { text: "Analytics predictifs", done: true },
        { text: "Benchmark provincial et CEMAC", done: true },
        { text: "Dashboard ODD et impact social", done: true },
      ],
    },
    {
      phase: "Phase 3 — Ecosysteme", period: "2026-2027", statut: "planifie", color: "#7c3aed",
      items: [
        { text: "Integration douanes (DGDI) via API", done: false },
        { text: "Integration impots (DGI) via API", done: false },
        { text: "SMS pour zones rurales", done: false },
        { text: "Formation e-learning certifiante", done: false },
        { text: "Place de marche industrielle", done: false },
        { text: "Blockchain pour certificats", done: false },
      ],
    },
    {
      phase: "Phase 4 — Regional", period: "2027-2028", statut: "vision", color: "#d97706",
      items: [
        { text: "Extension aux pays CEMAC partenaires", done: false },
        { text: "Harmonisation des normes industrielles", done: false },
        { text: "Portail investisseurs international", done: false },
        { text: "IA generative pour rapports", done: false },
        { text: "Satellite monitoring (deforestation)", done: false },
      ],
    },
  ];

  const STATUT_LABELS: Record<string, string> = { complete: "Termine", en_cours: "En cours", planifie: "Planifie", vision: "Vision" };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Feuille de route strategique</h1>
      <p style={{ color: "var(--text-soft)", fontSize: 13, margin: "0 0 24px" }}>
        Vision a 4 ans pour la transformation numerique de la politique industrielle gabonaise.
      </p>

      <div style={{ position: "relative", paddingLeft: 24 }}>
        <div style={{ position: "absolute", left: 9, top: 0, bottom: 0, width: 3, background: "var(--line, #dce4ef)" }} />

        {phases.map(p => (
          <div key={p.phase} style={{ position: "relative", marginBottom: 24, paddingLeft: 24 }}>
            <div style={{ position: "absolute", left: -4, top: 4, width: 20, height: 20, borderRadius: "50%", background: p.color, border: "3px solid var(--bg-layer, #fff)" }} />

            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 17, fontWeight: 800, color: p.color }}>{p.phase}</span>
                <span style={{ padding: "2px 10px", borderRadius: 8, fontSize: 10, fontWeight: 700, background: `${p.color}12`, color: p.color }}>{STATUT_LABELS[p.statut]}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-soft)" }}>{p.period}</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {p.items.map(item => (
                <div key={item.text} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, opacity: item.done ? 1 : 0.6 }}>
                  <span style={{ fontSize: 14 }}>{item.done ? "\u2705" : "\u2B1C"}</span>
                  <span style={{ textDecoration: item.done ? "none" : "none" }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
