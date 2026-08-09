"""ATI processing center, opinions, complements and configurable rules.

Revision ID: 20260726_43
Revises: 20260726_42
Create Date: 2026-07-26
"""

from alembic import op
import sqlalchemy as sa


revision = "20260726_43"
down_revision = "20260726_42"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "agrements_ati",
        sa.Column("type_demande", sa.String(length=30), server_default="creation", nullable=False),
    )
    op.add_column(
        "agrements_ati",
        sa.Column("payment_status", sa.String(length=30), server_default="prototype", nullable=False),
    )
    op.add_column("agrements_ati", sa.Column("payment_reference", sa.String(length=100), nullable=True))

    op.create_table(
        "ati_technical_opinions",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("ati_id", sa.String(length=24), nullable=False),
        sa.Column("direction", sa.String(length=120), nullable=False),
        sa.Column("requested_by", sa.String(length=80), nullable=False),
        sa.Column("requested_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(length=30), server_default="demande", nullable=False),
        sa.Column("motivation", sa.Text(), nullable=True),
        sa.Column("signed_by", sa.String(length=80), nullable=True),
        sa.Column("signed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["ati_id"], ["agrements_ati.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ati_technical_opinions_ati_id", "ati_technical_opinions", ["ati_id"])
    op.create_index("ix_ati_technical_opinions_requested_by", "ati_technical_opinions", ["requested_by"])
    op.create_index("ix_ati_technical_opinions_status", "ati_technical_opinions", ["status"])

    op.create_table(
        "ati_complement_requests",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("ati_id", sa.String(length=24), nullable=False),
        sa.Column("requested_by", sa.String(length=80), nullable=False),
        sa.Column("requested_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(length=30), server_default="ouvert", nullable=False),
        sa.Column("motif", sa.Text(), nullable=False),
        sa.Column("requested_documents", sa.Text(), nullable=True),
        sa.Column("response_note", sa.Text(), nullable=True),
        sa.Column("responded_by", sa.String(length=80), nullable=True),
        sa.Column("responded_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["ati_id"], ["agrements_ati.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ati_complement_requests_ati_id", "ati_complement_requests", ["ati_id"])
    op.create_index("ix_ati_complement_requests_requested_by", "ati_complement_requests", ["requested_by"])
    op.create_index("ix_ati_complement_requests_status", "ati_complement_requests", ["status"])

    op.create_table(
        "ati_business_rules",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("rule_type", sa.String(length=50), nullable=False),
        sa.Column("demande_type", sa.String(length=30), nullable=True),
        sa.Column("secteur", sa.String(length=50), nullable=True),
        sa.Column("label", sa.String(length=200), nullable=False),
        sa.Column("config", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("updated_by", sa.String(length=80), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ati_business_rules_rule_type", "ati_business_rules", ["rule_type"])
    op.create_index("ix_ati_business_rules_demande_type", "ati_business_rules", ["demande_type"])
    op.create_index("ix_ati_business_rules_secteur", "ati_business_rules", ["secteur"])


def downgrade():
    op.drop_index("ix_ati_business_rules_secteur", table_name="ati_business_rules")
    op.drop_index("ix_ati_business_rules_demande_type", table_name="ati_business_rules")
    op.drop_index("ix_ati_business_rules_rule_type", table_name="ati_business_rules")
    op.drop_table("ati_business_rules")

    op.drop_index("ix_ati_complement_requests_status", table_name="ati_complement_requests")
    op.drop_index("ix_ati_complement_requests_requested_by", table_name="ati_complement_requests")
    op.drop_index("ix_ati_complement_requests_ati_id", table_name="ati_complement_requests")
    op.drop_table("ati_complement_requests")

    op.drop_index("ix_ati_technical_opinions_status", table_name="ati_technical_opinions")
    op.drop_index("ix_ati_technical_opinions_requested_by", table_name="ati_technical_opinions")
    op.drop_index("ix_ati_technical_opinions_ati_id", table_name="ati_technical_opinions")
    op.drop_table("ati_technical_opinions")

    op.drop_column("agrements_ati", "payment_reference")
    op.drop_column("agrements_ati", "payment_status")
    op.drop_column("agrements_ati", "type_demande")
