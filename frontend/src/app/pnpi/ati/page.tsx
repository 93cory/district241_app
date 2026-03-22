import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchPNPIATIs, type ATIRead } from "../../../lib/api";
import { fetchBackendProfile } from "../../../lib/backend";
import { ATIFiltersClient } from "./components/ATIFiltersClient";
import { ATITableWithSelection } from "./ATITableWithSelection";

const PNPI_ROLES = new Set(["admin", "ministre", "directeur", "instructeur", "inspecteur"]);
const STATUT_LABELS: Record<string, string> = { soumis: "Soumis", en_instruction: "En instruction", en_validation: "En validation", approuve: "Approuve", rejete: "Rejete", expire: "Expire" };
const STATUT_COLORS: Record<string, string> = { soumis: "#f59e0b", en_instruction: "#3b82f6", en_validation: "#8b5cf6", approuve: "#10b981", rejete: "#ef4444", expire: "#9ca3af" };
const PRIORITE_COLORS: Record<string, string> = { normale: "#6b7280", elevee: "#f59e0b", urgente: "#ef4444" };
const SECTEUR_LABELS: Record<string, string> = { bois: "Bois", mines: "Mines", agroalimentaire: "Agro", btp: "BTP", petrole: "Petrole", services: "Services" };

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

  try {
    const raw = await fetchPNPIATIs({ statut: statut || undefined, secteur: secteur || undefined, province: province || undefined, skip: (page - 1) * PER_PAGE, limit: PER_PAGE + 1 });
    const hasNext = raw.length > PER_PAGE;
    const atis = raw.slice(0, PER_PAGE);
    const overdueCount = atis.filter((a) => a.is_overdue).length;
    const statutCounts = atis.reduce<Record<string, number>>((acc, a) => { acc[a.statut] = (acc[a.statut] ?? 0) + 1; return acc; }, {});

    return (
      <section className="section">
        <div className="chart-card" style={{ padding: "1rem 1.25rem" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <Link href="/pnpi" style={{ color: "#6b7280", fontSize: "0.8rem", textDecoration: "none" }}>← Dashboard</Link>
              </div>
              <h2 style={{ margin: "0.25rem 0 0", color: "#003F8F" }}>Gestion des ATI</h2>
              <p style={{ margin: "0.2rem 0 0", color: "#6b7280", fontSize: "0.875rem" }}>
                Page {page} &middot; {atis.length} dossier(s) {overdueCount > 0 && <span style={{ color: "#d97706", fontWeight: 600 }}>— {overdueCount} en retard SLA</span>}
              </p>
            </div>
            <a
              href={`${process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000"}/pnpi/exports/ati.csv`}
              style={{ padding: "0.4rem 0.75rem", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "6px", color: "#374151", fontSize: "0.78rem", fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}
            >
              ↓ CSV
            </a>
          </div>
          {/* Mini KPIs */}
          {!statut && page === 1 && (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              {Object.entries(STATUT_LABELS).map(([key, label]) => {
                const count = statutCounts[key] ?? 0;
                if (count === 0) return null;
                return (
                  <a key={key} href={`/pnpi/ati?statut=${key}`} style={{ padding: "0.35rem 0.7rem", borderRadius: "999px", background: `${STATUT_COLORS[key]}18`, color: STATUT_COLORS[key], fontWeight: 700, fontSize: "0.72rem", textDecoration: "none", whiteSpace: "nowrap" }}>
                    {label} ({count})
                  </a>
                );
              })}
            </div>
          )}
          {/* Filters */}
          <div style={{ marginBottom: "1rem" }}>
            <ATIFiltersClient statut={statut} secteur={secteur} province={province} />
          </div>
          {/* Table with bulk selection */}
          <ATITableWithSelection atis={atis} />
          {/* Pagination */}
          {(page > 1 || hasNext) && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", padding: "0.75rem 0", borderTop: "1px solid #f3f4f6" }}>
              <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                Page {page} &middot; {atis.length} dossier(s) affiches
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {page > 1 && (
                  <a
                    href={`/pnpi/ati?${new URLSearchParams({ ...(statut && { statut }), ...(secteur && { secteur }), ...(province && { province }), page: String(page - 1) })}`}
                    style={{ padding: "0.4rem 0.875rem", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "6px", color: "#374151", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none" }}
                  >← Precedent</a>
                )}
                {hasNext && (
                  <a
                    href={`/pnpi/ati?${new URLSearchParams({ ...(statut && { statut }), ...(secteur && { secteur }), ...(province && { province }), page: String(page + 1) })}`}
                    style={{ padding: "0.4rem 0.875rem", background: "#003F8F", color: "white", border: "none", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none" }}
                  >Suivant →</a>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    return <section className="section"><div className="chart-card"><h2 style={{ color: "#b42318", marginTop: 0 }}>Erreur</h2><p style={{ color: "#b42318" }}>{msg}</p></div></section>;
  }
}
