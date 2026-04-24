"""PNPI · Checklists de conformite pour ATI."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.auth import Role, User, get_current_user, require_roles
from ..database import get_db, now_utc
from ..models.pnpi import AgrementTechniqueIndustrielORM, ATIChecklistItemORM

router = APIRouter(prefix="/checklists", tags=["Checklists"])

# Default checklist templates by sector
DEFAULT_ITEMS = {
    "_common": [
        ("Documents", "Formulaire de demande ATI rempli et signe"),
        ("Documents", "Copie du NIF Gabon"),
        ("Documents", "Statuts de l'entreprise"),
        ("Documents", "Registre de commerce (RCCM)"),
        ("Technique", "Description detaillee de l'activite industrielle"),
        ("Technique", "Plan du site / implantation"),
        ("Environnement", "Etude d'impact environnemental"),
        ("Conformite", "Attestation de conformite aux normes en vigueur"),
        ("Finance", "Preuve de capacite financiere"),
    ],
    "bois": [
        ("Specifique", "Permis forestier (CPAET)"),
        ("Specifique", "Plan d'amenagement durable"),
        ("Specifique", "Certificat d'origine legale du bois"),
    ],
    "mines": [
        ("Specifique", "Convention miniere"),
        ("Specifique", "Permis d'exploitation miniere"),
        ("Specifique", "Plan de rehabilitation du site"),
    ],
    "agroalimentaire": [
        ("Specifique", "Agrement sanitaire"),
        ("Specifique", "Certificat HACCP"),
        ("Specifique", "Contrat d'approvisionnement matieres premieres"),
    ],
    "btp": [
        ("Specifique", "Plan de prevention des risques professionnels (PPRP)"),
        ("Specifique", "Qualification BTP et references de chantiers"),
        ("Specifique", "Assurance responsabilite decennale"),
    ],
    "petrole": [
        ("Specifique", "Convention petroliere signee"),
        ("Specifique", "Plan HSE (Health Safety Environment)"),
        ("Specifique", "Plan de prevention pollution maritime (MARPOL)"),
        ("Specifique", "Cautionnement environnemental"),
    ],
    "services": [
        ("Specifique", "Agrement prestataire industriel"),
        ("Specifique", "Liste des equipements / personnel qualifie"),
    ],
    "peche": [
        ("Specifique", "Licence de peche industrielle"),
        ("Specifique", "Plan de gestion des captures"),
        ("Specifique", "Certificat sanitaire des produits halieutiques"),
    ],
}


@router.get("/ati/{ati_id}")
async def get_checklist(
    ati_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = (
        db.execute(
            select(ATIChecklistItemORM)
            .where(ATIChecklistItemORM.ati_id == ati_id)
            .order_by(ATIChecklistItemORM.category, ATIChecklistItemORM.order_index)
        )
        .scalars()
        .all()
    )

    total = len(items)
    checked = sum(1 for i in items if i.is_checked)

    return {
        "total": total,
        "checked": checked,
        "completion_pct": round(checked / total * 100) if total else 0,
        "items": [
            {
                "id": i.id,
                "label": i.label,
                "category": i.category,
                "is_checked": i.is_checked,
                "checked_by": i.checked_by,
                "checked_at": i.checked_at.isoformat() if i.checked_at else None,
                "notes": i.notes,
            }
            for i in items
        ],
    }


@router.post("/ati/{ati_id}/generate")
async def generate_checklist(
    ati_id: str,
    current_user: User = Depends(require_roles(Role.admin, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
):
    """Generate a default checklist based on the ATI's sector."""
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(404, "ATI introuvable.")

    # Check if checklist already exists
    existing = db.execute(select(ATIChecklistItemORM).where(ATIChecklistItemORM.ati_id == ati_id)).scalars().first()
    if existing:
        raise HTTPException(400, "Une checklist existe deja pour cet ATI.")

    items_def = DEFAULT_ITEMS["_common"] + DEFAULT_ITEMS.get(ati.secteur, [])

    for idx, (cat, label) in enumerate(items_def):
        item = ATIChecklistItemORM(
            id=str(uuid.uuid4()),
            ati_id=ati_id,
            label=label,
            category=cat,
            order_index=idx,
        )
        db.add(item)

    db.commit()
    return {"status": "ok", "items_created": len(items_def)}


@router.patch("/items/{item_id}")
async def toggle_checklist_item(
    item_id: str,
    data: dict,
    current_user: User = Depends(require_roles(Role.admin, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
):
    item = db.get(ATIChecklistItemORM, item_id)
    if not item:
        raise HTTPException(404, "Item introuvable.")

    if "is_checked" in data:
        item.is_checked = data["is_checked"]
        item.checked_by = current_user.username if data["is_checked"] else None
        item.checked_at = now_utc() if data["is_checked"] else None
    if "notes" in data:
        item.notes = data["notes"]

    db.commit()
    return {"status": "ok"}
