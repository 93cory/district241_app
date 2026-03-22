interface IndexData {
  index: number;
  max: number;
  breakdown: Record<string, { score: number; max: number; detail: string }>;
}

const LABELS: Record<string, string> = {
  approbation: "Taux d'approbation",
  couverture_sectorielle: "Couverture sectorielle",
  conformite: "Conformite inspections",
  densite_operateurs: "Densite operateurs",
  dynamisme: "Dynamisme soumissions",
};

const COLORS = ["#006233", "#0c7eb4", "#f2b800", "#0d3f78", "#b42318"];

export function TransformationIndex({ data }: { data: IndexData }) {
  const color = data.index >= 70 ? "#006233" : data.index >= 50 ? "#f2b800" : "#b42318";
  const label = data.index >= 70 ? "BON" : data.index >= 50 ? "MOYEN" : "INSUFFISANT";

  return (
    <div className="chart-card" style={{ padding: 24, textAlign: "center" }}>
      <h3 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: "var(--text-soft, #526175)" }}>
        Indice National de Transformation Locale
      </h3>

      {/* Circular gauge */}
      <div style={{ position: "relative", width: 160, height: 160, margin: "16px auto" }}>
        <svg viewBox="0 0 160 160" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="80" cy="80" r="70" fill="none" stroke="var(--line, #e5e7eb)" strokeWidth="12" />
          <circle
            cx="80" cy="80" r="70" fill="none"
            stroke={color} strokeWidth="12"
            strokeDasharray={`${(data.index / 100) * 440} 440`}
            strokeLinecap="round"
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 36, fontWeight: 800, color }}>{data.index}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: 1 }}>{label}</span>
        </div>
      </div>

      {/* Breakdown bars */}
      <div style={{ textAlign: "left", marginTop: 16 }}>
        {Object.entries(data.breakdown).map(([key, val], i) => (
          <div key={key} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
              <span style={{ fontWeight: 600 }}>{LABELS[key] || key}</span>
              <span style={{ color: "var(--text-soft, #526175)" }}>{val.score}/{val.max}</span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: "var(--line, #e5e7eb)" }}>
              <div style={{
                height: "100%", borderRadius: 4,
                background: COLORS[i % COLORS.length],
                width: `${(val.score / val.max) * 100}%`,
                transition: "width 500ms ease",
              }} />
            </div>
            <div style={{ fontSize: 10, color: "var(--text-soft, #526175)", marginTop: 2 }}>{val.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
