"""Add ati_appeals table for the post-rejection appeal workflow."""

revision = "20260427_36"
down_revision = "20260425_35"

from alembic import op
import sqlalchemy as sa


def upgrade():
    op.create_table(
        "ati_appeals",
        sa.Column("id", sa.String(length=40), primary_key=True),
        sa.Column("ati_id", sa.String(length=24), sa.ForeignKey("agrements_ati.id"), nullable=False),
        sa.Column("statut", sa.String(length=20), nullable=False, server_default="en_examen"),
        sa.Column("motif", sa.Text(), nullable=False),
        sa.Column("pieces_complementaires", sa.Text(), nullable=True),
        sa.Column("deposed_by", sa.String(length=80), nullable=False),
        sa.Column("deposed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("decision_motif", sa.Text(), nullable=True),
        sa.Column("decided_by", sa.String(length=80), nullable=True),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_ati_appeals_ati_id", "ati_appeals", ["ati_id"])
    op.create_index("ix_ati_appeals_deposed_by", "ati_appeals", ["deposed_by"])


def downgrade():
    op.drop_index("ix_ati_appeals_deposed_by", table_name="ati_appeals")
    op.drop_index("ix_ati_appeals_ati_id", table_name="ati_appeals")
    op.drop_table("ati_appeals")
