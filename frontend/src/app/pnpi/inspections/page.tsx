import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchPNPIInspections, fetchPNPIOperateurs } from "../../../lib/api";
import { fetchBackendProfile } from "../../../lib/backend";
import { KpiCard } from "../../components/KpiCard";
import { InspectionCreateForm } from "./components/InspectionCreateForm";
import { InspectionsFiltersClient } from "./components/InspectionsFiltersClient";

const ALLOWED = new Set(["admin", "ministre", "directeur", "instructeur", "inspecteur"]);

const STATUT_LABELS: Record<string, string> = {
  conforme: "Conforme",
  non_conforme: "Non conforme",
  partiel: "Partiel",
};

type SearchParams = { statut_conformite?: string; inspecteur?: string };

export default async function InspectionsPage({ searchParams }: { searchParams: SearchParams }) {
  let userRoles: string[] = [];
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).some((r) => ALLOWED.has(r))) redirect("/connexion");
    userRoles = profile.roles ?? [];
  } catch {
    redirect("/connexion");
  }

  const statut_conformite = searchParams.statut_conformite ?? "";
  const inspecteur = searchParams.inspecteur ?? "";
  const canCreate = userRoles.some((r) => ["admin", "inspecteur", "directeur"].includes(r));

  try {
    const [inspections, operateurs] = await Promise.all([
      fetchPNPIInspections({
        statut_conformite: statut_conformite || undefined,
        inspecteur_username: inspecteur || undefined,
        limit: 100,
      }),
      canCreate ? fetchPNPIOperateurs() : Promise.resolve([]),
    ]);

    const conformeCount = inspections.filter((i) => i.statut_conformite === "conforme").length;
    const nonConformeCount = inspections.filter(
      (i) => i.statut_conformite === "non_conforme",
    ).length;
    const partielCount = inspections.filter((i) => i.statut_conformite === "partiel").length;
    const tauxConformite =
      inspections.length > 0 ? Math.round((conformeCount / inspections.length) * 100) : 0;

    return (
      <section className="section">
        <div className="chart-card">
          {/* Header */}
          <div className="pnpi-page-head">
            <div>
              <Link href="/pnpi" className="pnpi-back-link">
                &larr; Tableau de bord
              </Link>
              <h2>Inspections de conformite</h2>
              <p className="pnpi-page-sub">
                {inspections.length} rapport(s) &middot;{" "}
                <span className="pnpi-text-conforme">{conformeCount} conformes</span> &middot;{" "}
                <span className="pnpi-text-non-conforme">{nonConformeCount} non conformes</span>
              </p>
            </div>
            <div className="pnpi-page-actions">
              <a href="/api/pnpi/exports/inspections.csv" className="export-link">
                <span aria-hidden="true">&darr;</span> Export CSV
              </a>
            </div>
          </div>

          {/* KPIs */}
          <div className="hero-grid" style={{ marginBottom: "1.5rem" }}>
            <KpiCard
              tone="primary"
              label="Total inspections"
              value={inspections.length}
              sublabel="Rapports enregistres"
            />
            <KpiCard
              tone="success"
              label="Taux conformite"
              value={`${tauxConformite}%`}
              sublabel="Objectif national : 90%"
            />
            <KpiCard
              tone="success"
              label="Conformes"
              value={conformeCount}
              sublabel="Operateurs en regle"
            />
            <KpiCard
              tone="accent"
              label="Partiels"
              value={partielCount}
              sublabel="Conformite partielle"
            />
            <KpiCard
              tone="neutral"
              label="Non conformes"
              value={nonConformeCount}
              sublabel="Mesures correctives requises"
            />
          </div>

          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
            {/* Liste principale */}
            <div style={{ flex: "2 1 540px", minWidth: 0 }}>
              <div className="pnpi-filters-row">
                <InspectionsFiltersClient
                  statut_conformite={statut_conformite}
                  inspecteur={inspecteur}
                />
              </div>

              {inspections.length === 0 ? (
                <div className="pnpi-empty">
                  <div className="pnpi-empty-icon">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M9 12l2 2 4-4" />
                      <circle cx="12" cy="12" r="9" />
                    </svg>
                  </div>
                  <div>Aucune inspection avec ces filtres.</div>
                </div>
              ) : (
                <div className="pnpi-inspection-list">
                  {inspections.map((insp) => (
                    <Link
                      key={insp.id}
                      href={`/pnpi/inspections/${insp.id}`}
                      className={`pnpi-inspection-card pnpi-inspection-card--${insp.statut_conformite}`}
                    >
                      <div className="pnpi-inspection-head">
                        <div>
                          <span className="pnpi-mono">{insp.id}</span>
                          <div className="pnpi-inspection-title">
                            {insp.operateur_nom || insp.operateur_id}
                          </div>
                          {insp.ati_numero && (
                            <div className="pnpi-inspection-ati">ATI : {insp.ati_numero}</div>
                          )}
                        </div>
                        <span className={`pnpi-pill pnpi-pill--${insp.statut_conformite}`}>
                          {STATUT_LABELS[insp.statut_conformite] ?? insp.statut_conformite}
                        </span>
                      </div>

                      <div className="pnpi-inspection-meta">
                        <span>{new Date(insp.date_inspection).toLocaleDateString("fr-FR")}</span>
                        <span className="pnpi-inspection-meta-sep">&middot;</span>
                        <span>{insp.inspecteur_nom || insp.inspecteur_username}</span>
                      </div>

                      <p className="pnpi-inspection-obs">
                        {insp.observations.slice(0, 140)}
                        {insp.observations.length > 140 ? "..." : ""}
                      </p>

                      {insp.mesures_correctives && (
                        <div className="pnpi-inspection-mesures">
                          <strong>Mesures correctives : </strong>
                          {insp.mesures_correctives.slice(0, 120)}
                          {insp.mesures_correctives.length > 120 ? "..." : ""}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Formulaire de creation (aside) */}
            {canCreate && (
              <div style={{ flex: "1 1 320px", minWidth: 0 }}>
                <div className="chart-card">
                  <h3 className="pnpi-card-subtitle">Nouveau rapport d&apos;inspection</h3>
                  <InspectionCreateForm operateurs={operateurs} />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    return (
      <section className="section">
        <div className="chart-card">
          <h2 className="pnpi-error-title">Erreur</h2>
          <p className="pnpi-error-text">{msg}</p>
        </div>
      </section>
    );
  }
}
