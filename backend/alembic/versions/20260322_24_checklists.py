"""Compliance checklists for ATIs."""
revision = "20260322_24"
down_revision = "20260322_23"

from alembic import op
import sqlalchemy as sa

def upgrade():
    op.create_table(
        "ati_checklist_items",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("ati_id", sa.String(36), nullable=False, index=True),
        sa.Column("label", sa.String(200), nullable=False),
        sa.Column("category", sa.String(50), nullable=False, server_default="general"),
        sa.Column("is_checked", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("checked_by", sa.String(80), nullable=True),
        sa.Column("checked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.String(300), nullable=True),
        sa.Column("order_index", sa.Integer, nullable=False, server_default="0"),
    )

def downgrade():
    op.drop_table("ati_checklist_items")
