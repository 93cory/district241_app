import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchBackendProfile } from "../../lib/backend";
import { fetchPNPIATIs, fetchPNPIInspections } from "../../lib/api";

const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  admin: { label: "Administrateur", color: "#7c3aed", bg: "#f5f3ff" },
  ministre: { label: "Ministre", color: "#003F8F", bg: "#eff6ff" },
  directeur: { label: "Directeur", color: "#1d4ed8", bg: "#dbeafe" },
  instructeur: { label: "Instructeur", color: "#0284c7", bg: "#e0f2fe" },
  inspecteur: { label: "Inspecteur", color: "#059669", bg: "#d1fae5" },
  operateur: { label: "Operateur", color: "#d97706", bg: "#fef3c7" },
};

const STATUT_COLORS: Record<string, string> = { soumis: "#f59e0b", en_instruction: "#3b82f6", en_validation: "#8b5cf6", approuve: "#10b981", rejete: "#ef4444", expire: "#9ca3af" };
const STATUT_LABELS: Record<string, string> = { soumis: "Soumis", en_instruction: "En instruction", en_validation: "En validation", approuve: "Approuve", rejete: "Rejete", expire: "Expire" };
const CONF_COLORS: Record<string, string> = { conforme: "#10b981", non_conforme: "#ef4444", partiel: "#f59e0b" };
const CONF_LABELS: Record<string, string> = { conforme: "Conforme", non_conforme: "Non conforme", partiel: "Partiel" };

