"""PNPI · Chiffrement at-rest des champs sensibles (NIF, identifiants, etc.).

Vue d'ensemble
==============

Implementation basee sur Fernet (`cryptography.fernet`), un standard de
chiffrement authentifie (AES-128 CBC + HMAC SHA-256) qui garantit
confidentialite ET integrite.

La cle est lue depuis la variable d'environnement `PNPI_FIELD_ENCRYPTION_KEY`.
Si cette variable n'est pas definie :
- en `PNPI_ENV=production` : RuntimeError au demarrage si on tente de chiffrer
- en dev/test : on tombe en mode pass-through (aucun chiffrement, log warning),
  pour ne pas bloquer le developpement local et la retro-compatibilite avec
  les bases existantes.

Ce comportement permet :
- en prod, **echec rapide** si la cle est manquante (refus de chiffrer en clair) ;
- en dev, **demarrage transparent** sans configuration supplementaire.

Generation de la cle
====================

::

    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

Puis stocker dans le secret manager (env, vault, AWS SM) :

::

    export PNPI_FIELD_ENCRYPTION_KEY="..."

Rotation de cle
===============

Pour rotater une cle (recommande tous les 12 mois ou apres incident) :

1.  Generer une nouvelle cle Fernet.
2.  Mettre l'ancienne en `PNPI_FIELD_ENCRYPTION_KEY_OLD` et la nouvelle en
    `PNPI_FIELD_ENCRYPTION_KEY`.
3.  `MultiFernet([new, old])` permet de dechiffrer les deux et de chiffrer
    avec la nouvelle (cf `_get_fernet`).
4.  Lancer un script de migration qui re-encrypte tous les `nif_gabon_encrypted`
    en lisant + ecrivant chaque ligne.
5.  Apres migration complete, retirer `PNPI_FIELD_ENCRYPTION_KEY_OLD`.

Format des donnees chiffrees
============================

Les valeurs chiffrees sont prefixees par `enc:v1:` pour pouvoir distinguer
le clair du chiffre dans la base (utile pendant la phase de migration).
Le suffixe est le token Fernet en base64 url-safe.

Exemple :
    `enc:v1:gAAAAABm...` = chiffre
    `123456789X`         = clair (legacy ou fallback dev)
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import os
from functools import lru_cache

logger = logging.getLogger("pnpi.encryption")

ENCRYPTED_PREFIX = "enc:v1:"
ENV_KEY = "PNPI_FIELD_ENCRYPTION_KEY"
ENV_KEY_OLD = "PNPI_FIELD_ENCRYPTION_KEY_OLD"
_DEV_LOOKUP_PEPPER = "pnpi-dev-lookup-pepper-not-secret"


class EncryptionUnavailableError(RuntimeError):
    """Levee en production si la cle de chiffrement n'est pas configuree."""


@lru_cache(maxsize=1)
def _get_fernet():
    """Retourne un MultiFernet (cle courante + ancienne si presente).

    Cache: appele une seule fois par process.
    Retourne `None` si aucune cle dispo (mode pass-through dev).
    """
    try:
        from cryptography.fernet import Fernet, MultiFernet
    except ImportError:
        logger.warning(
            "cryptography non installe : chiffrement at-rest desactive. "
            "Installez `cryptography>=43` (cf requirements.txt)."
        )
        return None

    from .secrets import resolve_secret

    primary = resolve_secret(ENV_KEY, "").strip()
    secondary = resolve_secret(ENV_KEY_OLD, "").strip()

    if not primary:
        if os.getenv("PNPI_ENV", "development").strip().lower() == "production":
            raise EncryptionUnavailableError(
                f"{ENV_KEY} non defini en production. Generez une cle avec "
                f"`Fernet.generate_key()` et exposez-la via le secret manager."
            )
        logger.warning(
            "%s non defini : chiffrement at-rest desactive (mode dev). Les donnees seront stockees en clair.",
            ENV_KEY,
        )
        return None

    keys = [Fernet(primary.encode())]
    if secondary:
        try:
            keys.append(Fernet(secondary.encode()))
        except Exception as exc:  # cle invalide : on ignore mais log
            logger.error("Cle %s invalide, ignoree: %s", ENV_KEY_OLD, exc)
    return MultiFernet(keys) if len(keys) > 1 else keys[0]


def is_encryption_enabled() -> bool:
    """Indique si le chiffrement at-rest est actif sur ce process."""
    return _get_fernet() is not None


