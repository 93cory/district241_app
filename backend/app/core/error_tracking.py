"""PNPI · Monitoring d'erreurs centralise (dette D-009).

Contexte
========

Les erreurs sont journalisees en JSON (Loki/Grafana) mais sans outil de
dedoublonnage ni d'alerting fin par release — un pic d'un meme bug produit
des centaines de lignes de log identiques plutot qu'UN evenement groupe
avec compteur d'occurrences.

Ce module ajoute un client de monitoring d'erreurs (protocole Sentry,
compatible aussi bien avec Sentry SaaS qu'avec Glitchtip self-hosted —
cf `docker-compose.prod.yml`, profil `errortracking`) comme dependance
*optionnelle*, meme philosophie de degradation gracieuse que
`core/cache.py` / `core/encryption.py` / `core/storage.py` / `core/secrets.py` :
sans `PNPI_SENTRY_DSN` configure, aucun comportement ne change (les logs
JSON existants restent la seule source de verite).

Usage
=====

    from app.core.error_tracking import init_error_tracking, capture_exception

    init_error_tracking()  # une fois, au demarrage de l'app (main.py)
    ...
    capture_exception(exc)  # dans un handler d'exception
"""

from __future__ import annotations

import logging
import os

logger = logging.getLogger("pnpi.error_tracking")

_initialized = False


def init_error_tracking() -> bool:
    """Initialise le SDK de monitoring d'erreurs si `PNPI_SENTRY_DSN` est
    defini. No-op silencieux sinon (comportement historique inchange).
    Retourne True si effectivement active."""
    global _initialized
    dsn = os.getenv("PNPI_SENTRY_DSN", "").strip()
    if not dsn:
        return False
    try:
        import sentry_sdk
    except ImportError:
        logger.warning("sentry-sdk non installe : PNPI_SENTRY_DSN ignore (pip install sentry-sdk).")
        return False
    try:
        sentry_sdk.init(
            dsn=dsn,
            environment=os.getenv("PNPI_ENV", "development"),
            release=os.getenv("PNPI_RELEASE", "unknown"),
            # Pas de tracing de performance par defaut (volume/cout) : le
            # monitoring d'erreurs (D-009) est le besoin, pas l'APM.
            traces_sample_rate=float(os.getenv("PNPI_SENTRY_TRACES_SAMPLE_RATE", "0.0")),
            # Ne jamais envoyer de donnees personnelles par defaut (NIF,
            # emails, etc. peuvent apparaitre dans des payloads de requete).
            send_default_pii=False,
        )
        _initialized = True
        logger.info("Monitoring d'erreurs centralise actif (Sentry/Glitchtip).")
        return True
    except Exception as exc:  # DSN malformee, host injoignable au demarrage, etc.
        logger.warning("Initialisation du monitoring d'erreurs echouee (%s) : desactive.", exc)
        return False


def capture_exception(exc: BaseException) -> None:
    """Rapporte une exception au service de monitoring. No-op si non
    initialise (cf `init_error_tracking`)."""
    if not _initialized:
        return
    try:
        import sentry_sdk

        sentry_sdk.capture_exception(exc)
    except Exception:  # ne jamais faire echouer la requete a cause du monitoring
        logger.debug("capture_exception a echoue", exc_info=True)


def is_enabled() -> bool:
    return _initialized


__all__ = ["capture_exception", "init_error_tracking", "is_enabled"]
