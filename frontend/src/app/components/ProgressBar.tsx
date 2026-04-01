interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercent?: boolean;
  color?: string;
  height?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showPercent = true,
  color,
  height = "8px",
}: ProgressBarProps) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  const rounded = Math.round(pct);

  // Auto color based on value
  const barColor = color || (pct >= 80 ? "#059669" : pct >= 50 ? "#d97706" : "#dc2626");

  return (
    <div>
      {(label || showPercent) && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem", fontSize: "0.78rem" }}>
          {label && <span style={{ fontWeight: 500, color: "var(--text-primary, #1f2937)" }}>{label}</span>}
          {showPercent && <span style={{ color: "var(--text-secondary, #6b7280)", fontWeight: 600 }}>{rounded}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={rounded}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || `${rounded}%`}
        style={{
          width: "100%",
          height,
          borderRadius: "999px",
          background: "var(--border-color, #e5e7eb)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: "999px",
            background: barColor,
            transition: "width 400ms ease-out",
          }}
        />
      </div>
    </div>
  );
}
