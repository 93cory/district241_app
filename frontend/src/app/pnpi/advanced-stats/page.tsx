import { backendRequest } from "@/lib/backend";

export const dynamic = "force-dynamic";

export default async function AdvancedStatsPage() {
  let data: any = null;
  try {
    const res = await backendRequest("/pnpi/dashboard/advanced-stats");
    if (res.ok) data = await res.json();
  } catch {}

  if (!data) return <div style={{ padding: 32 }}>Erreur de chargement.</div>;

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 20px" }}>Statistiques avancees</h1>

      {/* Funnel */}
      <div className="chart-card" style={{ padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 14px" }}>Entonnoir de conversion ATI</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {data.funnel.map((step: any, i: number) => (
            <div key={step.stage} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 110, fontSize: 13, fontWeight: 600 }}>{step.stage}</span>
              <div style={{ flex: 1, height: 28, background: "var(--line, #e5e7eb)", borderRadius: 6, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 6,
                  width: `${step.pct}%`,
                  background: `hsl(${140 - i * 30}, 60%, 40%)`,
                  display: "flex", alignItems: "center", paddingLeft: 8,
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{step.count}</span>
                </div>
              </div>
              <span style={{ width: 50, textAlign: "right", fontSize: 12, fontWeight: 700 }}>{step.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Day of week */}
        <div className="chart-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 14px" }}>Soumissions par jour</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100 }}>
            {data.day_distribution.map((d: any) => {
              const max = Math.max(...data.day_distribution.map((x: any) => x.count));
              const h = max ? (d.count / max) * 80 : 0;
              return (
                <div key={d.day} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 2 }}>{d.count}</div>
                  <div style={{ height: h, background: "#006233", borderRadius: "4px 4px 0 0", minHeight: 2 }} />
                  <div style={{ fontSize: 9, color: "var(--text-soft, #9ca3af)", marginTop: 2 }}>{d.day.slice(0, 3)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Processing time */}
        <div className="chart-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 14px" }}>Delai de traitement</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100 }}>
            {data.processing_time.map((b: any) => {
              const max = Math.max(...data.processing_time.map((x: any) => x.count));
              const h = max ? (b.count / max) * 80 : 0;
              const isLong = b.bucket.includes("60") || b.bucket.includes("45");
              return (
                <div key={b.bucket} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 2 }}>{b.count}</div>
                  <div style={{ height: h, background: isLong ? "#b42318" : "#0c7eb4", borderRadius: "4px 4px 0 0", minHeight: 2 }} />
                  <div style={{ fontSize: 8, color: "var(--text-soft, #9ca3af)", marginTop: 2 }}>{b.bucket}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cohorts */}
      <div className="chart-card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 14px" }}>Analyse par cohorte mensuelle</h3>
        <div className="table-scroll">
          <table className="annex-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Cohorte</th>
                <th style={{ textAlign: "center" }}>Soumis</th>
                <th style={{ textAlign: "center" }}>Approuves</th>
                <th style={{ textAlign: "center" }}>Rejetes</th>
                <th style={{ textAlign: "center" }}>En cours</th>
                <th style={{ textAlign: "center" }}>Taux conv.</th>
                <th style={{ textAlign: "center" }}>Delai moy.</th>
              </tr>
            </thead>
            <tbody>
              {data.cohorts.map((c: any) => (
                <tr key={c.cohort}>
                  <td style={{ fontWeight: 700 }}>{c.cohort}</td>
                  <td style={{ textAlign: "center" }}>{c.submitted}</td>
                  <td style={{ textAlign: "center", color: "#006233", fontWeight: 600 }}>{c.approved}</td>
                  <td style={{ textAlign: "center", color: "#b42318", fontWeight: 600 }}>{c.rejected}</td>
                  <td style={{ textAlign: "center", color: "#d97706" }}>{c.pending}</td>
                  <td style={{ textAlign: "center" }}>
                    <span style={{
                      padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                      background: c.conversion_rate >= 70 ? "#dcfce7" : c.conversion_rate >= 40 ? "#fef3c7" : "#fef2f2",
                      color: c.conversion_rate >= 70 ? "#006233" : c.conversion_rate >= 40 ? "#d97706" : "#b42318",
                    }}>
                      {c.conversion_rate}%
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>{c.avg_days}j</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
