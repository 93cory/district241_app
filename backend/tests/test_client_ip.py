from starlette.requests import Request

from app.core.client_ip import get_client_ip


def _request(peer: str, forwarded_for: str | None = None) -> Request:
    headers = []
    if forwarded_for:
        headers.append((b"x-forwarded-for", forwarded_for.encode()))
    return Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/",
            "headers": headers,
            "client": (peer, 12345),
            "server": ("testserver", 80),
            "scheme": "http",
            "query_string": b"",
        }
    )


def test_untrusted_peer_cannot_spoof_forwarded_for(monkeypatch):
    monkeypatch.setenv("PNPI_TRUSTED_PROXY_NETWORKS", "10.0.0.0/8")
    request = _request("203.0.113.10", "198.51.100.20")

    assert get_client_ip(request) == "203.0.113.10"


def test_trusted_proxy_forwards_client_address(monkeypatch):
    monkeypatch.setenv("PNPI_TRUSTED_PROXY_NETWORKS", "10.0.0.0/8")
    request = _request("10.1.2.3", "198.51.100.20")

    assert get_client_ip(request) == "198.51.100.20"


def test_resolution_stops_at_first_untrusted_hop(monkeypatch):
    monkeypatch.setenv("PNPI_TRUSTED_PROXY_NETWORKS", "10.0.0.0/8")
    request = _request("10.1.2.3", "192.0.2.44, 198.51.100.20")

    assert get_client_ip(request) == "198.51.100.20"
