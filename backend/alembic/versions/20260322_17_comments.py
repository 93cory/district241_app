"""ATI comments and annotations."""
revision = "20260322_17"
down_revision = "20260322_16"

from alembic import op
import sqlalchemy as sa

def upgrade():
    op.create_table(
        "ati_comments",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("ati_id", sa.String(36), nullable=False, index=True),
        sa.Column("author_username", sa.String(80), sa.ForeignKey("user_accounts.username"), nullable=False),
        sa.Column("body", sa.Text, nullable=False),
        sa.Column("is_internal", sa.Boolean, default=False, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

def downgrade():
    op.drop_table("ati_comments")
