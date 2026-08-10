"""Index trigram (pg_trgm) pour les recherches ILIKE (dette D-015).

Contexte
========

`search.py` et `pnpi_dashboard.py` filtrent par `ILIKE '%terme%'` sur
plusieurs colonnes texte (recherche full-text legere). Un index btree
standard ne peut pas accelerer ce type de motif ILIKE substring — seul un
index trigram (extension `pg_trgm`, deja packagee avec PostgreSQL) le
permet.

Verifie empiriquement (EXPLAIN ANALYZE, jeu de donnees synthetique
~15k operateurs / ~30k ATI, cf dette-technique.md D-015) : la requete
`raison_sociale ILIKE '%test%'` passe de 46ms (seq scan complet) a
~1ms (bitmap index scan) avec cet index — et l'ecart ne peut que se
creuser avec plus de donnees, un seq scan degradant lineairement.

Colonnes indexees : les champs texte librement recherchables
(raison_sociale, ville, numero_ati, type_activite). Volontairement PAS :
- secteur/province/statut : faible cardinalite, un ILIKE dessus est rare
  et le gain d'un trigram est marginal ;
- nif_gabon : masque depuis la dette D-003 (derniers caracteres visibles
  uniquement), un index trigram sur une valeur majoritairement composee
  d'asterisques n'apporte pas de valeur de recherche reelle ;
- observations (ATI) : texte libre plus volumineux, recherche moins
  frequente, a evaluer separement si besoin.
"""

revision = "20260810_49"
down_revision = "20260809_48"

from alembic import op


def upgrade():
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_operateurs_raison_sociale_trgm "
        "ON operateurs_industriels USING gin (raison_sociale gin_trgm_ops)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_operateurs_ville_trgm ON operateurs_industriels USING gin (ville gin_trgm_ops)"
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_ati_numero_trgm ON agrements_ati USING gin (numero_ati gin_trgm_ops)")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_ati_type_activite_trgm ON agrements_ati USING gin (type_activite gin_trgm_ops)"
    )


def downgrade():
    op.execute("DROP INDEX IF EXISTS ix_ati_type_activite_trgm")
    op.execute("DROP INDEX IF EXISTS ix_ati_numero_trgm")
    op.execute("DROP INDEX IF EXISTS ix_operateurs_ville_trgm")
    op.execute("DROP INDEX IF EXISTS ix_operateurs_raison_sociale_trgm")
    # L'extension pg_trgm n'est pas droppee : d'autres index pourraient en
    # dependre.
