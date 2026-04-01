"""File upload validation — size limits and MIME type checking."""
from __future__ import annotations

import logging
import os
from typing import Set

from fastapi import HTTPException, UploadFile, status

logger = logging.getLogger("pnpi.uploads")

# Max file sizes in bytes
MAX_DOCUMENT_SIZE = int(os.getenv("PNPI_MAX_UPLOAD_MB", "10")) * 1024 * 1024  # 10 MB default
MAX_PHOTO_SIZE = 5 * 1024 * 1024  # 5 MB

# Allowed MIME types per category
ALLOWED_DOCUMENT_TYPES: Set[str] = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
    "text/plain",
}

ALLOWED_IMAGE_TYPES: Set[str] = {
    "image/jpeg",
    "image/png",
    "image/webp",
}

# Dangerous file extensions (always blocked)
BLOCKED_EXTENSIONS: Set[str] = {
    ".exe", ".bat", ".cmd", ".com", ".msi", ".scr", ".pif",
    ".js", ".vbs", ".wsf", ".ps1", ".sh", ".php", ".py",
    ".dll", ".sys", ".cpl", ".hta", ".inf",
}


async def validate_document(file: UploadFile, max_size: int = MAX_DOCUMENT_SIZE) -> bytes:
    """Validate and read a document upload. Returns file content bytes."""
    _check_filename(file.filename)
    content = await file.read()
    _check_size(content, max_size, file.filename)
    _check_mime(file.content_type, ALLOWED_DOCUMENT_TYPES, file.filename)
    return content


async def validate_image(file: UploadFile, max_size: int = MAX_PHOTO_SIZE) -> bytes:
    """Validate and read an image upload. Returns file content bytes."""
    _check_filename(file.filename)
    content = await file.read()
    _check_size(content, max_size, file.filename)
    _check_mime(file.content_type, ALLOWED_IMAGE_TYPES, file.filename)
    return content


def _check_filename(filename: str | None) -> None:
    if not filename:
        raise HTTPException(status_code=400, detail="Nom de fichier requis.")

    # Check extension
    ext = os.path.splitext(filename)[1].lower()
    if ext in BLOCKED_EXTENSIONS:
        logger.warning("Blocked upload attempt: %s (extension: %s)", filename, ext)
        raise HTTPException(
            status_code=400,
            detail=f"Type de fichier non autorise: {ext}",
        )

    # Check for path traversal
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Nom de fichier invalide.")


def _check_size(content: bytes, max_size: int, filename: str | None) -> None:
    if len(content) > max_size:
        max_mb = round(max_size / (1024 * 1024), 1)
        actual_mb = round(len(content) / (1024 * 1024), 1)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Fichier trop volumineux: {actual_mb} Mo (max {max_mb} Mo).",
        )
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Fichier vide.")


def _check_mime(content_type: str | None, allowed: Set[str], filename: str | None) -> None:
    if not content_type or content_type not in allowed:
        types_str = ", ".join(sorted(t.split("/")[1] for t in allowed))
        raise HTTPException(
            status_code=400,
            detail=f"Type de fichier non autorise ({content_type}). Types acceptes: {types_str}.",
        )
