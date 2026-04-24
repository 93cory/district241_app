"use client";

import { useState } from "react";

const METRICS = [
  { value: "atis", label: "Agrements (ATI)" },
  { value: "inspections", label: "Inspections" },
  { value: "operateurs", label: "Operateurs" },
];

const GROUPS = [
  { value: "secteur", label: "Par secteur" },
  { value: "province", label: "Par province" },
  { value: "mois", label: "Par mois" },
  { value: "statut", label: "Par statut" },
];

export default function ReportsPage() {
  const [metric, setMetric] = useState("atis");
  const [groupBy, setGroupBy] = useState("secteur");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ metric, group_by: groupBy });
      if (dateStart) params.set("date_start", dateStart);
      if (dateEnd) params.set("date_end", dateEnd);
      const res = await fetch(`/api/reports/builder?${params}`);
      if (res.ok) setData(await res.json());
    } catch {}
    setLoading(false);
  };

  const exportCsv = () => {
    if (!data?.data) return;
    const headers = Object.keys(data.data[0] || {});
    const rows = data.data.map((r: any) => headers.map((h) => r[h]).join(";"));
    const csv = [headers.join(";"), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rapport_${metric}_${groupBy}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 20px" }}>Constructeur de rapports</h1>

      <div className="chart-card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>Donnees</label>
            <select value={metric} onChange={(e) => setMetric(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid var(--line, #dce4ef)" }}>
              {METRICS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>Grouper par</label>
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid var(--line, #dce4ef)" }}>
              {GROUPS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>Debut</label>
            <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid var(--line, #dce4ef)" }} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>Fin</label>
            <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid var(--line, #dce4ef)" }} />
          </div>
        </div>
        <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
          <button onClick={generate} disabled={loading}
            style={{ padding: "10px 24px", borderRadius: 12, border: "none", background: "#006233", color: "#fff", fontWeight: 700, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
            {loading ? "Generation..." : "Generer le rapport"}
          </button>
          {data && (
            <button onClick={exportCsv}
              style={{ padding: "10px 24px", borderRadius: 12, border: "1.5px solid var(--line, #dce4ef)", background: "transparent", fontWeight: 600, cursor: "pointer" }}>
              Exporter CSV
            </button>
          )}
        </div>
      </div>

      {data && (
        <div className="chart-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontWeight: 700 }}>Resultats ({data.total} elements)</span>
            {data.period && (
              <span style={{ fontSize: 12, color: "var(--text-soft, #526175)" }}>
                {new Date(data.period.start).toLocaleDateString("fr-FR")} · {new Date(data.period.end).toLocaleDateString("fr-FR")}
              </span>
            )}
          </div>
          <div className="table-scroll">
            <table className="annex-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  {Object.keys(data.data[0] || {}).map((col) => (
                    <th key={col} style={{ textTransform: "capitalize" }}>{col.replace(/_/g, " ")}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.data.map((row: any, i: number) => (
                  <tr key={i}>
                    {Object.values(row).map((val: any, j: number) => (
                      <td key={j} style={{ textAlign: typeof val === "number" ? "center" : "left" }}>{val}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Simple bar chart */}
          <div style={{ marginTop: 16, display: "flex", alignItems: "flex-end", gap: 4, height: 120 }}>
            {data.data.map((row: any, i: number) => {
              const val = row.total || row.count || 0;
              const max = Math.max(...data.data.map((r: any) => r.total || r.count || 0));
              const height = max ? (val / max) * 100 : 0;
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <div style={{ fontSize: 10, fontWeight: 700 }}>{val}</div>
                  <div style={{
                    width: "100%", maxWidth: 40, height: `${height}%`,
                    background: "#006233", borderRadius: "4px 4px 0 0",
                    minHeight: 2,
                  }} />
                  <div style={{ fontSize: 9, color: "var(--text-soft, #526175)", textAlign: "center", maxWidth: 60, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {row.group}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
