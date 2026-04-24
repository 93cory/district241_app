"""PNPI · Analytics et tracking des actions utilisateur."""

from __future__ import annotations

from collections import defaultdict
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import now_utc
from ..models.core import AuditEventORM


def track_page_view(db: Session, *, actor: str, page: str, details: str = "") -> None:
    """Track a page view as an audit event."""
    event = AuditEventORM(
        id=f"PV-{now_utc().strftime('%Y%m%d%H%M%S')}-{actor[:8]}",
        timestamp=now_utc(),
        actor=actor,
        action=f"page_view:{page}",
        target=page,
        details=details,
    )
    db.add(event)


def get_usage_stats(db: Session, days: int = 30) -> dict:
    """Get platform usage statistics for the last N days."""
    since = now_utc() - timedelta(days=days)

    events = db.execute(select(AuditEventORM).where(AuditEventORM.timestamp >= since)).scalars().all()

    # Active users
    active_users = set(e.actor for e in events)

    # Actions by type
    action_counts: dict[str, int] = defaultdict(int)
    for e in events:
        action_type = e.action.split(".")[0] if "." in e.action else e.action.split(":")[0]
        action_counts[action_type] += 1

    # Daily activity
    daily: dict[str, int] = defaultdict(int)
    for e in events:
        day = e.timestamp.strftime("%Y-%m-%d")
        daily[day] += 1

    # Peak hours
    hourly: dict[int, int] = defaultdict(int)
    for e in events:
        hourly[e.timestamp.hour] += 1

    peak_hour = max(hourly, key=hourly.get) if hourly else 0

    return {
        "period_days": days,
        "total_events": len(events),
        "active_users": len(active_users),
        "top_users": sorted(
            [(user, sum(1 for e in events if e.actor == user)) for user in active_users],
            key=lambda x: x[1],
            reverse=True,
        )[:10],
        "action_breakdown": dict(sorted(action_counts.items(), key=lambda x: x[1], reverse=True)),
        "daily_activity": dict(sorted(daily.items())),
        "peak_hour": peak_hour,
        "avg_daily_events": round(len(events) / max(days, 1), 1),
    }
