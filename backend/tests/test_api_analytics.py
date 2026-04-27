"""Tests for the API analytics module."""

from app.core.api_analytics import APIAnalytics


def test_record_and_summary():
    analytics = APIAnalytics()

    analytics.record("GET", "/health", 200, 5.0)
    analytics.record("GET", "/health", 200, 3.0)
    analytics.record("POST", "/auth/token", 200, 50.0)
    analytics.record("GET", "/pnpi/ati", 500, 120.0)

    summary = analytics.get_summary()
    assert summary["total_requests"] == 4
    assert summary["total_errors"] == 1
    assert summary["unique_endpoints"] == 3
    assert summary["error_rate_pct"] == 25.0


def test_top_endpoints_sorted():
    analytics = APIAnalytics()

    for _ in range(10):
        analytics.record("GET", "/popular", 200, 5.0)
    for _ in range(3):
        analytics.record("GET", "/rare", 200, 5.0)

    summary = analytics.get_summary()
    top = summary["top_endpoints"]
    assert top[0]["endpoint"] == "GET /popular"
    assert top[0]["hits"] == 10


def test_slowest_endpoints():
    analytics = APIAnalytics()

    for _ in range(5):
        analytics.record("GET", "/fast", 200, 2.0)
    for _ in range(5):
        analytics.record("GET", "/slow", 200, 500.0)

    summary = analytics.get_summary()
    slowest = summary["slowest_endpoints"]
    assert slowest[0]["endpoint"] == "GET /slow"
    assert slowest[0]["avg_ms"] == 500.0


def test_status_codes():
    analytics = APIAnalytics()
    analytics.record("GET", "/x", 200, 1.0)
    analytics.record("GET", "/x", 404, 1.0)
    analytics.record("GET", "/x", 500, 1.0)

    summary = analytics.get_summary()
    assert summary["status_codes"][200] == 1
    assert summary["status_codes"][404] == 1
    assert summary["status_codes"][500] == 1
