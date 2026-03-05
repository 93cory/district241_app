import { redirect } from "next/navigation";
import Link from "next/link";
import { fetchPNPIATIs, fetchPNPIOperateurs } from "../../../lib/api";
import { fetchBackendProfile } from "../../../lib/backend";
import { ATICreateForm } from "./components/ATICreateForm";

const ALLOWED = new Set(["admin", "ministre", "directeur", "instructeur", "operateur"]);
const STATUT_LABELS: Record<string, string> = { soumis: "Soumis", en_instruction: "En instruction", en_validation: "En validation", approuve: "Approuve", rejete: "Rejete", expire: "Expire" };
const STATUT_COLORS: Record<string, string> = { soumis: "#f59e0b", en_instruction: "#3b82f6", en_validation: "#8b5cf6", approuve: "#10b981", rejete: "#ef4444", expire: "#9ca3af" };

export default async function GuichetPage() {
  let username = "";
  let userRoles: string[] = [];
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).some((r) => ALLOWED.has(r))) redirect("/connexion");
    username = profile.username;
    userRoles = (profile.roles ?? []) as string[];
  } catch { redirect("/connexion"); }

  const isOperateur = userRoles.includes("operateur") && !userRoles.some((r) => ["admin", "ministre", "directeur", "instructeur"].includes(r));

  try {
    const [operateurs, atis] = await Promise.all([
      fetchPNPIOperateurs(),
      fetchPNPIATIs({ limit: 20 }),
    ]);
    const myATIs = atis.filter((a) => a.created_by === username);

    return (
      <section className="section">
        <div style={{ marginBottom: "0.75rem", fontSize: "0.875rem", display: "flex", gap: "1rem", alignItems: "center" }}>
          <Link href="/pnpi" style={{ color: "#6b7280", textDecoration: "none" }}>← Dashboard</Link>
          <Link href="/pnpi/profil" style={{ color: "#003F8F", textDecoration: "none", fontWeight: 600 }}>Mon profil</Link>
        </div>
        <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
          {/* Form */}
          <div style={{ flex: "1 1 380px" }}>
            <div className="chart-card" style={{ padding: "1.25rem" }}>
              <h2 style={{ margin: "0 0 0.25rem", color: "#003F8F" }}>Depot de demande ATI</h2>
              <p style={{ margin: "0 0 1.25rem", color: "#6b7280", fontSize: "0.875rem" }}>
                Soumettez une nouvelle demande d&apos;Agrement Technique Industriel.
              </p>
              <ATICreateForm operateurs={operateurs} />
            </div>
          </div>
          {/* My ATIs */}
          <div style={{ flex: "1 1 340px" }}>
            <div className="chart-card" style={{ padding: "1.25rem" }}>
              <h3 style={{ margin: "0 0 0.75rem", color: "#003F8F", fontSize: "0.95rem" }}>Mes demandes recentes ({myATIs.length})</h3>
              {/* Status summary badges */}
              {myATIs.length > 0 && (
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                  {(["soumis", "en_instruction", "approuve", "rejete"] as const).map(s => {
                    const count = myATIs.filter(a => a.statut === s).length;
                    if (count === 0) return null;
                    return (
                      <span key={s} style={{ padding: "0.2rem 0.6rem", borderRadius: "999px", background: `${STATUT_COLORS[s]}18`, color: STATUT_COLORS[s], fontWeight: 700, fontSize: "0.75rem" }}>
                        {count} {STATUT_LABELS[s]}
                      </span>
                    );
                  })}
                </div>
              )}
              {myATIs.length === 0 ? (
                <p style={{ color: "#9ca3af", margin: 0 }}>Aucune demande soumise. Utilisez le formulaire ci-contre.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {myATIs.map((ati) => (
                    <Link key={ati.id} href={`/pnpi/ati/${ati.id}`} style={{ textDecoration: "none", display: "block" }}>
                      <div style={{ padding: "0.75rem", background: "#f9fafb", borderRadius: "8px", border: "1px solid #f3f4f6", cursor: "pointer" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                          <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#003F8F", fontSize: "0.8rem" }}>{ati.numero_ati}</span>
                          <span style={{ padding: "0.15rem 0.5rem", borderRadius: "999px", background: `${STATUT_COLORS[ati.statut] ?? "#6b7280"}18`, color: STATUT_COLORS[ati.statut] ?? "#6b7280", fontWeight: 600, fontSize: "0.7rem" }}>
                            {STATUT_LABELS[ati.statut] ?? ati.statut}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "#374151" }}>{ati.type_activite.slice(0, 60)}{ati.type_activite.length > 60 ? "..." : ""}</div>
                        <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "0.2rem" }}>
                          {new Date(ati.date_soumission).toLocaleDateString("fr-FR")} &middot; {ati.age_jours} j
                          {ati.is_overdue && <span style={{ color: "#d97706", fontWeight: 600 }}> — EN RETARD</span>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              {/* Link to full ATI list for non-operateur roles */}
              {!isOperateur && (
                <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid #f3f4f6" }}>
                  <Link href="/pnpi/ati" style={{ color: "#003F8F", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none" }}>
                    Voir tous mes dossiers →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    return <section className="section"><div className="chart-card"><h2 style={{ color: "#b42318", marginTop: 0 }}>Erreur</h2><p style={{ color: "#b42318" }}>{msg}</p></div></section>;
  }
}
