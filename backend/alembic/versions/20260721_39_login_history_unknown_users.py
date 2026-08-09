"""Allow login history entries for unknown usernames.

Revision ID: 20260721_39
Revises: 20260427_38
"""

import sqlalchemy as sa

from alembic import op

revision = "20260721_39"
down_revision = "20260427_38"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    foreign_keys = sa.inspect(bind).get_foreign_keys("login_history")
    username_fk = next(
        (fk for fk in foreign_keys if fk.get("constrained_columns") == ["username"]),
        None,
    )
    if username_fk and username_fk.get("name"):
        op.drop_constraint(username_fk["name"], "login_history", type_="foreignkey")


def downgrade() -> None:
    op.execute(
        """
        DELETE FROM login_history
        WHERE NOT EXISTS (
            SELECT 1 FROM user_accounts
            WHERE user_accounts.username = login_history.username
        )
        """
    )
    op.create_foreign_key(
        "login_history_username_fkey",
        "login_history",
        "user_accounts",
        ["username"],
        ["username"],
    )
