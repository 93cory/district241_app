"""Instructor ratings by operators."""
revision = "20260322_28"
down_revision = "20260322_27"
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.create_table(
        "instructor_ratings",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("instructor_username", sa.String(80), nullable=False, index=True),
        sa.Column("operator_username", sa.String(80), sa.ForeignKey("user_accounts.username"), nullable=False),
        sa.Column("ati_id", sa.String(36), nullable=True),
        sa.Column("rating", sa.Integer, nullable=False),
        sa.Column("comment", sa.String(300), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_unique_constraint("uq_rating_ati", "instructor_ratings", ["operator_username", "ati_id"])

def downgrade():
    op.drop_table("instructor_ratings")
