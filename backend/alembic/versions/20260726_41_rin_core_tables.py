"""RIN core tables.

Revision ID: 20260726_41
Revises: 20260722_40
Create Date: 2026-07-26
"""

from alembic import op
import sqlalchemy as sa


revision = "20260726_41"
down_revision = "20260722_40"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "rin_representants",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("operateur_id", sa.String(length=24), nullable=False),
        sa.Column("nom_complet", sa.String(length=200), nullable=False),
        sa.Column("fonction", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=200), nullable=True),
        sa.Column("telephone", sa.String(length=40), nullable=True),
        sa.Column("est_contact_principal", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", sa.String(length=80), nullable=True),
        sa.ForeignKeyConstraint(["operateur_id"], ["operateurs_industriels.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_rin_representants_operateur_id", "rin_representants", ["operateur_id"])

    op.create_table(
        "rin_sites_industriels",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("operateur_id", sa.String(length=24), nullable=False),
        sa.Column("nom_site", sa.String(length=200), nullable=False),
        sa.Column("type_site", sa.String(length=80), server_default="usine", nullable=False),
        sa.Column("province", sa.String(length=80), nullable=False),
        sa.Column("ville", sa.String(length=120), nullable=False),
        sa.Column("adresse", sa.String(length=300), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("superficie_ha", sa.Float(), nullable=True),
        sa.Column("statut", sa.String(length=40), server_default="actif", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", sa.String(length=80), nullable=True),
        sa.ForeignKeyConstraint(["operateur_id"], ["operateurs_industriels.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_rin_sites_industriels_operateur_id", "rin_sites_industriels", ["operateur_id"])
    op.create_index("ix_rin_sites_industriels_province", "rin_sites_industriels", ["province"])

    op.create_table(
        "rin_produits",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("operateur_id", sa.String(length=24), nullable=False),
        sa.Column("nom_produit", sa.String(length=200), nullable=False),
        sa.Column("categorie", sa.String(length=100), nullable=False),
        sa.Column("unite", sa.String(length=40), server_default="tonne", nullable=False),
        sa.Column("capacite_annuelle", sa.Float(), nullable=True),
        sa.Column("production_annuelle", sa.Float(), nullable=True),
        sa.Column("marche_cible", sa.String(length=120), nullable=True),
        sa.Column("certification", sa.String(length=200), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", sa.String(length=80), nullable=True),
        sa.ForeignKeyConstraint(["operateur_id"], ["operateurs_industriels.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_rin_produits_operateur_id", "rin_produits", ["operateur_id"])

    op.create_table(
        "rin_ressources",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("operateur_id", sa.String(length=24), nullable=False),
        sa.Column("type_ressource", sa.String(length=40), nullable=False),
        sa.Column("libelle", sa.String(length=200), nullable=False),
        sa.Column("origine", sa.String(length=120), nullable=True),
        sa.Column("consommation_annuelle", sa.Float(), nullable=True),
        sa.Column("unite", sa.String(length=40), nullable=True),
        sa.Column("dependance_import", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", sa.String(length=80), nullable=True),
        sa.ForeignKeyConstraint(["operateur_id"], ["operateurs_industriels.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_rin_ressources_operateur_id", "rin_ressources", ["operateur_id"])
    op.create_index("ix_rin_ressources_type_ressource", "rin_ressources", ["type_ressource"])

    op.create_table(
        "rin_investissements",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("operateur_id", sa.String(length=24), nullable=False),
        sa.Column("intitule", sa.String(length=240), nullable=False),
        sa.Column("montant_fcfa", sa.BigInteger(), nullable=True),
        sa.Column("statut", sa.String(length=40), server_default="planifie", nullable=False),
        sa.Column("annee", sa.Integer(), nullable=True),
        sa.Column("emplois_prevus", sa.Integer(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", sa.String(length=80), nullable=True),
        sa.ForeignKeyConstraint(["operateur_id"], ["operateurs_industriels.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_rin_investissements_operateur_id", "rin_investissements", ["operateur_id"])
    op.create_index("ix_rin_investissements_annee", "rin_investissements", ["annee"])


def downgrade():
    op.drop_index("ix_rin_investissements_annee", table_name="rin_investissements")
    op.drop_index("ix_rin_investissements_operateur_id", table_name="rin_investissements")
    op.drop_table("rin_investissements")
    op.drop_index("ix_rin_ressources_type_ressource", table_name="rin_ressources")
    op.drop_index("ix_rin_ressources_operateur_id", table_name="rin_ressources")
    op.drop_table("rin_ressources")
    op.drop_index("ix_rin_produits_operateur_id", table_name="rin_produits")
    op.drop_table("rin_produits")
    op.drop_index("ix_rin_sites_industriels_province", table_name="rin_sites_industriels")
    op.drop_index("ix_rin_sites_industriels_operateur_id", table_name="rin_sites_industriels")
    op.drop_table("rin_sites_industriels")
    op.drop_index("ix_rin_representants_operateur_id", table_name="rin_representants")
    op.drop_table("rin_representants")
