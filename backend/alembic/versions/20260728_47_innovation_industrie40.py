"""Innovation industrielle, R&D and Industrie 4.0.

Revision ID: 20260728_47
Revises: 20260728_46
Create Date: 2026-07-28
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260728_47"
down_revision = "20260728_46"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "innovation_technologies",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("code", sa.String(length=80), nullable=False),
        sa.Column("nom", sa.String(length=220), nullable=False),
        sa.Column("domaine", sa.String(length=80), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("niveau_maturite", sa.Integer(), nullable=False),
        sa.Column("secteur_application", sa.String(length=80), nullable=True),
        sa.Column("cout_relatif", sa.String(length=40), nullable=True),
        sa.Column("complexite", sa.String(length=40), nullable=True),
        sa.Column("competences_requises", sa.Text(), nullable=True),
        sa.Column("infrastructures_requises", sa.Text(), nullable=True),
        sa.Column("adoption_nationale_pct", sa.Float(), nullable=False),
        sa.Column("created_by", sa.String(length=80), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_innovation_technologies_code", "innovation_technologies", ["code"])
    op.create_index("ix_innovation_technologies_domaine", "innovation_technologies", ["domaine"])
    op.create_index("ix_innovation_technologies_secteur_application", "innovation_technologies", ["secteur_application"])

    op.create_table(
        "innovation_actors",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("nom", sa.String(length=220), nullable=False),
        sa.Column("type_organisation", sa.String(length=80), nullable=False),
        sa.Column("domaines_expertise", sa.Text(), nullable=True),
        sa.Column("capacites_techniques", sa.Text(), nullable=True),
        sa.Column("secteurs_couverts", sa.Text(), nullable=True),
        sa.Column("equipements_disponibles", sa.Text(), nullable=True),
        sa.Column("province", sa.String(length=80), nullable=True),
        sa.Column("contact", sa.String(length=160), nullable=True),
        sa.Column("statut", sa.String(length=40), nullable=False),
        sa.Column("created_by", sa.String(length=80), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_innovation_actors_type_organisation", "innovation_actors", ["type_organisation"])
    op.create_index("ix_innovation_actors_province", "innovation_actors", ["province"])
    op.create_index("ix_innovation_actors_statut", "innovation_actors", ["statut"])

    op.create_table(
        "innovation_projects",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("titre", sa.String(length=240), nullable=False),
        sa.Column("operateur_id", sa.String(length=24), nullable=True),
        sa.Column("technologie_id", sa.String(length=40), nullable=True),
        sa.Column("filiere_code", sa.String(length=80), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("objectif", sa.Text(), nullable=True),
        sa.Column("niveau_maturite", sa.Integer(), nullable=False),
        sa.Column("budget_fcfa", sa.BigInteger(), nullable=False),
        sa.Column("partenaires", sa.Text(), nullable=True),
        sa.Column("besoins_financement", sa.Text(), nullable=True),
        sa.Column("resultats_attendus", sa.Text(), nullable=True),
        sa.Column("risques", sa.Text(), nullable=True),
        sa.Column("statut", sa.String(length=40), nullable=False),
        sa.Column("created_by", sa.String(length=80), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["operateur_id"], ["operateurs_industriels.id"]),
        sa.ForeignKeyConstraint(["technologie_id"], ["innovation_technologies.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_innovation_projects_operateur_id", "innovation_projects", ["operateur_id"])
    op.create_index("ix_innovation_projects_technologie_id", "innovation_projects", ["technologie_id"])
    op.create_index("ix_innovation_projects_filiere_code", "innovation_projects", ["filiere_code"])
    op.create_index("ix_innovation_projects_statut", "innovation_projects", ["statut"])


def downgrade() -> None:
    op.drop_index("ix_innovation_projects_statut", table_name="innovation_projects")
    op.drop_index("ix_innovation_projects_filiere_code", table_name="innovation_projects")
    op.drop_index("ix_innovation_projects_technologie_id", table_name="innovation_projects")
    op.drop_index("ix_innovation_projects_operateur_id", table_name="innovation_projects")
    op.drop_table("innovation_projects")

    op.drop_index("ix_innovation_actors_statut", table_name="innovation_actors")
    op.drop_index("ix_innovation_actors_province", table_name="innovation_actors")
    op.drop_index("ix_innovation_actors_type_organisation", table_name="innovation_actors")
    op.drop_table("innovation_actors")

    op.drop_index("ix_innovation_technologies_secteur_application", table_name="innovation_technologies")
    op.drop_index("ix_innovation_technologies_domaine", table_name="innovation_technologies")
    op.drop_index("ix_innovation_technologies_code", table_name="innovation_technologies")
    op.drop_table("innovation_technologies")
