"""Lot 79.3 · Index manquants identifies par l'audit perf backend.

Index ajoutes (cf docs/architecture/backend-perf-audit.md) :

- `ix_ati_created_by_date_soumission` : tres haut impact. Tous les
  endpoints operateur (`/pnpi/ati`, `/pnpi/operateurs/{id}/ati`, etc.)
  filtrent par `created_by` puis trient par `date_soumission DESC`.
  Sans index : full table scan + sort externe.

- `ix_audit_target` : audit trail filtre frequemment par cible (id ATI,
  id operateur). Le seul index existant est sur `(timestamp, actor)` qui
  ne couvre pas la recherche par target.

- `ix_login_history_username_created` : `/auth/me/login-history` order by
  `created_at DESC` per username -> composite necessaire pour eviter le
  sort.

- `ix_operateurs_active_province` : `/pnpi/dashboard/kpis` et
  `/open-data/stats` filtrent par `is_active + province`. Un index
  composite couvre ces deux scenarios.

- `ix_inspections_statut_date` : `/pnpi/dashboard/kpis` calcule taux
  conformite via dernieres inspections par statut.

- `ix_notifications_target_role_read` : listing des notifications par role
  + filtre `is_read`.
"""

revision = "20260427_38"
down_revision = "20260427_37"

from alembic import op


def upgrade():
    # Hot path operateur : son listing ATI par created_by + tri date_soumission desc
    op.create_index(
        "ix_ati_created_by_date_soumission",
        "agrements_ati",
        ["created_by", "date_soumission"],
    )
    # Audit trail filtre par target
    op.create_index(
        "ix_audit_target",
        "audit_events",
        ["target"],
    )
    # Historique connexions per user
    op.create_index(
        "ix_login_history_username_created",
        "login_history",
        ["username", "created_at"],
    )
    # Dashboard / open-data : filtre operateurs actifs par province
    op.create_index(
        "ix_operateurs_active_province",
        "operateurs_industriels",
        ["is_active", "province"],
    )
    # Dashboard taux conformite : filtres sur (statut_conformite + date)
    op.create_index(
        "ix_inspections_statut_date",
        "inspections_conformite",
        ["statut_conformite", "date_inspection"],
    )
    # Notifications par role + lecture
    op.create_index(
        "ix_notifications_target_role_read",
        "notifications",
        ["target_role", "is_read"],
    )


def downgrade():
    op.drop_index("ix_notifications_target_role_read", table_name="notifications")
    op.drop_index("ix_inspections_statut_date", table_name="inspections_conformite")
    op.drop_index("ix_operateurs_active_province", table_name="operateurs_industriels")
    op.drop_index("ix_login_history_username_created", table_name="login_history")
    op.drop_index("ix_audit_target", table_name="audit_events")
    op.drop_index("ix_ati_created_by_date_soumission", table_name="agrements_ati")
