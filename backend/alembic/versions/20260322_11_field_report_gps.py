"""PNPI — Ajout colonnes GPS et photo aux rapports terrain

Revision ID: 20260322_11
Revises: 20260321_10
Create Date: 2026-03-22
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260322_11"
down_revision = "20260321_10"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("field_reports", sa.Column("latitude", sa.Float, nullable=True))
    op.add_column("field_reports", sa.Column("longitude", sa.Float, nullable=True))
    op.add_column("field_reports", sa.Column("photo_path", sa.String(512), nullable=True))


def downgrade() -> None:
    op.drop_column("field_reports", "photo_path")
    op.drop_column("field_reports", "longitude")
    op.drop_column("field_reports", "latitude")
