"""PNPI — Scoring de conformite par operateur industriel."""
from __future__ import annotations

from datetime import timedelta
from typing import Dict, List

from sqlalchemy.orm import Session
from sqlalchemy import select

from ..database import now_utc
from ..models.pnpi import (
    AgrementTechniqueIndustrielORM,
    InspectionConformiteORM,
    OperateurIndustrielORM,
)


def compute_operator_score(db: Session, operateur_id: str) -> Dict:
    """
    Score composite 0-100 pour un operateur.
    Piliers :
    - ATI compliance (30%) : ratio ATI approuves / total
    - Inspection conformity (30%) : resultat derniere inspection
    - Document completeness (15%) : documents joints aux ATI
    - SLA respect (15%) : respect des delais de reponse
    - Activity (10%) : soumissions recentes
    """
    op = db.get(OperateurIndustrielORM, operateur_id)
    if not op:
        return {"error": "Operateur introuvable"}

    now = now_utc()
    year_ago = now - timedelta(days=365)

    # Fetch ATIs
    atis = db.execute(
        select(AgrementTechniqueIndustrielORM).where(
            AgrementTechniqueIndustrielORM.operateur_id == operateur_id
        )
    ).scalars().all()

    # Fetch inspections
    inspections = db.execute(
        select(InspectionConformiteORM).where(
            InspectionConformiteORM.operateur_id == operateur_id
        ).order_by(InspectionConformiteORM.date_inspection.desc())
    ).scalars().all()

    # 1. ATI Compliance (30 pts)
    if atis:
        decided = [a for a in atis if a.statut in {"approuve", "rejete"}]
        approved = sum(1 for a in decided if a.statut == "approuve")
        ati_score = (approved / len(decided) * 30) if decided else 15  # neutral if no decisions
    else:
        ati_score = 0

    # 2. Inspection Conformity (30 pts)
    if inspections:
        latest = inspections[0]
        if latest.statut_conformite == "conforme":
            insp_score = 30
        elif latest.statut_conformite == "partiel":
            insp_score = 15
        else:
            insp_score = 5
    else:
        insp_score = 0  # No inspection = 0

    # 3. Document Completeness (15 pts)
    from ..models.pnpi import DocumentDossierORM
    doc_count = 0
    for ati in atis:
        docs = db.execute(
            select(DocumentDossierORM).where(DocumentDossierORM.ati_id == ati.id)
        ).scalars().all()
        doc_count += len(docs)
    if atis:
        avg_docs = doc_count / len(atis)
        doc_score = min(avg_docs / 3 * 15, 15)  # Target: 3 docs per ATI
    else:
        doc_score = 0

    # 4. SLA Respect (15 pts)
    decided_with_sla = [a for a in atis if a.statut in {"approuve", "rejete"} and a.date_decision]
    if decided_with_sla:
        on_time = sum(
            1 for a in decided_with_sla
            if (a.date_decision.date() - a.date_soumission.date()).days <= a.sla_jours
        )
        sla_score = on_time / len(decided_with_sla) * 15
    else:
        sla_score = 7.5  # neutral

    # 5. Activity (10 pts)
    recent = sum(1 for a in atis if a.date_soumission >= year_ago)
    activity_score = min(recent / 3 * 10, 10)  # Target: 3 submissions/year

    total = round(ati_score + insp_score + doc_score + sla_score + activity_score, 1)

    # Grade
    if total >= 80:
        grade = "A"
        label = "Excellent"
    elif total >= 65:
        grade = "B"
        label = "Bon"
    elif total >= 50:
        grade = "C"
        label = "Moyen"
    elif total >= 35:
        grade = "D"
        label = "Insuffisant"
    else:
        grade = "E"
        label = "Critique"

    return {
        "operateur_id": operateur_id,
        "raison_sociale": op.raison_sociale,
        "score": total,
        "grade": grade,
        "label": label,
        "breakdown": {
            "ati_compliance": {"score": round(ati_score, 1), "max": 30},
            "inspection_conformity": {"score": round(insp_score, 1), "max": 30},
            "document_completeness": {"score": round(doc_score, 1), "max": 15},
            "sla_respect": {"score": round(sla_score, 1), "max": 15},
            "activity": {"score": round(activity_score, 1), "max": 10},
        },
        "stats": {
            "total_atis": len(atis),
            "approved_atis": sum(1 for a in atis if a.statut == "approuve"),
            "inspections_count": len(inspections),
            "latest_inspection": inspections[0].statut_conformite if inspections else None,
            "documents_count": doc_count,
        },
    }


def compute_all_scores(db: Session) -> List[Dict]:
    """Compute scores for all active operators."""
    ops = db.execute(
        select(OperateurIndustrielORM).where(OperateurIndustrielORM.is_active.is_(True))
    ).scalars().all()

    results = []
    for op in ops:
        score_data = compute_operator_score(db, op.id)
        if "error" not in score_data:
            results.append(score_data)

    return sorted(results, key=lambda x: x["score"], reverse=True)
