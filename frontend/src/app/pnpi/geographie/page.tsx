import { redirect } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { fetchGeoCockpit } from "../../../lib/api";
import { fetchBackendProfile } from "../../../lib/backend";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["admin", "ministre", "directeur", "instructeur", "inspecteur"]);

const GRADE_COLORS: Record<string, string> = {
  A: "#006233",
  B: "#0c7eb4",
  C: "#b45309",
  D: "#b42318",
};

const PRIORITY_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  haute: { color: "#b42318", bg: "#fef2f2", label: "Priorité haute" },
  normale: { color: "#b45309", bg: "#fef3c7", label: "Priorité normale" },
  veille: { color: "#526175", bg: "#f3f4f6", label: "Veille" },
};

const formatNumber = (value: number | undefined) => Number(value ?? 0).toLocaleString("fr-FR");
const formatMoney = (value: number | undefined) => `${formatNumber(Math.round(Number(value ?? 0) / 1_000_000))} M FCFA`;

export default async function GeographiePage() {
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).some((role) => ALLOWED.has(role))) redirect("/connexion");
  } catch {
    redirect("/connexion");
  }

  const cockpit = await fetchGeoCockpit();
  const gradeColor = GRADE_COLORS[cockpit.grade] || "#526175";
  const topProvinces = cockpit.provinces.slice(0, 6);

  return (
    <section className="section">
      <p style={{ margin: 0, color: "#009440", fontWeight: 900 }}>FAM-GEO-001 · SIG & CARTOGRAPHIE INDUSTRIELLE</p>
      <h1 style={{ margin: "0.25rem 0 0", color: "#003F8F" }}>Cockpit géographique national PNPI</h1>
      <p style={{ color: "#4b5563", maxWidth: 980 }}>{cockpit.lecture_executive}</p>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 2fr", gap: "1rem" }}>
        <Panel title="Score SIG">
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ ...scoreBadgeStyle, background: `${gradeColor}14`, borderColor: gradeColor, color: gradeColor }}>
              {cockpit.grade}
            </div>
            <div>
              <div style={{ fontSize: "2.2rem", fontWeight: 950, color: gradeColor }}>{cockpit.score_sig}/100</div>
              <p style={{ margin: 0, color: "#6b7280" }}>Couverture géographique, géocodage, sites, inspections et couches SIG.</p>
            </div>
          </div>
        </Panel>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: "0.75rem" }}>
          <Kpi label="Opérateurs" value={formatNumber(cockpit.stats.operateurs)} color="#003F8F" />
          <Kpi label="Géocodés" value={formatNumber(cockpit.stats.operateurs_geocodes)} color="#009440" />
          <Kpi label="Provinces" value={`${formatNumber(cockpit.stats.provinces_couvertes)}/9`} color="#0c7eb4" />
          <Kpi label="Sites" value={formatNumber(cockpit.stats.sites_industriels)} color="#7c3aed" />
          <Kpi label="Inspections" value={formatNumber(cockpit.stats.inspections)} color="#b45309" />
          <Kpi label="Investissements" value={formatMoney(cockpit.stats.montant_investissements_fcfa)} color="#0f766e" />
        </div>
      </div>

      <Panel title="Carte décisionnelle simplifiée" style={{ marginTop: "1rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "0.75rem" }}>
          {cockpit.clusters.map((cluster) => {
            const size = Math.min(70, 28 + cluster.weight * 4);
            const riskColor = cluster.risk > 0 ? "#b42318" : cluster.weight > 0 ? "#003F8F" : "#9ca3af";
            return (
              <div key={cluster.province} style={{ ...boxStyle, textAlign: "center" }}>
                <div
                  style={{
                    width: size,
                    height: size,
                    borderRadius: "50%",
                    background: `${riskColor}18`,
                    border: `3px solid ${riskColor}`,
                    color: riskColor,
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 950,
                    margin: "0 auto 0.5rem",
                  }}
                >
                  {cluster.weight}
                </div>
                <strong style={{ color: "#111827" }}>{cluster.label}</strong>
                <p style={{ margin: "0.2rem 0 0", color: "#6b7280", fontSize: "0.78rem" }}>
                  Risques conformité : {cluster.risk}
                </p>
              </div>
            );
          })}
        </div>
      </Panel>

      <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1rem" }}>
        <Panel title="Provinces prioritaires">
          <div style={{ display: "grid", gap: "0.7rem" }}>
            {topProvinces.map((province) => {
              const style = PRIORITY_STYLES[province.priorite] || PRIORITY_STYLES.normale;
              return (
                <div key={province.province} style={boxStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
                    <strong style={{ color: "#111827" }}>{province.label}</strong>
                    <span style={{ ...badgeStyle, background: style.bg, color: style.color }}>{style.label}</span>
                  </div>
                  <p style={{ margin: "0.35rem 0", color: "#4b5563", fontSize: "0.84rem" }}>
                    {province.operateurs} opérateur(s), {province.sites} site(s), {province.inspections} inspection(s), {formatMoney(province.investissements_fcfa)}
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", color: "#6b7280", fontSize: "0.78rem" }}>
                    <span>Géocodage {province.taux_geocodage}%</span>
                    <span>Non-conf. {province.taux_non_conformite}%</span>
                    <span>Pression {province.pression_industrielle}/100</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Couches SIG disponibles">
          {cockpit.layers.map((layer) => (
            <div key={layer.name} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", padding: "0.65rem 0", borderBottom: "1px solid #f3f4f6" }}>
              <div>
                <strong style={{ color: "#111827" }}>{layer.name}</strong>
                <p style={{ margin: "0.15rem 0 0", color: "#6b7280", fontSize: "0.78rem" }}>{layer.source}</p>
              </div>
              <span style={{ ...badgeStyle, background: layer.status === "actif" ? "#dcfce7" : "#f3f4f6", color: layer.status === "actif" ? "#006233" : "#526175" }}>
                {layer.status} · {formatNumber(layer.count)}
              </span>
            </div>
          ))}
        </Panel>
      </div>

      <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
        <Panel title="Exports cartographiques">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
            {cockpit.exports.map((item) => (
              <a key={item.href} href={`/api${item.href}`} className="btn-secondary">
                {item.label}
              </a>
            ))}
          </div>
        </Panel>
        <Panel title="Actions prioritaires SIG">
          <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "#374151", lineHeight: 1.75 }}>
            {cockpit.priority_actions.map((item) => (
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
