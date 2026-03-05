import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchPNPIATIs, fetchPNPIInspections } from "../../lib/api";
import { fetchBackendProfile } from "../../lib/backend";

const STATUT_COLORS: Record<string, string> = { soumis: "#f59e0b", en_instruction: "#3b82f6", en_validation: "#8b5cf6", approuve: "#10b981", rejete: "#ef4444", expire: "#9ca3af" };
const STATUT_LABELS: Record<string, string> = { soumis: "Soumis", en_instruction: "En instruction", en_validation: "En validation", approuve: "Approuve", rejete: "Rejete", expire: "Expire" };
const CONF_COLORS: Record<string, string> = { conforme: "#10b981", non_conforme: "#ef4444", partiel: "#f59e0b" };
const CONF_LABELS: Record<string, string> = { conforme: "Conforme", non_conforme: "Non conforme", partiel: "Partiel" };

export default async function InspecteurDashboard() {
  let username = "";
  try {
    const profile = await fetchBackendProfile();
    const allowed = new Set(["admin", "inspecteur", "directeur"]);
    if (!((profile.roles ?? []) as string[]).some(r => allowed.has(r))) redirect("/connexion");
    username = profile.username;
  } catch { redirect("/connexion"); }

  try {
    const [myATIs, myInspections] = await Promise.all([
      fetchPNPIATIs({ limit: 50 }),
      fetchPNPIInspections({ inspecteur_username: username, limit: 20 }),
    ]);

    const assignedATIs = myATIs.filter(a => a.instructeur_username === username && !["approuve","rejete","expire"].includes(a.statut));
    const overdueATIs = assignedATIs.filter(a => a.is_overdue);

    return (
      <section style={{ maxWidth: "480px", margin: "0 auto", padding: "1rem" }}>
        {/* Header */}
        <div style={{ background: "#003F8F", color: "white", padding: "1.25rem 1.5rem", borderRadius: "12px", marginBottom: "1rem" }}>
          <div style={{ fontSize: "0.8rem", opacity: 0.75, marginBottom: "0.25rem" }}>Bonjour,</div>
          <div style={{ fontSize: "1.3rem", fontWeight: 700 }}>{username}</div>
          <div style={{ fontSize: "0.85rem", opacity: 0.85, marginTop: "0.25rem" }}>Inspecteur · PNPI</div>
        </div>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
          {[
            { label: "Assignes", value: assignedATIs.length, color: "#003F8F" },
            { label: "En retard", value: overdueATIs.length, color: overdueATIs.length > 0 ? "#d97706" : "#10b981" },
            { label: "Inspections", value: myInspections.length, color: "#7c3aed" },
          ].map(k => (
            <div key={k.label} style={{ background: "white", borderRadius: "10px", padding: "0.875rem 0.75rem", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: k.color }}>{k.value}</div>
              <div style={{ fontSize: "0.7rem", color: "#6b7280", marginTop: "0.2rem" }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
          <Link href="/pnpi/inspections" style={{ textDecoration: "none" }}>
            <div style={{ background: "#009440", color: "white", borderRadius: "10px", padding: "1rem", textAlign: "center" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: "0.3rem" }}>📋</div>
              <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>Nouvelle inspection</div>
            </div>
          </Link>
          <Link href="/pnpi/ati" style={{ textDecoration: "none" }}>
            <div style={{ background: "#2563eb", color: "white", borderRadius: "10px", padding: "1rem", textAlign: "center" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: "0.3rem" }}>📁</div>
              <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>Dossiers ATI</div>
            </div>
          </Link>
        </div>

        {/* ATIs en retard */}
        {overdueATIs.length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ background: "#fef3c7", border: "1px solid #fbbf24", borderRadius: "10px", padding: "0.875rem 1rem", marginBottom: "0.5rem" }}>
              <div style={{ fontWeight: 700, color: "#92400e", fontSize: "0.85rem", marginBottom: "0.5rem" }}>&#9888; {overdueATIs.length} ATI(s) en retard SLA</div>
              {overdueATIs.slice(0, 3).map(a => (
                <Link key={a.id} href={`/pnpi/ati/${a.id}`} style={{ textDecoration: "none", display: "block" }}>
                  <div style={{ padding: "0.5rem 0", borderBottom: "1px solid #fde68a", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "#003F8F", fontWeight: 700 }}>{a.numero_ati}</span>
                    <span style={{ fontSize: "0.75rem", color: "#d97706", fontWeight: 600 }}>{a.age_jours}j</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ATIs assignes */}
        <div style={{ marginBottom: "1rem" }}>
          <h3 style={{ margin: "0 0 0.75rem", color: "#1f2937", fontSize: "0.9rem", fontWeight: 700 }}>Mes dossiers en cours ({assignedATIs.length})</h3>
          {assignedATIs.length === 0 ? (
            <div style={{ background: "white", borderRadius: "10px", padding: "1.5rem", textAlign: "center", color: "#9ca3af", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>Aucun dossier assigne.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {assignedATIs.slice(0, 10).map(a => (
                <Link key={a.id} href={`/pnpi/ati/${a.id}`} style={{ textDecoration: "none" }}>
                  <div style={{ background: "white", borderRadius: "10px", padding: "0.875rem 1rem", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: a.is_overdue ? "1px solid #fbbf24" : "1px solid transparent" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                      <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#003F8F", fontSize: "0.78rem" }}>{a.numero_ati}</span>
                      <span style={{ padding: "0.15rem 0.5rem", borderRadius: "999px", background: `${STATUT_COLORS[a.statut] ?? "#6b7280"}18`, color: STATUT_COLORS[a.statut] ?? "#6b7280", fontWeight: 700, fontSize: "0.68rem" }}>
                        {STATUT_LABELS[a.statut] ?? a.statut}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#374151" }}>{a.type_activite.slice(0, 50)}{a.type_activite.length > 50 ? "..." : ""}</div>
                    <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "0.25rem" }}>
                      {a.age_jours}j {a.is_overdue && <span style={{ color: "#d97706", fontWeight: 700 }}>— EN RETARD</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Mes dernières inspections */}
        <div>
          <h3 style={{ margin: "0 0 0.75rem", color: "#1f2937", fontSize: "0.9rem", fontWeight: 700 }}>Mes dernieres inspections</h3>
          {myInspections.length === 0 ? (
            <div style={{ background: "white", borderRadius: "10px", padding: "1.5rem", textAlign: "center", color: "#9ca3af", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>Aucune inspection effectuee.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {myInspections.slice(0, 5).map(insp => (
                <div key={insp.id} style={{ background: "white", borderRadius: "10px", padding: "0.875rem 1rem", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                    <span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "#6b7280" }}>{insp.id}</span>
                    <span style={{ padding: "0.15rem 0.5rem", borderRadius: "999px", background: `${CONF_COLORS[insp.statut_conformite] ?? "#6b7280"}18`, color: CONF_COLORS[insp.statut_conformite] ?? "#6b7280", fontWeight: 700, fontSize: "0.68rem" }}>
                      {CONF_LABELS[insp.statut_conformite] ?? insp.statut_conformite}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#374151" }}>{insp.observations.slice(0, 80)}{insp.observations.length > 80 ? "..." : ""}</div>
                  <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "0.25rem" }}>{new Date(insp.date_inspection).toLocaleDateString("fr-FR")}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom nav */}
        <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid #f3f4f6", display: "flex", gap: "0.5rem", justifyContent: "center" }}>
          <Link href="/pnpi" style={{ color: "#6b7280", fontSize: "0.8rem", textDecoration: "none" }}>Dashboard</Link>
          <span style={{ color: "#e5e7eb" }}>·</span>
          <Link href="/connexion" style={{ color: "#6b7280", fontSize: "0.8rem", textDecoration: "none" }}>Deconnexion</Link>
        </div>
      </section>
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    return <section className="section"><div className="chart-card"><h2 style={{ color: "#b42318", marginTop: 0 }}>Erreur</h2><p style={{ color: "#b42318" }}>{msg}</p></div></section>;
  }
}
