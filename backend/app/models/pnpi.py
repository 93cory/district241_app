"""PNPI — Modeles de donnees specifiques a la plateforme industrielle gabonaise."""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


SECTEURS_GABON = ["bois", "mines", "agroalimentaire", "btp", "petrole", "services", "autre"]
PROVINCES_GABON = [
    "estuaire", "haut_ogooue", "moyen_ogooue", "ngounie",
    "nyanga", "ogooue_ivindo", "ogooue_lolo", "ogooue_maritime", "woleu_ntem"
]

ATI_STATUTS = ["soumis", "en_instruction", "en_validation", "approuve", "rejete", "expire"]
ATI_ETAPES = ["reception", "instruction", "validation", "decision"]


class OperateurIndustrielORM(Base):
    __tablename__ = "operateurs_industriels"

    id: Mapped[str] = mapped_column(String(24), primary_key=True)
    nif_gabon: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    raison_sociale: Mapped[str] = mapped_column(String(300), nullable=False)
    secteur: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    province: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    ville: Mapped[str] = mapped_column(String(100), nullable=False)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    contact_email: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    contact_telephone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    effectif_declare: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_by: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)

    agrements: Mapped[List["AgrementTechniqueIndustrielORM"]] = relationship(
        back_populates="operateur",
        cascade="all, delete-orphan",
        lazy="select",
    )
    inspections: Mapped[List["InspectionConformiteORM"]] = relationship(
        back_populates="operateur",
        cascade="all, delete-orphan",
        lazy="select",
    )


class AgrementTechniqueIndustrielORM(Base):
    __tablename__ = "agrements_ati"

    id: Mapped[str] = mapped_column(String(24), primary_key=True)
    numero_ati: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    operateur_id: Mapped[str] = mapped_column(ForeignKey("operateurs_industriels.id"), nullable=False, index=True)
    type_activite: Mapped[str] = mapped_column(String(300), nullable=False)
    secteur: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    statut: Mapped[str] = mapped_column(String(30), nullable=False, default="soumis", index=True)
    etape: Mapped[str] = mapped_column(String(30), nullable=False, default="reception")
    priorite: Mapped[str] = mapped_column(String(20), nullable=False, default="normale")
    instructeur_username: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    date_soumission: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    date_decision: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    date_expiration: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    sla_jours: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    qr_code_data: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    motif_rejet: Mapped[Optional[str]] = mapped_column(String(800), nullable=True)
    numero_reference_decision: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    observations: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    operateur: Mapped[OperateurIndustrielORM] = relationship(back_populates="agrements", lazy="joined")
    transitions: Mapped[List["ATITransitionORM"]] = relationship(
        back_populates="ati",
        cascade="all, delete-orphan",
        lazy="select",
    )


class ATITransitionORM(Base):
    __tablename__ = "ati_transitions"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    ati_id: Mapped[str] = mapped_column(ForeignKey("agrements_ati.id"), nullable=False, index=True)
    changed_by: Mapped[str] = mapped_column(String(80), nullable=False)
    previous_statut: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    new_statut: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    previous_etape: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    new_etape: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    note: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    ati: Mapped[AgrementTechniqueIndustrielORM] = relationship(back_populates="transitions")


class InspectionConformiteORM(Base):
    __tablename__ = "inspections_conformite"

    id: Mapped[str] = mapped_column(String(24), primary_key=True)
    operateur_id: Mapped[str] = mapped_column(ForeignKey("operateurs_industriels.id"), nullable=False, index=True)
    ati_id: Mapped[Optional[str]] = mapped_column(ForeignKey("agrements_ati.id"), nullable=True)
    inspecteur_username: Mapped[str] = mapped_column(String(80), nullable=False)
    date_inspection: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    statut_conformite: Mapped[str] = mapped_column(String(20), nullable=False)
    observations: Mapped[str] = mapped_column(Text, nullable=False)
    mesures_correctives: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    operateur: Mapped[OperateurIndustrielORM] = relationship(back_populates="inspections", lazy="joined")


class InspectionPhotoORM(Base):
    __tablename__ = "inspection_photos"

    id: Mapped[str] = mapped_column(String(24), primary_key=True)
    inspection_id: Mapped[str] = mapped_column(ForeignKey("inspections_conformite.id"), nullable=False, index=True)
    nom_fichier: Mapped[str] = mapped_column(String(255), nullable=False)
    chemin_stockage: Mapped[str] = mapped_column(String(512), nullable=False)
    taille_octets: Mapped[int] = mapped_column(nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    uploaded_by: Mapped[str] = mapped_column(String(80), nullable=False)


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
    type_document: Mapped[str] = mapped_column(String(50), nullable=False)  # statuts, bilan, plan_site, certification, autre
    taille_octets: Mapped[int] = mapped_column(nullable=False)
    chemin_stockage: Mapped[str] = mapped_column(String(512), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    uploaded_by: Mapped[str] = mapped_column(String(80), nullable=False)
