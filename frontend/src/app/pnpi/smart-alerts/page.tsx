import { backendRequest } from "@/lib/backend";

export const dynamic = "force-dynamic";

const SEV: Record<string, { color: string; bg: string; icon: string }> = {
  critical: { color: "#b42318", bg: "#fef2f2", icon: "\u{1F6A8}" },
  high: { color: "#e65100", bg: "#fff7ed", icon: "\u26A0\uFE0F" },
  warning: { color: "#d97706", bg: "#fef3c7", icon: "\u{1F4A1}" },
  info: { color: "#0c7eb4", bg: "#e0f2fe", icon: "\u2139\uFE0F" },
};

export default async function SmartAlertsPage() {
  let alerts: any[] = [];
  try {
    const res = await backendRequest("/pnpi/dashboard/smart-alerts");
    if (res.ok) { const d = await res.json(); alerts = d.alerts || []; }
  } catch {}

  return (
    <div style={{ padding: "24px 32px", maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Alertes intelligentes</h1>
      <p style={{ color: "var(--text-soft)", fontSize: 13, margin: "0 0 20px" }}>
        Detection automatique d'anomalies et situations a surveiller.
      </p>

      {alerts.length === 0 ? (
        <div className="chart-card" style={{ padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>{"\u2705"}</div>
          <div style={{ fontWeight: 700 }}>Aucune anomalie detectee</div>
          <div style={{ fontSize: 13, color: "var(--text-soft)" }}>Tous les indicateurs sont dans les normes.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {alerts.map((a, i) => {
            const s = SEV[a.severity] || SEV.info;
            return (
              <div key={i} style={{
                padding: "16px 20px", borderRadius: 14,
                background: s.bg, borderLeft: `5px solid ${s.color}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: s.color }}>
                    {s.icon} {a.title}
                  </div>
                  <span style={{
                    padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700,
                    background: `${s.color}15`, color: s.color, textTransform: "uppercase",
                  }}>{a.severity}</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-main)", marginBottom: 6 }}>{a.detail}</div>
                <div style={{ fontSize: 12, color: s.color, fontWeight: 600 }}>
                  {"\u{1F4A1}"} {a.recommendation}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
