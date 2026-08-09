import { redirect } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { fetchDurabiliteCockpit } from "../../../lib/api";
import { fetchBackendProfile } from "../../../lib/backend";

const ALLOWED = new Set(["admin", "ministre", "directeur"]);

const formatNumber = (value: number | undefined) => Number(value ?? 0).toLocaleString("fr-FR");

function tone(score: number) {
  if (score >= 70) return { color: "#006233", bg: "#ecfdf3", label: "Transition structurée" };
  if (score >= 45) return { color: "#d97706", bg: "#fff7ed", label: "À consolider" };
  return { color: "#b42318", bg: "#fff1f2", label: "Prioritaire" };
}

export default async function DurabilitePage() {
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).some((role) => ALLOWED.has(role))) redirect("/connexion");
  } catch {
    redirect("/connexion");
  }

  const cockpit = await fetchDurabiliteCockpit();
  const maturityTone = tone(cockpit.maturite_durable.score);

  return (
    <section className="section">
      <div>
        <p style={{ margin: "0 0 0.3rem", color: "#009440", fontWeight: 900 }}>
          DOMAINE MÉTIER 20 · FAM-DUR-001
        </p>
        <h1 style={{ margin: 0, color: "#003F8F" }}>Industrie durable, ressources et décarbonation</h1>
        <p style={{ margin: "0.45rem 0 0", color: "#4b5563", maxWidth: 940 }}>
          Cockpit national pour suivre l’énergie, les matières, la circularité, les émissions estimées,
          les risques climatiques et les investissements de transition.
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
        <Kpi label="Maturité durable" value={`${cockpit.maturite_durable.score}/100`} color="#006233" />
        <Kpi label="Énergie ONI" value={`${formatNumber(cockpit.stats.energie_kwh)} kWh`} color="#d97706" />
        <Kpi label="CO₂ estimé" value={`${formatNumber(cockpit.stats.co2_estime_tonnes)} t`} color="#b42318" />
        <Kpi label="Matière locale" value={`${cockpit.stats.matiere_locale_pct}%`} color="#009440" />
        <Kpi label="Dépendance import" value={`${cockpit.stats.matiere_importee_pct}%`} color="#7c3aed" />
        <Kpi label="Invest. transition" value={formatNumber(cockpit.stats.investissements_transition)} color="#0f766e" />
        <Kpi label="Conformité env." value={`${cockpit.stats.score_conformite_environnementale}/100`} color="#003F8F" />
        <Kpi label="Symbioses détectées" value={formatNumber(cockpit.stats.opportunites_circularite)} color="#0f766e" />
      </div>

      <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) minmax(300px, 0.9fr)", gap: "1rem" }}>
        <Panel title="Indice de transition durable">
          <p style={{ margin: "0 0 0.75rem", color: "#4b5563" }}>{cockpit.maturite_durable.niveau}</p>
          <ScoreBreakdown values={cockpit.maturite_durable.breakdown} />
          <p style={{ margin: "0.75rem 0 0", color: "#6b7280", fontSize: "0.82rem", lineHeight: 1.5 }}>
            {cockpit.source_note}
          </p>
        </Panel>

        <Panel title="Alertes durabilité">
          <div style={{ display: "grid", gap: "0.65rem" }}>
            {cockpit.alertes.length ? (
              cockpit.alertes.map((alert) => (
                <div key={alert.titre} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "0.75rem", background: "#f8fafc" }}>
                  <Badge label={alert.niveau} color={alert.niveau === "élevé" ? "#b91c1c" : "#b45309"} />
                  <strong style={{ display: "block", marginTop: "0.35rem", color: "#111827" }}>{alert.titre}</strong>
                  <p style={{ margin: "0.25rem 0 0", color: "#4b5563", fontSize: "0.82rem", lineHeight: 1.5 }}>{alert.message}</p>
                </div>
              ))
            ) : (
              <p style={{ margin: 0, color: "#6b7280" }}>Aucune alerte critique détectée sur les données actuelles.</p>
            )}
          </div>
        </Panel>
      </div>

      <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: "1rem" }}>
        <Panel title="Taxonomie durable PNPI">
          <div style={{ display: "grid", gap: "0.7rem" }}>
            {cockpit.taxonomie_durable.map((item) => (
              <div key={item.axe}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#374151", fontSize: "0.82rem" }}>
                  <strong style={{ textTransform: "capitalize" }}>{item.axe.replaceAll("_", " ")}</strong>
                  <span>{item.couverture}/100 · {item.statut}</span>
                </div>
                <Progress value={item.couverture} color={item.couverture >= 45 ? "#009440" : "#d97706"} />
                <p style={{ margin: "0.25rem 0 0", color: "#6b7280", fontSize: "0.76rem" }}>
                  {item.investissements} investissement(s) · {item.ressources} ressource(s) identifiée(s)
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Profils sectoriels de transition">
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {cockpit.profils_sectoriels.slice(0, 5).map((profile) => (
              <div key={profile.secteur} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "0.75rem", background: "#f8fafc" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
                  <strong style={{ color: "#111827", textTransform: "capitalize" }}>{profile.secteur.replaceAll("_", " ")}</strong>
                  <Badge label={profile.priorite} color={profile.priorite === "haute" ? "#b91c1c" : "#003F8F"} />
                </div>
                <p style={{ margin: "0.35rem 0", color: "#4b5563", fontSize: "0.8rem" }}>
                  Préparation {profile.score_preparation}/100 · pression carbone {profile.pression_carbone}/100
                </p>
                <p style={{ margin: 0, color: "#6b7280", fontSize: "0.76rem", lineHeight: 1.5 }}>
                  Leviers : {profile.leviers.slice(0, 3).join(", ")}
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Empreinte et ressources par secteur">
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {cockpit.secteurs.slice(0, 7).map((sector) => (
              <div key={sector.secteur}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#374151", fontSize: "0.82rem" }}>
                  <strong style={{ textTransform: "capitalize" }}>{sector.secteur.replaceAll("_", " ")}</strong>
                  <span>{sector.co2_estime_tonnes} t CO₂</span>
                </div>
                <Progress value={Math.min(100, sector.co2_estime_tonnes * 8)} color="#b42318" />
                <p style={{ margin: "0.25rem 0 0", color: "#6b7280", fontSize: "0.76rem" }}>
                  {sector.atis_approuves} ATI approuvé(s) · {formatNumber(sector.energie_kwh)} kWh · intensité {sector.intensite_energie}
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Risques climatiques territoriaux">
          <div style={{ display: "grid", gap: "0.7rem" }}>
            {cockpit.territoires.slice(0, 7).map((territoire) => (
              <div key={territoire.province} style={{ borderBottom: "1px solid #f3f4f6", paddingBottom: "0.65rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                  <strong style={{ color: "#111827", textTransform: "capitalize" }}>{territoire.province.replaceAll("_", " ")}</strong>
                  <Badge label={territoire.niveau_risque} color={territoire.niveau_risque === "élevé" ? "#b91c1c" : "#003F8F"} />
                </div>
                <p style={{ margin: "0.25rem 0 0", color: "#6b7280", fontSize: "0.78rem" }}>
                  {territoire.operateurs} opérateur(s) · {territoire.risques.join(", ")}
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Trajectoire de transition">
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {cockpit.trajectoire.map((step) => (
              <div key={step.horizon} style={{ borderLeft: "4px solid #009440", paddingLeft: "0.75rem" }}>
                <strong style={{ color: "#003F8F" }}>{step.horizon}</strong>
                <p style={{ margin: "0.25rem 0 0", color: "#4b5563", fontSize: "0.82rem", lineHeight: 1.5 }}>{step.objectif}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: "1rem" }}>
        <Panel title="Trajectoire carbone indicative">
          <div style={{ display: "grid", gap: "0.7rem" }}>
            {cockpit.trajectoire_carbone.map((step) => (
              <div key={step.horizon} style={{ borderLeft: "4px solid #b42318", paddingLeft: "0.75rem" }}>
                <strong style={{ color: "#111827", textTransform: "capitalize" }}>{step.horizon}</strong>
                <p style={{ margin: "0.2rem 0", color: "#b42318", fontWeight: 950 }}>{step.co2_tonnes} t CO₂</p>
                <p style={{ margin: 0, color: "#4b5563", fontSize: "0.8rem", lineHeight: 1.5 }}>{step.objectif}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Opportunités de circularité">
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {cockpit.opportunites_circularite.slice(0, 5).map((item) => (
              <div key={`${item.operateur}-${item.opportunite}`} style={{ borderBottom: "1px solid #f3f4f6", paddingBottom: "0.65rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
                  <strong style={{ color: "#111827" }}>{item.operateur}</strong>
                  <Badge label={item.priorite} color={item.priorite === "haute" ? "#b91c1c" : "#0f766e"} />
                </div>
                <p style={{ margin: "0.25rem 0", color: "#4b5563", fontSize: "0.8rem" }}>{item.opportunite}</p>
                <p style={{ margin: 0, color: "#6b7280", fontSize: "0.76rem" }}>
                  {item.province.replaceAll("_", " ")} · {item.ressources_cibles.join(", ")} · {item.gain_potentiel}
                </p>
              </div>
            ))}
            {!cockpit.opportunites_circularite.length && (
              <p style={{ margin: 0, color: "#6b7280" }}>Aucune opportunité détectée avec les données actuelles.</p>
            )}
          </div>
        </Panel>

        <Panel title="Sécurité des ressources">
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {cockpit.securite_ressources.map((item) => (
              <div key={item.type}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#374151", fontSize: "0.82rem" }}>
                  <strong style={{ textTransform: "capitalize" }}>{item.type.replaceAll("_", " ")}</strong>
                  <span>{item.dependance_import_pct}% import · {item.niveau_risque}</span>
                </div>
                <Progress value={item.dependance_import_pct} color={item.dependance_import_pct >= 60 ? "#b91c1c" : "#d97706"} />
                <p style={{ margin: "0.25rem 0 0", color: "#6b7280", fontSize: "0.76rem" }}>{item.ressources} ressource(s) suivie(s)</p>
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

      <Panel title="Plan d’actions ministériel durable" style={{ marginTop: "1rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "0.75rem" }}>
          {cockpit.actions_ministerielles.map((item) => (
            <div key={item.chantier} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "0.8rem", background: "#f8fafc" }}>
              <Badge label={item.delai} color="#003F8F" />
              <strong style={{ display: "block", marginTop: "0.4rem", color: "#111827" }}>{item.chantier}</strong>
              <p style={{ margin: "0.25rem 0", color: "#4b5563", fontSize: "0.82rem" }}>{item.responsable}</p>
              <p style={{ margin: 0, color: "#6b7280", fontSize: "0.78rem", lineHeight: 1.5 }}>{item.livrable}</p>
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
