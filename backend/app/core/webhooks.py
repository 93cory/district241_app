"""PNPI · Webhooks pour integration avec systemes externes (douanes, emploi, fiscalite)."""

from __future__ import annotations

import ipaddress
import json
import logging
from typing import Any
from urllib.parse import urlparse

import httpx

from ..config import settings

logger = logging.getLogger("pnpi.webhooks")


def _is_safe_url(url: str) -> bool:
    """Validate webhook URL to prevent SSRF attacks against internal services."""
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        hostname = parsed.hostname or ""
        # Block private/internal hostnames
        if hostname in ("localhost", "127.0.0.1", "0.0.0.0", "::1", ""):  # noqa: S104
            return False
        if hostname.endswith(".local") or hostname.endswith(".internal"):
            return False
        # Block private IP ranges
        try:
            ip = ipaddress.ip_address(hostname)
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
                return False
        except ValueError:
            pass  # hostname is a domain name, not an IP · OK
        # Block metadata endpoints (cloud)
        return hostname not in ("169.254.169.254", "metadata.google.internal")
    except Exception:
        return False


# Webhook endpoints configured via environment
WEBHOOK_ENDPOINTS = {
    "ati_approved": settings.alert_webhook_url,  # Reuse existing webhook config
    "inspection_complete": "",
    "operator_registered": "",
}


async def dispatch_webhook(event_type: str, payload: dict[str, Any]) -> bool:
    """Dispatch a webhook event to configured endpoints."""
    url = WEBHOOK_ENDPOINTS.get(event_type, "").strip()
    if not url:
        logger.debug(f"[WEBHOOK] Pas d'URL configuree pour {event_type}")
        return False
    if not _is_safe_url(url):
        logger.error(f"[WEBHOOK] URL bloquee (SSRF protection): {url}")
        return False

    body = {
        "event": event_type,
        "timestamp": payload.get("timestamp", ""),
        "source": "pnpi-gabon",
        "data": payload,
    }

    headers = {
        "Content-Type": "application/json",
        "X-PNPI-Event": event_type,
        "X-PNPI-Signature": _sign_payload(json.dumps(body)),
        "User-Agent": "PNPI-Webhook/1.0",
    }

    # Retry up to 2 times with backoff
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, json=body, headers=headers)
            if response.status_code < 400:
                logger.info(f"[WEBHOOK] {event_type} -> {url} ({response.status_code})")
                return True
            logger.warning(f"[WEBHOOK] {event_type} -> {url} ({response.status_code}), attempt {attempt + 1}")
        except Exception as e:
            logger.error(f"[WEBHOOK] Echec {event_type} -> {url}: {e}, attempt {attempt + 1}")
        if attempt < 2:
            import asyncio

            await asyncio.sleep(1 * (attempt + 1))  # 1s, 2s backoff

    return False


def _sign_payload(payload: str) -> str:
    """Sign webhook payload with HMAC-SHA256."""
    import hashlib
    import hmac

    secret = settings.secret_key.encode("utf-8")
    return hmac.new(secret, payload.encode("utf-8"), hashlib.sha256).hexdigest()


# Convenience functions for common events


async def notify_ati_approved(ati_id: str, numero_ati: str, operateur: str, secteur: str):
    await dispatch_webhook(
        "ati_approved",
        {
            "ati_id": ati_id,
            "numero_ati": numero_ati,
            "operateur": operateur,
            "secteur": secteur,
            "action": "approved",
        },
    )


async def notify_inspection_complete(inspection_id: str, operateur: str, statut: str):
    await dispatch_webhook(
        "inspection_complete",
        {
            "inspection_id": inspection_id,
            "operateur": operateur,
            "statut_conformite": statut,
        },
    )


async def notify_operator_registered(operateur_id: str, raison_sociale: str, nif: str, secteur: str):
    await dispatch_webhook(
        "operator_registered",
        {
            "operateur_id": operateur_id,
            "raison_sociale": raison_sociale,
            "nif_gabon": nif,
            "secteur": secteur,
        },
    )
