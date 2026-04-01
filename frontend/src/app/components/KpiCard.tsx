interface KPICardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  trend?: { value: number; label?: string };
  icon?: string;
  color?: string;
}

export function KPICard({ label, value, sublabel, trend, icon, color = "var(--primary-color, #1565c0)" }: KPICardProps) {
  const trendColor = trend ? (trend.value > 0 ? "#059669" : trend.value < 0 ? "#dc2626" : "#6b7280") : undefined;
  const trendArrow = trend ? (trend.value > 0 ? "\u2191" : trend.value < 0 ? "\u2193" : "\u2192") : "";

  return (
    <div
      style={{
        padding: "1.25rem",
        borderRadius: "12px",
        background: "var(--card-bg, #fff)",
        border: "1px solid var(--border-color, #e5e7eb)",
        display: "flex",
        flexDirection: "column",
        gap: "0.4rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: color }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: "0.78rem", fontWeight: 500, color: "var(--text-secondary, #6b7280)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
          {label}
        </span>
        {icon && <span style={{ fontSize: "1.3rem" }}>{icon}</span>}
      </div>

      <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-primary, #1f2937)", lineHeight: 1.1 }}>
        {typeof value === "number" ? value.toLocaleString("fr-FR") : value}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {sublabel && (
          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary, #9ca3af)" }}>
            {sublabel}
          </span>
        )}
        {trend && (
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: trendColor }}>
            {trendArrow} {Math.abs(trend.value)}%{trend.label ? ` ${trend.label}` : ""}
          </span>
        )}
      </div>
    </div>
  );
}
