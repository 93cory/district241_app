"""Add nif_gabon_hash column (empreinte HMAC pour recherche exacte/unicite).

Contexte : `nif_gabon_encrypted` (migration 37) est un ciphertext Fernet non
deterministe — il ne peut pas servir a une recherche exacte (`WHERE ... = `)
ni a une contrainte d'unicite en base. Cette migration ajoute une empreinte
HMAC-SHA256 deterministe (`nif_gabon_hash`), calculee par
`core.encryption.hash_for_lookup`, qui permet de retrouver/deduper un
operateur par NIF sans jamais comparer de valeur en clair.

Strategie **non-destructive**, dans la continuite de la migration 37 :
- ajoute une colonne nullable + un index unique (les NULL sont ignores par
  la contrainte UNIQUE Postgres, donc compatible avec les lignes non encore
  migrees).
- ne touche pas a `nif_gabon` (clair) ni `nif_gabon_encrypted`.
- le backfill des lignes existantes se fait via un script Python
  (`scripts/encrypt_existing_nifs.py`), pas dans cette migration, car il
  necessite `PNPI_FIELD_ENCRYPTION_KEY` pour calculer l'empreinte — cf
  `core/encryption.py` pour la convention du projet sur ce point.
"""

revision = "20260809_48"
down_revision = "20260728_47"

import sqlalchemy as sa

from alembic import op


def upgrade():
    op.add_column(
        "operateurs_industriels",
        sa.Column("nif_gabon_hash", sa.String(length=64), nullable=True),
    )
    op.create_index(
        "ix_operateurs_nif_hash",
        "operateurs_industriels",
        ["nif_gabon_hash"],
        unique=True,
    )


def downgrade():
    op.drop_index("ix_operateurs_nif_hash", table_name="operateurs_industriels")
    op.drop_column("operateurs_industriels", "nif_gabon_hash")
