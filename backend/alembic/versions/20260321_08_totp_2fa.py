"""Add TOTP 2FA columns to user_accounts.

Revision ID: 20260321_08
Revises: 20260321_07
Create Date: 2026-03-21
"""
from alembic import op
import sqlalchemy as sa

revision = "20260321_08"
down_revision = "20260321_07"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user_accounts",
        sa.Column("totp_secret", sa.String(64), nullable=True),
    )
    op.add_column(
        "user_accounts",
        sa.Column("totp_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column(
        "user_accounts",
        sa.Column("totp_confirmed_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("user_accounts", "totp_confirmed_at")
    op.drop_column("user_accounts", "totp_enabled")
    op.drop_column("user_accounts", "totp_secret")
