"""PNPI · Abstraction de stockage des fichiers joints (documents ATI,
photos d'inspection).

Contexte (dette technique D-001)
=================================

`PNPI_UPLOAD_DIR` pointait vers un repertoire local du conteneur, sans
backup automatise : perte du volume Docker = perte de tous les
justificatifs (statuts, bilans, plans de site, photos d'inspection).

Ce module fournit deux backends interchangeables derriere une meme
interface `DocumentStorage` :

- `LocalFilesystemStorage` : comportement historique inchange, backend par
  defaut. Aucune configuration supplementaire requise -> zero regression
  sur les deploiements existants sans MinIO.
- `S3Storage` : stockage objet S3-compatible (MinIO en interne, cf
  `docker-compose.prod.yml`), reutilise les identifiants deja presents
  pour les sauvegardes DB (`scripts/backup_s3.py`) mais un bucket dedie
  (`PNPI_S3_DOCUMENTS_BUCKET`, distinct de `PNPI_S3_BUCKET` = sauvegardes)
  pour ne pas melanger les cycles de vie/retention des deux usages.

Selection du backend
=====================

`PNPI_STORAGE_BACKEND=local` (defaut) ou `s3`. Si `s3` est demande mais que
`boto3` ou les identifiants sont absents, on retombe sur `local` avec un
warning (meme philosophie de degradation gracieuse que `core/cache.py` et
`core/encryption.py`).

Format de reference stockee (`chemin_stockage` en base)
=========================================================

Le call site (routers) ne construit jamais lui-meme le chemin final : il
passe une **cle logique relative** (ex: `f"ati/{ati_id}/{stored_name}"`) a
`save()`, qui retourne la reference a persister telle quelle dans la
colonne `chemin_stockage` / `chemin_fichier`. Cette reference est ensuite
passee telle quelle a `exists()` / `read()` / `delete()` — le call site n'a
jamais a l'interpreter.

- Backend local : la reference est le chemin absolu du fichier (comportement
  historique, compatible avec les lignes existantes en base).
- Backend S3 : la reference est prefixee `s3:` suivie de la cle S3, ce qui
  permet a un meme processus de reconnaitre sans ambiguite quel backend
  utiliser pour lire une reference donnee (utile pendant une migration
  progressive local -> S3, cf `scripts/migrate_uploads_to_s3.py`).
"""

from __future__ import annotations

import logging
import os
from abc import ABC, abstractmethod
from functools import cache
from pathlib import Path

logger = logging.getLogger("pnpi.storage")

S3_REF_PREFIX = "s3:"


class DocumentStorage(ABC):
    """Interface commune aux backends de stockage de fichiers."""

    @abstractmethod
    def save(self, key: str, content: bytes) -> str:
        """Enregistre `content` sous la cle logique `key` (ex:
        'ati/ATI-001/doc.pdf'). Retourne la reference a persister en base."""

    @abstractmethod
    def exists(self, stored_ref: str | None) -> bool:
        """Indique si la reference pointe vers un fichier reellement present."""

    @abstractmethod
    def read(self, stored_ref: str) -> bytes:
        """Lit le contenu binaire complet. Leve FileNotFoundError si absent."""

    @abstractmethod
    def delete(self, stored_ref: str) -> None:
        """Supprime le fichier. No-op silencieux si deja absent."""

    @abstractmethod
    def list_prefix(self, prefix: str) -> list[str]:
        """Liste les references existantes sous la cle logique `prefix` (ex:
        verifier qu'au moins une signature existe pour un ATI donne, sans
        connaitre le nom exact du fichier). Retourne des references au meme
        format que celles produites par `save()`."""


class LocalFilesystemStorage(DocumentStorage):
    """Backend historique : fichiers sur disque local (volume Docker)."""

    def __init__(self, base_dir: Path):
        self._base_dir = base_dir
        self._base_dir.mkdir(parents=True, exist_ok=True)

    def save(self, key: str, content: bytes) -> str:
        path = self._base_dir / key
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        return str(path)

    def exists(self, stored_ref: str | None) -> bool:
        if not stored_ref:
            return False
        return Path(stored_ref).exists()

    def read(self, stored_ref: str) -> bytes:
        path = Path(stored_ref)
        if not path.exists():
            raise FileNotFoundError(stored_ref)
        return path.read_bytes()

    def delete(self, stored_ref: str) -> None:
        path = Path(stored_ref)
        if path.exists():
            path.unlink()

    def list_prefix(self, prefix: str) -> list[str]:
        dir_path = self._base_dir / prefix
        if not dir_path.exists():
            return []
        return [str(p) for p in dir_path.iterdir() if p.is_file()]


