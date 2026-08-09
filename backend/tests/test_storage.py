"""Tests pour `app.core.storage` (abstraction de stockage documents/photos)."""

from __future__ import annotations

import importlib

import pytest


@pytest.fixture
def fresh_module(monkeypatch):
    """Reimporte le module a chaque test (reset du lru_cache de get_storage)."""

    def _reload(env: dict[str, str] | None = None):
        for key in (
            "PNPI_STORAGE_BACKEND",
            "PNPI_S3_ENDPOINT",
            "PNPI_S3_ACCESS_KEY",
            "PNPI_S3_SECRET_KEY",
            "PNPI_S3_DOCUMENTS_BUCKET",
        ):
            monkeypatch.delenv(key, raising=False)
        for k, v in (env or {}).items():
            monkeypatch.setenv(k, v)
        from app.core import storage

        importlib.reload(storage)
        return storage

    return _reload


def test_local_backend_by_default(fresh_module, tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    storage = fresh_module()
    backend = storage.get_storage("uploads/test")
    assert isinstance(backend, storage.LocalFilesystemStorage)


def test_local_save_read_exists_delete(fresh_module, tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    storage = fresh_module()
    backend = storage.LocalFilesystemStorage(tmp_path / "uploads")

    ref = backend.save("ATI-001/doc.pdf", b"contenu-pdf")
    assert backend.exists(ref) is True
    assert backend.read(ref) == b"contenu-pdf"

    backend.delete(ref)
    assert backend.exists(ref) is False


def test_local_exists_none_or_missing(fresh_module, tmp_path):
    storage = fresh_module()
    backend = storage.LocalFilesystemStorage(tmp_path / "uploads")
    assert backend.exists(None) is False
    assert backend.exists(str(tmp_path / "uploads" / "inexistant.pdf")) is False


def test_local_read_missing_raises(fresh_module, tmp_path):
    storage = fresh_module()
    backend = storage.LocalFilesystemStorage(tmp_path / "uploads")
    with pytest.raises(FileNotFoundError):
        backend.read(str(tmp_path / "uploads" / "inexistant.pdf"))


def test_local_delete_missing_is_noop(fresh_module, tmp_path):
    storage = fresh_module()
    backend = storage.LocalFilesystemStorage(tmp_path / "uploads")
    backend.delete(str(tmp_path / "uploads" / "inexistant.pdf"))  # ne doit pas lever


def test_local_list_prefix(fresh_module, tmp_path):
    storage = fresh_module()
    backend = storage.LocalFilesystemStorage(tmp_path / "uploads")

    backend.save("ATI-001/sig_a.png", b"a")
    backend.save("ATI-001/sig_b.png", b"b")
    backend.save("ATI-002/sig_c.png", b"c")

    refs = backend.list_prefix("ATI-001")
    assert len(refs) == 2
    assert all(ref.endswith(".png") for ref in refs)

    assert backend.list_prefix("ATI-999") == []  # repertoire inexistant


def test_get_storage_falls_back_to_local_when_s3_misconfigured(fresh_module, tmp_path, monkeypatch):
    """PNPI_STORAGE_BACKEND=s3 sans identifiants -> repli local (pas de crash)."""
    monkeypatch.chdir(tmp_path)
    storage = fresh_module({"PNPI_STORAGE_BACKEND": "s3"})
    backend = storage.get_storage("uploads/test")
    assert isinstance(backend, storage.LocalFilesystemStorage)


def test_s3_key_from_ref_strips_prefix(fresh_module):
    storage = fresh_module()
    assert storage.S3Storage._key_from_ref("s3:ati/ATI-001/doc.pdf") == "ati/ATI-001/doc.pdf"
    # Reference sans prefixe (ne devrait pas arriver en usage normal, mais
    # ne doit pas lever) : retournee telle quelle.
    assert storage.S3Storage._key_from_ref("ati/ATI-001/doc.pdf") == "ati/ATI-001/doc.pdf"


def test_s3_save_ref_has_prefix():
    """Le format de reference retourne par S3Storage.save() est verifie
    statiquement (pas d'appel reseau) via la constante de prefixe."""
    from app.core.storage import S3_REF_PREFIX

    assert S3_REF_PREFIX == "s3:"
