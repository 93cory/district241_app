"""PNPI · Taches planifiees (a executer via cron).

Usage:
  python scripts/cron_tasks.py weekly-report
  python scripts/cron_tasks.py sla-check
  python scripts/cron_tasks.py cleanup
  python scripts/cron_tasks.py archive-expired
  python scripts/cron_tasks.py reminders
"""

import logging
import os
import sys

# Add parent dir to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("pnpi.cron")

from sqlalchemy import select

from app.core.email import SMTP_ENABLED
from app.core.executive_report import generate_executive_report
from app.database import SessionLocal, now_utc


def task_weekly_report():
    """Generate and email weekly executive report."""
    logger.info("Generating weekly executive report...")
    db = SessionLocal()
    try:
        pdf = generate_executive_report(db)

        # Find admin/minister emails
        from app.models.core import UserAccountORM

        users = db.execute(select(UserAccountORM).where(UserAccountORM.is_active.is_(True))).scalars().all()
        recipients = []
        for u in users:
            roles = set(u.roles_csv.split(","))
            if roles & {"admin", "ministre", "directeur"}:
                # In production, users would have email addresses
                logger.info(f"  Would send to: {u.username} ({u.full_name})")

        # Save to disk
        now = now_utc()
        output_dir = os.path.join(os.path.dirname(__file__), "..", "app", "static", "reports")
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, f"rapport_executif_{now.strftime('%Y%m%d')}.pdf")
        with open(output_path, "wb") as f:
            f.write(pdf)
        logger.info(f"Report saved to: {output_path}")

        if SMTP_ENABLED and recipients:
            # Would attach PDF and send
            logger.info(f"Sending to {len(recipients)} recipients...")
        else:
            logger.info("SMTP not configured, skipping email delivery.")
    finally:
        db.close()
    logger.info("Weekly report complete.")


def task_sla_check():
    """Check SLA compliance and send alerts."""
    logger.info("Running SLA compliance check...")
    db = SessionLocal()
    try:
        from app.models.pnpi import AgrementTechniqueIndustrielORM

        now = now_utc()
        all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()

        terminal = {"approuve", "rejete", "expire"}
        overdue = [
            a
            for a in all_atis
            if a.statut not in terminal and (now.date() - a.date_soumission.date()).days > a.sla_jours
        ]

        logger.info(f"Total ATIs: {len(all_atis)}, Overdue: {len(overdue)}")

        for ati in overdue:
            age = (now.date() - ati.date_soumission.date()).days
            ratio = age / ati.sla_jours
            severity = "critical" if ratio >= 2 else "high" if ratio >= 1.5 else "medium"
            logger.warning(f"  ATI {ati.numero_ati}: {age}j / {ati.sla_jours}j SLA ({severity})")
    finally:
        db.close()
    logger.info("SLA check complete.")


def task_cleanup():
    """Clean up expired tokens and old audit events."""
    logger.info("Running cleanup...")
    db = SessionLocal()
    try:
        from datetime import timedelta

        from app.models.core import RefreshTokenORM

        now = now_utc()

        # Revoke expired tokens
        expired = (
            db.execute(
                select(RefreshTokenORM).where(
                    RefreshTokenORM.expires_at < now,
                    RefreshTokenORM.revoked_at.is_(None),
                )
            )
            .scalars()
            .all()
        )

        for token in expired:
            token.revoked_at = now

        if expired:
            db.commit()
            logger.info(f"Revoked {len(expired)} expired refresh tokens.")
        else:
            logger.info("No expired tokens to revoke.")

        # Delete revoked tokens older than 30 days
        cutoff_30d = now - timedelta(days=30)
        old_revoked = (
            db.execute(
                select(RefreshTokenORM).where(
                    RefreshTokenORM.revoked_at.isnot(None),
                    RefreshTokenORM.revoked_at < cutoff_30d,
                )
            )
            .scalars()
            .all()
        )
        for t in old_revoked:
            db.delete(t)
        if old_revoked:
            db.commit()
            logger.info(f"Deleted {len(old_revoked)} old revoked tokens.")

        # Delete read notifications older than 90 days
        from app.models.core import NotificationORM

        cutoff_90d = now - timedelta(days=90)
        old_notifs = (
            db.execute(
                select(NotificationORM).where(
                    NotificationORM.is_read.is_(True),
                    NotificationORM.created_at < cutoff_90d,
                )
            )
            .scalars()
            .all()
        )
        for n in old_notifs:
            db.delete(n)
        if old_notifs:
            db.commit()
            logger.info(f"Deleted {len(old_notifs)} old read notifications.")

        # Delete login history older than 180 days
        from app.models.core import LoginHistoryORM

        cutoff_180d = now - timedelta(days=180)
        old_logins = (
            db.execute(
                select(LoginHistoryORM).where(
                    LoginHistoryORM.created_at < cutoff_180d,
                )
            )
            .scalars()
            .all()
        )
        for entry in old_logins:
            db.delete(entry)
        if old_logins:
            db.commit()
            logger.info(f"Deleted {len(old_logins)} old login history entries.")

    finally:
        db.close()
    logger.info("Cleanup complete.")


