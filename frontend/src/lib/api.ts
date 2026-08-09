import { backendRequest } from "./backend";

const request = async <T>(path: string): Promise<T> => {
  const response = await backendRequest(path, { cache: "no-store" });
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

export const fetchDashboard = (): Promise<DashboardSnapshot> => request("/dashboard/indicators");

export const fetchForecast = (): Promise<ForecastPoint[]> => request("/dashboard/forecast");

export const fetchDashboardAlerts = (): Promise<DashboardAlert[]> => request("/dashboard/alerts");

export const fetchBatches = (): Promise<TraceBatch[]> => request("/batches");

export const fetchUnits = (): Promise<IndustrialUnit[]> => request("/units");

export const fetchDeclarations = (): Promise<ProductionDeclaration[]> => request("/declarations");

export const fetchAdminUsers = (): Promise<UserAccount[]> => request("/admin/users");

export const fetchNotifications = (): Promise<Notification[]> => request("/admin/notifications");

export const fetchFieldReports = (): Promise<FieldReport[]> => request("/field-reports");

export const fetchPilotageDossiers = (): Promise<ProjectDossier[]> => request("/pilotage/dossiers");

export const fetchPilotageKpis = (): Promise<PilotageKpiSnapshot> => request("/pilotage/kpis");

export const fetchPilotageQueue = (): Promise<ProjectDossier[]> => request("/pilotage/queue");

export const fetchPilotageExecutiveDashboard = (): Promise<PilotageExecutiveDashboard> =>
  request("/pilotage/executive-dashboard");

export const fetchPilotageDossierHistory = (
  dossierId: string,
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

export const fetchPNPIKpis = (): Promise<PNPIDashboardKpis> => request("/pnpi/dashboard/kpis");

export const fetchPNPICarte = (): Promise<OperateurGeoPoint[]> => request("/pnpi/dashboard/carte");

export const fetchPNPISecteurs = (): Promise<SecteurStats[]> => request("/pnpi/dashboard/secteurs");

export const fetchPNPIProvinces = (): Promise<ProvinceStats[]> =>
  request("/pnpi/dashboard/provinces");

export const fetchPNPIPipeline = (): Promise<ATIPipelineStats> =>
  request("/pnpi/dashboard/pipeline");

export const fetchPNPITendances = (): Promise<MensuelStats[]> =>
  request("/pnpi/dashboard/tendances");

export const fetchPNPIRecents = (): Promise<ATIResume[]> => request("/pnpi/dashboard/recents");

export interface TransformationIndexBreakdownItem {
  score: number;
  max: number;
  detail: string;
}

export interface TransformationIndexData {
  index: number;
  max: number;
  breakdown: Record<string, TransformationIndexBreakdownItem>;
  generated_at: string;
}

export const fetchTransformationIndex = (): Promise<TransformationIndexData> =>
  request("/pnpi/dashboard/transformation-index");

export interface BusinessModelObject {
  code: string;
  nom: string;
  description: string;
  systeme_responsable: string;
  source: string;
  niveau: string;
  volume: number;
  statut: string;
}

export interface BusinessModelRelationship {
  from: string;
  to: string;
  relation: string;
}

export interface BusinessModelCockpit {
  generated_at: string;
  vision: string;
  stats: Record<string, number>;
  objects: BusinessModelObject[];
  relationships: BusinessModelRelationship[];
  principes: string[];
  architecture_cible: string[];
  lecture_executive: string;
}

export const fetchBusinessModelCockpit = (): Promise<BusinessModelCockpit> =>
  request("/pnpi/modele-metier/cockpit");

export interface SOCCockpit {
  generated_at: string;
  risk_score: number;
  risk_level: string;
  stats: Record<string, number>;
  alerts: Array<{ severity: string; title: string; message: string }>;
  top_failed_users: Array<{ username: string; count: number }>;
  top_failed_ips: Array<{ ip: string; count: number }>;
  recent_events: Array<{
    id: string;
    actor: string;
    action: string;
    target: string | null;
    timestamp: string | null;
  }>;
  incident_cycle: string[];
  rules: Array<{ code: string; libelle: string; statut: string; preuve: string }>;
  lecture_executive: string;
}

export const fetchSOCCockpit = (): Promise<SOCCockpit> => request("/pnpi/securite/soc");

export interface RINCockpitCoverageItem {
  label: string;
  statut: string;
  couverture_pct: number;
  elements: number;
  total_reference: number;
  description: string;
}

export interface RINCockpitPriority {
  operateur_id: string;
  raison_sociale: string;
  secteur: string;
  province: string;
  score: number;
  manques: string[];
}

export interface RINCockpit {
  generated_at: string;
  score_national: number;
  stats: Record<string, number>;
  coverage: RINCockpitCoverageItem[];
  priorites: RINCockpitPriority[];
  lecture_executive: string;
}

export const fetchRINCockpit = (): Promise<RINCockpit> => request("/pnpi/rin/cockpit");
// ATI detail types
export interface ATIRead {
  id: string;
  numero_ati: string;
  operateur_id: string;
  type_demande: string;
  type_activite: string;
  secteur: string;
  statut: string;
  etape: string;
  priorite: string;
  payment_status: string;
  payment_reference: string | null;
  instructeur_username: string | null;
  date_soumission: string;
  date_decision: string | null;
  date_expiration: string | null;
  sla_jours: number;
  qr_code_data: string | null;
  motif_rejet: string | null;
  numero_reference_decision: string | null;
  observations: string | null;
  created_by: string | null;
  updated_at: string;
  age_jours: number;
  is_overdue: boolean;
}
export interface ATIBrief {
  id: string;
  operateur_id: string;
  numero_ati: string;
  type_demande: string;
  type_activite: string;
  secteur: string;
  statut: string;
  etape: string;
  priorite: string;
  payment_status: string;
  payment_reference: string | null;
  instructeur_username: string | null;
  date_soumission: string;
  age_jours: number;
  is_overdue: boolean;
}
export interface ATITransitionRead {
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
export interface ATIRequestType {
  key: string;
  label: string;
  description: string;
  documents_requis: string[];
}
export interface ATITechnicalOpinion {
  id: string;
  ati_id: string;
  direction: string;
  requested_by: string;
  requested_at: string;
  due_at: string | null;
  status: string;
  motivation: string | null;
  signed_by: string | null;
  signed_at: string | null;
}
export interface ATIComplementRequest {
  id: string;
  ati_id: string;
  requested_by: string;
  requested_at: string;
  due_at: string | null;
  status: string;
  motif: string;
  requested_documents: string[];
  response_note: string | null;
  responded_by: string | null;
  responded_at: string | null;
}
export interface ATIBusinessRule {
  id: string;
  rule_type: string;
  demande_type: string | null;
  secteur: string | null;
  label: string;
  config: Record<string, unknown>;
  is_active: boolean;
  updated_by: string | null;
  updated_at: string | null;
}
export interface ATIProcessingItem {
  id: string;
  numero_ati: string;
  operateur: string;
  secteur: string;
  type_demande: string;
  statut: string;
  etape: string;
  priorite: string;
  age_jours: number;
  sla_jours: number;
  is_overdue: boolean;
  blocking_reasons: string[];
  next_action: string;
  responsible: string;
  missing_documents: string[];
  score_preparation: number;
  score_urgence: number;
  decision_state: string;
}
export interface ATIProcessingCenter {
  generated_at: string;
  stats: Record<string, number>;
  buckets: Record<string, ATIProcessingItem[]>;
  items: ATIProcessingItem[];
}
export interface ATIControlCard {
  generated_at: string;
  ati_id: string;
  numero_ati: string;
  score_preparation: number;
  score_urgence: number;
  decision_state: string;
  next_action: string;
  responsible: string;
  documents: {
    required: string[];
    present: string[];
    missing: string[];
    extra: string[];
    documents_count: number;
    completion_pct: number;
    is_complete: boolean;
  };
  blockers: string[];
  warnings: string[];
  control_points: Array<{ label: string; status: string; detail: string }>;
  workflow_guardrails: string[];
}
export interface OperateurBrief {
  id: string;
  nif_gabon: string;
  raison_sociale: string;
  secteur: string;
  province: string;
  ville: string;
  is_active: boolean;
  effectif_declare: number | null;
}
export interface OperateurRead extends OperateurBrief {
  latitude: number | null;
  longitude: number | null;
  contact_email: string | null;
  contact_telephone: string | null;
  created_at: string;
  created_by: string | null;
}
export interface RINRepresentant {
  id: string;
  operateur_id: string;
  nom_complet: string;
  fonction: string;
  email: string | null;
  telephone: string | null;
  est_contact_principal: boolean;
  created_at: string;
  created_by: string | null;
  statut_validation: string;
  updated_at: string | null;
  validated_by: string | null;
  validated_at: string | null;
}
export interface RINSite {
  id: string;
  operateur_id: string;
  nom_site: string;
  type_site: string;
  province: string;
  ville: string;
  adresse: string | null;
  latitude: number | null;
  longitude: number | null;
  superficie_ha: number | null;
  statut: string;
  created_at: string;
  created_by: string | null;
  statut_validation: string;
  updated_at: string | null;
  validated_by: string | null;
  validated_at: string | null;
}
export interface RINProduit {
  id: string;
  operateur_id: string;
  nom_produit: string;
  categorie: string;
  unite: string;
  capacite_annuelle: number | null;
  production_annuelle: number | null;
  marche_cible: string | null;
  certification: string | null;
  created_at: string;
  created_by: string | null;
  statut_validation: string;
  updated_at: string | null;
  validated_by: string | null;
  validated_at: string | null;
}
export interface RINRessource {
  id: string;
  operateur_id: string;
  type_ressource: string;
  libelle: string;
  origine: string | null;
  consommation_annuelle: number | null;
  unite: string | null;
  dependance_import: boolean;
  created_at: string;
  created_by: string | null;
  statut_validation: string;
  updated_at: string | null;
  validated_by: string | null;
  validated_at: string | null;
}
export interface RINInvestissement {
  id: string;
  operateur_id: string;
  intitule: string;
  montant_fcfa: number | null;
  statut: string;
  annee: number | null;
  emplois_prevus: number | null;
  description: string | null;
  created_at: string;
  created_by: string | null;
  statut_validation: string;
  updated_at: string | null;
  validated_by: string | null;
  validated_at: string | null;
}
export interface RINProfile {
  operateur_id: string;
  score_structuration: number;
  representants: RINRepresentant[];
  sites: RINSite[];
  produits: RINProduit[];
  ressources: RINRessource[];
  investissements: RINInvestissement[];
  manques: string[];
  workflow_counts: Record<string, number>;
}
export interface RINProfile360 {
  generated_at: string;
  operateur: {
    id: string;
    nif_gabon: string;
    raison_sociale: string;
    secteur: string;
    province: string;
    ville: string;
    is_active: boolean;
    effectif_declare: number | null;
    geolocalise: boolean;
  };
  score_360: number;
  grade: string;
  niveau_risque: string;
  stats: Record<string, number>;
  synthese: Record<string, string>;
  manques: string[];
  risques: Array<{ niveau: string; titre: string; detail: string }>;
  decisions_possibles: Array<{ decision: string; lecture: string; justification: string }>;
  timeline: Array<{ date: string; type: string; titre: string; detail: string; niveau: string }>;
  actions_prioritaires: Array<{ priorite: string; action: string }>;
  lecture_executive: string;
}
// PNPI ATI + Operateurs fetch
export const fetchPNPIATIs = (params?: {
  statut?: string;
  secteur?: string;
  province?: string;
  skip?: number;
  limit?: number;
}): Promise<ATIRead[]> => {
  const qs = new URLSearchParams();
  if (params?.statut) qs.set("statut", params.statut);
  if (params?.secteur) qs.set("secteur", params.secteur);
  if (params?.province) qs.set("province", params.province);
  if (params?.skip) qs.set("skip", String(params.skip));
  if (params?.limit) qs.set("limit", String(params.limit));
  const q = qs.toString();
  return request(`/pnpi/ati${q ? "?" + q : ""}`);
};
export const fetchPNPIATI = (id: string): Promise<ATIRead> =>
  request(`/pnpi/ati/${encodeURIComponent(id)}`);
export const fetchPNPIATIRequestTypes = (): Promise<ATIRequestType[]> =>
  request("/pnpi/ati/request-types");
export const fetchPNPIATIProcessingCenter = (): Promise<ATIProcessingCenter> =>
  request("/pnpi/ati/processing-center");
export const fetchPNPIATIControlCard = (id: string): Promise<ATIControlCard> =>
  request(`/pnpi/ati/${encodeURIComponent(id)}/control-card`);
export const fetchPNPIATIBusinessRules = (): Promise<ATIBusinessRule[]> =>
  request("/pnpi/ati/business-rules");
export const fetchPNPIATITechnicalOpinions = (id: string): Promise<ATITechnicalOpinion[]> =>
  request(`/pnpi/ati/${encodeURIComponent(id)}/technical-opinions`);
export const fetchPNPIATIComplements = (id: string): Promise<ATIComplementRequest[]> =>
  request(`/pnpi/ati/${encodeURIComponent(id)}/complements`);
export const fetchPNPIATIHistorique = (id: string): Promise<ATITransitionRead[]> =>
  request(`/pnpi/ati/${encodeURIComponent(id)}/historique`);
export const fetchPNPIOperateurs = (params?: {
  secteur?: string;
  province?: string;
  skip?: number;
  limit?: number;
}): Promise<OperateurBrief[]> => {
  const qs = new URLSearchParams();
  if (params?.secteur) qs.set("secteur", params.secteur);
  if (params?.province) qs.set("province", params.province);
  if (params?.skip) qs.set("skip", String(params.skip));
  if (params?.limit) qs.set("limit", String(params.limit));
  const q = qs.toString();
  return request(`/pnpi/operateurs${q ? "?" + q : ""}`);
};
export const fetchPNPIOperateur = (id: string): Promise<OperateurRead> =>
  request(`/pnpi/operateurs/${encodeURIComponent(id)}`);
export const fetchPNPIOperateurATIs = (id: string): Promise<ATIBrief[]> =>
  request(`/pnpi/operateurs/${encodeURIComponent(id)}/ati`);
export const fetchRINProfile = (id: string): Promise<RINProfile> =>
  request(`/pnpi/rin/operateurs/${encodeURIComponent(id)}`);
export const fetchRINProfile360 = (id: string): Promise<RINProfile360> =>
  request(`/pnpi/rin/operateurs/${encodeURIComponent(id)}/360`);

// ---------------------------------------------------------------------------
// Inspections
// ---------------------------------------------------------------------------

export interface InspectionRead {
  id: string;
  operateur_id: string;
  operateur_nom: string;
  ati_id: string | null;
  ati_numero: string | null;
  mission_order_id: string | null;
  campaign_id: string | null;
  inspecteur_username: string;
  inspecteur_nom: string;
  date_inspection: string;
  workflow_status: string;
  statut_conformite: string; // conforme, non_conforme, partiel
  score_conformite: number | null;
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
  const q = params
    ? "?" +
      new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)]),
      ).toString()
    : "";
  return request<InspectionRead[]>(`/pnpi/inspections${q}`);
};

