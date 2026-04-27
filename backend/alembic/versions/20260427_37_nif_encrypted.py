"""Add nif_gabon_encrypted column for at-rest Fernet encryption.

Strategie de migration **non-destructive** :
- on ajoute une colonne `nif_gabon_encrypted` (Text, nullable).
- on ne supprime PAS l'ancienne colonne `nif_gabon` pour preserver la
  retro-compat (unique constraint, recherches existantes, dumps SQL).
- une migration de donnees ulterieure (script Python) populera la nouvelle
  colonne en chiffrant les valeurs existantes.
- la couche applicative (model OperateurIndustrielORM) lit en priorite
  `nif_gabon_encrypted` puis fallback sur `nif_gabon`.

Une fois 100% des lignes migrees ET la production stabilisee, une
migration future (38+) pourra droper l'ancienne colonne `nif_gabon`.
"""

revision = "20260427_37"
down_revision = "20260427_36"

import sqlalchemy as sa
from alembic import op


def upgrade():
    op.add_column(
        "operateurs_industriels",
        sa.Column("nif_gabon_encrypted", sa.Text(), nullable=True),
    )
    # Index secondaire pour les recherches eventuelles par hash/match exact
    # (la valeur etant chiffree, on ne peut pas chercher par contenu, mais
    # un index permet la deduplication eventuelle sur ciphertext).


def downgrade():
    op.drop_column("operateurs_industriels", "nif_gabon_encrypted")
