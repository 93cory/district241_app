"""PNPI · Templates d'emails de notification."""

from __future__ import annotations


def _base_template(content: str, footer: str = "") -> str:
    """Wrap content in a branded email template."""
    return f"""<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f4f8fb;font-family:Manrope,Arial,sans-serif;">
<div style="max-width:560px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
  <!-- Header -->
  <div style="background:linear-gradient(135deg,#051B36,#006233);padding:24px 28px;text-align:center;">
    <div style="display:inline-block;padding:4px 14px;border-radius:16px;background:linear-gradient(90deg,#009E60,#FCD116,#003DA5);color:#fff;font-size:10px;font-weight:700;letter-spacing:1px;">REPUBLIQUE GABONAISE</div>
    <div style="color:#fff;font-size:20px;font-weight:800;margin-top:8px;">PNPI</div>
    <div style="color:rgba(255,255,255,0.7);font-size:12px;">Plateforme Nationale de la Politique Industrielle</div>
  </div>
  <!-- Body -->
  <div style="padding:28px;">
    {content}
  </div>
  <!-- Footer -->
  <div style="padding:16px 28px;background:#f4f8fb;text-align:center;font-size:11px;color:#9ca3af;">
    {footer}
    <div style="margin-top:6px;">Ministere de l'Industrie et de la Transformation Locale</div>
    <div>Ce message est automatique, merci de ne pas y repondre.</div>
  </div>
</div>
</body>
</html>"""


def email_ati_approved(
    operateur: str,
    numero_ati: str,
    type_activite: str,
    date_decision: str,
    verify_url: str,
) -> tuple[str, str]:
    """Email sent when an ATI is approved."""
    subject = f"ATI {numero_ati} · Agrement approuve"
    content = f"""
    <h2 style="color:#006233;margin:0 0 8px;font-size:18px;">Agrement approuve</h2>
    <p style="color:#526175;font-size:14px;line-height:1.6;">
      Bonjour,<br><br>
      Nous avons le plaisir de vous informer que l'agrement technique industriel
      <strong>N° {numero_ati}</strong> pour <strong>{operateur}</strong> a ete
      <span style="color:#006233;font-weight:700;">approuve</span>.
    </p>
    <div style="background:#dcfce7;border-radius:12px;padding:14px 18px;margin:16px 0;">
      <div style="font-size:13px;font-weight:600;color:#166534;">Activite agreee</div>
      <div style="font-size:14px;color:#0c2a4a;margin-top:4px;">{type_activite}</div>
      <div style="font-size:12px;color:#526175;margin-top:6px;">Decision du {date_decision}</div>
    </div>
    <a href="{verify_url}" style="display:inline-block;padding:10px 24px;background:#006233;color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;margin-top:8px;">
      Verifier en ligne
    </a>
    """
    return subject, _base_template(content)


def email_ati_rejected(
    operateur: str,
    numero_ati: str,
    motif: str,
    resubmit_url: str,
) -> tuple[str, str]:
    """Email sent when an ATI is rejected."""
    subject = f"ATI {numero_ati} · Demande rejetee"
    content = f"""
    <h2 style="color:#b42318;margin:0 0 8px;font-size:18px;">Demande rejetee</h2>
    <p style="color:#526175;font-size:14px;line-height:1.6;">
      Bonjour,<br><br>
      La demande d'agrement technique industriel <strong>N° {numero_ati}</strong>
      pour <strong>{operateur}</strong> a ete
      <span style="color:#b42318;font-weight:700;">rejetee</span>.
    </p>
    <div style="background:#fef2f2;border-radius:12px;padding:14px 18px;margin:16px 0;">
      <div style="font-size:13px;font-weight:600;color:#b42318;">Motif du rejet</div>
      <div style="font-size:14px;color:#0c2a4a;margin-top:4px;">{motif}</div>
    </div>
    <p style="font-size:14px;color:#526175;">
      Vous pouvez corriger votre demande et la soumettre a nouveau.
    </p>
    <a href="{resubmit_url}" style="display:inline-block;padding:10px 24px;background:#0c7eb4;color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;margin-top:8px;">
      Resoumettre
    </a>
    """
    return subject, _base_template(content)