export const fetchPNPIInspection = async (id: string): Promise<InspectionRead> =>
  request<InspectionRead>(`/pnpi/inspections/${id}`);

export interface InspectionControlCenter {
  generated_at: string;
  headline: {
    score_national: number;
    grade: string;
    risk_level: string;
    taux_conformite: number;
    taux_non_conformite: number;
    couverture_globale: number;
    couverture_annuelle: number;
    execution_plan_annuel: number;
    taux_cloture_actions: number;
  };
  stats: Record<string, number>;
  buckets: Record<string, unknown[]>;
  risk_queue: Array<{
    operateur_id: string;
    operateur: string;
    province: string;
    secteur: string;
    last_inspection: string | null;
    status: string;
    score_conformite: number | null;
    risk_score: number;
    risk_level: string;
    critical_findings: number;
    open_actions: number;
    next_action: string;
  }>;
  executive_alerts: Array<{ level: string; title: string; detail: string }>;
  recommendations: string[];
  by_province: Record<
    string,
    { total: number; conformes: number; non_conformes: number; partiels: number; score_moyen: number; taux_conformite: number }
  >;
  by_sector: Record<
    string,
    { total: number; conformes: number; non_conformes: number; partiels: number; score_moyen: number; taux_conformite: number }
  >;
}

