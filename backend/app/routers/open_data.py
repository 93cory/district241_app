"""Open Data PNPI · Statistiques agregees publiques (sans authentification).

Expose des donnees anonymisees et agregees pour la transparence du service public.
Aucune donnee individuelle (NIF, raison sociale, effectif precis) n'est exposee.
Un seuil k-anonymity (k=5) bucketise les groupes trop petits pour eviter la
desanonymisation par croisement.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Request
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from ..core.cache import cache
from ..core.client_ip import get_client_ip
from ..database import get_db, now_utc
from ..models.pnpi import (
    AgrementTechniqueIndustrielORM,
    InspectionConformiteORM,
    OperateurIndustrielORM,
)

router = APIRouter(prefix="/open-data", tags=["Open Data"])

_TERMINAL = ["approuve", "rejete", "expire"]
_CACHE_TTL = 300  # 5 minutes
_K_ANONYMITY = 5  # seuil minimum pour exposer un groupe


async def _rate_limit_public(request: Request) -> None:
    """30 req / 60 s par IP sur les endpoints open-data."""
    from ..main import enforce_rate_limit

    ip = get_client_ip(request)
    await enforce_rate_limit(key=f"open-data:{ip}", limit=30, window_seconds=60)


def _count(db: Session, stmt) -> int:
    return int(db.execute(stmt).scalar_one())


def _bucket_small(rows: list[dict[str, Any]], key: str) -> list[dict[str, Any]]:
    """Bucketise les groupes < k_anonymity sous l'entree 'autres'."""
    keep: list[dict[str, Any]] = []
    other_total = 0
    for r in rows:
        if r["total"] >= _K_ANONYMITY:
            keep.append(r)
        else:
            other_total += r["total"]
    if other_total:
        keep.append({key: "autres (groupes <5)", "total": other_total})
    return keep


def _sector_rows(db: Session) -> list[dict[str, Any]]:
    rows = db.execute(
        select(AgrementTechniqueIndustrielORM.secteur, func.count().label("total"))
        .group_by(AgrementTechniqueIndustrielORM.secteur)
        .order_by(func.count().desc())
    ).all()
    return _bucket_small([{"secteur": s, "total": int(n)} for s, n in rows], "secteur")


def _province_rows(db: Session) -> list[dict[str, Any]]:
    rows = db.execute(
        select(OperateurIndustrielORM.province, func.count().label("total"))
        .where(OperateurIndustrielORM.deleted_at.is_(None))
        .where(OperateurIndustrielORM.is_active.is_(True))
        .group_by(OperateurIndustrielORM.province)
        .order_by(func.count().desc())
    ).all()
    return _bucket_small([{"province": p, "total": int(n)} for p, n in rows], "province")


def _yearly_rows(db: Session) -> list[dict[str, Any]]:
    """Agrege les ATIs par annee de soumission directement en SQL."""
    annee = func.extract("year", AgrementTechniqueIndustrielORM.date_soumission).label("annee")
    rows = db.execute(
        select(
            annee,
            func.count().label("soumis"),
            func.sum(case((AgrementTechniqueIndustrielORM.statut == "approuve", 1), else_=0)).label("approuve"),
            func.sum(case((AgrementTechniqueIndustrielORM.statut == "rejete", 1), else_=0)).label("rejete"),
        )
        .group_by(annee)
        .order_by(annee)
    ).all()
    return [
        {"annee": int(a), "soumis": int(s), "approuve": int(ap or 0), "rejete": int(rj or 0)} for a, s, ap, rj in rows
    ]


def _delai_moyen_jours(db: Session) -> float | None:
    """Delai moyen (en jours) entre soumission et decision, calcule en SQL."""
    if db.get_bind().dialect.name == "postgresql":
        duration_days = (
            func.extract(
                "epoch",
                AgrementTechniqueIndustrielORM.date_decision - AgrementTechniqueIndustrielORM.date_soumission,
            )
            / 86400.0
        )
    else:
        duration_days = func.julianday(AgrementTechniqueIndustrielORM.date_decision) - func.julianday(
            AgrementTechniqueIndustrielORM.date_soumission
        )
    avg = db.execute(
        select(func.avg(duration_days)).where(AgrementTechniqueIndustrielORM.date_decision.is_not(None))
    ).scalar()
    if avg is None:
        return None
    try:
        return round(float(avg), 1)
    except (TypeError, ValueError):
        return None