class S3Storage(DocumentStorage):
    """Backend S3/MinIO. Reutilise les identifiants de `scripts/backup_s3.py`
    mais un bucket dedie aux documents (cycle de vie distinct des sauvegardes
    DB)."""

    def __init__(self, *, endpoint: str, access_key: str, secret_key: str, bucket: str, region: str = "us-east-1"):
        import boto3
        from botocore.config import Config as BotoConfig

        self._bucket = bucket
        self._client = boto3.client(
            "s3",
            endpoint_url=endpoint or None,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region,
            config=BotoConfig(signature_version="s3v4"),
        )
        self._ensure_bucket()

    def _ensure_bucket(self) -> None:
        from botocore.exceptions import ClientError

        try:
            self._client.head_bucket(Bucket=self._bucket)
        except ClientError:
            try:
                self._client.create_bucket(Bucket=self._bucket)
            except ClientError as exc:
                logger.warning("Impossible de creer/verifier le bucket %s: %s", self._bucket, exc)

    @staticmethod
    def _key_from_ref(stored_ref: str) -> str:
        return stored_ref[len(S3_REF_PREFIX) :] if stored_ref.startswith(S3_REF_PREFIX) else stored_ref

    def save(self, key: str, content: bytes) -> str:
        self._client.put_object(Bucket=self._bucket, Key=key, Body=content)
        return f"{S3_REF_PREFIX}{key}"

    def exists(self, stored_ref: str | None) -> bool:
        if not stored_ref:
            return False
        from botocore.exceptions import ClientError

        try:
            self._client.head_object(Bucket=self._bucket, Key=self._key_from_ref(stored_ref))
            return True
        except ClientError:
            return False

    def read(self, stored_ref: str) -> bytes:
        from botocore.exceptions import ClientError

        try:
            obj = self._client.get_object(Bucket=self._bucket, Key=self._key_from_ref(stored_ref))
            return obj["Body"].read()
        except ClientError as exc:
            raise FileNotFoundError(stored_ref) from exc

    def delete(self, stored_ref: str) -> None:
        self._client.delete_object(Bucket=self._bucket, Key=self._key_from_ref(stored_ref))

    def list_prefix(self, prefix: str) -> list[str]:
        resp = self._client.list_objects_v2(Bucket=self._bucket, Prefix=prefix)
        return [f"{S3_REF_PREFIX}{obj['Key']}" for obj in resp.get("Contents", [])]


def _build_s3_storage() -> DocumentStorage | None:
    endpoint = os.getenv("PNPI_S3_ENDPOINT", "").strip()
    access_key = os.getenv("PNPI_S3_ACCESS_KEY", "").strip()
    secret_key = os.getenv("PNPI_S3_SECRET_KEY", "").strip()
    bucket = os.getenv("PNPI_S3_DOCUMENTS_BUCKET", "pnpi-documents").strip()
    region = os.getenv("PNPI_S3_REGION", "us-east-1").strip()

    if not (endpoint and access_key and secret_key):
        logger.warning(
            "PNPI_STORAGE_BACKEND=s3 demande mais PNPI_S3_ENDPOINT/ACCESS_KEY/SECRET_KEY "
            "incomplets : repli sur le stockage local (PNPI_UPLOAD_DIR)."
        )
        return None
    try:
        return S3Storage(endpoint=endpoint, access_key=access_key, secret_key=secret_key, bucket=bucket, region=region)
    except ImportError:
        logger.warning("boto3 non installe : repli sur le stockage local (PNPI_UPLOAD_DIR).")
        return None
    except Exception as exc:  # connexion MinIO indisponible au demarrage, etc.
        logger.warning("Backend S3 indisponible (%s) : repli sur le stockage local.", exc)
        return None


@cache
def get_storage(upload_dir: str) -> DocumentStorage:
    """Retourne le backend de stockage actif pour le repertoire logique
    `upload_dir` (ex: 'uploads/ati', 'uploads/inspections').

    Cache par `upload_dir` : un seul backend S3/local instancie par
    processus et par domaine (documents vs photos), pas par requete.
    """
    backend = os.getenv("PNPI_STORAGE_BACKEND", "local").strip().lower()
    if backend == "s3":
        s3 = _build_s3_storage()
        if s3 is not None:
            return s3
    return LocalFilesystemStorage(Path(upload_dir))


__all__ = [
    "DocumentStorage",
    "LocalFilesystemStorage",
    "S3Storage",
    "get_storage",
]