export interface InspectionMissionOrder {
  id: string;
  numero: string;
  inspection_id: string | null;
  campaign_id: string | null;
  operateur_id: string;
  operateur_nom: string;
  inspecteurs: string[];
  lieu: string | null;
  objective: string;
  scheduled_at: string;
  duration_days: number;
  status: string;
  qr_code_data: string | null;
  created_by: string;
  created_at: string;
}

export interface InspectionFinding {
  id: string;
  inspection_id: string;
  category: string;
  severity: string;
  description: string;
  evidence_ref: string | null;
  latitude: number | null;
  longitude: number | null;
  due_at: string | null;
  responsible: string | null;
  status: string;
  created_by: string;
  created_at: string;
}

export interface InspectionCorrectiveAction {
  id: string;
  finding_id: string;
  action: string;
  due_at: string | null;
  status: string;
  operator_response: string | null;
  validated_by: string | null;
  validated_at: string | null;
  created_by: string;
  created_at: string;
}

export interface InspectionSanction {
  id: string;
  inspection_id: string;
  sanction_type: string;
  motive: string;
  decision_reference: string | null;
  status: string;
  decided_by: string | null;
  decided_at: string | null;
  created_by: string;
  created_at: string;
}

export interface ComplianceIntelligence {
  generated_at: string;
  inci_national: number;
  operators: Array<{
    operateur_id: string;
    operateur: string;
    province: string;
    secteur: string;
    score: number;
    last_inspection: string;
    critical_findings: number;
    open_actions: number;
    risk_level: string;
  }>;
  by_province: Record<string, number>;
  by_sector: Record<string, number>;
  methodology: Record<string, number>;
}

