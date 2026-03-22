"""Internal messaging system."""
revision = "20260322_14"
down_revision = "20260322_13"

from alembic import op
import sqlalchemy as sa

def upgrade():
    op.create_table(
        "messages",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("thread_id", sa.String(36), nullable=False, index=True),
        sa.Column("sender_username", sa.String(80), sa.ForeignKey("user_accounts.username"), nullable=False),
        sa.Column("recipient_username", sa.String(80), sa.ForeignKey("user_accounts.username"), nullable=False),
        sa.Column("subject", sa.String(200), nullable=False),
        sa.Column("body", sa.Text, nullable=False),
        sa.Column("ati_id", sa.String(36), nullable=True),
        sa.Column("is_read", sa.Boolean, default=False, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_messages_recipient", "messages", ["recipient_username", "is_read"])
    op.create_index("ix_messages_thread", "messages", ["thread_id", "created_at"])

def downgrade():
    op.drop_table("messages")
