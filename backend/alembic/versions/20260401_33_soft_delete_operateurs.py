"""Add soft delete (deleted_at) to operateurs_industriels."""

revision = "20260401_33"
down_revision = "20260401_32"

from alembic import op
import sqlalchemy as sa


def upgrade():
    op.add_column(
        "operateurs_industriels",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_operateurs_deleted_at", "operateurs_industriels", ["deleted_at"])


def downgrade():
    op.drop_index("ix_operateurs_deleted_at", "operateurs_industriels")
    op.drop_column("operateurs_industriels", "deleted_at")
