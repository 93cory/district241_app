"""Tests pour `app.core.encryption` (chiffrement Fernet at-rest)."""

from __future__ import annotations

import importlib

import pytest


@pytest.fixture
def fresh_module(monkeypatch):
    """Reimporte le module a chaque test pour reset le `lru_cache`."""

    def _reload(env: dict[str, str]):
        # Nettoie l'env existant
        for key in (
            "PNPI_FIELD_ENCRYPTION_KEY",
            "PNPI_FIELD_ENCRYPTION_KEY_OLD",
            "PNPI_ENV",
        ):
            monkeypatch.delenv(key, raising=False)
        for k, v in env.items():
            monkeypatch.setenv(k, v)
        from app.core import encryption

        importlib.reload(encryption)
        return encryption

    return _reload


def _make_key() -> str:
    from cryptography.fernet import Fernet

    return Fernet.generate_key().decode()


def test_passthrough_in_dev_when_no_key(fresh_module):
    """Sans cle en dev : valeur retournee en clair, pas d'erreur."""
    enc = fresh_module({"PNPI_ENV": "development"})
    assert enc.encrypt_str("123456789X") == "123456789X"
    assert enc.decrypt_str("123456789X") == "123456789X"
    assert enc.is_encryption_enabled() is False


def test_production_without_key_raises(fresh_module):
    """En prod, absence de cle = RuntimeError des le premier appel."""
    enc = fresh_module({"PNPI_ENV": "production"})
    with pytest.raises(enc.EncryptionUnavailableError):
        enc.encrypt_str("nif-test")


def test_roundtrip_encrypt_decrypt(fresh_module):
    """Avec une cle, encrypt -> decrypt rend la valeur originale."""
    key = _make_key()
    enc = fresh_module({"PNPI_FIELD_ENCRYPTION_KEY": key, "PNPI_ENV": "development"})

    plain = "1234567890A"
    cipher = enc.encrypt_str(plain)
    assert cipher is not None
    assert cipher.startswith(enc.ENCRYPTED_PREFIX)
    assert plain not in cipher  # le clair n'apparait pas
    assert enc.decrypt_str(cipher) == plain
    assert enc.is_encryption_enabled() is True


def test_encrypt_idempotent_on_already_encrypted(fresh_module):
    """encrypt_str() est idempotent : re-encrypter ne double pas le prefix."""
    key = _make_key()
    enc = fresh_module({"PNPI_FIELD_ENCRYPTION_KEY": key, "PNPI_ENV": "development"})

    cipher1 = enc.encrypt_str("test-value")
    cipher2 = enc.encrypt_str(cipher1)
    assert cipher2 == cipher1


def test_decrypt_legacy_plaintext(fresh_module):
    """Les valeurs sans prefix sont retournees telles quelles (retro-compat)."""
    key = _make_key()
    enc = fresh_module({"PNPI_FIELD_ENCRYPTION_KEY": key, "PNPI_ENV": "development"})

    assert enc.decrypt_str("legacy-clair") == "legacy-clair"


def test_none_handling(fresh_module):
    """encrypt/decrypt(None) -> None."""
    key = _make_key()
    enc = fresh_module({"PNPI_FIELD_ENCRYPTION_KEY": key, "PNPI_ENV": "development"})

    assert enc.encrypt_str(None) is None
    assert enc.decrypt_str(None) is None


def test_key_rotation_with_old_key(fresh_module):
    """MultiFernet : les valeurs chiffrees avec l'ancienne cle restent lisibles."""
    old_key = _make_key()
    new_key = _make_key()

    # Phase 1 : on chiffre avec old_key uniquement
    enc_old = fresh_module({"PNPI_FIELD_ENCRYPTION_KEY": old_key, "PNPI_ENV": "development"})
    cipher_old = enc_old.encrypt_str("secret-prerotation")
    assert cipher_old is not None

    # Phase 2 : rotation : nouvelle cle primaire, ancienne en secondaire
    enc_new = fresh_module(
        {
            "PNPI_FIELD_ENCRYPTION_KEY": new_key,
            "PNPI_FIELD_ENCRYPTION_KEY_OLD": old_key,
            "PNPI_ENV": "development",
        }
    )
    # On doit pouvoir lire le ciphertext de phase 1
    assert enc_new.decrypt_str(cipher_old) == "secret-prerotation"

    # Et les nouveaux chiffrements utilisent la nouvelle cle primaire
    cipher_new = enc_new.encrypt_str("secret-postrotation")
    assert cipher_new != cipher_old
    assert enc_new.decrypt_str(cipher_new) == "secret-postrotation"


