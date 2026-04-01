"""PNPI — Taches planifiees (a executer via cron).

Usage:
  python scripts/cron_tasks.py weekly-report
  python scripts/cron_tasks.py sla-check
  python scripts/cron_tasks.py cleanup
"""
import sys
import os
import logging

# Add parent dir to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("pnpi.cron")

from app.database import SessionLocal
from app.core.executive_report import generate_executive_report
from app.core.email import send_email, SMTP_ENABLED
from app.database import now_utc
from sqlalchemy import select


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
            a for a in all_atis
            if a.statut not in terminal
            and (now.date() - a.date_soumission.date()).days > a.sla_jours
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
        from app.models.core import RefreshTokenORM
        from datetime import timedelta
        now = now_utc()

        # Revoke expired tokens
        expired = db.execute(
            select(RefreshTokenORM).where(
                RefreshTokenORM.expires_at < now,
                RefreshTokenORM.revoked_at.is_(None),
            )
        ).scalars().all()

        for token in expired:
            token.revoked_at = now

        if expired:
            db.commit()
            logger.info(f"Revoked {len(expired)} expired refresh tokens.")
        else:
            logger.info("No expired tokens to revoke.")

        # Delete revoked tokens older than 30 days
        cutoff_30d = now - timedelta(days=30)
        old_revoked = db.execute(
            select(RefreshTokenORM).where(
                RefreshTokenORM.revoked_at.isnot(None),
                RefreshTokenORM.revoked_at < cutoff_30d,
            )
        ).scalars().all()
        for t in old_revoked:
            db.delete(t)
        if old_revoked:
            db.commit()
            logger.info(f"Deleted {len(old_revoked)} old revoked tokens.")

        # Delete read notifications older than 90 days
        from app.models.core import NotificationORM
        cutoff_90d = now - timedelta(days=90)
        old_notifs = db.execute(
            select(NotificationORM).where(
                NotificationORM.is_read.is_(True),
                NotificationORM.created_at < cutoff_90d,
            )
        ).scalars().all()
        for n in old_notifs:
            db.delete(n)
        if old_notifs:
            db.commit()
            logger.info(f"Deleted {len(old_notifs)} old read notifications.")

        # Delete login history older than 180 days
        from app.models.core import LoginHistoryORM
        cutoff_180d = now - timedelta(days=180)
        old_logins = db.execute(
            select(LoginHistoryORM).where(
                LoginHistoryORM.created_at < cutoff_180d,
            )
        ).scalars().all()
        for l in old_logins:
            db.delete(l)
        if old_logins:
            db.commit()
            logger.info(f"Deleted {len(old_logins)} old login history entries.")

    finally:
        db.close()
    logger.info("Cleanup complete.")


TASKS = {
    "weekly-report": task_weekly_report,
    "sla-check": task_sla_check,
    "cleanup": task_cleanup,
}


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in TASKS:
        print(f"Usage: python {sys.argv[0]} <{'|'.join(TASKS.keys())}>")
        sys.exit(1)

    task_name = sys.argv[1]
    logger.info(f"=== PNPI Cron: {task_name} ===")
    TASKS[task_name]()
    logger.info(f"=== Done: {task_name} ===")
