import { ProjectDossier, ProjectDossierTransition } from "../../../lib/api";
import { PilotageDossiersTable } from "../PilotageDossiersTable";
import { PilotageExportFilters } from "../PilotageExportFilters";
import { PilotageHistoryPanel } from "../PilotageHistoryPanel";

const now = new Date().toISOString();

const dossiers: ProjectDossier[] = [
  {
    id: "DOS-E2E-0001",
    company_name: "Bois Gabon Test",
    project_title: "Extension scierie",
    sector: "Bois",
    location: "Estuaire",
    status: "under_review",
    stage: "instruction",
    priority: "high",
    sla_days: 30,
    submitted_at: now,
    updated_at: now,
    decision_at: null,
    assigned_to: "Direction A",
    assigned_role: "inspecteur",
    decision_reason: null,
    decision_reference: null,
    age_days: 18,
    is_overdue: false,
  },
  {
    id: "DOS-E2E-0002",
    company_name: "Agro Demonstration",
    project_title: "Transformation manioc",
    sector: "Agroalimentaire",
    location: "Ngounie",
    status: "approved",
    stage: "decision",
    priority: "medium",
    sla_days: 20,
    submitted_at: now,
    updated_at: now,
    decision_at: now,
    assigned_to: "Direction B",
    assigned_role: "ministere",
    decision_reason: "Conforme",
    decision_reference: "ARR-DEMO-01",
    age_days: 22,
    is_overdue: true,
  },
];

const transitions: Record<string, ProjectDossierTransition[]> = {
  "DOS-E2E-0001": [
    {
      id: "TR-E2E-1",
      dossier_id: "DOS-E2E-0001",
      changed_by: "ministere",
      previous_status: "submitted",
      new_status: "under_review",
      previous_stage: "reception",
      new_stage: "instruction",
      note: "Instruction initiee",
      changed_at: now,
    },
  ],
  "DOS-E2E-0002": [
    {
      id: "TR-E2E-2",
      dossier_id: "DOS-E2E-0002",
      changed_by: "ministere",
      previous_status: "interministerial",
      new_status: "approved",
      previous_stage: "validation",
      new_stage: "decision",
      note: "Decision finale",
      changed_at: now,
    },
  ],
};

export default function PilotageE2EDemoPage() {
  return (
    <section className="section">
      <div className="chart-card">
        <h1 style={{ marginTop: 0 }}>Demonstration E2E du flux de pilotage</h1>
        <p style={{ marginBottom: 0 }}>
          Page de test UI (Playwright) avec donnees locales pour valider les interactions de flux.
        </p>
      </div>

      <div className="chart-card" style={{ marginTop: "1rem" }}>
        <h3 style={{ marginTop: 0 }}>Exports de demonstration</h3>
        <PilotageExportFilters dossiers={dossiers} />
      </div>

      <PilotageDossiersTable dossiers={dossiers} />
      <PilotageHistoryPanel dossiers={dossiers} initialTransitionsByDossier={transitions} />
    </section>
  );
}
