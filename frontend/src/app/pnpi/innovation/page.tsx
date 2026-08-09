import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { fetchInnovationCockpit } from "../../../lib/api";
import { fetchBackendProfile } from "../../../lib/backend";

const ALLOWED = new Set(["admin", "ministre", "directeur"]);

const formatNumber = (value: number | undefined) => Number(value ?? 0).toLocaleString("fr-FR");

function tone(score: number) {
  if (score >= 70) return { color: "#006233", bg: "#ecfdf3", label: "Accélération" };
  if (score >= 45) return { color: "#d97706", bg: "#fff7ed", label: "Consolidation" };
  return { color: "#b42318", bg: "#fff1f2", label: "Prioritaire" };
}

export default async function InnovationPage() {
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).some((role) => ALLOWED.has(role))) redirect("/connexion");
  } catch {
    redirect("/connexion");
  }

  const cockpit = await fetchInnovationCockpit();
  const maturityTone = tone(cockpit.maturite_numerique.score);

  return (
    <section className="section">
      <div>
        <p style={{ margin: "0 0 0.3rem", color: "#009440", fontWeight: 900 }}>
          INNOVATION INDUSTRIELLE · R&D · INDUSTRIE 4.0
        </p>
        <h1 style={{ margin: 0, color: "#003F8F" }}>Cockpit national de modernisation technologique</h1>
        <p style={{ margin: "0.45rem 0 0", color: "#4b5563", maxWidth: 880 }}>
          Suivi des technologies industrielles, projets pilotes, acteurs de l’écosystème, transferts technologiques
          et maturité numérique des unités industrielles.
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
        <Kpi label="Maturité numérique" value={`${cockpit.maturite_numerique.score}/100`} color="#003F8F" />
        <Kpi label="Diagnostic 4.0" value={`${cockpit.diagnostic_industrie40.score}/100`} color="#0c7eb4" />
        <Kpi label="Technologies" value={String(cockpit.stats.technologies ?? 0)} color="#7c3aed" />
        <Kpi label="Projets innovation" value={String(cockpit.stats.projets ?? 0)} color="#009440" />
        <Kpi label="Projets pilotes" value={String(cockpit.stats.projets_pilotes ?? 0)} color="#0f766e" />
        <Kpi label="Acteurs" value={String(cockpit.stats.acteurs ?? 0)} color="#b45309" />
        <Kpi label="Candidats OGAPI" value={String(cockpit.stats.candidats_ogapi ?? 0)} color="#be123c" />
        <Kpi label="Budget projets" value={`${formatNumber(cockpit.stats.budget_fcfa)} FCFA`} color="#b91c1c" />
      </div>

      <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(300px, 0.8fr)", gap: "1rem" }}>
        <Panel title="Profil de maturité Industrie 4.0">
          <p style={{ margin: "0 0 0.75rem", color: "#4b5563" }}>{cockpit.maturite_numerique.niveau}</p>
          <ScoreBreakdown values={cockpit.maturite_numerique.breakdown} />
          <div style={{ marginTop: "0.8rem", color: "#374151", fontSize: "0.84rem" }}>
            Capacité utilisée observée ONI :{" "}
            <strong style={{ color: "#003F8F" }}>{cockpit.maturite_numerique.capacite_utilisee_pct}%</strong>
          </div>
        </Panel>

        <Panel title="Recommandations PNPI">
          <div style={{ display: "grid", gap: "0.7rem" }}>
            {cockpit.recommendations.map((item) => (
              <div key={item.titre} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "0.75rem", background: "#f8fafc" }}>
                <Badge label={item.priorite} color={item.priorite === "haute" ? "#b91c1c" : "#003F8F"} />
                <strong style={{ display: "block", marginTop: "0.35rem", color: "#111827" }}>{item.titre}</strong>
                <p style={{ margin: "0.25rem 0 0", color: "#4b5563", fontSize: "0.82rem", lineHeight: 1.5 }}>{item.action}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
        <Panel title="Diagnostic Industrie 4.0">
          <div style={{ display: "grid", gap: "0.7rem" }}>
            {cockpit.diagnostic_industrie40.dimensions.map((dimension) => {
              const style =
                dimension.status === "prêt"
                  ? { color: "#006233", bg: "#ecfdf3" }
                  : dimension.status === "prioritaire"
                    ? { color: "#b42318", bg: "#fff1f2" }
                    : { color: "#b45309", bg: "#fff7ed" };
              return (
                <div key={dimension.key} style={{ borderBottom: "1px solid #f3f4f6", paddingBottom: "0.65rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
                    <strong style={{ color: "#111827" }}>{dimension.label}</strong>
                    <span style={{ background: style.bg, color: style.color, borderRadius: 999, padding: "0.22rem 0.5rem", fontSize: "0.7rem", fontWeight: 900 }}>
                      {dimension.status} · {dimension.score}/100
                    </span>
                  </div>
                  <p style={{ margin: "0.25rem 0 0", color: "#6b7280", fontSize: "0.8rem", lineHeight: 1.4 }}>
                    {dimension.description}
                  </p>
                  <Progress value={dimension.score} color={style.color} />
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Roadmap de transformation">
          <div style={{ display: "grid", gap: "0.7rem" }}>
            {cockpit.diagnostic_industrie40.roadmap.map((step) => (
              <div key={step.phase} style={{ border: "1px solid #e5e7eb", background: "#f8fafc", borderRadius: 12, padding: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                  <strong style={{ color: "#003F8F" }}>{step.phase}</strong>
                  <span style={{ color: "#6b7280", fontSize: "0.78rem", fontWeight: 900 }}>{step.horizon}</span>
                </div>
                <p style={{ margin: "0.3rem 0", color: "#4b5563", fontSize: "0.82rem", lineHeight: 1.45 }}>{step.focus}</p>
                <Badge label={step.status} color={step.status === "en cours" ? "#006233" : "#b45309"} />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: "1rem" }}>
        <Panel title="Technologies stratégiques">
          <div style={{ display: "grid", gap: "0.8rem" }}>
            {cockpit.technologies.map((tech) => (
              <div key={tech.id} style={{ borderBottom: "1px solid #f3f4f6", paddingBottom: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                  <strong style={{ color: "#111827" }}>{tech.nom}</strong>
                  <span style={{ color: "#003F8F", fontWeight: 950 }}>N{tech.niveau_maturite}</span>
                </div>
                <p style={{ margin: "0.25rem 0 0", color: "#6b7280", fontSize: "0.8rem", lineHeight: 1.45 }}>{tech.description}</p>
                <div style={{ marginTop: "0.45rem", display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                  <Badge label={tech.domaine.replaceAll("_", " ")} color="#7c3aed" />
                  {tech.secteur_application ? <Badge label={tech.secteur_application} color="#009440" /> : null}
                  <Badge label={`${tech.adoption_nationale_pct}% adoption`} color="#b45309" />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Portefeuille de projets">
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {cockpit.projects.map((project) => (
              <div key={project.id} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "0.75rem" }}>
                <strong style={{ color: "#111827" }}>{project.titre}</strong>
                <p style={{ margin: "0.25rem 0", color: "#6b7280", fontSize: "0.8rem", lineHeight: 1.45 }}>{project.objectif}</p>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#374151", fontSize: "0.78rem" }}>
                  <span>{project.technologie_nom || "Technologie à préciser"}</span>
                  <strong>{formatNumber(project.budget_fcfa)} FCFA</strong>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Écosystème et territoires">
          <h3 style={{ margin: "0 0 0.5rem", color: "#111827", fontSize: "0.9rem" }}>Acteurs clés</h3>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {cockpit.actors.map((actor) => (
              <div key={actor.id} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", color: "#374151", fontSize: "0.82rem" }}>
                <strong>{actor.nom}</strong>
                <span>{actor.type_organisation}</span>
              </div>
            ))}
          </div>
          <h3 style={{ margin: "1rem 0 0.5rem", color: "#111827", fontSize: "0.9rem" }}>Couverture territoriale</h3>
          <div style={{ display: "grid", gap: "0.55rem" }}>
            {cockpit.territoires.slice(0, 6).map((territoire) => (
              <div key={territoire.province}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#374151", fontSize: "0.8rem" }}>
                  <strong style={{ textTransform: "capitalize" }}>{territoire.province.replaceAll("_", " ")}</strong>
                  <span>{territoire.acteurs_et_operateurs}</span>
                </div>
                <Progress value={Math.min(100, territoire.acteurs_et_operateurs * 10)} color="#7c3aed" />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
        <Panel title="Portefeuille R&D et propriété industrielle">
          <div style={{ display: "grid", gap: "0.65rem" }}>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "0.75rem", background: "#f8fafc" }}>
              <strong style={{ color: "#111827" }}>Budget consolidé</strong>
              <div style={{ color: "#003F8F", fontSize: "1.35rem", fontWeight: 950, marginTop: 4 }}>
                {formatNumber(cockpit.portefeuille_rd.total_budget_fcfa)} FCFA
              </div>
            </div>
            {cockpit.portefeuille_rd.protected_candidates.length === 0 ? (
              <p style={{ margin: 0, color: "#6b7280" }}>Aucun candidat OGAPI prioritaire détecté.</p>
            ) : (
              cockpit.portefeuille_rd.protected_candidates.map((item) => (
                <div key={item.project} style={{ border: "1px solid #f3e8ff", background: "#faf5ff", borderRadius: 12, padding: "0.75rem" }}>
                  <strong style={{ color: "#581c87" }}>{item.project}</strong>
                  <p style={{ margin: "0.25rem 0 0", color: "#4b5563", fontSize: "0.82rem" }}>
                    {item.technology || "Technologie à préciser"} · {item.filiere || "filière à préciser"}
                  </p>
                  <p style={{ margin: "0.25rem 0 0", color: "#6b7280", fontSize: "0.78rem" }}>{item.orientation}</p>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel title="Liens institutionnels">
          <div style={{ display: "grid", gap: "0.65rem" }}>
            {cockpit.institutional_links.map((link) => (
              <div key={link.institution} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "0.75rem", background: "#f8fafc" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                  <strong style={{ color: "#111827" }}>{link.institution}</strong>
                  <Badge label={link.status} color={link.status === "actif" ? "#006233" : "#b45309"} />
                </div>
                <p style={{ margin: "0.25rem 0", color: "#003F8F", fontSize: "0.82rem", fontWeight: 900 }}>{link.role}</p>
                <p style={{ margin: 0, color: "#6b7280", fontSize: "0.82rem", lineHeight: 1.45 }}>{link.usage}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
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

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="chart-card" style={{ padding: "1rem" }}>
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
