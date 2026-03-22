"""Framework agreements / conventions."""
revision = "20260322_27"
down_revision = "20260322_26"
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.create_table(
        "conventions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("numero", sa.String(50), nullable=False, unique=True),
        sa.Column("titre", sa.String(300), nullable=False),
        sa.Column("partenaire", sa.String(200), nullable=False),
        sa.Column("type_convention", sa.String(30), nullable=False),
        sa.Column("date_signature", sa.DateTime(timezone=True), nullable=False),
        sa.Column("date_expiration", sa.DateTime(timezone=True), nullable=True),
        sa.Column("montant_fcfa", sa.BigInteger, nullable=True),
        sa.Column("statut", sa.String(20), nullable=False, server_default="active"),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("created_by", sa.String(80), sa.ForeignKey("user_accounts.username"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

def downgrade():
    op.drop_table("conventions")
