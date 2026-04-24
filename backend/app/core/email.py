"""PNPI · Service d'envoi d'emails."""

from __future__ import annotations

import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger("pnpi.email")

SMTP_HOST = os.getenv("PNPI_SMTP_HOST", "")
SMTP_PORT = int(os.getenv("PNPI_SMTP_PORT", "587"))
SMTP_USER = os.getenv("PNPI_SMTP_USER", "")
SMTP_PASSWORD = os.getenv("PNPI_SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("PNPI_SMTP_FROM", "noreply@pnpi-gabon.ga")
SMTP_ENABLED = bool(SMTP_HOST and SMTP_USER)


def send_email(
    to: list[str],
    subject: str,
    body_html: str,
    body_text: str | None = None,
) -> bool:
    """Send an email. Returns True on success."""
    if not SMTP_ENABLED:
        logger.debug(f"[EMAIL] SMTP non configure, email non envoye: {subject}")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"[PNPI] {subject}"
        msg["From"] = SMTP_FROM
        msg["To"] = ", ".join(to)

        if body_text:
            msg.attach(MIMEText(body_text, "plain", "utf-8"))
        msg.attach(MIMEText(body_html, "html", "utf-8"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)

        logger.info(f"[EMAIL] Envoye: {subject} -> {to}")
        return True
    except Exception as e:
        logger.error(f"[EMAIL] Echec envoi: {e}")
        return False


# --- Email Templates ---


def email_ati_approved(to: list[str], ati_numero: str, operateur: str) -> bool:
    subject = f"ATI {ati_numero} approuve"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #006233; color: white; padding: 20px; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">PNPI · Agrement Technique Industriel</h1>
      </div>
      <div style="padding: 24px; background: #f6f8fb; border-radius: 0 0 12px 12px;">
        <h2 style="color: #006233; margin-top: 0;">ATI Approuve</h2>
        <p>L'agrement technique industriel <strong>{ati_numero}</strong> pour l'operateur
        <strong>{operateur}</strong> a ete approuve.</p>
        <p>Vous pouvez consulter les details sur la plateforme PNPI.</p>
        <a href="https://pnpi-gabon.ga/pnpi/ati" style="display: inline-block; padding: 12px 24px; background: #006233; color: white; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Voir sur PNPI
        </a>
      </div>
      <p style="color: #999; font-size: 11px; text-align: center; margin-top: 16px;">
        Ministere de l'Industrie et de la Transformation Locale du Gabon
      </p>
    </div>
    """
    return send_email(to, subject, html)


def email_ati_rejected(to: list[str], ati_numero: str, operateur: str, motif: str) -> bool:
    subject = f"ATI {ati_numero} rejete"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #b42318; color: white; padding: 20px; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">PNPI · Agrement Technique Industriel</h1>
      </div>
      <div style="padding: 24px; background: #f6f8fb; border-radius: 0 0 12px 12px;">
        <h2 style="color: #b42318; margin-top: 0;">ATI Rejete</h2>
        <p>L'agrement technique industriel <strong>{ati_numero}</strong> pour l'operateur
        <strong>{operateur}</strong> a ete rejete.</p>
        <p><strong>Motif :</strong> {motif}</p>
        <p>Vous pouvez corriger et resoumettre votre demande sur la plateforme.</p>
        <a href="https://pnpi-gabon.ga/pnpi/ati" style="display: inline-block; padding: 12px 24px; background: #006233; color: white; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Corriger et resoumettre
        </a>
      </div>
      <p style="color: #999; font-size: 11px; text-align: center; margin-top: 16px;">
        Ministere de l'Industrie et de la Transformation Locale du Gabon
      </p>
    </div>
    """
    return send_email(to, subject, html)


def email_sla_alert(to: list[str], ati_numero: str, days_overdue: int, severity: str) -> bool:
    subject = f"Alerte SLA · ATI {ati_numero} en retard de {days_overdue} jours"
    color = "#b42318" if severity == "critical" else "#f2b800"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: {color}; color: white; padding: 20px; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">PNPI · Alerte SLA</h1>
      </div>
      <div style="padding: 24px; background: #f6f8fb; border-radius: 0 0 12px 12px;">
        <h2 style="color: {color}; margin-top: 0;">Depassement SLA · {severity.upper()}</h2>
        <p>L'ATI <strong>{ati_numero}</strong> est en retard de <strong>{days_overdue} jours</strong>
        par rapport au delai SLA.</p>
        <p>Action requise de votre part.</p>
        <a href="https://pnpi-gabon.ga/pnpi/ati" style="display: inline-block; padding: 12px 24px; background: #006233; color: white; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Voir le dossier
        </a>
      </div>
      <p style="color: #999; font-size: 11px; text-align: center; margin-top: 16px;">
        Ministere de l'Industrie et de la Transformation Locale du Gabon
      </p>
    </div>
    """
    return send_email(to, subject, html)


def email_inspection_complete(to: list[str], inspection_id: str, operateur: str, statut: str) -> bool:
    subject = f"Inspection {inspection_id} terminee · {statut}"
    color = "#006233" if statut == "conforme" else "#b42318"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #0d3f78; color: white; padding: 20px; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">PNPI · Inspection de Conformite</h1>
      </div>
      <div style="padding: 24px; background: #f6f8fb; border-radius: 0 0 12px 12px;">
        <h2 style="margin-top: 0;">Inspection Terminee</h2>
        <p>L'inspection de l'operateur <strong>{operateur}</strong> est terminee.</p>
        <p>Resultat : <strong style="color: {color}">{statut.upper()}</strong></p>
        <a href="https://pnpi-gabon.ga/pnpi/inspections/{inspection_id}" style="display: inline-block; padding: 12px 24px; background: #006233; color: white; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Voir le rapport
        </a>
      </div>
      <p style="color: #999; font-size: 11px; text-align: center; margin-top: 16px;">
        Ministere de l'Industrie et de la Transformation Locale du Gabon
      </p>
    </div>
    """
    return send_email(to, subject, html)
