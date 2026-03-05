import { backendRequest } from "./backend";

const request = async <T>(path: string): Promise<T> => {
  const response = await backendRequest(path);
  if (!response.ok) {
    throw new Error(`Erreur API ${response.status}: ${response.statusText}`);
  }
  return response.json();
};

export interface SectorIndicator {
  sector: string;
  local_volume_tons: number;
  import_volume_tons: number;
  jobs: number;
}

export interface ForecastPoint {
  month: string;
  volume_tons: number;
}

export interface TraceBatch {
  batch_id: string;
  product: string;
  origin: string;
  factory: string;
  certification: string;
  quantity_tons: number;
  qr_code: string;
  timestamp: string;
}

export interface IndustrialUnit {
  id: string;
  name: string;
  sector: string;
  location: string;
  capacity: number;
  status: "active" | "inactive";
  declarations: unknown[];
}

export interface ProductionDeclaration {
  id: string;
  month: string;
  volume_tons: number;
  jobs: number;
  validated: boolean;
  submitted_at: string;
  submitted_by: string;
}

export interface DashboardSnapshot {
  indicators: SectorIndicator[];
  national_index: number;
  jobs_created: number;
  import_gap_tons: number;
  active_units: number;
  active_zones: number;
  traced_batches: number;
}

export interface DashboardAlert {
  id: string;
  severity: string;
  title: string;
  detail: string;
  source: string;
  created_at: string;
}

export interface UserAccount {
  username: string;
  full_name: string;
  roles: string[];
  is_active: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  target_role: string | null;
  title: string;
  message: string;
  severity: string;
  created_at: string;
  is_read: boolean;
}

export interface FieldReport {
  id: string;
  unit_id: string | null;
  title: string;
  comment: string;
  severity: string;
  location: string | null;
  status: "open" | "in_progress" | "closed" | string;
  created_at: string;
  created_by: string;
}

export interface PilotageStatusCount {
  key: string;
  count: number;
}

export interface ProjectDossier {
  id: string;
  company_name: string;
  project_title: string;
  sector: string;
  location: string;
  status: string;
  stage: string;
  priority: string;
  sla_days: number;
  submitted_at: string;
  updated_at: string;
  decision_at: string | null;
  assigned_to: string | null;
  assigned_role: string | null;
  decision_reason: string | null;
  decision_reference: string | null;
  age_days: number;
  is_overdue: boolean;
}

export interface PilotageKpiSnapshot {
  generated_at: string;
  total_dossiers: number;
  in_progress_dossiers: number;
  overdue_dossiers: number;
  approval_rate: number;
  median_processing_days: number;
  sla_compliance_rate: number;
  status_breakdown: PilotageStatusCount[];
  stage_breakdown: PilotageStatusCount[];
}

export interface ProjectDossierTransition {
  id: string;
  dossier_id: string;
  changed_by: string;
  previous_status: string | null;
  new_status: string | null;
  previous_stage: string | null;
  new_stage: string | null;
  note: string;
  changed_at: string;
}

export interface ExecutiveBreakdownItem {
  key: string;
  total: number;
  overdue: number;
}

export interface ExecutiveStageDelay {
  stage: string;
  average_age_days: number;
  dossiers: number;
}

export interface ExecutiveMonthlyPoint {
  month: string;
  created: number;
  decided: number;
}

export interface PilotageExecutiveDashboard {
  generated_at: string;
  total_dossiers: number;
  overdue_backlog: number;
  approval_rate: number;
  by_sector: ExecutiveBreakdownItem[];
  by_location: ExecutiveBreakdownItem[];
  by_direction: ExecutiveBreakdownItem[];
  stage_delays: ExecutiveStageDelay[];
  monthly_trend: ExecutiveMonthlyPoint[];
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string | null;
  details: string;
}

export const fetchDashboard = (): Promise<DashboardSnapshot> =>
  request("/dashboard/indicators");

export const fetchForecast = (): Promise<ForecastPoint[]> =>
  request("/dashboard/forecast");

export const fetchDashboardAlerts = (): Promise<DashboardAlert[]> =>
  request("/dashboard/alerts");

export const fetchBatches = (): Promise<TraceBatch[]> => request("/batches");

export const fetchUnits = (): Promise<IndustrialUnit[]> => request("/units");

export const fetchDeclarations = (): Promise<ProductionDeclaration[]> =>
  request("/declarations");

export const fetchAdminUsers = (): Promise<UserAccount[]> => request("/admin/users");

export const fetchNotifications = (): Promise<Notification[]> =>
  request("/admin/notifications");

