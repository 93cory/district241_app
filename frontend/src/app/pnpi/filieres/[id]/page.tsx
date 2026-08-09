import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { fetchFiliereDetail } from "../../../../lib/api";
import { fetchBackendProfile } from "../../../../lib/backend";

const ALLOWED = new Set(["admin", "ministre", "directeur", "instructeur", "inspecteur"]);

const formatNumber = (value: number | string[] | undefined) => {
  if (Array.isArray(value)) return value.length.toLocaleString("fr-FR");
  return Number(value ?? 0).toLocaleString("fr-FR");
};

export default async function FiliereDetailPage({ params }: { params: { id: string } }) {
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).some((role) => ALLOWED.has(role))) redirect("/connexion");
  } catch {
    redirect("/connexion");
  }

  const filiere = await fetchFiliereDetail(params.id);

  return (
    <section className="section">
      <div style={{ marginBottom: "0.75rem", fontSize: "0.875rem" }}>
        <Link href="/pnpi/filieres" style={{ color: "#6b7280", textDecoration: "none" }}>
          Filières
        </Link>
        <span style={{ color: "#6b7280", margin: "0 0.5rem" }}>/</span>
        <span style={{ color: "#003F8F", fontWeight: 800 }}>{filiere.nom}</span>
      </div>

      <header className="chart-card" style={{ padding: "1.25rem", borderLeft: "5px solid #009440" }}>
        <p style={{ margin: "0 0 0.35rem", color: "#009440", fontWeight: 900 }}>FICHE STRATÉGIQUE DE FILIÈRE</p>
        <h1 style={{ margin: 0, color: "#003F8F" }}>{filiere.nom}</h1>
        <p style={{ margin: "0.5rem 0 0", color: "#4b5563", maxWidth: 860, lineHeight: 1.55 }}>
          {filiere.vision || filiere.description}
        </p>
      </header>

      <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))", gap: "0.85rem" }}>
        <Kpi label="Maturité" value={`${filiere.maturite.score}/100`} color="#003F8F" />
        <Kpi label="Souveraineté" value={`${filiere.souverainete.score}/100`} color="#006233" />
        <Kpi label="Chaîne de valeur" value={`${filiere.chaine_valeur.depth_score}/100`} color="#0c7eb4" />
        <Kpi label="Cible" value={`${filiere.maturite.cible}/100`} color="#009440" />
        <Kpi label="Opérateurs" value={String(filiere.stats.operateurs ?? 0)} color="#7c3aed" />
        <Kpi label="ATI approuvés" value={String(filiere.stats.atis_approuves ?? 0)} color="#0f766e" />
        <Kpi label="Contenu local" value={`${formatNumber(filiere.stats.contenu_local_pct)}%`} color="#b45309" />
        <Kpi label="Risques" value={String(filiere.risks.filter((r) => r.statut === "ouvert").length)} color="#b91c1c" />
      </div>

      <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
        <Panel title="Recommandations décisionnelles">
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {filiere.recommendations.map((recommendation) => (
              <div key={recommendation.titre} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "0.75rem", background: "#f8fafc" }}>
                <Badge label={recommendation.priorite} color={recommendation.priorite === "haute" ? "#b91c1c" : "#003F8F"} />
                <strong style={{ display: "block", color: "#111827", marginTop: "0.35rem" }}>{recommendation.titre}</strong>
                <p style={{ margin: "0.25rem 0 0", color: "#4b5563", fontSize: "0.82rem", lineHeight: 1.5 }}>{recommendation.action}</p>
                <p style={{ margin: "0.25rem 0 0", color: "#047857", fontSize: "0.76rem", fontWeight: 800 }}>{recommendation.impact}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Souveraineté productive">
          <p style={{ margin: "0 0 0.75rem", color: "#4b5563", lineHeight: 1.5 }}>
            Niveau <strong style={{ color: "#006233" }}>{filiere.souverainete.niveau}</strong>, calculé à partir du contenu local,
            de la couverture territoriale, du tissu productif et de la dépendance aux intrants importés.
          </p>
          <ScoreBreakdown values={filiere.souverainete.breakdown} positiveColor="#009440" />
        </Panel>
      </div>

      <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
        <Panel title="Objectifs de filière">
          <TagList items={filiere.objectifs} empty="Aucun objectif renseigné." tone="#003F8F" />
        </Panel>
        <Panel title="Contraintes et opportunités">
          <div style={{ display: "grid", gap: "0.75rem" }}>
            <TagList items={filiere.contraintes} empty="Aucune contrainte renseignée." tone="#b45309" />
            <TagList items={filiere.opportunites} empty="Aucune opportunité renseignée." tone="#047857" />
          </div>
        </Panel>
      </div>

      <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
        <Panel title="Décomposition de la maturité">
          <ScoreBreakdown values={filiere.maturite.breakdown} positiveColor="#003F8F" />
        </Panel>

        <Panel title="Empreinte territoriale et économique">
          <div style={{ display: "grid", gap: "0.65rem", color: "#374151", fontSize: "0.84rem" }}>
            <Line label="Provinces couvertes" value={Array.isArray(filiere.stats.provinces) ? filiere.stats.provinces.join(", ") || "Non renseigné" : "Non renseigné"} />
            <Line label="Production ONI" value={formatNumber(filiere.stats.production_oni)} />
            <Line label="Capacité utilisée" value={`${formatNumber(filiere.stats.capacite_utilisee_pct)}%`} />
            <Line label="Exportations déclarées" value={`${formatNumber(filiere.stats.exportations_fcfa)} FCFA`} />
            <Line label="Importations déclarées" value={`${formatNumber(filiere.stats.importations_fcfa)} FCFA`} />
            <Line label="Investissements RIN" value={`${formatNumber(filiere.stats.investissement_fcfa)} FCFA`} />
          </div>
        </Panel>
      </div>

      <section className="chart-card" style={{ marginTop: "1.25rem", padding: "1rem" }}>
        <h2 style={{ margin: "0 0 0.75rem", color: "#003F8F", fontSize: "1.05rem" }}>Chaîne de valeur détaillée</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "0.65rem" }}>
          {filiere.chaine_valeur.stages.map((stage, index) => {
            const tone =
              stage.status === "fort"
                ? { color: "#006233", bg: "#ecfdf3" }
                : stage.status === "goulet"
                  ? { color: "#b42318", bg: "#fff1f2" }
                  : { color: "#b45309", bg: "#fff7ed" };
            return (
              <div key={stage.key} style={{ border: `1px solid ${tone.color}22`, background: tone.bg, borderRadius: 14, padding: "0.85rem" }}>
                <div style={{ color: "#6b7280", fontSize: "0.72rem", fontWeight: 900 }}>Maillon {index + 1}</div>
                <strong style={{ display: "block", marginTop: 4, color: "#111827" }}>{stage.label}</strong>
                <p style={{ margin: "0.35rem 0", color: "#4b5563", fontSize: "0.82rem", lineHeight: 1.45 }}>{stage.enjeu}</p>
                <span style={{ color: tone.color, fontWeight: 950 }}>{stage.status} · {stage.score}/100</span>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
          <div>
            <h3 style={{ margin: "0 0 0.5rem", color: "#b42318", fontSize: "0.95rem" }}>Goulets</h3>
            {filiere.chaine_valeur.bottlenecks.map((item) => (
              <p key={item.key} style={{ margin: "0.3rem 0", color: "#4b5563" }}>
                • {item.label} — {item.enjeu}
              </p>
            ))}
          </div>
          <div>
            <h3 style={{ margin: "0 0 0.5rem", color: "#006233", fontSize: "0.95rem" }}>Opportunités</h3>
            {filiere.chaine_valeur.opportunities.map((item) => (
              <p key={item} style={{ margin: "0.3rem 0", color: "#4b5563" }}>
                • {item}
              </p>
            ))}
          </div>
        </div>
      </section>

      <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
        <Panel title="Gouvernance des indicateurs">
          {filiere.indicators.length === 0 ? (
            <p style={{ margin: 0, color: "#6b7280" }}>Aucun indicateur gouverné.</p>
          ) : (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {filiere.indicators.map((indicator) => (
                <div key={indicator.id} style={{ borderBottom: "1px solid #f3f4f6", paddingBottom: "0.7rem" }}>
                  <strong style={{ color: "#111827" }}>{indicator.libelle}</strong>
                  <div style={{ color: "#6b7280", fontSize: "0.78rem", marginTop: 3 }}>
                    {indicator.formule || indicator.definition || "Méthodologie à documenter."}
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.45rem" }}>
                    <Badge label={indicator.niveau_diffusion} color="#003F8F" />
                    <Badge label={indicator.qualite_donnee} color="#b45309" />
                    <Badge label={indicator.methode_version} color="#047857" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Plans d’action">
          {filiere.actions.length === 0 ? (
            <p style={{ margin: 0, color: "#6b7280" }}>Aucune action planifiée.</p>
          ) : (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {filiere.actions.map((action) => (
                <div key={action.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
                    <strong style={{ color: "#111827" }}>{action.intitule}</strong>
                    <span style={{ color: "#003F8F", fontWeight: 900 }}>{action.progression_pct}%</span>
                  </div>
                  <div style={{ height: 8, background: "#f3f4f6", borderRadius: 999, overflow: "hidden", marginTop: 5 }}>
                    <div style={{ width: `${action.progression_pct}%`, height: "100%", background: "#009440" }} />
                  </div>
                  <p style={{ margin: "0.35rem 0 0", color: "#6b7280", fontSize: "0.78rem" }}>{action.objectif}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Registre des risques">
          {filiere.risks.length === 0 ? (
            <p style={{ margin: 0, color: "#6b7280" }}>Aucun risque enregistré.</p>
          ) : (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {filiere.risks.map((risk) => (
                <div key={risk.id} style={{ border: "1px solid #fee2e2", background: "#fff7f7", borderRadius: 12, padding: "0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
                    <strong style={{ color: "#991b1b" }}>{risk.titre}</strong>
                    <Badge label={risk.criticite} color="#b91c1c" />
                  </div>
                  <p style={{ margin: "0.35rem 0 0", color: "#6b7280", fontSize: "0.78rem" }}>{risk.mitigation || risk.description}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </section>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="chart-card" style={{ padding: "1rem" }}>
      <div style={{ color: "#6b7280", fontSize: "0.72rem", fontWeight: 900, textTransform: "uppercase" }}>{label}</div>
      <div style={{ color, fontSize: "1.55rem", fontWeight: 950, marginTop: "0.25rem" }}>{value}</div>
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

function TagList({ items, empty, tone }: { items: string[]; empty: string; tone: string }) {
  if (!items.length) return <p style={{ margin: 0, color: "#6b7280" }}>{empty}</p>;
  return (
    <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
      {items.map((item) => (
        <span key={item} style={{ background: "#f8fafc", color: tone, border: "1px solid #e5e7eb", borderRadius: 999, padding: "0.3rem 0.55rem", fontSize: "0.76rem", fontWeight: 800 }}>
          {item}
        </span>
      ))}
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

function ScoreBreakdown({ values, positiveColor }: { values: Record<string, number>; positiveColor: string }) {
  return (
    <div style={{ display: "grid", gap: "0.65rem" }}>
      {Object.entries(values).map(([key, value]) => {
        const isPenalty = key.includes("penalite");
        const color = isPenalty ? "#b91c1c" : positiveColor;
        return (
          <div key={key}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#374151", fontSize: "0.8rem" }}>
              <strong style={{ textTransform: "capitalize" }}>{key.replaceAll("_", " ")}</strong>
              <span>{value}</span>
            </div>
            <div style={{ height: 8, background: "#f3f4f6", borderRadius: 999, overflow: "hidden", marginTop: 5 }}>
              <div style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: "100%", background: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", borderBottom: "1px solid #f3f4f6", paddingBottom: "0.45rem" }}>
      <span style={{ color: "#6b7280" }}>{label}</span>
      <strong style={{ color: "#111827", textAlign: "right" }}>{value}</strong>
    </div>
  );
}
