"""Add missing columns to user_accounts (failed_login_attempts, locked_until, password_changed_at)."""

revision = "20260322_29"
down_revision = "20260322_28"

from alembic import op
import sqlalchemy as sa


def upgrade():
    # Add columns that exist in the ORM but were missing from migrations
    op.add_column("user_accounts", sa.Column("failed_login_attempts", sa.Integer, nullable=False, server_default="0"))
    op.add_column("user_accounts", sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True))
    op.add_column("user_accounts", sa.Column("password_changed_at", sa.DateTime(timezone=True), nullable=True))


def downgrade():
    op.drop_column("user_accounts", "password_changed_at")
    op.drop_column("user_accounts", "locked_until")
    op.drop_column("user_accounts", "failed_login_attempts")
