import Link from "next/link";
import { redirect } from "next/navigation";

import {
  fetchPNPIATIs,
  fetchPNPICarte,
  fetchPNPIInspections,
  fetchPNPIKpis,
  fetchPNPIOperateurs,
  fetchPNPIProvinces,
  fetchPNPISecteurs,
  fetchRINCockpit,
  type ATIRead,
  type InspectionRead,
  type OperateurBrief,
  type OperateurGeoPoint,
  type ProvinceStats,
  type SecteurStats,
} from "../../../lib/api";
import { fetchBackendProfile } from "../../../lib/backend";

const ALLOWED = new Set(["admin", "ministre", "directeur", "instructeur", "inspecteur"]);

const SECTEUR_LABELS: Record<string, string> = {
  bois: "Bois & forêt",
  mines: "Mines",
  agroalimentaire: "Agro-industrie",
  btp: "BTP",
  petrole: "Pétrole",
  services: "Services industriels",
};

const PROVINCE_LABELS: Record<string, string> = {
  estuaire: "Estuaire",
  haut_ogooue: "Haut-Ogooué",
  moyen_ogooue: "Moyen-Ogooué",
  ngounie: "Ngounié",
  nyanga: "Nyanga",
  ogooue_ivindo: "Ogooué-Ivindo",
  ogooue_lolo: "Ogooué-Lolo",
  ogooue_maritime: "Ogooué-Maritime",
  woleu_ntem: "Woleu-Ntem",
};

function pct(part: number, total: number): number {
  return total ? Math.round((part / total) * 100) : 0;
}

function statusStyle(status: string): { bg: string; color: string } {
  if (status === "couvert") return { bg: "#ecfdf3", color: "#006233" };
  if (status === "partiel") return { bg: "#fff7ed", color: "#d97706" };
  return { bg: "#f8fafc", color: "#526175" };
}

function rinCompleteness(
  op: OperateurBrief,
  geo: OperateurGeoPoint | undefined,
  atis: ATIRead[],
  inspections: InspectionRead[],
): { score: number; missing: string[] } {
  let score = 0;
  const missing: string[] = [];

  if (op.raison_sociale && op.nif_gabon && op.secteur && op.province && op.ville) score += 25;
  else missing.push("Identité administrative incomplète");

  if (op.effectif_declare && op.effectif_declare > 0) score += 10;
  else missing.push("Effectifs à renseigner");

  if (geo?.latitude && geo?.longitude) score += 15;
  else missing.push("Coordonnées GPS du site principal");

  if (atis.length > 0) score += 20;
  else missing.push("Aucune autorisation ATI liée");

  if (inspections.length > 0) score += 15;
  else missing.push("Aucune inspection enregistrée");

  if (atis.some((a) => a.statut === "approuve")) score += 10;
  else missing.push("Aucune décision ATI approuvée");

  if (op.is_active) score += 5;
  else missing.push("Statut opérateur inactif");

  return { score: Math.min(score, 100), missing };
}

function tone(score: number): { label: string; color: string; bg: string } {
  if (score >= 75) return { label: "Fiche exploitable", color: "#006233", bg: "#ecfdf3" };
  if (score >= 50) return { label: "À consolider", color: "#d97706", bg: "#fff7ed" };
  return { label: "Prioritaire", color: "#b42318", bg: "#fff1f2" };
}

