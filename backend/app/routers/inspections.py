"""PNPI — Endpoints de gestion des inspections de conformité."""
from __future__ import annotations

import os
import uuid
from pathlib import Path
from typing import List, Optional

import io

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse, Response as FastAPIResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..core.auth import Role, User, require_roles
from ..core.audit import write_audit_event
from ..database import get_db, now_utc
from ..models.core import UserAccountORM
from ..models.pnpi import AgrementTechniqueIndustrielORM, InspectionConformiteORM, InspectionPhotoORM, OperateurIndustrielORM
from ..schemas.pnpi import InspectionCreate, InspectionRead

router = APIRouter(prefix="/pnpi", tags=["Inspections"])

PHOTO_UPLOAD_DIR = Path(os.getenv("PNPI_UPLOAD_DIR", "uploads/inspections"))
PHOTO_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

PHOTO_MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
PHOTO_ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
PHOTO_ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


class PhotoRead(BaseModel):
    id: str
    inspection_id: str
    nom_fichier: str
    taille_octets: int
    description: Optional[str] = None
    uploaded_at: str
    uploaded_by: str

    class Config:
        from_attributes = True


def _to_photo_read(photo: InspectionPhotoORM) -> PhotoRead:
    return PhotoRead(
        id=photo.id,
        inspection_id=photo.inspection_id,
        nom_fichier=photo.nom_fichier,
        taille_octets=photo.taille_octets,
        description=photo.description,
        uploaded_at=photo.uploaded_at.isoformat(),
        uploaded_by=photo.uploaded_by,
    )


def _to_inspection_read(insp: InspectionConformiteORM, db: Session) -> InspectionRead:
    op = db.get(OperateurIndustrielORM, insp.operateur_id) if insp.operateur_id else None
    ati = db.get(AgrementTechniqueIndustrielORM, insp.ati_id) if insp.ati_id else None
    user = db.execute(
        select(UserAccountORM).where(UserAccountORM.username == insp.inspecteur_username)
    ).scalar_one_or_none()
    return InspectionRead(
        id=insp.id,
        operateur_id=insp.operateur_id,
        operateur_nom=op.raison_sociale if op else insp.operateur_id,
        ati_id=insp.ati_id,
        ati_numero=ati.numero_ati if ati else None,
        inspecteur_username=insp.inspecteur_username,
        inspecteur_nom=user.full_name if user else insp.inspecteur_username,
        date_inspection=insp.date_inspection,
        statut_conformite=insp.statut_conformite,
        observations=insp.observations,
        mesures_correctives=insp.mesures_correctives,
        latitude=insp.latitude,
        longitude=insp.longitude,
        province=op.province if op else "",
        secteur=op.secteur if op else "",
        created_at=insp.created_at,
    )


@router.get("/inspections", response_model=List[InspectionRead], summary="Lister les inspections de conformite")
async def list_inspections(
    operateur_id: Optional[str] = Query(default=None),
    statut_conformite: Optional[str] = Query(default=None),
    inspecteur_username: Optional[str] = Query(default=None),
    limit: int = Query(default=50, le=200),
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)),
    db: Session = Depends(get_db),
) -> List[InspectionRead]:
    query = select(InspectionConformiteORM)
    if operateur_id:
        query = query.where(InspectionConformiteORM.operateur_id == operateur_id)
    if statut_conformite:
        query = query.where(InspectionConformiteORM.statut_conformite == statut_conformite)
    if inspecteur_username:
        query = query.where(InspectionConformiteORM.inspecteur_username == inspecteur_username)
    query = query.order_by(InspectionConformiteORM.date_inspection.desc()).limit(limit)
    rows = db.execute(query).scalars().all()
    return [_to_inspection_read(r, db) for r in rows]


@router.post("/inspections", response_model=InspectionRead, status_code=status.HTTP_201_CREATED,
             summary="Creer une inspection de conformite")
async def create_inspection(
    payload: InspectionCreate,
    current_user: User = Depends(require_roles(Role.admin, Role.inspecteur, Role.directeur)),
    db: Session = Depends(get_db),
) -> InspectionRead:
    op = db.get(OperateurIndustrielORM, payload.operateur_id)
    if not op:
        raise HTTPException(status_code=404, detail="Operateur introuvable.")

    insp = InspectionConformiteORM(
        id=f"INS-{uuid.uuid4().hex[:12].upper()}",
        operateur_id=payload.operateur_id,
        ati_id=payload.ati_id,
        inspecteur_username=current_user.username,
        date_inspection=payload.date_inspection,
        statut_conformite=payload.statut_conformite,
        observations=payload.observations,
        mesures_correctives=payload.mesures_correctives,
        latitude=payload.latitude,
        longitude=payload.longitude,
        created_at=now_utc(),
    )
    db.add(insp)
    write_audit_event(
        db,
        actor=current_user.username,
        action="inspection.create",
        target=insp.id,
        details=f"operateur={payload.operateur_id}; statut={payload.statut_conformite}",
    )
    db.commit()
    db.refresh(insp)
    return _to_inspection_read(insp, db)