def _compute_totaux(db: Session) -> dict[str, int]:
    return {
        "operateurs_actifs": _count(
            db,
            select(func.count())
            .select_from(OperateurIndustrielORM)
            .where(OperateurIndustrielORM.deleted_at.is_(None))
            .where(OperateurIndustrielORM.is_active.is_(True)),
        ),
        "atis_total": _count(db, select(func.count()).select_from(AgrementTechniqueIndustrielORM)),
        "atis_approuves": _count(
            db,
            select(func.count())
            .select_from(AgrementTechniqueIndustrielORM)
            .where(AgrementTechniqueIndustrielORM.statut == "approuve"),
        ),
        "atis_en_cours": _count(
            db,
            select(func.count())
            .select_from(AgrementTechniqueIndustrielORM)
            .where(AgrementTechniqueIndustrielORM.statut.notin_(_TERMINAL)),
        ),
        "inspections_total": _count(db, select(func.count()).select_from(InspectionConformiteORM)),
        "inspections_conformes": _count(
            db,
            select(func.count())
            .select_from(InspectionConformiteORM)
            .where(InspectionConformiteORM.statut_conformite == "conforme"),
        ),
    }


@router.get("/stats", summary="Statistiques agregees publiques")
async def public_stats(
    request: Request,
    db: Session = Depends(get_db),
    _rl: None = Depends(_rate_limit_public),
) -> dict[str, Any]:
    """Indicateurs publics agreges, anonymises (k=5), caches 5 minutes."""
    cached = await cache.get("open_data:stats")
    if cached:
        return cached

    totaux = _compute_totaux(db)
    inspections_total = totaux["inspections_total"]
    taux_conformite = (
        round(100.0 * totaux["inspections_conformes"] / inspections_total, 1) if inspections_total else None
    )
    atis_decides = _count(
        db,
        select(func.count())
        .select_from(AgrementTechniqueIndustrielORM)
        .where(AgrementTechniqueIndustrielORM.statut.in_(["approuve", "rejete"])),
    )
    taux_approbation = round(100.0 * totaux["atis_approuves"] / atis_decides, 1) if atis_decides else None

    payload = {
        "generated_at": now_utc().isoformat(),
        "totaux": totaux,
        "indicateurs": {
            "delai_moyen_jours": _delai_moyen_jours(db),
            "taux_approbation_pct": taux_approbation,
            "taux_conformite_inspections_pct": taux_conformite,
        },
        "repartitions": {
            "par_secteur": _sector_rows(db),
            "par_province": _province_rows(db),
            "par_annee": _yearly_rows(db),
        },
        "licence": "Open Data Gabon · donnees publiques agregees",
        "source": "Plateforme Nationale de Pilotage Industriel (PNPI)",
    }

    await cache.set("open_data:stats", payload, ttl=_CACHE_TTL)
    return payload


@router.get("/sectors", summary="Liste des secteurs avec volume d'ATI")
async def public_sectors(
    db: Session = Depends(get_db),
    _rl: None = Depends(_rate_limit_public),
) -> list[dict[str, Any]]:
    cached = await cache.get("open_data:sectors")
    if cached:
        return cached
    rows = _sector_rows(db)
    await cache.set("open_data:sectors", rows, ttl=_CACHE_TTL)
    return rows


@router.get("/provinces", summary="Liste des provinces avec volume d'operateurs")
async def public_provinces(
    db: Session = Depends(get_db),
    _rl: None = Depends(_rate_limit_public),
) -> list[dict[str, Any]]:
    cached = await cache.get("open_data:provinces")
    if cached:
        return cached
    rows = _province_rows(db)
    await cache.set("open_data:provinces", rows, ttl=_CACHE_TTL)
    return rows
