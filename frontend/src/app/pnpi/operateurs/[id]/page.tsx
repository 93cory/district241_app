import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { fetchPNPIOperateur, fetchPNPIOperateurATIs } from "../../../../lib/api";
import { fetchBackendProfile } from "../../../../lib/backend";

const PNPI_ROLES = new Set(["admin", "ministre", "directeur", "instructeur", "inspecteur"]);
const STATUT_LABELS: Record<string, string> = { soumis: "Soumis", en_instruction: "En instruction", en_validation: "En validation", approuve: "Approuve", rejete: "Rejete", expire: "Expire" };
const STATUT_COLORS: Record<string, string> = { soumis: "#f59e0b", en_instruction: "#3b82f6", en_validation: "#8b5cf6", approuve: "#10b981", rejete: "#ef4444", expire: "#9ca3af" };
const SECTEUR_LABELS: Record<string, string> = { bois: "Bois & Foret", mines: "Mines", agroalimentaire: "Agro-alimentaire", btp: "BTP", petrole: "Petrole", services: "Services" };
const SECTEUR_COLORS: Record<string, string> = { bois: "#16a34a", mines: "#d97706", agroalimentaire: "#059669", btp: "#2563eb", petrole: "#7c3aed", services: "#0284c7" };

export default async function OperateurDetailPage({ params }: { params: { id: string } }) {
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).some((r) => PNPI_ROLES.has(r))) redirect("/connexion");
  } catch { redirect("/connexion"); }

  let op: Awaited<ReturnType<typeof fetchPNPIOperateur>>;
  let atis: Awaited<ReturnType<typeof fetchPNPIOperateurATIs>>;
  try {
    [op, atis] = await Promise.all([fetchPNPIOperateur(params.id), fetchPNPIOperateurATIs(params.id)]);
  } catch { notFound(); }

  const nbApprouves = atis.filter((a) => a.statut === "approuve").length;
  const nbEnCours = atis.filter((a) => ["soumis", "en_instruction", "en_validation"].includes(a.statut)).length;
  const secteurColor = SECTEUR_COLORS[op.secteur] ?? "#6b7280";

  return (
    <section className="section">
      <div style={{ marginBottom: "0.75rem", fontSize: "0.875rem" }}>
        <Link href="/pnpi" style={{ color: "#6b7280", textDecoration: "none" }}>Dashboard</Link>
        <span style={{ color: "#9ca3af", margin: "0 0.5rem" }}>/</span>
        <Link href="/pnpi/operateurs" style={{ color: "#6b7280", textDecoration: "none" }}>Operateurs</Link>
        <span style={{ color: "#9ca3af", margin: "0 0.5rem" }}>/</span>
        <span style={{ color: "#003F8F", fontWeight: 600 }}>{op.raison_sociale}</span>
      </div>

      {/* Header */}
      <div className="chart-card" style={{ padding: "1.25rem", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <h2 style={{ margin: 0, color: "#003F8F" }}>{op.raison_sociale}</h2>
              <span style={{ padding: "0.2rem 0.6rem", borderRadius: "999px", background: `${secteurColor}15`, color: secteurColor, fontWeight: 700, fontSize: "0.78rem" }}>{SECTEUR_LABELS[op.secteur] ?? op.secteur}</span>
              <span style={{ padding: "0.15rem 0.5rem", borderRadius: "999px", background: op.is_active ? "#f0fdf4" : "#f9fafb", color: op.is_active ? "#16a34a" : "#9ca3af", fontWeight: 600, fontSize: "0.7rem" }}>{op.is_active ? "Actif" : "Inactif"}</span>
            </div>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem" }}>NIF: <strong style={{ fontFamily: "monospace" }}>{op.nif_gabon}</strong> &middot; {op.ville}, {op.province.replace(/_/g, " ")}</p>
          </div>
          <div style={{ display: "flex", gap: "1.5rem" }}>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#003F8F" }}>{atis.length}</div><div style={{ fontSize: "0.72rem", color: "#9ca3af", textTransform: "uppercase" }}>Total ATIs</div></div>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#3b82f6" }}>{nbEnCours}</div><div style={{ fontSize: "0.72rem", color: "#9ca3af", textTransform: "uppercase" }}>En cours</div></div>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#10b981" }}>{nbApprouves}</div><div style={{ fontSize: "0.72rem", color: "#9ca3af", textTransform: "uppercase" }}>Approuves</div></div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
        {/* Info */}
        <div style={{ flex: "1 1 260px" }}>
          <div className="chart-card" style={{ padding: "1.25rem" }}>
            <h3 style={{ margin: "0 0 0.875rem", color: "#003F8F", fontSize: "0.95rem" }}>Fiche operateur</h3>
            <dl style={{ display: "flex", flexDirection: "column", gap: "0.625rem", margin: 0 }}>
              {[
                ["Raison sociale", op.raison_sociale],
                ["NIF Gabon", op.nif_gabon],
                ["Secteur", SECTEUR_LABELS[op.secteur] ?? op.secteur],
                ["Province", op.province.replace(/_/g, " ")],
                ["Ville", op.ville],
                ["Effectif declare", op.effectif_declare ? `${op.effectif_declare.toLocaleString("fr-FR")} employes` : "Non renseigne"],
                ["Email", op.contact_email ?? "—"],
                ["Telephone", op.contact_telephone ?? "—"],
                ["Enregistre par", op.created_by ?? "—"],
                ["Date enregistrement", new Date(op.created_at).toLocaleDateString("fr-FR")],
              ].map(([label, value]) => (
                <div key={label as string} style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", borderBottom: "1px solid #f3f4f6", paddingBottom: "0.5rem" }}>
                  <dt style={{ fontSize: "0.78rem", color: "#9ca3af", flexShrink: 0 }}>{label}</dt>
                  <dd style={{ margin: 0, fontSize: "0.8rem", fontWeight: 500, color: "#1f2937", textAlign: "right" }}>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* ATIs */}
        <div style={{ flex: "2 1 380px" }}>
          <div className="chart-card" style={{ padding: "1.25rem" }}>
            <h3 style={{ margin: "0 0 0.875rem", color: "#003F8F", fontSize: "0.95rem" }}>Dossiers ATI ({atis.length})</h3>
            {atis.length === 0 ? (
              <p style={{ color: "#9ca3af", margin: 0 }}>Aucun dossier ATI pour cet operateur.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {atis.map((ati) => (
                  <Link key={ati.id} href={`/pnpi/ati/${ati.id}`} style={{ textDecoration: "none", display: "block" }}>
                    <div style={{ padding: "0.75rem 1rem", background: "#f9fafb", borderRadius: "8px", border: "1px solid #f3f4f6", cursor: "pointer" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                        <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#003F8F", fontSize: "0.8rem" }}>{ati.numero_ati}</span>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                          <span style={{ padding: "0.15rem 0.5rem", borderRadius: "999px", background: `${STATUT_COLORS[ati.statut] ?? "#6b7280"}18`, color: STATUT_COLORS[ati.statut] ?? "#6b7280", fontWeight: 600, fontSize: "0.7rem" }}>{STATUT_LABELS[ati.statut] ?? ati.statut}</span>
                          {ati.is_overdue && <span style={{ padding: "0.1rem 0.35rem", borderRadius: "4px", background: "#fef3c7", color: "#d97706", fontWeight: 700, fontSize: "0.65rem" }}>RETARD</span>}
                        </div>
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#374151" }}>{ati.type_activite.slice(0, 80)}{ati.type_activite.length > 80 ? "..." : ""}</div>
                      <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "0.2rem" }}>
                        Soumis le {new Date(ati.date_soumission).toLocaleDateString("fr-FR")} &middot; {ati.age_jours} j &middot; Priorite: <strong style={{ textTransform: "capitalize" }}>{ati.priorite}</strong>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
