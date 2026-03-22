"""Dossier delegation system."""
revision = "20260322_19"
down_revision = "20260322_18"

from alembic import op
import sqlalchemy as sa

def upgrade():
    op.create_table(
        "delegations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("from_username", sa.String(80), sa.ForeignKey("user_accounts.username"), nullable=False),
        sa.Column("to_username", sa.String(80), sa.ForeignKey("user_accounts.username"), nullable=False),
        sa.Column("reason", sa.String(300), nullable=True),
        sa.Column("start_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_active", sa.Boolean, default=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_delegations_active", "delegations", ["from_username", "is_active"])

def downgrade():
    op.drop_table("delegations")
