"""Automatic ATI reminders."""
revision = "20260322_20"
down_revision = "20260322_19"

from alembic import op
import sqlalchemy as sa

def upgrade():
    op.create_table(
        "ati_reminders",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("ati_id", sa.String(36), nullable=False, index=True),
        sa.Column("type", sa.String(30), nullable=False),
        sa.Column("recipient_username", sa.String(80), nullable=False),
        sa.Column("message", sa.Text, nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

def downgrade():
    op.drop_table("ati_reminders")
