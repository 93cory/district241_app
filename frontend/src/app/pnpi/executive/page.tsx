import { backendRequest } from "@/lib/backend";

export const dynamic = "force-dynamic";

export default async function ExecutivePage() {
  let kpis: any = {};
  let quality: any = {};
  let predictions: any = {};

  try {
    const [kR, qR, pR] = await Promise.all([
      backendRequest("/pnpi/dashboard/kpis"),
      backendRequest("/pnpi/dashboard/data-quality"),
      backendRequest("/pnpi/dashboard/predictions"),
    ]);
    if (kR.ok) kpis = await kR.json();
    if (qR.ok) quality = await qR.json();
    if (pR.ok) predictions = await pR.json();
  } catch {}

  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Hero */}
      <div style={{
        padding: "28px 32px", borderRadius: 20, marginBottom: 20,
        background: "linear-gradient(135deg, #051B36 0%, #006233 100%)",
        color: "#fff",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{today}</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: "4px 0 0" }}>Resume Executif PNPI</h1>
          </div>
          <div style={{
            padding: "8px 16px", borderRadius: 12,
            background: quality.grade ? `rgba(255, 255, 255, 0.72)` : "transparent",
          }}>
            <div style={{ fontSize: 10, opacity: 0.7 }}>Qualite donnees</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{quality.grade || "·"}</div>
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 20 }}>
        {[
          { label: "ATIs total", value: kpis.atis_total || 0, color: "#051B36" },
          { label: "Approuves", value: kpis.atis_approuves || 0, color: "#006233" },
          { label: "En cours", value: kpis.atis_en_cours || 0, color: "#0c7eb4" },
          { label: "Rejetes", value: kpis.atis_rejetes || 0, color: "#b42318" },
          { label: "Operateurs", value: kpis.operateurs_actifs || 0, color: "#7c3aed" },
          { label: "Inspections", value: kpis.inspections_total || 0, color: "#059669" },
          { label: "SLA depasses", value: kpis.sla_overdue || 0, color: kpis.sla_overdue > 0 ? "#b42318" : "#006233" },
          { label: "Delai moyen", value: `${kpis.delai_moyen || 0}j`, color: "#d97706" },
        ].map(k => (
          <div key={k.label} className="chart-card" style={{ padding: "12px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-soft, #526175)" }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        {/* Approval trend */}
        <div className="chart-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 10px" }}>Tendance approbation</h3>
          {predictions.approval_rate ? (
            <div style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#006233" }}>{predictions.approval_rate.recent_6m}%</div>
                <div style={{ fontSize: 11, color: "var(--text-soft)" }}>6 mois recents</div>
              </div>
              <span style={{
                padding: "3px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                background: predictions.approval_rate.trend === "hausse" ? "#dcfce7" : "#fef2f2",
                color: predictions.approval_rate.trend === "hausse" ? "#006233" : "#b42318",
              }}>
                {predictions.approval_rate.trend === "hausse" ? "\u2191" : "\u2193"} {predictions.approval_rate.trend}
              </span>
            </div>
          ) : <div style={{ color: "var(--text-soft)" }}>·</div>}
        </div>

        {/* Backlog */}
        <div className="chart-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 10px" }}>Charge de travail</h3>
          {predictions.backlog ? (
            <div style={{ display: "flex", gap: 16 }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#0c7eb4" }}>{predictions.backlog.in_progress}</div>
                <div style={{ fontSize: 11, color: "var(--text-soft)" }}>En cours</div>
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#d97706" }}>~{predictions.backlog.est_clearance_days}j</div>
                <div style={{ fontSize: 11, color: "var(--text-soft)" }}>Pour tout traiter</div>
              </div>
            </div>
          ) : <div style={{ color: "var(--text-soft)" }}>·</div>}
        </div>
      </div>

      {/* Forecasts */}
      {predictions.forecasts && predictions.forecasts.length > 0 && (
        <div className="chart-card" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px" }}>Previsions 3 mois</h3>
          <div style={{ display: "flex", gap: 12 }}>
            {predictions.forecasts.map((f: any) => (
              <div key={f.month} style={{
                flex: 1, padding: "12px 14px", borderRadius: 12,
                background: "var(--bg-base, #f4f8fb)", textAlign: "center",
              }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-soft)" }}>{f.label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#0c7eb4" }}>{f.predicted_submissions}</div>
                <div style={{ fontSize: 9, color: "var(--text-soft, #9ca3af)" }}>{"\u00B1"}{100 - f.confidence}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sector growth */}
      {predictions.sector_growth && (
        <div className="chart-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px" }}>Dynamique sectorielle</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {predictions.sector_growth.slice(0, 6).map((s: any) => {
              const color = s.growth_pct > 0 ? "#006233" : s.growth_pct < 0 ? "#b42318" : "#526175";
              return (
                <div key={s.secteur} style={{
                  padding: "8px 14px", borderRadius: 10,
                  background: `${color}08`, border: `1px solid ${color}20`,
                  fontSize: 12,
                }}>
                  <span style={{ fontWeight: 700, textTransform: "capitalize" }}>{s.secteur}</span>
                  <span style={{ marginLeft: 8, fontWeight: 800, color }}>
                    {s.growth_pct > 0 ? "+" : ""}{s.growth_pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
        {[
          { href: "/pnpi/benchmark", label: "Benchmark provinces" },
          { href: "/pnpi/annual-report", label: "Bilan annuel" },
          { href: "/pnpi/comparison", label: "Comparaison" },
          { href: "/pnpi/data-quality", label: "Qualite donnees" },
          { href: "/pnpi/presentation", label: "Mode presentation" },
        ].map(l => (
          <a key={l.href} href={l.href} style={{
            padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
            border: "1.5px solid var(--line, #dce4ef)", background: "var(--bg-layer, #fff)",
            color: "var(--text-main, #0c2a4a)", textDecoration: "none",
          }}>{l.label}</a>
        ))}
      </div>
    </div>
  );
}
