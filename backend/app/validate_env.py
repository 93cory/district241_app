"""PNPI — Validation des variables d'environnement au demarrage."""
import os
import sys
import logging

logger = logging.getLogger("pnpi.env")

REQUIRED_VARS = {
    "PNPI_SECRET_KEY": "Cle secrete JWT (minimum 32 caracteres)",
    "PNPI_DATABASE_URL": "URL de connexion a la base de donnees",
}

REQUIRED_IN_PRODUCTION = {
    "PNPI_ADMIN_PASSWORD": "Mot de passe admin",
    "PNPI_MINISTRE_PASSWORD": "Mot de passe ministre",
    "PNPI_OPERATEUR_PASSWORD": "Mot de passe operateur",
    "PNPI_INSPECTEUR_PASSWORD": "Mot de passe inspecteur",
    "PNPI_DIRECTEUR_PASSWORD": "Mot de passe directeur",
    "PNPI_INSTRUCTEUR_PASSWORD": "Mot de passe instructeur",
}

OPTIONAL_VARS = {
    "PNPI_ENV": ("Environnement (development/production)", "development"),
    "PNPI_CORS_ALLOW_ORIGINS": ("Origines CORS autorisees", "*"),
    "PNPI_SLA_LOW_DAYS": ("SLA jours priorite basse", "45"),
    "PNPI_SLA_MEDIUM_DAYS": ("SLA jours priorite moyenne", "30"),
    "PNPI_SLA_HIGH_DAYS": ("SLA jours priorite haute", "21"),
    "PNPI_ALERT_WEBHOOK_URL": ("URL webhook alertes", ""),
    "PNPI_RATE_LIMIT_WINDOW_SECONDS": ("Fenetre rate limiting (s)", "60"),
    "PNPI_AUTH_RATE_LIMIT_MAX_REQUESTS": ("Max requetes auth par fenetre", "15"),
}

INSECURE_DEFAULTS = [
    "change-me-in-production",
    "admin-dev-password",
    "ministre-dev-password",
    "operateur-dev-password",
    "inspecteur-dev-password",
    "directeur-dev-password",
    "instructeur-dev-password",
]


def validate_environment() -> bool:
    """Validate environment variables. Returns True if valid, False otherwise."""
    is_prod = os.getenv("PNPI_ENV", "development").strip().lower() == "production"
    errors: list[str] = []
    warnings: list[str] = []

    # Check required vars
    for var, desc in REQUIRED_VARS.items():
        value = os.getenv(var, "").strip()
        if not value:
            if is_prod:
                errors.append(f"MANQUANTE: {var} — {desc}")
            else:
                warnings.append(f"Non definie: {var} — {desc} (utilise valeur par defaut)")

    # Check production-required vars
    if is_prod:
        for var, desc in REQUIRED_IN_PRODUCTION.items():
            value = os.getenv(var, "").strip()
            if not value:
                errors.append(f"MANQUANTE EN PRODUCTION: {var} — {desc}")
            elif value in INSECURE_DEFAULTS:
                errors.append(f"VALEUR PAR DEFAUT INTERDITE EN PRODUCTION: {var}")

    # Check secret key strength
    secret = os.getenv("PNPI_SECRET_KEY", "")
    if secret and len(secret) < 32:
        if is_prod:
            errors.append("PNPI_SECRET_KEY doit contenir au moins 32 caracteres en production")
        else:
            warnings.append("PNPI_SECRET_KEY courte (< 32 chars) — acceptable en dev uniquement")

    # Report
    if warnings:
        for w in warnings:
            logger.warning(f"[ENV] {w}")

    if errors:
        logger.error("=" * 60)
        logger.error("ERREURS DE CONFIGURATION ENVIRONNEMENT:")
        for e in errors:
            logger.error(f"  - {e}")
        logger.error("=" * 60)
        if is_prod:
            logger.error("Arret du serveur. Corrigez les variables d'environnement.")
            return False

    if not errors and not warnings:
        logger.info("[ENV] Validation environnement: OK")

    return True
