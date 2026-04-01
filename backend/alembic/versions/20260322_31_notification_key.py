"""Add notification_key column to notifications."""

revision = "20260322_31"
down_revision = "20260322_30"

from alembic import op
import sqlalchemy as sa


def upgrade():
    op.add_column("notifications", sa.Column("notification_key", sa.String(120), nullable=True))


def downgrade():
    op.drop_column("notifications", "notification_key")
