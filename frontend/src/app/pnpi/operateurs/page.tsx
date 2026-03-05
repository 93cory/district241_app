import Link from "next/link";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { fetchPNPIOperateurs, fetchPNPICarte } from "../../../lib/api";
import { fetchBackendProfile } from "../../../lib/backend";
import { OperateursFiltersClient } from "./components/OperateursFiltersClient";
import { OperateurCreateForm } from "./components/OperateurCreateForm";

const CarteOperateurs = dynamic(() => import("../components/CarteOperateurs"), {
  ssr: false,
  loading: () => <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: "0.82rem" }}>Chargement de la carte...</div>,
});

const PNPI_ROLES = new Set(["admin", "ministre", "directeur", "instructeur", "inspecteur"]);
const SECTEUR_LABELS: Record<string, string> = { bois: "Bois", mines: "Mines", agroalimentaire: "Agro", btp: "BTP", petrole: "Petrole", services: "Services" };
const SECTEUR_COLORS: Record<string, string> = { bois: "#16a34a", mines: "#d97706", agroalimentaire: "#059669", btp: "#2563eb", petrole: "#7c3aed", services: "#0284c7" };

type SearchParams = { secteur?: string; province?: string };

export default async function OperateursPage({ searchParams }: { searchParams: SearchParams }) {
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).some((r) => PNPI_ROLES.has(r))) redirect("/connexion");
  } catch { redirect("/connexion"); }

  let canCreate = false;
  try {
    const profile = await fetchBackendProfile();
    canCreate = ((profile.roles ?? []) as string[]).some(r => ["admin", "directeur", "instructeur"].includes(r));
  } catch { /* ignore */ }

  const secteur = searchParams.secteur ?? "";
  const province = searchParams.province ?? "";

  try {
    const [operateurs, carte] = await Promise.all([
      fetchPNPIOperateurs({ secteur: secteur || undefined, province: province || undefined }),
      fetchPNPICarte().catch(() => []),
    ]);
    const totalEffectifs = operateurs.reduce((sum, op) => sum + (op.effectif_declare ?? 0), 0);

    return (
      <section className="section">
        <div className="chart-card" style={{ padding: "1rem 1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem" }}>
            <div>
              <div style={{ marginBottom: "0.25rem" }}>
                <Link href="/pnpi" style={{ color: "#6b7280", fontSize: "0.8rem", textDecoration: "none" }}>← Dashboard</Link>
              </div>
              <h2 style={{ margin: 0, color: "#003F8F" }}>Registre des operateurs industriels</h2>
              <p style={{ margin: "0.2rem 0 0", color: "#6b7280", fontSize: "0.875rem" }}>
                {operateurs.length} operateur(s) &middot; {totalEffectifs.toLocaleString("fr-FR")} emplois declares
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {canCreate && <OperateurCreateForm />}
              <a
                href={`${process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000"}/pnpi/exports/operateurs.csv`}
                style={{ padding: "0.4rem 0.75rem", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "6px", color: "#374151", fontSize: "0.78rem", fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}
              >
                ↓ CSV
              </a>
            </div>
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <OperateursFiltersClient secteur={secteur} province={province} />
          </div>
          {operateurs.length === 0 ? (
            <p style={{ color: "#9ca3af", textAlign: "center", padding: "2rem 0" }}>Aucun operateur trouve avec ces filtres.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #f3f4f6" }}>
                    {["Raison sociale", "NIF", "Secteur", "Province", "Ville", "Effectif", "Statut", "Dossier"].map((h) => (
                      <th key={h} style={{ padding: "0.5rem 0.75rem", textAlign: "left", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", fontSize: "0.7rem", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {operateurs.map((op) => (
                    <tr key={op.id} style={{ borderBottom: "1px solid #f9fafb" }}>
                      <td style={{ padding: "0.625rem 0.75rem", fontWeight: 600, color: "#1f2937" }}>{op.raison_sociale}</td>
                      <td style={{ padding: "0.625rem 0.75rem", fontFamily: "monospace", color: "#6b7280", fontSize: "0.78rem" }}>{op.nif_gabon}</td>
                      <td style={{ padding: "0.625rem 0.75rem" }}>
                        <span style={{ padding: "0.15rem 0.5rem", borderRadius: "999px", background: `${SECTEUR_COLORS[op.secteur] ?? "#6b7280"}15`, color: SECTEUR_COLORS[op.secteur] ?? "#6b7280", fontWeight: 600, fontSize: "0.7rem" }}>
                          {SECTEUR_LABELS[op.secteur] ?? op.secteur}
                        </span>
                      </td>
                      <td style={{ padding: "0.625rem 0.75rem", color: "#374151" }}>{op.province.replace(/_/g, " ")}</td>
                      <td style={{ padding: "0.625rem 0.75rem", color: "#6b7280" }}>{op.ville}</td>
                      <td style={{ padding: "0.625rem 0.75rem", textAlign: "right", color: "#374151" }}>{op.effectif_declare?.toLocaleString("fr-FR") ?? "—"}</td>
                      <td style={{ padding: "0.625rem 0.75rem", textAlign: "center" }}>
                        <span style={{ padding: "0.15rem 0.45rem", borderRadius: "999px", background: op.is_active ? "#f0fdf4" : "#f9fafb", color: op.is_active ? "#16a34a" : "#9ca3af", fontWeight: 600, fontSize: "0.7rem" }}>
                          {op.is_active ? "Actif" : "Inactif"}
                        </span>
                      </td>
                      <td style={{ padding: "0.625rem 0.75rem", textAlign: "center" }}>
                        <Link href={`/pnpi/operateurs/${op.id}`} style={{ color: "#003F8F", fontWeight: 600, fontSize: "0.78rem", textDecoration: "none" }}>Voir →</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Carte des operateurs */}
        {carte.length > 0 && (
          <div className="chart-card" style={{ padding: "1.25rem", marginTop: "1.25rem" }}>
            <h3 style={{ margin: "0 0 0.25rem", color: "#003F8F", fontSize: "0.95rem" }}>Carte des operateurs industriels</h3>
            <p style={{ margin: "0 0 0.75rem", color: "#6b7280", fontSize: "0.8rem" }}>{carte.length} operateurs geocodes sur le territoire</p>
            <CarteOperateurs operateurs={carte} />
          </div>
        )}
      </section>
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    return <section className="section"><div className="chart-card"><h2 style={{ color: "#b42318", marginTop: 0 }}>Erreur</h2><p style={{ color: "#b42318" }}>{msg}</p></div></section>;
  }
}
