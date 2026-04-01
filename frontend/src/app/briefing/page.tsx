import Link from "next/link";
import { redirect } from "next/navigation";

import {
  fetchDashboard,
  fetchDashboardAlerts,
  fetchFieldReports,
  fetchForecast,
  fetchUnits,
} from "../../lib/api";
import { fetchBackendProfile } from "../../lib/backend";
import { PrintActions } from "./PrintActions";

const normalizeNumber = (value: number) =>
  value >= 1_000 ? `${(value / 1_000).toFixed(1)}k` : value.toFixed(0);

const severityColor = (severity: string) => {
  switch (severity.toLowerCase()) {
    case "critical":
      return "#b42318";
    case "high":
      return "#d92d20";
    case "medium":
      return "#f79009";
    default:
      return "#1570ef";
  }
};

export default async function BriefingPage() {
  try {
    await fetchBackendProfile();
  } catch {
    redirect("/connexion");
  }

  const [snapshot, alerts, forecast, units, fieldReports] = await Promise.all([
    fetchDashboard().catch(() => ({ total_units: 0, active_units: 0, total_volume_tons: 0, total_jobs: 0, avg_capacity_utilization: 0, national_index: 0, import_gap_tons: 0, jobs_created: 0 })),
    fetchDashboardAlerts().catch(() => []),
    fetchForecast().catch(() => []),
    fetchUnits().catch(() => []),
    fetchFieldReports().catch(() => []),
  ]);

  const generatedAt = new Date().toLocaleDateString("fr-FR");
  const forecastDelta =
    forecast.length >= 2 ? forecast[forecast.length - 1].volume_tons - forecast[0].volume_tons : 0;
  const growthDirection = forecastDelta >= 0 ? "hausse" : "repli";
  const activeUnitRate = units.length > 0 ? snapshot.active_units / units.length : 0;

  const criticalCount = alerts.filter((alert) => alert.severity.toLowerCase() === "critical").length;
  const highCount = alerts.filter((alert) => alert.severity.toLowerCase() === "high").length;
  const mediumCount = alerts.filter((alert) => alert.severity.toLowerCase() === "medium").length;
  const openFieldReports = fieldReports.filter((report) => report.status !== "closed");
  const criticalFieldReports = openFieldReports.filter((report) =>
    ["high", "critical"].includes(report.severity.toLowerCase())
  );

  const recommendations30 = [
    "Valider sous 30 jours toutes les declarations en attente.",
    "Cloturer les notifications critiques en file active.",
    "Renforcer les controles terrain sur les zones a faible ratio local/import.",
  ];
  const recommendations60 = [
    "Porter le taux d'unites actives au-dessus de 85%.",
    "Contractualiser un plan sectoriel de substitution des importations.",
    "Normaliser les certifications qualite sur les lots prioritaires.",
  ];
  const recommendations90 = [
    "Publier un tableau de bord ministeriel mensuel officiel.",
    "Generaliser la tracabilite QR sur les filieres prioritaires.",
    "Aligner budget industriel et evidence data pour accelerer l'impact PIB non petrolier.",
  ];

  return (
    <section className="section briefing-shell">
      <div className="ministerial-banner chart-card">
        <div>
          <p className="briefing-overline">Republique Gabonaise</p>
          <h1 className="briefing-title">Briefing Ministeriel PNPI</h1>
          <p className="briefing-subtitle">
            Plateforme nationale de suivi et tracabilite industrielle - souverainete economique.
          </p>
        </div>
        <div className="briefing-meta">
          <span>Date: {generatedAt}</span>
          <span>Cycle: 2026-2028</span>
          <span>Version: Comite de pilotage</span>
        </div>
      </div>

      <div className="chart-card no-print" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          <PrintActions />
          <Link href="/" style={{ marginLeft: "auto" }}>
            Retour tableau de bord
          </Link>
          <a href="/api/exports/inspectors-briefing-pdf">Exporter briefing inspecteurs (PDF)</a>
        </div>
      </div>

      <div className="cards-grid briefing-section">
        <div className="chart-card">
          <h3 style={{ marginTop: 0 }}>Resume executif</h3>
          <p style={{ marginBottom: "0.4rem" }}>
            Indice national actuel: <strong>{(snapshot.national_index * 100).toFixed(1)}%</strong>
          </p>
          <p style={{ marginBottom: "0.4rem" }}>
            Ecart importation: <strong>{snapshot.import_gap_tons.toFixed(1)} T</strong>
          </p>
          <p style={{ marginBottom: "0.4rem" }}>
            Emplois traces: <strong>{normalizeNumber(snapshot.jobs_created)}</strong>
          </p>
          <p style={{ marginBottom: 0 }}>
            Tendance previsionnelle: <strong>{growthDirection}</strong> de{" "}
            {Math.abs(forecastDelta).toFixed(1)} T sur la fenetre projetee.
          </p>
        </div>

        <div className="chart-card">
          <h3 style={{ marginTop: 0 }}>Baseline 2026 vs Cible 2028</h3>
          <p style={{ marginBottom: "0.35rem" }}>
            Indice national: {(snapshot.national_index * 100).toFixed(1)}% -&gt; 85%
          </p>
          <p style={{ marginBottom: "0.35rem" }}>
            Unites actives: {snapshot.active_units}/{units.length} (
            {(activeUnitRate * 100).toFixed(0)}%) -&gt; 90%
          </p>
          <p style={{ marginBottom: "0.35rem" }}>
            Lots traces: {snapshot.traced_batches} -&gt; 500
          </p>
          <p style={{ marginBottom: 0 }}>
            Ecart import: {snapshot.import_gap_tons.toFixed(1)} T -&gt; 0 T
          </p>
        </div>

        <div className="chart-card">
          <h3 style={{ marginTop: 0 }}>Matrice d&apos;alerte</h3>
          <p style={{ marginBottom: "0.35rem" }}>
            Critique: <strong>{criticalCount}</strong>
          </p>
          <p style={{ marginBottom: "0.35rem" }}>
            Haute: <strong>{highCount}</strong>
          </p>
          <p style={{ marginBottom: "0.35rem" }}>
            Moyenne: <strong>{mediumCount}</strong>
          </p>
          <p style={{ marginBottom: 0 }}>
            Total alertes: <strong>{alerts.length}</strong>
          </p>
          <p style={{ marginBottom: 0 }}>
            Rapports terrain ouverts: <strong>{openFieldReports.length}</strong> (
            {criticalFieldReports.length} prioritaires)
          </p>
        </div>
      </div>

      <div className="cards-grid briefing-section print-break">
        <div className="table-card">
          <h3 style={{ marginTop: 0 }}>Plan 30 jours</h3>
          {recommendations30.map((item) => (
            <p key={item} style={{ marginBottom: "0.35rem" }}>
              - {item}
            </p>
          ))}
        </div>
        <div className="table-card">
          <h3 style={{ marginTop: 0 }}>Plan 60 jours</h3>
          {recommendations60.map((item) => (
            <p key={item} style={{ marginBottom: "0.35rem" }}>
              - {item}
            </p>
          ))}
        </div>
        <div className="table-card">
          <h3 style={{ marginTop: 0 }}>Plan 90 jours</h3>
          {recommendations90.map((item) => (
            <p key={item} style={{ marginBottom: "0.35rem" }}>
              - {item}
            </p>
          ))}
        </div>
      </div>

      <div className="briefing-section">
        <h2>Alertes prioritaires</h2>
        <div className="cards-grid">
          {alerts.length === 0 ? (
            <div className="chart-card">
              <strong>Aucune alerte critique en cours.</strong>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className="chart-card"
                style={{
                  border: `1px solid ${severityColor(alert.severity)}`,
                  boxShadow: `0 12px 24px ${severityColor(alert.severity)}22`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.7rem" }}>
                  <strong>{alert.title}</strong>
                  <span style={{ color: severityColor(alert.severity), fontWeight: 700 }}>
                    {alert.severity.toUpperCase()}
                  </span>
                </div>
                <p style={{ marginTop: "0.45rem", marginBottom: "0.35rem" }}>{alert.detail}</p>
                <p style={{ margin: 0, color: "#6c7a8c", fontSize: "0.85rem" }}>
                  Source: {alert.source} - {new Date(alert.created_at).toLocaleDateString("fr-FR")}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="briefing-section print-break">
        <h2>Annexes KPI</h2>
        <div className="table-card">
          <h3 style={{ marginTop: 0 }}>Annexe A - Secteurs strategiques</h3>
          <table className="annex-table">
            <thead>
              <tr>
                <th>Secteur</th>
                <th>Local (T)</th>
                <th>Import (T)</th>
                <th>Emplois</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.indicators.map((indicator) => (
                <tr key={indicator.sector}>
                  <td>{indicator.sector}</td>
                  <td>{indicator.local_volume_tons.toFixed(1)}</td>
                  <td>{indicator.import_volume_tons.toFixed(1)}</td>
                  <td>{indicator.jobs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="table-card" style={{ marginTop: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>Annexe B - Trajectoire previsionnelle</h3>
          <table className="annex-table">
            <thead>
              <tr>
                <th>Mois projete</th>
                <th>Volume (T)</th>
              </tr>
            </thead>
            <tbody>
              {forecast.map((point) => (
                <tr key={point.month}>
                  <td>{point.month}</td>
                  <td>{point.volume_tons.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="table-card" style={{ marginTop: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>Annexe C - Rapports terrain inspecteurs</h3>
          <table className="annex-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Titre</th>
                <th>Severite</th>
                <th>Statut</th>
                <th>Localisation</th>
              </tr>
            </thead>
            <tbody>
              {fieldReports.slice(0, 12).map((report) => (
                <tr key={report.id}>
                  <td>{report.id}</td>
                  <td>{report.title}</td>
                  <td>{report.severity}</td>
                  <td>{report.status}</td>
                  <td>{report.location ?? "Non renseigne"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
