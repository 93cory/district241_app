import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchPNPIATIs, type ATIRead } from "../../../lib/api";
import { fetchBackendProfile } from "../../../lib/backend";
import { ATIFiltersClient } from "./components/ATIFiltersClient";
import { WorkflowButtons } from "./components/WorkflowButton";

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
          {/* Filters */}
          <div style={{ marginBottom: "1rem" }}>
            <ATIFiltersClient statut={statut} secteur={secteur} province={province} />
          </div>
          {/* Table */}
          {atis.length === 0 ? (
            <p style={{ color: "#9ca3af", textAlign: "center", padding: "2rem 0" }}>Aucun ATI trouve avec ces filtres.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #f3f4f6" }}>
                    {["Numero ATI", "Secteur", "Statut", "Priorite", "Instructeur", "Age (j)", "SLA", "Actions"].map((h) => (
                      <th key={h} style={{ padding: "0.5rem 0.75rem", textAlign: "left", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", fontSize: "0.7rem", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {atis.map((ati) => (
                    <tr key={ati.id} style={{ borderBottom: "1px solid #f9fafb", background: ati.is_overdue ? "#fef9eb" : "transparent" }}>
                      <td style={{ padding: "0.625rem 0.75rem" }}>
                        <Link href={`/pnpi/ati/${ati.id}`} style={{ fontWeight: 700, color: "#003F8F", fontFamily: "monospace", fontSize: "0.78rem", textDecoration: "none" }}>{ati.numero_ati}</Link>
                        <div style={{ color: "#9ca3af", fontSize: "0.72rem", marginTop: "0.1rem" }}>{ati.type_activite.slice(0, 40)}{ati.type_activite.length > 40 ? "..." : ""}</div>
                      </td>
                      <td style={{ padding: "0.625rem 0.75rem", color: "#374151" }}>{SECTEUR_LABELS[ati.secteur] ?? ati.secteur}</td>
                      <td style={{ padding: "0.625rem 0.75rem" }}>
                        <span style={{ padding: "0.2rem 0.5rem", borderRadius: "999px", background: `${STATUT_COLORS[ati.statut] ?? "#6b7280"}18`, color: STATUT_COLORS[ati.statut] ?? "#6b7280", fontWeight: 600, fontSize: "0.7rem" }}>
                          {STATUT_LABELS[ati.statut] ?? ati.statut}
                        </span>
                      </td>
                      <td style={{ padding: "0.625rem 0.75rem" }}>
                        <span style={{ color: PRIORITE_COLORS[ati.priorite] ?? "#6b7280", fontWeight: ati.priorite === "urgente" ? 700 : 500, textTransform: "capitalize", fontSize: "0.8rem" }}>{ati.priorite}</span>
                      </td>
                      <td style={{ padding: "0.625rem 0.75rem", color: "#6b7280", fontSize: "0.78rem" }}>{ati.instructeur_username ?? "—"}</td>
                      <td style={{ padding: "0.625rem 0.75rem", fontWeight: 600, color: ati.age_jours > 30 ? "#d97706" : "#374151", textAlign: "right" }}>{ati.age_jours}</td>
                      <td style={{ padding: "0.625rem 0.75rem", textAlign: "center" }}>
                        {ati.is_overdue ? <span style={{ padding: "0.15rem 0.4rem", borderRadius: "4px", background: "#fef3c7", color: "#d97706", fontWeight: 700, fontSize: "0.68rem" }}>RETARD</span> : <span style={{ color: "#10b981", fontSize: "0.72rem", fontWeight: 600 }}>OK</span>}
                      </td>
                      <td style={{ padding: "0.625rem 0.75rem" }}>
                        <WorkflowButtons atiId={ati.id} currentStatut={ati.statut} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
