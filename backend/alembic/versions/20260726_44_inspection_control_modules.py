"""Advanced inspection control modules.

Revision ID: 20260726_44
Revises: 20260726_43
Create Date: 2026-07-26
"""

from alembic import op
import sqlalchemy as sa


revision = "20260726_44"
down_revision = "20260726_43"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("inspections_conformite", sa.Column("mission_order_id", sa.String(length=40), nullable=True))
    op.add_column("inspections_conformite", sa.Column("campaign_id", sa.String(length=40), nullable=True))
    op.add_column(
        "inspections_conformite",
        sa.Column("workflow_status", sa.String(length=30), server_default="rapport", nullable=False),
    )
    op.add_column("inspections_conformite", sa.Column("score_conformite", sa.Integer(), nullable=True))
    op.create_index("ix_inspections_conformite_mission_order_id", "inspections_conformite", ["mission_order_id"])
    op.create_index("ix_inspections_conformite_campaign_id", "inspections_conformite", ["campaign_id"])
    op.create_index("ix_inspections_conformite_workflow_status", "inspections_conformite", ["workflow_status"])

    op.create_table(
        "inspection_annual_plans",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("secteur", sa.String(length=50), nullable=False),
        sa.Column("province", sa.String(length=80), nullable=True),
        sa.Column("target_count", sa.Integer(), nullable=False),
        sa.Column("direction", sa.String(length=120), nullable=True),
        sa.Column("created_by", sa.String(length=80), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_inspection_annual_plans_year", "inspection_annual_plans", ["year"])
    op.create_index("ix_inspection_annual_plans_secteur", "inspection_annual_plans", ["secteur"])
    op.create_index("ix_inspection_annual_plans_province", "inspection_annual_plans", ["province"])

    op.create_table(
        "inspection_campaigns",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("title", sa.String(length=220), nullable=False),
        sa.Column("objective", sa.Text(), nullable=False),
        sa.Column("secteur", sa.String(length=50), nullable=True),
        sa.Column("provinces", sa.Text(), nullable=True),
        sa.Column("criteria", sa.Text(), nullable=True),
        sa.Column("responsible_team", sa.String(length=180), nullable=True),
        sa.Column("start_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("end_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(length=30), server_default="planifiee", nullable=False),
        sa.Column("created_by", sa.String(length=80), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_inspection_campaigns_secteur", "inspection_campaigns", ["secteur"])

    op.create_table(
        "inspection_mission_orders",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("numero", sa.String(length=60), nullable=False),
        sa.Column("inspection_id", sa.String(length=24), nullable=True),
        sa.Column("campaign_id", sa.String(length=40), nullable=True),
        sa.Column("operateur_id", sa.String(length=24), nullable=False),
        sa.Column("inspecteurs", sa.Text(), nullable=False),
        sa.Column("lieu", sa.String(length=220), nullable=True),
        sa.Column("objective", sa.Text(), nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_days", sa.Integer(), server_default="1", nullable=False),
        sa.Column("status", sa.String(length=30), server_default="planifie", nullable=False),
        sa.Column("qr_code_data", sa.String(length=500), nullable=True),
        sa.Column("created_by", sa.String(length=80), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["operateur_id"], ["operateurs_industriels.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("numero"),
    )
    op.create_index("ix_inspection_mission_orders_numero", "inspection_mission_orders", ["numero"])
    op.create_index("ix_inspection_mission_orders_inspection_id", "inspection_mission_orders", ["inspection_id"])
    op.create_index("ix_inspection_mission_orders_campaign_id", "inspection_mission_orders", ["campaign_id"])
    op.create_index("ix_inspection_mission_orders_operateur_id", "inspection_mission_orders", ["operateur_id"])
    op.create_index("ix_inspection_mission_orders_scheduled_at", "inspection_mission_orders", ["scheduled_at"])

    op.create_table(
        "inspection_checklist_templates",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("secteur", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("items", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("updated_by", sa.String(length=80), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_inspection_checklist_templates_secteur", "inspection_checklist_templates", ["secteur"])

    op.create_table(
        "inspection_findings",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("inspection_id", sa.String(length=24), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=False),
        sa.Column("severity", sa.String(length=30), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("evidence_ref", sa.String(length=120), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("responsible", sa.String(length=120), nullable=True),
        sa.Column("status", sa.String(length=30), server_default="ouverte", nullable=False),
        sa.Column("created_by", sa.String(length=80), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["inspection_id"], ["inspections_conformite.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_inspection_findings_inspection_id", "inspection_findings", ["inspection_id"])
    op.create_index("ix_inspection_findings_severity", "inspection_findings", ["severity"])

    op.create_table(
        "inspection_corrective_actions",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("finding_id", sa.String(length=40), nullable=False),
        sa.Column("action", sa.Text(), nullable=False),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(length=30), server_default="a_faire", nullable=False),
        sa.Column("operator_response", sa.Text(), nullable=True),
        sa.Column("validated_by", sa.String(length=80), nullable=True),
        sa.Column("validated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.String(length=80), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["finding_id"], ["inspection_findings.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_inspection_corrective_actions_finding_id", "inspection_corrective_actions", ["finding_id"])
    op.create_index("ix_inspection_corrective_actions_status", "inspection_corrective_actions", ["status"])

    op.create_table(
        "inspection_sanctions",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("inspection_id", sa.String(length=24), nullable=False),
        sa.Column("sanction_type", sa.String(length=50), nullable=False),
        sa.Column("motive", sa.Text(), nullable=False),
        sa.Column("decision_reference", sa.String(length=100), nullable=True),
        sa.Column("status", sa.String(length=30), server_default="proposee", nullable=False),
        sa.Column("decided_by", sa.String(length=80), nullable=True),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.String(length=80), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["inspection_id"], ["inspections_conformite.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_inspection_sanctions_inspection_id", "inspection_sanctions", ["inspection_id"])
    op.create_index("ix_inspection_sanctions_sanction_type", "inspection_sanctions", ["sanction_type"])


def downgrade():
    op.drop_index("ix_inspection_sanctions_sanction_type", table_name="inspection_sanctions")
    op.drop_index("ix_inspection_sanctions_inspection_id", table_name="inspection_sanctions")
    op.drop_table("inspection_sanctions")
    op.drop_index("ix_inspection_corrective_actions_status", table_name="inspection_corrective_actions")
    op.drop_index("ix_inspection_corrective_actions_finding_id", table_name="inspection_corrective_actions")
    op.drop_table("inspection_corrective_actions")
    op.drop_index("ix_inspection_findings_severity", table_name="inspection_findings")
    op.drop_index("ix_inspection_findings_inspection_id", table_name="inspection_findings")
    op.drop_table("inspection_findings")
    op.drop_index("ix_inspection_checklist_templates_secteur", table_name="inspection_checklist_templates")
    op.drop_table("inspection_checklist_templates")
    op.drop_index("ix_inspection_mission_orders_scheduled_at", table_name="inspection_mission_orders")
    op.drop_index("ix_inspection_mission_orders_operateur_id", table_name="inspection_mission_orders")
    op.drop_index("ix_inspection_mission_orders_campaign_id", table_name="inspection_mission_orders")
    op.drop_index("ix_inspection_mission_orders_inspection_id", table_name="inspection_mission_orders")
    op.drop_index("ix_inspection_mission_orders_numero", table_name="inspection_mission_orders")
    op.drop_table("inspection_mission_orders")
    op.drop_index("ix_inspection_campaigns_secteur", table_name="inspection_campaigns")
    op.drop_table("inspection_campaigns")
    op.drop_index("ix_inspection_annual_plans_province", table_name="inspection_annual_plans")
    op.drop_index("ix_inspection_annual_plans_secteur", table_name="inspection_annual_plans")
    op.drop_index("ix_inspection_annual_plans_year", table_name="inspection_annual_plans")
    op.drop_table("inspection_annual_plans")
    op.drop_index("ix_inspections_conformite_workflow_status", table_name="inspections_conformite")
    op.drop_index("ix_inspections_conformite_campaign_id", table_name="inspections_conformite")
    op.drop_index("ix_inspections_conformite_mission_order_id", table_name="inspections_conformite")
    op.drop_column("inspections_conformite", "score_conformite")
    op.drop_column("inspections_conformite", "workflow_status")
    op.drop_column("inspections_conformite", "campaign_id")
    op.drop_column("inspections_conformite", "mission_order_id")
