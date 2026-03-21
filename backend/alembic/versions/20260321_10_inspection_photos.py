"""PNPI — Table inspection_photos (photos jointes aux inspections)

Revision ID: 20260321_10
Revises: 20260321_09
Create Date: 2026-03-21
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260321_10"
down_revision = "20260321_09"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "inspection_photos",
        sa.Column("id", sa.String(24), primary_key=True),
        sa.Column("inspection_id", sa.String(24), sa.ForeignKey("inspections_conformite.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("nom_fichier", sa.String(255), nullable=False),
        sa.Column("chemin_stockage", sa.String(512), nullable=False),
        sa.Column("taille_octets", sa.Integer, nullable=False),
        sa.Column("description", sa.String(300), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("uploaded_by", sa.String(80), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("inspection_photos")
