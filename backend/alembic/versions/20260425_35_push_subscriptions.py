"""Add push_subscriptions table for Web Push (VAPID)."""

revision = "20260425_35"
down_revision = "20260423_34"

from alembic import op
import sqlalchemy as sa


def upgrade():
    op.create_table(
        "push_subscriptions",
        sa.Column("id", sa.String(length=40), primary_key=True),
        sa.Column("username", sa.String(length=80), nullable=False),
        sa.Column("endpoint", sa.Text(), nullable=False, unique=True),
        sa.Column("p256dh", sa.Text(), nullable=False),
        sa.Column("auth", sa.Text(), nullable=False),
        sa.Column("user_agent", sa.String(length=300), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_push_subscriptions_username",
        "push_subscriptions",
        ["username"],
    )


def downgrade():
    op.drop_index("ix_push_subscriptions_username", table_name="push_subscriptions")
    op.drop_table("push_subscriptions")
