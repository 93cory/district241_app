"""Add notification_preferences table.

Revision ID: 20260322_12
Revises: 20260322_11
"""
from alembic import op
import sqlalchemy as sa

revision = "20260322_12"
down_revision = "20260322_11"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "notification_preferences",
        sa.Column("username", sa.String(80), sa.ForeignKey("user_accounts.username"), primary_key=True),
        sa.Column("email_ati_approved", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("email_ati_rejected", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("email_sla_alert", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("email_inspection", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("email_weekly_briefing", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("push_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )


def downgrade() -> None:
    op.drop_table("notification_preferences")
