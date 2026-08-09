"""PNPI · Gestion des documents joints aux dossiers ATI."""

from __future__ import annotations

import os
import uuid
from collections import Counter, defaultdict
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.audit import write_audit_event
from ..core.auth import Role, User, require_roles
from ..core.storage import get_storage
from ..core.upload_validation import BLOCKED_EXTENSIONS
from ..database import get_db, now_utc
from ..models.pnpi import AgrementTechniqueIndustrielORM, DocumentDossierORM, DocumentVersionORM, OperateurIndustrielORM
from .ati import _required_docs_for_ati, check_ati_access

router = APIRouter(prefix="/pnpi", tags=["Documents"])

UPLOAD_DIR_NAME = os.getenv("PNPI_UPLOAD_DIR", "uploads/ati")


def _storage():
    """Backend de stockage actif (local ou S3/MinIO selon
    PNPI_STORAGE_BACKEND). cf `core/storage.py` — dette D-001."""
    return get_storage(UPLOAD_DIR_NAME)


MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
TYPE_DOCUMENT_VALUES = {"statuts", "bilan", "plan_site", "certification", "autre"}
_TERMINAL_STATUTS = {"approuve", "rejete", "expire"}
SENSITIVE_DOCUMENT_TYPES = {"statuts", "bilan", "certification"}


class DocumentRead(BaseModel):
    id: str
    ati_id: str
    nom_fichier: str
    type_document: str
    taille_octets: int
    uploaded_at: str
    uploaded_by: str

    model_config = ConfigDict(from_attributes=True)


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


def _status_for(score: int, warn: int = 75, critical: int = 50) -> str:
    if score >= warn:
        return "ok"
    if score >= critical:
        return "warning"
    return "critical"


def _document_classification(type_document: str) -> str:
    if type_document in {"statuts", "bilan"}:
        return "confidentiel"
    if type_document == "certification":
        return "officiel"
    if type_document == "plan_site":
        return "sensible"
    return "interne"


