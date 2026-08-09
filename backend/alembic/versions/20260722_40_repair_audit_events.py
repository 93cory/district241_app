"""Repair audit_events on databases upgraded before revision 31a existed.

Revision ID: 20260722_40
Revises: 20260721_39
"""

import sqlalchemy as sa

from alembic import op

revision = "20260722_40"
down_revision = "20260721_39"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "audit_events" not in inspector.get_table_names():
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
    existing_indexes = {index["name"] for index in sa.inspect(bind).get_indexes("audit_events")}
    if "ix_audit_timestamp_actor" not in existing_indexes:
        op.create_index("ix_audit_timestamp_actor", "audit_events", ["timestamp", "actor"])
    if "ix_audit_target" not in existing_indexes:
        op.create_index("ix_audit_target", "audit_events", ["target"])


def downgrade() -> None:
    # Repair migration: an existing table may predate this revision, so a
    # downgrade must not destroy it.
    pass
