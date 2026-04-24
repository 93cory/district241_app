export default function EmbedDocsPage() {
  const widgets = [
    {
      name: "KPIs",
      url: "/embed/kpis",
      description: "Indicateurs cles en temps reel (ATIs, operateurs, inspections)",
      iframe:
        '<iframe src="https://pnpi-gabon.ga/embed/kpis" width="500" height="80" frameborder="0"></iframe>',
    },
    {
      name: "Statut systeme",
      url: "/embed/status",
      description: "Badge de statut operationnel de la plateforme",
      iframe:
        '<iframe src="https://pnpi-gabon.ga/embed/status" width="300" height="50" frameborder="0"></iframe>',
    },
  ];

  return (
    <div style={{ padding: "24px 32px", maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px" }}>Widgets embarquables</h1>
      <p style={{ color: "var(--text-soft, #526175)", fontSize: 14, margin: "0 0 24px" }}>
        Integrez des widgets PNPI sur vos sites web et portails ministeriels via des iframes.
      </p>

      {widgets.map((w) => (
        <div key={w.name} className="chart-card" style={{ padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>{w.name}</h3>
          <p style={{ fontSize: 13, color: "var(--text-soft)", margin: "0 0 12px" }}>
            {w.description}
          </p>

          <div
            style={{
              marginBottom: 12,
              padding: 12,
              borderRadius: 10,
              background: "var(--bg-base, #f4f8fb)",
            }}
          >
            <iframe
              src={w.url}
              width="100%"
              height={w.name === "KPIs" ? 80 : 50}
              frameBorder="0"
              style={{ border: "none" }}
            />
          </div>

          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Code d'integration :</div>
          <pre
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: "var(--bg-base, #f4f8fb)",
              fontSize: 11,
              overflow: "auto",
              whiteSpace: "pre-wrap",
              border: "1px solid var(--line, #dce4ef)",
            }}
          >
            {w.iframe}
          </pre>
        </div>
      ))}
    </div>
  );
}
