"""Add latitude/longitude/captured_at to inspection_photos."""

revision = "20260423_34"
down_revision = "20260401_33"

from alembic import op
import sqlalchemy as sa


def upgrade():
    op.add_column("inspection_photos", sa.Column("latitude", sa.Float(), nullable=True))
    op.add_column("inspection_photos", sa.Column("longitude", sa.Float(), nullable=True))
    op.add_column("inspection_photos", sa.Column("captured_at", sa.DateTime(timezone=True), nullable=True))


def downgrade():
    op.drop_column("inspection_photos", "captured_at")
    op.drop_column("inspection_photos", "longitude")
    op.drop_column("inspection_photos", "latitude")
