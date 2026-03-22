interface ScoreData {
  score: number;
  grade: string;
  label: string;
  breakdown: Record<string, { score: number; max: number }>;
}

const PILLAR_LABELS: Record<string, string> = {
  ati_compliance: "Conformite ATI",
  inspection_conformity: "Inspections",
  document_completeness: "Documents",
  sla_respect: "Respect SLA",
  activity: "Activite",
};

const GRADE_COLORS: Record<string, string> = {
  A: "#006233", B: "#0c7eb4", C: "#f2b800", D: "#e65100", E: "#b42318",
};

export function ScoreCard({ data }: { data: ScoreData }) {
  const color = GRADE_COLORS[data.grade] || "#526175";

  return (
    <div className="chart-card" style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: `${color}15`, border: `3px solid ${color}`,
        }}>
          <span style={{ fontSize: 24, fontWeight: 800, color }}>{data.grade}</span>
        </div>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, color }}>{data.score}/100</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-soft, #526175)" }}>{data.label}</div>
        </div>
      </div>

      {Object.entries(data.breakdown).map(([key, val]) => (
        <div key={key} style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
            <span style={{ fontWeight: 600 }}>{PILLAR_LABELS[key] || key}</span>
            <span style={{ color: "var(--text-soft, #526175)" }}>{val.score}/{val.max}</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: "var(--line, #e5e7eb)" }}>
            <div style={{
              height: "100%", borderRadius: 3,
              background: color,
              width: `${(val.score / val.max) * 100}%`,
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}
