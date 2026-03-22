import { backendRequest } from "@/lib/backend";

export const dynamic = "force-dynamic";

export default async function WorkflowTimingPage() {
  let stages: any[] = [];
  try {
    const res = await backendRequest("/pnpi/dashboard/workflow-timing");
    if (res.ok) { const d = await res.json(); stages = d.stages || []; }
  } catch {}

  const maxDays = Math.max(...stages.map(s => s.p90_days), 1);

  return (
    <div style={{ padding: "24px 32px", maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Temps par etape du workflow</h1>
      <p style={{ color: "var(--text-soft)", fontSize: 13, margin: "0 0 20px" }}>
        Duree moyenne, mediane et P90 a chaque etape du traitement ATI.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {stages.map((s, i) => {
          const colors = ["#0c7eb4", "#006233", "#7c3aed", "#d97706"];
          const color = colors[i % colors.length];
          return (
            <div key={s.stage} className="chart-card" style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{s.stage}</span>
                <span style={{ fontSize: 11, color: "var(--text-soft)" }}>{s.sample_size} dossiers</span>
              </div>

              <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color }}>{s.avg_days}j</div>
                  <div style={{ fontSize: 10, color: "var(--text-soft)" }}>Moyenne</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-main)" }}>{s.median_days}j</div>
                  <div style={{ fontSize: 10, color: "var(--text-soft)" }}>Mediane</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: s.p90_days > 15 ? "#b42318" : "var(--text-main)" }}>{s.p90_days}j</div>
                  <div style={{ fontSize: 10, color: "var(--text-soft)" }}>P90</div>
                </div>
              </div>

              {/* Visual bar */}
              <div style={{ display: "flex", gap: 2, height: 12, borderRadius: 6, overflow: "hidden" }}>
                <div style={{ width: `${(s.median_days / maxDays) * 100}%`, background: color, borderRadius: "6px 0 0 6px" }} title="Mediane" />
                <div style={{ width: `${((s.avg_days - s.median_days) / maxDays) * 100}%`, background: `${color}80` }} title="Moyenne" />
                <div style={{ width: `${((s.p90_days - s.avg_days) / maxDays) * 100}%`, background: `${color}40` }} title="P90" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
