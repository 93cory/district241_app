"""PNPI · Domaine 12 sécurité, SOC, cybersécurité opérationnelle et audit."""

from __future__ import annotations

from collections import Counter
from datetime import timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.auth import Role, User, require_roles
from ..database import as_utc, get_db, now_utc
from ..models.core import AuditEventORM, LoginHistoryORM, RefreshTokenORM, UserAccountORM

router = APIRouter(prefix="/pnpi/securite", tags=["Sécurité opérationnelle"])

READ_ROLES = (Role.admin, Role.ministre, Role.directeur)

SECURITY_RULES = [
    {
        "code": "SEC-CYB-007",
        "libelle": "Tout incident est enregistré et historisé.",
        "statut": "partiel",
        "preuve": "audit_events + login_history disponibles ; registre incident dédié à créer.",
    },
    {
        "code": "SEC-CYB-008",
        "libelle": "Les événements critiques sont analysés sans délai injustifié.",
        "statut": "partiel",
        "preuve": "Le cockpit priorise les échecs, comptes verrouillés et actions sensibles.",
    },
    {
        "code": "SEC-CYB-009",
        "libelle": "Les vulnérabilités critiques sont traitées en priorité.",
        "statut": "prototype",
        "preuve": "Processus à relier aux scans, dépendances et tickets de remédiation.",
    },
    {
        "code": "SEC-CYB-010",
        "libelle": "Les preuves numériques sont préservées.",
        "statut": "partiel",
        "preuve": "Audit log et historique de connexion horodatés.",
    },
    {
        "code": "SEC-CYB-011",
        "libelle": "Les journaux de sécurité sont protégés contre toute altération.",
        "statut": "prototype",
        "preuve": "Export/archivage immuable à formaliser pour le mode production.",
    },
    {
        "code": "SEC-CYB-012",
        "libelle": "Les API exposées appliquent authentification et autorisation.",
        "statut": "implémenté",
        "preuve": "JWT, rôles, rate limit, proxy sécurisé et contrôles RBAC.",
    },
    {
        "code": "SEC-CYB-013",
        "libelle": "Chaque incident majeur fait l'objet d'un retour d'expérience.",
        "statut": "à structurer",
        "preuve": "Workflow REX/SOC à ajouter.",
    },
    {
        "code": "SEC-CYB-014",
        "libelle": "Les tableaux de bord de sécurité sont alimentés automatiquement.",
        "statut": "implémenté",
        "preuve": "Cockpit SOC alimenté par login_history, refresh_tokens, users et audit_events.",
    },
]


def _recent(items, days: int):
    threshold = now_utc() - timedelta(days=days)
    return [
        item
        for item in items
        if as_utc(getattr(item, "created_at", None) or getattr(item, "timestamp", None))
        and as_utc(getattr(item, "created_at", None) or getattr(item, "timestamp", None)) >= threshold
    ]


def _severity_from_score(score: int) -> str:
    if score >= 75:
        return "critique"
    if score >= 50:
        return "élevé"
    if score >= 25:
        return "modéré"
    return "faible"


@router.get("/soc", summary="Cockpit SOC et cybersécurité opérationnelle")
async def soc_cockpit(
    _: User = Depends(require_roles(*READ_ROLES)),
    db: Session = Depends(get_db),
):
    users = db.execute(select(UserAccountORM)).scalars().all()
    login_history = (
        db.execute(select(LoginHistoryORM).order_by(LoginHistoryORM.created_at.desc()).limit(500)).scalars().all()
    )
    audit_events = db.execute(select(AuditEventORM).order_by(AuditEventORM.timestamp.desc()).limit(500)).scalars().all()
    refresh_tokens = (
        db.execute(select(RefreshTokenORM).order_by(RefreshTokenORM.issued_at.desc()).limit(500)).scalars().all()
    )

    recent_logins = _recent(login_history, 7)
    failed_logins = [row for row in recent_logins if not row.success]
    successful_logins = [row for row in recent_logins if row.success]
    locked_users = [
        row for row in users if row.locked_until and as_utc(row.locked_until) and as_utc(row.locked_until) >= now_utc()
    ]
    active_tokens = [
        row
        for row in refresh_tokens
        if row.revoked_at is None and as_utc(row.expires_at) and as_utc(row.expires_at) >= now_utc()
    ]
    sensitive_audits = [
        row
        for row in _recent(audit_events, 7)
        if any(keyword in row.action for keyword in ["delete", "update_user", "impersonate", "archive", "transition"])
    ]
    failed_by_user = Counter(row.username for row in failed_logins)
    failed_by_ip = Counter(row.ip_address or "inconnue" for row in failed_logins)

    risk_score = min(
        100,
        len(failed_logins) * 3
        + len(locked_users) * 12
        + max(0, len(active_tokens) - len(users)) * 2
        + len(sensitive_audits) * 2
        + sum(10 for _, count in failed_by_user.items() if count >= 5),
    )
    alerts = []
    if failed_logins:
        alerts.append(
            {
                "severity": "élevé" if len(failed_logins) >= 10 else "modéré",
                "title": "Tentatives de connexion échouées",
                "message": f"{len(failed_logins)} échec(s) de connexion sur 7 jours.",
            }
        )
    if locked_users:
        alerts.append(
            {
                "severity": "élevé",
                "title": "Comptes verrouillés",
                "message": f"{len(locked_users)} compte(s) actuellement verrouillé(s).",
            }
        )
    if sensitive_audits:
        alerts.append(
            {
                "severity": "modéré",
                "title": "Actions sensibles récentes",
                "message": f"{len(sensitive_audits)} action(s) sensibles détectée(s) dans l'audit.",
            }
        )

    mfa_enabled = sum(1 for row in users if row.totp_enabled)
    mfa_rate = round((mfa_enabled / len(users)) * 100, 1) if users else 0
    return {
        "generated_at": now_utc().isoformat(),
        "risk_score": risk_score,
        "risk_level": _severity_from_score(risk_score),
        "stats": {
            "users": len(users),
            "active_users": sum(1 for row in users if row.is_active),
            "mfa_enabled": mfa_enabled,
            "mfa_rate": mfa_rate,
            "failed_logins_7d": len(failed_logins),
            "successful_logins_7d": len(successful_logins),
            "locked_users": len(locked_users),
            "active_sessions": len(active_tokens),
            "audit_events_7d": len(_recent(audit_events, 7)),
            "sensitive_actions_7d": len(sensitive_audits),
        },
        "alerts": alerts[:8],
        "top_failed_users": [{"username": key, "count": value} for key, value in failed_by_user.most_common(6)],
        "top_failed_ips": [{"ip": key, "count": value} for key, value in failed_by_ip.most_common(6)],
        "recent_events": [
            {
                "id": row.id,
                "actor": row.actor,
                "action": row.action,
                "target": row.target,
                "timestamp": row.timestamp.isoformat() if row.timestamp else None,
            }
            for row in audit_events[:12]
        ],
        "incident_cycle": [
            "Détection",
            "Qualification",
            "Analyse",
            "Confinement",
            "Éradication",
            "Restauration",
            "Retour d'expérience",
        ],
        "rules": SECURITY_RULES,
        "lecture_executive": (
            f"Niveau de risque SOC {_severity_from_score(risk_score)} ({risk_score}/100). "
            f"{len(failed_logins)} échec(s) de connexion, {len(locked_users)} compte(s) verrouillé(s), "
            f"{mfa_rate}% de comptes avec double authentification."
        ),
    }
