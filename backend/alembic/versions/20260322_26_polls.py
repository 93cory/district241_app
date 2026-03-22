"""Internal polls."""
revision = "20260322_26"
down_revision = "20260322_25"

from alembic import op
import sqlalchemy as sa

def upgrade():
    op.create_table(
        "polls",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("question", sa.String(300), nullable=False),
        sa.Column("options", sa.Text, nullable=False),
        sa.Column("created_by", sa.String(80), sa.ForeignKey("user_accounts.username"), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        "poll_votes",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("poll_id", sa.String(36), sa.ForeignKey("polls.id"), nullable=False),
        sa.Column("username", sa.String(80), sa.ForeignKey("user_accounts.username"), nullable=False),
        sa.Column("option_index", sa.Integer, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_unique_constraint("uq_poll_vote", "poll_votes", ["poll_id", "username"])

def downgrade():
    op.drop_table("poll_votes")
    op.drop_table("polls")
