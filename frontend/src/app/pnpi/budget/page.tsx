import { backendRequest } from "@/lib/backend";

export const dynamic = "force-dynamic";

export default async function BudgetPage() {
  let data: any = null;
  try {
    const res = await backendRequest("/pnpi/dashboard/budget-tracking");
    if (res.ok) data = await res.json();
  } catch {}
  if (!data) return <div style={{ padding: 32 }}>Erreur de chargement.</div>;

  const fmt = (n: number) => n.toLocaleString("fr-FR");

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Suivi budgetaire</h1>
      <p style={{ color: "var(--text-soft)", fontSize: 13, margin: "0 0 20px" }}>
        Estimation des couts de traitement des agrements et inspections.
      </p>

      {/* Total */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 20 }}>
        <div className="chart-card" style={{ padding: "16px 18px", textAlign: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#006233" }}>{fmt(data.total_cost_fcfa)} FCFA</div>
          <div style={{ fontSize: 11, color: "var(--text-soft)" }}>Cout total estime</div>
          <div style={{ fontSize: 12, color: "var(--text-soft, #9ca3af)" }}>~{fmt(data.total_cost_eur)} EUR</div>
        </div>
        <div className="chart-card" style={{ padding: "16px 18px", textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0c7eb4" }}>{fmt(data.avg_cost_per_ati)} FCFA</div>
          <div style={{ fontSize: 11, color: "var(--text-soft)" }}>Cout moyen par ATI</div>
        </div>
        <div className="chart-card" style={{ padding: "16px 18px", textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#7c3aed" }}>{fmt(data.breakdown.inspections)} FCFA</div>
          <div style={{ fontSize: 11, color: "var(--text-soft)" }}>Budget inspections</div>
        </div>
      </div>

      {/* Breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="chart-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>Par poste</h3>
          {Object.entries(data.breakdown).map(([key, val]: any) => (
            <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--line, #eee)", fontSize: 13 }}>
              <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{key}</span>
              <span style={{ fontWeight: 700 }}>{fmt(val)} FCFA</span>
            </div>
          ))}
        </div>
        <div className="chart-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>Par secteur</h3>
          {data.by_sector.slice(0, 8).map((s: any) => (
            <div key={s.secteur} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--line, #eee)", fontSize: 13 }}>
              <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{s.secteur}</span>
              <span style={{ fontWeight: 700 }}>{fmt(s.cost_fcfa)} FCFA</span>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly trend */}
      <div className="chart-card pnpi-bar-chart">
        <h3 className="pnpi-card-subtitle">Evolution mensuelle</h3>
        <div className="pnpi-bars">
          {data.monthly.map((m: any) => {
            const max = Math.max(...data.monthly.map((x: any) => x.cost_fcfa), 1);
            const h = (m.cost_fcfa / max) * 80;
            const monthLabels = ["Jan", "Fev", "Mar", "Avr", "Mai", "Jun", "Jul", "Aou", "Sep", "Oct", "Nov", "Dec"];
            const mm = parseInt(m.month.slice(5), 10) - 1;
            const monthFull = monthLabels[mm] ?? m.month;
            return (
              <div key={m.month} className="pnpi-bar">
                <span className="pnpi-bar-value">{fmt(Math.round(m.cost_fcfa / 1000))}k</span>
                <div className="pnpi-bar-fill" style={{ height: h, minHeight: 2 }} />
                <span className="pnpi-bar-label">{m.month.slice(5)}</span>
                <div className="pnpi-bar-tooltip" role="tooltip">
                  <strong>{monthFull} {m.month.slice(0, 4)}</strong>
                  <span>{fmt(m.cost_fcfa)} FCFA</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
