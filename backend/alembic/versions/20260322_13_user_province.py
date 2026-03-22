"""Add province field to user_accounts for multi-tenant support."""

revision = "20260322_13"
down_revision = "20260322_12"

from alembic import op
import sqlalchemy as sa


def upgrade():
    op.add_column("user_accounts", sa.Column("province", sa.String(60), nullable=True))
    op.create_index("ix_user_accounts_province", "user_accounts", ["province"])


def downgrade():
    op.drop_index("ix_user_accounts_province", "user_accounts")
    op.drop_column("user_accounts", "province")
