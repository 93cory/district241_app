"""PNPI — Table documents_dossier (fichiers joints aux ATI)

Revision ID: 20260304_06
Revises: 20260304_05
Create Date: 2026-03-04
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260304_06"
down_revision = "20260304_05"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "documents_dossier",
        sa.Column("id", sa.String(24), primary_key=True),
        sa.Column("ati_id", sa.String(24), sa.ForeignKey("agrements_ati.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("nom_fichier", sa.String(255), nullable=False),
        sa.Column("type_document", sa.String(50), nullable=False),
        sa.Column("taille_octets", sa.Integer, nullable=False),
        sa.Column("chemin_stockage", sa.String(512), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("uploaded_by", sa.String(80), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("documents_dossier")
