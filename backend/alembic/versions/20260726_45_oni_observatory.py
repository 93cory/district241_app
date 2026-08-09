"""Observatoire National de l'Industrie declarations and alerts.

Revision ID: 20260726_45
Revises: 20260726_44
Create Date: 2026-07-26
"""

from alembic import op
import sqlalchemy as sa


revision = "20260726_45"
down_revision = "20260726_44"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "oni_periodic_declarations",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("operateur_id", sa.String(length=24), nullable=False),
        sa.Column("period_type", sa.String(length=20), server_default="mensuel", nullable=False),
        sa.Column("period", sa.String(length=20), nullable=False),
        sa.Column("secteur", sa.String(length=50), nullable=False),
        sa.Column("production_volume", sa.Float(), nullable=False),
        sa.Column("production_unit", sa.String(length=30), server_default="tonnes", nullable=False),
        sa.Column("capacity_installed", sa.Float(), nullable=False),
        sa.Column("capacity_used", sa.Float(), nullable=False),
        sa.Column("downtime_hours", sa.Float(), nullable=False),
        sa.Column("jobs_total", sa.Integer(), nullable=False),
        sa.Column("jobs_created", sa.Integer(), nullable=False),
        sa.Column("jobs_lost", sa.Integer(), nullable=False),
        sa.Column("jobs_women", sa.Integer(), nullable=False),
        sa.Column("jobs_youth", sa.Integer(), nullable=False),
        sa.Column("investment_fcfa", sa.BigInteger(), nullable=False),
        sa.Column("exports_value_fcfa", sa.BigInteger(), nullable=False),
        sa.Column("imports_value_fcfa", sa.BigInteger(), nullable=False),
        sa.Column("local_raw_material_pct", sa.Float(), nullable=False),
        sa.Column("imported_raw_material_pct", sa.Float(), nullable=False),
        sa.Column("energy_kwh", sa.Float(), nullable=False),
        sa.Column("stock_raw_material", sa.Float(), nullable=False),
        sa.Column("stock_finished_goods", sa.Float(), nullable=False),
        sa.Column("average_price_fcfa", sa.Float(), nullable=True),
        sa.Column("status", sa.String(length=30), server_default="soumise", nullable=False),
        sa.Column("anomaly_flags", sa.Text(), nullable=True),
        sa.Column("ai_summary", sa.Text(), nullable=True),
        sa.Column("submitted_by", sa.String(length=80), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("validated_by", sa.String(length=80), nullable=True),
        sa.Column("validated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["operateur_id"], ["operateurs_industriels.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_oni_periodic_declarations_operateur_id", "oni_periodic_declarations", ["operateur_id"])
    op.create_index("ix_oni_periodic_declarations_period", "oni_periodic_declarations", ["period"])
    op.create_index("ix_oni_periodic_declarations_secteur", "oni_periodic_declarations", ["secteur"])
    op.create_index("ix_oni_periodic_declarations_status", "oni_periodic_declarations", ["status"])
    op.create_index("ix_oni_periodic_declarations_submitted_by", "oni_periodic_declarations", ["submitted_by"])

    op.create_table(
        "oni_alerts",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("declaration_id", sa.String(length=40), nullable=True),
        sa.Column("operateur_id", sa.String(length=24), nullable=True),
        sa.Column("severity", sa.String(length=20), nullable=False),
        sa.Column("alert_type", sa.String(length=60), nullable=False),
        sa.Column("title", sa.String(length=220), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=30), server_default="ouverte", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("resolved_by", sa.String(length=80), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_oni_alerts_declaration_id", "oni_alerts", ["declaration_id"])
    op.create_index("ix_oni_alerts_operateur_id", "oni_alerts", ["operateur_id"])
    op.create_index("ix_oni_alerts_severity", "oni_alerts", ["severity"])
    op.create_index("ix_oni_alerts_alert_type", "oni_alerts", ["alert_type"])


def downgrade():
    op.drop_index("ix_oni_alerts_alert_type", table_name="oni_alerts")
    op.drop_index("ix_oni_alerts_severity", table_name="oni_alerts")
    op.drop_index("ix_oni_alerts_operateur_id", table_name="oni_alerts")
    op.drop_index("ix_oni_alerts_declaration_id", table_name="oni_alerts")
    op.drop_table("oni_alerts")
    op.drop_index("ix_oni_periodic_declarations_submitted_by", table_name="oni_periodic_declarations")
    op.drop_index("ix_oni_periodic_declarations_status", table_name="oni_periodic_declarations")
    op.drop_index("ix_oni_periodic_declarations_secteur", table_name="oni_periodic_declarations")
    op.drop_index("ix_oni_periodic_declarations_period", table_name="oni_periodic_declarations")
    op.drop_index("ix_oni_periodic_declarations_operateur_id", table_name="oni_periodic_declarations")
    op.drop_table("oni_periodic_declarations")
