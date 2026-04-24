"""PNPI · Heatmap des non-conformites par province."""

from __future__ import annotations

from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.auth import User, get_current_user
from ..database import get_db
from ..models.pnpi import InspectionConformiteORM

router = APIRouter(prefix="/heatmap", tags=["Heatmap"])

# Approximate province centroids for Gabon
PROVINCE_COORDS = {
    "estuaire": {"lat": 0.4, "lng": 9.45, "label": "Estuaire"},
    "haut_ogooue": {"lat": -1.6, "lng": 13.95, "label": "Haut-Ogooue"},
    "moyen_ogooue": {"lat": -0.45, "lng": 10.75, "label": "Moyen-Ogooue"},
    "ngounie": {"lat": -1.5, "lng": 11.4, "label": "Ngounie"},
    "nyanga": {"lat": -2.85, "lng": 11.15, "label": "Nyanga"},
    "ogooue_ivindo": {"lat": 0.8, "lng": 12.0, "label": "Ogooue-Ivindo"},
    "ogooue_lolo": {"lat": -0.85, "lng": 12.65, "label": "Ogooue-Lolo"},
    "ogooue_maritime": {"lat": -1.6, "lng": 9.7, "label": "Ogooue-Maritime"},
    "woleu_ntem": {"lat": 2.15, "lng": 11.75, "label": "Woleu-Ntem"},
}


@router.get("/non-conformites")
async def non_conformity_heatmap(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Heatmap data: non-conformity counts by province."""
    inspections = db.execute(select(InspectionConformiteORM)).scalars().all()

    province_stats: dict = defaultdict(lambda: {"total": 0, "conforme": 0, "non_conforme": 0, "partiel": 0})

    for insp in inspections:
        op = insp.operateur
        prov = op.province if op else "inconnu"
        province_stats[prov]["total"] += 1
        if insp.statut_conformite == "conforme":
            province_stats[prov]["conforme"] += 1
        elif insp.statut_conformite == "non_conforme":
            province_stats[prov]["non_conforme"] += 1
        else:
            province_stats[prov]["partiel"] += 1

    result = []
    for prov, stats in province_stats.items():
        coords = PROVINCE_COORDS.get(prov, {"lat": 0, "lng": 11, "label": prov.replace("_", " ").title()})
        non_conf_rate = round(stats["non_conforme"] / stats["total"] * 100, 1) if stats["total"] else 0
        intensity = min(stats["non_conforme"] / max(1, max(s["non_conforme"] for s in province_stats.values())), 1.0)

        result.append(
            {
                "province": prov,
                "label": coords["label"],
                "lat": coords["lat"],
                "lng": coords["lng"],
                "total": stats["total"],
                "conforme": stats["conforme"],
                "non_conforme": stats["non_conforme"],
                "partiel": stats["partiel"],
                "taux_non_conformite": non_conf_rate,
                "intensity": round(intensity, 2),
            }
        )

    result.sort(key=lambda r: r["non_conforme"], reverse=True)
    return {"provinces": result}
