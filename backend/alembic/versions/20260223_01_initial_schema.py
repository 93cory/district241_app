"""initial schema

Revision ID: 20260223_01
Revises:
Create Date: 2026-02-23 10:05:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260223_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "units",
        sa.Column("id", sa.String(length=16), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("sector", sa.String(length=120), nullable=False),
        sa.Column("capacity", sa.Float(), nullable=False),
        sa.Column("equipment", sa.String(length=255), nullable=False),
        sa.Column("location", sa.String(length=120), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "trace_batches",
        sa.Column("batch_id", sa.String(length=24), nullable=False),
        sa.Column("product", sa.String(length=200), nullable=False),
        sa.Column("origin", sa.String(length=200), nullable=False),
        sa.Column("factory", sa.String(length=200), nullable=False),
        sa.Column("certification", sa.String(length=120), nullable=False),
        sa.Column("quantity_tons", sa.Float(), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("qr_code", sa.String(length=255), nullable=False),
        sa.PrimaryKeyConstraint("batch_id"),
    )

    op.create_table(
        "declarations",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("unit_id", sa.String(length=16), nullable=False),
        sa.Column("month", sa.Date(), nullable=False),
        sa.Column("volume_tons", sa.Float(), nullable=False),
        sa.Column("jobs", sa.Integer(), nullable=False),
        sa.Column("validated", sa.Boolean(), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("submitted_by", sa.String(length=80), nullable=False),
        sa.ForeignKeyConstraint(["unit_id"], ["units.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_declarations_unit_id", "declarations", ["unit_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_declarations_unit_id", table_name="declarations")
    op.drop_table("declarations")
    op.drop_table("trace_batches")
    op.drop_table("units")

