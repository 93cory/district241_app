"""PNPI / PNPI · Modeles ORM pour les dossiers de pilotage industriel."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class ProjectDossierORM(Base):
    __tablename__ = "project_dossiers"

    id: Mapped[str] = mapped_column(String(24), primary_key=True)
    company_name: Mapped[str] = mapped_column(String(200), nullable=False)
    project_title: Mapped[str] = mapped_column(String(250), nullable=False)
    sector: Mapped[str] = mapped_column(String(120), nullable=False)
    location: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="submitted")
    stage: Mapped[str] = mapped_column(String(24), nullable=False, default="reception")
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")
    sla_days: Mapped[int] = mapped_column(nullable=False, default=30)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    decision_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    assigned_to: Mapped[str | None] = mapped_column(String(120), nullable=True)
    assigned_role: Mapped[str | None] = mapped_column(String(40), nullable=True)
    decision_reason: Mapped[str | None] = mapped_column(String(800), nullable=True)
    decision_reference: Mapped[str | None] = mapped_column(String(120), nullable=True)

    transitions: Mapped[list[ProjectDossierTransitionORM]] = relationship(
        back_populates="dossier",
        cascade="all, delete-orphan",
        lazy="joined",
    )


class ProjectDossierTransitionORM(Base):
    __tablename__ = "project_dossier_transitions"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    dossier_id: Mapped[str] = mapped_column(
        ForeignKey("project_dossiers.id"),
        nullable=False,
        index=True,
    )
    changed_by: Mapped[str] = mapped_column(String(80), nullable=False)
    previous_status: Mapped[str | None] = mapped_column(String(24), nullable=True)
    new_status: Mapped[str | None] = mapped_column(String(24), nullable=True)
    previous_stage: Mapped[str | None] = mapped_column(String(24), nullable=True)
    new_stage: Mapped[str | None] = mapped_column(String(24), nullable=True)
    note: Mapped[str] = mapped_column(String(400), nullable=False, default="")
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    dossier: Mapped[ProjectDossierORM] = relationship(back_populates="transitions")
