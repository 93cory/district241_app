"use client";

import { useState, useEffect } from "react";

const PROVINCES = [
  "estuaire",
  "haut_ogooue",
  "moyen_ogooue",
  "ngounie",
  "nyanga",
  "ogooue_ivindo",
  "ogooue_lolo",
  "ogooue_maritime",
  "woleu_ntem",
];

export default function GovernorPage() {
  const [province, setProvince] = useState("estuaire");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/pnpi/dashboard/province-benchmark`).then((r) => r.json()),
      fetch(`/api/heatmap/non-conformites`).then((r) => r.json()),
    ])
      .then(([benchmark, heatmap]) => {
        const provData = (benchmark.provinces || []).find((p: any) => p.province === province);
        const heatData = (heatmap.provinces || []).find((p: any) => p.province === province);
        setData({ benchmark: provData, heatmap: heatData });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [province]);

  const b = data?.benchmark || {};
  const h = data?.heatmap || {};

  return (
    <div style={{ padding: "24px 32px", maxWidth: 900, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Dashboard Provincial</h1>
          <p style={{ color: "var(--text-soft)", fontSize: 13, margin: 0 }}>
            Vue dediee par province pour le gouverneur.
          </p>
        </div>
        <select
          value={province}
          onChange={(e) => setProvince(e.target.value)}
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            border: "1.5px solid var(--line)",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          {PROVINCES.map((p) => (
            <option key={p} value={p}>
              {p.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 32, color: "var(--text-soft)" }}>
          Chargement...
        </div>
      )}

      {data && !loading && (
        <>
          {/* Score */}
          <div
            className="chart-card"
            style={{ padding: 24, textAlign: "center", marginBottom: 16 }}
          >
            <div
              style={{
                fontSize: 48,
                fontWeight: 800,
                color: b.score >= 70 ? "#006233" : b.score >= 45 ? "#d97706" : "#b42318",
              }}
            >
              {b.score || 0}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-soft)" }}>
              Score composite provincial
            </div>
          </div>

          {/* KPIs */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 10,
              marginBottom: 16,
            }}
          >
            {[
              { label: "Operateurs", value: b.operateurs || 0, color: "#051B36" },
              { label: "ATIs", value: b.atis || 0, color: "#0c7eb4" },
              { label: "Approuves", value: b.approuves || 0, color: "#006233" },
              { label: "En cours", value: b.en_cours || 0, color: "#d97706" },
              { label: "Inspections", value: b.inspections || 0, color: "#7c3aed" },
              { label: "Conformes", value: b.conformes || 0, color: "#059669" },
              {
                label: "En retard SLA",
                value: b.overdue || 0,
                color: b.overdue > 0 ? "#b42318" : "#006233",
              },
              { label: "Delai moyen", value: `${b.avg_days || 0}j`, color: "#d97706" },
            ].map((k) => (
              <div
                key={k.label}
                className="chart-card"
                style={{ padding: "12px 14px", textAlign: "center" }}
              >
                <div style={{ fontSize: 20, fontWeight: 800, color: k.color }}>{k.value}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-soft)" }}>
                  {k.label}
                </div>
              </div>
            ))}
          </div>

          {/* Conformity */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="chart-card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 10px" }}>
                Taux d{"'"}approbation
              </h3>
              <div style={{ fontSize: 36, fontWeight: 800, color: "#006233" }}>
                {b.approval_rate || 0}%
              </div>
            </div>
            <div className="chart-card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 10px" }}>
                Taux de conformite
              </h3>
              <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: "#006233" }}>
                  {b.conformity_rate || 0}%
                </div>
                {h.non_conforme > 0 && (
                  <span
                    style={{
                      padding: "3px 8px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      background: "#fef2f2",
                      color: "#b42318",
                    }}
                  >
                    {h.non_conforme} non-conforme(s)
                  </span>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
