"""Add backup_codes_hash column to user_accounts.

Revision ID: 20260321_09
Revises: 20260321_08
Create Date: 2026-03-21
"""
from alembic import op
import sqlalchemy as sa

revision = "20260321_09"
down_revision = "20260321_08"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user_accounts",
        sa.Column("backup_codes_hash", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("user_accounts", "backup_codes_hash")