export const fetchInspectionControlCenter = (): Promise<InspectionControlCenter> =>
  request("/pnpi/inspections/control-center");
export const fetchInspectionMissionOrders = (): Promise<InspectionMissionOrder[]> =>
  request("/pnpi/inspections/mission-orders");
export const fetchComplianceIntelligence = (): Promise<ComplianceIntelligence> =>
  request("/pnpi/inspections/compliance-intelligence");
export const fetchInspectionFindings = (id: string): Promise<InspectionFinding[]> =>
  request(`/pnpi/inspections/${encodeURIComponent(id)}/findings`);
export const fetchInspectionCorrectiveActions = (id: string): Promise<InspectionCorrectiveAction[]> =>
  request(`/pnpi/inspections/${encodeURIComponent(id)}/corrective-actions`);
export const fetchInspectionSanctions = (id: string): Promise<InspectionSanction[]> =>
  request(`/pnpi/inspections/${encodeURIComponent(id)}/sanctions`);

// ---------------------------------------------------------------------------
// Observatoire National de l'Industrie (ONI)
// ---------------------------------------------------------------------------

export interface ONIDeclaration {
  id: string;
  operateur_id: string;
  operateur_nom: string;
  province: string | null;
  ville: string | null;
  period_type: string;
  period: string;
  secteur: string;
  production_volume: number;
  production_unit: string;
  capacity_installed: number;
  capacity_used: number;
  capacity_utilization_pct: number;
  downtime_hours: number;
  jobs_total: number;
  jobs_created: number;
  jobs_lost: number;
  jobs_women: number;
  jobs_youth: number;
  investment_fcfa: number;
  exports_value_fcfa: number;
  imports_value_fcfa: number;
  trade_balance_fcfa: number;
  local_raw_material_pct: number;
  imported_raw_material_pct: number;
  energy_kwh: number;
  stock_raw_material: number;
  stock_finished_goods: number;
  average_price_fcfa: number | null;
  status: string;
  anomaly_flags: Array<{ type: string; severity: string; label: string }>;
  ai_summary: string | null;
  submitted_by: string;
  submitted_at: string | null;
  validated_by: string | null;
  validated_at: string | null;
}

export interface ONIAlert {
  id: string;
  declaration_id: string | null;
  operateur_id: string | null;
  severity: string;
  alert_type: string;
  title: string;
  message: string;
  status: string;
  created_at: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
}

export interface ONIAggregateBucket {
  production: number;
  emplois: number;
  investissement_fcfa: number;
  declarations: number;
}

