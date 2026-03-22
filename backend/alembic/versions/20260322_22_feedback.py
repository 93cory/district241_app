"""Operator satisfaction feedback."""
revision = "20260322_22"
down_revision = "20260322_21"

from alembic import op
import sqlalchemy as sa

def upgrade():
    op.create_table(
        "operator_feedback",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("ati_id", sa.String(36), nullable=True),
        sa.Column("username", sa.String(80), sa.ForeignKey("user_accounts.username"), nullable=False),
        sa.Column("rating", sa.Integer, nullable=False),
        sa.Column("comment", sa.Text, nullable=True),
        sa.Column("category", sa.String(30), nullable=False, server_default="general"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_feedback_rating", "operator_feedback", ["rating"])

def downgrade():
    op.drop_table("operator_feedback")
