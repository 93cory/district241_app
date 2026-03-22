"""User favorites / pinned ATIs."""
revision = "20260322_16"
down_revision = "20260322_15"

from alembic import op
import sqlalchemy as sa

def upgrade():
    op.create_table(
        "user_favorites",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("username", sa.String(80), sa.ForeignKey("user_accounts.username"), nullable=False),
        sa.Column("ati_id", sa.String(36), nullable=False),
        sa.Column("note", sa.String(200), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_user_favorites_user", "user_favorites", ["username"])
    op.create_unique_constraint("uq_user_favorites", "user_favorites", ["username", "ati_id"])

def downgrade():
    op.drop_table("user_favorites")
