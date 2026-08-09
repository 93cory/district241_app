import { redirect } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { fetchAnalyticsCockpit } from "../../../lib/api";
import { fetchBackendProfile } from "../../../lib/backend";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["admin", "ministre", "directeur"]);

const GRADE_COLORS: Record<string, string> = {
  A: "#006233",
  B: "#0c7eb4",
  C: "#b45309",
  D: "#b42318",
};

const TONE_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  positive: { color: "#006233", bg: "#dcfce7", label: "Favorable" },
  warning: { color: "#b45309", bg: "#fef3c7", label: "À surveiller" },
  critical: { color: "#b42318", bg: "#fef2f2", label: "Prioritaire" },
};

const formatNumber = (value: number | undefined) => Number(value ?? 0).toLocaleString("fr-FR");
const formatMoney = (value: number | undefined) => `${formatNumber(Math.round(Number(value ?? 0) / 1_000_000))} M FCFA`;

export default async function AnalytiquePage() {
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).some((role) => ALLOWED.has(role))) redirect("/connexion");
  } catch {
    redirect("/connexion");
  }

  const data = await fetchAnalyticsCockpit();
  const gradeColor = GRADE_COLORS[data.grade] || "#526175";

  return (
    <section className="section">
      <p style={{ margin: 0, color: "#009440", fontWeight: 900 }}>FAM-ANA-001 · BI, ANALYTIQUE & IA</p>
      <h1 style={{ margin: "0.25rem 0 0", color: "#003F8F" }}>Cockpit analytique national PNPI</h1>
      <p style={{ color: "#4b5563", maxWidth: 1000 }}>{data.lecture_executive}</p>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 2fr", gap: "1rem" }}>
        <Panel title="Score analytique">
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ ...scoreBadgeStyle, background: `${gradeColor}14`, borderColor: gradeColor, color: gradeColor }}>
              {data.grade}
            </div>
            <div>
              <div style={{ fontSize: "2.2rem", fontWeight: 950, color: gradeColor }}>
                {data.score_analytique}/100
              </div>
              <p style={{ margin: 0, color: "#6b7280" }}>
                Données, indicateurs, alertes, tendances et aide à la décision.
              </p>
            </div>
          </div>
        </Panel>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: "0.75rem" }}>
          <Kpi label="Opérateurs" value={formatNumber(data.stats.operateurs)} color="#003F8F" />
          <Kpi label="ATI" value={formatNumber(data.stats.atis)} color="#009440" />
          <Kpi label="Inspections" value={formatNumber(data.stats.inspections)} color="#b45309" />
          <Kpi label="Déclarations ONI" value={formatNumber(data.stats.declarations_oni)} color="#0f766e" />
          <Kpi label="Investissements" value={formatMoney(data.stats.investissement_fcfa)} color="#7c3aed" />
          <Kpi label="Alertes" value={formatNumber(data.stats.alertes)} color="#be123c" />
        </div>
      </div>

      <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "0.75rem" }}>
        {data.insight_cards.map((card) => {
          const style = TONE_STYLES[card.tone] || TONE_STYLES.warning;
          return (
            <div key={card.title} className="chart-card" style={{ padding: "1rem", borderTop: `4px solid ${style.color}` }}>
              <span style={{ ...badgeStyle, color: style.color, background: style.bg }}>{style.label}</span>
              <div style={{ marginTop: "0.65rem", fontSize: "1.65rem", color: style.color, fontWeight: 950 }}>
                {card.value}
              </div>
              <strong style={{ color: "#111827" }}>{card.title}</strong>
              <p style={{ margin: "0.3rem 0 0", color: "#6b7280", fontSize: "0.84rem" }}>{card.detail}</p>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
        <Panel title="Maturité analytique">
          {data.scores.map((score) => (
            <ProgressLine key={score.label} label={score.label} score={score.score} hint={score.status} />
          ))}
        </Panel>

        <Panel title="Couches BI / IA">
          <div style={{ display: "grid", gap: "0.65rem" }}>
            {data.analytics_layers.map((layer) => (
              <div key={layer.layer} style={boxStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                  <strong style={{ color: "#111827" }}>{layer.layer}</strong>
                  <span style={{ ...badgeStyle, color: layer.status === "actif" ? "#006233" : "#b45309", background: layer.status === "actif" ? "#dcfce7" : "#fef3c7" }}>
                    {layer.status} · {layer.score}%
                  </span>
                </div>
                <p style={{ margin: "0.3rem 0 0", color: "#6b7280", fontSize: "0.83rem" }}>{layer.detail}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1rem" }}>
        <Panel title="Secteurs moteurs">
          <div style={{ display: "grid", gap: "0.7rem" }}>
            {data.top_sectors.map((sector) => (
              <div key={sector.secteur} style={boxStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                  <strong style={{ color: "#111827" }}>{sector.secteur}</strong>
                  <span style={{ color: "#003F8F", fontWeight: 950 }}>{sector.score}/100</span>
                </div>
                <p style={{ margin: "0.35rem 0", color: "#4b5563", fontSize: "0.84rem" }}>
                  {sector.operateurs} opérateur(s), {sector.atis} ATI, production {formatNumber(Math.round(sector.production))}
                </p>
                <p style={{ margin: 0, color: "#6b7280", fontSize: "0.78rem" }}>
                  Investissement : {formatMoney(sector.investissement_fcfa)}
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Provinces à fort signal">
          <div style={{ display: "grid", gap: "0.7rem" }}>
            {data.top_provinces.map((province) => (
              <div key={province.province} style={boxStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                  <strong style={{ color: "#111827" }}>{province.province}</strong>
                  <span style={{ color: "#009440", fontWeight: 950 }}>{province.score}/100</span>
                </div>
                <p style={{ margin: "0.35rem 0 0", color: "#6b7280", fontSize: "0.84rem" }}>
                  {province.operateurs} opérateur(s), {province.atis} ATI, {province.inspections} inspection(s)
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Sources décisionnelles consolidées" style={{ marginTop: "1rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "0.75rem" }}>
          {data.data_sources.map((source) => (
            <div key={source.name} style={boxStyle}>
              <strong style={{ color: "#003F8F" }}>{source.name}</strong>
              <div style={{ margin: "0.35rem 0", color: "#111827", fontWeight: 950 }}>{formatNumber(source.records)} enregistrement(s)</div>
              <p style={{ margin: "0.2rem 0", color: "#6b7280", fontSize: "0.8rem" }}>Fraîcheur : {source.freshness}</p>
              <p style={{ margin: 0, color: "#4b5563", fontSize: "0.82rem" }}>{source.usage}</p>
            </div>
          ))}
        </div>
      </Panel>

      <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
        <Panel title="Questions ministre auxquelles le PNPI répond">
          <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "#374151", lineHeight: 1.75 }}>
            {data.decision_questions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Panel>

        <Panel title="Recommandations prioritaires">
          <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "#374151", lineHeight: 1.75 }}>
            {data.recommendations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Panel>
      </div>
    </section>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="chart-card" style={{ padding: "1rem" }}>
      <div style={{ color: "#6b7280", fontSize: "0.72rem", fontWeight: 900, textTransform: "uppercase" }}>{label}</div>
      <div style={{ color, fontSize: "1.35rem", fontWeight: 950, marginTop: "0.25rem" }}>{value}</div>
    </div>
  );
}

function Panel({ title, children, style }: { title: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="chart-card" style={{ padding: "1rem", ...style }}>
      <h2 style={{ margin: "0 0 0.75rem", color: "#003F8F", fontSize: "1.05rem" }}>{title}</h2>
      {children}
    </div>
  );
}

function ProgressLine({ label, score, hint }: { label: string; score: number; hint: string }) {
  const color = score >= 80 ? "#006233" : score >= 60 ? "#b45309" : "#b42318";
  return (
    <div style={{ padding: "0.65rem 0", borderBottom: "1px solid #f3f4f6" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
        <div>
          <strong style={{ color: "#111827" }}>{label}</strong>
          <p style={{ margin: "0.18rem 0 0", color: "#6b7280", fontSize: "0.78rem" }}>{hint}</p>
        </div>
        <span style={{ color, fontWeight: 950 }}>{score}%</span>
      </div>
      <div style={{ height: 7, borderRadius: 999, background: "#edf2f7", marginTop: "0.45rem", overflow: "hidden" }}>
        <div style={{ width: `${Math.min(score, 100)}%`, height: "100%", background: color }} />
      </div>
    </div>
  );
}

const scoreBadgeStyle: CSSProperties = {
  width: 92,
  height: 92,
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  border: "5px solid",
  fontSize: "2rem",
  fontWeight: 950,
};

const badgeStyle: CSSProperties = {
  borderRadius: 999,
  padding: "0.28rem 0.55rem",
  fontSize: "0.72rem",
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const boxStyle: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: "0.75rem",
  background: "#f8fafc",
};
