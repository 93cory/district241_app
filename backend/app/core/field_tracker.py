"""PNPI · Suivi des modifications champ par champ."""

from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session


def track_field_changes(
    db: Session,
    entity_type: str,
    entity_id: str,
    actor: str,
    old_values: dict,
    new_values: dict,
) -> list[dict]:
    """Compare old and new values, record changed fields.

    Returns list of changes recorded.
    """
    from ..models.core import AuditEventORM

    changes = []
    for field, new_val in new_values.items():
        old_val = old_values.get(field)
        if old_val != new_val:
            change = {
                "field": field,
                "old_value": _serialize(old_val),
                "new_value": _serialize(new_val),
            }
            changes.append(change)

    if changes:
        event = AuditEventORM(
            id=str(uuid.uuid4()),
            actor=actor,
            action=f"{entity_type}.field_change",
            target=entity_id,
            details=json.dumps({"changes": changes}, ensure_ascii=False),
            timestamp=datetime.now(UTC),
        )
        db.add(event)

    return changes


def get_field_history(
    db: Session,
    entity_type: str,
    entity_id: str,
) -> list[dict]:
    """Get field-level change history for an entity."""
    from ..models.core import AuditEventORM

    events = (
        db.execute(
            select(AuditEventORM)
            .where(
                AuditEventORM.target == entity_id,
                AuditEventORM.action == f"{entity_type}.field_change",
            )
            .order_by(AuditEventORM.timestamp.desc())
        )
        .scalars()
        .all()
    )

    history = []
    for event in events:
        try:
            details = json.loads(event.details)
            changes = details.get("changes", [])
        except (json.JSONDecodeError, TypeError):
            changes = []

        history.append(
            {
                "id": event.id,
                "actor": event.actor,
                "timestamp": event.timestamp.isoformat(),
                "changes": changes,
            }
        )

    return history


def _serialize(val: Any) -> Any:
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.isoformat()
    if isinstance(val, (list, dict)):
        return val
    return str(val)
