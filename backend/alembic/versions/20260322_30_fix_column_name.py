"""Fix column name password_changed_at -> password_updated_at."""

revision = "20260322_30"
down_revision = "20260322_29"

from alembic import op


def upgrade():
    op.alter_column("user_accounts", "password_changed_at", new_column_name="password_updated_at")


def downgrade():
    op.alter_column("user_accounts", "password_updated_at", new_column_name="password_changed_at")
