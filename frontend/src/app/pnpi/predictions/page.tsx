import { backendRequest } from "@/lib/backend";

export const dynamic = "force-dynamic";

export default async function PredictionsPage() {
  let data: any = null;
  try {
    const res = await backendRequest("/pnpi/dashboard/predictions");
    if (res.ok) data = await res.json();
  } catch {}

  if (!data) return <div style={{ padding: 32 }}>Erreur de chargement.</div>;

  const trendColor = data.approval_rate.trend === "hausse" ? "#006233" : data.approval_rate.trend === "baisse" ? "#b42318" : "#d97706";

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Analyse predictive</h1>
      <p style={{ color: "var(--text-soft, #526175)", fontSize: 13, margin: "0 0 24px" }}>
        Previsions basees sur les tendances historiques des 12 derniers mois.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        {/* Approval rate trend */}
        <div className="chart-card" style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Taux d'approbation</div>
          <div style={{ display: "flex", gap: 20, alignItems: "baseline" }}>
            <div>
              <div style={{ fontSize: 32, fontWeight: 800, color: "#006233" }}>{data.approval_rate.recent_6m}%</div>
              <div style={{ fontSize: 11, color: "var(--text-soft, #526175)" }}>6 derniers mois</div>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-soft, #9ca3af)" }}>{data.approval_rate.older}%</div>
              <div style={{ fontSize: 11, color: "var(--text-soft, #526175)" }}>Precedent</div>
            </div>
            <span style={{
              padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
              background: `${trendColor}12`, color: trendColor,
            }}>
              {data.approval_rate.trend === "hausse" ? "\u2191" : data.approval_rate.trend === "baisse" ? "\u2193" : "\u2192"} {data.approval_rate.trend}
            </span>
          </div>
        </div>

        {/* Backlog */}
        <div className="chart-card" style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Backlog</div>
          <div style={{ display: "flex", gap: 20 }}>
            <div>
              <div style={{ fontSize: 32, fontWeight: 800, color: "#0c7eb4" }}>{data.backlog.in_progress}</div>
              <div style={{ fontSize: 11, color: "var(--text-soft, #526175)" }}>Dossiers en cours</div>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-soft, #526175)" }}>{data.backlog.avg_processing_days}j</div>
              <div style={{ fontSize: 11, color: "var(--text-soft, #526175)" }}>Delai moyen</div>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#d97706" }}>~{data.backlog.est_clearance_days}j</div>
              <div style={{ fontSize: 11, color: "var(--text-soft, #526175)" }}>Pour tout traiter</div>
            </div>
          </div>
        </div>
      </div>

      {/* Forecasts */}
      {data.forecasts.length > 0 && (
        <div className="chart-card" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Previsions de soumissions</div>
          <div style={{ display: "flex", gap: 14 }}>
            {data.forecasts.map((f: any) => (
              <div key={f.month} style={{
                flex: 1, padding: "14px 16px", borderRadius: 12,
                background: "var(--bg-base, #f4f8fb)", textAlign: "center",
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-soft, #526175)", marginBottom: 4 }}>
                  {f.label}
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#0c7eb4" }}>{f.predicted_submissions}</div>
                <div style={{ fontSize: 10, color: "var(--text-soft, #9ca3af)" }}>
                  Confiance : {f.confidence}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly trend mini chart */}
      <div className="chart-card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Tendance mensuelle</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 100 }}>
          {data.monthly_trend.map((m: any) => {
            const max = Math.max(...data.monthly_trend.map((x: any) => x.count));
            const h = max ? (m.count / max) * 80 : 0;
            return (
              <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <span style={{ fontSize: 9, fontWeight: 700 }}>{m.count}</span>
                <div style={{ width: "100%", maxWidth: 30, height: h, background: "#006233", borderRadius: "3px 3px 0 0", minHeight: 2 }} />
                <span style={{ fontSize: 8, color: "var(--text-soft, #9ca3af)", transform: "rotate(-45deg)", whiteSpace: "nowrap" }}>
                  {m.month.slice(5)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sector growth */}
      <div className="chart-card" style={{ padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Croissance sectorielle</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.sector_growth.map((s: any) => {
            const growthColor = s.growth_pct > 0 ? "#006233" : s.growth_pct < 0 ? "#b42318" : "#526175";
            return (
              <div key={s.secteur} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 100, fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>{s.secteur}</span>
                <div style={{ flex: 1, display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "var(--text-soft, #9ca3af)" }}>{s.older}</span>
                  <span style={{ color: "var(--text-soft, #9ca3af)" }}>{"\u2192"}</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{s.recent}</span>
                </div>
                <span style={{
                  padding: "2px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                  background: `${growthColor}12`, color: growthColor,
                }}>
                  {s.growth_pct > 0 ? "+" : ""}{s.growth_pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
