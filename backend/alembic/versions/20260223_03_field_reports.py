"""add field reports table

Revision ID: 20260223_03
Revises: 20260223_02
Create Date: 2026-02-23 11:25:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260223_03"
down_revision = "20260223_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "field_reports",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("unit_id", sa.String(length=16), nullable=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("comment", sa.String(length=1500), nullable=False),
        sa.Column("severity", sa.String(length=20), nullable=False),
        sa.Column("location", sa.String(length=120), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_by", sa.String(length=80), nullable=False),
        sa.ForeignKeyConstraint(["unit_id"], ["units.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_field_reports_unit_id"), "field_reports", ["unit_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_field_reports_unit_id"), table_name="field_reports")
    op.drop_table("field_reports")
