"""Broadcast announcements."""
revision = "20260322_25"
down_revision = "20260322_24"

from alembic import op
import sqlalchemy as sa

def upgrade():
    op.create_table(
        "announcements",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("body", sa.Text, nullable=False),
        sa.Column("severity", sa.String(20), nullable=False, server_default="info"),
        sa.Column("target_roles", sa.String(200), nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("created_by", sa.String(80), sa.ForeignKey("user_accounts.username"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
    )

def downgrade():
    op.drop_table("announcements")