def test_invalid_ciphertext_returns_none(fresh_module):
    """Un ciphertext corrompu logge une erreur et retourne None."""
    key = _make_key()
    enc = fresh_module({"PNPI_FIELD_ENCRYPTION_KEY": key, "PNPI_ENV": "development"})

    bad = f"{enc.ENCRYPTED_PREFIX}corrupted-token-not-base64"
    assert enc.decrypt_str(bad) is None


def test_hash_for_lookup_is_deterministic(fresh_module):
    """Meme valeur -> meme hash (necessaire pour recherche exacte / unicite)."""
    key = _make_key()
    enc = fresh_module({"PNPI_FIELD_ENCRYPTION_KEY": key, "PNPI_ENV": "development"})

    h1 = enc.hash_for_lookup("GA-NIF-2024-00123")
    h2 = enc.hash_for_lookup("GA-NIF-2024-00123")
    assert h1 == h2
    assert h1 is not None
    assert "GA-NIF-2024-00123" not in h1  # non reversible / n'expose pas le clair


def test_hash_for_lookup_differs_per_value(fresh_module):
    key = _make_key()
    enc = fresh_module({"PNPI_FIELD_ENCRYPTION_KEY": key, "PNPI_ENV": "development"})

    assert enc.hash_for_lookup("nif-a") != enc.hash_for_lookup("nif-b")


def test_hash_for_lookup_none(fresh_module):
    key = _make_key()
    enc = fresh_module({"PNPI_FIELD_ENCRYPTION_KEY": key, "PNPI_ENV": "development"})
    assert enc.hash_for_lookup(None) is None


def test_mask_tail_keeps_only_last_chars(fresh_module):
    enc = fresh_module({"PNPI_ENV": "development"})
    assert enc.mask_tail("GA-NIF-2024-00123") == "*************0123"
    assert enc.mask_tail("abc") == "abc"  # trop court pour masquer
    assert enc.mask_tail(None) is None


def test_set_nif_masks_when_encryption_enabled(fresh_module):
    """Regression D-003 : quand le chiffrement est actif, set_nif() ne doit
    plus jamais laisser le NIF en clair dans nif_gabon (colonne persistee)."""
    from app.models.pnpi import OperateurIndustrielORM

    key = _make_key()
    fresh_module({"PNPI_FIELD_ENCRYPTION_KEY": key, "PNPI_ENV": "development"})

    op = OperateurIndustrielORM()
    op.set_nif("GA-NIF-2024-00123")

    assert op.nif_gabon != "GA-NIF-2024-00123"  # jamais le clair complet
    assert op.nif_gabon.endswith("0123")  # suffixe visible conserve (affichage/recherche)
    assert op.nif_gabon_encrypted is not None
    assert op.nif_gabon_hash is not None
    assert op.nif == "GA-NIF-2024-00123"  # la property continue de dechiffrer correctement


def test_set_nif_hash_stable_across_masking(fresh_module):
    """L'empreinte de recherche doit rester la meme pour deux operateurs
    crees separement avec le meme NIF (sert a la detection de doublon)."""
    key = _make_key()
    fresh_module({"PNPI_FIELD_ENCRYPTION_KEY": key, "PNPI_ENV": "development"})
    from app.models.pnpi import OperateurIndustrielORM

    op1 = OperateurIndustrielORM()
    op1.set_nif("GA-NIF-2024-00123")
    op2 = OperateurIndustrielORM()
    op2.set_nif("GA-NIF-2024-00123")

    assert op1.nif_gabon_hash == op2.nif_gabon_hash


def test_set_nif_passthrough_without_key(fresh_module):
    """Sans cle (dev), nif_gabon reste en clair — comportement pass-through
    coherent avec le reste de core/encryption.py, sans donnee reelle en jeu."""
    fresh_module({"PNPI_ENV": "development"})
    from app.models.pnpi import OperateurIndustrielORM

    op = OperateurIndustrielORM()
    op.set_nif("GA-NIF-2024-00123")
    assert op.nif_gabon == "GA-NIF-2024-00123"
    assert op.nif_gabon_hash is not None  # toujours calcule, cle ou pas
