"""PNPI · Planification de rapports automatiques."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException

from ..core.auth import Role, User, require_roles
from ..database import now_utc

router = APIRouter(prefix="/scheduled-reports", tags=["Scheduled Reports"])

# In-memory schedule store (in production, use DB table)
_schedules: list[dict] = []


@router.get("/list")
async def list_schedules(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
):
    return {"schedules": _schedules}


@router.post("/create")
async def create_schedule(
    data: dict,
    current_user: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
):
    """Schedule a recurring report.

    body: {
        "report_type": "executive|ati_summary|inspections|performance",
        "frequency": "daily|weekly|monthly",
        "recipients": ["admin", "ministre"],
        "format": "pdf|xlsx",
        "filters": {"secteur": "bois"}
    }
    """
    valid_types = ["executive", "ati_summary", "inspections", "performance", "benchmark"]
    report_type = data.get("report_type", "")
    if report_type not in valid_types:
        raise HTTPException(400, f"Type invalide. Valides: {', '.join(valid_types)}")

    schedule = {
        "id": str(uuid.uuid4()),
        "report_type": report_type,
        "frequency": data.get("frequency", "weekly"),
        "recipients": data.get("recipients", [current_user.username]),
        "format": data.get("format", "pdf"),
        "filters": data.get("filters", {}),
        "created_by": current_user.username,
        "created_at": now_utc().isoformat(),
        "is_active": True,
        "last_run": None,
        "next_run": _compute_next_run(data.get("frequency", "weekly")),
    }
    _schedules.append(schedule)
    return {"status": "ok", "id": schedule["id"]}


@router.patch("/{schedule_id}/toggle")
async def toggle_schedule(
    schedule_id: str,
    _: User = Depends(require_roles(Role.admin)),
):
    for s in _schedules:
        if s["id"] == schedule_id:
            s["is_active"] = not s["is_active"]
            return {"status": "ok", "is_active": s["is_active"]}
    raise HTTPException(404, "Planification introuvable.")


@router.delete("/{schedule_id}")
async def delete_schedule(
    schedule_id: str,
    _: User = Depends(require_roles(Role.admin)),
):
    global _schedules
    _schedules = [s for s in _schedules if s["id"] != schedule_id]
    return {"status": "ok"}


def _compute_next_run(frequency: str) -> str:
    from datetime import timedelta

    now = now_utc()
    if frequency == "daily":
        next_dt = now + timedelta(days=1)
    elif frequency == "monthly":
        next_dt = now + timedelta(days=30)
    else:  # weekly
        next_dt = now + timedelta(days=7)
    return next_dt.replace(hour=7, minute=0, second=0).isoformat()
