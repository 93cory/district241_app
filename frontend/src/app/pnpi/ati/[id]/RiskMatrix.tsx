"use client";

import { useState, useEffect } from "react";

interface RiskFactor {
  name: string; score: number; max: number; detail: string;
}

interface RiskData {
  risk_score: number; max_score: number; risk_level: string;
  color: string; factors: RiskFactor[];
}

export function RiskMatrix({ atiId }: { atiId: string }) {
  const [data, setData] = useState<RiskData | null>(null);

  useEffect(() => {
    fetch(`/api/pnpi/ati/${atiId}/risk`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && !d.error) setData(d); })
      .catch(() => {});
  }, [atiId]);

  if (!data) return null;

  return (
    <div style={{
      padding: "16px 18px", borderRadius: 14,
      background: `${data.color}06`, border: `2px solid ${data.color}25`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>Evaluation des risques</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            padding: "3px 12px", borderRadius: 8, fontSize: 12, fontWeight: 800,
            background: `${data.color}15`, color: data.color, textTransform: "capitalize",
          }}>
            {data.risk_level}
          </span>
          <span style={{ fontSize: 20, fontWeight: 800, color: data.color }}>
            {data.risk_score}/{data.max_score}
          </span>
        </div>
      </div>

      {data.factors.map(f => (
        <div key={f.name} style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
            <span style={{ fontWeight: 600 }}>{f.name}</span>
            <span style={{ color: "var(--text-soft, #9ca3af)" }}>{f.score}/{f.max}</span>
          </div>
          <div style={{ height: 5, borderRadius: 3, background: "var(--line, #e5e7eb)" }}>
            <div style={{
              height: "100%", borderRadius: 3,
              width: `${(f.score / f.max) * 100}%`,
              background: f.score / f.max >= 0.7 ? "#b42318" : f.score / f.max >= 0.4 ? "#d97706" : "#006233",
            }} />
          </div>
          <div style={{ fontSize: 10, color: "var(--text-soft, #9ca3af)", marginTop: 1 }}>{f.detail}</div>
        </div>
      ))}
    </div>
  );
}
