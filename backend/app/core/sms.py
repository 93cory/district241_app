"""PNPI · Service d'envoi de SMS via Africa's Talking ou Twilio.

Configure via variables d'environnement :
  PNPI_SMS_PROVIDER=africastalking|twilio
  PNPI_AT_USERNAME, PNPI_AT_API_KEY (Africa's Talking)
  PNPI_TWILIO_SID, PNPI_TWILIO_TOKEN, PNPI_TWILIO_FROM (Twilio)
"""
from __future__ import annotations

import os
import logging

logger = logging.getLogger("pnpi.sms")

SMS_PROVIDER = os.environ.get("PNPI_SMS_PROVIDER", "")
SMS_ENABLED = SMS_PROVIDER in ("africastalking", "twilio")


def send_sms(to: str, message: str) -> dict:
    """Send an SMS to a phone number. Returns status dict."""
    if not SMS_ENABLED:
        logger.info(f"SMS (dry-run): {to} · {message[:50]}...")
        return {"status": "dry_run", "to": to, "message": message}

    if not to or not message:
        return {"status": "error", "detail": "Numero et message requis."}

    # Normalize Gabon phone numbers
    if to.startswith("0"):
        to = "+241" + to[1:]
    elif not to.startswith("+"):
        to = "+241" + to

    try:
        if SMS_PROVIDER == "africastalking":
            return _send_at(to, message)
        elif SMS_PROVIDER == "twilio":
            return _send_twilio(to, message)
    except Exception as e:
        logger.error(f"SMS error: {e}")
        return {"status": "error", "detail": str(e)}

    return {"status": "error", "detail": "Provider non reconnu."}


def _send_at(to: str, message: str) -> dict:
    """Send via Africa's Talking."""
    import africastalking
    username = os.environ.get("PNPI_AT_USERNAME", "")
    api_key = os.environ.get("PNPI_AT_API_KEY", "")
    africastalking.initialize(username, api_key)
    sms = africastalking.SMS
    response = sms.send(message, [to], sender_id="PNPI")
    return {"status": "sent", "provider": "africastalking", "response": str(response)}


def _send_twilio(to: str, message: str) -> dict:
    """Send via Twilio."""
    from twilio.rest import Client
    sid = os.environ.get("PNPI_TWILIO_SID", "")
    token = os.environ.get("PNPI_TWILIO_TOKEN", "")
    from_number = os.environ.get("PNPI_TWILIO_FROM", "")
    client = Client(sid, token)
    msg = client.messages.create(body=message, from_=from_number, to=to)
    return {"status": "sent", "provider": "twilio", "sid": msg.sid}


# Pre-built SMS templates
def sms_ati_approved(operator_name: str, numero_ati: str) -> str:
    return f"PNPI: Votre ATI {numero_ati} a ete approuve. Telechargez votre certificat sur pnpi-gabon.ga. · Ministere de l'Industrie"


def sms_ati_rejected(operator_name: str, numero_ati: str) -> str:
    return f"PNPI: Votre ATI {numero_ati} n'a pas ete approuve. Consultez les details et resoumettez sur pnpi-gabon.ga."


def sms_sla_warning(numero_ati: str, days_left: int) -> str:
    return f"PNPI: ATI {numero_ati} · {days_left} jours restants avant echeance SLA. Action requise."


def sms_inspection_scheduled(operator_name: str, date: str) -> str:
    return f"PNPI: Une inspection de conformite est prevue le {date} pour {operator_name}. Preparez vos documents."
