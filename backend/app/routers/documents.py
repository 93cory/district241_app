"""PNPI — Gestion des documents joints aux dossiers ATI."""
from __future__ import annotations

import os
import uuid
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..core.auth import Role, User, require_roles
from ..core.audit import write_audit_event
from ..database import get_db, now_utc
from ..models.pnpi import AgrementTechniqueIndustrielORM, DocumentDossierORM

router = APIRouter(prefix="/pnpi", tags=["Documents"])

UPLOAD_DIR = Path(os.getenv("PNPI_UPLOAD_DIR", "uploads/ati"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_CONTENT_TYPES = {
    "application/pdf", "image/jpeg", "image/png",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
TYPE_DOCUMENT_VALUES = {"statuts", "bilan", "plan_site", "certification", "autre"}


class DocumentRead(BaseModel):
    id: str
    ati_id: str
    nom_fichier: str
    type_document: str
    taille_octets: int
    uploaded_at: str
    uploaded_by: str

    class Config:
        from_attributes = True


def _to_doc_read(doc: DocumentDossierORM) -> DocumentRead:
    return DocumentRead(
        id=doc.id,
        ati_id=doc.ati_id,
        nom_fichier=doc.nom_fichier,
        type_document=doc.type_document,
        taille_octets=doc.taille_octets,
        uploaded_at=doc.uploaded_at.isoformat(),
        uploaded_by=doc.uploaded_by,
    )


@router.get("/ati/{ati_id}/documents", response_model=List[DocumentRead])
async def list_ati_documents(
    ati_id: str,
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)),
    db: Session = Depends(get_db),
) -> List[DocumentRead]:
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(status_code=404, detail="ATI introuvable.")
    docs = db.execute(
        select(DocumentDossierORM)
        .where(DocumentDossierORM.ati_id == ati_id)
        .order_by(DocumentDossierORM.uploaded_at.desc())
    ).scalars().all()
    return [_to_doc_read(d) for d in docs]


@router.post("/ati/{ati_id}/documents", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
async def upload_ati_document(
    ati_id: str,
    file: UploadFile = File(...),
    type_document: str = Form(default="autre"),
    current_user: User = Depends(require_roles(Role.admin, Role.directeur, Role.instructeur, Role.operateur)),
    db: Session = Depends(get_db),
) -> DocumentRead:
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(status_code=404, detail="ATI introuvable.")
    if type_document not in TYPE_DOCUMENT_VALUES:
        raise HTTPException(status_code=422, detail=f"type_document doit etre parmi: {TYPE_DOCUMENT_VALUES}")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail=f"Fichier trop volumineux. Maximum: {MAX_FILE_SIZE // 1024 // 1024} MB")

    doc_id = f"DOC-{uuid.uuid4().hex[:12].upper()}"
    ext = Path(file.filename or "file.bin").suffix.lower()
    stored_name = f"{doc_id}{ext}"
    ati_dir = UPLOAD_DIR / ati_id
    ati_dir.mkdir(parents=True, exist_ok=True)
    file_path = ati_dir / stored_name
    file_path.write_bytes(content)

    doc = DocumentDossierORM(
        id=doc_id,
        ati_id=ati_id,
        nom_fichier=file.filename or stored_name,
        type_document=type_document,
        taille_octets=len(content),
        chemin_stockage=str(file_path),
        uploaded_at=now_utc(),
        uploaded_by=current_user.username,
    )
    db.add(doc)
    write_audit_event(db, actor=current_user.username, action="document.upload", target=doc_id, details=f"ati={ati_id}; file={file.filename}; type={type_document}")
    db.commit()
    db.refresh(doc)
    return _to_doc_read(doc)


@router.get("/documents/{doc_id}/download")
async def download_document(
    doc_id: str,
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur, Role.operateur)),
    db: Session = Depends(get_db),
) -> FileResponse:
    doc = db.get(DocumentDossierORM, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document introuvable.")
    file_path = Path(doc.chemin_stockage)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Fichier physique introuvable sur le serveur.")
    return FileResponse(path=str(file_path), filename=doc.nom_fichier, media_type="application/octet-stream")


@router.delete("/documents/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    doc_id: str,
    current_user: User = Depends(require_roles(Role.admin, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
) -> Response:
    doc = db.get(DocumentDossierORM, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document introuvable.")
    file_path = Path(doc.chemin_stockage)
    if file_path.exists():
        file_path.unlink()
    db.delete(doc)
    write_audit_event(db, actor=current_user.username, action="document.delete", target=doc_id, details=f"ati={doc.ati_id}; file={doc.nom_fichier}")
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
