"""PNPI · Configuration centralisee via une classe Settings simple."""

from __future__ import annotations

import os

from .core.secrets import resolve_secret


class Settings:
    # Resolu via Vault si PNPI_VAULT_ADDR est configure, sinon variable
    # d'environnement (cf core/secrets.py — dette D-012).
    secret_key: str = resolve_secret("PNPI_SECRET_KEY", "change-me-in-production")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = int(os.getenv("PNPI_ACCESS_TOKEN_EXPIRE_MINUTES", "480"))  # 8h par defaut
    refresh_token_expire_days: int = int(
        os.getenv("PNPI_REFRESH_TOKEN_EXPIRE_DAYS", os.getenv("PNPI_REFRESH_TOKEN_EXPIRE_DAYS", "14"))
    )
    database_url: str = os.getenv("PNPI_DATABASE_URL", os.getenv("PNPI_DATABASE_URL", "sqlite:///./pnpi.db"))
    env: str = os.getenv("PNPI_ENV", os.getenv("PNPI_ENV", "development")).strip().lower()
    rate_limit_window_seconds: int = int(
        os.getenv("PNPI_RATE_LIMIT_WINDOW_SECONDS", os.getenv("PNPI_RATE_LIMIT_WINDOW_SECONDS", "60"))
    )
    auth_rate_limit_max: int = int(
        os.getenv("PNPI_AUTH_RATE_LIMIT_MAX_REQUESTS", os.getenv("PNPI_AUTH_RATE_LIMIT_MAX_REQUESTS", "15"))
    )
    sensitive_rate_limit_max: int = int(
        os.getenv("PNPI_SENSITIVE_RATE_LIMIT_MAX_REQUESTS", os.getenv("PNPI_SENSITIVE_RATE_LIMIT_MAX_REQUESTS", "60"))
    )
    alert_webhook_url: str = os.getenv("PNPI_ALERT_WEBHOOK_URL", os.getenv("PNPI_ALERT_WEBHOOK_URL", "")).strip()
    alert_overdue_threshold: int = int(os.getenv("PNPI_ALERT_OVERDUE_DOSSIERS_THRESHOLD", "9999"))
    alert_unread_critical_threshold: int = int(os.getenv("PNPI_ALERT_UNREAD_CRITICAL_THRESHOLD", "9999"))
    alert_error_rate_threshold: float = float(os.getenv("PNPI_ALERT_ERROR_RATE_THRESHOLD", "0.2"))
    cors_origins: str = os.getenv(
        "PNPI_CORS_ALLOW_ORIGINS", os.getenv("PNPI_CORS_ALLOW_ORIGINS", "http://localhost:3000")
    ).strip()
    sla_low_days: int = int(os.getenv("PNPI_SLA_LOW_DAYS", os.getenv("PNPI_SLA_LOW_DAYS", "45")))
    sla_medium_days: int = int(os.getenv("PNPI_SLA_MEDIUM_DAYS", os.getenv("PNPI_SLA_MEDIUM_DAYS", "30")))
    sla_high_days: int = int(os.getenv("PNPI_SLA_HIGH_DAYS", os.getenv("PNPI_SLA_HIGH_DAYS", "21")))

    def __init__(self) -> None:
        # Re-evaluate at instantiation time so env vars / Vault are read dynamically
        self.secret_key = resolve_secret("PNPI_SECRET_KEY", "change-me-in-production")
        self.algorithm = "HS256"
        self.access_token_expire_minutes = int(os.getenv("PNPI_ACCESS_TOKEN_EXPIRE_MINUTES", "480"))
        self.refresh_token_expire_days = int(
            os.getenv("PNPI_REFRESH_TOKEN_EXPIRE_DAYS", os.getenv("PNPI_REFRESH_TOKEN_EXPIRE_DAYS", "14"))
        )
        self.database_url = os.getenv("PNPI_DATABASE_URL", os.getenv("PNPI_DATABASE_URL", "sqlite:///./pnpi.db"))
        self.env = os.getenv("PNPI_ENV", os.getenv("PNPI_ENV", "development")).strip().lower()
        self.rate_limit_window_seconds = int(
            os.getenv("PNPI_RATE_LIMIT_WINDOW_SECONDS", os.getenv("PNPI_RATE_LIMIT_WINDOW_SECONDS", "60"))
        )
        self.auth_rate_limit_max = int(
            os.getenv("PNPI_AUTH_RATE_LIMIT_MAX_REQUESTS", os.getenv("PNPI_AUTH_RATE_LIMIT_MAX_REQUESTS", "15"))
        )
        self.sensitive_rate_limit_max = int(
            os.getenv(
                "PNPI_SENSITIVE_RATE_LIMIT_MAX_REQUESTS", os.getenv("PNPI_SENSITIVE_RATE_LIMIT_MAX_REQUESTS", "60")
            )
        )
        self.alert_webhook_url = os.getenv("PNPI_ALERT_WEBHOOK_URL", os.getenv("PNPI_ALERT_WEBHOOK_URL", "")).strip()
        self.alert_overdue_threshold = int(os.getenv("PNPI_ALERT_OVERDUE_DOSSIERS_THRESHOLD", "9999"))
        self.alert_unread_critical_threshold = int(os.getenv("PNPI_ALERT_UNREAD_CRITICAL_THRESHOLD", "9999"))
        self.alert_error_rate_threshold = float(os.getenv("PNPI_ALERT_ERROR_RATE_THRESHOLD", "0.2"))
        self.cors_origins = os.getenv(
            "PNPI_CORS_ALLOW_ORIGINS", os.getenv("PNPI_CORS_ALLOW_ORIGINS", "http://localhost:3000")
        ).strip()
        self.sla_low_days = int(os.getenv("PNPI_SLA_LOW_DAYS", os.getenv("PNPI_SLA_LOW_DAYS", "45")))
        self.sla_medium_days = int(os.getenv("PNPI_SLA_MEDIUM_DAYS", os.getenv("PNPI_SLA_MEDIUM_DAYS", "30")))
        self.sla_high_days = int(os.getenv("PNPI_SLA_HIGH_DAYS", os.getenv("PNPI_SLA_HIGH_DAYS", "21")))

    def enforce(self) -> None:
        """Hard checks that abort the boot in production when misconfigured."""
        if self.env != "production":
            return
        if self.cors_origins == "*":
            raise RuntimeError(
                "PNPI_CORS_ALLOW_ORIGINS='*' is forbidden in production. "
                "Set PNPI_CORS_ALLOW_ORIGINS to an explicit comma-separated allowlist."
            )
        if self.secret_key == "change-me-in-production":
            raise RuntimeError("PNPI_SECRET_KEY must be overridden in production (default value detected).")

    def validate(self) -> list[str]:
        """Validate critical settings. Returns list of warnings."""
        warnings: list[str] = []

        if self.secret_key == "change-me-in-production" and self.env == "production":
            warnings.append("CRITICAL: PNPI_SECRET_KEY is using default value in production!")

        if self.env == "production" and self.cors_origins == "*":
            warnings.append("WARNING: CORS allows all origins in production")

        if self.env == "production" and "sqlite" in self.database_url:
            warnings.append("WARNING: SQLite should not be used in production")

        if self.sla_high_days >= self.sla_medium_days:
            warnings.append(f"WARNING: SLA high ({self.sla_high_days}d) >= medium ({self.sla_medium_days}d)")

        if self.sla_medium_days >= self.sla_low_days:
            warnings.append(f"WARNING: SLA medium ({self.sla_medium_days}d) >= low ({self.sla_low_days}d)")

        return warnings


settings = Settings()

# Log warnings at import time
import logging as _logging

_config_logger = _logging.getLogger("pnpi.config")
for _w in settings.validate():
    _config_logger.warning(_w)

settings.enforce()