export default async function RINPage() {
  try {
    const profile = await fetchBackendProfile();
    const roles = (profile.roles ?? []) as string[];
    if (!roles.some((r) => ALLOWED.has(r))) redirect("/connexion");
  } catch {
    redirect("/connexion");
  }

  const [kpis, rinCockpit, operateurs, carte, secteurs, provinces, atis, inspections] = await Promise.all([
    fetchPNPIKpis().catch(() => null),
    fetchRINCockpit().catch(() => null),
    fetchPNPIOperateurs({ limit: 200 }).catch(() => [] as OperateurBrief[]),
    fetchPNPICarte().catch(() => [] as OperateurGeoPoint[]),
    fetchPNPISecteurs().catch(() => [] as SecteurStats[]),
    fetchPNPIProvinces().catch(() => [] as ProvinceStats[]),
    fetchPNPIATIs({ limit: 200 }).catch(() => [] as ATIRead[]),
    fetchPNPIInspections({ limit: 200 }).catch(() => [] as InspectionRead[]),
  ]);

  const geoByOperator = new Map(carte.map((op) => [op.id, op]));
  const atisByOperator = new Map<string, ATIRead[]>();
  const inspectionsByOperator = new Map<string, InspectionRead[]>();

  for (const ati of atis) {
    const existing = atisByOperator.get(ati.operateur_id) ?? [];
    existing.push(ati);
    atisByOperator.set(ati.operateur_id, existing);
  }
  for (const inspection of inspections) {
    const existing = inspectionsByOperator.get(inspection.operateur_id) ?? [];
    existing.push(inspection);
    inspectionsByOperator.set(inspection.operateur_id, existing);
  }

  const fiches = operateurs
    .map((op) => {
      const result = rinCompleteness(
        op,
        geoByOperator.get(op.id),
        atisByOperator.get(op.id) ?? [],
        inspectionsByOperator.get(op.id) ?? [],
      );
      return {
        ...op,
        ...result,
        atiCount: atisByOperator.get(op.id)?.length ?? 0,
        inspectionCount: inspectionsByOperator.get(op.id)?.length ?? 0,
      };
    })
    .sort((a, b) => a.score - b.score);

  const averageScore = rinCockpit?.score_national ?? pct(
    fiches.reduce((sum, f) => sum + f.score, 0),
    Math.max(fiches.length, 1) * 100,
  );
  const completeCount = fiches.filter((f) => f.score >= 75).length;
  const criticalCount = fiches.filter((f) => f.score < 50).length;
  const geocodedCount = carte.length;
  const activeCount = operateurs.filter((op) => op.is_active).length;
  const totalEffectifs = operateurs.reduce((sum, op) => sum + (op.effectif_declare ?? 0), 0);
  const topIncomplete = fiches.slice(0, 8);
  const nationalAlerts = [
    `${criticalCount} fiche(s) opérateur à compléter en priorité`,
    `${Math.max(operateurs.length - geocodedCount, 0)} opérateur(s) sans géolocalisation exploitable`,
    `${operateurs.filter((op) => !op.effectif_declare).length} opérateur(s) sans effectif déclaré`,
    `${operateurs.filter((op) => (atisByOperator.get(op.id)?.length ?? 0) === 0).length} opérateur(s) sans ATI liée`,
  ];

  return (
    <section className="section">
      <div style={{ marginBottom: "0.75rem", fontSize: "0.875rem" }}>
        <Link href="/pnpi" style={{ color: "#6b7280", textDecoration: "none" }}>
          Dashboard
        </Link>
        <span style={{ color: "#6b7280", margin: "0 0.5rem" }}>/</span>
        <span style={{ color: "#003F8F", fontWeight: 700 }}>Référentiel Industriel National</span>
      </div>

      <header
        className="chart-card"
        style={{
          padding: "1.35rem",
          marginBottom: "1.25rem",
          background:
            "linear-gradient(135deg, rgba(0,63,143,0.10), rgba(0,98,51,0.10) 55%, rgba(242,184,0,0.12))",
          border: "1px solid rgba(0,63,143,0.12)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ maxWidth: 760 }}>
            <div
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#006233",
                fontWeight: 900,
                fontSize: "0.72rem",
              }}
            >
              Cockpit national du RIN
            </div>
            <h1 style={{ margin: "0.35rem 0", color: "#003F8F", fontSize: "1.55rem" }}>
              Référentiel Industriel National
            </h1>
            <p style={{ margin: 0, color: "#526175", lineHeight: 1.55 }}>
              Vue consolidée des entreprises industrielles, de leur complétude administrative, de
              leurs autorisations, inspections et données critiques. Objectif : donner au Ministère
              une base unique pour décider, contrôler, planifier et produire les statistiques
              industrielles nationales.
            </p>
          </div>
          <div
            style={{
              minWidth: 210,
              background: "#fff",
              borderRadius: 18,
              padding: "1rem",
              border: "1px solid rgba(0,98,51,0.16)",
              boxShadow: "0 14px 30px rgba(0,0,0,0.06)",
            }}
          >
            <div style={{ fontSize: "0.72rem", color: "#526175", fontWeight: 800 }}>
              Complétude moyenne RIN
            </div>
            <div style={{ fontSize: 42, lineHeight: 1, color: "#006233", fontWeight: 950 }}>
              {averageScore}%
            </div>
            <div style={{ height: 8, borderRadius: 999, background: "#e5e7eb", marginTop: "0.75rem" }}>
              <div
                style={{
                  height: "100%",
                  width: `${averageScore}%`,
                  borderRadius: 999,
                  background: "linear-gradient(90deg, #006233, #0c7eb4)",
                }}
              />
            </div>
          </div>
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "0.85rem",
          marginBottom: "1.25rem",
        }}
      >
        {[
          ["Opérateurs actifs", activeCount, "Base industrielle suivie", "#003F8F"],
          ["Fiches exploitables", completeCount, "Score RIN ≥ 75%", "#006233"],
          ["Fiches prioritaires", criticalCount, "Score RIN < 50%", "#b42318"],
          ["Géolocalisés", geocodedCount, "Points sur carte", "#0c7eb4"],
          ["Secteurs", secteurs.length, "Filières couvertes", "#7c3aed"],
          ["Emplois déclarés", totalEffectifs.toLocaleString("fr-FR"), "Donnée consolidée", "#d97706"],
        ].map(([label, value, hint, color]) => (
          <article
            className="chart-card"
            key={label as string}
            style={{ padding: "1rem", borderTop: `4px solid ${color}` }}
          >
            <div style={{ color: color as string, fontSize: 25, fontWeight: 900 }}>{value}</div>
            <div style={{ color: "#1f2937", fontSize: "0.82rem", fontWeight: 800 }}>{label}</div>
            <div style={{ color: "#6b7280", fontSize: "0.72rem", marginTop: 3 }}>{hint}</div>
          </article>
        ))}
      </div>

      <div
        className="chart-card"
        style={{ padding: "1rem 1.2rem", marginBottom: "1.25rem", borderLeft: "4px solid #d97706" }}
      >
        <h2 style={{ margin: "0 0 0.65rem", color: "#92400e", fontSize: "1rem" }}>
          Alertes de complétude nationale
        </h2>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {nationalAlerts.map((alert) => (
            <span
              key={alert}
              style={{
                padding: "0.42rem 0.65rem",
                borderRadius: 999,
                background: "#fff7ed",
                color: "#92400e",
                border: "1px solid #fed7aa",
                fontSize: "0.76rem",
                fontWeight: 800,
              }}
            >
              {alert}
            </span>
          ))}
        </div>
      </div>

      {rinCockpit && (
        <div
          className="chart-card"
          style={{ padding: "1rem 1.2rem", marginBottom: "1.25rem", borderLeft: "4px solid #003F8F" }}
        >
          <h2 style={{ margin: "0 0 0.45rem", color: "#003F8F", fontSize: "1rem" }}>
            Domaine Métier 1 — lecture officielle
          </h2>
          <p style={{ margin: 0, color: "#374151", lineHeight: 1.55 }}>{rinCockpit.lecture_executive}</p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(320px, 0.8fr)", gap: "1.25rem" }}>
        <div className="chart-card" style={{ padding: "1.2rem" }}>
          <h2 style={{ margin: "0 0 0.3rem", color: "#003F8F", fontSize: "1.05rem" }}>
            File des fiches RIN à compléter
          </h2>
          <p style={{ margin: "0 0 1rem", color: "#6b7280", fontSize: "0.82rem" }}>
            Priorité aux entreprises dont la fiche manque d’éléments nécessaires à la décision
            ministérielle ou au contrôle terrain.
          </p>
          <div className="table-scroll">
            <table className="annex-table">
              <thead>
                <tr>
                  <th>Opérateur</th>
                  <th>Secteur</th>
                  <th>Province</th>
                  <th>Score</th>
                  <th>Manques principaux</th>
                  <th>Dossier</th>
                </tr>
              </thead>
              <tbody>
                {topIncomplete.map((op) => {
                  const meta = tone(op.score);
                  return (
                    <tr key={op.id}>
                      <td style={{ fontWeight: 800 }}>{op.raison_sociale}</td>
                      <td>{SECTEUR_LABELS[op.secteur] ?? op.secteur}</td>
                      <td>{PROVINCE_LABELS[op.province] ?? op.province.replace(/_/g, " ")}</td>
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            minWidth: 64,
                            justifyContent: "center",
                            padding: "0.2rem 0.5rem",
                            borderRadius: 999,
                            background: meta.bg,
                            color: meta.color,
                            fontWeight: 900,
                          }}
                        >
                          {op.score}%
                        </span>
                      </td>
                      <td style={{ color: "#526175", fontSize: "0.78rem" }}>
                        {op.missing.slice(0, 2).join(" · ") || meta.label}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Link href={`/pnpi/operateurs/${op.id}`} className="pnpi-row-action">
                          Ouvrir →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <aside style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="chart-card" style={{ padding: "1.2rem" }}>
            <h2 style={{ margin: "0 0 0.9rem", color: "#003F8F", fontSize: "1.05rem" }}>
              Domaines RIN
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              {(rinCockpit?.coverage ?? []).map((item) => {
                const meta = statusStyle(item.statut);
                return (
                  <div key={item.label} style={{ paddingBottom: "0.65rem", borderBottom: "1px solid #f3f4f6" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                      <strong style={{ color: "#1f2937", fontSize: "0.84rem" }}>{item.label}</strong>
                      <span
                        style={{
                          background: meta.bg,
                          color: meta.color,
                          borderRadius: 999,
                          padding: "0.12rem 0.5rem",
                          fontSize: "0.68rem",
                          fontWeight: 900,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.statut} · {item.couverture_pct}%
                      </span>
                    </div>
                    <div style={{ color: "#6b7280", fontSize: "0.74rem", marginTop: 4 }}>{item.description}</div>
                    <div style={{ height: 6, borderRadius: 999, background: "#eef2f7", marginTop: 7 }}>
                      <div
                        style={{
                          width: `${item.couverture_pct}%`,
                          height: "100%",
                          borderRadius: 999,
                          background: meta.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              {!rinCockpit && <div style={{ color: "#6b7280", fontSize: "0.82rem" }}>Couverture RIN indisponible.</div>}
            </div>
          </div>

          <div className="chart-card" style={{ padding: "1.2rem" }}>
            <h2 style={{ margin: "0 0 0.9rem", color: "#003F8F", fontSize: "1.05rem" }}>
              Couverture par secteur
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {secteurs.slice(0, 6).map((s) => {
                const width = pct(s.nb_operateurs, Math.max(operateurs.length, 1));
                return (
                  <div key={s.secteur}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                      <strong>{SECTEUR_LABELS[s.secteur] ?? s.secteur}</strong>
                      <span style={{ color: "#526175" }}>{s.nb_operateurs} opérateurs</span>
                    </div>
                    <div style={{ height: 7, borderRadius: 999, background: "#eef2f7", marginTop: 5 }}>
                      <div style={{ width: `${width}%`, height: "100%", borderRadius: 999, background: "#0c7eb4" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          gap: "1rem",
          marginTop: "1.25rem",
        }}
      >
        <div className="chart-card" style={{ padding: "1.1rem" }}>
          <h2 style={{ margin: "0 0 0.8rem", color: "#003F8F", fontSize: "1rem" }}>
            Couverture provinciale
          </h2>
          <div style={{ display: "grid", gap: "0.55rem" }}>
            {provinces.slice(0, 9).map((p) => (
              <div key={p.province} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                <span>{PROVINCE_LABELS[p.province] ?? p.province.replace(/_/g, " ")}</span>
                <strong style={{ color: "#003F8F" }}>{p.nb_operateurs}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card" style={{ padding: "1.1rem" }}>
          <h2 style={{ margin: "0 0 0.8rem", color: "#003F8F", fontSize: "1rem" }}>
            Décisions que le RIN rend possibles
          </h2>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "#526175", fontSize: "0.82rem", lineHeight: 1.65 }}>
            <li>Identifier les entreprises industrielles non géolocalisées.</li>
            <li>Prioriser les inspections selon le niveau de complétude et de risque.</li>
            <li>Produire une statistique nationale consolidée par secteur et province.</li>
            <li>Préparer les extensions : production, énergie, investissements, certifications.</li>
          </ul>
        </div>

        <div className="chart-card" style={{ padding: "1.1rem" }}>
          <h2 style={{ margin: "0 0 0.8rem", color: "#003F8F", fontSize: "1rem" }}>
            Prochain palier technique
          </h2>
          <p style={{ margin: 0, color: "#526175", fontSize: "0.82rem", lineHeight: 1.65 }}>
            Finaliser les maillons encore faibles du Domaine 1 : équipements, coffre documentaire
            RIN transversal, certifications dédiées et historique métier détaillé. Le cockpit les
            intégrera automatiquement au fur et à mesure.
          </p>
        </div>
      </div>

      {kpis && (
        <p style={{ color: "#6b7280", fontSize: "0.75rem", marginTop: "1rem" }}>
          Données PNPI générées le {new Date(kpis.generated_at).toLocaleString("fr-FR")} ·{" "}
          {kpis.atis_total} ATI dans le périmètre de pilotage.
        </p>
      )}
    </section>
  );
}
