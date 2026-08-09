import { redirect } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { fetchDataQualityCockpit } from "../../../lib/api";
import { fetchBackendProfile } from "../../../lib/backend";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["admin", "ministre", "directeur"]);

const STATUS_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  ok: { color: "#006233", bg: "#dcfce7", label: "Maîtrisé" },
  warning: { color: "#b45309", bg: "#fef3c7", label: "À surveiller" },
  critical: { color: "#b42318", bg: "#fef2f2", label: "Prioritaire" },
};

const GRADE_COLORS: Record<string, string> = {
  A: "#006233",
  B: "#0c7eb4",
  C: "#b45309",
  D: "#e65100",
  E: "#b42318",
};

const formatNumber = (value: number | undefined) => Number(value ?? 0).toLocaleString("fr-FR");
const normalizeLabel = (value: string) => value.replaceAll("_", " ");

export default async function DataQualityPage() {
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).some((role) => ALLOWED.has(role))) redirect("/connexion");
  } catch {
    redirect("/connexion");
  }

  const data = await fetchDataQualityCockpit();
  const gradeColor = GRADE_COLORS[data.grade] || "#526175";

  return (
    <section className="section">
      <p style={{ margin: 0, color: "#009440", fontWeight: 900 }}>
        DOMAINE TRANSVERSAL · GOUVERNANCE DES DONNÉES
      </p>
      <h1 style={{ margin: "0.25rem 0 0", color: "#003F8F" }}>Cockpit qualité et fiabilité des données PNPI</h1>
      <p style={{ color: "#4b5563", maxWidth: 960 }}>{data.lecture_executive}</p>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 2fr", gap: "1rem", alignItems: "stretch" }}>
        <Panel title="Score national de qualité">
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div
              style={{
                width: 92,
                height: 92,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                background: `${gradeColor}14`,
                border: `5px solid ${gradeColor}`,
                color: gradeColor,
                fontSize: "2rem",
                fontWeight: 950,
              }}
            >
              {data.grade}
            </div>
            <div>
              <div style={{ fontSize: "2.2rem", fontWeight: 950, color: gradeColor }}>
                {data.global_score}/100
              </div>
              <p style={{ margin: 0, color: "#6b7280" }}>
                Données déclarées, validées, rattachées et exploitables pour décision.
              </p>
            </div>
          </div>
        </Panel>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: "0.75rem" }}>
          <Kpi label="Opérateurs" value={formatNumber(data.stats.operateurs)} color="#003F8F" />
          <Kpi label="ATI" value={formatNumber(data.stats.atis)} color="#009440" />
          <Kpi label="Inspections" value={formatNumber(data.stats.inspections)} color="#b45309" />
          <Kpi label="Documents" value={formatNumber(data.stats.documents)} color="#7c3aed" />
          <Kpi label="Déclarations ONI" value={formatNumber(data.stats.declarations_oni)} color="#0f766e" />
          <Kpi label="Éléments RIN" value={formatNumber(data.stats.rin_elements)} color="#be123c" />
        </div>
      </div>

      <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
        <Panel title="Scores par domaine">
          {data.domains.map((domain) => (
            <ProgressLine
              key={domain.domain}
              label={domain.domain}
              score={domain.score}
              hint={`${domain.checks} contrôle(s) qualité`}
              status={domain.status}
            />
          ))}
        </Panel>

        <Panel title="Actions prioritaires">
          <div style={{ display: "grid", gap: "0.65rem" }}>
            {data.priority_actions.map((item) => (
              <div key={`${item.domain}-${item.title}`} style={boxStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                  <strong style={{ color: "#111827" }}>{item.title}</strong>
                  <span style={{ color: "#b42318", fontWeight: 900 }}>{item.score}/100</span>
                </div>
                <p style={{ margin: "0.25rem 0 0", color: "#6b7280", fontSize: "0.82rem" }}>
                  {item.domain} · {item.action}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Contrôles de qualité détaillés" style={{ marginTop: "1rem" }}>
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {data.checks.map((check) => (
            <div key={`${check.domain}-${check.name}`} style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: "0.9rem" }}>
              <ProgressLine
                label={check.name}
                score={check.score}
                hint={`${check.conformes}/${check.total} conforme(s) · ${check.domain}`}
                status={check.status}
              />
              <p style={{ margin: "0.45rem 0 0", color: "#4b5563", fontSize: "0.86rem" }}>{check.description}</p>
              <p style={{ margin: "0.35rem 0 0", color: "#6b7280", fontSize: "0.8rem" }}>
                Impact : {check.impact}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
        <Panel title="Anomalies détectées">
          {data.anomalies.length === 0 ? (
            <p style={{ margin: 0, color: "#006233" }}>Aucune anomalie prioritaire détectée.</p>
          ) : (
            <div style={{ display: "grid", gap: "0.65rem" }}>
              {data.anomalies.map((item) => {
                const style = STATUS_STYLES[item.severity] || STATUS_STYLES.warning;
                return (
                  <div key={`${item.domain}-${item.title}`} style={{ ...boxStyle, borderColor: style.bg }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                      <strong style={{ color: style.color }}>{item.title}</strong>
                      <span style={{ ...badgeStyle, background: style.bg, color: style.color }}>
                        {formatNumber(item.count)}
                      </span>
                    </div>
                    <p style={{ margin: "0.25rem 0", color: "#4b5563", fontSize: "0.83rem" }}>{item.detail}</p>
                    <p style={{ margin: 0, color: "#6b7280", fontSize: "0.78rem" }}>Action : {item.action}</p>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel title="Lignée des données">
          <div style={{ display: "grid", gap: "0.55rem" }}>
            {data.lineage.map((item) => (
              <div key={item.objet} style={{ paddingBottom: "0.55rem", borderBottom: "1px solid #f3f4f6" }}>
                <strong style={{ color: "#111827" }}>{item.objet}</strong>
                <p style={{ margin: "0.2rem 0", color: "#6b7280", fontSize: "0.82rem" }}>
                  Source : <code>{item.source}</code>
                </p>
                <p style={{ margin: 0, color: "#4b5563", fontSize: "0.82rem" }}>{item.usage}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Principes de gouvernance à présenter" style={{ marginTop: "1rem" }}>
        <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "#374151", lineHeight: 1.75 }}>
          {data.governance_principles.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Panel>
    </section>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="chart-card" style={{ padding: "1rem" }}>
      <div style={{ color: "#6b7280", fontSize: "0.72rem", fontWeight: 900, textTransform: "uppercase" }}>
        {label}
      </div>
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

function ProgressLine({ label, score, hint, status }: { label: string; score: number; hint: string; status: string }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.warning;
  return (
    <div style={{ padding: "0.55rem 0", borderBottom: "1px solid #f3f4f6" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
        <div>
          <strong style={{ color: "#111827" }}>{normalizeLabel(label)}</strong>
          <p style={{ margin: "0.18rem 0 0", color: "#6b7280", fontSize: "0.78rem" }}>{hint}</p>
        </div>
        <span style={{ ...badgeStyle, color: style.color, background: style.bg }}>
          {style.label} · {score}%
        </span>
      </div>
      <div style={{ height: 7, borderRadius: 999, background: "#edf2f7", marginTop: "0.45rem", overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: style.color }} />
      </div>
    </div>
  );
}

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
