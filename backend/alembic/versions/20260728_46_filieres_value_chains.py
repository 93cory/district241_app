"""Filières industrielles, chaînes de valeur and strategic governance.

Revision ID: 20260728_46
Revises: 20260726_45
Create Date: 2026-07-28
"""

from alembic import op
import sqlalchemy as sa


revision = "20260728_46"
down_revision = "20260726_45"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "filieres_strategiques",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("nom", sa.String(length=180), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("responsable", sa.String(length=120), nullable=True),
        sa.Column("statut", sa.String(length=30), server_default="prioritaire", nullable=False),
        sa.Column("vision", sa.Text(), nullable=True),
        sa.Column("objectifs", sa.Text(), nullable=True),
        sa.Column("contraintes", sa.Text(), nullable=True),
        sa.Column("opportunites", sa.Text(), nullable=True),
        sa.Column("maturite_cible", sa.Integer(), server_default="80", nullable=False),
        sa.Column("created_by", sa.String(length=80), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_filieres_strategiques_code", "filieres_strategiques", ["code"])
    op.create_index("ix_filieres_strategiques_statut", "filieres_strategiques", ["statut"])

    op.create_table(
        "filiere_indicators",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("filiere_id", sa.String(length=40), nullable=False),
        sa.Column("code", sa.String(length=80), nullable=False),
        sa.Column("libelle", sa.String(length=220), nullable=False),
        sa.Column("definition", sa.Text(), nullable=True),
        sa.Column("formule", sa.Text(), nullable=True),
        sa.Column("source", sa.String(length=220), nullable=True),
        sa.Column("unite", sa.String(length=40), nullable=True),
        sa.Column("periodicite", sa.String(length=30), server_default="mensuelle", nullable=False),
        sa.Column("niveau_diffusion", sa.String(length=40), server_default="interne", nullable=False),
        sa.Column("responsable", sa.String(length=120), nullable=True),
        sa.Column("valeur_courante", sa.Float(), nullable=True),
        sa.Column("valeur_cible", sa.Float(), nullable=True),
        sa.Column("qualite_donnee", sa.String(length=30), server_default="estimation", nullable=False),
        sa.Column("methode_version", sa.String(length=40), server_default="v1", nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["filiere_id"], ["filieres_strategiques.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_filiere_indicators_filiere_id", "filiere_indicators", ["filiere_id"])
    op.create_index("ix_filiere_indicators_code", "filiere_indicators", ["code"])

    op.create_table(
        "filiere_actions",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("filiere_id", sa.String(length=40), nullable=False),
        sa.Column("intitule", sa.String(length=240), nullable=False),
        sa.Column("objectif", sa.Text(), nullable=True),
        sa.Column("responsable", sa.String(length=120), nullable=True),
        sa.Column("partenaires", sa.Text(), nullable=True),
        sa.Column("echeance", sa.DateTime(timezone=True), nullable=True),
        sa.Column("statut", sa.String(length=30), server_default="proposee", nullable=False),
        sa.Column("indicateurs", sa.Text(), nullable=True),
        sa.Column("risques", sa.Text(), nullable=True),
        sa.Column("progression_pct", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_by", sa.String(length=80), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["filiere_id"], ["filieres_strategiques.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_filiere_actions_filiere_id", "filiere_actions", ["filiere_id"])
    op.create_index("ix_filiere_actions_statut", "filiere_actions", ["statut"])

    op.create_table(
        "filiere_risks",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("filiere_id", sa.String(length=40), nullable=False),
        sa.Column("titre", sa.String(length=220), nullable=False),
        sa.Column("categorie", sa.String(length=60), nullable=False),
        sa.Column("probabilite", sa.Integer(), server_default="3", nullable=False),
        sa.Column("impact", sa.Integer(), server_default="3", nullable=False),
        sa.Column("criticite", sa.String(length=20), server_default="moyenne", nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("mitigation", sa.Text(), nullable=True),
        sa.Column("statut", sa.String(length=30), server_default="ouvert", nullable=False),
        sa.Column("created_by", sa.String(length=80), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["filiere_id"], ["filieres_strategiques.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_filiere_risks_filiere_id", "filiere_risks", ["filiere_id"])
    op.create_index("ix_filiere_risks_categorie", "filiere_risks", ["categorie"])
    op.create_index("ix_filiere_risks_criticite", "filiere_risks", ["criticite"])


def downgrade():
    op.drop_index("ix_filiere_risks_criticite", table_name="filiere_risks")
    op.drop_index("ix_filiere_risks_categorie", table_name="filiere_risks")
    op.drop_index("ix_filiere_risks_filiere_id", table_name="filiere_risks")
    op.drop_table("filiere_risks")
    op.drop_index("ix_filiere_actions_statut", table_name="filiere_actions")
    op.drop_index("ix_filiere_actions_filiere_id", table_name="filiere_actions")
    op.drop_table("filiere_actions")
    op.drop_index("ix_filiere_indicators_code", table_name="filiere_indicators")
    op.drop_index("ix_filiere_indicators_filiere_id", table_name="filiere_indicators")
    op.drop_table("filiere_indicators")
    op.drop_index("ix_filieres_strategiques_statut", table_name="filieres_strategiques")
    op.drop_index("ix_filieres_strategiques_code", table_name="filieres_strategiques")
    op.drop_table("filieres_strategiques")
