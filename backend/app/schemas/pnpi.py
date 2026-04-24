"""PNPI · Schemas Pydantic pour la plateforme industrielle gabonaise."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

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

    class Config:
        from_attributes = True


class OperateurBrief(BaseModel):
    id: str
    nif_gabon: str
    raison_sociale: str
    secteur: str
    province: str
    ville: str
    is_active: bool
    effectif_declare: int | None = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# ATI (Agrement Technique Industriel)
# ---------------------------------------------------------------------------


class ATICreate(BaseModel):
    operateur_id: str = Field(..., examples=["op-abc123"])
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
    type_activite: str
    secteur: str
    statut: str
    etape: str
    priorite: str
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

    class Config:
        from_attributes = True


class ATIBrief(BaseModel):
    id: str
    numero_ati: str
    type_activite: str
    secteur: str
    statut: str
    etape: str
    priorite: str
    instructeur_username: str | None = None
    date_soumission: datetime
    age_jours: int
    is_overdue: bool

    class Config:
        from_attributes = True


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

    class Config:
        from_attributes = True


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
    inspecteur_username: str
    inspecteur_nom: str = ""
    date_inspection: datetime
    statut_conformite: str
    observations: str
    mesures_correctives: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    province: str = ""
    secteur: str = ""
    created_at: datetime

    class Config:
        from_attributes = True


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
