import { backendRequest } from "@/lib/backend";

export const dynamic = "force-dynamic";

export default async function BenchmarkPage() {
  let provinces: any[] = [];
  try {
    const res = await backendRequest("/pnpi/dashboard/province-benchmark");
    if (res.ok) { const d = await res.json(); provinces = d.provinces || []; }
  } catch {}

  const maxScore = Math.max(...provinces.map(p => p.score), 1);

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Benchmarking provincial</h1>
      <p style={{ color: "var(--text-soft, #526175)", fontSize: 13, margin: "0 0 20px" }}>
        Comparaison des performances industrielles entre les 9 provinces du Gabon.
      </p>

      {/* Podium top 3 */}
      {provinces.length >= 3 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 24, alignItems: "flex-end" }}>
          {[1, 0, 2].map((idx) => {
            const p = provinces[idx];
            if (!p) return null;
            const heights = [140, 180, 110];
            const medals = ["\uD83E\uDD48", "\uD83E\uDD47", "\uD83E\uDD49"];
            return (
              <div key={p.province} style={{
                width: 160, textAlign: "center",
                padding: "16px 12px", borderRadius: 16,
                background: "var(--bg-layer, #fff)",
                border: "1.5px solid var(--line, #dce4ef)",
                height: heights[idx === 0 ? 1 : idx === 1 ? 0 : 2],
                display: "flex", flexDirection: "column", justifyContent: "flex-end",
              }}>
                <div style={{ fontSize: 28 }}>{medals[idx === 0 ? 1 : idx === 1 ? 0 : 2]}</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>{p.label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#006233" }}>{p.score}</div>
                <div style={{ fontSize: 10, color: "var(--text-soft)" }}>Score composite</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full table */}
      <div className="chart-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-scroll">
          <table className="annex-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Province</th>
                <th style={{ textAlign: "center" }}>Score</th>
                <th style={{ textAlign: "center" }}>Operateurs</th>
                <th style={{ textAlign: "center" }}>ATIs</th>
                <th style={{ textAlign: "center" }}>Taux appro.</th>
                <th style={{ textAlign: "center" }}>Inspections</th>
                <th style={{ textAlign: "center" }}>Conformite</th>
                <th style={{ textAlign: "center" }}>Delai moy.</th>
                <th style={{ textAlign: "center" }}>Retard</th>
              </tr>
            </thead>
            <tbody>
              {provinces.map((p, i) => {
                const scoreColor = p.score >= 70 ? "#006233" : p.score >= 45 ? "#d97706" : "#b42318";
                return (
                  <tr key={p.province}>
                    <td style={{ fontWeight: 700, color: "var(--text-soft)" }}>{i + 1}</td>
                    <td style={{ fontWeight: 700 }}>{p.label}</td>
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <div style={{ width: 40, height: 6, borderRadius: 3, background: "var(--line, #e5e7eb)" }}>
                          <div style={{ height: "100%", borderRadius: 3, width: `${(p.score / maxScore) * 100}%`, background: scoreColor }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 800, color: scoreColor }}>{p.score}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>{p.operateurs}</td>
                    <td style={{ textAlign: "center" }}>{p.atis}</td>
                    <td style={{ textAlign: "center" }}>
                      <span style={{ fontWeight: 700, color: p.approval_rate >= 70 ? "#006233" : "#d97706" }}>{p.approval_rate}%</span>
                    </td>
                    <td style={{ textAlign: "center" }}>{p.inspections}</td>
                    <td style={{ textAlign: "center" }}>
                      <span style={{ fontWeight: 700, color: p.conformity_rate >= 70 ? "#006233" : "#d97706" }}>{p.conformity_rate}%</span>
                    </td>
                    <td style={{ textAlign: "center" }}>{p.avg_days}j</td>
                    <td style={{ textAlign: "center" }}>
                      {p.overdue > 0 ? (
                        <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "#fef2f2", color: "#b42318" }}>{p.overdue}</span>
                      ) : <span style={{ color: "#006233", fontWeight: 600 }}>0</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
