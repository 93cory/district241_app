"""PNPI · Resolution des secrets via Vault (optionnel) avec repli sur les
variables d'environnement (dette technique D-012).

Contexte
========

`PNPI_SECRET_KEY` et les autres secrets applicatifs vivent aujourd'hui dans
un fichier `.env` sans coffre-fort : risque de commit accidentel, de lecture
par un prestataire, d'absence de rotation. Ce module ajoute HashiCorp Vault
comme source de secrets *optionnelle*, avec la meme philosophie de
degradation gracieuse que `core/cache.py`, `core/encryption.py` et
`core/storage.py` : sans `PNPI_VAULT_ADDR` configure, tout continue de
fonctionner via `os.getenv` (comportement historique, zero regression).

Perimetre de ce premier pas
============================

Ce module fournit le mecanisme (`resolve_secret`) et est branche sur les
secrets les plus critiques : `PNPI_SECRET_KEY` (signature JWT, cf
`config.py`) et `PNPI_FIELD_ENCRYPTION_KEY` / `_OLD` (chiffrement at-rest,
cf `core/encryption.py`). Etendre a d'autres secrets (mots de passe DB,
cles S3/MinIO) est mecanique une fois ce pattern valide, mais volontairement
pas fait dans ce lot pour limiter le rayon d'impact d'un changement qui
touche l'authentification et le chiffrement.

Vault en mode dev — AVERTISSEMENT PRODUCTION
=============================================

Le service Vault ajoute a `docker-compose.prod.yml` tourne en
`vault server -dev` : donnees en memoire (perdues a chaque redemarrage), pas
de scellement (unseal) reel, token root fixe. C'est un point de depart pour
valider l'integration applicative, **pas** un Vault de production. Avant
mise en production reelle :
- deployer Vault en mode "server" avec stockage persistant (Consul, Raft
  integre storage, ou backend cloud) ;
- configurer un processus d'unseal (Shamir secret sharing ou auto-unseal
  KMS cloud) ;
- remplacer le token root par une authentification AppRole avec politique
  minimale (lecture seule sur le chemin des secrets PNPI) ;
- activer l'audit logging Vault.

Usage
=====

    from app.core.secrets import resolve_secret
    secret_key = resolve_secret("PNPI_SECRET_KEY", "change-me-in-production")
"""

from __future__ import annotations

import logging
import os
from functools import lru_cache

logger = logging.getLogger("pnpi.secrets")

ENV_VAULT_ADDR = "PNPI_VAULT_ADDR"
ENV_VAULT_TOKEN = "PNPI_VAULT_TOKEN"
ENV_VAULT_MOUNT = "PNPI_VAULT_MOUNT_POINT"
ENV_VAULT_PATH = "PNPI_VAULT_SECRET_PATH"


@lru_cache(maxsize=1)
def _get_vault_client():
    """Retourne un client Vault authentifie, ou `None` si Vault n'est pas
    configure / joignable (repli silencieux sur les variables d'env)."""
    addr = os.getenv(ENV_VAULT_ADDR, "").strip()
    token = os.getenv(ENV_VAULT_TOKEN, "").strip()
    if not (addr and token):
        return None
    try:
        import hvac
    except ImportError:
        logger.warning("hvac non installe : PNPI_VAULT_ADDR ignore, repli sur les variables d'environnement.")
        return None
    try:
        client = hvac.Client(url=addr, token=token)
        if not client.is_authenticated():
            logger.warning("Authentification Vault echouee : repli sur les variables d'environnement.")
            return None
        return client
    except Exception as exc:  # Vault injoignable, timeout reseau, etc.
        logger.warning("Vault indisponible (%s) : repli sur les variables d'environnement.", exc)
        return None


@lru_cache(maxsize=1)
def _read_vault_secrets() -> dict:
    """Lit l'ensemble du secret KV v2 configure. Retourne `{}` si Vault
    n'est pas disponible ou si la lecture echoue."""
    client = _get_vault_client()
    if client is None:
        return {}
    mount_point = os.getenv(ENV_VAULT_MOUNT, "secret").strip()
    path = os.getenv(ENV_VAULT_PATH, "pnpi/backend").strip()
    try:
        resp = client.secrets.kv.v2.read_secret_version(path=path, mount_point=mount_point)
        return resp["data"]["data"]
    except Exception as exc:
        logger.warning("Lecture Vault echouee (%s) : repli sur les variables d'environnement.", exc)
        return {}


def resolve_secret(env_var: str, default: str = "") -> str:
    """Resout un secret par ordre de priorite :
    1. Vault (si configure et que `env_var` existe dans le secret KV) ;
    2. variable d'environnement `env_var` ;
    3. `default`.
    """
    vault_secrets = _read_vault_secrets()
    if env_var in vault_secrets:
        return vault_secrets[env_var]
    return os.getenv(env_var, default)


def is_vault_enabled() -> bool:
    """Indique si Vault est configure et joignable sur ce process."""
    return _get_vault_client() is not None


__all__ = ["is_vault_enabled", "resolve_secret"]
