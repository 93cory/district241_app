"""Resolve client addresses without trusting arbitrary forwarding headers."""

from __future__ import annotations

import ipaddress
import os

from fastapi import Request

_DEFAULT_TRUSTED_PROXIES = "127.0.0.1/32,::1/128"


def _trusted_proxy_networks() -> list[ipaddress.IPv4Network | ipaddress.IPv6Network]:
    raw = os.getenv("PNPI_TRUSTED_PROXY_NETWORKS", _DEFAULT_TRUSTED_PROXIES)
    networks: list[ipaddress.IPv4Network | ipaddress.IPv6Network] = []
    for value in raw.split(","):
        value = value.strip()
        if value:
            try:
                networks.append(ipaddress.ip_network(value, strict=False))
            except ValueError:
                continue
    return networks


def _is_trusted_proxy(address: str) -> bool:
    try:
        ip = ipaddress.ip_address(address)
    except ValueError:
        return False
    return any(ip in network for network in _trusted_proxy_networks())


def get_client_ip(request: Request) -> str:
    """Return the first untrusted hop when the direct peer is trusted."""
    peer = request.client.host if request.client and request.client.host else "unknown"
    if not _is_trusted_proxy(peer):
        return peer

    forwarded_for = request.headers.get("x-forwarded-for", "")
    current = peer
    for candidate in reversed(forwarded_for.split(",")):
        candidate = candidate.strip()
        if not candidate or not _is_trusted_proxy(current):
            break
        try:
            current = str(ipaddress.ip_address(candidate))
        except ValueError:
            break
    return current
