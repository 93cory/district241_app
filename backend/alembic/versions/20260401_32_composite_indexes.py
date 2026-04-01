"""Add composite indexes for common query patterns."""

revision = "20260401_32"
down_revision = "20260322_31"

from alembic import op


def upgrade():
    # ATI: statut + date_soumission (dashboard KPIs, listing par statut)
    op.create_index(
        "ix_ati_statut_date_soumission",
        "agrements_ati",
        ["statut", "date_soumission"],
    )
    # ATI: instructeur + statut (mes dossiers en cours)
    op.create_index(
        "ix_ati_instructeur_statut",
        "agrements_ati",
        ["instructeur_username", "statut"],
    )
    # Inspections: operateur + date (derniere inspection par operateur)
    op.create_index(
        "ix_inspections_operateur_date",
        "inspections_conformite",
        ["operateur_id", "date_inspection"],
    )
    # Audit events: timestamp + actor (audit trail filtering)
    op.create_index(
        "ix_audit_timestamp_actor",
        "audit_events",
        ["timestamp", "actor"],
    )
    # Notifications: is_read + created_at (unread notifications listing)
    op.create_index(
        "ix_notifications_read_created",
        "notifications",
        ["is_read", "created_at"],
    )
    # Messages: recipient + is_read (inbox)
    op.create_index(
        "ix_messages_recipient_read",
        "messages",
        ["recipient_username", "is_read"],
    )


def downgrade():
    op.drop_index("ix_messages_recipient_read", "messages")
    op.drop_index("ix_notifications_read_created", "notifications")
    op.drop_index("ix_audit_timestamp_actor", "audit_events")
    op.drop_index("ix_inspections_operateur_date", "inspections_conformite")
    op.drop_index("ix_ati_instructeur_statut", "agrements_ati")
    op.drop_index("ix_ati_statut_date_soumission", "agrements_ati")
