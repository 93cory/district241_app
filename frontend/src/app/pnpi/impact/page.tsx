import { backendRequest } from "../../../lib/backend";

export const dynamic = "force-dynamic";

export default async function ImpactPage() {
  let kpis: any = {};
  let secteurs: any[] = [];
  let provinces: any[] = [];
  let index: any = null;
  let error = "";

  try {
    const [kpiRes, sectRes, provRes, idxRes] = await Promise.all([
      backendRequest("/pnpi/dashboard/kpis"),
      backendRequest("/pnpi/dashboard/secteurs"),
      backendRequest("/pnpi/dashboard/provinces"),
      backendRequest("/pnpi/dashboard/transformation-index"),
    ]);
    if (kpiRes.ok) kpis = await kpiRes.json();
    if (sectRes.ok) secteurs = await sectRes.json();
    if (provRes.ok) provinces = await provRes.json();
    if (idxRes.ok) index = await idxRes.json();
  } catch {
    error = "Erreur de chargement des donnees.";
  }

  const totalEmplois = secteurs.reduce((sum: number, s: any) => sum + (s.emplois_declares || 0), 0);
  const totalOps = secteurs.reduce((sum: number, s: any) => sum + (s.nb_operateurs || 0), 0);
  const provincesCouverts = provinces.filter((p: any) => p.nb_operateurs > 0).length;

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px" }}>
        Rapport d&apos;Impact Socio-Economique
      </h1>
      <p style={{ color: "var(--text-soft, #526175)", fontSize: 14, margin: "0 0 28px" }}>
        Ministere de l&apos;Industrie et de la Transformation Locale · Gabon
      </p>

      {error && (
        <div
          style={{
            padding: 14,
            borderRadius: 12,
            background: "#fff5f5",
            color: "#b42318",
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {/* Hero KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 28,
        }}
      >
        {[
          {
            label: "Emplois declares",
            value: totalEmplois.toLocaleString("fr-FR"),
            color: "#006233",
            icon: "\u{1F477}",
          },
          { label: "Operateurs industriels", value: totalOps, color: "#0d3f78", icon: "\u{1F3ED}" },
          {
            label: "Provinces couvertes",
            value: `${provincesCouverts}/9`,
            color: "#0c7eb4",
            icon: "\u{1F5FA}",
          },
          {
            label: "ATI approuves",
            value: kpis.atis_total || 0,
            color: "#f2b800",
            icon: "\u{1F4CB}",
          },
          {
            label: "Taux conformite",
            value: `${kpis.taux_conformite_pct || 0}%`,
            color: "#006233",
            icon: "\u2713",
          },
          {
            label: "Indice national",
            value: index?.index || "\u2014",
            color: index?.index >= 70 ? "#006233" : index?.index >= 50 ? "#f2b800" : "#b42318",
            icon: "\u{1F4CA}",
          },
        ].map((kpi) => (
          <div key={kpi.label} className="chart-card" style={{ padding: 20, textAlign: "center" }}>
            <div style={{ fontSize: 32 }}>{kpi.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: kpi.color, margin: "8px 0 4px" }}>
              {kpi.value}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-soft, #526175)" }}>
              {kpi.label}
            </div>
          </div>
        ))}
      </div>

      {/* Sector Impact Table */}
      <div className="chart-card" style={{ padding: 20, marginBottom: 20 }}>
        <h2 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700 }}>Impact par Secteur</h2>
        <div className="table-scroll" style={{ overflowX: "auto" }}>
          <table className="annex-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Secteur</th>
                <th>Operateurs</th>
                <th>ATI total</th>
                <th>ATI approuves</th>
                <th>Taux approbation</th>
                <th>Emplois declares</th>
              </tr>
            </thead>
            <tbody>
              {secteurs.map((s: any) => (
                <tr key={s.secteur}>
                  <td style={{ fontWeight: 700, textTransform: "capitalize" }}>{s.secteur}</td>
                  <td style={{ textAlign: "center" }}>{s.nb_operateurs}</td>
                  <td style={{ textAlign: "center" }}>{s.nb_atis_total}</td>
                  <td style={{ textAlign: "center" }}>{s.nb_atis_approuves}</td>
                  <td style={{ textAlign: "center" }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        background:
                          s.taux_approbation_pct >= 70
                            ? "#dcfce7"
                            : s.taux_approbation_pct >= 40
                              ? "#fef9c3"
                              : "#fef2f2",
                        color:
                          s.taux_approbation_pct >= 70
                            ? "#166534"
                            : s.taux_approbation_pct >= 40
                              ? "#854d0e"
                              : "#b42318",
                      }}
                    >
                      {s.taux_approbation_pct}%
                    </span>
                  </td>
                  <td style={{ textAlign: "center", fontWeight: 600 }}>
                    {(s.emplois_declares || 0).toLocaleString("fr-FR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Province Coverage */}
      <div className="chart-card" style={{ padding: 20, marginBottom: 20 }}>
        <h2 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700 }}>
          Couverture Provinciale
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 10,
          }}
        >
          {provinces.map((p: any) => (
            <div
              key={p.province}
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                background: p.nb_operateurs > 0 ? "rgba(0,98,51,0.06)" : "var(--bg-base, #f4f8fb)",
                border: `1.5px solid ${p.nb_operateurs > 0 ? "rgba(0,98,51,0.2)" : "var(--line, #dce4ef)"}`,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 13, textTransform: "capitalize" }}>
                {p.province.replace(/_/g, " ")}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-soft, #526175)", marginTop: 2 }}>
                {p.nb_operateurs} operateur(s) · {p.nb_atis_actifs} ATI actif(s)
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Export button */}
      <div style={{ textAlign: "center", marginTop: 20 }}>
        <a
          href="/api/exports/executive-report.pdf"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            padding: "12px 28px",
            borderRadius: 12,
            background: "#006233",
            color: "#fff",
            fontWeight: 700,
            textDecoration: "none",
            fontSize: 14,
          }}
        >
          Telecharger le rapport executif PDF
        </a>
      </div>
    </div>
  );
}
