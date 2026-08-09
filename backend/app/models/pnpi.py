"""PNPI · Modeles de donnees specifiques a la plateforme industrielle gabonaise."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

SECTEURS_GABON = ["bois", "mines", "agroalimentaire", "btp", "petrole", "services", "autre"]
PROVINCES_GABON = [
    "estuaire",
    "haut_ogooue",
    "moyen_ogooue",
    "ngounie",
    "nyanga",
    "ogooue_ivindo",
    "ogooue_lolo",
    "ogooue_maritime",
    "woleu_ntem",
]

ATI_STATUTS = ["soumis", "en_instruction", "en_validation", "approuve", "rejete", "expire"]
ATI_ETAPES = ["reception", "instruction", "validation", "decision"]


class OperateurIndustrielORM(Base):
    __tablename__ = "operateurs_industriels"

    id: Mapped[str] = mapped_column(String(24), primary_key=True)
    nif_gabon: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    # Colonne chiffree at-rest (Fernet). Voir `app.core.encryption`.
    # Lecture / ecriture passent par la property `nif` (lazy fallback sur nif_gabon).
    nif_gabon_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Empreinte deterministe (HMAC) pour recherche exacte / unicite sans lire
    # le clair (le ciphertext Fernet n'est pas comparable en SQL). NULL
    # autorise plusieurs fois (contrainte UNIQUE Postgres ignore les NULL).
    nif_gabon_hash: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True, index=True)
    raison_sociale: Mapped[str] = mapped_column(String(300), nullable=False)
    secteur: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    province: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    ville: Mapped[str] = mapped_column(String(100), nullable=False)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(200), nullable=True)
    contact_telephone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    effectif_declare: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    created_by: Mapped[str | None] = mapped_column(String(80), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    @property
    def nif(self) -> str | None:
        """NIF en clair : dechiffre `nif_gabon_encrypted` si present, sinon fallback `nif_gabon`.

        Pendant la phase de migration, les nouvelles lignes auront les deux
        colonnes synchronisees (cf `set_nif`). Les anciennes n'ont que
        `nif_gabon` en clair.
        """
        from ..core.encryption import decrypt_str

        if self.nif_gabon_encrypted:
            decrypted = decrypt_str(self.nif_gabon_encrypted)
            if decrypted is not None:
                return decrypted
        return self.nif_gabon

    def set_nif(self, value: str | None) -> None:
        """Setter unifie : chiffre dans `nif_gabon_encrypted`, calcule
        l'empreinte de recherche dans `nif_gabon_hash`, ET ecrit `nif_gabon`
        en clair tant que la migration n'est pas finalisee (cf
        `docs/audit-deep/db-integrity.md`).

        A utiliser systematiquement a la creation/mise a jour d'un operateur
        — ne jamais assigner `nif_gabon=` directement, sinon le chiffrement
        et l'empreinte ne sont pas calcules pour cette ligne.

        Une migration future supprimera/masquera la colonne en clair une
        fois 100% des lignes migrees (cf `scripts/encrypt_existing_nifs.py`).
        """
        from ..core.encryption import encrypt_str, hash_for_lookup

        if value is None:
            self.nif_gabon = ""  # NOT NULL contrainte legacy
            self.nif_gabon_encrypted = None
            self.nif_gabon_hash = None
            return
        self.nif_gabon = value
        self.nif_gabon_encrypted = encrypt_str(value)
        self.nif_gabon_hash = hash_for_lookup(value)

    agrements: Mapped[list[AgrementTechniqueIndustrielORM]] = relationship(
        back_populates="operateur",
        cascade="all, delete-orphan",
        lazy="select",
    )
    inspections: Mapped[list[InspectionConformiteORM]] = relationship(
        back_populates="operateur",
        cascade="all, delete-orphan",
        lazy="select",
    )


class AgrementTechniqueIndustrielORM(Base):
    __tablename__ = "agrements_ati"

    id: Mapped[str] = mapped_column(String(24), primary_key=True)
    numero_ati: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    operateur_id: Mapped[str] = mapped_column(ForeignKey("operateurs_industriels.id"), nullable=False, index=True)
    type_demande: Mapped[str] = mapped_column(String(30), nullable=False, default="creation", server_default="creation")
    type_activite: Mapped[str] = mapped_column(String(300), nullable=False)
    secteur: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    statut: Mapped[str] = mapped_column(String(30), nullable=False, default="soumis", index=True)
    etape: Mapped[str] = mapped_column(String(30), nullable=False, default="reception")
    priorite: Mapped[str] = mapped_column(String(20), nullable=False, default="normale")
    payment_status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="prototype", server_default="prototype"
    )
    payment_reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    instructeur_username: Mapped[str | None] = mapped_column(String(80), nullable=True)
    date_soumission: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    date_decision: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    date_expiration: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    sla_jours: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    qr_code_data: Mapped[str | None] = mapped_column(String(500), nullable=True)
    motif_rejet: Mapped[str | None] = mapped_column(String(800), nullable=True)
    numero_reference_decision: Mapped[str | None] = mapped_column(String(100), nullable=True)
    observations: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(80), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    operateur: Mapped[OperateurIndustrielORM] = relationship(back_populates="agrements", lazy="joined")
    transitions: Mapped[list[ATITransitionORM]] = relationship(
        back_populates="ati",
        cascade="all, delete-orphan",
        lazy="select",
    )


class ATITransitionORM(Base):
    __tablename__ = "ati_transitions"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    ati_id: Mapped[str] = mapped_column(ForeignKey("agrements_ati.id"), nullable=False, index=True)
    changed_by: Mapped[str] = mapped_column(String(80), nullable=False)
    previous_statut: Mapped[str | None] = mapped_column(String(30), nullable=True)
    new_statut: Mapped[str | None] = mapped_column(String(30), nullable=True)
    previous_etape: Mapped[str | None] = mapped_column(String(30), nullable=True)
    new_etape: Mapped[str | None] = mapped_column(String(30), nullable=True)
    note: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    ati: Mapped[AgrementTechniqueIndustrielORM] = relationship(back_populates="transitions")


class InspectionConformiteORM(Base):
    __tablename__ = "inspections_conformite"

    id: Mapped[str] = mapped_column(String(24), primary_key=True)
    operateur_id: Mapped[str] = mapped_column(ForeignKey("operateurs_industriels.id"), nullable=False, index=True)
    ati_id: Mapped[str | None] = mapped_column(ForeignKey("agrements_ati.id"), nullable=True)
    mission_order_id: Mapped[str | None] = mapped_column(String(40), nullable=True, index=True)
    campaign_id: Mapped[str | None] = mapped_column(String(40), nullable=True, index=True)
    inspecteur_username: Mapped[str] = mapped_column(String(80), nullable=False)
    date_inspection: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    workflow_status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="rapport", server_default="rapport", index=True
    )
    statut_conformite: Mapped[str] = mapped_column(String(20), nullable=False)
    score_conformite: Mapped[int | None] = mapped_column(Integer, nullable=True)
    observations: Mapped[str] = mapped_column(Text, nullable=False)
    mesures_correctives: Mapped[str | None] = mapped_column(Text, nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    operateur: Mapped[OperateurIndustrielORM] = relationship(back_populates="inspections", lazy="joined")


class InspectionPhotoORM(Base):
    __tablename__ = "inspection_photos"

    id: Mapped[str] = mapped_column(String(24), primary_key=True)
    inspection_id: Mapped[str] = mapped_column(ForeignKey("inspections_conformite.id"), nullable=False, index=True)
    nom_fichier: Mapped[str] = mapped_column(String(255), nullable=False)
    chemin_stockage: Mapped[str] = mapped_column(String(512), nullable=False)
    taille_octets: Mapped[int] = mapped_column(nullable=False)
    description: Mapped[str | None] = mapped_column(String(300), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    captured_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    uploaded_by: Mapped[str] = mapped_column(String(80), nullable=False)


class InspectionAnnualPlanORM(Base):
    __tablename__ = "inspection_annual_plans"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    secteur: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    province: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    target_count: Mapped[int] = mapped_column(Integer, nullable=False)
    direction: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_by: Mapped[str] = mapped_column(String(80), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class InspectionCampaignORM(Base):
    __tablename__ = "inspection_campaigns"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    title: Mapped[str] = mapped_column(String(220), nullable=False)
    objective: Mapped[str] = mapped_column(Text, nullable=False)
    secteur: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    provinces: Mapped[str | None] = mapped_column(Text, nullable=True)
    criteria: Mapped[str | None] = mapped_column(Text, nullable=True)
    responsible_team: Mapped[str | None] = mapped_column(String(180), nullable=True)
    start_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    end_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="planifiee", server_default="planifiee")
    created_by: Mapped[str] = mapped_column(String(80), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class InspectionMissionOrderORM(Base):
    __tablename__ = "inspection_mission_orders"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    numero: Mapped[str] = mapped_column(String(60), nullable=False, unique=True, index=True)
    inspection_id: Mapped[str | None] = mapped_column(String(24), nullable=True, index=True)
    campaign_id: Mapped[str | None] = mapped_column(String(40), nullable=True, index=True)
    operateur_id: Mapped[str] = mapped_column(ForeignKey("operateurs_industriels.id"), nullable=False, index=True)
    inspecteurs: Mapped[str] = mapped_column(Text, nullable=False)
    lieu: Mapped[str | None] = mapped_column(String(220), nullable=True)
    objective: Mapped[str] = mapped_column(Text, nullable=False)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    duration_days: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="planifie", server_default="planifie")
    qr_code_data: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_by: Mapped[str] = mapped_column(String(80), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class InspectionChecklistTemplateORM(Base):
    __tablename__ = "inspection_checklist_templates"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    secteur: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    items: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=text("true"))
    updated_by: Mapped[str | None] = mapped_column(String(80), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class InspectionFindingORM(Base):
    __tablename__ = "inspection_findings"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    inspection_id: Mapped[str] = mapped_column(ForeignKey("inspections_conformite.id"), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    severity: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_ref: Mapped[str | None] = mapped_column(String(120), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    responsible: Mapped[str | None] = mapped_column(String(120), nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="ouverte", server_default="ouverte")
    created_by: Mapped[str] = mapped_column(String(80), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class InspectionCorrectiveActionORM(Base):
    __tablename__ = "inspection_corrective_actions"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    finding_id: Mapped[str] = mapped_column(ForeignKey("inspection_findings.id"), nullable=False, index=True)
    action: Mapped[str] = mapped_column(Text, nullable=False)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="a_faire", server_default="a_faire", index=True
    )
    operator_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    validated_by: Mapped[str | None] = mapped_column(String(80), nullable=True)
    validated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[str] = mapped_column(String(80), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class InspectionSanctionORM(Base):
    __tablename__ = "inspection_sanctions"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    inspection_id: Mapped[str] = mapped_column(ForeignKey("inspections_conformite.id"), nullable=False, index=True)
    sanction_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    motive: Mapped[str] = mapped_column(Text, nullable=False)
    decision_reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="proposee", server_default="proposee")
    decided_by: Mapped[str | None] = mapped_column(String(80), nullable=True)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[str] = mapped_column(String(80), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class ONIPeriodicDeclarationORM(Base):
    __tablename__ = "oni_periodic_declarations"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    operateur_id: Mapped[str] = mapped_column(ForeignKey("operateurs_industriels.id"), nullable=False, index=True)
    period_type: Mapped[str] = mapped_column(String(20), nullable=False, default="mensuel", server_default="mensuel")
    period: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    secteur: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    production_volume: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    production_unit: Mapped[str] = mapped_column(String(30), nullable=False, default="tonnes", server_default="tonnes")
    capacity_installed: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    capacity_used: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    downtime_hours: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    jobs_total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    jobs_created: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    jobs_lost: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    jobs_women: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    jobs_youth: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    investment_fcfa: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    exports_value_fcfa: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    imports_value_fcfa: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    local_raw_material_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    imported_raw_material_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    energy_kwh: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    stock_raw_material: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    stock_finished_goods: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    average_price_fcfa: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="soumise", server_default="soumise", index=True
    )
    anomaly_flags: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    submitted_by: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    validated_by: Mapped[str | None] = mapped_column(String(80), nullable=True)
    validated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    operateur: Mapped[OperateurIndustrielORM] = relationship(lazy="joined")


class ONIAlertORM(Base):
    __tablename__ = "oni_alerts"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    declaration_id: Mapped[str | None] = mapped_column(String(40), nullable=True, index=True)
    operateur_id: Mapped[str | None] = mapped_column(String(24), nullable=True, index=True)
    severity: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    alert_type: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(220), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="ouverte", server_default="ouverte")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    resolved_by: Mapped[str | None] = mapped_column(String(80), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class RINRepresentantORM(Base):
    __tablename__ = "rin_representants"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    operateur_id: Mapped[str] = mapped_column(ForeignKey("operateurs_industriels.id"), nullable=False, index=True)
    nom_complet: Mapped[str] = mapped_column(String(200), nullable=False)
    fonction: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str | None] = mapped_column(String(200), nullable=True)
    telephone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    est_contact_principal: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    created_by: Mapped[str | None] = mapped_column(String(80), nullable=True)
    statut_validation: Mapped[str] = mapped_column(String(30), nullable=False, server_default="brouillon")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    validated_by: Mapped[str | None] = mapped_column(String(80), nullable=True)
    validated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class RINSiteIndustrielORM(Base):
    __tablename__ = "rin_sites_industriels"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    operateur_id: Mapped[str] = mapped_column(ForeignKey("operateurs_industriels.id"), nullable=False, index=True)
    nom_site: Mapped[str] = mapped_column(String(200), nullable=False)
    type_site: Mapped[str] = mapped_column(String(80), nullable=False, server_default="usine")
    province: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    ville: Mapped[str] = mapped_column(String(120), nullable=False)
    adresse: Mapped[str | None] = mapped_column(String(300), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    superficie_ha: Mapped[float | None] = mapped_column(Float, nullable=True)
    statut: Mapped[str] = mapped_column(String(40), nullable=False, server_default="actif")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    created_by: Mapped[str | None] = mapped_column(String(80), nullable=True)
    statut_validation: Mapped[str] = mapped_column(String(30), nullable=False, server_default="brouillon")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    validated_by: Mapped[str | None] = mapped_column(String(80), nullable=True)
    validated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class RINProduitORM(Base):
    __tablename__ = "rin_produits"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    operateur_id: Mapped[str] = mapped_column(ForeignKey("operateurs_industriels.id"), nullable=False, index=True)
    nom_produit: Mapped[str] = mapped_column(String(200), nullable=False)
    categorie: Mapped[str] = mapped_column(String(100), nullable=False)
    unite: Mapped[str] = mapped_column(String(40), nullable=False, server_default="tonne")
    capacite_annuelle: Mapped[float | None] = mapped_column(Float, nullable=True)
    production_annuelle: Mapped[float | None] = mapped_column(Float, nullable=True)
    marche_cible: Mapped[str | None] = mapped_column(String(120), nullable=True)
    certification: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    created_by: Mapped[str | None] = mapped_column(String(80), nullable=True)
    statut_validation: Mapped[str] = mapped_column(String(30), nullable=False, server_default="brouillon")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    validated_by: Mapped[str | None] = mapped_column(String(80), nullable=True)
    validated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class RINRessourceORM(Base):
    __tablename__ = "rin_ressources"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    operateur_id: Mapped[str] = mapped_column(ForeignKey("operateurs_industriels.id"), nullable=False, index=True)
    type_ressource: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    libelle: Mapped[str] = mapped_column(String(200), nullable=False)
    origine: Mapped[str | None] = mapped_column(String(120), nullable=True)
    consommation_annuelle: Mapped[float | None] = mapped_column(Float, nullable=True)
    unite: Mapped[str | None] = mapped_column(String(40), nullable=True)
    dependance_import: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    created_by: Mapped[str | None] = mapped_column(String(80), nullable=True)
    statut_validation: Mapped[str] = mapped_column(String(30), nullable=False, server_default="brouillon")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    validated_by: Mapped[str | None] = mapped_column(String(80), nullable=True)
    validated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class RINInvestissementORM(Base):
    __tablename__ = "rin_investissements"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    operateur_id: Mapped[str] = mapped_column(ForeignKey("operateurs_industriels.id"), nullable=False, index=True)
    intitule: Mapped[str] = mapped_column(String(240), nullable=False)
    montant_fcfa: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    statut: Mapped[str] = mapped_column(String(40), nullable=False, server_default="planifie")
    annee: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    emplois_prevus: Mapped[int | None] = mapped_column(Integer, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    created_by: Mapped[str | None] = mapped_column(String(80), nullable=True)
    statut_validation: Mapped[str] = mapped_column(String(30), nullable=False, server_default="brouillon")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    validated_by: Mapped[str | None] = mapped_column(String(80), nullable=True)
    validated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class MessageORM(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    thread_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    sender_username: Mapped[str] = mapped_column(String(80), ForeignKey("user_accounts.username"), nullable=False)
    recipient_username: Mapped[str] = mapped_column(String(80), ForeignKey("user_accounts.username"), nullable=False)
    subject: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    ati_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class UserFavoriteORM(Base):
    __tablename__ = "user_favorites"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    username: Mapped[str] = mapped_column(String(80), ForeignKey("user_accounts.username"), nullable=False, index=True)
    ati_id: Mapped[str] = mapped_column(String(36), nullable=False)
    note: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ATICommentORM(Base):
    __tablename__ = "ati_comments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    ati_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    author_username: Mapped[str] = mapped_column(String(80), ForeignKey("user_accounts.username"), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    is_internal: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ATITagORM(Base):
    __tablename__ = "ati_tags"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    ati_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(50), nullable=False)
    color: Mapped[str] = mapped_column(String(7), nullable=False, server_default="#0c7eb4")
    created_by: Mapped[str] = mapped_column(String(80), ForeignKey("user_accounts.username"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class DocumentDossierORM(Base):
    __tablename__ = "documents_dossier"

    id: Mapped[str] = mapped_column(String(24), primary_key=True)
    ati_id: Mapped[str] = mapped_column(ForeignKey("agrements_ati.id"), nullable=False, index=True)
    nom_fichier: Mapped[str] = mapped_column(String(255), nullable=False)
    type_document: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # statuts, bilan, plan_site, certification, autre
    taille_octets: Mapped[int] = mapped_column(nullable=False)
    chemin_stockage: Mapped[str] = mapped_column(String(512), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    uploaded_by: Mapped[str] = mapped_column(String(80), nullable=False)


class ATITechnicalOpinionORM(Base):
    __tablename__ = "ati_technical_opinions"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    ati_id: Mapped[str] = mapped_column(ForeignKey("agrements_ati.id"), nullable=False, index=True)
    direction: Mapped[str] = mapped_column(String(120), nullable=False)
    requested_by: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="demande", server_default="demande", index=True
    )
    motivation: Mapped[str | None] = mapped_column(Text, nullable=True)
    signed_by: Mapped[str | None] = mapped_column(String(80), nullable=True)
    signed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ATIComplementRequestORM(Base):
    __tablename__ = "ati_complement_requests"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    ati_id: Mapped[str] = mapped_column(ForeignKey("agrements_ati.id"), nullable=False, index=True)
    requested_by: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="ouvert", server_default="ouvert", index=True
    )
    motif: Mapped[str] = mapped_column(Text, nullable=False)
    requested_documents: Mapped[str | None] = mapped_column(Text, nullable=True)
    response_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    responded_by: Mapped[str | None] = mapped_column(String(80), nullable=True)
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ATIBusinessRuleORM(Base):
    __tablename__ = "ati_business_rules"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    rule_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    demande_type: Mapped[str | None] = mapped_column(String(30), nullable=True, index=True)
    secteur: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    config: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=text("true"))
    updated_by: Mapped[str | None] = mapped_column(String(80), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class DelegationORM(Base):
    __tablename__ = "delegations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    from_username: Mapped[str] = mapped_column(String(80), ForeignKey("user_accounts.username"), nullable=False)
    to_username: Mapped[str] = mapped_column(String(80), ForeignKey("user_accounts.username"), nullable=False)
    reason: Mapped[str | None] = mapped_column(String(300), nullable=True)
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ATIReminderORM(Base):
    __tablename__ = "ati_reminders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    ati_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(30), nullable=False)
    recipient_username: Mapped[str] = mapped_column(String(80), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class StickyNoteORM(Base):
    __tablename__ = "sticky_notes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    username: Mapped[str] = mapped_column(String(80), ForeignKey("user_accounts.username"), nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    color: Mapped[str] = mapped_column(String(7), nullable=False, server_default="#f2b800")
    position_x: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    position_y: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    is_pinned: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class DocumentVersionORM(Base):
    __tablename__ = "document_versions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    document_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    ati_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    uploaded_by: Mapped[str] = mapped_column(String(80), ForeignKey("user_accounts.username"), nullable=False)
    comment: Mapped[str | None] = mapped_column(String(300), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class OperatorFeedbackORM(Base):
    __tablename__ = "operator_feedback"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    ati_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    username: Mapped[str] = mapped_column(String(80), ForeignKey("user_accounts.username"), nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(30), nullable=False, server_default="general")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AnnouncementORM(Base):
    __tablename__ = "announcements"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False, server_default="info")
    target_roles: Mapped[str | None] = mapped_column(String(200), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    created_by: Mapped[str] = mapped_column(String(80), ForeignKey("user_accounts.username"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ATIChecklistItemORM(Base):
    __tablename__ = "ati_checklist_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    ati_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False, server_default="general")
    is_checked: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    checked_by: Mapped[str | None] = mapped_column(String(80), nullable=True)
    checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(300), nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")


class PollORM(Base):
    __tablename__ = "polls"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    question: Mapped[str] = mapped_column(String(300), nullable=False)
    options: Mapped[str] = mapped_column(Text, nullable=False)
    created_by: Mapped[str] = mapped_column(String(80), ForeignKey("user_accounts.username"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PollVoteORM(Base):
    __tablename__ = "poll_votes"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    poll_id: Mapped[str] = mapped_column(String(36), ForeignKey("polls.id"), nullable=False)
    username: Mapped[str] = mapped_column(String(80), ForeignKey("user_accounts.username"), nullable=False)
    option_index: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ConventionORM(Base):
    __tablename__ = "conventions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    numero: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    titre: Mapped[str] = mapped_column(String(300), nullable=False)
    partenaire: Mapped[str] = mapped_column(String(200), nullable=False)
    type_convention: Mapped[str] = mapped_column(String(30), nullable=False)
    date_signature: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    date_expiration: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    montant_fcfa: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    statut: Mapped[str] = mapped_column(String(20), nullable=False, server_default="active")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[str] = mapped_column(String(80), ForeignKey("user_accounts.username"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class InstructorRatingORM(Base):
    __tablename__ = "instructor_ratings"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    instructor_username: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    operator_username: Mapped[str] = mapped_column(String(80), ForeignKey("user_accounts.username"), nullable=False)
    ati_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str | None] = mapped_column(String(300), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ATIAppealORM(Base):
    __tablename__ = "ati_appeals"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    ati_id: Mapped[str] = mapped_column(ForeignKey("agrements_ati.id"), nullable=False, index=True)
    statut: Mapped[str] = mapped_column(String(20), nullable=False, server_default="en_examen")
    motif: Mapped[str] = mapped_column(Text, nullable=False)
    pieces_complementaires: Mapped[str | None] = mapped_column(Text, nullable=True)
    deposed_by: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    deposed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    decision_motif: Mapped[str | None] = mapped_column(Text, nullable=True)
    decided_by: Mapped[str | None] = mapped_column(String(80), nullable=True)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class FiliereStrategiqueORM(Base):
    __tablename__ = "filieres_strategiques"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    code: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    nom: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    responsable: Mapped[str | None] = mapped_column(String(120), nullable=True)
    statut: Mapped[str] = mapped_column(String(30), nullable=False, server_default="prioritaire", index=True)
    vision: Mapped[str | None] = mapped_column(Text, nullable=True)
    objectifs: Mapped[str | None] = mapped_column(Text, nullable=True)
    contraintes: Mapped[str | None] = mapped_column(Text, nullable=True)
    opportunites: Mapped[str | None] = mapped_column(Text, nullable=True)
    maturite_cible: Mapped[int] = mapped_column(Integer, nullable=False, server_default="80")
    created_by: Mapped[str] = mapped_column(String(80), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class FiliereIndicatorORM(Base):
    __tablename__ = "filiere_indicators"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    filiere_id: Mapped[str] = mapped_column(ForeignKey("filieres_strategiques.id"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    libelle: Mapped[str] = mapped_column(String(220), nullable=False)
    definition: Mapped[str | None] = mapped_column(Text, nullable=True)
    formule: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str | None] = mapped_column(String(220), nullable=True)
    unite: Mapped[str | None] = mapped_column(String(40), nullable=True)
    periodicite: Mapped[str] = mapped_column(String(30), nullable=False, server_default="mensuelle")
    niveau_diffusion: Mapped[str] = mapped_column(String(40), nullable=False, server_default="interne")
    responsable: Mapped[str | None] = mapped_column(String(120), nullable=True)
    valeur_courante: Mapped[float | None] = mapped_column(Float, nullable=True)
    valeur_cible: Mapped[float | None] = mapped_column(Float, nullable=True)
    qualite_donnee: Mapped[str] = mapped_column(String(30), nullable=False, server_default="estimation")
    methode_version: Mapped[str] = mapped_column(String(40), nullable=False, server_default="v1")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class FiliereActionORM(Base):
    __tablename__ = "filiere_actions"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    filiere_id: Mapped[str] = mapped_column(ForeignKey("filieres_strategiques.id"), nullable=False, index=True)
    intitule: Mapped[str] = mapped_column(String(240), nullable=False)
    objectif: Mapped[str | None] = mapped_column(Text, nullable=True)
    responsable: Mapped[str | None] = mapped_column(String(120), nullable=True)
    partenaires: Mapped[str | None] = mapped_column(Text, nullable=True)
    echeance: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    statut: Mapped[str] = mapped_column(String(30), nullable=False, server_default="proposee", index=True)
    indicateurs: Mapped[str | None] = mapped_column(Text, nullable=True)
    risques: Mapped[str | None] = mapped_column(Text, nullable=True)
    progression_pct: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    created_by: Mapped[str] = mapped_column(String(80), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class FiliereRiskORM(Base):
    __tablename__ = "filiere_risks"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    filiere_id: Mapped[str] = mapped_column(ForeignKey("filieres_strategiques.id"), nullable=False, index=True)
    titre: Mapped[str] = mapped_column(String(220), nullable=False)
    categorie: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    probabilite: Mapped[int] = mapped_column(Integer, nullable=False, server_default="3")
    impact: Mapped[int] = mapped_column(Integer, nullable=False, server_default="3")
    criticite: Mapped[str] = mapped_column(String(20), nullable=False, server_default="moyenne", index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    mitigation: Mapped[str | None] = mapped_column(Text, nullable=True)
    statut: Mapped[str] = mapped_column(String(30), nullable=False, server_default="ouvert")
    created_by: Mapped[str] = mapped_column(String(80), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class InnovationTechnologyORM(Base):
    __tablename__ = "innovation_technologies"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    code: Mapped[str] = mapped_column(String(80), nullable=False, unique=True, index=True)
    nom: Mapped[str] = mapped_column(String(220), nullable=False)
    domaine: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    niveau_maturite: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    secteur_application: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    cout_relatif: Mapped[str | None] = mapped_column(String(40), nullable=True)
    complexite: Mapped[str | None] = mapped_column(String(40), nullable=True)
    competences_requises: Mapped[str | None] = mapped_column(Text, nullable=True)
    infrastructures_requises: Mapped[str | None] = mapped_column(Text, nullable=True)
    adoption_nationale_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    created_by: Mapped[str] = mapped_column(String(80), nullable=False, default="system")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class InnovationActorORM(Base):
    __tablename__ = "innovation_actors"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    nom: Mapped[str] = mapped_column(String(220), nullable=False)
    type_organisation: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    domaines_expertise: Mapped[str | None] = mapped_column(Text, nullable=True)
    capacites_techniques: Mapped[str | None] = mapped_column(Text, nullable=True)
    secteurs_couverts: Mapped[str | None] = mapped_column(Text, nullable=True)
    equipements_disponibles: Mapped[str | None] = mapped_column(Text, nullable=True)
    province: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    contact: Mapped[str | None] = mapped_column(String(160), nullable=True)
    statut: Mapped[str] = mapped_column(String(40), nullable=False, default="actif", index=True)
    created_by: Mapped[str] = mapped_column(String(80), nullable=False, default="system")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class InnovationProjectORM(Base):
    __tablename__ = "innovation_projects"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    titre: Mapped[str] = mapped_column(String(240), nullable=False)
    operateur_id: Mapped[str | None] = mapped_column(ForeignKey("operateurs_industriels.id"), nullable=True, index=True)
    technologie_id: Mapped[str | None] = mapped_column(
        ForeignKey("innovation_technologies.id"), nullable=True, index=True
    )
    filiere_code: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    objectif: Mapped[str | None] = mapped_column(Text, nullable=True)
    niveau_maturite: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    budget_fcfa: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    partenaires: Mapped[str | None] = mapped_column(Text, nullable=True)
    besoins_financement: Mapped[str | None] = mapped_column(Text, nullable=True)
    resultats_attendus: Mapped[str | None] = mapped_column(Text, nullable=True)
    risques: Mapped[str | None] = mapped_column(Text, nullable=True)
    statut: Mapped[str] = mapped_column(String(40), nullable=False, default="idee", index=True)
    created_by: Mapped[str] = mapped_column(String(80), nullable=False, default="system")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    operateur: Mapped[OperateurIndustrielORM | None] = relationship(lazy="joined")
    technologie: Mapped[InnovationTechnologyORM | None] = relationship(lazy="joined")
