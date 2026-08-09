"""RIN workflow, soft delete and lifecycle columns.

Revision ID: 20260726_42
Revises: 20260726_41
Create Date: 2026-07-26
"""

from alembic import op
import sqlalchemy as sa


revision = "20260726_42"
down_revision = "20260726_41"
branch_labels = None
depends_on = None


TABLES = [
    "rin_representants",
    "rin_sites_industriels",
    "rin_produits",
    "rin_ressources",
    "rin_investissements",
]


def upgrade():
    for table in TABLES:
        op.add_column(table, sa.Column("statut_validation", sa.String(length=30), server_default="brouillon", nullable=False))
        op.add_column(table, sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
        op.add_column(table, sa.Column("validated_by", sa.String(length=80), nullable=True))
        op.add_column(table, sa.Column("validated_at", sa.DateTime(timezone=True), nullable=True))
        op.add_column(table, sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
        op.create_index(f"ix_{table}_statut_validation", table, ["statut_validation"])
        op.create_index(f"ix_{table}_deleted_at", table, ["deleted_at"])


def downgrade():
    for table in reversed(TABLES):
        op.drop_index(f"ix_{table}_deleted_at", table_name=table)
        op.drop_index(f"ix_{table}_statut_validation", table_name=table)
        op.drop_column(table, "deleted_at")
        op.drop_column(table, "validated_at")
        op.drop_column(table, "validated_by")
        op.drop_column(table, "updated_at")
        op.drop_column(table, "statut_validation")
