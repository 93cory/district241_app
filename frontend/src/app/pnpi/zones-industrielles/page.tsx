import { redirect } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { fetchZonesCockpit } from "../../../lib/api";
import { fetchBackendProfile } from "../../../lib/backend";

const ALLOWED = new Set(["admin", "ministre", "directeur"]);
const formatNumber = (value: number | undefined) => Number(value ?? 0).toLocaleString("fr-FR");

export default async function ZonesIndustriellesPage() {
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).some((role) => ALLOWED.has(role))) redirect("/connexion");
  } catch {
    redirect("/connexion");
  }

  const cockpit = await fetchZonesCockpit();

  return (
    <section className="section">
      <p style={{ margin: 0, color: "#009440", fontWeight: 900 }}>DOMAINE MÉTIER 7 · FAM-ZIN-001</p>
      <h1 style={{ margin: "0.25rem 0 0", color: "#003F8F" }}>Zones industrielles et capacités territoriales</h1>
      <p style={{ color: "#4b5563", maxWidth: 900 }}>{cockpit.lecture_executive}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "0.85rem" }}>
        <Kpi label="Score zones" value={`${cockpit.score_zones}/100`} color="#003F8F" />
        <Kpi label="Sites RIN" value={formatNumber(cockpit.stats.sites)} color="#009440" />
        <Kpi label="Opérateurs" value={formatNumber(cockpit.stats.operateurs)} color="#7c3aed" />
        <Kpi label="Provinces" value={formatNumber(cockpit.stats.provinces)} color="#0f766e" />
        <Kpi label="Superficie" value={`${formatNumber(cockpit.stats.superficie_ha)} ha`} color="#b45309" />
      </div>

      <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(300px, 0.8fr)", gap: "1rem" }}>
        <Panel title="Lecture territoriale des zones">
          {cockpit.zones.map((zone) => (
            <div key={zone.province} style={{ padding: "0.7rem 0", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                <strong style={{ color: "#111827", textTransform: "capitalize" }}>{zone.province.replaceAll("_", " ")}</strong>
                <span style={{ color: zone.niveau_priorite === "haute" ? "#b91c1c" : "#003F8F", fontWeight: 900 }}>{zone.niveau_priorite}</span>
              </div>
              <p style={{ margin: "0.25rem 0", color: "#6b7280", fontSize: "0.82rem" }}>
                {zone.operateurs} opérateur(s) · {zone.sites} site(s) · {zone.superficie_ha} ha
              </p>
              <div style={{ height: 8, borderRadius: 999, background: "#f3f4f6", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${zone.taux_occupation_proxy}%`, background: "#009440" }} />
              </div>
            </div>
          ))}
        </Panel>
        <Panel title="Énergie déclarée par secteur">
          {cockpit.energie_par_secteur.map((item) => (
            <div key={item.secteur} style={{ display: "flex", justifyContent: "space-between", padding: "0.65rem 0", borderBottom: "1px solid #f3f4f6" }}>
              <strong style={{ textTransform: "capitalize" }}>{item.secteur.replaceAll("_", " ")}</strong>
              <span>{formatNumber(item.energie_kwh)} kWh</span>
            </div>
          ))}
        </Panel>
      </div>

      <Panel title="Recommandations" style={{ marginTop: "1rem" }}>
        <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "#374151", lineHeight: 1.7 }}>
          {cockpit.recommendations.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </Panel>
    </section>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return <div className="chart-card" style={{ padding: "1rem" }}><div style={{ color: "#6b7280", fontSize: "0.72rem", fontWeight: 900, textTransform: "uppercase" }}>{label}</div><div style={{ color, fontSize: "1.45rem", fontWeight: 950, marginTop: "0.25rem" }}>{value}</div></div>;
}

function Panel({ title, children, style }: { title: string; children: ReactNode; style?: CSSProperties }) {
  return <div className="chart-card" style={{ padding: "1rem", ...style }}><h2 style={{ margin: "0 0 0.75rem", color: "#003F8F", fontSize: "1.05rem" }}>{title}</h2>{children}</div>;
}
