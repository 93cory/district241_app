import { backendRequest } from "@/lib/backend";

export const dynamic = "force-dynamic";

export default async function InspecteurDashboard() {
  let kpis: any = {};
  let recentInspections: any[] = [];
  let alerts: any[] = [];

  try {
    const [kpiRes, inspRes] = await Promise.all([
      backendRequest("/pnpi/dashboard/kpis"),
      backendRequest("/pnpi/inspections?limit=8"),
    ]);
    if (kpiRes.ok) kpis = await kpiRes.json();
    if (inspRes.ok) {
      const data = await inspRes.json();
      if (Array.isArray(data)) recentInspections = data;
      else if (Array.isArray(data?.inspections)) recentInspections = data.inspections;
      else recentInspections = [];
    }
  } catch {}

  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1000, margin: "0 auto" }}>
      {/* Hero */}
      <div style={{
        padding: "24px 28px", borderRadius: 20, marginBottom: 20,
        background: "linear-gradient(135deg, #051B36 0%, #006233 100%)",
        color: "#fff",
      }}>
        <div style={{ fontSize: 13, opacity: 0.8 }}>{today}</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "4px 0 12px" }}>Espace Inspecteur</h1>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {[
            { label: "Inspections totales", value: kpis.inspections_total || 0, color: "#0c7eb4" },
            { label: "Conformes", value: kpis.inspections_conformes || 0, color: "#006233" },
            { label: "Non conformes", value: kpis.inspections_non_conformes || 0, color: "#b42318" },
            { label: "Ce mois", value: kpis.inspections_mois || 0, color: "#f2b800" },
          ].map((kpi) => (
            <div key={kpi.label} style={{
              padding: "10px 18px", borderRadius: 12,
              background: "rgba(255, 255, 255, 0.72)", minWidth: 120,
            }}>
              <div style={{ fontSize: 11, opacity: 0.8 }}>{kpi.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{kpi.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { href: "/pnpi/inspections", label: "Toutes les inspections", bg: "#006233" },
          { href: "/pnpi/calendar", label: "Calendrier", bg: "#0c7eb4" },
          { href: "/pnpi/operateurs", label: "Operateurs", bg: "#051B36" },
          { href: "/pnpi/messages", label: "Messages", bg: "#7c3aed" },
        ].map((action) => (
          <a key={action.href} href={action.href} style={{
            padding: "10px 20px", borderRadius: 12, border: "none",
            background: action.bg, color: "#fff", fontWeight: 700,
            fontSize: 13, textDecoration: "none",
          }}>
            {action.label}
          </a>
        ))}
      </div>

      {/* Recent inspections */}
      <div className="chart-card" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 14px" }}>Inspections recentes</h2>
        {recentInspections.length === 0 ? (
          <p style={{ color: "var(--text-soft, #526175)", fontSize: 13 }}>Aucune inspection recente.</p>
        ) : (
          <div className="table-scroll">
            <table className="annex-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Operateur</th>
                  <th>Conformite</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentInspections.slice(0, 8).map((insp: any) => {
                  const confColor = insp.statut_conformite === "conforme" ? "#006233"
                    : insp.statut_conformite === "non_conforme" ? "#b42318" : "#d97706";
                  return (
                    <tr key={insp.id}>
                      <td style={{ fontSize: 13 }}>
                        {insp.date_inspection ? new Date(insp.date_inspection).toLocaleDateString("fr-FR") : "·"}
                      </td>
                      <td style={{ fontWeight: 600 }}>{insp.operateur_nom || insp.operateur_id?.slice(0, 8)}</td>
                      <td>
                        <span style={{
                          padding: "2px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                          background: `${confColor}15`, color: confColor,
                        }}>
                          {insp.statut_conformite?.replace(/_/g, " ") || "·"}
                        </span>
                      </td>
                      <td>
                        <a href={`/pnpi/inspections/${insp.id}`} style={{ fontSize: 12, color: "#0c7eb4", fontWeight: 600 }}>
                          Detail
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
