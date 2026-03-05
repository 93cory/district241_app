import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchPNPIInspections, fetchPNPIOperateurs } from "../../../lib/api";
import { fetchBackendProfile } from "../../../lib/backend";
import { InspectionCreateForm } from "./components/InspectionCreateForm";
import { InspectionsFiltersClient } from "./components/InspectionsFiltersClient";

const ALLOWED = new Set(["admin", "ministre", "directeur", "instructeur", "inspecteur"]);
const STATUT_LABELS: Record<string, string> = { conforme: "Conforme", non_conforme: "Non conforme", partiel: "Partiel" };
const STATUT_COLORS: Record<string, string> = { conforme: "#10b981", non_conforme: "#ef4444", partiel: "#f59e0b" };

type SearchParams = { statut_conformite?: string; inspecteur?: string };

export default async function InspectionsPage({ searchParams }: { searchParams: SearchParams }) {
  let userRoles: string[] = [];
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).some(r => ALLOWED.has(r))) redirect("/connexion");
    userRoles = profile.roles ?? [];
  } catch { redirect("/connexion"); }

  const statut_conformite = searchParams.statut_conformite ?? "";
  const inspecteur = searchParams.inspecteur ?? "";
  const canCreate = userRoles.some(r => ["admin", "inspecteur", "directeur"].includes(r));

  try {
    const [inspections, operateurs] = await Promise.all([
      fetchPNPIInspections({ statut_conformite: statut_conformite || undefined, inspecteur_username: inspecteur || undefined, limit: 100 }),
      canCreate ? fetchPNPIOperateurs() : Promise.resolve([]),
    ]);

    const conformeCount = inspections.filter(i => i.statut_conformite === "conforme").length;
    const nonConformeCount = inspections.filter(i => i.statut_conformite === "non_conforme").length;

    return (
      <section className="section">
        <div style={{ marginBottom: "0.75rem", fontSize: "0.875rem" }}>
          <Link href="/pnpi" style={{ color: "#6b7280", textDecoration: "none" }}>← Dashboard</Link>
        </div>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          {/* Liste */}
          <div style={{ flex: "2 1 500px" }}>
            <div className="chart-card" style={{ padding: "1rem 1.25rem" }}>
              <div style={{ marginBottom: "1rem" }}>
                <h2 style={{ margin: "0 0 0.25rem", color: "#003F8F" }}>Inspections de conformite</h2>
                <p style={{ margin: "0 0 0.75rem", color: "#6b7280", fontSize: "0.875rem" }}>
                  {inspections.length} rapport(s) &middot; <span style={{ color: "#10b981", fontWeight: 600 }}>{conformeCount} conformes</span> &middot; <span style={{ color: "#ef4444", fontWeight: 600 }}>{nonConformeCount} non conformes</span>
                </p>
                <InspectionsFiltersClient statut_conformite={statut_conformite} inspecteur={inspecteur} />
              </div>
              {inspections.length === 0 ? (
                <p style={{ color: "#9ca3af", textAlign: "center", padding: "2rem 0" }}>Aucune inspection avec ces filtres.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {inspections.map(insp => (
                    <Link key={insp.id} href={`/pnpi/inspections/${insp.id}`} style={{ textDecoration: "none", display: "block" }}>
                    <div style={{ padding: "0.875rem 1rem", background: "#f9fafb", borderRadius: "8px", border: "1px solid #f3f4f6", cursor: "pointer" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", flexWrap: "wrap" }}>
                        <div>
                          <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#003F8F", fontSize: "0.78rem" }}>{insp.id}</span>
                          <div style={{ fontSize: "0.8rem", color: "#374151", marginTop: "0.2rem" }}>{insp.operateur_nom || insp.operateur_id}</div>
                          {insp.ati_numero && <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>ATI : {insp.ati_numero}</div>}
                        </div>
                        <span style={{ padding: "0.2rem 0.6rem", borderRadius: "999px", background: `${STATUT_COLORS[insp.statut_conformite] ?? "#6b7280"}18`, color: STATUT_COLORS[insp.statut_conformite] ?? "#6b7280", fontWeight: 700, fontSize: "0.72rem", whiteSpace: "nowrap" }}>
                          {STATUT_LABELS[insp.statut_conformite] ?? insp.statut_conformite}
                        </span>
                      </div>
                      <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "#6b7280" }}>
                        <span>{new Date(insp.date_inspection).toLocaleDateString("fr-FR")}</span>
                        <span style={{ margin: "0 0.4rem" }}>&middot;</span>
                        <span>{insp.inspecteur_nom || insp.inspecteur_username}</span>
                      </div>
                      <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "#374151" }}>{insp.observations.slice(0, 120)}{insp.observations.length > 120 ? "..." : ""}</p>
                      {insp.mesures_correctives && (
                        <div style={{ marginTop: "0.4rem", padding: "0.4rem 0.65rem", background: "#fef9eb", borderRadius: "4px", fontSize: "0.75rem", color: "#92400e" }}>
                          <strong>Mesures : </strong>{insp.mesures_correctives.slice(0, 100)}{insp.mesures_correctives.length > 100 ? "..." : ""}
                        </div>
                      )}
                    </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Formulaire */}
          {canCreate && (
            <div style={{ flex: "1 1 320px" }}>
              <div className="chart-card" style={{ padding: "1.25rem" }}>
                <h3 style={{ margin: "0 0 1rem", color: "#003F8F", fontSize: "0.95rem" }}>Nouveau rapport d&apos;inspection</h3>
                <InspectionCreateForm operateurs={operateurs} />
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
