import Link from "next/link";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import {
  fetchPNPIKpis,
  fetchPNPISecteurs,
  fetchPNPIProvinces,
  fetchPNPIPipeline,
  fetchPNPITendances,
} from "../../../lib/api";
import { fetchBackendProfile } from "../../../lib/backend";

const PNPI_ROLES = new Set(["admin", "ministre", "directeur", "instructeur", "inspecteur"]);

const SecteurBarChart = dynamic(() => import("../components/SecteurChart"), { ssr: false });
const TendanceLine = dynamic(() => import("../components/TendanceChart"), { ssr: false });
const ProvinceDonut = dynamic(() => import("../components/ProvinceDonut"), { ssr: false });

export default async function StatsPage() {
  try {
    const profile = await fetchBackendProfile();
    if (!((profile.roles ?? []) as string[]).some((r) => PNPI_ROLES.has(r))) redirect("/connexion");
  } catch {
    redirect("/connexion");
  }

  try {
    const [kpis, secteurs, provinces, pipeline, tendances] = await Promise.all([
      fetchPNPIKpis(),
      fetchPNPISecteurs(),
      fetchPNPIProvinces(),
      fetchPNPIPipeline(),
      fetchPNPITendances(),
    ]);

    const totalATIs =
      pipeline.soumis +
      pipeline.en_instruction +
      pipeline.en_validation +
      pipeline.approuve +
      pipeline.rejete +
      pipeline.expire;
    const tauxApprobation =
      totalATIs > 0 ? ((pipeline.approuve / totalATIs) * 100).toFixed(1) : "0";
    const tauxRejet = totalATIs > 0 ? ((pipeline.rejete / totalATIs) * 100).toFixed(1) : "0";

    return (
      <section className="section">
        <div style={{ marginBottom: "0.75rem", fontSize: "0.875rem" }}>
          <Link href="/pnpi" style={{ color: "#6b7280", textDecoration: "none" }}>
            ← Dashboard
          </Link>
        </div>
        <h2 style={{ margin: "0 0 1.5rem", color: "#003F8F" }}>Statistiques & Analyses PNPI</h2>

        {/* KPI Summary Row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          {[
            { label: "ATIs total", value: kpis.atis_total, color: "#003F8F" },
            { label: "Taux approbation", value: `${tauxApprobation} %`, color: "#10b981" },
            { label: "Taux rejet", value: `${tauxRejet} %`, color: "#ef4444" },
            {
              label: "Delai moyen",
              value: `${kpis.delai_moyen_jours.toFixed(1)} j`,
              color: "#f59e0b",
            },
            {
              label: "Conformite SLA",
              value: `${kpis.taux_sla_pct.toFixed(0)} %`,
              color: kpis.taux_sla_pct >= 80 ? "#10b981" : "#d97706",
            },
            {
              label: "Conf. inspections",
              value: `${kpis.taux_conformite_pct.toFixed(0)} %`,
              color: "#7c3aed",
            },
          ].map((k) => (
            <div
              key={k.label}
              className="chart-card"
              style={{ padding: "1rem 1.25rem", textAlign: "center" }}
            >
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: k.color }}>{k.value}</div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
                {k.label}
              </div>
            </div>
          ))}
        </div>

        {/* Pipeline & Tendance */}
        <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          {/* Pipeline donut-style */}
          <div className="chart-card" style={{ flex: "1 1 280px", padding: "1.25rem" }}>
            <h3 style={{ margin: "0 0 1rem", color: "#003F8F", fontSize: "0.95rem" }}>
              Pipeline des statuts
            </h3>
            {[
              { label: "Soumis", value: pipeline.soumis, color: "#f59e0b" },
              { label: "En instruction", value: pipeline.en_instruction, color: "#3b82f6" },
              { label: "En validation", value: pipeline.en_validation, color: "#8b5cf6" },
              { label: "Approuves", value: pipeline.approuve, color: "#10b981" },
              { label: "Rejetes", value: pipeline.rejete, color: "#ef4444" },
              { label: "Expires", value: pipeline.expire, color: "#6b7280" },
            ].map((s) => (
              <div key={s.label} style={{ marginBottom: "0.6rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.8rem",
                    marginBottom: "0.2rem",
                  }}
                >
                  <span style={{ color: "#374151" }}>{s.label}</span>
                  <span style={{ fontWeight: 700, color: s.color }}>{s.value}</span>
                </div>
                <div style={{ background: "#f3f4f6", borderRadius: "999px", height: "6px" }}>
                  <div
                    style={{
                      width: `${totalATIs ? Math.round((s.value / totalATIs) * 100) : 0}%`,
                      height: "100%",
                      background: s.color,
                      borderRadius: "999px",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          {/* Tendance chart */}
          <div className="chart-card" style={{ flex: "2 1 400px", padding: "1.25rem" }}>
            <h3 style={{ margin: "0 0 0.25rem", color: "#003F8F", fontSize: "0.95rem" }}>
              Tendance 12 mois
            </h3>
            <p style={{ margin: "0 0 0.75rem", color: "#6b7280", fontSize: "0.8rem" }}>
              Soumissions, approbations et rejets par mois
            </p>
            <TendanceLine tendances={tendances} />
          </div>
        </div>

        {/* Secteurs & Provinces */}
        <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          {/* Secteurs chart */}
          <div className="chart-card" style={{ flex: "1 1 340px", padding: "1.25rem" }}>
            <h3 style={{ margin: "0 0 0.25rem", color: "#003F8F", fontSize: "0.95rem" }}>
              Repartition par secteur
            </h3>
            <p style={{ margin: "0 0 0.75rem", color: "#6b7280", fontSize: "0.8rem" }}>
              ATIs actifs et operateurs par filiere
            </p>
            <SecteurBarChart secteurs={secteurs} />
          </div>

          {/* Provinces donut + table */}
          <div className="chart-card" style={{ flex: "1 1 300px", padding: "1.25rem" }}>
            <h3 style={{ margin: "0 0 0.25rem", color: "#003F8F", fontSize: "0.95rem" }}>
              Repartition par province
            </h3>
            <p style={{ margin: "0 0 0.75rem", color: "#6b7280", fontSize: "0.8rem" }}>
              ATIs actifs par region
            </p>
            <ProvinceDonut provinces={provinces} />
            <div style={{ overflowX: "auto", marginTop: "1rem" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #f3f4f6" }}>
                    {["Province", "Operateurs", "ATIs actifs"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "0.4rem 0.75rem",
                          textAlign: "left",
                          color: "#6b7280",
                          fontWeight: 600,
                          fontSize: "0.7rem",
                          textTransform: "uppercase",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {provinces.map(
                    (p: { province: string; nb_operateurs: number; nb_atis_actifs: number }) => (
                      <tr key={p.province} style={{ borderBottom: "1px solid #f9fafb" }}>
                        <td
                          style={{ padding: "0.5rem 0.75rem", color: "#1f2937", fontWeight: 500 }}
                        >
                          {p.province.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </td>
                        <td
                          style={{
                            padding: "0.5rem 0.75rem",
                            color: "#374151",
                            textAlign: "right",
                          }}
                        >
                          {p.nb_operateurs}
                        </td>
                        <td
                          style={{
                            padding: "0.5rem 0.75rem",
                            fontWeight: 700,
                            color: "#003F8F",
                            textAlign: "right",
                          }}
                        >
                          {p.nb_atis_actifs}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Secteurs detail table */}
        <div className="chart-card" style={{ padding: "1.25rem" }}>
          <h3 style={{ margin: "0 0 1rem", color: "#003F8F", fontSize: "0.95rem" }}>
            Detail par secteur industriel
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #f3f4f6" }}>
                  {[
                    "Secteur",
                    "Operateurs",
                    "ATIs total",
                    "Approuves",
                    "Emplois",
                    "Taux approb.",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "0.5rem 0.75rem",
                        textAlign: "left",
                        color: "#6b7280",
                        fontWeight: 600,
                        fontSize: "0.7rem",
                        textTransform: "uppercase",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {secteurs.map((s) => {
                  const taux =
                    s.nb_atis_total > 0
                      ? ((s.nb_atis_approuves / s.nb_atis_total) * 100).toFixed(0)
                      : "0";
                  return (
                    <tr key={s.secteur} style={{ borderBottom: "1px solid #f9fafb" }}>
                      <td
                        style={{
                          padding: "0.5rem 0.75rem",
                          fontWeight: 600,
                          color: "#1f2937",
                          textTransform: "capitalize",
                        }}
                      >
                        {s.secteur}
                      </td>
                      <td
                        style={{ padding: "0.5rem 0.75rem", color: "#374151", textAlign: "right" }}
                      >
                        {s.nb_operateurs}
                      </td>
                      <td
                        style={{ padding: "0.5rem 0.75rem", color: "#374151", textAlign: "right" }}
                      >
                        {s.nb_atis_total}
                      </td>
                      <td
                        style={{
                          padding: "0.5rem 0.75rem",
                          color: "#10b981",
                          fontWeight: 700,
                          textAlign: "right",
                        }}
                      >
                        {s.nb_atis_approuves}
                      </td>
                      <td
                        style={{ padding: "0.5rem 0.75rem", color: "#374151", textAlign: "right" }}
                      >
                        {s.emplois_declares.toLocaleString("fr-FR")}
                      </td>
                      <td style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>
                        <span
                          style={{
                            padding: "0.15rem 0.5rem",
                            borderRadius: "999px",
                            background: Number(taux) >= 60 ? "#f0fdf4" : "#fef2f2",
                            color: Number(taux) >= 60 ? "#16a34a" : "#b42318",
                            fontWeight: 700,
                            fontSize: "0.72rem",
                          }}
                        >
                          {taux} %
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    return (
      <section className="section">
        <div className="chart-card">
          <h2 style={{ color: "#b42318", marginTop: 0 }}>Erreur</h2>
          <p style={{ color: "#b42318" }}>{msg}</p>
        </div>
      </section>
    );
  }
}