@router.get("/documents/cockpit", summary="Cockpit national du coffre documentaire PNPI")
async def documents_cockpit(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    """Vue transverse du coffre documentaire.

    Cette route donne une lecture de gouvernance : pieces jointes, couverture
    des dossiers ATI, documents sensibles, versioning, orphelins et actions
    de remédiation. Elle ne lit pas le contenu des fichiers.
    """

    docs = db.execute(select(DocumentDossierORM)).scalars().all()
    atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
    operators = {
        op.id: op
        for op in db.execute(select(OperateurIndustrielORM).where(OperateurIndustrielORM.deleted_at.is_(None)))
        .scalars()
        .all()
    }
    versions = db.execute(select(DocumentVersionORM)).scalars().all()

    ati_ids = {ati.id for ati in atis}
    docs_by_ati: dict[str, list[DocumentDossierORM]] = defaultdict(list)
    by_type = Counter()
    by_classification = Counter()
    by_uploader = Counter()
    total_size = 0
    missing_by_type = Counter()
    dossier_summaries: list[dict[str, object]] = []

    for doc in docs:
        docs_by_ati[doc.ati_id].append(doc)
        by_type[doc.type_document] += 1
        by_classification[_document_classification(doc.type_document)] += 1
        by_uploader[doc.uploaded_by] += 1
        total_size += doc.taille_octets or 0

    complete_atis = 0
    locked_evidence = 0
    for ati in atis:
        required = _required_docs_for_ati(ati, db)
        present = {doc.type_document for doc in docs_by_ati.get(ati.id, [])}
        missing = sorted(required - present)
        for item in missing:
            missing_by_type[item] += 1
        if not missing:
            complete_atis += 1
        if ati.statut in _TERMINAL_STATUTS and docs_by_ati.get(ati.id):
            locked_evidence += 1
        if missing or ati.statut in {"en_validation", "approuve"}:
            op = operators.get(ati.operateur_id)
            dossier_summaries.append(
                {
                    "ati_id": ati.id,
                    "numero_ati": ati.numero_ati,
                    "operateur": op.raison_sociale if op else ati.operateur_id,
                    "statut": ati.statut,
                    "type_demande": ati.type_demande,
                    "documents": len(docs_by_ati.get(ati.id, [])),
                    "required": sorted(required),
                    "missing": missing,
                    "preuve_verrouillee": ati.statut in _TERMINAL_STATUTS,
                }
            )

    orphan_docs = [doc for doc in docs if doc.ati_id not in ati_ids]
    physical_missing = [doc for doc in docs if doc.chemin_stockage and not _storage().exists(doc.chemin_stockage)]
    documents_with_versions = {version.document_id for version in versions}
    versioned_docs = sum(1 for doc in docs if doc.id in documents_with_versions)
    coverage_score = round((complete_atis / max(len(atis), 1)) * 100) if atis else 100
    integrity_score = (
        round(((len(docs) - len(orphan_docs) - len(physical_missing)) / max(len(docs), 1)) * 100) if docs else 100
    )
    version_score = round((versioned_docs / max(len(docs), 1)) * 100) if docs else 100
    preservation_score = round(
        (locked_evidence / max(len([ati for ati in atis if ati.statut in _TERMINAL_STATUTS]), 1)) * 100
    )
    global_score = round(
        (coverage_score * 0.35) + (integrity_score * 0.3) + (version_score * 0.15) + (preservation_score * 0.2)
    )

    return {
        "generated_at": now_utc().isoformat(),
        "score_coffre": global_score,
        "grade": "A" if global_score >= 90 else "B" if global_score >= 75 else "C" if global_score >= 60 else "D",
        "stats": {
            "documents": len(docs),
            "atis": len(atis),
            "atis_complets": complete_atis,
            "taille_totale_mo": round(total_size / (1024 * 1024), 2),
            "versions": len(versions),
            "documents_versionnes": versioned_docs,
            "documents_orphelins": len(orphan_docs),
            "fichiers_physiques_manquants": len(physical_missing),
            "preuves_verrouillees": locked_evidence,
        },
        "scores": [
            {
                "label": "Couverture des pièces requises",
                "score": coverage_score,
                "status": _status_for(coverage_score, 80, 50),
                "description": f"{complete_atis}/{len(atis)} ATI disposent de toutes les pièces attendues selon le type de demande.",
            },
            {
                "label": "Intégrité de rattachement",
                "score": integrity_score,
                "status": _status_for(integrity_score, 95, 80),
                "description": "Les documents doivent être rattachés à une ATI existante et à un fichier physique disponible.",
            },
            {
                "label": "Versioning documentaire",
                "score": version_score,
                "status": _status_for(version_score, 60, 25),
                "description": f"{versioned_docs}/{len(docs)} documents disposent d'au moins une trace de version.",
            },
            {
                "label": "Préservation des preuves",
                "score": preservation_score,
                "status": _status_for(preservation_score, 80, 50),
                "description": "Les dossiers décidés conservent leurs pièces comme preuves administratives non supprimables.",
            },
        ],
        "par_type": [{"type_document": key, "count": value} for key, value in by_type.most_common()],
        "par_classification": [
            {"classification": key, "count": value} for key, value in by_classification.most_common()
        ],
        "pieces_manquantes": [{"type_document": key, "count": value} for key, value in missing_by_type.most_common()],
        "top_uploadeurs": [{"username": key, "count": value} for key, value in by_uploader.most_common(8)],
        "dossiers_prioritaires": sorted(
            dossier_summaries,
            key=lambda item: (len(item["missing"]), item["statut"] in {"en_validation", "approuve"}),
            reverse=True,
        )[:12],
        "anomalies": [
            {
                "severity": "critical",
                "title": "Documents orphelins",
                "count": len(orphan_docs),
                "detail": "Documents rattachés à une ATI inexistante.",
                "action": "Réindexer ou placer en quarantaine documentaire.",
            },
            {
                "severity": "critical",
                "title": "Fichiers physiques manquants",
                "count": len(physical_missing),
                "detail": "Métadonnées présentes mais fichier absent du stockage.",
                "action": "Restaurer depuis sauvegarde ou marquer comme preuve indisponible.",
            },
            {
                "severity": "warning",
                "title": "Pièces requises manquantes",
                "count": sum(missing_by_type.values()),
                "detail": "Écart entre les règles ATI et les documents déposés.",
                "action": "Notifier les opérateurs ou demander les compléments.",
            },
        ],
        "principes": [
            "Un document n'est une preuve que s'il est rattaché, daté, typé et traçable.",
            "Les pièces sensibles doivent rester accessibles uniquement aux rôles habilités.",
            "Les dossiers décidés conservent leurs preuves : suppression bloquée côté API.",
            "Le versioning permet de comprendre l'évolution d'un dossier sans perdre l'historique.",
        ],
        "lecture_executive": (
            "Le coffre documentaire PNPI consolide les pièces ATI et leurs preuves de dépôt. "
            "Le cockpit mesure la complétude, l'intégrité, le versioning et les anomalies avant décision ou archivage."
        ),
    }


@router.get("/ati/{ati_id}/documents", response_model=list[DocumentRead])
async def list_ati_documents(
    ati_id: str,
    current_user: User = Depends(
        require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur, Role.operateur)
    ),
    db: Session = Depends(get_db),
) -> list[DocumentRead]:
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(status_code=404, detail="ATI introuvable.")
    check_ati_access(ati, current_user)
    docs = (
        db.execute(
            select(DocumentDossierORM)
            .where(DocumentDossierORM.ati_id == ati_id)
            .order_by(DocumentDossierORM.uploaded_at.desc())
        )
        .scalars()
        .all()
    )
    return [_to_doc_read(d) for d in docs]


