"use client";

import { useState, useEffect, useCallback } from "react";

const DIMS = [
  { value: "secteur", label: "Secteur" },
  { value: "province", label: "Province" },
  { value: "mois", label: "Mois" },
  { value: "statut", label: "Statut" },
];

const METRICS = [
  { value: "count", label: "Nombre" },
  { value: "avg_days", label: "Delai moyen (jours)" },
];

export default function PivotPage() {
  const [rows, setRows] = useState("secteur");
  const [cols, setCols] = useState("statut");
  const [metric, setMetric] = useState("count");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/pivot?rows=${rows}&cols=${cols}&metric=${metric}`);
      if (res.ok) setData(await res.json());
    } catch {}
    setLoading(false);
  }, [rows, cols, metric]);

  useEffect(() => {
    load();
  }, [load]);

  const getColor = (val: number, max: number) => {
    if (!max || !val) return "transparent";
    const intensity = Math.min(val / max, 1);
    return `rgba(0, 98, 51, ${intensity * 0.3})`;
  };

  const allValues =
    data?.data?.flatMap((r: any) => data.columns.map((c: string) => r[c] || 0)) || [];
  const maxVal = Math.max(...allValues, 1);

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 16px" }}>
        Tableau croise dynamique
      </h1>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, display: "block" }}>Lignes</label>
          <select
            value={rows}
            onChange={(e) => setRows(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid var(--line)",
              fontSize: 13,
            }}
          >
            {DIMS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, display: "block" }}>Colonnes</label>
          <select
            value={cols}
            onChange={(e) => setCols(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid var(--line)",
              fontSize: 13,
            }}
          >
            {DIMS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, display: "block" }}>Metrique</label>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid var(--line)",
              fontSize: 13,
            }}
          >
            {METRICS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {data && (
        <div
          className="chart-card"
          style={{ padding: 0, overflow: "hidden", opacity: loading ? 0.5 : 1 }}
        >
          <div className="table-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-base)" }}>
                  <th
                    style={{
                      padding: "10px 14px",
                      textAlign: "left",
                      fontSize: 12,
                      fontWeight: 700,
                      borderBottom: "2px solid var(--line)",
                    }}
                  >
                    {DIMS.find((d) => d.value === rows)?.label}
                  </th>
                  {data.columns.map((c: string) => (
                    <th
                      key={c}
                      style={{
                        padding: "10px 8px",
                        textAlign: "center",
                        fontSize: 11,
                        fontWeight: 700,
                        borderBottom: "2px solid var(--line)",
                        textTransform: "capitalize",
                      }}
                    >
                      {c}
                    </th>
                  ))}
                  {metric === "count" && (
                    <th
                      style={{
                        padding: "10px 8px",
                        textAlign: "center",
                        fontSize: 11,
                        fontWeight: 800,
                        borderBottom: "2px solid var(--line)",
                      }}
                    >
                      Total
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.data.map((row: any) => (
                  <tr key={row._row}>
                    <td
                      style={{
                        padding: "8px 14px",
                        fontSize: 13,
                        fontWeight: 600,
                        borderBottom: "1px solid var(--line)",
                      }}
                    >
                      {row._row}
                    </td>
                    {data.columns.map((c: string) => (
                      <td
                        key={c}
                        style={{
                          padding: "8px",
                          textAlign: "center",
                          fontSize: 13,
                          fontWeight: 700,
                          borderBottom: "1px solid var(--line)",
                          background: getColor(row[c] || 0, maxVal),
                        }}
                      >
                        {row[c] || "\u2014"}
                      </td>
                    ))}
                    {metric === "count" && (
                      <td
                        style={{
                          padding: "8px",
                          textAlign: "center",
                          fontSize: 13,
                          fontWeight: 800,
                          borderBottom: "1px solid var(--line)",
                          background: "var(--bg-base)",
                        }}
                      >
                        {row._total}
                      </td>
                    )}
                  </tr>
                ))}
                {/* Totals row */}
                <tr style={{ background: "var(--bg-base)" }}>
                  <td style={{ padding: "8px 14px", fontSize: 13, fontWeight: 800 }}>
                    {data.totals._row}
                  </td>
                  {data.columns.map((c: string) => (
                    <td
                      key={c}
                      style={{ padding: "8px", textAlign: "center", fontSize: 13, fontWeight: 800 }}
                    >
                      {data.totals[c]}
                    </td>
                  ))}
                  {metric === "count" && (
                    <td
                      style={{ padding: "8px", textAlign: "center", fontSize: 13, fontWeight: 800 }}
                    >
                      {data.totals._total}
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
