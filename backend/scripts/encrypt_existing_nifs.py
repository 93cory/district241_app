"""PNPI · Migration des NIF existants vers `nif_gabon_encrypted`.

Usage :
    PNPI_FIELD_ENCRYPTION_KEY="..." python backend/scripts/encrypt_existing_nifs.py

Ce script :
1. Charge tous les operateurs ou `nif_gabon_encrypted` IS NULL
2. Chiffre `nif_gabon` (clair) et le stocke dans `nif_gabon_encrypted`
3. Conserve `nif_gabon` en clair pour la phase de transition (la migration
   alembic 37 ne le supprime PAS, le code applicatif lit en priorite la
   colonne chiffree).

Idempotent : peut etre relance sans risque, les lignes deja migrees sont
ignorees grace au filtre `nif_gabon_encrypted IS NULL`.

Une fois 100% des lignes migrees ET un cycle complet de prod sans incident,
une migration alembic future pourra dropper `nif_gabon`.
"""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import select

from app.core.encryption import encrypt_str, is_encryption_enabled
from app.database import SessionLocal
from app.models.pnpi import OperateurIndustrielORM


def main() -> int:
    if not is_encryption_enabled():
        print(
            "[FAIL] PNPI_FIELD_ENCRYPTION_KEY non defini. "
            "Generez une cle (Fernet.generate_key()) et exposez-la via env."
        )
        return 2

    migrated = 0
    skipped = 0
    failed = 0
    with SessionLocal() as db:
        ops = (
            db.execute(select(OperateurIndustrielORM).where(OperateurIndustrielORM.nif_gabon_encrypted.is_(None)))
            .scalars()
            .all()
        )
        for op in ops:
            try:
                if not op.nif_gabon:
                    skipped += 1
                    continue
                op.nif_gabon_encrypted = encrypt_str(op.nif_gabon)
                migrated += 1
            except Exception as exc:
                print(f"[ERROR] op {op.id}: {exc}")
                failed += 1
        db.commit()

    print(f"[OK] migrated={migrated} skipped={skipped} failed={failed}")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
