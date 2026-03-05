"use client";

const COLORS = ["#003F8F", "#009440", "#d97706", "#7c3aed", "#0284c7", "#ef4444", "#10b981", "#f59e0b", "#6b7280"];

interface ProvinceData {
  province: string;
  nb_operateurs: number;
  nb_atis_actifs: number;
}

export default function ProvinceDonut({ provinces }: { provinces: ProvinceData[] }) {
  const total = provinces.reduce((s, p) => s + p.nb_atis_actifs, 0);
  if (total === 0) return <p style={{ color: "#9ca3af", fontSize: "0.82rem" }}>Aucun ATI actif.</p>;

  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 90;
  const innerR = 55;

  let cumAngle = -Math.PI / 2;
  const arcs = provinces
    .filter((p) => p.nb_atis_actifs > 0)
    .map((p, i) => {
      const frac = p.nb_atis_actifs / total;
      const startAngle = cumAngle;
      const endAngle = cumAngle + frac * 2 * Math.PI;
      cumAngle = endAngle;

      const largeArc = frac > 0.5 ? 1 : 0;
      const x1o = cx + outerR * Math.cos(startAngle);
      const y1o = cy + outerR * Math.sin(startAngle);
      const x2o = cx + outerR * Math.cos(endAngle);
      const y2o = cy + outerR * Math.sin(endAngle);
      const x1i = cx + innerR * Math.cos(endAngle);
      const y1i = cy + innerR * Math.sin(endAngle);
      const x2i = cx + innerR * Math.cos(startAngle);
      const y2i = cy + innerR * Math.sin(startAngle);

      const d = [
        `M ${x1o} ${y1o}`,
        `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2o} ${y2o}`,
        `L ${x1i} ${y1i}`,
        `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x2i} ${y2i}`,
        "Z",
      ].join(" ");

      return { d, color: COLORS[i % COLORS.length], province: p.province, count: p.nb_atis_actifs, pct: Math.round(frac * 100) };
    });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {arcs.map((arc) => (
          <path key={arc.province} d={arc.d} fill={arc.color} stroke="white" strokeWidth="1.5" />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="#1f2937" fontWeight="800" fontSize="22">{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#6b7280" fontSize="10">ATIs actifs</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.78rem" }}>
        {arcs.map((arc) => (
          <div key={arc.province} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: arc.color, flexShrink: 0 }} />
            <span style={{ color: "#374151" }}>{arc.province.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</span>
            <span style={{ color: "#9ca3af", marginLeft: "auto", fontWeight: 600 }}>{arc.count} ({arc.pct}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
