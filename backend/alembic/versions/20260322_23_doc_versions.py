"""Document versioning."""
revision = "20260322_23"
down_revision = "20260322_22"

from alembic import op
import sqlalchemy as sa

def upgrade():
    op.create_table(
        "document_versions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("document_id", sa.String(36), nullable=False, index=True),
        sa.Column("ati_id", sa.String(36), nullable=False, index=True),
        sa.Column("version", sa.Integer, nullable=False, server_default="1"),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("file_size", sa.Integer, nullable=True),
        sa.Column("uploaded_by", sa.String(80), sa.ForeignKey("user_accounts.username"), nullable=False),
        sa.Column("comment", sa.String(300), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_doc_versions_doc", "document_versions", ["document_id", "version"])

def downgrade():
    op.drop_table("document_versions")
