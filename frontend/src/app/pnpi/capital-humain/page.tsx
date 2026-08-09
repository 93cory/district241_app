import { redirect } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { fetchCapitalHumainCockpit } from "../../../lib/api";
import { fetchBackendProfile } from "../../../lib/backend";

const ALLOWED = new Set(["admin", "ministre", "directeur"]);

const formatNumber = (value: number | undefined) => Number(value ?? 0).toLocaleString("fr-FR");

function tone(score: number) {
  if (score >= 70) return { color: "#006233", bg: "#ecfdf3", label: "Structuré" };
  if (score >= 45) return { color: "#d97706", bg: "#fff7ed", label: "À consolider" };
  return { color: "#b42318", bg: "#fff1f2", label: "Prioritaire" };
}

export default async function CapitalHumainPage() {
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).some((role) => ALLOWED.has(role))) redirect("/connexion");
  } catch {
    redirect("/connexion");
  }

  const cockpit = await fetchCapitalHumainCockpit();
  const maturityTone = tone(cockpit.maturite_capital_humain.score);

  return (
    <section className="section">
      <div>
        <p style={{ margin: "0 0 0.3rem", color: "#009440", fontWeight: 900 }}>
          DOMAINE MÉTIER 19 · FAM-CAP-001
        </p>
        <h1 style={{ margin: 0, color: "#003F8F" }}>Capital humain industriel, compétences et emploi</h1>
        <p style={{ margin: "0.45rem 0 0", color: "#4b5563", maxWidth: 920 }}>
          Cockpit de lecture nationale des effectifs industriels, métiers en tension, besoins de compétences,
          formations par rôle et adéquation emploi-formation.
        </p>
      </div>

      <div className="chart-card" style={{ marginTop: "1.25rem", padding: "1rem", borderLeft: `5px solid ${maturityTone.color}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <div style={{ color: "#6b7280", fontSize: "0.78rem", fontWeight: 900, textTransform: "uppercase" }}>
              Lecture exécutive
            </div>
            <p style={{ margin: "0.35rem 0 0", color: "#111827", lineHeight: 1.6 }}>{cockpit.lecture_executive}</p>
          </div>
          <span style={{ alignSelf: "flex-start", background: maturityTone.bg, color: maturityTone.color, borderRadius: 999, padding: "0.3rem 0.65rem", fontWeight: 950 }}>
            {maturityTone.label}
          </span>
        </div>
      </div>

      <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "0.85rem" }}>
        <Kpi label="Maturité RH industrielle" value={`${cockpit.maturite_capital_humain.score}/100`} color="#003F8F" />
        <Kpi label="Emplois RIN" value={formatNumber(cockpit.stats.emplois_declares_rin)} color="#009440" />
        <Kpi label="Emplois ONI" value={formatNumber(cockpit.stats.emplois_declares_oni)} color="#7c3aed" />
        <Kpi label="Emplois prévus" value={formatNumber(cockpit.stats.emplois_prevus_investissements)} color="#b45309" />
        <Kpi label="Compétences" value={formatNumber(cockpit.stats.competences_identifiees)} color="#0f766e" />
        <Kpi label="Acteurs formation" value={formatNumber(cockpit.stats.acteurs_formation)} color="#b91c1c" />
        <Kpi label="Adéquation formation" value={`${formatNumber(cockpit.stats.score_adequation)}/100`} color="#0c7eb4" />
      </div>

      <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) minmax(300px, 0.9fr)", gap: "1rem" }}>
        <Panel title="Indice capital humain">
          <p style={{ margin: "0 0 0.75rem", color: "#4b5563" }}>{cockpit.maturite_capital_humain.niveau}</p>
          <ScoreBreakdown values={cockpit.maturite_capital_humain.breakdown} />
          <p style={{ margin: "0.75rem 0 0", color: "#6b7280", fontSize: "0.82rem", lineHeight: 1.5 }}>
            {cockpit.source_note}
          </p>
        </Panel>

        <Panel title="Métiers et compétences en tension">
          <div style={{ display: "grid", gap: "0.65rem" }}>
            {cockpit.metiers_en_tension.map((item) => (
              <div key={`${item.competence}-${item.source}`} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "0.7rem", background: "#f8fafc" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
                  <strong style={{ color: "#111827", textTransform: "capitalize" }}>{item.competence}</strong>
                  <Badge label={item.niveau_tension} color={item.niveau_tension === "élevé" ? "#b91c1c" : "#b45309"} />
                </div>
                <p style={{ margin: "0.3rem 0 0", color: "#6b7280", fontSize: "0.78rem" }}>
                  {item.occurrences} signal(aux) · {item.source}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: "1rem" }}>
        <Panel title="Pipeline national de l'emploi industriel">
          <div style={{ display: "grid", gap: "0.65rem" }}>
            {cockpit.pipeline_emplois.map((item) => (
              <div key={item.stage} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "0.75rem", background: "#f8fafc" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                  <strong style={{ color: "#111827" }}>{item.stage}</strong>
                  <span style={{ color: "#003F8F", fontWeight: 950 }}>{formatNumber(item.value)}</span>
                </div>
                <p style={{ margin: "0.25rem 0 0", color: "#6b7280", fontSize: "0.8rem", lineHeight: 1.45 }}>{item.description}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Matrice besoins / offre de formation">
          <div style={{ display: "grid", gap: "0.65rem" }}>
            {cockpit.matrice_formation.map((item) => {
              const color = item.priorite === "haute" ? "#b91c1c" : item.priorite === "veille" ? "#006233" : "#b45309";
              return (
                <div key={item.famille} style={{ borderBottom: "1px solid #f3f4f6", paddingBottom: "0.65rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                    <strong style={{ color: "#111827" }}>{item.famille}</strong>
                    <Badge label={item.priorite} color={color} />
                  </div>
                  <p style={{ margin: "0.25rem 0", color: "#6b7280", fontSize: "0.78rem" }}>
                    Besoin {item.besoin} · offre identifiée {item.offre_identifiee} · gap {item.gap}
                  </p>
                  <Progress value={Math.min(100, item.gap * 22)} color={color} />
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Compétences par technologie">
          <div style={{ display: "grid", gap: "0.65rem" }}>
            {cockpit.competences_par_technologie.slice(0, 6).map((item) => (
              <div key={item.technologie} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "0.75rem", background: "#f8fafc" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                  <strong style={{ color: "#111827" }}>{item.technologie}</strong>
                  <span style={{ color: "#003F8F", fontWeight: 900 }}>N{item.niveau_maturite}</span>
                </div>
                <p style={{ margin: "0.25rem 0", color: "#6b7280", fontSize: "0.78rem" }}>
                  {item.secteur.replaceAll("_", " ")} · adoption {item.adoption_pct}%
                </p>
                <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                  {item.competences.slice(0, 5).map((skill) => (
                    <Badge key={`${item.technologie}-${skill}`} label={skill} color="#0f766e" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: "1rem" }}>
        <Panel title="Emploi par secteur">
          <div style={{ display: "grid", gap: "0.7rem" }}>
            {cockpit.secteurs.slice(0, 7).map((sector) => (
              <div key={sector.secteur}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#374151", fontSize: "0.82rem" }}>
                  <strong style={{ textTransform: "capitalize" }}>{sector.secteur.replaceAll("_", " ")}</strong>
                  <span>{formatNumber(sector.emplois_declares)} emplois</span>
                </div>
                <Progress value={Math.min(100, sector.emplois_declares / 10)} color="#003F8F" />
                <p style={{ margin: "0.25rem 0 0", color: "#6b7280", fontSize: "0.76rem" }}>
                  {sector.operateurs} opérateur(s) · pression compétences {sector.pression_competences}
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Couverture territoriale">
          <div style={{ display: "grid", gap: "0.7rem" }}>
            {cockpit.territoires.slice(0, 7).map((territoire) => (
              <div key={territoire.province}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#374151", fontSize: "0.82rem" }}>
                  <strong style={{ textTransform: "capitalize" }}>{territoire.province.replaceAll("_", " ")}</strong>
                  <span>{formatNumber(territoire.emplois_declares)} emplois</span>
                </div>
                <Progress value={Math.min(100, territoire.emplois_declares / 10)} color="#009440" />
                <p style={{ margin: "0.25rem 0 0", color: "#6b7280", fontSize: "0.76rem" }}>
                  {territoire.operateurs} opérateur(s) référencé(s)
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Parcours de formation par rôle">
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {cockpit.parcours_formation.map((path) => (
              <div key={path.role} style={{ borderBottom: "1px solid #f3f4f6", paddingBottom: "0.7rem" }}>
                <Badge label={path.role} color="#003F8F" />
                <strong style={{ display: "block", marginTop: "0.35rem", color: "#111827" }}>{path.titre}</strong>
                <p style={{ margin: "0.25rem 0", color: "#6b7280", fontSize: "0.8rem", lineHeight: 1.45 }}>{path.objectif}</p>
                <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                  {path.modules.map((module) => (
                    <Badge key={`${path.role}-${module}`} label={module} color="#009440" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Recommandations PNPI" style={{ marginTop: "1.25rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "0.75rem" }}>
          {cockpit.recommendations.map((item) => (
            <div key={item.titre} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "0.8rem", background: "#f8fafc" }}>
              <Badge label={item.priorite} color={item.priorite === "haute" ? "#b91c1c" : "#003F8F"} />
              <strong style={{ display: "block", marginTop: "0.4rem", color: "#111827" }}>{item.titre}</strong>
              <p style={{ margin: "0.25rem 0 0", color: "#4b5563", fontSize: "0.82rem", lineHeight: 1.5 }}>{item.action}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Plan d'actions ministériel emploi-formation" style={{ marginTop: "1.25rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "0.75rem" }}>
          {cockpit.actions_ministerielles.map((item) => (
            <div key={item.niveau} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "0.8rem", background: "#f8fafc" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                <strong style={{ color: "#003F8F" }}>{item.niveau}</strong>
                <span style={{ color: "#6b7280", fontSize: "0.78rem", fontWeight: 900 }}>{item.horizon}</span>
              </div>
              <p style={{ margin: "0.35rem 0", color: "#4b5563", fontSize: "0.82rem", lineHeight: 1.45 }}>{item.action}</p>
              <Badge label={item.responsable} color="#009440" />
            </div>
          ))}
        </div>
      </Panel>
    </section>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="chart-card" style={{ padding: "1rem" }}>
      <div style={{ color: "#6b7280", fontSize: "0.72rem", fontWeight: 900, textTransform: "uppercase" }}>{label}</div>
      <div style={{ color, fontSize: "1.45rem", fontWeight: 950, marginTop: "0.25rem" }}>{value}</div>
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

function ScoreBreakdown({ values }: { values: Record<string, number> }) {
  return (
    <div style={{ display: "grid", gap: "0.65rem" }}>
      {Object.entries(values).map(([key, value]) => (
        <div key={key}>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#374151", fontSize: "0.8rem" }}>
            <strong style={{ textTransform: "capitalize" }}>{key.replaceAll("_", " ")}</strong>
            <span>{value}</span>
          </div>
          <Progress value={value} color="#003F8F" />
        </div>
      ))}
    </div>
  );
}

function Progress({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ height: 8, background: "#f3f4f6", borderRadius: 999, overflow: "hidden", marginTop: 5 }}>
      <div style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: "100%", background: color }} />
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ background: "#f8fafc", color, borderRadius: 999, padding: "0.18rem 0.45rem", fontSize: "0.68rem", fontWeight: 900 }}>
      {label}
    </span>
  );
}