def task_generate_reminders():
    """Generer rappels SLA + renouvellement (90/60/30j avant expiration)."""
    logger.info("Generating SLA + renewal reminders...")
    db = SessionLocal()
    try:
        import uuid

        from app.models.pnpi import AgrementTechniqueIndustrielORM, ATIReminderORM

        now = now_utc()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        terminal_active = {"approuve", "rejete", "expire"}

        all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
        created = 0

        for ati in all_atis:
            # --- SLA (ATI en cours) ---
            if ati.statut not in terminal_active:
                age = (now.date() - ati.date_soumission.date()).days
                sla_pct = (age / ati.sla_jours * 100) if ati.sla_jours else 0

                rtype = msg = None
                if sla_pct >= 100:
                    rtype, msg = "sla_breach", f"URGENT : ATI {ati.numero_ati} depasse SLA ({age}j/{ati.sla_jours}j)."
                elif sla_pct >= 80:
                    rtype, msg = "sla_warning", f"Rappel : ATI {ati.numero_ati} approche SLA ({age}j/{ati.sla_jours}j)."

                if rtype:
                    existing = db.execute(
                        select(ATIReminderORM).where(
                            ATIReminderORM.ati_id == ati.id,
                            ATIReminderORM.type == rtype,
                            ATIReminderORM.scheduled_at >= today_start,
                        )
                    ).scalar_one_or_none()
                    if not existing:
                        recipient = getattr(ati, "instructeur_username", None) or "admin"
                        db.add(
                            ATIReminderORM(
                                id=str(uuid.uuid4()),
                                ati_id=ati.id,
                                type=rtype,
                                recipient_username=recipient,
                                message=msg,
                                scheduled_at=now,
                            )
                        )
                        created += 1

            # --- Renouvellement (ATI approuve) ---
            if ati.statut == "approuve" and ati.date_expiration:
                days_left = (ati.date_expiration.date() - now.date()).days
                rtype = msg = None
                if days_left < 0:
                    rtype, msg = "renewal_expired", f"EXPIRE : ATI {ati.numero_ati} depuis {abs(days_left)}j."
                elif days_left <= 30:
                    rtype, msg = "renewal_30", f"A renouveler : ATI {ati.numero_ati} expire dans {days_left}j."
                elif days_left <= 60:
                    rtype, msg = (
                        "renewal_60",
                        f"Preparer renouvellement : ATI {ati.numero_ati} expire dans {days_left}j.",
                    )
                elif days_left <= 90:
                    rtype, msg = "renewal_90", f"A anticiper : ATI {ati.numero_ati} expire dans {days_left}j."

                if rtype:
                    existing = db.execute(
                        select(ATIReminderORM).where(
                            ATIReminderORM.ati_id == ati.id,
                            ATIReminderORM.type == rtype,
                        )
                    ).scalar_one_or_none()
                    if not existing:
                        recipients = set()
                        if ati.instructeur_username:
                            recipients.add(ati.instructeur_username)
                        if ati.created_by:
                            recipients.add(ati.created_by)
                        if not recipients:
                            recipients.add("admin")
                        for r in recipients:
                            db.add(
                                ATIReminderORM(
                                    id=str(uuid.uuid4()),
                                    ati_id=ati.id,
                                    type=rtype,
                                    recipient_username=r,
                                    message=msg,
                                    scheduled_at=now,
                                )
                            )
                            created += 1

        db.commit()
        logger.info(f"Reminders: {created} nouveaux rappels crees.")
    finally:
        db.close()


def task_archive_expired():
    """Bascule automatiquement les ATI 'approuve' dont la date_expiration est passee.

    Sans ce cron, le tableau ministeriel affiche encore 'approuve' des ATI dont
    l'agrement a expire depuis des mois.
    """
    logger.info("Archiving expired ATIs (approuve -> expire)...")
    db = SessionLocal()
    try:
        from app.core.audit import write_audit_event
        from app.models.pnpi import AgrementTechniqueIndustrielORM

        now = now_utc()
        expired = (
            db.execute(
                select(AgrementTechniqueIndustrielORM).where(
                    AgrementTechniqueIndustrielORM.statut == "approuve",
                    AgrementTechniqueIndustrielORM.date_expiration.isnot(None),
                    AgrementTechniqueIndustrielORM.date_expiration < now,
                )
            )
            .scalars()
            .all()
        )

        for ati in expired:
            ati.statut = "expire"
            ati.updated_at = now

        if expired:
            write_audit_event(
                db,
                actor="system.cron",
                action="ati.bulk_archive_expired",
                target=f"{len(expired)} ATIs",
                details=f"Bascule auto approuve->expire (cron). IDs: {', '.join(a.numero_ati for a in expired[:20])}",
            )
            db.commit()
            logger.info(f"Archived {len(expired)} expired ATI(s).")
        else:
            logger.info("No expired ATI to archive.")
    finally:
        db.close()


TASKS = {
    "weekly-report": task_weekly_report,
    "sla-check": task_sla_check,
    "cleanup": task_cleanup,
    "reminders": task_generate_reminders,
    "archive-expired": task_archive_expired,
}


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in TASKS:
        print(f"Usage: python {sys.argv[0]} <{'|'.join(TASKS.keys())}>")
        sys.exit(1)

    task_name = sys.argv[1]
    logger.info(f"=== PNPI Cron: {task_name} ===")
    TASKS[task_name]()
    logger.info(f"=== Done: {task_name} ===")
