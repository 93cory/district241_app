"""Compute a global health score (0-100) for the PNPI platform.

Factors:
- Database reachable (25 pts)
- Cache reachable (15 pts)
- Disk space > 10% free (10 pts)
- Error rate < 5% (20 pts)
- No overdue ATIs above threshold (15 pts)
- Active users connected recently (15 pts)
"""

from __future__ import annotations

import logging
import shutil

from sqlalchemy import func, select
from sqlalchemy.orm import Session

logger = logging.getLogger("pnpi.health_score")


async def compute_health_score(db: Session) -> dict:
    """Return health score breakdown."""
    score = 0
    details = {}

    # 1. Database (25 pts)
    try:
        from sqlalchemy import text

        db.execute(text("SELECT 1"))
        score += 25
        details["database"] = {"score": 25, "status": "ok"}
    except Exception:
        details["database"] = {"score": 0, "status": "down"}

    # 2. Cache (15 pts)
    try:
        from .cache import cache

        await cache.set("health_score:ping", "1", ttl=5)
        val = await cache.get("health_score:ping")
        if val:
            score += 15
            details["cache"] = {"score": 15, "status": "ok"}
        else:
            details["cache"] = {"score": 0, "status": "degraded"}
    except Exception:
        details["cache"] = {"score": 0, "status": "down"}

    # 3. Disk (10 pts)
    try:
        usage = shutil.disk_usage("/")
        free_pct = usage.free / usage.total * 100
        if free_pct > 20:
            score += 10
            details["disk"] = {"score": 10, "status": "ok", "free_pct": round(free_pct, 1)}
        elif free_pct > 10:
            score += 5
            details["disk"] = {"score": 5, "status": "warning", "free_pct": round(free_pct, 1)}
        else:
            details["disk"] = {"score": 0, "status": "critical", "free_pct": round(free_pct, 1)}
    except Exception:
        details["disk"] = {"score": 5, "status": "unknown"}
        score += 5

    # 4. Error rate (20 pts)
    try:
        from .api_analytics import analytics

        summary = analytics.get_summary()
        err_rate = summary.get("error_rate_pct", 0)
        if err_rate < 2:
            score += 20
            details["error_rate"] = {"score": 20, "status": "ok", "rate_pct": err_rate}
        elif err_rate < 5:
            score += 12
            details["error_rate"] = {"score": 12, "status": "warning", "rate_pct": err_rate}
        else:
            details["error_rate"] = {"score": 0, "status": "critical", "rate_pct": err_rate}
    except Exception:
        score += 15  # No data = assume OK
        details["error_rate"] = {"score": 15, "status": "no_data"}

    # 5. Overdue ATIs (15 pts)
    try:
        from ..database import now_utc
        from ..models.pnpi import AgrementTechniqueIndustrielORM

        now = now_utc()
        terminal = {"approuve", "rejete", "expire"}
        all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
        overdue = sum(
            1
            for a in all_atis
            if a.statut not in terminal and (now.date() - a.date_soumission.date()).days > a.sla_jours
        )
        total_active = sum(1 for a in all_atis if a.statut not in terminal)
        if total_active == 0 or overdue == 0:
            score += 15
            details["overdue"] = {"score": 15, "status": "ok", "count": 0}
        elif overdue / total_active < 0.1:
            score += 10
            details["overdue"] = {"score": 10, "status": "warning", "count": overdue}
        else:
            details["overdue"] = {"score": 0, "status": "critical", "count": overdue}
    except Exception:
        score += 10
        details["overdue"] = {"score": 10, "status": "unknown"}

    # 6. Active users (15 pts)
    try:
        from ..models.core import RefreshTokenORM

        active = db.execute(
            select(func.count(RefreshTokenORM.id)).where(
                RefreshTokenORM.revoked_at.is_(None),
                RefreshTokenORM.expires_at > now_utc(),
            )
        ).scalar_one()
        if active > 0:
            score += 15
            details["active_users"] = {"score": 15, "status": "ok", "sessions": active}
        else:
            score += 5
            details["active_users"] = {"score": 5, "status": "warning", "sessions": 0}
    except Exception:
        score += 10
        details["active_users"] = {"score": 10, "status": "unknown"}

    grade = "A" if score >= 90 else "B" if score >= 75 else "C" if score >= 60 else "D" if score >= 40 else "F"

    return {"score": score, "grade": grade, "max": 100, "details": details}
