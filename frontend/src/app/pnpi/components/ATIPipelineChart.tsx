"use client";

import type { ATIPipelineStats } from "../../../lib/api";

const STATUTS: { key: keyof ATIPipelineStats; label: string; color: string }[] = [
  { key: "soumis", label: "Soumis", color: "#f59e0b" },
  { key: "en_instruction", label: "En instruction", color: "#3b82f6" },
  { key: "en_validation", label: "En validation", color: "#8b5cf6" },
  { key: "approuve", label: "Approuve", color: "#10b981" },
  { key: "rejete", label: "Rejete", color: "#ef4444" },
  { key: "expire", label: "Expire", color: "#6b7280" },
];

interface Props {
  pipeline: ATIPipelineStats;
}

const ATIPipelineChart = ({ pipeline }: Props) => {
  const total = Object.values(pipeline).reduce((a, b) => a + (b as number), 0);
  const actifs = pipeline.soumis + pipeline.en_instruction + pipeline.en_validation;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#003F8F" }}>{total}</div>
          <div style={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase" }}>Total ATIs</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#3b82f6" }}>{actifs}</div>
          <div style={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase" }}>En cours</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#10b981" }}>{pipeline.approuve}</div>
          <div style={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase" }}>Approuves</div>
        </div>
      </div>

      <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: "1rem" }}>
        {STATUTS.map((s) => {
          const count = pipeline[s.key] as number;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={s.key} style={{ marginBottom: "0.875rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "999px",
                      background: s.color,
                      display: "inline-block",
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: "0.875rem", color: "#374151" }}>{s.label}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>{pct}%</span>
                  <span style={{ fontWeight: 700, color: "#111827", minWidth: "24px", textAlign: "right" }}>{count}</span>
                </div>
              </div>
              <div style={{ background: "#f3f4f6", borderRadius: "999px", height: "6px", overflow: "hidden" }}>
                <div
                  style={{
                    background: s.color,
                    width: `${pct}%`,
                    height: "100%",
                    borderRadius: "999px",
                    transition: "width 0.6s ease",
                    minWidth: count > 0 ? "4px" : "0",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ATIPipelineChart;
