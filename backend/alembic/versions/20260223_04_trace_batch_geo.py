"""add geo fields to trace batches

Revision ID: 20260223_04
Revises: 20260223_03
Create Date: 2026-02-23 14:20:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260223_04"
down_revision = "20260223_03"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("trace_batches", sa.Column("origin_lat", sa.Float(), nullable=True))
    op.add_column("trace_batches", sa.Column("origin_lng", sa.Float(), nullable=True))
    op.add_column("trace_batches", sa.Column("factory_lat", sa.Float(), nullable=True))
    op.add_column("trace_batches", sa.Column("factory_lng", sa.Float(), nullable=True))

    # Backfill seeded batches so maps work immediately after migration.
    op.execute(
        "UPDATE trace_batches SET origin_lat=0.8080, origin_lng=12.6180, "
        "factory_lat=0.3901, factory_lng=9.4544 WHERE batch_id='B202601-001'"
    )
    op.execute(
        "UPDATE trace_batches SET origin_lat=-1.2500, origin_lng=10.5000, "
        "factory_lat=-2.9332, factory_lng=10.9818 WHERE batch_id='B202601-015'"
    )
    op.execute(
        "UPDATE trace_batches SET origin_lat=0.5200, origin_lng=9.5800, "
        "factory_lat=-0.7193, factory_lng=8.7815 WHERE batch_id='B202602-003'"
    )


def downgrade() -> None:
    op.drop_column("trace_batches", "factory_lng")
    op.drop_column("trace_batches", "factory_lat")
    op.drop_column("trace_batches", "origin_lng")
    op.drop_column("trace_batches", "origin_lat")
