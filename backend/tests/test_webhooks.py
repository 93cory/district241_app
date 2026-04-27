"""Tests for webhooks module and SSRF protection."""

from app.core.webhooks import _is_safe_url


def test_safe_url_https():
    assert _is_safe_url("https://hooks.example.com/pnpi") is True


def test_safe_url_http():
    assert _is_safe_url("http://api.partner.com/webhook") is True


def test_blocks_localhost():
    assert _is_safe_url("http://localhost:8000/internal") is False
    assert _is_safe_url("http://127.0.0.1/secret") is False
    assert _is_safe_url("http://0.0.0.0/") is False


def test_blocks_private_ips():
    assert _is_safe_url("http://192.168.1.1/admin") is False
    assert _is_safe_url("http://10.0.0.1/metadata") is False
    assert _is_safe_url("http://172.16.0.1/internal") is False


def test_blocks_cloud_metadata():
    assert _is_safe_url("http://169.254.169.254/latest/meta-data") is False
    assert _is_safe_url("http://metadata.google.internal/") is False


def test_blocks_internal_domains():
    assert _is_safe_url("http://service.local/api") is False
    assert _is_safe_url("http://db.internal/query") is False


def test_blocks_invalid_schemes():
    assert _is_safe_url("ftp://evil.com/file") is False
    assert _is_safe_url("file:///etc/passwd") is False
    assert _is_safe_url("javascript:alert(1)") is False


def test_blocks_empty():
    assert _is_safe_url("") is False
    assert _is_safe_url("not-a-url") is False


def test_ipv6_loopback():
    assert _is_safe_url("http://[::1]/") is False
