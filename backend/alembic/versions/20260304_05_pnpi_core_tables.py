"""PNPI core tables — operateurs, ATI, transitions, inspections

Revision ID: 20260304_05
Revises: 20260223_04
Create Date: 2026-03-04
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260304_05"
down_revision = "20260223_04"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "operateurs_industriels",
        sa.Column("id", sa.String(24), primary_key=True),
        sa.Column("nif_gabon", sa.String(30), unique=True, nullable=False),
        sa.Column("raison_sociale", sa.String(300), nullable=False),
        sa.Column("secteur", sa.String(50), nullable=False),
        sa.Column("province", sa.String(80), nullable=False),
        sa.Column("ville", sa.String(100), nullable=False),
        sa.Column("latitude", sa.Float, nullable=True),
        sa.Column("longitude", sa.Float, nullable=True),
        sa.Column("contact_email", sa.String(200), nullable=True),
        sa.Column("contact_telephone", sa.String(30), nullable=True),
        sa.Column("effectif_declare", sa.Integer, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_by", sa.String(80), nullable=True),
    )
    op.create_index("ix_operateurs_secteur", "operateurs_industriels", ["secteur"])
    op.create_index("ix_operateurs_province", "operateurs_industriels", ["province"])
    op.create_index("ix_operateurs_nif", "operateurs_industriels", ["nif_gabon"])

    op.create_table(
        "agrements_ati",
        sa.Column("id", sa.String(24), primary_key=True),
        sa.Column("numero_ati", sa.String(30), unique=True, nullable=False),
        sa.Column("operateur_id", sa.String(24), sa.ForeignKey("operateurs_industriels.id"), nullable=False),
        sa.Column("type_activite", sa.String(300), nullable=False),
        sa.Column("secteur", sa.String(50), nullable=False),
        sa.Column("statut", sa.String(30), nullable=False, server_default="soumis"),
        sa.Column("etape", sa.String(30), nullable=False, server_default="reception"),
        sa.Column("priorite", sa.String(20), nullable=False, server_default="normale"),
        sa.Column("instructeur_username", sa.String(80), nullable=True),
        sa.Column("date_soumission", sa.DateTime(timezone=True), nullable=False),
        sa.Column("date_decision", sa.DateTime(timezone=True), nullable=True),
        sa.Column("date_expiration", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sla_jours", sa.Integer, nullable=False, server_default="30"),
        sa.Column("qr_code_data", sa.String(500), nullable=True),
        sa.Column("motif_rejet", sa.String(800), nullable=True),
        sa.Column("numero_reference_decision", sa.String(100), nullable=True),
        sa.Column("observations", sa.Text, nullable=True),
        sa.Column("created_by", sa.String(80), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_agrements_operateur", "agrements_ati", ["operateur_id"])
    op.create_index("ix_agrements_statut", "agrements_ati", ["statut"])
    op.create_index("ix_agrements_secteur", "agrements_ati", ["secteur"])
    op.create_index("ix_agrements_numero", "agrements_ati", ["numero_ati"])

    op.create_table(
        "ati_transitions",
        sa.Column("id", sa.String(40), primary_key=True),
        sa.Column("ati_id", sa.String(24), sa.ForeignKey("agrements_ati.id"), nullable=False),
        sa.Column("changed_by", sa.String(80), nullable=False),
        sa.Column("previous_statut", sa.String(30), nullable=True),
        sa.Column("new_statut", sa.String(30), nullable=True),
        sa.Column("previous_etape", sa.String(30), nullable=True),
        sa.Column("new_etape", sa.String(30), nullable=True),
        sa.Column("note", sa.String(500), nullable=False, server_default=""),
        sa.Column("changed_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_ati_transitions_ati_id", "ati_transitions", ["ati_id"])

    op.create_table(
        "inspections_conformite",
        sa.Column("id", sa.String(24), primary_key=True),
        sa.Column("operateur_id", sa.String(24), sa.ForeignKey("operateurs_industriels.id"), nullable=False),
        sa.Column("ati_id", sa.String(24), sa.ForeignKey("agrements_ati.id"), nullable=True),
        sa.Column("inspecteur_username", sa.String(80), nullable=False),
        sa.Column("date_inspection", sa.DateTime(timezone=True), nullable=False),
        sa.Column("statut_conformite", sa.String(20), nullable=False),
        sa.Column("observations", sa.Text, nullable=False),
        sa.Column("mesures_correctives", sa.Text, nullable=True),
        sa.Column("latitude", sa.Float, nullable=True),
        sa.Column("longitude", sa.Float, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_inspections_operateur", "inspections_conformite", ["operateur_id"])


def downgrade() -> None:
    op.drop_table("inspections_conformite")
    op.drop_index("ix_ati_transitions_ati_id", table_name="ati_transitions")
    op.drop_table("ati_transitions")
    op.drop_index("ix_agrements_numero", table_name="agrements_ati")
    op.drop_index("ix_agrements_secteur", table_name="agrements_ati")
    op.drop_index("ix_agrements_statut", table_name="agrements_ati")
    op.drop_index("ix_agrements_operateur", table_name="agrements_ati")
    op.drop_table("agrements_ati")
    op.drop_index("ix_operateurs_nif", table_name="operateurs_industriels")
    op.drop_index("ix_operateurs_province", table_name="operateurs_industriels")
    op.drop_index("ix_operateurs_secteur", table_name="operateurs_industriels")
    op.drop_table("operateurs_industriels")
