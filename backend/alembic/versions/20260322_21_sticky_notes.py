"""Dashboard sticky notes."""
revision = "20260322_21"
down_revision = "20260322_20"

from alembic import op
import sqlalchemy as sa

def upgrade():
    op.create_table(
        "sticky_notes",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("username", sa.String(80), sa.ForeignKey("user_accounts.username"), nullable=False, index=True),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("color", sa.String(7), nullable=False, server_default="#f2b800"),
        sa.Column("position_x", sa.Integer, nullable=False, server_default="0"),
        sa.Column("position_y", sa.Integer, nullable=False, server_default="0"),
        sa.Column("is_pinned", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

def downgrade():
    op.drop_table("sticky_notes")
