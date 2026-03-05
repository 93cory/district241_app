"""PNPI — Schemas Pydantic pour la plateforme industrielle gabonaise."""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Operateurs industriels
# ---------------------------------------------------------------------------

class OperateurCreate(BaseModel):
    nif_gabon: str
    raison_sociale: str
    secteur: str
    province: str
    ville: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contact_email: Optional[str] = None
    contact_telephone: Optional[str] = None
    effectif_declare: Optional[int] = None
    is_active: bool = True


class OperateurRead(BaseModel):
    id: str
    nif_gabon: str
    raison_sociale: str
    secteur: str
    province: str
    ville: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contact_email: Optional[str] = None
    contact_telephone: Optional[str] = None
    effectif_declare: Optional[int] = None
    is_active: bool
    created_at: datetime
    created_by: Optional[str] = None

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
    effectif_declare: Optional[int] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# ATI (Agrement Technique Industriel)
# ---------------------------------------------------------------------------

class ATICreate(BaseModel):
    operateur_id: str
    type_activite: str
    secteur: str
    priorite: str = "normale"
    sla_jours: int = 30
    observations: Optional[str] = None
    instructeur_username: Optional[str] = None


class ATIRead(BaseModel):
    id: str
    numero_ati: str
    operateur_id: str
    type_activite: str
    secteur: str
    statut: str
    etape: str
    priorite: str
    instructeur_username: Optional[str] = None
    date_soumission: datetime
    date_decision: Optional[datetime] = None
    date_expiration: Optional[datetime] = None
    sla_jours: int
    qr_code_data: Optional[str] = None
    motif_rejet: Optional[str] = None
    numero_reference_decision: Optional[str] = None
    observations: Optional[str] = None
    created_by: Optional[str] = None
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
    instructeur_username: Optional[str] = None
    date_soumission: datetime
    age_jours: int
    is_overdue: bool

    class Config:
        from_attributes = True


class ATIStatusUpdate(BaseModel):
    new_statut: Optional[str] = None
    new_etape: Optional[str] = None
    note: str = ""
    motif_rejet: Optional[str] = None
    numero_reference_decision: Optional[str] = None
    instructeur_username: Optional[str] = None


class ATITransitionRead(BaseModel):
    id: str
    ati_id: str
    changed_by: str
    previous_statut: Optional[str] = None
    new_statut: Optional[str] = None
    previous_etape: Optional[str] = None
    new_etape: Optional[str] = None
    note: str
    changed_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Inspections de conformite
# ---------------------------------------------------------------------------

class InspectionCreate(BaseModel):
    operateur_id: str
    ati_id: Optional[str] = None
    date_inspection: datetime
    statut_conformite: str  # conforme, non_conforme, partiel
    observations: str
    mesures_correctives: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class InspectionRead(BaseModel):
    id: str
    operateur_id: str
    operateur_nom: str = ""
    ati_id: Optional[str] = None
    ati_numero: Optional[str] = None
    inspecteur_username: str
    inspecteur_nom: str = ""
    date_inspection: datetime
    statut_conformite: str
    observations: str
    mesures_correctives: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
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
    statut_dernier_ati: Optional[str] = None


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
