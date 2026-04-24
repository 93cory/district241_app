import dynamic from "next/dynamic";
import { redirect } from "next/navigation";

import {
  fetchBatches,
  fetchDashboard,
  fetchDashboardAlerts,
  fetchFieldReports,
  fetchForecast,
  fetchUnits,
  type DashboardAlert,
} from "../lib/api";
import { fetchBackendProfile } from "../lib/backend";
import { getDefaultRouteForRoles } from "../lib/role-routing";
import { BatchTable } from "./components/BatchTable";
import { ExportPanel } from "./components/ExportPanel";
import { KpiCard } from "./components/KpiCard";
import { SectorCard } from "./components/SectorCard";
import { UnitsTable } from "./components/UnitsTable";

const ForecastChart = dynamic(() => import("./components/ForecastChart"), { ssr: false });

const MapSection = dynamic(() => import("./components/MapSection"), { ssr: false });

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

export default async function HomePage() {
  try {
    const profile = await fetchBackendProfile();
    const defaultRoute = getDefaultRouteForRoles(profile.roles ?? []);
    if (defaultRoute !== "/") {
      redirect(defaultRoute);
    }
  } catch {
    redirect("/connexion");
  }

  try {
    const [snapshot, forecast, batches, units, alerts, fieldReports] = await Promise.all([
      fetchDashboard(),
      fetchForecast(),
      fetchBatches(),
      fetchUnits(),
      fetchDashboardAlerts(),
      fetchFieldReports().catch(() => []),
    ]);

    const baselineVsTarget = [
      {
        metric: "Indice national",
        baseline: `${(snapshot.national_index * 100).toFixed(1)}%`,
        target: "85%",
      },
      {
        metric: "Emplois industriels",
        baseline: normalizeNumber(snapshot.jobs_created),
        target: "5k",
      },
      {
        metric: "Ecart import",
        baseline: `${normalizeNumber(snapshot.import_gap_tons)} T`,
        target: "0 T",
      },
      {
        metric: "Lots traces",
        baseline: normalizeNumber(snapshot.traced_batches),
        target: "500",
      },
    ];

    return (
      <>
        <section className="hero-grid">
          <KpiCard
            title="Indice national"
            value={`${(snapshot.national_index * 100).toFixed(0)} %`}
            detail="Objectif 85 % d'ici 2028"
          />
          <KpiCard
            title="Emplois industrialises"
            value={normalizeNumber(snapshot.jobs_created)}
            detail="Multiplication des chaines locales"
          />
          <KpiCard
            title="Ecart import"
            value={`${normalizeNumber(snapshot.import_gap_tons)} T`}
            detail="Moins d'imports = plus de valeur locale"
          />
          <KpiCard
            title="Unites actives"
            value={normalizeNumber(snapshot.active_units)}
            detail="Capacite industrielle mobilisee"
          />
          <KpiCard
            title="Zones actives"
            value={normalizeNumber(snapshot.active_zones)}
            detail="Territoires industriels en activite"
          />
          <KpiCard
            title="Lots traces"
            value={normalizeNumber(snapshot.traced_batches)}
            detail="Tracabilite lot par lot"
          />
        </section>

        <section className="section">
          <h2>Pilotage 2026 vs Cible 2028</h2>
          <p>Lecture directe des ecarts strategiques pour orienter les decisions ministerielles.</p>
          <div className="cards-grid">
            {baselineVsTarget.map((entry) => (
              <div className="chart-card" key={entry.metric}>
                <p
                  style={{
                    margin: 0,
                    color: "#6c7482",
                    textTransform: "uppercase",
                    fontSize: "0.85rem",
                  }}
                >
                  {entry.metric}
                </p>
                <div
                  style={{ marginTop: "0.6rem", display: "flex", justifyContent: "space-between" }}
                >
                  <div>
                    <div style={{ color: "#082251", fontWeight: 700 }}>Baseline 2026</div>
                    <div style={{ fontSize: "1.25rem" }}>{entry.baseline}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: "#0f6b3f", fontWeight: 700 }}>Cible 2028</div>
                    <div style={{ fontSize: "1.25rem" }}>{entry.target}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="section">
          <h2>Alertes prioritaires</h2>
          <p>Signalements critiques a traiter pour accelerer la transformation locale.</p>
          <AlertGrid alerts={alerts} />
        </section>

        <section className="section">
          <h2>Prevision et villes prioritaires</h2>
          <p>Courbe de production appuyee par les unites locales et les clusters.</p>
          <ForecastChart data={forecast} />
        </section>

        <section className="section">
          <h2>Secteurs strategiques</h2>
          <p>Volumes localises versus import, emplois crees.</p>
          <div className="cards-grid">
            {snapshot.indicators.map((indicator) => (
              <SectorCard
                key={indicator.sector}
                sector={indicator.sector}
                local={indicator.local_volume_tons}
                imported={indicator.import_volume_tons}
                jobs={indicator.jobs}
              />
            ))}
          </div>
        </section>

        <section className="section">
          <h2>Cartographie</h2>
          <p>Couche geospatiale avec points terrain inspecteurs et zones industrielles actives.</p>
          <MapSection units={units} fieldReports={fieldReports} />
        </section>

        <section className="section">
          <ExportPanel indicators={snapshot.indicators} batches={batches} units={units} />
        </section>

        <section className="section">
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
            <div style={{ flex: "2 1 500px" }}>
              <BatchTable batches={batches} />
            </div>
            <div style={{ flex: "1 1 300px" }}>
              <UnitsTable units={units} />
            </div>
          </div>
        </section>
      </>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return (
      <section className="section">
        <div className="chart-card">
          <h2>Tableau de bord indisponible</h2>
          <p style={{ color: "#b42318" }}>{message}</p>
          <p>
            Verifiez NEXT_PUBLIC_BACKEND_URL, PNPI_BACKEND_USERNAME et PNPI_BACKEND_PASSWORD, puis
            relancez le serveur Next.js.
          </p>
        </div>
      </section>
    );
  }
}

const AlertGrid = ({ alerts }: { alerts: DashboardAlert[] }) => {
  if (!alerts.length) {
    return (
      <div className="chart-card">
        <strong>Aucune alerte prioritaire</strong>
        <p style={{ marginTop: "0.4rem", marginBottom: 0, color: "#3a4351" }}>
          Les signaux critiques sont sous controle pour le cycle en cours.
        </p>
      </div>
    );
  }

  return (
    <div className="cards-grid">
      {alerts.map((alert) => {
        const color = severityColor(alert.severity);
        return (
          <div
            key={alert.id}
            className="chart-card"
            style={{ border: `1px solid ${color}`, boxShadow: `0 10px 24px ${color}22` }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
              <strong>{alert.title}</strong>
              <span
                style={{ color, fontWeight: 700, textTransform: "uppercase", fontSize: "0.75rem" }}
              >
                {alert.severity}
              </span>
            </div>
            <p style={{ marginTop: "0.55rem", marginBottom: "0.45rem", color: "#3a4351" }}>
              {alert.detail}
            </p>
            <p style={{ margin: 0, color: "#6c7a8c", fontSize: "0.85rem" }}>
              Source: {alert.source} • {new Date(alert.created_at).toLocaleDateString("fr-FR")}
            </p>
          </div>
        );
      })}
    </div>
  );
};
