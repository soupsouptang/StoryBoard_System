"""Asset revision/category and unique immutable image versions.

Revision ID: c58f2d01e739
Revises: b47e1c90d628
"""
import sqlalchemy as sa
from alembic import op

revision = "c58f2d01e739"
down_revision = "b47e1c90d628"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("assets") as batch:
        batch.add_column(sa.Column("revision", sa.BigInteger(), nullable=False, server_default="1"))
        batch.add_column(sa.Column("category", sa.String(64), nullable=False, server_default=""))
        batch.create_check_constraint(op.f("ck_assets_revision"), "revision > 0")
    # VNext existing original files receive a version reference, without reading
    # any local file or copying media. Refuse conflicting old version numbers.
    op.execute("INSERT INTO asset_versions (id,asset_id,version_number,storage_key,mime_type,file_size,hash_sha256,metadata_json,created_by,created_at,updated_at) SELECT a.id,a.id,1,a.storage_key,a.mime_type,a.file_size,a.hash_sha256,'{}',a.created_by,a.created_at,a.updated_at FROM assets a WHERE NOT EXISTS (SELECT 1 FROM asset_versions v WHERE v.asset_id=a.id)")
    with op.batch_alter_table("asset_versions") as batch:
        batch.create_unique_constraint("uq_asset_versions_number", ["asset_id", "version_number"])
        batch.create_check_constraint(op.f("ck_asset_versions_version_number"), "version_number > 0")


def downgrade():
    if not op.get_context().as_sql:
        bind = op.get_bind()
        if bind.execute(sa.text("SELECT 1 FROM assets WHERE revision > 1 OR category <> '' LIMIT 1")).first() or bind.execute(sa.text("SELECT 1 FROM asset_versions WHERE version_number > 1 LIMIT 1")).first():
            raise RuntimeError("Cannot discard edited image/category history")
    with op.batch_alter_table("asset_versions") as batch:
        batch.drop_constraint("uq_asset_versions_number", type_="unique")
        batch.drop_constraint(op.f("ck_asset_versions_version_number"), type_="check")
    with op.batch_alter_table("assets") as batch:
        batch.drop_constraint(op.f("ck_assets_revision"), type_="check")
        batch.drop_column("category")
        batch.drop_column("revision")