export interface ONIIndicators {
  generated_at: string;
  declarations_total: number;
  production_total: number;
  jobs_total: number;
  jobs_created: number;
  jobs_lost: number;
  investment_fcfa: number;
  exports_value_fcfa: number;
  imports_value_fcfa: number;
  trade_balance_fcfa: number;
  energy_kwh: number;
  stock_raw_material: number;
  stock_finished_goods: number;
  capacity_utilization_avg: number;
  local_raw_material_pct_avg: number;
  by_sector: Record<string, ONIAggregateBucket>;
  by_province: Record<string, ONIAggregateBucket>;
  by_period: Record<string, ONIAggregateBucket>;
}

export interface ONIInpiOperator {
  operateur_id: string;
  operateur: string;
  secteur: string;
  province: string;
  period: string;
  score: number;
  breakdown: Record<string, number>;
}

export interface ONIInpi {
  generated_at: string;
  inpi_national: number;
  operators: ONIInpiOperator[];
  by_sector: Record<string, number>;
  by_province: Record<string, number>;
  methodology: Record<string, number>;
}

export interface ONICockpit {
  generated_at: string;
  national_control_center: {
    status: string;
    narrative: string;
    priorities: string[];
  };
  indicators: ONIIndicators;
  inpi_national: number;
  alerts: ONIAlert[];
  latest_declarations: ONIDeclaration[];
}

export const fetchONICockpit = (): Promise<ONICockpit> => request("/pnpi/oni/cockpit");
export const fetchONIDeclarations = (): Promise<ONIDeclaration[]> =>
  request("/pnpi/oni/declarations");
export const fetchONIInpi = (): Promise<ONIInpi> => request("/pnpi/oni/inpi");
export const fetchONIReport = (kind = "mensuel"): Promise<Record<string, unknown>> =>
  request(`/pnpi/oni/reports/${encodeURIComponent(kind)}`);

// ---------------------------------------------------------------------------
// Filières industrielles / chaînes de valeur
// ---------------------------------------------------------------------------

