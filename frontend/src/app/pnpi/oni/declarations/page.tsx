import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchONIDeclarations, fetchPNPIOperateurs } from "../../../../lib/api";
import { fetchBackendProfile } from "../../../../lib/backend";
import ONIDeclarationForm from "./ONIDeclarationForm";

const ALLOWED = new Set(["admin", "ministre", "directeur", "instructeur", "inspecteur", "operateur"]);

const formatNumber = (value: number) => new Intl.NumberFormat("fr-FR").format(Math.round(value));

export default async function ONIDeclarationsPage() {
  let roles: string[] = [];
  try {
    const profile = await fetchBackendProfile();
    roles = (profile.roles ?? []) as string[];
    if (!roles.some((role) => ALLOWED.has(role))) redirect("/connexion");
  } catch {
    redirect("/connexion");
  }

  const [declarations, operateurs] = await Promise.all([
    fetchONIDeclarations().catch(() => []),
    fetchPNPIOperateurs({ limit: 100 }).catch(() => []),
  ]);
  const isOnlyOperator = roles.includes("operateur") && !roles.some((role) => role !== "operateur");
  const canCreate = !isOnlyOperator && roles.some((role) => ["admin", "directeur", "instructeur", "inspecteur"].includes(role));

  return (
    <section className="section">
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: "0 0 0.3rem", color: "#009440", fontWeight: 900 }}>ONI · COLLECTE NATIONALE</p>
          <h1 style={{ margin: 0, color: "#003F8F" }}>Declarations periodiques industrielles</h1>
          <p style={{ margin: "0.45rem 0 0", color: "#4b5563", maxWidth: 760 }}>
            Collecte mensuelle de production, emploi, investissement, import/export, energie, stocks et intrants.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignSelf: "center", flexWrap: "wrap" }}>
          <Link href="/pnpi/oni" className="btn-secondary">Cockpit ONI</Link>
          <Link href="/pnpi/oni/inpi" className="btn-primary">INPI</Link>
        </div>
      </div>

      <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "minmax(320px, 0.85fr) 1.15fr", gap: "1rem", alignItems: "start" }}>
        {canCreate ? (
          <ONIDeclarationForm operateurs={operateurs} />
        ) : (
          <div className="chart-card" style={{ padding: "1rem", color: "#6b7280" }}>
            {isOnlyOperator
              ? "Votre profil operateur consulte uniquement ses propres declarations ONI. La soumission directe sera activee apres rattachement officiel de votre compte a une entreprise."
              : "Votre profil peut consulter les declarations, mais pas en soumettre."}
          </div>
        )}

        <div className="chart-card" style={{ padding: "1rem" }}>
          <h2 style={{ margin: "0 0 0.75rem", color: "#003F8F", fontSize: "1.05rem" }}>Dernieres declarations</h2>
          {declarations.length === 0 ? (
            <p style={{ margin: 0, color: "#6b7280" }}>Aucune declaration ONI enregistree.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "#6b7280" }}>
                    <th style={th}>Entreprise</th>
                    <th style={th}>Periode</th>
                    <th style={th}>Production</th>
                    <th style={th}>Utilisation</th>
                    <th style={th}>Emplois</th>
                    <th style={th}>Alertes</th>
                    <th style={th}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {declarations.map((item) => (
                    <tr key={item.id}>
                      <td style={td}>
                        <strong>{item.operateur_nom}</strong>
                        <div style={{ color: "#6b7280", fontSize: "0.75rem" }}>{item.secteur} · {item.province}</div>
                      </td>
                      <td style={td}>{item.period}</td>
                      <td style={td}>{formatNumber(item.production_volume)} {item.production_unit}</td>
                      <td style={td}>{item.capacity_utilization_pct}%</td>
                      <td style={td}>{formatNumber(item.jobs_total)}</td>
                      <td style={td}>
                        <span style={{ color: item.anomaly_flags.length ? "#b91c1c" : "#047857", fontWeight: 900 }}>
                          {item.anomaly_flags.length}
                        </span>
                      </td>
                      <td style={td}>{item.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const th = { padding: "0.55rem", borderBottom: "1px solid #e5e7eb" };
const td = { padding: "0.55rem", borderBottom: "1px solid #f3f4f6", verticalAlign: "top" as const };
