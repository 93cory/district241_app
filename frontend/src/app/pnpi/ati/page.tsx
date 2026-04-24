import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchPNPIATIs } from "../../../lib/api";
import { fetchBackendProfile } from "../../../lib/backend";
import { ATIFiltersClient } from "./components/ATIFiltersClient";
import { ATITableWithSelection } from "./ATITableWithSelection";

const PNPI_ROLES = new Set(["admin", "ministre", "directeur", "instructeur", "inspecteur", "operateur"]);

const STATUT_LABELS: Record<string, string> = {
  soumis: "Soumis",
  en_instruction: "En instruction",
  en_validation: "En validation",
  approuve: "Approuve",
  rejete: "Rejete",
  expire: "Expire",
};

type SearchParams = { statut?: string; secteur?: string; province?: string; page?: string };

export default async function ATIListPage({ searchParams }: { searchParams: SearchParams }) {
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).some((r) => PNPI_ROLES.has(r))) redirect("/connexion");
  } catch { redirect("/connexion"); }

  const statut = searchParams.statut ?? "";
  const secteur = searchParams.secteur ?? "";
  const province = searchParams.province ?? "";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const PER_PAGE = 25;
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

  try {
    const raw = await fetchPNPIATIs({
      statut: statut || undefined,
      secteur: secteur || undefined,
      province: province || undefined,
      skip: (page - 1) * PER_PAGE,
      limit: PER_PAGE + 1,
    });
    const hasNext = raw.length > PER_PAGE;
    const atis = raw.slice(0, PER_PAGE);
    const overdueCount = atis.filter((a) => a.is_overdue).length;
    const statutCounts = atis.reduce<Record<string, number>>((acc, a) => {
      acc[a.statut] = (acc[a.statut] ?? 0) + 1;
      return acc;
    }, {});

    const pageParams = (targetPage: number) =>
      new URLSearchParams({
        ...(statut && { statut }),
        ...(secteur && { secteur }),
        ...(province && { province }),
        page: String(targetPage),
      }).toString();

    return (
      <section className="section">
        <div className="chart-card">
          {/* Header */}
          <div className="pnpi-page-head">
            <div>
              <Link href="/pnpi" className="pnpi-back-link">&larr; Tableau de bord</Link>
              <h2>Gestion des Agrements Techniques Industriels</h2>
              <p className="pnpi-page-sub">
                Page {page} &middot; {atis.length} dossier(s)
                {overdueCount > 0 && (
                  <>
                    {" "}&middot;{" "}
                    <span className="pnpi-overdue-count">{overdueCount} en retard SLA</span>
                  </>
                )}
              </p>
            </div>
            <div className="pnpi-page-actions">
              <a href="/api/pnpi/exports/ati.csv" className="export-link">
                <span aria-hidden="true">&darr;</span> Export CSV
              </a>
            </div>
          </div>

          {/* Mini KPIs de statuts (uniquement en page 1, sans filtre statut) */}
          {!statut && page === 1 && (
            <div className="pnpi-mini-kpis">
              {Object.entries(STATUT_LABELS).map(([key, label]) => {
                const count = statutCounts[key] ?? 0;
                if (count === 0) return null;
                return (
                  <Link
                    key={key}
                    href={`/pnpi/ati?statut=${key}`}
                    className={`pnpi-mini-kpi pnpi-pill pnpi-pill--${key}`}
                  >
                    {label} ({count})
                  </Link>
                );
              })}
            </div>
          )}

          {/* Filtres */}
          <div style={{ marginBottom: "1rem" }}>
            <ATIFiltersClient statut={statut} secteur={secteur} province={province} />
          </div>

          {/* Table */}
          <ATITableWithSelection atis={atis} />

          {/* Pagination */}
          {(page > 1 || hasNext) && (
            <div className="pnpi-pagination">
              <div className="pnpi-pagination-info">
                Page {page} &middot; {atis.length} dossier(s) affiches
              </div>
              <div className="pnpi-pagination-ctrls">
                {page > 1 && (
                  <a href={`/pnpi/ati?${pageParams(page - 1)}`} className="prev">
                    <span aria-hidden="true">&larr;</span> Precedent
                  </a>
                )}
                {hasNext && (
                  <a href={`/pnpi/ati?${pageParams(page + 1)}`} className="next">
                    Suivant <span aria-hidden="true">&rarr;</span>
                  </a>
                )}
              </div>
            </div>
          )}
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