export interface FiliereStrategique {
  id: string;
  code: string;
  nom: string;
  description: string | null;
  responsable: string | null;
  statut: string;
  vision: string | null;
  objectifs: string[];
  contraintes: string[];
  opportunites: string[];
  maturite_cible: number;
  created_by: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface FiliereIndicator {
  id: string;
  filiere_id: string;
  code: string;
  libelle: string;
  definition: string | null;
  formule: string | null;
  source: string | null;
  unite: string | null;
  periodicite: string;
  niveau_diffusion: string;
  responsable: string | null;
  valeur_courante: number | null;
  valeur_cible: number | null;
  qualite_donnee: string;
  methode_version: string;
  updated_at: string | null;
}

export interface FiliereAction {
  id: string;
  filiere_id: string;
  intitule: string;
  objectif: string | null;
  responsable: string | null;
  partenaires: string[];
  echeance: string | null;
  statut: string;
  indicateurs: string[];
  risques: string[];
  progression_pct: number;
  created_by: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface FiliereRisk {
  id: string;
  filiere_id: string;
  titre: string;
  categorie: string;
  probabilite: number;
  impact: number;
  criticite: string;
  description: string | null;
  mitigation: string | null;
  statut: string;
  created_by: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface FiliereMaturity {
  score: number;
  cible: number;
  breakdown: Record<string, number>;
}

export interface FiliereSouverainete {
  score: number;
  niveau: string;
  breakdown: Record<string, number>;
}

export interface FiliereRecommendation {
  priorite: string;
  titre: string;
  action: string;
  impact: string;
}

export interface FiliereValueChainStage {
  key: string;
  label: string;
  enjeu: string;
  score: number;
  status: string;
}

export interface FiliereValueChain {
  stages: FiliereValueChainStage[];
  bottlenecks: FiliereValueChainStage[];
  opportunities: string[];
  depth_score: number;
}

export interface FiliereCockpitItem extends FiliereStrategique {
  stats: Record<string, number | string[]>;
  maturite: FiliereMaturity;
  souverainete: FiliereSouverainete;
  chaine_valeur: FiliereValueChain;
  recommendations: FiliereRecommendation[];
  risques_ouverts: number;
  actions_en_cours: number;
}

export interface FiliereCockpit {
  generated_at: string;
  maturite_nationale: number;
  souverainete_nationale: number;
  profondeur_chaine_nationale: number;
  stats: Record<string, number>;
  filieres: FiliereCockpitItem[];
  alertes: FiliereRisk[];
  goulets_chaine: Array<{ filiere: string; key: string; label: string; enjeu: string; score: number; status: string }>;
  opportunites_chaine: Array<{ filiere: string; opportunity: string }>;
  territoires: Array<{ province: string; filieres: number }>;
  lecture_executive: string;
}

export interface FiliereDetail extends FiliereStrategique {
  stats: Record<string, number | string[]>;
  maturite: FiliereMaturity;
  souverainete: FiliereSouverainete;
  chaine_valeur: FiliereValueChain;
  recommendations: FiliereRecommendation[];
  indicators: FiliereIndicator[];
  actions: FiliereAction[];
  risks: FiliereRisk[];
}

export const fetchFilieresCockpit = (): Promise<FiliereCockpit> =>
  request("/pnpi/filieres/cockpit");
export const fetchFilieres = (): Promise<FiliereStrategique[]> => request("/pnpi/filieres");
export const fetchFiliereDetail = (id: string): Promise<FiliereDetail> =>
  request(`/pnpi/filieres/${encodeURIComponent(id)}`);
export const fetchFilieresReport = (): Promise<Record<string, unknown>> =>
  request("/pnpi/filieres/reports/national");

// ---------------------------------------------------------------------------
// Innovation industrielle / Industrie 4.0
// ---------------------------------------------------------------------------

export interface InnovationTechnology {
  id: string;
  code: string;
  nom: string;
  domaine: string;
  description: string | null;
  niveau_maturite: number;
  secteur_application: string | null;
  cout_relatif: string | null;
  complexite: string | null;
  competences_requises: string[];
  infrastructures_requises: string[];
  adoption_nationale_pct: number;
}

export interface InnovationActor {
  id: string;
  nom: string;
  type_organisation: string;
  domaines_expertise: string[];
  capacites_techniques: string[];
  secteurs_couverts: string[];
  equipements_disponibles: string[];
  province: string | null;
  contact: string | null;
  statut: string;
}

export interface InnovationProject {
  id: string;
  titre: string;
  operateur_id: string | null;
  operateur_nom: string | null;
  technologie_id: string | null;
  technologie_nom: string | null;
  filiere_code: string | null;
  description: string | null;
  objectif: string | null;
  niveau_maturite: number;
  budget_fcfa: number;
  partenaires: string[];
  besoins_financement: string | null;
  resultats_attendus: string | null;
  risques: string[];
  statut: string;
}

export interface InnovationCockpit {
  generated_at: string;
  maturite_numerique: {
    score: number;
    niveau: string;
    capacite_utilisee_pct: number;
    breakdown: Record<string, number>;
  };
  diagnostic_industrie40: {
    score: number;
    dimensions: Array<{ key: string; label: string; description: string; score: number; status: string }>;
    competences_critiques: Array<{ competence: string; count: number }>;
    capacites_acteurs: Array<{ capacite: string; count: number }>;
    roadmap: Array<{ phase: string; horizon: string; focus: string; status: string }>;
  };
  portefeuille_rd: {
    status_counts: Array<{ status: string; count: number }>;
    maturity_counts: Array<{ niveau: number; count: number }>;
    by_filiere: Array<{ filiere: string; count: number }>;
    total_budget_fcfa: number;
    protected_candidates: Array<{
      project: string;
      technology: string | null;
      filiere: string | null;
      orientation: string;
    }>;
  };
  stats: Record<string, number>;
  technologies: InnovationTechnology[];
  projects: InnovationProject[];
  actors: InnovationActor[];
  domaines: Array<{ domaine: string; count: number }>;
  secteurs: Array<{ secteur: string; count: number }>;
  territoires: Array<{ province: string; acteurs_et_operateurs: number }>;
  recommendations: Array<{ priorite: string; titre: string; action: string }>;
  institutional_links: Array<{ institution: string; role: string; usage: string; status: string }>;
  lecture_executive: string;
}

export const fetchInnovationCockpit = (): Promise<InnovationCockpit> =>
  request("/pnpi/innovation/cockpit");

// ---------------------------------------------------------------------------
// Capital humain industriel
// ---------------------------------------------------------------------------

export interface CapitalHumainCockpit {
  generated_at: string;
  maturite_capital_humain: {
    score: number;
    niveau: string;
    breakdown: Record<string, number>;
  };
  stats: Record<string, number>;
  secteurs: Array<{
    secteur: string;
    operateurs: number;
    emplois_declares: number;
    pression_competences: number;
  }>;
  territoires: Array<{
    province: string;
    operateurs: number;
    emplois_declares: number;
  }>;
  metiers_en_tension: Array<{
    competence: string;
    occurrences: number;
    niveau_tension: string;
    source: string;
  }>;
  familles_competences: Array<{ famille: string; count: number }>;
  competences_par_technologie: Array<{
    technologie: string;
    secteur: string;
    niveau_maturite: number;
    adoption_pct: number;
    competences: string[];
    familles: string[];
  }>;
  pipeline_emplois: Array<{ stage: string; value: number; description: string }>;
  matrice_formation: Array<{
    famille: string;
    besoin: number;
    offre_identifiee: number;
    gap: number;
    priorite: string;
  }>;
  actions_ministerielles: Array<{
    niveau: string;
    horizon: string;
    action: string;
    responsable: string;
  }>;
  parcours_formation: Array<{
    role: string;
    titre: string;
    modules: string[];
    objectif: string;
  }>;
  recommendations: Array<{
    priorite: string;
    titre: string;
    action: string;
  }>;
  lecture_executive: string;
  source_note: string;
}

export const fetchCapitalHumainCockpit = (): Promise<CapitalHumainCockpit> =>
  request("/pnpi/capital-humain/cockpit");

// ---------------------------------------------------------------------------
// Industrie durable
// ---------------------------------------------------------------------------

export interface DurabiliteCockpit {
  generated_at: string;
  maturite_durable: {
    score: number;
    niveau: string;
    breakdown: Record<string, number>;
  };
  stats: Record<string, number>;
  secteurs: Array<{
    secteur: string;
    atis_approuves: number;
    energie_kwh: number;
    production: number;
    intensite_energie: number;
    co2_estime_tonnes: number;
    matiere_importee_pct: number;
  }>;
  profils_sectoriels: Array<{
    secteur: string;
    priorite: string;
    score_preparation: number;
    pression_carbone: number;
    leviers: string[];
    risques_transition: string[];
  }>;
  territoires: Array<{
    province: string;
    operateurs: number;
    niveau_risque: string;
    risques: string[];
  }>;
  ressources: {
    par_type: Array<{ type: string; count: number }>;
    energie: number;
    matieres: number;
  };
  taxonomie_durable: Array<{
    axe: string;
    couverture: number;
    investissements: number;
    ressources: number;
    statut: string;
  }>;
  opportunites_circularite: Array<{
    operateur: string;
    secteur: string;
    province: string;
    opportunite: string;
    ressources_cibles: string[];
    gain_potentiel: string;
    priorite: string;
  }>;
  securite_ressources: Array<{
    type: string;
    ressources: number;
    dependance_import_pct: number;
    niveau_risque: string;
  }>;
  trajectoire_carbone: Array<{
    horizon: string;
    co2_tonnes: number;
    objectif: string;
  }>;
  actions_ministerielles: Array<{
    chantier: string;
    responsable: string;
    delai: string;
    livrable: string;
  }>;
  alertes: Array<{
    niveau: string;
    titre: string;
    message: string;
  }>;
  recommendations: Array<{
    priorite: string;
    titre: string;
    action: string;
  }>;
  trajectoire: Array<{
    horizon: string;
    objectif: string;
  }>;
  lecture_executive: string;
  source_note: string;
}

export const fetchDurabiliteCockpit = (): Promise<DurabiliteCockpit> =>
  request("/pnpi/durabilite/cockpit");

// ---------------------------------------------------------------------------
// Investissements industriels & zones
// ---------------------------------------------------------------------------

export interface InvestissementsCockpit {
  generated_at: string;
  score_portefeuille: number;
  stats: Record<string, number>;
  statuts: Array<{ statut: string; count: number }>;
  par_annee: Array<{ annee: number; count: number; montant_fcfa: number; emplois_prevus: number }>;
  par_secteur: Array<{ secteur: string; count: number; montant_fcfa: number; emplois_prevus: number }>;
  par_province: Array<{ province: string; count: number; montant_fcfa: number; emplois_prevus: number }>;
  projets: Array<{
    id: string;
    intitule: string;
    operateur: string;
    secteur: string;
    province: string;
    montant_fcfa: number;
    emplois_prevus: number;
    statut: string;
    annee: number | null;
  }>;
  recommendations: string[];
  lecture_executive: string;
}

export interface ZonesCockpit {
  generated_at: string;
  score_zones: number;
  stats: Record<string, number>;
  zones: Array<{
    province: string;
    operateurs: number;
    sites: number;
    superficie_ha: number;
    taux_occupation_proxy: number;
    niveau_priorite: string;
  }>;
  energie_par_secteur: Array<{ secteur: string; energie_kwh: number }>;
  recommendations: string[];
  lecture_executive: string;
}

export const fetchInvestissementsCockpit = (): Promise<InvestissementsCockpit> =>
  request("/pnpi/pilotage-actifs/investissements");
export const fetchZonesCockpit = (): Promise<ZonesCockpit> =>
  request("/pnpi/pilotage-actifs/zones");

// ---------------------------------------------------------------------------
// Gouvernance & qualité des données
// ---------------------------------------------------------------------------

export interface DataQualityCheck {
  name: string;
  description: string;
  score: number;
  status: "ok" | "warning" | "critical" | string;
  domain: string;
  impact: string;
  action: string;
  total: number;
  conformes: number;
}

export interface DataQualityCockpit {
  generated_at: string;
  global_score: number;
  grade: string;
  checks: DataQualityCheck[];
  domains: Array<{ domain: string; score: number; checks: number; status: string }>;
  anomalies: Array<{
    severity: string;
    domain: string;
    title: string;
    detail: string;
    count: number;
    action: string;
  }>;
  priority_actions: Array<{ title: string; domain: string; score: number; action: string }>;
  lineage: Array<{ objet: string; source: string; usage: string }>;
  governance_principles: string[];
  lecture_executive: string;
  stats: Record<string, number>;
}

export const fetchDataQualityCockpit = (): Promise<DataQualityCockpit> =>
  request("/pnpi/dashboard/data-quality");

export interface DocumentsCockpit {
  generated_at: string;
  score_coffre: number;
  grade: string;
  stats: Record<string, number>;
  scores: Array<{ label: string; score: number; status: string; description: string }>;
  par_type: Array<{ type_document: string; count: number }>;
  par_classification: Array<{ classification: string; count: number }>;
  pieces_manquantes: Array<{ type_document: string; count: number }>;
  top_uploadeurs: Array<{ username: string; count: number }>;
  dossiers_prioritaires: Array<{
    ati_id: string;
    numero_ati: string;
    operateur: string;
    statut: string;
    type_demande: string;
    documents: number;
    required: string[];
    missing: string[];
    preuve_verrouillee: boolean;
  }>;
  anomalies: Array<{ severity: string; title: string; count: number; detail: string; action: string }>;
  principes: string[];
  lecture_executive: string;
}

export const fetchDocumentsCockpit = (): Promise<DocumentsCockpit> =>
  request("/pnpi/documents/cockpit");

export interface OperationsCockpit {
  generated_at: string;
  score_exploitation: number;
  grade: string;
  environment: string;
  version: string;
  stats: Record<string, number>;
  components: Array<{ key: string; label: string; score: number; status: string; detail: string }>;
  alerts: Array<{ severity: string; title: string; detail: string; action: string }>;
  runbooks: Array<{ title: string; steps: string[] }>;
  change_pipeline: Array<{ stage: string; owner: string; status: string }>;
  principes: string[];
  lecture_executive: string;
}

export const fetchOperationsCockpit = (): Promise<OperationsCockpit> =>
  request("/admin/operations/cockpit");

export interface InteroperabiliteCockpit {
  generated_at: string;
  score_interoperabilite: number;
  grade: string;
  stats: Record<string, number>;
  partners: Array<{
    code: string;
    name: string;
    type: string;
    mode: string;
    purpose: string;
    endpoints: string[];
    status: string;
    configured: boolean;
    data_sensitivity: string;
    legal_basis: string;
    data_domains: string[];
    allowed_scopes: string[];
    owner: string;
    readiness_score: number;
    blockers: string[];
    next_step: string;
  }>;
  api_catalog: Array<{
    domain: string;
    endpoint: string;
    consumers: string[];
    security: string;
    data_shared: string[];
  }>;
  exchange_flow: Array<{ step: string; detail: string }>;
  maturity_matrix: Array<{ dimension: string; label: string; score: number; poids: number; statut: string }>;
  risk_register: Array<{ risque: string; niveau: string; mesure: string }>;
  roadmap: Array<{ horizon: string; objectif: string; livrable: string }>;
  missing_conventions: string[];
  events_by_action: Array<{ action: string; count: number }>;
  recent_exchanges: Array<{ id: string; timestamp: string; actor: string; action: string; target: string | null }>;
  governance_rules: string[];
  priority_actions: string[];
  lecture_executive: string;
}

export const fetchInteroperabiliteCockpit = (): Promise<InteroperabiliteCockpit> =>
  request("/integration-health/cockpit");

export interface GeoCockpit {
  generated_at: string;
  score_sig: number;
  grade: string;
  stats: Record<string, number>;
  provinces: Array<{
    province: string;
    label: string;
    centroid: { lat: number; lng: number };
    operateurs: number;
    operateurs_geocodes: number;
    taux_geocodage: number;
    atis: number;
    atis_approuves: number;
    inspections: number;
    non_conformites: number;
    taux_non_conformite: number;
    sites: number;
    superficie_ha: number;
    investissements_fcfa: number;
    production_declaree: number;
    gap_inspection: number;
    pression_industrielle: number;
    priorite: string;
  }>;
  clusters: Array<{ province: string; label: string; lat: number; lng: number; weight: number; risk: number }>;
  layers: Array<{ name: string; status: string; source: string; count: number }>;
  exports: Array<{ label: string; href: string }>;
  priority_actions: string[];
  lecture_executive: string;
}

export const fetchGeoCockpit = (): Promise<GeoCockpit> => request("/geo/cockpit");

export interface AnalyticsCockpit {
  generated_at: string;
  score_analytique: number;
  grade: string;
  stats: Record<string, number>;
  scores: Array<{ label: string; score: number; status: string }>;
  data_sources: Array<{ name: string; records: number; freshness: string; usage: string }>;
  analytics_layers: Array<{ layer: string; status: string; score: number; detail: string }>;
  insight_cards: Array<{ title: string; value: string; tone: string; detail: string }>;
  top_sectors: Array<{
    secteur: string;
    score: number;
    operateurs: number;
    atis: number;
    approuves: number;
    production: number;
    investissement_fcfa: number;
  }>;
  top_provinces: Array<{ province: string; operateurs: number; atis: number; inspections: number; score: number }>;
  monthly_trend: Array<{ month: string; count: number }>;
  decision_questions: string[];
  recommendations: string[];
  lecture_executive: string;
}

export const fetchAnalyticsCockpit = (): Promise<AnalyticsCockpit> =>
  request("/pnpi/dashboard/analytics-cockpit");

export interface PortalCockpit {
  generated_at: string;
  score_portail: number;
  grade: string;
  stats: Record<string, number>;
  role_counts: Array<{ role: string; users: number }>;
  role_journeys: Array<{
    role: string;
    entry: string;
    mission: string;
    coverage: number;
    highlights: string[];
  }>;
  ux_capabilities: Array<{ name: string; score: number; status: string; detail: string }>;
  channels: Array<{ channel: string; status: string; usage: string }>;
  institutional_routes: Array<{ label: string; href: string; audience: string }>;
  recommendations: string[];
  lecture_executive: string;
}

export const fetchPortalCockpit = (): Promise<PortalCockpit> =>
  request("/pnpi/dashboard/portal-cockpit");

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

export const fetchPNPIAlerts = (): Promise<PNPIAlert[]> => request("/pnpi/alerts");

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

export const fetchPNPIHistorique = (params?: {
  changed_by?: string;
  limit?: number;
  date_from?: string;
  date_to?: string;
  ati_numero?: string;
}): Promise<PNPIHistoriqueEntry[]> => {
  const qs = new URLSearchParams();
  if (params?.changed_by) qs.set("changed_by", params.changed_by);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.date_from) qs.set("date_from", params.date_from);
  if (params?.date_to) qs.set("date_to", params.date_to);
  if (params?.ati_numero) qs.set("ati_numero", params.ati_numero);
  const q = qs.toString();
  return request(`/pnpi/historique${q ? "?" + q : ""}`);
};
