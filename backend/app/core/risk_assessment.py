"""PNPI · Evaluation automatique des risques par ATI.

Score de risque composite base sur :
- Historique de l'operateur (rejets precedents, non-conformites)
- Complexite du secteur
- Anciennete de l'operateur
- Completude du dossier
- Charge de travail actuelle du pipeline
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import now_utc
from ..models.pnpi import (
    AgrementTechniqueIndustrielORM,
    ATIChecklistItemORM,
    InspectionConformiteORM,
)

SECTOR_COMPLEXITY = {
    "mines": 0.9,
    "chimie": 0.85,
    "energie": 0.8,
    "btp": 0.6,
    "bois": 0.55,
    "agroalimentaire": 0.5,
    "peche": 0.45,
    "textile": 0.4,
    "autre": 0.3,
}


def assess_risk(db: Session, ati_id: str) -> dict:
    """Compute a risk score (0-100) for an ATI."""
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        return {"error": "ATI introuvable"}

    now = now_utc()
    op = ati.operateur
    factors = []

    # 1. Sector complexity (0-20)
    complexity = SECTOR_COMPLEXITY.get(ati.secteur, 0.5)
    sector_risk = round(complexity * 20)
    factors.append(
        {
            "name": "Complexite sectorielle",
            "score": sector_risk,
            "max": 20,
            "detail": f"Secteur {ati.secteur} · complexite {complexity:.0%}",
        }
    )

    # 2. Operator history (0-25)
    if op:
        past_atis = (
            db.execute(
                select(AgrementTechniqueIndustrielORM).where(
                    AgrementTechniqueIndustrielORM.operateur_id == op.id,
                    AgrementTechniqueIndustrielORM.id != ati_id,
                )
            )
            .scalars()
            .all()
        )
        rejections = sum(1 for a in past_atis if a.statut == "rejete")
        total_past = len(past_atis)

        if total_past == 0:
            history_risk = 15  # New operator = moderate risk
            detail = "Nouvel operateur, pas d'historique"
        elif rejections == 0:
            history_risk = 3
            detail = f"{total_past} ATI(s) precedent(s), aucun rejet"
        else:
            rejection_rate = rejections / total_past
            history_risk = round(rejection_rate * 25)
            detail = f"{rejections}/{total_past} rejets ({rejection_rate:.0%})"
    else:
        history_risk = 20
        detail = "Operateur non lie"
    factors.append({"name": "Historique operateur", "score": history_risk, "max": 25, "detail": detail})

    # 3. Inspection conformity (0-20)
    if op:
        inspections = (
            db.execute(
                select(InspectionConformiteORM)
                .where(InspectionConformiteORM.operateur_id == op.id)
                .order_by(InspectionConformiteORM.date_inspection.desc())
            )
            .scalars()
            .all()
        )

        if not inspections:
            insp_risk = 12  # No inspection = moderate
            detail = "Aucune inspection precedente"
        else:
            latest = inspections[0]
            if latest.statut_conformite == "conforme":
                insp_risk = 2
                detail = "Derniere inspection conforme"
            elif latest.statut_conformite == "partiel":
                insp_risk = 10
                detail = "Derniere inspection partiellement conforme"
            else:
                insp_risk = 18
                detail = "Derniere inspection non conforme"
    else:
        insp_risk = 15
        detail = "Pas de donnees"
    factors.append({"name": "Conformite inspections", "score": insp_risk, "max": 20, "detail": detail})

    # 4. Checklist completeness (0-15)
    checklist_items = (
        db.execute(select(ATIChecklistItemORM).where(ATIChecklistItemORM.ati_id == ati_id)).scalars().all()
    )

    if checklist_items:
        checked = sum(1 for i in checklist_items if i.is_checked)
        pct = checked / len(checklist_items)
        checklist_risk = round((1 - pct) * 15)
        detail = f"{checked}/{len(checklist_items)} items valides ({pct:.0%})"
    else:
        checklist_risk = 10  # No checklist = moderate
        detail = "Checklist non generee"
    factors.append({"name": "Completude dossier", "score": checklist_risk, "max": 15, "detail": detail})

    # 5. Pipeline pressure (0-10)
    in_progress = (
        db.execute(
            select(AgrementTechniqueIndustrielORM).where(
                AgrementTechniqueIndustrielORM.statut.notin_(["approuve", "rejete", "expire"])
            )
        )
        .scalars()
        .all()
    )
    pipeline_load = len(in_progress)
    if pipeline_load > 30:
        pipeline_risk = 10
        detail = f"{pipeline_load} dossiers en cours · charge tres elevee"
    elif pipeline_load > 15:
        pipeline_risk = 6
        detail = f"{pipeline_load} dossiers en cours · charge elevee"
    else:
        pipeline_risk = 2
        detail = f"{pipeline_load} dossiers en cours · charge normale"
    factors.append({"name": "Charge pipeline", "score": pipeline_risk, "max": 10, "detail": detail})

    # 6. SLA pressure (0-10)
    age = (now.date() - ati.date_soumission.date()).days
    sla_pct = age / ati.sla_jours * 100
    if sla_pct >= 100:
        sla_risk = 10
        detail = f"SLA depasse ({age}j / {ati.sla_jours}j)"
    elif sla_pct >= 80:
        sla_risk = 7
        detail = f"SLA a {sla_pct:.0f}% ({age}j / {ati.sla_jours}j)"
    elif sla_pct >= 50:
        sla_risk = 3
        detail = f"SLA a {sla_pct:.0f}%"
    else:
        sla_risk = 1
        detail = f"SLA confortable ({sla_pct:.0f}%)"
    factors.append({"name": "Pression SLA", "score": sla_risk, "max": 10, "detail": detail})

    total = sum(f["score"] for f in factors)
    max_total = sum(f["max"] for f in factors)

    if total >= 70:
        level = "critique"
        color = "#b42318"
    elif total >= 50:
        level = "eleve"
        color = "#e65100"
    elif total >= 30:
        level = "modere"
        color = "#d97706"
    else:
        level = "faible"
        color = "#006233"

    return {
        "ati_id": ati_id,
        "numero_ati": ati.numero_ati,
        "risk_score": total,
        "max_score": max_total,
        "risk_level": level,
        "color": color,
        "factors": factors,
    }
