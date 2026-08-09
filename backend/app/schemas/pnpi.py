"""PNPI · Schemas Pydantic pour la plateforme industrielle gabonaise."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

# ---------------------------------------------------------------------------
# Operateurs industriels
# ---------------------------------------------------------------------------


class OperateurCreate(BaseModel):
    nif_gabon: str = Field(..., examples=["GA-NIF-2024-00123"])
    raison_sociale: str = Field(..., examples=["Societe Gabonaise de Transformation du Bois"])
    secteur: str = Field(..., examples=["bois"])
    province: str = Field(..., examples=["estuaire"])
    ville: str = Field(..., examples=["Libreville"])
    latitude: float | None = Field(None, examples=[0.3924])
    longitude: float | None = Field(None, examples=[9.4536])
    contact_email: str | None = Field(None, examples=["contact@sgtb-gabon.ga"])
    contact_telephone: str | None = Field(None, examples=["+241 01 23 45 67"])
    effectif_declare: int | None = Field(None, examples=[150])
    is_active: bool = True


class OperateurRead(BaseModel):
    id: str
    nif_gabon: str
    raison_sociale: str
    secteur: str
    province: str
    ville: str
    latitude: float | None = None
    longitude: float | None = None
    contact_email: str | None = None
    contact_telephone: str | None = None
    effectif_declare: int | None = None
    is_active: bool
    created_at: datetime
    created_by: str | None = None

    model_config = ConfigDict(from_attributes=True)


class OperateurBrief(BaseModel):
    id: str
    nif_gabon: str
    raison_sociale: str
    secteur: str
    province: str
    ville: str
    is_active: bool
    effectif_declare: int | None = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# ATI (Agrement Technique Industriel)
# ---------------------------------------------------------------------------


class ATICreate(BaseModel):
    operateur_id: str = Field(..., examples=["op-abc123"])
    type_demande: str = Field("creation", examples=["creation", "renouvellement", "extension"])
    type_activite: str = Field(..., examples=["Scierie et transformation premiere du bois"])
    secteur: str = Field(..., examples=["bois"])
    priorite: str = Field("normale", examples=["normale", "haute", "urgente"])
    sla_jours: int = Field(30, examples=[30, 21, 45])
    observations: str | None = Field(None, examples=["Premiere demande d'agrement"])
    instructeur_username: str | None = Field(None, examples=["instructeur1"])


class ATIRead(BaseModel):
    id: str
    numero_ati: str
    operateur_id: str
    type_demande: str = "creation"
    type_activite: str
    secteur: str
    statut: str
    etape: str
    priorite: str
    payment_status: str = "prototype"
    payment_reference: str | None = None
    instructeur_username: str | None = None
    date_soumission: datetime
    date_decision: datetime | None = None
    date_expiration: datetime | None = None
    sla_jours: int
    qr_code_data: str | None = None
    motif_rejet: str | None = None
    numero_reference_decision: str | None = None
    observations: str | None = None
    created_by: str | None = None
    updated_at: datetime
    age_jours: int
    is_overdue: bool

    model_config = ConfigDict(from_attributes=True)


class ATIBrief(BaseModel):
    id: str
    operateur_id: str
    numero_ati: str
    type_demande: str = "creation"
    type_activite: str
    secteur: str
    statut: str
    etape: str
    priorite: str
    payment_status: str = "prototype"
    payment_reference: str | None = None
    instructeur_username: str | None = None
    date_soumission: datetime
    age_jours: int
    is_overdue: bool

    model_config = ConfigDict(from_attributes=True)


class ATIStatusUpdate(BaseModel):
    new_statut: str | None = None
    new_etape: str | None = None
    note: str = ""
    motif_rejet: str | None = None
    numero_reference_decision: str | None = None
    instructeur_username: str | None = None


class ATITransitionRead(BaseModel):
    id: str
    ati_id: str
    changed_by: str
    previous_statut: str | None = None
    new_statut: str | None = None
    previous_etape: str | None = None
    new_etape: str | None = None
    note: str
    changed_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Inspections de conformite
# ---------------------------------------------------------------------------


class InspectionCreate(BaseModel):
    operateur_id: str
    ati_id: str | None = None
    date_inspection: datetime
    statut_conformite: str  # conforme, non_conforme, partiel
    observations: str
    mesures_correctives: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class InspectionRead(BaseModel):
    id: str
    operateur_id: str
    operateur_nom: str = ""
    ati_id: str | None = None
    ati_numero: str | None = None
    mission_order_id: str | None = None
    campaign_id: str | None = None
    inspecteur_username: str
    inspecteur_nom: str = ""
    date_inspection: datetime
    workflow_status: str = "rapport"
    statut_conformite: str
    score_conformite: int | None = None
    observations: str
    mesures_correctives: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    province: str = ""
    secteur: str = ""
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ATITechnicalOpinionCreate(BaseModel):
    direction: str = Field(..., examples=["Direction de la Normalisation"])
    due_at: datetime | None = None
    motivation: str | None = Field(None, examples=["Avis requis sur la certification produit."])


class ATITechnicalOpinionUpdate(BaseModel):
    status: str = Field(..., examples=["favorable", "reserve", "defavorable"])
    motivation: str | None = None


class ATITechnicalOpinionRead(BaseModel):
    id: str
    ati_id: str
    direction: str
    requested_by: str
    requested_at: datetime
    due_at: datetime | None = None
    status: str
    motivation: str | None = None
    signed_by: str | None = None
    signed_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ATIComplementRequestCreate(BaseModel):
    motif: str = Field(..., examples=["Le plan du site transmis est illisible."])
    requested_documents: list[str] = Field(default_factory=list, examples=[["plan_site", "certification"]])
    due_at: datetime | None = None


class ATIComplementResponse(BaseModel):
    response_note: str = Field(..., examples=["Les pieces demandees ont ete ajoutees au dossier."])


class ATIComplementRequestRead(BaseModel):
    id: str
    ati_id: str
    requested_by: str
    requested_at: datetime
    due_at: datetime | None = None
    status: str
    motif: str
    requested_documents: list[str] = Field(default_factory=list)
    response_note: str | None = None
    responded_by: str | None = None
    responded_at: datetime | None = None


class ATIBusinessRuleCreate(BaseModel):
    rule_type: str = Field(..., examples=["documents_requis"])
    demande_type: str | None = Field(None, examples=["creation"])
    secteur: str | None = Field(None, examples=["bois"])
    label: str = Field(..., examples=["Pieces creation ATI bois"])
    config: dict = Field(..., examples=[{"documents": ["statuts", "bilan", "plan_site", "certification"]}])
    is_active: bool = True


class ATIBusinessRuleUpdate(BaseModel):
    label: str | None = None
    config: dict | None = None
    is_active: bool | None = None


class ATIBusinessRuleRead(BaseModel):
    id: str
    rule_type: str
    demande_type: str | None = None
    secteur: str | None = None
    label: str
    config: dict
    is_active: bool
    updated_by: str | None = None
    updated_at: datetime | None = None


# ---------------------------------------------------------------------------
# RIN · Referentiel Industriel National
# ---------------------------------------------------------------------------


class RINRepresentantCreate(BaseModel):
    nom_complet: str = Field(..., examples=["Marie MBOUMBA"])
    fonction: str = Field(..., examples=["Directrice industrielle"])
    email: str | None = Field(None, examples=["direction@example.ga"])
    telephone: str | None = Field(None, examples=["+241 77 00 00 00"])
    est_contact_principal: bool = False


class RINRepresentantUpdate(BaseModel):
    nom_complet: str | None = None
    fonction: str | None = None
    email: str | None = None
    telephone: str | None = None
    est_contact_principal: bool | None = None


class RINRepresentantRead(RINRepresentantCreate):
    id: str
    operateur_id: str
    created_at: datetime
    created_by: str | None = None
    statut_validation: str = "brouillon"
    updated_at: datetime | None = None
    validated_by: str | None = None
    validated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class RINSiteCreate(BaseModel):
    nom_site: str = Field(..., examples=["Usine principale de Nkok"])
    type_site: str = Field("usine", examples=["usine", "entrepot", "carriere"])
    province: str = Field(..., examples=["estuaire"])
    ville: str = Field(..., examples=["Nkok"])
    adresse: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    superficie_ha: float | None = None
    statut: str = Field("actif", examples=["actif", "en_construction", "suspendu"])


class RINSiteUpdate(BaseModel):
    nom_site: str | None = None
    type_site: str | None = None
    province: str | None = None
    ville: str | None = None
    adresse: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    superficie_ha: float | None = None
    statut: str | None = None


class RINSiteRead(RINSiteCreate):
    id: str
    operateur_id: str
    created_at: datetime
    created_by: str | None = None
    statut_validation: str = "brouillon"
    updated_at: datetime | None = None
    validated_by: str | None = None
    validated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class RINProduitCreate(BaseModel):
    nom_produit: str = Field(..., examples=["Contreplaqué okoumé"])
    categorie: str = Field(..., examples=["Bois transformé"])
    unite: str = Field("tonne", examples=["tonne", "m3", "unite"])
    capacite_annuelle: float | None = Field(None, examples=[12000])
    production_annuelle: float | None = Field(None, examples=[8400])
    marche_cible: str | None = Field(None, examples=["local_export"])
    certification: str | None = Field(None, examples=["FSC"])


class RINProduitUpdate(BaseModel):
    nom_produit: str | None = None
    categorie: str | None = None
    unite: str | None = None
    capacite_annuelle: float | None = None
    production_annuelle: float | None = None
    marche_cible: str | None = None
    certification: str | None = None


class RINProduitRead(RINProduitCreate):
    id: str
    operateur_id: str
    created_at: datetime
    created_by: str | None = None
    statut_validation: str = "brouillon"
    updated_at: datetime | None = None
    validated_by: str | None = None
    validated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class RINRessourceCreate(BaseModel):
    type_ressource: str = Field(..., examples=["matiere_premiere", "energie"])
    libelle: str = Field(..., examples=["Grumes okoumé"])
    origine: str | None = Field(None, examples=["Gabon"])
    consommation_annuelle: float | None = Field(None, examples=[15000])
    unite: str | None = Field(None, examples=["m3"])
    dependance_import: bool = False


class RINRessourceUpdate(BaseModel):
    type_ressource: str | None = None
    libelle: str | None = None
    origine: str | None = None
    consommation_annuelle: float | None = None
    unite: str | None = None
    dependance_import: bool | None = None


class RINRessourceRead(RINRessourceCreate):
    id: str
    operateur_id: str
    created_at: datetime
    created_by: str | None = None
    statut_validation: str = "brouillon"
    updated_at: datetime | None = None
    validated_by: str | None = None
    validated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class RINInvestissementCreate(BaseModel):
    intitule: str = Field(..., examples=["Extension ligne de transformation"])
    montant_fcfa: int | None = Field(None, examples=[2500000000])
    statut: str = Field("planifie", examples=["planifie", "en_cours", "realise"])
    annee: int | None = Field(None, examples=[2026])
    emplois_prevus: int | None = Field(None, examples=[120])
    description: str | None = None


class RINInvestissementUpdate(BaseModel):
    intitule: str | None = None
    montant_fcfa: int | None = None
    statut: str | None = None
    annee: int | None = None
    emplois_prevus: int | None = None
    description: str | None = None


class RINInvestissementRead(RINInvestissementCreate):
    id: str
    operateur_id: str
    created_at: datetime
    created_by: str | None = None
    statut_validation: str = "brouillon"
    updated_at: datetime | None = None
    validated_by: str | None = None
    validated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class RINProfileRead(BaseModel):
    operateur_id: str
    score_structuration: int
    representants: list[RINRepresentantRead]
    sites: list[RINSiteRead]
    produits: list[RINProduitRead]
    ressources: list[RINRessourceRead]
    investissements: list[RINInvestissementRead]
    manques: list[str]
    workflow_counts: dict[str, int] = Field(default_factory=dict)


class RINTransitionUpdate(BaseModel):
    statut_validation: str = Field(..., examples=["soumis", "verifie", "valide", "archive"])
    note: str | None = None


# ---------------------------------------------------------------------------
# Dashboard KPIs
# ---------------------------------------------------------------------------


class PNPIDashboardKpis(BaseModel):
    atis_total: int
    atis_en_cours: int
    atis_approuves_ce_mois: int
    atis_en_retard: int
    delai_moyen_jours: float
    taux_sla_pct: float
    operateurs_actifs: int
    taux_conformite_pct: float
    generated_at: datetime


class OperateurGeoPoint(BaseModel):
    id: str
    raison_sociale: str
    secteur: str
    province: str
    latitude: float
    longitude: float
    nb_atis_actifs: int
    statut_dernier_ati: str | None = None


class SecteurStats(BaseModel):
    secteur: str
    nb_operateurs: int
    nb_atis_total: int
    nb_atis_approuves: int
    taux_approbation_pct: float
    emplois_declares: int


class ProvinceStats(BaseModel):
    province: str
    nb_operateurs: int
    nb_atis_actifs: int


class ATIPipelineStats(BaseModel):
    soumis: int
    en_instruction: int
    en_validation: int
    approuve: int
    rejete: int
    expire: int


class MensuelStats(BaseModel):
    mois: str
    nb_soumis: int
    nb_approuves: int
    nb_rejetes: int


class ATIResume(BaseModel):
    id: str
    numero_ati: str
    raison_sociale: str
    secteur: str
    province: str
    statut: str
    priorite: str
    etape: str
    date_soumission: datetime
    age_jours: int
    is_overdue: bool
