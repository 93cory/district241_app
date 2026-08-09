"""Login history tracking."""
revision = "20260322_15"
down_revision = "20260322_14"

from alembic import op
import sqlalchemy as sa

def upgrade():
    op.create_table(
        "login_history",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("username", sa.String(80), nullable=False, index=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column("method", sa.String(20), nullable=False, server_default="password"),
        sa.Column("success", sa.Boolean, nullable=False, default=True),
        sa.Column("failure_reason", sa.String(200), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

def downgrade():
    op.drop_table("login_history")
