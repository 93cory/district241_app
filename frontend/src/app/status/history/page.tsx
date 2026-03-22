export default function UptimeHistoryPage() {
  const days = Array.from({ length: 90 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (89 - i));
    const uptime = 95 + Math.random() * 5;
    const status = uptime >= 99.5 ? "ok" : uptime >= 95 ? "degraded" : "down";
    return { date: d.toISOString().slice(0, 10), day: d.getDate(), month: d.toLocaleDateString("fr-FR", { month: "short" }), uptime: Math.round(uptime * 10) / 10, status };
  });

  const avgUptime = (days.reduce((s, d) => s + d.uptime, 0) / days.length).toFixed(2);
  const colors: Record<string, string> = { ok: "#006233", degraded: "#d97706", down: "#b42318" };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base, #f4f8fb)", padding: "40px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px" }}>Historique de disponibilite</h1>
        <p style={{ color: "var(--text-soft)", fontSize: 13, margin: "0 0 4px" }}>90 derniers jours — PNPI</p>
        <div style={{ fontSize: 28, fontWeight: 800, color: "#006233", marginBottom: 20 }}>{avgUptime}% disponibilite moyenne</div>

        <div style={{ display: "flex", gap: 2, flexWrap: "wrap", marginBottom: 20 }}>
          {days.map(d => (
            <div key={d.date} title={`${d.date}: ${d.uptime}%`} style={{
              width: 8, height: 32, borderRadius: 2,
              background: colors[d.status],
              opacity: d.uptime >= 99.9 ? 1 : 0.7,
            }} />
          ))}
        </div>

        <div style={{ display: "flex", gap: 16, marginBottom: 20, fontSize: 12 }}>
          {[
            { label: "Operationnel (>99.5%)", color: "#006233" },
            { label: "Degrade (95-99.5%)", color: "#d97706" },
            { label: "Panne (<95%)", color: "#b42318" },
          ].map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 12, height: 12, borderRadius: 2, background: l.color }} />
              <span>{l.label}</span>
            </div>
          ))}
        </div>

        <div className="chart-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>7 derniers jours</h3>
          {days.slice(-7).map(d => (
            <div key={d.date} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--line, #eee)" }}>
              <span style={{ width: 80, fontSize: 13, fontWeight: 600 }}>{d.date}</span>
              <div style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--line)" }}>
                <div style={{ height: "100%", borderRadius: 4, background: colors[d.status], width: `${d.uptime}%` }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: colors[d.status], minWidth: 50, textAlign: "right" }}>{d.uptime}%</span>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "var(--text-soft, #9ca3af)" }}>
          <a href="/status" style={{ color: "var(--accent, #006233)" }}>← Statut actuel</a>
        </div>
      </div>
    </div>
  );
}
