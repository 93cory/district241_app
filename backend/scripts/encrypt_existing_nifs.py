"""PNPI · Finalisation du chiffrement NIF : `nif_gabon_encrypted` +
`nif_gabon_hash` + masquage de `nif_gabon`.

Usage :
    PNPI_FIELD_ENCRYPTION_KEY="..." python backend/scripts/encrypt_existing_nifs.py

Ce script traite CHAQUE operateur (pas seulement les lignes incompletes,
car le masquage doit s'appliquer meme aux lignes deja partiellement
migrees) :

1. Determine la valeur en clair de reference :
   - si `nif_gabon_encrypted` est deja renseigne -> on dechiffre (source de
     verite pour une ligne deja migree, meme partiellement) ;
   - sinon -> `nif_gabon` est suppose encore en clair (ligne legacy jamais
     touchee par `set_nif()`).
   Cette distinction est essentielle : si on relit `nif_gabon` alors qu'il
   est deja masque, le hash/chiffre recalcule a partir du masque serait
   corrompu (ne represente plus le vrai NIF).
2. (Re)calcule `nif_gabon_encrypted` et `nif_gabon_hash` si manquants.
3. Ecrit la version masquee (derniers caracteres visibles, cf
   `core.encryption.mask_tail`) dans `nif_gabon` — jamais le clair complet.
   Idempotent : masquer une valeur deja masquee redonne le meme masque
   (les derniers caracteres ne changent pas).

Conserve la colonne `nif_gabon` (pas de DROP) : ~25 sites de lecture en
dependent encore comme fallback (`nif` property) ou pour la recherche
partielle (suffixe visible uniquement desormais) — cf
`docs/audit-deep/db-integrity.md` pour le detail des sites concernes et
`AGENTS.md`/`CLAUDE.md` pour la doc des nouvelles variables.

Idempotent : peut etre relance sans risque a tout moment.
"""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import select

from app.core.encryption import decrypt_str, encrypt_str, hash_for_lookup, is_encryption_enabled, mask_tail
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
        ops = db.execute(select(OperateurIndustrielORM)).scalars().all()
        for op in ops:
            try:
                reference = decrypt_str(op.nif_gabon_encrypted) if op.nif_gabon_encrypted else (op.nif_gabon or None)

                if not reference:
                    skipped += 1
                    continue

                if op.nif_gabon_encrypted is None:
                    op.nif_gabon_encrypted = encrypt_str(reference)
                if op.nif_gabon_hash is None:
                    op.nif_gabon_hash = hash_for_lookup(reference)
                op.nif_gabon = mask_tail(reference)
                migrated += 1
            except Exception as exc:
                print(f"[ERROR] op {op.id}: {exc}")
                failed += 1
        db.commit()

    print(f"[OK] migrated={migrated} skipped={skipped} failed={failed}")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
