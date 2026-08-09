"""PNPI · Migration des documents/photos locaux vers S3/MinIO (dette D-001).

Usage :
    PNPI_S3_ENDPOINT="http://minio:9000" \
    PNPI_S3_ACCESS_KEY="..." \
    PNPI_S3_SECRET_KEY="..." \
    PNPI_S3_DOCUMENTS_BUCKET="pnpi-documents" \
    python backend/scripts/migrate_uploads_to_s3.py

Ce script :
1. Parcourt les documents ATI (`DocumentDossierORM`), photos d'inspection
   (`InspectionPhotoORM`) et photos de rapports terrain (`FieldReportORM`)
   dont la reference de stockage pointe vers un fichier LOCAL (pas deja
   prefixee `s3:`).
2. Uploade le contenu vers le bucket S3/MinIO documents.
3. Met a jour la colonne en base avec la nouvelle reference `s3:...`.
4. Fait de meme pour les signatures electroniques (`uploads/signatures/**`),
   qui n'ont pas de table dediee en base — parcours direct du repertoire
   local (cf `routers/ati.py::_has_decision_signature`).

Idempotent : une ligne/fichier deja migre (reference prefixee `s3:`) est
ignore. Ne supprime PAS les fichiers locaux d'origine — a faire
manuellement apres verification (cf section Nettoyage en bas de fichier).

IMPORTANT — ordre des operations en production
================================================
1. Lancer ce script AVEC `PNPI_STORAGE_BACKEND` encore sur `local` (ou non
   defini) : l'application continue de servir les fichiers depuis le disque
   pendant la migration, aucune interruption de service.
2. Verifier `migrated == 0` au second lancement (tout est migre, script
   idempotent).
3. Seulement alors, basculer `PNPI_STORAGE_BACKEND=s3` (fenetre de
   maintenance courte recommandee pour eviter qu'un upload concurrent
   n'atterisse en local juste avant la bascule).
4. Garder les fichiers locaux quelques semaines avant nettoyage (cf plus
   bas) : filet de securite en cas de probleme sur le nouveau backend.
"""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

import os

from sqlalchemy import select

from app.core.storage import S3Storage
from app.database import SessionLocal
from app.models.core import FieldReportORM
from app.models.pnpi import DocumentDossierORM, InspectionPhotoORM


def _build_target_storage() -> S3Storage:
    endpoint = os.environ.get("PNPI_S3_ENDPOINT", "").strip()
    access_key = os.environ.get("PNPI_S3_ACCESS_KEY", "").strip()
    secret_key = os.environ.get("PNPI_S3_SECRET_KEY", "").strip()
    bucket = os.environ.get("PNPI_S3_DOCUMENTS_BUCKET", "pnpi-documents").strip()
    region = os.environ.get("PNPI_S3_REGION", "us-east-1").strip()
    if not (endpoint and access_key and secret_key):
        print("[FAIL] PNPI_S3_ENDPOINT / PNPI_S3_ACCESS_KEY / PNPI_S3_SECRET_KEY requis.")
        sys.exit(2)
    return S3Storage(endpoint=endpoint, access_key=access_key, secret_key=secret_key, bucket=bucket, region=region)


def _migrate_column(db, model, ref_column: str, key_prefix: str, target: S3Storage) -> tuple[int, int]:
    """Migre toutes les lignes de `model` dont `ref_column` pointe vers un
    fichier local. Retourne (migrated, failed)."""
    migrated = 0
    failed = 0
    rows = db.execute(select(model)).scalars().all()
    for row in rows:
        ref = getattr(row, ref_column, None)
        if not ref or ref.startswith("s3:"):
            continue
        local_path = Path(ref)
        if not local_path.exists():
            continue  # deja signale par les checks d'integrite existants
        try:
            content = local_path.read_bytes()
            new_ref = target.save(f"{key_prefix}/{local_path.name}", content)
            setattr(row, ref_column, new_ref)
            migrated += 1
        except Exception as exc:
            print(f"[ERROR] {model.__name__} {getattr(row, 'id', '?')}: {exc}")
            failed += 1
    return migrated, failed


def _migrate_signatures(target: S3Storage) -> tuple[int, int]:
    """Les signatures n'ont pas de table dediee : parcours direct du
    repertoire local `uploads/signatures/{ati_id}/*.png`."""
    sig_root = Path("uploads/signatures")
    if not sig_root.exists():
        return 0, 0
    migrated = 0
    failed = 0
    for ati_dir in sig_root.iterdir():
        if not ati_dir.is_dir():
            continue
        for sig_file in ati_dir.iterdir():
            if not sig_file.is_file():
                continue
            try:
                target.save(f"signatures/{ati_dir.name}/{sig_file.name}", sig_file.read_bytes())
                migrated += 1
            except Exception as exc:
                print(f"[ERROR] signature {sig_file}: {exc}")
                failed += 1
    return migrated, failed


def main() -> int:
    target = _build_target_storage()
    total_migrated = 0
    total_failed = 0

    with SessionLocal() as db:
        for model, column, prefix in (
            (DocumentDossierORM, "chemin_stockage", "ati"),
            (InspectionPhotoORM, "chemin_stockage", "inspections"),
            (FieldReportORM, "photo_path", "field-reports"),
        ):
            migrated, failed = _migrate_column(db, model, column, prefix, target)
            print(f"[OK] {model.__name__}: migrated={migrated} failed={failed}")
            total_migrated += migrated
            total_failed += failed
        db.commit()

    sig_migrated, sig_failed = _migrate_signatures(target)
    print(f"[OK] signatures: migrated={sig_migrated} failed={sig_failed}")
    total_migrated += sig_migrated
    total_failed += sig_failed

    print(f"[DONE] total migrated={total_migrated} failed={total_failed}")
    print(
        "Fichiers locaux CONSERVES (filet de securite). "
        "A nettoyer manuellement apres verification, une fois PNPI_STORAGE_BACKEND=s3 "
        "confirme stable en production."
    )
    return 0 if total_failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
