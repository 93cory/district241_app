"""PNPI · Moteur de recommandation de decision ATI.

Analyse l'historique des decisions similaires pour recommander
approuver ou rejeter un ATI. Pas de ML lourd · approche statistique
basee sur des features simples.
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


def recommend_decision(db: Session, ati_id: str) -> dict:
    """Recommend approve/reject with confidence based on similar past decisions."""
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        return {"error": "ATI introuvable"}

    op = ati.operateur
    now = now_utc()

    # Collect features for this ATI
    features = _extract_features(db, ati, op, now)

    # Find similar decided ATIs
    all_decided = (
        db.execute(
            select(AgrementTechniqueIndustrielORM).where(
                AgrementTechniqueIndustrielORM.statut.in_(["approuve", "rejete"]),
                AgrementTechniqueIndustrielORM.id != ati_id,
            )
        )
        .scalars()
        .all()
    )

    if len(all_decided) < 5:
        return {
            "recommendation": "indetermine",
            "confidence": 0,
            "reason": "Pas assez de donnees historiques (minimum 5 decisions).",
            "factors": features,
        }

    # Score similarity and compute weighted vote
    approve_votes = 0
    reject_votes = 0
    total_weight = 0
    similar_cases = []

    for past in all_decided:
        past_op = past.operateur
        past_features = _extract_features(db, past, past_op, now)
        similarity = _compute_similarity(features, past_features)

        if similarity < 0.3:
            continue

        weight = similarity
        if past.statut == "approuve":
            approve_votes += weight
        else:
            reject_votes += weight
        total_weight += weight

        if similarity >= 0.5:
            similar_cases.append(
                {
                    "numero_ati": past.numero_ati,
                    "statut": past.statut,
                    "secteur": past.secteur,
                    "similarity": round(similarity * 100),
                }
            )

    if total_weight == 0:
        return {
            "recommendation": "indetermine",
            "confidence": 0,
            "reason": "Aucun dossier similaire trouve.",
            "factors": features,
        }

    approve_pct = approve_votes / total_weight * 100
    reject_pct = reject_votes / total_weight * 100

    if approve_pct >= 65:
        rec = "approuver"
        confidence = round(approve_pct)
        reason = f"{confidence}% des dossiers similaires ont ete approuves."
    elif reject_pct >= 65:
        rec = "rejeter"
        confidence = round(reject_pct)
        reason = f"{confidence}% des dossiers similaires ont ete rejetes."
    else:
        rec = "examen_approfondi"
        confidence = round(max(approve_pct, reject_pct))
        reason = f"Decision partagee ({round(approve_pct)}% appro. / {round(reject_pct)}% rejet). Examen approfondi recommande."

    # Additional rules-based checks
    warnings = []
    if features.get("operator_rejection_rate", 0) > 50:
        warnings.append("Taux de rejet eleve pour cet operateur.")
    if features.get("checklist_pct", 0) < 70:
        warnings.append("Checklist incomplete (< 70%).")
    if features.get("last_inspection") == "non_conforme":
        warnings.append("Derniere inspection non conforme.")
    if features.get("sla_pct", 0) > 90:
        warnings.append("SLA proche de l'echeance.")

    return {
        "recommendation": rec,
        "confidence": confidence,
        "reason": reason,
        "approve_pct": round(approve_pct, 1),
        "reject_pct": round(reject_pct, 1),
        "warnings": warnings,
        "similar_cases": sorted(similar_cases, key=lambda c: -c["similarity"])[:5],
        "factors": features,
    }


def _extract_features(db, ati, op, now) -> dict:
    """Extract comparable features from an ATI."""
    features = {
        "secteur": ati.secteur,
        "sla_jours": ati.sla_jours,
    }

    if op:
        # Operator history
        past = (
            db.execute(
                select(AgrementTechniqueIndustrielORM).where(
                    AgrementTechniqueIndustrielORM.operateur_id == op.id,
                    AgrementTechniqueIndustrielORM.statut.in_(["approuve", "rejete"]),
                )
            )
            .scalars()
            .all()
        )
        total = len(past)
        rejected = sum(1 for a in past if a.statut == "rejete")
        features["operator_past_atis"] = total
        features["operator_rejection_rate"] = round(rejected / max(total, 1) * 100, 1)
        features["province"] = op.province or ""

        # Latest inspection
        insp = (
            db.execute(
                select(InspectionConformiteORM)
                .where(InspectionConformiteORM.operateur_id == op.id)
                .order_by(InspectionConformiteORM.date_inspection.desc())
            )
            .scalars()
            .first()
        )
        features["last_inspection"] = insp.statut_conformite if insp else "none"
        features["has_inspection"] = insp is not None
    else:
        features["operator_past_atis"] = 0
        features["operator_rejection_rate"] = 0
        features["province"] = ""
        features["last_inspection"] = "none"
        features["has_inspection"] = False

    # Checklist
    items = db.execute(select(ATIChecklistItemORM).where(ATIChecklistItemORM.ati_id == ati.id)).scalars().all()
    if items:
        features["checklist_pct"] = round(sum(1 for i in items if i.is_checked) / len(items) * 100, 1)
    else:
        features["checklist_pct"] = 0

    # Age
    features["age_jours"] = (now.date() - ati.date_soumission.date()).days
    features["sla_pct"] = round(features["age_jours"] / ati.sla_jours * 100, 1)

    return features


def _compute_similarity(f1: dict, f2: dict) -> float:
    """Compute similarity between two feature dicts (0-1)."""
    score = 0
    weights = 0

    # Same sector = strong signal
    if f1.get("secteur") == f2.get("secteur"):
        score += 3
    weights += 3

    # Same province
    if f1.get("province") == f2.get("province") and f1.get("province"):
        score += 1
    weights += 1

    # Similar operator history
    r1 = f1.get("operator_rejection_rate", 0)
    r2 = f2.get("operator_rejection_rate", 0)
    rate_diff = abs(r1 - r2)
    score += max(0, 2 - rate_diff / 25)
    weights += 2

    # Similar inspection status
    if f1.get("last_inspection") == f2.get("last_inspection"):
        score += 2
    weights += 2

    # Similar checklist completeness
    c1 = f1.get("checklist_pct", 0)
    c2 = f2.get("checklist_pct", 0)
    score += max(0, 1 - abs(c1 - c2) / 50)
    weights += 1

    return score / weights if weights else 0
