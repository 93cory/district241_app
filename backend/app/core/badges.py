"""PNPI — Systeme de badges et gamification."""
from __future__ import annotations

from sqlalchemy import select, func
from sqlalchemy.orm import Session

from ..models.pnpi import AgrementTechniqueIndustrielORM, InspectionConformiteORM
from ..models.core import AuditEventORM


BADGE_DEFS = [
    {"id": "first_ati", "name": "Premier ATI", "desc": "A soumis son premier ATI", "icon": "\U0001f331", "category": "debutant"},
    {"id": "ati_10", "name": "Decollage", "desc": "10 ATIs traites", "icon": "\U0001f680", "category": "productivite"},
    {"id": "ati_50", "name": "Expert", "desc": "50 ATIs traites", "icon": "\u2b50", "category": "productivite"},
    {"id": "ati_100", "name": "Maitre", "desc": "100 ATIs traites", "icon": "\U0001f451", "category": "productivite"},
    {"id": "sla_perfect", "name": "Ponctuel", "desc": "10 ATIs traites dans les delais SLA", "icon": "\u23f1\ufe0f", "category": "qualite"},
    {"id": "zero_reject", "name": "Sans faute", "desc": "10 decisions consecutives sans rejet", "icon": "\u2728", "category": "qualite"},
    {"id": "inspector_5", "name": "Inspecteur actif", "desc": "5 inspections realisees", "icon": "\U0001f50d", "category": "terrain"},
    {"id": "inspector_20", "name": "Inspecteur senior", "desc": "20 inspections realisees", "icon": "\U0001f396\ufe0f", "category": "terrain"},
    {"id": "multi_sector", "name": "Polyvalent", "desc": "ATIs dans 3+ secteurs differents", "icon": "\U0001f30d", "category": "diversite"},
    {"id": "early_bird", "name": "Matinal", "desc": "Action avant 8h du matin", "icon": "\U0001f305", "category": "engagement"},
    {"id": "streak_7", "name": "Regulier", "desc": "Actif 7 jours consecutifs", "icon": "\U0001f525", "category": "engagement"},
]


def compute_badges(db: Session, username: str) -> list[dict]:
    """Compute earned badges for a user."""
    earned = []

    # Count ATIs where user is instructeur or submitter
    atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
    user_atis = [a for a in atis if getattr(a, 'instructeur_username', None) == username]

    # Count inspections
    inspections = db.execute(
        select(InspectionConformiteORM).where(InspectionConformiteORM.inspecteur_username == username)
    ).scalars().all()

    # Count audit events
    events = db.execute(
        select(AuditEventORM).where(AuditEventORM.actor == username)
    ).scalars().all()

    decided = [a for a in user_atis if a.statut in ("approuve", "rejete")]

    # Check each badge
    if len(user_atis) >= 1 or len(events) >= 1:
        earned.append("first_ati")
    if len(decided) >= 10:
        earned.append("ati_10")
    if len(decided) >= 50:
        earned.append("ati_50")
    if len(decided) >= 100:
        earned.append("ati_100")

    # SLA perfect
    on_time = [a for a in decided if a.date_decision and
               (a.date_decision.date() - a.date_soumission.date()).days <= a.sla_jours]
    if len(on_time) >= 10:
        earned.append("sla_perfect")

    # Zero reject streak
    approved_streak = 0
    for a in sorted(decided, key=lambda x: x.date_decision or x.date_soumission):
        if a.statut == "approuve":
            approved_streak += 1
        else:
            approved_streak = 0
    if approved_streak >= 10:
        earned.append("zero_reject")

    # Inspector badges
    if len(inspections) >= 5:
        earned.append("inspector_5")
    if len(inspections) >= 20:
        earned.append("inspector_20")

    # Multi-sector
    sectors = set(a.secteur for a in user_atis)
    if len(sectors) >= 3:
        earned.append("multi_sector")

    # Early bird
    for e in events[:50]:
        if hasattr(e, 'timestamp') and e.timestamp and e.timestamp.hour < 8:
            earned.append("early_bird")
            break

    # Build result
    all_badges = []
    for badge_def in BADGE_DEFS:
        is_earned = badge_def["id"] in earned
        all_badges.append({**badge_def, "earned": is_earned})

    return all_badges