@router.get("/inspections/{inspection_id}", response_model=InspectionRead, summary="Detail d'une inspection")
async def get_inspection(
    inspection_id: str,
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)),
    db: Session = Depends(get_db),
) -> InspectionRead:
    insp = db.get(InspectionConformiteORM, inspection_id)
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection introuvable.")
    return _to_inspection_read(insp, db)


@router.patch("/inspections/{inspection_id}", response_model=InspectionRead, summary="Mettre a jour une inspection")
async def update_inspection(
    inspection_id: str,
    payload: InspectionCreate,
    current_user: User = Depends(require_roles(Role.admin, Role.inspecteur, Role.directeur)),
    db: Session = Depends(get_db),
) -> InspectionRead:
    insp = db.get(InspectionConformiteORM, inspection_id)
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection introuvable.")
    if insp.inspecteur_username != current_user.username and Role.admin.value not in (current_user.roles or []):
        raise HTTPException(status_code=403, detail="Vous n'etes pas l'inspecteur de ce rapport.")
    insp.statut_conformite = payload.statut_conformite
    insp.observations = payload.observations
    insp.mesures_correctives = payload.mesures_correctives
    write_audit_event(db, actor=current_user.username, action="inspection.update", target=insp.id, details=f"statut={payload.statut_conformite}")
    db.commit()
    db.refresh(insp)
    return _to_inspection_read(insp, db)


@router.get("/inspections/{inspection_id}/pdf", summary="Rapport PDF d'inspection")
async def download_inspection_pdf(
    inspection_id: str,
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)),
    db: Session = Depends(get_db),
) -> FastAPIResponse:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    from reportlab.lib.enums import TA_CENTER

    insp = db.get(InspectionConformiteORM, inspection_id)
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection introuvable.")

    op = db.get(OperateurIndustrielORM, insp.operateur_id) if insp.operateur_id else None

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    bleu = colors.HexColor("#003F8F")
    CONF_COLORS_MAP = {"conforme": "#10b981", "non_conforme": "#ef4444", "partiel": "#f59e0b"}
    CONF_LABELS_MAP = {"conforme": "CONFORME", "non_conforme": "NON CONFORME", "partiel": "PARTIEL"}

    story = []
    story.append(Paragraph("REPUBLIQUE GABONAISE", ParagraphStyle("rg", parent=styles["Normal"], alignment=TA_CENTER, fontSize=9, textColor=colors.gray)))
    story.append(Paragraph("Ministere de l'Industrie — PNPI", ParagraphStyle("mi", parent=styles["Normal"], alignment=TA_CENTER, fontSize=9, textColor=bleu)))
    story.append(Spacer(1, 0.3*cm))
    story.append(HRFlowable(width="100%", thickness=2, color=bleu))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph("Rapport d'Inspection de Conformite", ParagraphStyle("title", parent=styles["Title"], textColor=bleu, fontSize=15, spaceAfter=4)))
    story.append(Paragraph(f"Ref. {insp.id}", ParagraphStyle("ref", parent=styles["Normal"], textColor=colors.HexColor("#009440"), fontSize=10, spaceAfter=8)))
    story.append(Spacer(1, 0.4*cm))

    conf_color = colors.HexColor(CONF_COLORS_MAP.get(insp.statut_conformite, "#6b7280"))
    conf_label = CONF_LABELS_MAP.get(insp.statut_conformite, insp.statut_conformite.upper())
    data = [
        ["Resultat", conf_label, "Date inspection", insp.date_inspection.strftime("%d/%m/%Y")],
        ["Inspecteur", insp.inspecteur_username, "Operateur", op.raison_sociale if op else insp.operateur_id],
        ["ATI lie", insp.ati_id or "—", "Province", op.province.replace("_", " ").capitalize() if op else "—"],
    ]
    t = Table(data, colWidths=[4*cm, 5*cm, 4*cm, 4*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f3f4f6")),
        ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#f3f4f6")),
        ("TEXTCOLOR", (1, 0), (1, 0), conf_color),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTNAME", (1, 0), (1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("PADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.6*cm))
    story.append(Paragraph("Observations", ParagraphStyle("sec", parent=styles["Heading2"], textColor=bleu, fontSize=12, spaceBefore=6, spaceAfter=4)))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb")))
    story.append(Paragraph(insp.observations.replace("\n", "<br/>"), ParagraphStyle("obs", parent=styles["Normal"], fontSize=10, spaceAfter=8, leading=16)))
    if insp.mesures_correctives:
        story.append(Paragraph("Mesures Correctives", ParagraphStyle("sec2", parent=styles["Heading2"], textColor=colors.HexColor("#d97706"), fontSize=12, spaceBefore=6, spaceAfter=4)))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb")))
        story.append(Paragraph(insp.mesures_correctives.replace("\n", "<br/>"), ParagraphStyle("mes", parent=styles["Normal"], fontSize=10, spaceAfter=8, leading=16)))
    if insp.latitude and insp.longitude:
        story.append(Paragraph(f"Localisation GPS : {insp.latitude:.5f}N, {insp.longitude:.5f}E", ParagraphStyle("gps", parent=styles["Normal"], fontSize=9, textColor=colors.gray)))
    story.append(Spacer(1, 1*cm))
    story.append(HRFlowable(width="100%", thickness=1, color=bleu))
    from ..database import now_utc as _now
    story.append(Paragraph(
        f"Document genere par la PNPI — {_now().strftime('%d/%m/%Y %H:%M')} UTC",
        ParagraphStyle("footer", parent=styles["Normal"], alignment=TA_CENTER, fontSize=7, textColor=colors.gray)
    ))
    doc.build(story)
    buf.seek(0)
    return FastAPIResponse(
        content=buf.read(),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="inspection_{insp.id}.pdf"'},
    )