export const fetchFieldReports = (): Promise<FieldReport[]> => request("/field-reports");

export const fetchPilotageDossiers = (): Promise<ProjectDossier[]> =>
  request("/pilotage/dossiers");

export const fetchPilotageKpis = (): Promise<PilotageKpiSnapshot> =>
  request("/pilotage/kpis");

export const fetchPilotageQueue = (): Promise<ProjectDossier[]> =>
  request("/pilotage/queue");

export const fetchPilotageExecutiveDashboard = (): Promise<PilotageExecutiveDashboard> =>
  request("/pilotage/executive-dashboard");

export const fetchPilotageDossierHistory = (
  dossierId: string
): Promise<ProjectDossierTransition[]> =>
  request(`/pilotage/dossiers/${encodeURIComponent(dossierId)}/history`);

export const fetchAuditEvents = (): Promise<AuditEvent[]> => request("/audit/events");

// ---------------------------------------------------------------------------
// PNPI Types
// ---------------------------------------------------------------------------

export interface PNPIDashboardKpis {
  atis_total: number;
  atis_en_cours: number;
  atis_approuves_ce_mois: number;
  atis_en_retard: number;
  delai_moyen_jours: number;
  taux_sla_pct: number;
  operateurs_actifs: number;
  taux_conformite_pct: number;
  generated_at: string;
}

export interface OperateurGeoPoint {
  id: string;
  raison_sociale: string;
  secteur: string;
  province: string;
  latitude: number;
  longitude: number;
  nb_atis_actifs: number;
  statut_dernier_ati: string | null;
}

export interface SecteurStats {
  secteur: string;
  nb_operateurs: number;
  nb_atis_total: number;
  nb_atis_approuves: number;
  taux_approbation_pct: number;
  emplois_declares: number;
}

export interface ProvinceStats {
  province: string;
  nb_operateurs: number;
  nb_atis_actifs: number;
}

export interface ATIPipelineStats {
  soumis: number;
  en_instruction: number;
  en_validation: number;
  approuve: number;
  rejete: number;
  expire: number;
}

export interface MensuelStats {
  mois: string;
  nb_soumis: number;
  nb_approuves: number;
  nb_rejetes: number;
}

export interface ATIResume {
  id: string;
  numero_ati: string;
  raison_sociale: string;
  secteur: string;
  province: string;
  statut: string;
  priorite: string;
  etape: string;
  date_soumission: string;
  age_jours: number;
  is_overdue: boolean;
}

// ---------------------------------------------------------------------------
// PNPI API calls
// ---------------------------------------------------------------------------

export const fetchPNPIKpis = (): Promise<PNPIDashboardKpis> =>
  request("/pnpi/dashboard/kpis");

export const fetchPNPICarte = (): Promise<OperateurGeoPoint[]> =>
  request("/pnpi/dashboard/carte");

export const fetchPNPISecteurs = (): Promise<SecteurStats[]> =>
  request("/pnpi/dashboard/secteurs");

export const fetchPNPIProvinces = (): Promise<ProvinceStats[]> =>
  request("/pnpi/dashboard/provinces");

export const fetchPNPIPipeline = (): Promise<ATIPipelineStats> =>
  request("/pnpi/dashboard/pipeline");

export const fetchPNPITendances = (): Promise<MensuelStats[]> =>
  request("/pnpi/dashboard/tendances");

export const fetchPNPIRecents = (): Promise<ATIResume[]> =>
  request("/pnpi/dashboard/recents");
