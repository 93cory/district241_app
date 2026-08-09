"""Create the audit events table before its composite indexes.

Revision ID: 20260401_31a
Revises: 20260322_31
"""

import sqlalchemy as sa

from alembic import op

revision = "20260401_31a"
down_revision = "20260322_31"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "audit_events",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column(
            "timestamp",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("actor", sa.String(length=80), nullable=False),
        sa.Column("action", sa.String(length=120), nullable=False),
        sa.Column("target", sa.String(length=120), nullable=True),
        sa.Column("details", sa.String(length=1500), nullable=False, server_default=""),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("audit_events")
