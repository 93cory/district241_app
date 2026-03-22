"""Custom tags for ATIs."""
revision = "20260322_18"
down_revision = "20260322_17"

from alembic import op
import sqlalchemy as sa

def upgrade():
    op.create_table(
        "ati_tags",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("ati_id", sa.String(36), nullable=False, index=True),
        sa.Column("label", sa.String(50), nullable=False),
        sa.Column("color", sa.String(7), nullable=False, server_default="#0c7eb4"),
        sa.Column("created_by", sa.String(80), sa.ForeignKey("user_accounts.username"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_ati_tags_label", "ati_tags", ["label"])

def downgrade():
    op.drop_table("ati_tags")
