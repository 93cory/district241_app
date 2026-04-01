"""Lightweight feature flags driven by environment variables.

Usage:
    from app.core.feature_flags import flags

    if flags.is_enabled("graphql_api"):
        app.include_router(graphql_router)

Flags are read from env vars with the PNPI_FF_ prefix:
    PNPI_FF_GRAPHQL_API=1          # enabled
    PNPI_FF_SEARCH_FULLTEXT=0      # disabled

Flags default to enabled unless explicitly set to "0" or "false".
"""
from __future__ import annotations

import logging
import os

logger = logging.getLogger("pnpi.feature_flags")

# Default flags: name -> enabled by default
_DEFAULTS: dict[str, bool] = {
    "graphql_api": True,
    "search_fulltext": True,
    "redis_cache": True,
    "redis_rate_limiter": True,
    "websocket_notifications": True,
    "export_pptx": True,
    "province_reports": True,
    "instructor_ratings": True,
}


class FeatureFlags:
    """Read-only feature flags from environment."""

    def __init__(self) -> None:
        self._flags: dict[str, bool] = {}
        self._load()

    def _load(self) -> None:
        for name, default in _DEFAULTS.items():
            env_key = f"PNPI_FF_{name.upper()}"
            env_val = os.getenv(env_key)
            if env_val is not None:
                self._flags[name] = env_val.lower() not in ("0", "false", "no", "off")
            else:
                self._flags[name] = default

        enabled = [k for k, v in self._flags.items() if v]
        disabled = [k for k, v in self._flags.items() if not v]
        if disabled:
            logger.info("Feature flags — enabled: %s | disabled: %s", enabled, disabled)

    def is_enabled(self, name: str) -> bool:
        """Check if a feature flag is enabled."""
        return self._flags.get(name, True)

    def all_flags(self) -> dict[str, bool]:
        """Return all flags and their status."""
        return dict(self._flags)


flags = FeatureFlags()
