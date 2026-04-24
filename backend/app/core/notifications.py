"""PNPI · Service de notifications email pour les alertes SLA."""

from __future__ import annotations

import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "noreply@pnpi.gouv.ga")
SMTP_ENABLED = bool(SMTP_HOST and SMTP_USER and SMTP_PASSWORD)


def send_email(to: list[str], subject: str, html_body: str) -> bool:
    """Envoie un email HTML. Retourne True si succès, False sinon."""
    if not SMTP_ENABLED:
        logger.info(f"[NOTIFICATIONS] Email non configure · simuler envoi vers {to}: {subject}")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_FROM
        msg["To"] = ", ".join(to)
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, to, msg.as_string())
        logger.info(f"[NOTIFICATIONS] Email envoye vers {to}: {subject}")
        return True
    except Exception as exc:
        logger.error(f"[NOTIFICATIONS] Erreur envoi email: {exc}")
        return False


def notify_ati_approved(numero_ati: str, raison_sociale: str, to_emails: list[str]) -> bool:
    subject = f"[PNPI] ATI {numero_ati} approuve"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #003F8F; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">Agrement Technique Industriel Approuve</h2>
        <p style="margin: 4px 0 0; opacity: 0.8;">Plateforme Nationale de Pilotage Industriel</p>
      </div>
      <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <p>L'ATI <strong>{numero_ati}</strong> pour l'operateur <strong>{raison_sociale}</strong> a ete approuve.</p>
        <div style="background: #f0fdf4; border: 1px solid #10b981; border-radius: 6px; padding: 12px; margin: 16px 0;">
          <span style="color: #10b981; font-weight: bold;">✓ APPROUVE</span>
        </div>
        <p style="color: #6b7280; font-size: 12px;">Connectez-vous a la PNPI pour telecharger le document officiel.</p>
      </div>
    </div>
    """
    return send_email(to_emails, subject, html)


def notify_ati_rejected(numero_ati: str, raison_sociale: str, motif: str, to_emails: list[str]) -> bool:
    subject = f"[PNPI] ATI {numero_ati} rejete"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #b42318; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">Agrement Technique Industriel Rejete</h2>
        <p style="margin: 4px 0 0; opacity: 0.8;">Plateforme Nationale de Pilotage Industriel</p>
      </div>
      <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <p>L'ATI <strong>{numero_ati}</strong> pour l'operateur <strong>{raison_sociale}</strong> a ete rejete.</p>
        <div style="background: #fef2f2; border: 1px solid #ef4444; border-radius: 6px; padding: 12px; margin: 16px 0;">
          <strong>Motif :</strong> {motif or "Non specifie"}
        </div>
        <p style="color: #6b7280; font-size: 12px;">Vous pouvez soumettre une nouvelle demande apres correction des points signales.</p>
      </div>
    </div>
    """
    return send_email(to_emails, subject, html)


def notify_sla_overdue(overdue_atis: list[dict], to_emails: list[str]) -> bool:
    """overdue_atis: list of {numero_ati, type_activite, age_jours, sla_jours, instructeur}"""
    if not overdue_atis:
        return False
    subject = f"[PNPI] ALERTE SLA · {len(overdue_atis)} ATI(s) en retard"
    rows_html = "".join(
        f"<tr><td style='padding:6px 12px;border-bottom:1px solid #f3f4f6;font-family:monospace'>{a['numero_ati']}</td>"
        f"<td style='padding:6px 12px;border-bottom:1px solid #f3f4f6'>{a['type_activite'][:40]}</td>"
        f"<td style='padding:6px 12px;border-bottom:1px solid #f3f4f6;color:#d97706;font-weight:bold'>{a['age_jours']}j / {a['sla_jours']}j</td>"
        f"<td style='padding:6px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280'>{a.get('instructeur') or '·'}</td></tr>"
        for a in overdue_atis
    )
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
      <div style="background: #d97706; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">Alerte SLA · ATIs en retard</h2>
        <p style="margin: 4px 0 0; opacity: 0.8;">{len(overdue_atis)} dossier(s) depassent le delai reglementaire</p>
      </div>
      <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead><tr style="background:#f9fafb;">
            <th style="padding:8px 12px;text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase">Numero ATI</th>
            <th style="padding:8px 12px;text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase">Activite</th>
            <th style="padding:8px 12px;text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase">Age / SLA</th>
            <th style="padding:8px 12px;text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase">Instructeur</th>
          </tr></thead>
          <tbody>{rows_html}</tbody>
        </table>
        <p style="color:#6b7280;font-size:12px;margin-top:16px">Connectez-vous a la PNPI pour traiter ces dossiers en urgence.</p>
      </div>
    </div>
    """
    return send_email(to_emails, subject, html)
