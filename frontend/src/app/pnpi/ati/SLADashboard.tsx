"use client";

interface SLAData {
  total_atis: number;
  active_atis: number;
  overdue_atis: number;
  sla_compliance_pct: number;
  avg_processing_days: number;
  on_track: number;
  at_risk: number;
  by_priority: Record<string, { total: number; overdue: number }>;
}

export function SLADashboard({ data }: { data: SLAData }) {
  const complianceColor = data.sla_compliance_pct >= 80 ? "#006233" : data.sla_compliance_pct >= 60 ? "#f2b800" : "#b42318";

  return (
    <div className="chart-card" style={{ padding: 20 }}>
      <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Performance SLA</h3>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
        <div style={{ textAlign: "center", padding: 14, borderRadius: 12, background: "var(--bg-base, #f4f8fb)" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: complianceColor }}>{data.sla_compliance_pct}%</div>
          <div style={{ fontSize: 11, color: "var(--text-soft, #526175)", fontWeight: 600 }}>Conformite SLA</div>
        </div>
        <div style={{ textAlign: "center", padding: 14, borderRadius: 12, background: "var(--bg-base, #f4f8fb)" }}>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{data.avg_processing_days}j</div>
          <div style={{ fontSize: 11, color: "var(--text-soft, #526175)", fontWeight: 600 }}>Delai moyen</div>
        </div>
        <div style={{ textAlign: "center", padding: 14, borderRadius: 12, background: "var(--bg-base, #f4f8fb)" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#b42318" }}>{data.overdue_atis}</div>
          <div style={{ fontSize: 11, color: "var(--text-soft, #526175)", fontWeight: 600 }}>En retard</div>
        </div>
        <div style={{ textAlign: "center", padding: 14, borderRadius: 12, background: "var(--bg-base, #f4f8fb)" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#006233" }}>{data.on_track}</div>
          <div style={{ fontSize: 11, color: "var(--text-soft, #526175)", fontWeight: 600 }}>Dans les delais</div>
        </div>
      </div>

      <h4 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 8px" }}>Par priorite</h4>
      <div style={{ display: "flex", gap: 8 }}>
        {Object.entries(data.by_priority).map(([priority, stats]) => (
          <div key={priority} style={{
            flex: 1, padding: "10px 14px", borderRadius: 10,
            background: "var(--bg-base, #f4f8fb)", fontSize: 12,
          }}>
            <div style={{ fontWeight: 700, textTransform: "capitalize" }}>{priority}</div>
            <div>{stats.total} actif(s), <span style={{ color: "#b42318" }}>{stats.overdue} en retard</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}