def email_sla_warning(
    instructeur: str,
    numero_ati: str,
    jours_ecoules: int,
    sla_jours: int,
    ati_url: str,
) -> tuple[str, str]:
    """Email sent when an ATI approaches SLA deadline."""
    subject = f"SLA · ATI {numero_ati} approche de l'echeance"
    pct = round(jours_ecoules / sla_jours * 100)
    content = f"""
    <h2 style="color:#d97706;margin:0 0 8px;font-size:18px;">Alerte SLA</h2>
    <p style="color:#526175;font-size:14px;line-height:1.6;">
      Bonjour {instructeur},<br><br>
      Le dossier ATI <strong>N° {numero_ati}</strong> a atteint
      <strong style="color:#d97706;">{pct}%</strong> de son delai SLA
      ({jours_ecoules} jours / {sla_jours} jours).
    </p>
    <div style="background:#fef3c7;border-radius:12px;padding:14px 18px;margin:16px 0;">
      <div style="height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;">
        <div style="height:100%;width:{min(pct, 100)}%;background:{"#b42318" if pct >= 100 else "#d97706"};border-radius:4px;"></div>
      </div>
      <div style="font-size:12px;color:#92400e;margin-top:6px;text-align:center;">
        {jours_ecoules} / {sla_jours} jours
      </div>
    </div>
    <a href="{ati_url}" style="display:inline-block;padding:10px 24px;background:#d97706;color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">
      Traiter le dossier
    </a>
    """
    return subject, _base_template(content)


def email_inspection_scheduled(
    operateur: str,
    date_inspection: str,
    inspecteur: str,
    lieu: str,
) -> tuple[str, str]:
    """Email sent when an inspection is scheduled."""
    subject = f"Inspection de conformite planifiee · {date_inspection}"
    content = f"""
    <h2 style="color:#0c7eb4;margin:0 0 8px;font-size:18px;">Inspection planifiee</h2>
    <p style="color:#526175;font-size:14px;line-height:1.6;">
      Bonjour,<br><br>
      Une inspection de conformite est planifiee pour <strong>{operateur}</strong>.
    </p>
    <div style="background:#e0f2fe;border-radius:12px;padding:14px 18px;margin:16px 0;">
      <div style="display:flex;gap:16px;">
        <div>
          <div style="font-size:11px;color:#0c7eb4;font-weight:600;">Date</div>
          <div style="font-size:14px;font-weight:700;color:#0c2a4a;">{date_inspection}</div>
        </div>
        <div>
          <div style="font-size:11px;color:#0c7eb4;font-weight:600;">Inspecteur</div>
          <div style="font-size:14px;font-weight:700;color:#0c2a4a;">{inspecteur}</div>
        </div>
        <div>
          <div style="font-size:11px;color:#0c7eb4;font-weight:600;">Lieu</div>
          <div style="font-size:14px;font-weight:700;color:#0c2a4a;">{lieu}</div>
        </div>
      </div>
    </div>
    <p style="font-size:13px;color:#526175;">
      Veuillez vous assurer que les documents requis sont disponibles sur site.
    </p>
    """
    return subject, _base_template(content)


def email_weekly_briefing(
    recipient: str,
    soumissions: int,
    approuves: int,
    rejetes: int,
    inspections: int,
    sla_overdue: int,
    dashboard_url: str,
) -> tuple[str, str]:
    """Weekly executive briefing email."""
    subject = "PNPI · Briefing hebdomadaire"
    content = f"""
    <h2 style="color:#051B36;margin:0 0 8px;font-size:18px;">Briefing de la semaine</h2>
    <p style="color:#526175;font-size:14px;">Bonjour {recipient},</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:16px 0;">
      <div style="background:#f0fdf4;padding:12px;border-radius:10px;text-align:center;">
        <div style="font-size:24px;font-weight:800;color:#006233;">{soumissions}</div>
        <div style="font-size:11px;color:#526175;">Soumissions</div>
      </div>
      <div style="background:#dcfce7;padding:12px;border-radius:10px;text-align:center;">
        <div style="font-size:24px;font-weight:800;color:#006233;">{approuves}</div>
        <div style="font-size:11px;color:#526175;">Approuves</div>
      </div>
      <div style="background:#fef2f2;padding:12px;border-radius:10px;text-align:center;">
        <div style="font-size:24px;font-weight:800;color:#b42318;">{rejetes}</div>
        <div style="font-size:11px;color:#526175;">Rejetes</div>
      </div>
      <div style="background:#e0f2fe;padding:12px;border-radius:10px;text-align:center;">
        <div style="font-size:24px;font-weight:800;color:#0c7eb4;">{inspections}</div>
        <div style="font-size:11px;color:#526175;">Inspections</div>
      </div>
    </div>
    {"<div style='background:#fef3c7;border-radius:10px;padding:10px 14px;margin-bottom:16px;font-size:13px;color:#92400e;font-weight:600;text-align:center;'>" + str(sla_overdue) + " dossier(s) en depassement SLA</div>" if sla_overdue > 0 else ""}
    <a href="{dashboard_url}" style="display:inline-block;padding:10px 24px;background:#006233;color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">
      Voir le dashboard
    </a>
    """
    return subject, _base_template(content)
