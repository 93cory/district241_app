import { redirect } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { fetchInvestissementsCockpit } from "../../../lib/api";
import { fetchBackendProfile } from "../../../lib/backend";

const ALLOWED = new Set(["admin", "ministre", "directeur"]);
const formatNumber = (value: number | undefined) => Number(value ?? 0).toLocaleString("fr-FR");
const formatMoney = (value: number | undefined) => `${formatNumber(Math.round(Number(value ?? 0) / 1_000_000))} M FCFA`;

export default async function InvestissementsPage() {
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).some((role) => ALLOWED.has(role))) redirect("/connexion");
  } catch {
    redirect("/connexion");
  }

  const cockpit = await fetchInvestissementsCockpit();

  return (
    <section className="section">
      <p style={{ margin: 0, color: "#009440", fontWeight: 900 }}>DOMAINE MÉTIER 4 · FAM-INV-001</p>
      <h1 style={{ margin: "0.25rem 0 0", color: "#003F8F" }}>Portefeuille national des investissements industriels</h1>
      <p style={{ color: "#4b5563", maxWidth: 900 }}>{cockpit.lecture_executive}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "0.85rem" }}>
        <Kpi label="Score portefeuille" value={`${cockpit.score_portefeuille}/100`} color="#003F8F" />
        <Kpi label="Projets" value={formatNumber(cockpit.stats.projets)} color="#009440" />
        <Kpi label="Montant" value={formatMoney(cockpit.stats.montant_fcfa)} color="#b45309" />
        <Kpi label="Emplois prévus" value={formatNumber(cockpit.stats.emplois_prevus)} color="#7c3aed" />
        <Kpi label="Provinces" value={formatNumber(cockpit.stats.provinces)} color="#0f766e" />
      </div>

      <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
        <Panel title="Investissements par secteur">
          {cockpit.par_secteur.map((item) => (
            <Line key={item.secteur} label={item.secteur} value={formatMoney(item.montant_fcfa)} hint={`${item.count} projet(s) · ${formatNumber(item.emplois_prevus)} emplois`} />
          ))}
        </Panel>
        <Panel title="Investissements par province">
          {cockpit.par_province.map((item) => (
            <Line key={item.province} label={item.province} value={formatMoney(item.montant_fcfa)} hint={`${item.count} projet(s) · ${formatNumber(item.emplois_prevus)} emplois`} />
          ))}
        </Panel>
      </div>

      <Panel title="Top projets du portefeuille" style={{ marginTop: "1rem" }}>
        <div style={{ display: "grid", gap: "0.65rem" }}>
          {cockpit.projets.map((project) => (
            <div key={project.id} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "0.8rem", background: "#f8fafc" }}>
              <strong style={{ color: "#111827" }}>{project.intitule}</strong>
              <p style={{ margin: "0.25rem 0", color: "#6b7280", fontSize: "0.82rem" }}>
                {project.operateur} · {project.province.replaceAll("_", " ")} · {project.secteur.replaceAll("_", " ")}
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", color: "#374151", fontSize: "0.8rem" }}>
                <span>{project.statut} · {project.annee ?? "année à préciser"}</span>
                <strong>{formatMoney(project.montant_fcfa)} · {formatNumber(project.emplois_prevus)} emplois</strong>
              </div>
            </div>
          ))}
        </div>
      </Panel>

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

function Line({ label, value, hint }: { label: string; value: string; hint: string }) {
  return <div style={{ padding: "0.65rem 0", borderBottom: "1px solid #f3f4f6" }}><div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}><strong style={{ textTransform: "capitalize", color: "#111827" }}>{label.replaceAll("_", " ")}</strong><span style={{ color: "#003F8F", fontWeight: 900 }}>{value}</span></div><p style={{ margin: "0.25rem 0 0", color: "#6b7280", fontSize: "0.8rem" }}>{hint}</p></div>;
}
