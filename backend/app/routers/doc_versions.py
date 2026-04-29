"""PNPI · Versioning des documents ATI."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..core.auth import User, get_current_user
from ..database import get_db
from ..models.pnpi import AgrementTechniqueIndustrielORM, DocumentVersionORM
from .ati import check_ati_access

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.get("/ati/{ati_id}/versions")
async def get_document_versions(
    ati_id: str,
    document_id: str = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all document versions for an ATI."""
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(404, "ATI introuvable.")
    check_ati_access(ati, current_user)

    query = select(DocumentVersionORM).where(DocumentVersionORM.ati_id == ati_id)
    if document_id:
        query = query.where(DocumentVersionORM.document_id == document_id)

    versions = (
        db.execute(query.order_by(DocumentVersionORM.document_id, DocumentVersionORM.version.desc())).scalars().all()
    )

    return {
        "versions": [
            {
                "id": v.id,
                "document_id": v.document_id,
                "version": v.version,
                "filename": v.filename,
                "file_size": v.file_size,
                "uploaded_by": v.uploaded_by,
                "comment": v.comment,
                "created_at": v.created_at.isoformat(),
            }
            for v in versions
        ]
    }


@router.post("/ati/{ati_id}/upload-version")
async def upload_document_version(
    ati_id: str,
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Record a new version of a document."""
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(404, "ATI introuvable.")
    check_ati_access(ati, current_user)

    document_id = data.get("document_id") or str(uuid.uuid4())

    # Get latest version number
    latest = (
        db.execute(
            select(func.max(DocumentVersionORM.version)).where(DocumentVersionORM.document_id == document_id)
        ).scalar()
        or 0
    )

    version = DocumentVersionORM(
        id=str(uuid.uuid4()),
        document_id=document_id,
        ati_id=ati_id,
        version=latest + 1,
        filename=data.get("filename", "document.pdf"),
        file_size=data.get("file_size"),
        uploaded_by=current_user.username,
        comment=data.get("comment", ""),
    )
    db.add(version)
    db.commit()

    return {"status": "ok", "id": version.id, "version": version.version, "document_id": document_id}
