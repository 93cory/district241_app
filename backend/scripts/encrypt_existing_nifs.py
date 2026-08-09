"""PNPI · Migration des NIF existants vers `nif_gabon_encrypted` +
`nif_gabon_hash`.

Usage :
    PNPI_FIELD_ENCRYPTION_KEY="..." python backend/scripts/encrypt_existing_nifs.py

Ce script :
1. Charge tous les operateurs ou `nif_gabon_encrypted` IS NULL ou
   `nif_gabon_hash` IS NULL (lignes creees avant que `set_nif()` soit
   effectivement appele partout, ou lignes legacy pre-migration 37/48).
2. Chiffre `nif_gabon` (clair) -> `nif_gabon_encrypted` si manquant.
3. Calcule l'empreinte HMAC de recherche -> `nif_gabon_hash` si manquant.
4. Conserve `nif_gabon` en clair pour la phase de transition (les
   migrations alembic 37/48 ne le suppriment PAS ; le code applicatif lit
   en priorite la colonne chiffree via la property `nif`).

Idempotent : peut etre relance sans risque, les lignes deja completes sont
ignorees.

Une fois 100% des lignes migrees ET un cycle complet de prod sans incident,
une migration future pourra dropper/masquer `nif_gabon` — cf le plan detaille
dans `docs/audit-deep/db-integrity.md` (section chiffrement NIF). Ce dernier
pas n'est PAS fait par ce script : il touche la recherche/l'affichage/les
API d'integration externes (cf `routers/integration.py`) et merite un passage
dedie plutot qu'un effet de bord d'un backfill.
"""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import or_, select

from app.core.encryption import encrypt_str, hash_for_lookup, is_encryption_enabled
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
            db.execute(
                select(OperateurIndustrielORM).where(
                    or_(
                        OperateurIndustrielORM.nif_gabon_encrypted.is_(None),
                        OperateurIndustrielORM.nif_gabon_hash.is_(None),
                    )
                )
            )
            .scalars()
            .all()
        )
        for op in ops:
            try:
                if not op.nif_gabon:
                    skipped += 1
                    continue
                if op.nif_gabon_encrypted is None:
                    op.nif_gabon_encrypted = encrypt_str(op.nif_gabon)
                if op.nif_gabon_hash is None:
                    op.nif_gabon_hash = hash_for_lookup(op.nif_gabon)
                migrated += 1
            except Exception as exc:
                print(f"[ERROR] op {op.id}: {exc}")
                failed += 1
        db.commit()

    print(f"[OK] migrated={migrated} skipped={skipped} failed={failed}")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
