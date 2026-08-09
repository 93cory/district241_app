import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchFilieresCockpit } from "../../../lib/api";
import { fetchBackendProfile } from "../../../lib/backend";

const ALLOWED = new Set(["admin", "ministre", "directeur"]);

const formatNumber = (value: number | string[] | undefined) => {
  if (Array.isArray(value)) return value.length.toLocaleString("fr-FR");
  return Number(value ?? 0).toLocaleString("fr-FR");
};

function maturityTone(score: number) {
  if (score >= 70) return { color: "#006233", bg: "#ecfdf3", label: "Mature" };
  if (score >= 50) return { color: "#d97706", bg: "#fff7ed", label: "À consolider" };
  return { color: "#b42318", bg: "#fff1f2", label: "Prioritaire" };
}

function priorityTone(priority: string) {
  if (priority === "haute") return { color: "#b42318", bg: "#fff1f2" };
  if (priority === "moyenne") return { color: "#b45309", bg: "#fff7ed" };
  return { color: "#006233", bg: "#ecfdf3" };
}

export default async function FilieresPage() {
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).some((role) => ALLOWED.has(role))) redirect("/connexion");
  } catch {
    redirect("/connexion");
  }

  const cockpit = await fetchFilieresCockpit();

  return (
    <section className="section">
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: "0 0 0.3rem", color: "#009440", fontWeight: 900 }}>
            FILIÈRES & CHAÎNES DE VALEUR
          </p>
          <h1 style={{ margin: 0, color: "#003F8F" }}>Cockpit stratégique des filières industrielles</h1>
          <p style={{ margin: "0.45rem 0 0", color: "#4b5563", maxWidth: 820 }}>
            Gouvernance des filières prioritaires, maturité des chaînes de valeur, plans d’action,
            risques et indicateurs exécutifs issus du RIN, des ATI et de l’ONI.
          </p>
        </div>
        <Link href="/pnpi/oni" className="btn-secondary" style={{ alignSelf: "center" }}>
          Voir l’ONI
        </Link>
      </div>

      <div className="chart-card" style={{ marginTop: "1.25rem", padding: "1rem", borderLeft: "5px solid #003F8F" }}>
        <div style={{ color: "#6b7280", fontSize: "0.78rem", fontWeight: 900, textTransform: "uppercase" }}>
          Lecture exécutive
        </div>
        <p style={{ margin: "0.35rem 0 0", color: "#111827", lineHeight: 1.6 }}>{cockpit.lecture_executive}</p>
      </div>

      <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "0.85rem" }}>
        <Kpi label="Maturité nationale" value={`${cockpit.maturite_nationale}/100`} tone="#003F8F" />
        <Kpi label="Souveraineté productive" value={`${cockpit.souverainete_nationale}/100`} tone="#006233" />
        <Kpi label="Profondeur chaîne" value={`${cockpit.profondeur_chaine_nationale}/100`} tone="#0c7eb4" />
        <Kpi label="Filières suivies" value={String(cockpit.stats.filieres_prioritaires ?? 0)} tone="#009440" />
        <Kpi label="Indicateurs gouvernés" value={String(cockpit.stats.indicateurs_gouvernes ?? 0)} tone="#7c3aed" />
        <Kpi label="Actions" value={String(cockpit.stats.actions ?? 0)} tone="#0f766e" />
        <Kpi label="Risques ouverts" value={String(cockpit.stats.risques_ouverts ?? 0)} tone="#d97706" />
      </div>

      <div className="chart-card" style={{ marginTop: "1.25rem", padding: "1rem" }}>
        <h2 style={{ margin: "0 0 0.75rem", color: "#003F8F", fontSize: "1.05rem" }}>
          Carte nationale des chaînes de valeur
        </h2>
        <div style={{ display: "grid", gap: "0.9rem" }}>
          {cockpit.filieres.map((filiere) => (
            <div key={`${filiere.id}-chain`} style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: "0.85rem", background: "#f8fafc" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center", marginBottom: "0.65rem" }}>
                <strong style={{ color: "#111827" }}>{filiere.nom}</strong>
                <span style={{ color: "#0c7eb4", fontWeight: 950 }}>Profondeur {filiere.chaine_valeur.depth_score}/100</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: "0.55rem" }}>
                {filiere.chaine_valeur.stages.map((stage, index) => {
                  const statusTone =
                    stage.status === "fort"
                      ? { color: "#006233", bg: "#ecfdf3" }
                      : stage.status === "goulet"
                        ? { color: "#b42318", bg: "#fff1f2" }
                        : { color: "#b45309", bg: "#fff7ed" };
                  return (
                    <div key={stage.key} style={{ background: "white", borderRadius: 12, padding: "0.7rem", border: `1px solid ${statusTone.color}22` }}>
                      <div style={{ color: "#6b7280", fontSize: "0.7rem", fontWeight: 900 }}>Maillon {index + 1}</div>
                      <strong style={{ display: "block", marginTop: 3, color: "#111827", fontSize: "0.86rem" }}>{stage.label}</strong>
                      <p style={{ margin: "0.3rem 0", color: "#6b7280", fontSize: "0.75rem", lineHeight: 1.35 }}>{stage.enjeu}</p>
                      <span style={{ background: statusTone.bg, color: statusTone.color, borderRadius: 999, padding: "0.22rem 0.45rem", fontSize: "0.68rem", fontWeight: 900 }}>
                        {stage.status} · {stage.score}/100
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(280px, 0.8fr)", gap: "1rem" }}>
        <div className="chart-card" style={{ padding: "1rem" }}>
          <h2 style={{ margin: "0 0 0.75rem", color: "#003F8F", fontSize: "1.05rem" }}>Radar stratégique des filières</h2>
          <div style={{ display: "grid", gap: "0.8rem" }}>
            {cockpit.filieres.map((filiere) => (
              <div key={filiere.id}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", color: "#374151", fontSize: "0.82rem" }}>
                  <strong>{filiere.nom}</strong>
                  <span>
                    Maturité {filiere.maturite.score}/100 · Souveraineté {filiere.souverainete.score}/100
                  </span>
                </div>
                <div style={{ display: "grid", gap: 4, marginTop: 5 }}>
                  <Progress value={filiere.maturite.score} color="#003F8F" />
                  <Progress value={filiere.souverainete.score} color="#009440" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card" style={{ padding: "1rem" }}>
          <h2 style={{ margin: "0 0 0.75rem", color: "#003F8F", fontSize: "1.05rem" }}>Lecture territoriale</h2>
          {cockpit.territoires.length === 0 ? (
            <p style={{ margin: 0, color: "#6b7280" }}>Aucune province consolidée pour l’instant.</p>
          ) : (
            <div style={{ display: "grid", gap: "0.65rem" }}>
              {cockpit.territoires.slice(0, 6).map((territoire) => (
                <div key={territoire.province}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#374151" }}>
                    <strong style={{ textTransform: "capitalize" }}>{territoire.province.replaceAll("_", " ")}</strong>
                    <span>{territoire.filieres} filière(s)</span>
                  </div>
                  <Progress value={Math.min(100, territoire.filieres * 28)} color="#7c3aed" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: "1rem" }}>
        {cockpit.filieres.map((filiere) => {
          const tone = maturityTone(filiere.maturite.score);
          const mainRecommendation = filiere.recommendations[0];
          const recommendationTone = mainRecommendation ? priorityTone(mainRecommendation.priorite) : null;
          return (
            <article key={filiere.id} className="chart-card" style={{ padding: "1rem", borderTop: `4px solid ${tone.color}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.8rem", alignItems: "flex-start" }}>
                <div>
                  <h2 style={{ margin: 0, color: "#003F8F", fontSize: "1.05rem" }}>{filiere.nom}</h2>
                  <p style={{ margin: "0.35rem 0 0", color: "#6b7280", fontSize: "0.82rem", lineHeight: 1.45 }}>
                    {filiere.description}
                  </p>
                </div>
                <span style={{ background: tone.bg, color: tone.color, borderRadius: 999, padding: "0.25rem 0.55rem", fontWeight: 900, fontSize: "0.72rem", whiteSpace: "nowrap" }}>
                  {tone.label}
                </span>
              </div>

              <div style={{ marginTop: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#374151", fontSize: "0.82rem" }}>
                  <strong>Maturité chaîne de valeur</strong>
                  <span>{filiere.maturite.score}/100</span>
                </div>
                <Progress value={filiere.maturite.score} color={tone.color} />
                <div style={{ display: "flex", justifyContent: "space-between", color: "#374151", fontSize: "0.82rem", marginTop: "0.55rem" }}>
                  <strong>Souveraineté productive</strong>
                  <span>{filiere.souverainete.score}/100 · {filiere.souverainete.niveau}</span>
                </div>
                <Progress value={filiere.souverainete.score} color="#009440" />
              </div>

              <div style={{ marginTop: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#374151", fontSize: "0.82rem" }}>
                  <strong>Profondeur chaîne de valeur</strong>
                  <span>{filiere.chaine_valeur.depth_score}/100</span>
                </div>
                <Progress value={filiere.chaine_valeur.depth_score} color="#0c7eb4" />
              </div>

              <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
                <MiniStat label="Opérateurs" value={formatNumber(filiere.stats.operateurs)} />
                <MiniStat label="ATI approuvés" value={formatNumber(filiere.stats.atis_approuves)} />
                <MiniStat label="Contenu local" value={`${formatNumber(filiere.stats.contenu_local_pct)}%`} />
              </div>

              <div style={{ marginTop: "0.9rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {filiere.objectifs.slice(0, 3).map((objectif) => (
                  <span key={objectif} style={{ background: "#E8F2FF", color: "#003F8F", borderRadius: 999, padding: "0.25rem 0.5rem", fontSize: "0.72rem", fontWeight: 800 }}>
                    {objectif}
                  </span>
                ))}
              </div>

              {mainRecommendation && recommendationTone ? (
                <div style={{ marginTop: "0.9rem", border: `1px solid ${recommendationTone.color}22`, background: recommendationTone.bg, borderRadius: 12, padding: "0.75rem" }}>
                  <div style={{ color: recommendationTone.color, fontSize: "0.72rem", fontWeight: 950, textTransform: "uppercase" }}>
                    Recommandation {mainRecommendation.priorite}
                  </div>
                  <strong style={{ display: "block", marginTop: 3, color: "#111827" }}>{mainRecommendation.titre}</strong>
                  <p style={{ margin: "0.25rem 0 0", color: "#4b5563", fontSize: "0.78rem", lineHeight: 1.45 }}>
                    {mainRecommendation.action}
                  </p>
                </div>
              ) : null}

              <Link href={`/pnpi/filieres/${filiere.id}`} className="btn-primary" style={{ marginTop: "1rem", display: "inline-flex" }}>
                Ouvrir la filière
              </Link>
            </article>
          );
        })}
      </div>

      <div className="chart-card" style={{ marginTop: "1.25rem", padding: "1rem" }}>
        <h2 style={{ margin: "0 0 0.75rem", color: "#003F8F", fontSize: "1.05rem" }}>Goulets et opportunités chaîne de valeur</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: "1rem" }}>
          <div>
            <h3 style={{ margin: "0 0 0.5rem", color: "#b42318", fontSize: "0.95rem" }}>Goulets à traiter</h3>
            <div style={{ display: "grid", gap: "0.55rem" }}>
              {cockpit.goulets_chaine.slice(0, 6).map((item) => (
                <div key={`${item.filiere}-${item.key}`} style={{ border: "1px solid #fecaca", background: "#fff1f2", borderRadius: 12, padding: "0.7rem" }}>
                  <strong style={{ color: "#991b1b" }}>{item.label}</strong>
                  <p style={{ margin: "0.25rem 0 0", color: "#6b7280", fontSize: "0.8rem" }}>
                    {item.filiere} · score {item.score}/100 · {item.enjeu}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 style={{ margin: "0 0 0.5rem", color: "#006233", fontSize: "0.95rem" }}>Opportunités d'action publique</h3>
            <div style={{ display: "grid", gap: "0.55rem" }}>
              {cockpit.opportunites_chaine.slice(0, 6).map((item) => (
                <div key={`${item.filiere}-${item.opportunity}`} style={{ border: "1px solid #bbf7d0", background: "#ecfdf3", borderRadius: 12, padding: "0.7rem" }}>
                  <strong style={{ color: "#006233" }}>{item.filiere}</strong>
                  <p style={{ margin: "0.25rem 0 0", color: "#4b5563", fontSize: "0.8rem" }}>{item.opportunity}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="chart-card" style={{ marginTop: "1.25rem", padding: "1rem" }}>
        <h2 style={{ margin: "0 0 0.75rem", color: "#003F8F", fontSize: "1.05rem" }}>Risques prioritaires</h2>
        {cockpit.alertes.length === 0 ? (
          <p style={{ margin: 0, color: "#6b7280" }}>Aucun risque élevé ouvert.</p>
        ) : (
          <div style={{ display: "grid", gap: "0.65rem" }}>
            {cockpit.alertes.map((risk) => (
              <div key={risk.id} style={{ border: "1px solid #fed7aa", background: "#fff7ed", borderRadius: 12, padding: "0.75rem" }}>
                <strong style={{ color: "#92400e" }}>{risk.titre}</strong>
                <p style={{ margin: "0.25rem 0 0", color: "#6b7280", fontSize: "0.82rem" }}>{risk.mitigation}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="chart-card" style={{ padding: "1rem" }}>
      <div style={{ color: "#6b7280", fontSize: "0.75rem", fontWeight: 900, textTransform: "uppercase" }}>{label}</div>
      <div style={{ color: tone, fontSize: "1.6rem", fontWeight: 950, marginTop: "0.3rem" }}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "#f8fafc", borderRadius: 12, padding: "0.65rem", textAlign: "center" }}>
      <div style={{ color: "#003F8F", fontWeight: 950 }}>{value}</div>
      <div style={{ color: "#6b7280", fontSize: "0.68rem", fontWeight: 800 }}>{label}</div>
    </div>
  );
}

function Progress({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ height: 9, background: "#f3f4f6", borderRadius: 999, overflow: "hidden", marginTop: 5 }}>
      <div style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: "100%", background: color }} />
    </div>
  );
}
