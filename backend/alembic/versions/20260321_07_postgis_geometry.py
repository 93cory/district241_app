"""Add PostGIS geometry columns to operateurs, inspections, trace_batches.

Revision ID: 20260321_07
Revises: 20260304_06
Create Date: 2026-03-21
"""
from alembic import op
import sqlalchemy as sa

revision = "20260321_07"
down_revision = "20260304_06"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Enable PostGIS extension
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    # --- operateurs_industriels ---
    op.execute(
        "ALTER TABLE operateurs_industriels "
        "ADD COLUMN geom geometry(Point, 4326)"
    )
    op.execute(
        "UPDATE operateurs_industriels "
        "SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) "
        "WHERE latitude IS NOT NULL AND longitude IS NOT NULL"
    )
    op.execute(
        "CREATE INDEX idx_operateurs_industriels_geom "
        "ON operateurs_industriels USING GIST (geom)"
    )

    # --- inspections_conformite ---
    op.execute(
        "ALTER TABLE inspections_conformite "
        "ADD COLUMN geom geometry(Point, 4326)"
    )
    op.execute(
        "UPDATE inspections_conformite "
        "SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) "
        "WHERE latitude IS NOT NULL AND longitude IS NOT NULL"
    )
    op.execute(
        "CREATE INDEX idx_inspections_conformite_geom "
        "ON inspections_conformite USING GIST (geom)"
    )

    # --- trace_batches (origin + factory) ---
    op.execute(
        "ALTER TABLE trace_batches "
        "ADD COLUMN origin_geom geometry(Point, 4326)"
    )
    op.execute(
        "UPDATE trace_batches "
        "SET origin_geom = ST_SetSRID(ST_MakePoint(origin_lng, origin_lat), 4326) "
        "WHERE origin_lat IS NOT NULL AND origin_lng IS NOT NULL"
    )
    op.execute(
        "CREATE INDEX idx_trace_batches_origin_geom "
        "ON trace_batches USING GIST (origin_geom)"
    )

    op.execute(
        "ALTER TABLE trace_batches "
        "ADD COLUMN factory_geom geometry(Point, 4326)"
    )
    op.execute(
        "UPDATE trace_batches "
        "SET factory_geom = ST_SetSRID(ST_MakePoint(factory_lng, factory_lat), 4326) "
        "WHERE factory_lat IS NOT NULL AND factory_lng IS NOT NULL"
    )
    op.execute(
        "CREATE INDEX idx_trace_batches_factory_geom "
        "ON trace_batches USING GIST (factory_geom)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_trace_batches_factory_geom")
    op.execute("ALTER TABLE trace_batches DROP COLUMN IF EXISTS factory_geom")

    op.execute("DROP INDEX IF EXISTS idx_trace_batches_origin_geom")
    op.execute("ALTER TABLE trace_batches DROP COLUMN IF EXISTS origin_geom")

    op.execute("DROP INDEX IF EXISTS idx_inspections_conformite_geom")
    op.execute("ALTER TABLE inspections_conformite DROP COLUMN IF EXISTS geom")

    op.execute("DROP INDEX IF EXISTS idx_operateurs_industriels_geom")
    op.execute("ALTER TABLE operateurs_industriels DROP COLUMN IF EXISTS geom")

    op.execute("DROP EXTENSION IF EXISTS postgis CASCADE")
