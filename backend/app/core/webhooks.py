"""PNPI — Webhooks pour integration avec systemes externes (douanes, emploi, fiscalite)."""
from __future__ import annotations

import json
import logging
from typing import Any, Dict, Optional

import httpx

from ..config import settings

logger = logging.getLogger("pnpi.webhooks")

# Webhook endpoints configured via environment
WEBHOOK_ENDPOINTS = {
    "ati_approved": settings.alert_webhook_url,  # Reuse existing webhook config
    "inspection_complete": "",
    "operator_registered": "",
}


async def dispatch_webhook(event_type: str, payload: Dict[str, Any]) -> bool:
    """Dispatch a webhook event to configured endpoints."""
    url = WEBHOOK_ENDPOINTS.get(event_type, "").strip()
    if not url:
        logger.debug(f"[WEBHOOK] Pas d'URL configuree pour {event_type}")
        return False

    body = {
        "event": event_type,
        "timestamp": payload.get("timestamp", ""),
        "source": "pnpi-gabon",
        "data": payload,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                url,
                json=body,
                headers={
                    "Content-Type": "application/json",
                    "X-PNPI-Event": event_type,
                    "X-PNPI-Signature": _sign_payload(json.dumps(body)),
                },
            )
        logger.info(f"[WEBHOOK] {event_type} -> {url} ({response.status_code})")
        return response.status_code < 400
    except Exception as e:
        logger.error(f"[WEBHOOK] Echec {event_type} -> {url}: {e}")
        return False


def _sign_payload(payload: str) -> str:
    """Sign webhook payload with HMAC-SHA256."""
    import hashlib
    import hmac
    secret = settings.secret_key.encode("utf-8")
    return hmac.new(secret, payload.encode("utf-8"), hashlib.sha256).hexdigest()


# Convenience functions for common events

async def notify_ati_approved(ati_id: str, numero_ati: str, operateur: str, secteur: str):
    await dispatch_webhook("ati_approved", {
        "ati_id": ati_id,
        "numero_ati": numero_ati,
        "operateur": operateur,
        "secteur": secteur,
        "action": "approved",
    })


async def notify_inspection_complete(inspection_id: str, operateur: str, statut: str):
    await dispatch_webhook("inspection_complete", {
        "inspection_id": inspection_id,
        "operateur": operateur,
        "statut_conformite": statut,
    })


async def notify_operator_registered(operateur_id: str, raison_sociale: str, nif: str, secteur: str):
    await dispatch_webhook("operator_registered", {
        "operateur_id": operateur_id,
        "raison_sociale": raison_sociale,
        "nif_gabon": nif,
        "secteur": secteur,
    })
