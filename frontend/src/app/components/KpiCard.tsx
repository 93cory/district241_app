interface KPICardProps {
  /** Nouveau nom prefere */
  label?: string;
  /** Alias retrocompat */
  title?: string;
  value: string | number;
  /** Nouveau nom prefere */
  sublabel?: string;
  /** Alias retrocompat */
  detail?: string;
  trend?: { value: number; label?: string };
  icon?: React.ReactNode;
  /** Tonalite institutionnelle : primary (bleu) | success (vert) | neutral | accent (ambre) */
  tone?: "primary" | "success" | "neutral" | "accent";
}

export function KPICard({
  label,
  title,
  value,
  sublabel,
  detail,
  trend,
  icon,
  tone = "primary",
}: KPICardProps) {
  const finalLabel = label ?? title ?? "";
  const finalSub = sublabel ?? detail ?? "";
  const trendDir: "up" | "down" | "flat" | undefined = trend
    ? trend.value > 0 ? "up" : trend.value < 0 ? "down" : "flat"
    : undefined;
  const trendArrow = trendDir === "up" ? "↑" : trendDir === "down" ? "↓" : trendDir === "flat" ? "→" : "";

  return (
    <article className={`kpi-card kpi-card--${tone}`}>
      <div className="kpi-card-head">
        <span className="kpi-card-label">{finalLabel}</span>
        {icon ? <span className="kpi-card-icon">{icon}</span> : null}
      </div>

      <div className="kpi-card-value">
        {typeof value === "number" ? value.toLocaleString("fr-FR") : value}
      </div>

      <div className="kpi-card-foot">
        {finalSub ? <span className="kpi-card-sub">{finalSub}</span> : <span />}
        {trend ? (
          <span className="kpi-card-trend" data-dir={trendDir}>
            {trendArrow} {Math.abs(trend.value)}%{trend.label ? ` ${trend.label}` : ""}
          </span>
        ) : null}
      </div>
    </article>
  );
}

export const KpiCard = KPICard;