// ATI detail types
export interface ATIRead {
  id: string; numero_ati: string; operateur_id: string; type_activite: string;
  secteur: string; statut: string; etape: string; priorite: string;
  instructeur_username: string | null; date_soumission: string;
  date_decision: string | null; date_expiration: string | null; sla_jours: number;
  qr_code_data: string | null; motif_rejet: string | null;
  numero_reference_decision: string | null; observations: string | null;
  created_by: string | null; updated_at: string; age_jours: number; is_overdue: boolean;
}
export interface ATIBrief {
  id: string; numero_ati: string; type_activite: string; secteur: string;
  statut: string; etape: string; priorite: string;
  instructeur_username: string | null;
  date_soumission: string; age_jours: number; is_overdue: boolean;
}
export interface ATITransitionRead {
  id: string; ati_id: string; changed_by: string; previous_statut: string | null;
  new_statut: string | null; previous_etape: string | null; new_etape: string | null;
  note: string; changed_at: string;
}
export interface OperateurBrief {
  id: string; nif_gabon: string; raison_sociale: string; secteur: string;
  province: string; ville: string; is_active: boolean; effectif_declare: number | null;
}
export interface OperateurRead extends OperateurBrief {
  latitude: number | null; longitude: number | null;
  contact_email: string | null; contact_telephone: string | null;
  created_at: string; created_by: string | null;
}
// PNPI ATI + Operateurs fetch
export const fetchPNPIATIs = (params?: { statut?: string; secteur?: string; province?: string; skip?: number; limit?: number }): Promise<ATIRead[]> => {
  const qs = new URLSearchParams();
  if (params?.statut) qs.set("statut", params.statut);
  if (params?.secteur) qs.set("secteur", params.secteur);
  if (params?.province) qs.set("province", params.province);
  if (params?.skip) qs.set("skip", String(params.skip));
  if (params?.limit) qs.set("limit", String(params.limit));
  const q = qs.toString();
  return request(`/pnpi/ati${q ? "?" + q : ""}`);
};
export const fetchPNPIATI = (id: string): Promise<ATIRead> => request(`/pnpi/ati/${encodeURIComponent(id)}`);
export const fetchPNPIATIHistorique = (id: string): Promise<ATITransitionRead[]> => request(`/pnpi/ati/${encodeURIComponent(id)}/historique`);
export const fetchPNPIOperateurs = (params?: { secteur?: string; province?: string }): Promise<OperateurBrief[]> => {
  const qs = new URLSearchParams();
  if (params?.secteur) qs.set("secteur", params.secteur);
  if (params?.province) qs.set("province", params.province);
  const q = qs.toString();
  return request(`/pnpi/operateurs${q ? "?" + q : ""}`);
};
export const fetchPNPIOperateur = (id: string): Promise<OperateurRead> => request(`/pnpi/operateurs/${encodeURIComponent(id)}`);
export const fetchPNPIOperateurATIs = (id: string): Promise<ATIBrief[]> => request(`/pnpi/operateurs/${encodeURIComponent(id)}/ati`);

// ---------------------------------------------------------------------------
// Inspections
// ---------------------------------------------------------------------------

export interface InspectionRead {
  id: string;
  operateur_id: string;
  operateur_nom: string;
  ati_id: string | null;
  ati_numero: string | null;
  inspecteur_username: string;
  inspecteur_nom: string;
  date_inspection: string;
  statut_conformite: string; // conforme, non_conforme, partiel
  observations: string;
  mesures_correctives: string | null;
  latitude: number | null;
  longitude: number | null;
  province: string;
  secteur: string;
  created_at: string;
}

export const fetchPNPIInspections = async (params?: {
  operateur_id?: string;
  statut_conformite?: string;
  inspecteur_username?: string;
  limit?: number;
}): Promise<InspectionRead[]> => {
  const q = params ? "?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString() : "";
  return request<InspectionRead[]>(`/pnpi/inspections${q}`);
};

export const fetchPNPIInspection = async (id: string): Promise<InspectionRead> =>
  request<InspectionRead>(`/pnpi/inspections/${id}`);

// ---------------------------------------------------------------------------
// Documents dossier ATI
// ---------------------------------------------------------------------------

export interface DocumentRead {
  id: string;
  ati_id: string;
  nom_fichier: string;
  type_document: string;
  taille_octets: number;
  uploaded_at: string;
  uploaded_by: string;
}

export const fetchPNPIATIDocuments = async (atiId: string): Promise<DocumentRead[]> =>
  request<DocumentRead[]>(`/pnpi/ati/${encodeURIComponent(atiId)}/documents`);

// ---------------------------------------------------------------------------
// PNPI Alerts / Notifications
// ---------------------------------------------------------------------------

export interface PNPIAlert {
  type: string;
  severity: string;
  title: string;
  message: string;
  target_id: string;
  created_at: string;
}

export const fetchPNPIAlerts = (): Promise<PNPIAlert[]> =>
  request("/pnpi/alerts");

// ---------------------------------------------------------------------------
// PNPI Historique (audit trail)
// ---------------------------------------------------------------------------

export interface PNPIHistoriqueEntry {
  id: string;
  ati_id: string;
  changed_by: string;
  previous_statut: string | null;
  new_statut: string | null;
  previous_etape: string | null;
  new_etape: string | null;
  note: string;
  changed_at: string;
}

export const fetchPNPIHistorique = (params?: { changed_by?: string; limit?: number }): Promise<PNPIHistoriqueEntry[]> => {
  const qs = new URLSearchParams();
  if (params?.changed_by) qs.set("changed_by", params.changed_by);
  if (params?.limit) qs.set("limit", String(params.limit));
  const q = qs.toString();
  return request(`/pnpi/historique${q ? "?" + q : ""}`);
};
