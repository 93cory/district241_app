import { backendRequest } from "@/lib/backend";

export const dynamic = "force-dynamic";

export default async function MultiYearPage() {
  let years: any[] = [];
  try {
    const res = await backendRequest("/pnpi/dashboard/multi-year");
    if (res.ok) {
      const d = await res.json();
      years = d.years || [];
    }
  } catch {}

  const metrics = [
    { key: "soumissions", label: "Soumissions", color: "#051B36" },
    { key: "approuves", label: "Approuves", color: "#006233" },
    { key: "rejetes", label: "Rejetes", color: "#b42318" },
    { key: "taux_approbation", label: "Taux appro. (%)", color: "#006233" },
    { key: "inspections", label: "Inspections", color: "#7c3aed" },
    { key: "taux_conformite", label: "Conformite (%)", color: "#0c7eb4" },
    { key: "delai_moyen", label: "Delai moyen (j)", color: "#d97706" },
  ];

  return (
    <div style={{ padding: "24px 32px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 20px" }}>Comparatif multi-annees</h1>

      <div className="chart-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-scroll">
          <table className="annex-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Indicateur</th>
                {years.map((y) => (
                  <th key={y.year} style={{ textAlign: "center", fontSize: 15, fontWeight: 800 }}>
                    {y.year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => (
                <tr key={m.key}>
                  <td style={{ fontWeight: 600 }}>{m.label}</td>
                  {years.map((y, i) => {
                    const val = y[m.key];
                    const prev = years[i + 1]?.[m.key];
                    const isUp = prev != null && val > prev;
                    const isDown = prev != null && val < prev;
                    const inverted = m.key === "delai_moyen" || m.key === "rejetes";
                    const good = inverted ? isDown : isUp;
                    return (
                      <td key={y.year} style={{ textAlign: "center" }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: m.color }}>{val}</span>
                        {prev != null && val !== prev && (
                          <span
                            style={{
                              marginLeft: 6,
                              fontSize: 11,
                              fontWeight: 700,
                              color: good ? "#006233" : "#b42318",
                            }}
                          >
                            {isUp ? "\u2191" : "\u2193"}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bar chart comparison */}
      {years.length > 0 && (
        <div className="chart-card" style={{ padding: 20, marginTop: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 14px" }}>
            Soumissions par annee
          </h3>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 16,
              height: 120,
              justifyContent: "center",
            }}
          >
            {[...years].reverse().map((y) => {
              const max = Math.max(...years.map((yr) => yr.soumissions), 1);
              const h = (y.soumissions / max) * 100;
              return (
                <div key={y.year} style={{ textAlign: "center", flex: "0 0 80px" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>
                    {y.soumissions}
                  </div>
                  <div
                    style={{
                      height: h,
                      background: "#006233",
                      borderRadius: "6px 6px 0 0",
                      minHeight: 4,
                    }}
                  />
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>{y.year}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
