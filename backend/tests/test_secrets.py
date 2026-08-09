"""Tests pour `app.core.secrets` (resolution Vault + repli env, dette D-012)."""

from __future__ import annotations

import importlib

import pytest


@pytest.fixture
def fresh_module(monkeypatch):
    """Reimporte le module a chaque test pour reset les lru_cache internes."""

    def _reload(env: dict[str, str] | None = None):
        for key in (
            "PNPI_VAULT_ADDR",
            "PNPI_VAULT_TOKEN",
            "PNPI_VAULT_MOUNT_POINT",
            "PNPI_VAULT_SECRET_PATH",
        ):
            monkeypatch.delenv(key, raising=False)
        for k, v in (env or {}).items():
            monkeypatch.setenv(k, v)
        from app.core import secrets

        importlib.reload(secrets)
        return secrets

    return _reload


def test_resolve_secret_falls_back_to_env_without_vault(fresh_module, monkeypatch):
    """Sans PNPI_VAULT_ADDR : comportement identique a os.getenv (repli)."""
    monkeypatch.setenv("SOME_APP_SECRET", "valeur-env")
    secrets = fresh_module()
    assert secrets.resolve_secret("SOME_APP_SECRET", "defaut") == "valeur-env"


def test_resolve_secret_uses_default_when_unset(fresh_module):
    secrets = fresh_module()
    assert secrets.resolve_secret("UNE_VARIABLE_QUI_NEXISTE_PAS", "defaut") == "defaut"


def test_is_vault_enabled_false_without_config(fresh_module):
    secrets = fresh_module()
    assert secrets.is_vault_enabled() is False


def test_is_vault_enabled_false_with_addr_but_no_token(fresh_module):
    """PNPI_VAULT_ADDR seul (sans token) ne doit pas activer Vault."""
    secrets = fresh_module({"PNPI_VAULT_ADDR": "http://vault:8200"})
    assert secrets.is_vault_enabled() is False


def test_resolve_secret_still_works_when_vault_addr_set_but_unreachable(fresh_module):
    """Vault configure mais injoignable (mauvaise adresse) : repli gracieux
    sur la variable d'environnement, pas de crash."""
    secrets = fresh_module(
        {
            "PNPI_VAULT_ADDR": "http://vault-inexistant-dans-ce-test:8200",
            "PNPI_VAULT_TOKEN": "dummy-token",
        }
    )
    import os

    os.environ["SOME_APP_SECRET"] = "valeur-env-de-secours"
    try:
        assert secrets.resolve_secret("SOME_APP_SECRET", "defaut") == "valeur-env-de-secours"
    finally:
        del os.environ["SOME_APP_SECRET"]