@router.get("/ati/{ati_id}/documents/summary", summary="Resume des documents d'un ATI")
async def ati_documents_summary(
    ati_id: str,
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    """Resume: nombre de docs par type, taille totale, dernier upload."""
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(status_code=404, detail="ATI introuvable.")

    docs = db.execute(select(DocumentDossierORM).where(DocumentDossierORM.ati_id == ati_id)).scalars().all()

    by_type: dict[str, int] = {}
    total_size = 0
    last_upload = None

    for d in docs:
        by_type[d.type_document] = by_type.get(d.type_document, 0) + 1
        total_size += d.taille_octets
        if last_upload is None or d.uploaded_at > last_upload:
            last_upload = d.uploaded_at

    # Required document types for a complete dossier
    required_types = {"statuts", "bilan", "plan_site", "certification"}
    present_types = set(by_type.keys())
    missing = sorted(required_types - present_types)

    return {
        "ati_id": ati_id,
        "total_documents": len(docs),
        "par_type": by_type,
        "taille_totale_mo": round(total_size / (1024 * 1024), 2),
        "dernier_upload": last_upload.isoformat() if last_upload else None,
        "types_manquants": missing,
        "dossier_complet": len(missing) == 0,
    }


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
    check_ati_access(ati, current_user)
    if ati.statut in _TERMINAL_STATUTS:
        raise HTTPException(
            status_code=422,
            detail=f"Impossible d'uploader un document sur un ATI en statut terminal ({ati.statut}).",
        )
    if type_document not in TYPE_DOCUMENT_VALUES:
        raise HTTPException(status_code=422, detail=f"type_document doit etre parmi: {TYPE_DOCUMENT_VALUES}")

    # Validation filename: extensions executables bloquees, pas de path traversal.
    filename_raw = (file.filename or "").strip()
    if not filename_raw:
        raise HTTPException(status_code=400, detail="Nom de fichier requis.")
    ext = Path(filename_raw).suffix.lower()
    if ext in BLOCKED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Type de fichier non autorise: {ext}")
    if ".." in filename_raw or "/" in filename_raw or "\\" in filename_raw:
        raise HTTPException(status_code=400, detail="Nom de fichier invalide.")
    # Validation MIME: limiter aux types attendus (PDF, Office, images).
    if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Type MIME non autorise ({file.content_type}). Types acceptes: PDF, DOC, DOCX, JPEG, PNG.",
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413, detail=f"Fichier trop volumineux. Maximum: {MAX_FILE_SIZE // 1024 // 1024} MB"
        )

    doc_id = f"DOC-{uuid.uuid4().hex[:12].upper()}"
    stored_name = f"{doc_id}{ext}"
    stored_ref = _storage().save(f"{ati_id}/{stored_name}", content)

    doc = DocumentDossierORM(
        id=doc_id,
        ati_id=ati_id,
        nom_fichier=file.filename or stored_name,
        type_document=type_document,
        taille_octets=len(content),
        chemin_stockage=stored_ref,
        uploaded_at=now_utc(),
        uploaded_by=current_user.username,
    )
    db.add(doc)
    write_audit_event(
        db,
        actor=current_user.username,
        action="document.upload",
        target=doc_id,
        details=f"ati={ati_id}; file={file.filename}; type={type_document}",
    )
    db.commit()
    db.refresh(doc)
    return _to_doc_read(doc)


@router.get("/documents/{doc_id}/download")
async def download_document(
    doc_id: str,
    current_user: User = Depends(
        require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur, Role.operateur)
    ),
    db: Session = Depends(get_db),
) -> Response:
    doc = db.get(DocumentDossierORM, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document introuvable.")
    ati = db.get(AgrementTechniqueIndustrielORM, doc.ati_id)
    if ati:
        check_ati_access(ati, current_user)
    storage = _storage()
    if not storage.exists(doc.chemin_stockage):
        raise HTTPException(status_code=404, detail="Fichier physique introuvable sur le serveur.")
    content = storage.read(doc.chemin_stockage)
    return Response(
        content=content,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{doc.nom_fichier}"'},
    )


@router.delete("/documents/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    doc_id: str,
    current_user: User = Depends(require_roles(Role.admin, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
) -> Response:
    doc = db.get(DocumentDossierORM, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document introuvable.")
    # Bloquer suppression de preuves sur ATI deja signe / decide / expire.
    ati = db.get(AgrementTechniqueIndustrielORM, doc.ati_id)
    if ati and ati.statut in _TERMINAL_STATUTS:
        raise HTTPException(
            status_code=422,
            detail=f"Impossible de supprimer un document d'un ATI en statut terminal ({ati.statut}).",
        )
    _storage().delete(doc.chemin_stockage)
    db.delete(doc)
    write_audit_event(
        db,
        actor=current_user.username,
        action="document.delete",
        target=doc_id,
        details=f"ati={doc.ati_id}; file={doc.nom_fichier}",
    )
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
