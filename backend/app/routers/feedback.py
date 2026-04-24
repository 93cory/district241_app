"""PNPI · Feedback et satisfaction operateur."""
from __future__ import annotations

import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from ..database import get_db
from ..core.auth import User, get_current_user, require_roles, Role
from ..models.pnpi import OperatorFeedbackORM

router = APIRouter(prefix="/feedback", tags=["Feedback"])


@router.post("/submit")
async def submit_feedback(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rating = data.get("rating", 0)
    if not (1 <= rating <= 5):
        raise HTTPException(400, "Note entre 1 et 5 requise.")

    fb = OperatorFeedbackORM(
        id=str(uuid.uuid4()),
        ati_id=data.get("ati_id"),
        username=current_user.username,
        rating=rating,
        comment=(data.get("comment") or "").strip()[:500],
        category=data.get("category", "general"),
    )
    db.add(fb)
    db.commit()
    return {"status": "ok", "id": fb.id}


@router.get("/summary")
async def feedback_summary(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
):
    all_fb = db.execute(select(OperatorFeedbackORM).order_by(OperatorFeedbackORM.created_at.desc())).scalars().all()

    if not all_fb:
        return {"average": 0, "count": 0, "distribution": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}, "recent": []}

    distribution = {i: 0 for i in range(1, 6)}
    for fb in all_fb:
        distribution[fb.rating] = distribution.get(fb.rating, 0) + 1

    avg = round(sum(fb.rating for fb in all_fb) / len(all_fb), 1)

    categories = {}
    for fb in all_fb:
        cat = fb.category
        if cat not in categories:
            categories[cat] = {"count": 0, "total": 0}
        categories[cat]["count"] += 1
        categories[cat]["total"] += fb.rating

    for cat in categories:
        categories[cat]["average"] = round(categories[cat]["total"] / categories[cat]["count"], 1)

    return {
        "average": avg,
        "count": len(all_fb),
        "distribution": distribution,
        "categories": categories,
        "recent": [
            {
                "id": fb.id, "rating": fb.rating, "comment": fb.comment,
                "category": fb.category, "username": fb.username,
                "created_at": fb.created_at.isoformat(),
            }
            for fb in all_fb[:20]
        ],
    }
