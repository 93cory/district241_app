"""Tests for the config validation."""
import os
from app.config import Settings


def test_default_settings():
    s = Settings()
    assert s.algorithm == "HS256"
    assert s.access_token_expire_minutes == 480  # 8h, aligne sur cookie


def test_validate_warns_on_default_secret_in_prod():
    s = Settings()
    s.secret_key = "change-me-in-production"
    s.env = "production"
    warnings = s.validate()
    assert any("CRITICAL" in w for w in warnings)


def test_validate_ok_in_dev():
    s = Settings()
    s.env = "development"
    warnings = s.validate()
    # In dev, default secret is acceptable
    assert not any("CRITICAL" in w for w in warnings)


def test_validate_sla_order():
    s = Settings()
    s.sla_high_days = 50
    s.sla_medium_days = 30
    warnings = s.validate()
    assert any("SLA high" in w for w in warnings)


def test_validate_cors_wildcard_prod():
    s = Settings()
    s.env = "production"
    s.cors_origins = "*"
    s.secret_key = "real-secret"
    warnings = s.validate()
    assert any("CORS" in w for w in warnings)
