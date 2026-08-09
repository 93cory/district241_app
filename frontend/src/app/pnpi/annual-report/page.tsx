"use client";

import { useState, useEffect, useCallback } from "react";

export default function AnnualReportPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pnpi/dashboard/annual-report/${year}`);
      if (res.ok) setData(await res.json());
    } catch {}
    setLoading(false);
  }, [year]);

  useEffect(() => {
    load();
  }, [load]);

  const s = data?.summary || {};
  const MONTH_NAMES = [
    "Jan",
    "Fev",
    "Mar",
    "Avr",
    "Mai",
    "Jun",
    "Jul",
    "Aou",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1000, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Bilan annuel {year}</h1>
          <p style={{ color: "var(--text-soft, #526175)", fontSize: 13, margin: 0 }}>
            Recapitulatif d'activite de la plateforme PNPI.
          </p>
        </div>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            border: "1.5px solid var(--line, #dce4ef)",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          {Array.from({ length: 5 }, (_, i) => currentYear - i).map((y) => (
            <option key={y} value={y}>
              {y}
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
          {/* KPI grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 12,
              marginBottom: 20,
            }}
          >
            {[
              { label: "Soumissions", value: s.soumissions, color: "#051B36" },
              { label: "Approuves", value: s.approuves, color: "#006233" },
              { label: "Rejetes", value: s.rejetes, color: "#b42318" },
              { label: "Taux appro.", value: `${s.taux_approbation}%`, color: "#006233" },
              { label: "Inspections", value: s.inspections, color: "#7c3aed" },
              { label: "Taux conf.", value: `${s.taux_conformite}%`, color: "#0c7eb4" },
              { label: "Delai moyen", value: `${s.delai_moyen}j`, color: "#d97706" },
              { label: "Respect SLA", value: `${s.taux_sla}%`, color: "#006233" },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="chart-card"
                style={{ padding: "14px 16px", textAlign: "center" }}
              >
                <div style={{ fontSize: 24, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-soft, #526175)" }}>
                  {kpi.label}
                </div>
              </div>
            ))}
          </div>

          {/* Monthly chart */}
          <div className="chart-card pnpi-bar-chart" style={{ marginBottom: 16 }}>
            <h3 className="pnpi-card-subtitle">Evolution mensuelle</h3>
            <div className="pnpi-bars pnpi-bars--tall">
              {(data.monthly || []).map((m: any) => {
                const max = Math.max(
                  ...(data.monthly || []).map((x: any) => x.soumissions || 0),
                  1,
                );
                const h = (m.soumissions / max) * 100;
                return (
                  <div key={m.month} className="pnpi-bar">
                    <span className="pnpi-bar-value">{m.soumissions}</span>
                    <div className="pnpi-bar-fill" style={{ height: h, minHeight: 2 }} />
                    <span className="pnpi-bar-label">{m.month}</span>
                    <div className="pnpi-bar-tooltip" role="tooltip">
                      <strong>{m.month}</strong>
                      <span>
                        {m.soumissions} soumissions
                        {m.approuves != null ? ` · ${m.approuves} approuves` : ""}
                        {m.rejetes != null ? ` · ${m.rejetes} rejetes` : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Sectors */}
            <div className="chart-card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>Par secteur</h3>
              {(data.sectors || []).map((s: any) => (
                <div
                  key={s.secteur}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "4px 0",
                    borderBottom: "1px solid var(--line, #eee)",
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>
                    {s.secteur}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{s.count}</span>
                </div>
              ))}
            </div>
            {/* Provinces */}
            <div className="chart-card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>Par province</h3>
              {(data.provinces || []).map((p: any) => (
                <div
                  key={p.province}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "4px 0",
                    borderBottom: "1px solid var(--line, #eee)",
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{p.province}</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{p.count}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
