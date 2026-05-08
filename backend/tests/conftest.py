"""PNPI · pytest fixtures.

Cette conftest isole la base de donnees pour les tests :

1.  Avant tout import de `app.*`, on force `PNPI_DATABASE_URL` a pointer
    vers un fichier SQLite local dedie aux tests (`./pnpi-test.db`).
    Sans cela, l'engine `app.database` se bind sur la base dev `pnpi.db`
    qui peut contenir des hashes bcrypt des executions precedentes,
    ne correspondant plus aux mots de passe `*-dev-password` du fallback
    `app.core.auth.fake_users_db` -> 401 systematique sur `/auth/token`.

2.  Une fixture `autouse, session-scoped` reinitialise les comptes
    `user_accounts` au tout debut de la session de tests pour garantir
    que les hashes correspondent bien aux mots de passe de demo
    (`admin/admin-dev-password`, `ministre/ministre-dev-password`, etc).

3.  Pour le couple cle de chiffrement Fernet, on n'expose volontairement
    aucune cle dans les tests : le fallback non-chiffre s'applique.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# 1. Path setup: rendre `app` importable
# ---------------------------------------------------------------------------
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

# ---------------------------------------------------------------------------
# 2. DB isolation : doit etre fait AVANT tout `from app.* import ...`
# ---------------------------------------------------------------------------
TEST_DB_FILE = BACKEND_ROOT / "pnpi-test.db"
# Permet d'override via env si CI veut une autre URL
os.environ.setdefault("PNPI_DATABASE_URL", f"sqlite:///{TEST_DB_FILE.as_posix()}")
# Force des creds dev stables (le fallback fake_users_db utilise les memes
# defauts si l'env n'est pas defini, mais on les normalise ici pour eviter
# qu'un shell parent ne contamine les tests).
_DEV_PASSWORDS = {
    "PNPI_ADMIN_PASSWORD": "admin-dev-password",
    "PNPI_MINISTRE_PASSWORD": "ministre-dev-password",
    "PNPI_DIRECTEUR_PASSWORD": "directeur-dev-password",
    "PNPI_INSTRUCTEUR_PASSWORD": "instructeur-dev-password",
    "PNPI_INSPECTEUR_PASSWORD": "inspecteur-dev-password",
    "PNPI_OPERATEUR_PASSWORD": "operateur-dev-password",
}
for _k, _v in _DEV_PASSWORDS.items():
    os.environ[_k] = _v
os.environ.setdefault("PNPI_ENV", "development")
os.environ.setdefault("PNPI_SECRET_KEY", "tests-pnpi-secret-key-do-not-use-in-prod")
# Feature flag: signature ministerielle obligatoire avant approbation.
# Active par defaut en prod, desactivee dans les tests legacy qui approuvent
# directement sans setup de signature. Un test dedie verifie l'enforcement
# (cf test_idor_fixes.py::test_signature_required_before_approval).
os.environ.setdefault("PNPI_FF_REQUIRE_SIGNATURE_APPROVAL", "0")
# Feature flag: dossier complet (4 documents requis) avant transition en_validation.
# Meme logique que la signature : active par defaut en prod, desactivee dans
# les tests legacy. Un test dedie verifie l'enforcement
# (cf test_idor_fixes.py::test_dossier_complet_required_before_en_validation).
os.environ.setdefault("PNPI_FF_REQUIRE_COMPLETE_DOSSIER", "0")

# ---------------------------------------------------------------------------
# 3. Fixture session-scoped : reinitialise les comptes au demarrage
# ---------------------------------------------------------------------------
import pytest


@pytest.fixture(scope="session", autouse=True)
def _reset_user_accounts():
    """Reseed des comptes user_accounts avec les hashes courants.

    Necessaire pour que `authenticate_user` matche les mots de passe
    `*-dev-password` attendus par les tests, meme si le fichier
    `pnpi-test.db` a ete cree par une execution anterieure ou avec
    une autre version du seed.
    """
    # Import ici, apres avoir setup PNPI_DATABASE_URL
    from app.core.auth import fake_users_db, get_fake_users_db, roles_to_csv
    from app.database import Base, SessionLocal, engine, now_utc
    from app.models.core import UserAccountORM

    # Crée toutes les tables (idempotent)
    Base.metadata.create_all(bind=engine)

    # Force lazy-init du fake_users_db et synchronise l'alias
    seeded = get_fake_users_db()
    fake_users_db.clear()
    fake_users_db.update(seeded)

    with SessionLocal() as db:
        for username, user in seeded.items():
            row = db.get(UserAccountORM, username)
            if row is None:
                row = UserAccountORM(
                    username=user.username,
                    full_name=user.full_name,
                    roles_csv=roles_to_csv(user.roles),
                    hashed_password=user.hashed_password,
                    is_active=True,
                    created_at=now_utc(),
                    failed_login_attempts=0,
                    locked_until=None,
                    password_updated_at=now_utc(),
                )
                db.add(row)
            else:
                # Re-aligne le hash (au cas ou il diverge) et debloque le compte
                row.hashed_password = user.hashed_password
                row.roles_csv = roles_to_csv(user.roles)
                row.is_active = True
                row.failed_login_attempts = 0
                row.locked_until = None
        db.commit()
    yield