def encrypt_str(value: str | None) -> str | None:
    """Chiffre une chaine. Retourne `None` si l'entree est `None`.

    En l'absence de cle (dev), retourne la valeur en clair.
    Les valeurs deja chiffrees (prefixe `enc:v1:`) sont retournees telles quelles.
    """
    if value is None:
        return None
    if not isinstance(value, str):
        value = str(value)
    if value.startswith(ENCRYPTED_PREFIX):
        return value  # deja chiffre, idempotent
    fernet = _get_fernet()
    if fernet is None:
        return value  # pass-through dev
    token = fernet.encrypt(value.encode("utf-8")).decode("ascii")
    return f"{ENCRYPTED_PREFIX}{token}"


def decrypt_str(stored: str | None) -> str | None:
    """Dechiffre une chaine. Retourne `None` si l'entree est `None`.

    Les valeurs sans prefixe `enc:v1:` sont retournees telles quelles
    (retro-compat avec les lignes pre-chiffrement).
    """
    if stored is None:
        return None
    if not stored.startswith(ENCRYPTED_PREFIX):
        return stored  # legacy clair ou pass-through dev
    fernet = _get_fernet()
    if fernet is None:
        # Cle perdue, donnee chiffree : on ne peut pas dechiffrer
        logger.error("Donnee chiffree mais aucune cle disponible.")
        return None
    raw = stored[len(ENCRYPTED_PREFIX) :]
    try:
        return fernet.decrypt(raw.encode("ascii")).decode("utf-8")
    except Exception as exc:  # InvalidToken, etc.
        logger.error("Echec dechiffrement: %s", exc)
        return None


def hash_for_lookup(value: str | None) -> str | None:
    """Empreinte deterministe (HMAC-SHA256) pour recherche exacte / unicite
    sur un champ par ailleurs chiffre (donc non comparable directement en SQL).

    Contrairement a `encrypt_str` (non deterministe, un chiffre different a
    chaque appel via l'IV Fernet), cette empreinte est stable : deux appels
    avec la meme valeur produisent le meme hash, ce qui permet un `WHERE
    xxx_hash = :hash` ou une contrainte UNIQUE sans jamais stocker le clair.
    Le hash n'est pas reversible : il ne remplace pas `encrypt_str` pour
    l'affichage, seulement pour la correspondance exacte.

    Utilise la cle `PNPI_FIELD_ENCRYPTION_KEY` comme sel HMAC (memes
    garanties de disponibilite que le chiffrement). En dev sans cle, un sel
    fixe non secret est utilise (coherent avec le mode pass-through).
    """
    if value is None:
        return None
    key = os.getenv(ENV_KEY, "").strip() or _DEV_LOOKUP_PEPPER
    return hmac.new(key.encode("utf-8"), value.encode("utf-8"), hashlib.sha256).hexdigest()


def mask_tail(value: str | None, visible: int = 4) -> str | None:
    """Masque une chaine en ne laissant visibles que les `visible` derniers
    caracteres (ex: NIF affiche en liste sans exposer la valeur complete).
    """
    if value is None:
        return None
    if len(value) <= visible:
        return value
    return ("*" * (len(value) - visible)) + value[-visible:]


# ---------------------------------------------------------------------------
# Type SQLAlchemy : EncryptedString (TypeDecorator transparent)
# ---------------------------------------------------------------------------

try:
    from sqlalchemy import String
    from sqlalchemy.types import TypeDecorator
except ImportError:  # pragma: no cover
    TypeDecorator = object  # type: ignore[assignment,misc]
    String = None  # type: ignore[assignment]


class EncryptedString(TypeDecorator):  # type: ignore[misc]
    """Colonne SQLAlchemy chiffree at-rest.

    Usage :
        nif_gabon_encrypted: Mapped[str | None] = mapped_column(
            EncryptedString(255), nullable=True
        )

    Le chiffrement est transparent : on lit / ecrit des `str`, le ciphertext
    est stocke automatiquement.
    """

    impl = String  # type: ignore[assignment]
    cache_ok = True

    def process_bind_param(self, value, dialect):
        return encrypt_str(value)

    def process_result_value(self, value, dialect):
        return decrypt_str(value)


__all__ = [
    "ENCRYPTED_PREFIX",
    "EncryptedString",
    "EncryptionUnavailableError",
    "decrypt_str",
    "encrypt_str",
    "hash_for_lookup",
    "is_encryption_enabled",
    "mask_tail",
]
