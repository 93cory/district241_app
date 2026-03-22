"use client";

import { useState, useEffect } from "react";

interface EndpointStat {
  endpoint: string; count: number; errors: number; avg_ms: number;
}

export default function ApiUsagePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/metrics/usage")
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 32, textAlign: "center" }}>Chargement...</div>;
  if (!data) return <div style={{ padding: 32 }}>Erreur de chargement.</div>;

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 20px" }}>Utilisation API</h1>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Requetes totales", value: data.total_requests.toLocaleString("fr-FR"), color: "#051B36" },
          { label: "Erreurs", value: data.total_errors, color: "#b42318" },
          { label: "Taux erreur", value: `${data.error_rate}%`, color: data.error_rate > 5 ? "#b42318" : "#006233" },
          { label: "Uptime", value: `${data.uptime_hours}h`, color: "#006233" },
        ].map(k => (
          <div key={k.label} className="chart-card" style={{ padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-soft)" }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Endpoints table */}
      <div className="chart-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-scroll">
          <table className="annex-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Endpoint</th>
                <th style={{ textAlign: "center" }}>Requetes</th>
                <th style={{ textAlign: "center" }}>Erreurs</th>
                <th style={{ textAlign: "center" }}>Latence moy.</th>
                <th style={{ textAlign: "center" }}>Volume</th>
              </tr>
            </thead>
            <tbody>
              {(data.endpoints || []).map((ep: EndpointStat) => {
                const maxCount = Math.max(...data.endpoints.map((e: any) => e.count), 1);
                const pct = (ep.count / maxCount) * 100;
                return (
                  <tr key={ep.endpoint}>
                    <td>
                      <code style={{ fontSize: 11, fontWeight: 600 }}>{ep.endpoint}</code>
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>{ep.count}</td>
                    <td style={{ textAlign: "center" }}>
                      {ep.errors > 0 ? (
                        <span style={{ color: "#b42318", fontWeight: 700 }}>{ep.errors}</span>
                      ) : <span style={{ color: "#006233" }}>0</span>}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span style={{
                        fontWeight: 700,
                        color: ep.avg_ms > 500 ? "#b42318" : ep.avg_ms > 200 ? "#d97706" : "#006233",
                      }}>{ep.avg_ms}ms</span>
                    </td>
                    <td style={{ width: 120 }}>
                      <div style={{ height: 6, borderRadius: 3, background: "var(--line, #e5e7eb)" }}>
                        <div style={{ height: "100%", borderRadius: 3, width: `${pct}%`, background: "#006233" }} />
                      </div>
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
