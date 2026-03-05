import { redirect } from "next/navigation";

import {
  fetchAuditEvents,
  fetchPilotageDossiers,
  fetchPilotageExecutiveDashboard,
  fetchPilotageKpis,
} from "../../lib/api";
import { fetchBackendProfile } from "../../lib/backend";
import { AuditSynthesisCard } from "./AuditSynthesisCard";
import { PilotageActions } from "./PilotageActions";
import { PilotageDossiersTable } from "./PilotageDossiersTable";
import { PilotageExportFilters } from "./PilotageExportFilters";
import { PilotageHistoryPanel } from "./PilotageHistoryPanel";

const formatPercent = (value: number) => `${(value * 100).toFixed(1)} %`;

const statusLabel = (status: string) => {
  switch (status) {
    case "submitted":
      return "Soumis";
    case "under_review":
      return "En instruction";
    case "interministerial":
      return "Interministeriel";
    case "approved":
      return "Approuve";
    case "rejected":
      return "Rejete";
    default:
      return status;
  }
};

const stageLabel = (stage: string) => {
  switch (stage) {
    case "reception":
      return "Reception";
    case "instruction":
      return "Instruction";
    case "validation":
      return "Validation";
    case "decision":
      return "Decision";
    default:
      return stage;
  }
};

export default async function PilotagePage() {
  let profile;
  try {
    profile = await fetchBackendProfile();
  } catch {
    redirect("/connexion");
  }
  const roles = profile.roles ?? [];
  const allowed = roles.includes("admin") || roles.includes("ministere") || roles.includes("inspecteur");
  if (!allowed) {
    redirect("/");
  }

  const [kpis, dossiers, executive, auditEvents] = await Promise.all([
    fetchPilotageKpis(),
    fetchPilotageDossiers(),
    fetchPilotageExecutiveDashboard(),
    fetchAuditEvents().catch(() => []),
  ]);

  return (
    <section className="section">
      <div className="chart-card reveal">
        <h1 style={{ marginTop: 0, marginBottom: "0.6rem" }}>
          Plateforme de Pilotage Industriel
        </h1>
        <p style={{ margin: 0, color: "#3a4351" }}>
          Suivi du flux ministeriel des dossiers: reception, instruction, validation et
          decision.
        </p>
      </div>

      <div className="hero-grid reveal-stagger" style={{ marginTop: "1rem" }}>
        <Kpi title="Dossiers totaux" value={String(kpis.total_dossiers)} detail="Portefeuille actif" />
        <Kpi
          title="Dossiers en cours"
          value={String(kpis.in_progress_dossiers)}
          detail="Soumis, instruction, interministeriel"
        />
        <Kpi title="Hors SLA" value={String(kpis.overdue_dossiers)} detail="Traitement prioritaire requis" />
        <Kpi title="Taux d'approbation" value={formatPercent(kpis.approval_rate)} detail="Sur dossiers decides" />
        <Kpi
          title="Delai median"
          value={`${kpis.median_processing_days.toFixed(1)} j`}
          detail="Duree de traitement"
        />
        <Kpi title="Conformite SLA" value={formatPercent(kpis.sla_compliance_rate)} detail="Decisions dans le delai" />
      </div>

      <div className="cards-grid reveal-stagger">
        <div className="table-card">
          <h3 style={{ marginTop: 0 }}>Repartition par statut</h3>
          {kpis.status_breakdown.map((entry) => (
            <div
              key={entry.key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderBottom: "1px solid #edf1f7",
                padding: "0.45rem 0",
              }}
            >
              <span>{statusLabel(entry.key)}</span>
              <strong>{entry.count}</strong>
            </div>
          ))}
        </div>

        <div className="table-card">
          <h3 style={{ marginTop: 0 }}>Repartition par etape</h3>
          {kpis.stage_breakdown.map((entry) => (
            <div
              key={entry.key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderBottom: "1px solid #edf1f7",
                padding: "0.45rem 0",
              }}
            >
              <span>{entry.key}</span>
              <strong>{entry.count}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="cards-grid reveal-stagger" style={{ marginTop: "1rem" }}>
        <div className="table-card">
          <h3 style={{ marginTop: 0 }}>Vue de direction</h3>
          <p style={{ margin: "0 0 0.35rem" }}>
            Dossiers: <strong>{executive.total_dossiers}</strong>
          </p>
          <p style={{ margin: "0 0 0.35rem" }}>
            Backlog hors SLA: <strong>{executive.overdue_backlog}</strong>
          </p>
          <p style={{ margin: 0 }}>
            Taux d&apos;approbation: <strong>{formatPercent(executive.approval_rate)}</strong>
          </p>
        </div>
        <div className="table-card">
          <h3 style={{ marginTop: 0 }}>Delais par etape</h3>
          {executive.stage_delays.map((entry) => (
            <div
              key={entry.stage}
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderBottom: "1px solid #edf1f7",
                padding: "0.42rem 0",
              }}
            >
              <span>{stageLabel(entry.stage)}</span>
              <strong>{entry.average_age_days.toFixed(1)} j</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="cards-grid reveal-stagger" style={{ marginTop: "1rem" }}>
        <BreakdownCard title="Par secteur" rows={executive.by_sector} />
        <BreakdownCard title="Par province" rows={executive.by_location} />
        <BreakdownCard title="Par direction" rows={executive.by_direction} />
      </div>

      <div className="table-card reveal" style={{ marginTop: "1rem" }}>
        <h3 style={{ marginTop: 0 }}>Tendance mensuelle (6 mois)</h3>
        <div className="table-scroll">
          <table className="annex-table">
            <thead>
              <tr>
                <th>Mois</th>
                <th>Crees</th>
                <th>Traites</th>
              </tr>
            </thead>
            <tbody>
              {executive.monthly_trend.map((entry) => (
                <tr key={entry.month}>
                  <td>{entry.month}</td>
                  <td>{entry.created}</td>
                  <td>{entry.decided}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="chart-card reveal" style={{ marginTop: "1rem" }}>
        <h3 style={{ marginTop: 0 }}>Exports d&apos;audit du flux</h3>
        <p style={{ marginTop: 0, color: "#3a4351" }}>
          Telechargez le journal des transitions pour comite de pilotage et audit interne.
        </p>
        <PilotageExportFilters dossiers={dossiers} />
      </div>

      <AuditSynthesisCard events={auditEvents} />

      <PilotageDossiersTable dossiers={dossiers} />

      <PilotageActions dossiers={dossiers} />
      <PilotageHistoryPanel dossiers={dossiers} />
    </section>
  );
}

const Kpi = ({ title, value, detail }: { title: string; value: string; detail: string }) => (
    <div className="chart-card kpi-card">
    <p style={{ margin: 0, color: "#6c7482", textTransform: "uppercase", fontSize: "0.82rem" }}>
      {title}
    </p>
    <p style={{ margin: "0.6rem 0 0.35rem", fontSize: "1.8rem", fontWeight: 700 }}>{value}</p>
    <p style={{ margin: 0, color: "#3a4351" }}>{detail}</p>
  </div>
);

const BreakdownCard = ({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ key: string; total: number; overdue: number }>;
}) => (
  <div className="table-card">
    <h3 style={{ marginTop: 0 }}>{title}</h3>
    {rows.map((entry) => (
      <div
        key={entry.key}
        style={{
          display: "flex",
          justifyContent: "space-between",
          borderBottom: "1px solid #edf1f7",
          padding: "0.45rem 0",
        }}
      >
        <span>{stageLabel(entry.key)}</span>
        <span>
          {entry.total} / hors SLA {entry.overdue}
        </span>
      </div>
    ))}
  </div>
);