export default async function ProfilPage() {
  let profile: Awaited<ReturnType<typeof fetchBackendProfile>>;
  try {
    profile = await fetchBackendProfile();
  } catch { redirect("/connexion"); }

  const isInspecteur = (profile.roles ?? []).includes("inspecteur");
  const isOperateurOrInstructeur = (profile.roles ?? []).some(r => ["operateur", "instructeur", "directeur", "admin"].includes(r));

  const [myATIs, myInspections] = await Promise.all([
    isOperateurOrInstructeur ? fetchPNPIATIs({ limit: 10 }).catch(() => []) : Promise.resolve([]),
    isInspecteur ? fetchPNPIInspections({ inspecteur_username: profile.username, limit: 10 }).catch(() => []) : Promise.resolve([]),
  ]);

  const createdATIs = myATIs.filter(a => a.instructeur_username === profile.username || (profile.roles ?? []).includes("operateur"));

  return (
    <section className="section">
      <div style={{ marginBottom: "0.75rem", fontSize: "0.875rem" }}>
        <Link href={((profile.roles ?? []).includes("inspecteur") ? "/inspecteur" : "/pnpi")} style={{ color: "#6b7280", textDecoration: "none" }}>← Retour</Link>
      </div>

      <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
        {/* Fiche profil */}
        <div style={{ flex: "1 1 280px" }}>
          <div className="chart-card" style={{ padding: "1.5rem" }}>
            {/* Avatar */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
              <div style={{
                width: "64px", height: "64px", borderRadius: "50%",
                background: "linear-gradient(135deg, #003F8F, #009440)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", fontWeight: 800, fontSize: "1.5rem", flexShrink: 0,
              }}>
                {profile.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#1f2937" }}>{profile.full_name || profile.username}</div>
                <div style={{ fontFamily: "monospace", fontSize: "0.82rem", color: "#6b7280" }}>@{profile.username}</div>
              </div>
            </div>

            {/* Roles */}
            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", marginBottom: "0.5rem" }}>Roles habilites</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {(profile.roles ?? []).map(r => {
                  const meta = ROLE_LABELS[r] ?? { label: r, color: "#6b7280", bg: "#f3f4f6" };
                  return (
                    <span key={r} style={{ padding: "0.25rem 0.65rem", borderRadius: "999px", background: meta.bg, color: meta.color, fontWeight: 700, fontSize: "0.78rem" }}>
                      {meta.label}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              {isOperateurOrInstructeur && (
                <div style={{ padding: "0.875rem", background: "#f9fafb", borderRadius: "8px", textAlign: "center" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#003F8F" }}>{createdATIs.length}</div>
                  <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>Dossiers ATI</div>
                </div>
              )}
              {isInspecteur && (
                <div style={{ padding: "0.875rem", background: "#f9fafb", borderRadius: "8px", textAlign: "center" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#7c3aed" }}>{myInspections.length}</div>
                  <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>Inspections</div>
                </div>
              )}
              {isOperateurOrInstructeur && (
                <div style={{ padding: "0.875rem", background: "#f9fafb", borderRadius: "8px", textAlign: "center" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#10b981" }}>{createdATIs.filter(a => a.statut === "approuve").length}</div>
                  <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>Approuves</div>
                </div>
              )}
              {isOperateurOrInstructeur && (
                <div style={{ padding: "0.875rem", background: "#f9fafb", borderRadius: "8px", textAlign: "center" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#d97706" }}>{createdATIs.filter(a => a.is_overdue).length}</div>
                  <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>En retard</div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ marginTop: "1.25rem", paddingTop: "1.25rem", borderTop: "1px solid #f3f4f6" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", marginBottom: "0.75rem" }}>Acces rapide</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {(profile.roles ?? []).some(r => ["admin","ministre","directeur","instructeur","inspecteur"].includes(r)) && (
                  <Link href="/pnpi" style={{ padding: "0.5rem 0.875rem", background: "#003F8F", color: "white", borderRadius: "6px", textDecoration: "none", fontSize: "0.82rem", fontWeight: 600, textAlign: "center" }}>Dashboard PNPI</Link>
                )}
                {(profile.roles ?? []).includes("inspecteur") && (
                  <Link href="/inspecteur" style={{ padding: "0.5rem 0.875rem", background: "#009440", color: "white", borderRadius: "6px", textDecoration: "none", fontSize: "0.82rem", fontWeight: 600, textAlign: "center" }}>Espace Inspecteur</Link>
                )}
                {(profile.roles ?? []).includes("operateur") && (
                  <Link href="/pnpi/guichet" style={{ padding: "0.5rem 0.875rem", background: "#d97706", color: "white", borderRadius: "6px", textDecoration: "none", fontSize: "0.82rem", fontWeight: 600, textAlign: "center" }}>Mon Guichet</Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Activite recente */}
        <div style={{ flex: "2 1 380px", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* ATIs recents */}
          {isOperateurOrInstructeur && (
            <div className="chart-card" style={{ padding: "1.25rem" }}>
              <h3 style={{ margin: "0 0 1rem", color: "#003F8F", fontSize: "0.95rem" }}>Mes dossiers ATI recents</h3>
              {createdATIs.length === 0 ? (
                <p style={{ color: "#9ca3af", margin: 0, fontSize: "0.82rem" }}>Aucun dossier ATI associe.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {createdATIs.slice(0, 6).map(a => (
                    <Link key={a.id} href={`/pnpi/ati/${a.id}`} style={{ textDecoration: "none" }}>
                      <div style={{ padding: "0.75rem", background: "#f9fafb", borderRadius: "8px", border: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontFamily: "monospace", fontWeight: 700, color: "#003F8F", fontSize: "0.78rem" }}>{a.numero_ati}</div>
                          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.15rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.type_activite}</div>
                        </div>
                        <span style={{ padding: "0.15rem 0.5rem", borderRadius: "999px", background: `${STATUT_COLORS[a.statut] ?? "#6b7280"}18`, color: STATUT_COLORS[a.statut] ?? "#6b7280", fontWeight: 700, fontSize: "0.7rem", whiteSpace: "nowrap", flexShrink: 0 }}>
                          {STATUT_LABELS[a.statut] ?? a.statut}
                        </span>
                      </div>
                    </Link>
                  ))}
                  {createdATIs.length > 6 && <Link href="/pnpi/ati" style={{ fontSize: "0.8rem", color: "#003F8F", textDecoration: "none", fontWeight: 600 }}>Voir tous les dossiers →</Link>}
                </div>
              )}
            </div>
          )}

          {/* Inspections recentes */}
          {isInspecteur && myInspections.length > 0 && (
            <div className="chart-card" style={{ padding: "1.25rem" }}>
              <h3 style={{ margin: "0 0 1rem", color: "#003F8F", fontSize: "0.95rem" }}>Mes inspections recentes</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {myInspections.slice(0, 5).map(insp => (
                  <div key={insp.id} style={{ padding: "0.75rem", background: "#f9fafb", borderRadius: "8px", border: "1px solid #f3f4f6" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                      <span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "#6b7280" }}>{insp.id}</span>
                      <span style={{ padding: "0.15rem 0.5rem", borderRadius: "999px", background: `${CONF_COLORS[insp.statut_conformite] ?? "#6b7280"}18`, color: CONF_COLORS[insp.statut_conformite] ?? "#6b7280", fontWeight: 700, fontSize: "0.7rem" }}>
                        {CONF_LABELS[insp.statut_conformite] ?? insp.statut_conformite}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#374151" }}>{insp.observations.slice(0, 80)}{insp.observations.length > 80 ? "..." : ""}</div>
                    <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "0.2rem" }}>{new Date(insp.date_inspection).toLocaleDateString("fr-FR")}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