# ─── Inspection Photos ──────────────────────────────────────────────────────


@router.get("/inspections/{inspection_id}/photos", response_model=List[PhotoRead], summary="Lister les photos d'une inspection")
async def list_inspection_photos(
    inspection_id: str,
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)),
    db: Session = Depends(get_db),
) -> List[PhotoRead]:
    insp = db.get(InspectionConformiteORM, inspection_id)
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection introuvable.")
    photos = db.execute(
        select(InspectionPhotoORM)
        .where(InspectionPhotoORM.inspection_id == inspection_id)
        .order_by(InspectionPhotoORM.uploaded_at.desc())
    ).scalars().all()
    return [_to_photo_read(p) for p in photos]


@router.post("/inspections/{inspection_id}/photos", response_model=PhotoRead, status_code=status.HTTP_201_CREATED,
             summary="Uploader une photo d'inspection")
async def upload_inspection_photo(
    inspection_id: str,
    file: UploadFile = File(...),
    description: Optional[str] = Form(default=None),
    current_user: User = Depends(require_roles(Role.admin, Role.inspecteur, Role.directeur)),
    db: Session = Depends(get_db),
) -> PhotoRead:
    insp = db.get(InspectionConformiteORM, inspection_id)
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection introuvable.")

    # Validate extension
    ext = Path(file.filename or "photo.bin").suffix.lower()
    if ext not in PHOTO_ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=422,
            detail=f"Type de fichier non autorise. Extensions acceptees: {', '.join(PHOTO_ALLOWED_EXTENSIONS)}",
        )

    # Validate content type
    if file.content_type and file.content_type not in PHOTO_ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"Type MIME non autorise. Types acceptes: {', '.join(PHOTO_ALLOWED_CONTENT_TYPES)}",
        )

    content = await file.read()
    if len(content) > PHOTO_MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Fichier trop volumineux. Maximum: {PHOTO_MAX_FILE_SIZE // 1024 // 1024} MB",
        )

    photo_id = f"PHO-{uuid.uuid4().hex[:12].upper()}"
    stored_name = f"{photo_id}{ext}"
    inspection_dir = PHOTO_UPLOAD_DIR / inspection_id
    inspection_dir.mkdir(parents=True, exist_ok=True)
    file_path = inspection_dir / stored_name
    file_path.write_bytes(content)

    photo = InspectionPhotoORM(
        id=photo_id,
        inspection_id=inspection_id,
        nom_fichier=file.filename or stored_name,
        chemin_stockage=str(file_path),
        taille_octets=len(content),
        description=description,
        uploaded_at=now_utc(),
        uploaded_by=current_user.username,
    )
    db.add(photo)
    write_audit_event(
        db,
        actor=current_user.username,
        action="inspection_photo.upload",
        target=photo_id,
        details=f"inspection={inspection_id}; file={file.filename}",
    )
    db.commit()
    db.refresh(photo)
    return _to_photo_read(photo)


@router.get("/inspections/{inspection_id}/photos/{photo_id}/file", summary="Telecharger le fichier photo")
async def download_inspection_photo(
    inspection_id: str,
    photo_id: str,
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)),
    db: Session = Depends(get_db),
) -> FileResponse:
    photo = db.get(InspectionPhotoORM, photo_id)
    if not photo or photo.inspection_id != inspection_id:
        raise HTTPException(status_code=404, detail="Photo introuvable.")
    file_path = Path(photo.chemin_stockage)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Fichier physique introuvable sur le serveur.")
    return FileResponse(path=str(file_path), filename=photo.nom_fichier, media_type="application/octet-stream")


@router.delete("/inspections/{inspection_id}/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT,
               summary="Supprimer une photo d'inspection")
async def delete_inspection_photo(
    inspection_id: str,
    photo_id: str,
    current_user: User = Depends(require_roles(Role.admin, Role.inspecteur, Role.directeur)),
    db: Session = Depends(get_db),
) -> FastAPIResponse:
    photo = db.get(InspectionPhotoORM, photo_id)
    if not photo or photo.inspection_id != inspection_id:
        raise HTTPException(status_code=404, detail="Photo introuvable.")
    file_path = Path(photo.chemin_stockage)
    if file_path.exists():
        file_path.unlink()
    db.delete(photo)
    write_audit_event(
        db,
        actor=current_user.username,
        action="inspection_photo.delete",
        target=photo_id,
        details=f"inspection={inspection_id}; file={photo.nom_fichier}",
    )
    db.commit()
    return FastAPIResponse(status_code=status.HTTP_204_NO_CONTENT)
