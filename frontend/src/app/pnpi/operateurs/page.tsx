import Link from "next/link";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { fetchPNPIOperateurs, fetchPNPICarte } from "../../../lib/api";
import { fetchBackendProfile } from "../../../lib/backend";
import { OperateursFiltersClient } from "./components/OperateursFiltersClient";
import { OperateurCreateForm } from "./components/OperateurCreateForm";

const CarteOperateurs = dynamic(() => import("../components/CarteOperateurs"), {
  ssr: false,
  loading: () => <div className="pnpi-brief-map-loading">Chargement de la carte...</div>,
});

const PNPI_ROLES = new Set([
  "admin",
  "ministre",
  "directeur",
  "instructeur",
  "inspecteur",
  "operateur",
]);
const SECTEUR_LABELS: Record<string, string> = {
  bois: "Bois",
  mines: "Mines",
  agroalimentaire: "Agro",
  btp: "BTP",
  petrole: "Petrole",
  services: "Services",
};

type SearchParams = { secteur?: string; province?: string; page?: string };

export default async function OperateursPage({ searchParams }: { searchParams: SearchParams }) {
  let canCreate = false;
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).some((r) => PNPI_ROLES.has(r))) redirect("/connexion");
    canCreate = ((profile.roles ?? []) as string[]).some((r) =>
      ["admin", "directeur", "instructeur"].includes(r),
    );
  } catch {
    redirect("/connexion");
  }

  const secteur = searchParams.secteur ?? "";
  const province = searchParams.province ?? "";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const PER_PAGE = 25;
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

  try {
    const [raw, carte] = await Promise.all([
      fetchPNPIOperateurs({
        secteur: secteur || undefined,
        province: province || undefined,
        skip: (page - 1) * PER_PAGE,
        limit: PER_PAGE + 1,
      }),
      fetchPNPICarte().catch(() => []),
    ]);
    const hasNext = raw.length > PER_PAGE;
    const operateurs = raw.slice(0, PER_PAGE);
    const totalEffectifs = operateurs.reduce((sum, op) => sum + (op.effectif_declare ?? 0), 0);

    const pageParams = (targetPage: number) =>
      new URLSearchParams({
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
              <Link href="/pnpi" className="pnpi-back-link">
                &larr; Tableau de bord
              </Link>
              <h2>Registre des operateurs industriels</h2>
              <p className="pnpi-page-sub">
                Page {page} &middot; {operateurs.length} operateur(s) affiches &middot;{" "}
                {totalEffectifs.toLocaleString("fr-FR")} emplois declares
              </p>
            </div>
            <div className="pnpi-page-actions">
              {canCreate && <OperateurCreateForm />}
              <a href="/api/pnpi/exports/operateurs.csv" className="export-link">
                <span aria-hidden="true">&darr;</span> Export CSV
              </a>
            </div>
          </div>

          {/* Filtres */}
          <div style={{ marginBottom: "1rem" }}>
            <OperateursFiltersClient secteur={secteur} province={province} />
          </div>

          {/* Table */}
          {operateurs.length === 0 ? (
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
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </div>
              <div>Aucun operateur trouve avec ces filtres.</div>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="annex-table">
                <thead>
                  <tr>
                    {[
                      "Raison sociale",
                      "NIF",
                      "Secteur",
                      "Province",
                      "Ville",
                      "Effectif",
                      "Statut",
                      "Dossier",
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {operateurs.map((op) => (
                    <tr key={op.id}>
                      <td style={{ fontWeight: 600 }}>{op.raison_sociale}</td>
                      <td>
                        <span className="pnpi-mono">{op.nif_gabon}</span>
                      </td>
                      <td>
                        <span className={`pnpi-pill pnpi-pill--${op.secteur}`}>
                          {SECTEUR_LABELS[op.secteur] ?? op.secteur}
                        </span>
                      </td>
                      <td style={{ textTransform: "capitalize" }}>
                        {op.province.replace(/_/g, " ")}
                      </td>
                      <td>{op.ville}</td>
                      <td className="num">{op.effectif_declare?.toLocaleString("fr-FR") ?? "—"}</td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          className={`pnpi-pill pnpi-pill--${op.is_active ? "active" : "inactive"}`}
                        >
                          {op.is_active ? "Actif" : "Inactif"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Link href={`/pnpi/operateurs/${op.id}`} className="pnpi-row-action">
                          Voir <span aria-hidden="true">&rarr;</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {(page > 1 || hasNext) && (
            <div className="pnpi-pagination">
              <div className="pnpi-pagination-info">
                Page {page} &middot; {operateurs.length} operateur(s) affiches
              </div>
              <div className="pnpi-pagination-ctrls">
                {page > 1 && (
                  <a href={`/pnpi/operateurs?${pageParams(page - 1)}`} className="prev">
                    <span aria-hidden="true">&larr;</span> Precedent
                  </a>
                )}
                {hasNext && (
                  <a href={`/pnpi/operateurs?${pageParams(page + 1)}`} className="next">
                    Suivant <span aria-hidden="true">&rarr;</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Carte */}
        {carte.length > 0 && (
          <div className="chart-card" style={{ marginTop: "1.25rem" }}>
            <h3 style={{ margin: "0 0 0.3rem" }}>Carte des operateurs industriels</h3>
            <p className="pnpi-page-sub" style={{ marginBottom: "1rem" }}>
              {carte.length} operateurs geocodes sur le territoire
            </p>
            <div className="pnpi-brief-map">
              <CarteOperateurs operateurs={carte} />
            </div>
          </div>
        )}
      </section>
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    return (
      <section className="section">
        <div className="chart-card">
          <h2 style={{ color: "#b42318", marginTop: 0 }}>Erreur</h2>
          <p style={{ color: "#b42318" }}>{msg}</p>
        </div>
      </section>
    );
  }
}
