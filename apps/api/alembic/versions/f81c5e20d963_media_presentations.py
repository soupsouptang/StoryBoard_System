"""Versioned non-destructive presentations, scoped to immutable source versions.

Revision ID: f81c5e20d963
Revises: e70b4d19c852
"""
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from alembic import op

revision = "f81c5e20d963"
down_revision = "e70b4d19c852"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("assets") as batch:
        batch.create_unique_constraint("uq_assets_project_identity", ["production_id", "id"])
    with op.batch_alter_table("asset_versions") as batch:
        batch.create_unique_constraint("uq_asset_versions_asset_identity", ["asset_id", "id"])
    op.create_table("media_presentations",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("production_id", sa.String(), nullable=False),
        sa.Column("asset_id", sa.String(), nullable=False),
        sa.Column("source_version_id", sa.String(), nullable=False),
        sa.Column("owner_type", sa.String(16), nullable=False),
        sa.Column("owner_id", sa.String(), nullable=False),
        sa.Column("revision", sa.BigInteger(), nullable=False),
        sa.Column("transform", sa.JSON().with_variant(JSONB(), "postgresql"), nullable=False),
        sa.Column("created_by", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("production_id", "owner_type", "owner_id", "revision", name="uq_media_presentations_owner_revision"),
        sa.ForeignKeyConstraint(["production_id", "asset_id"], ["assets.production_id", "assets.id"], ondelete="RESTRICT", name="fk_media_presentations_asset_scope"),
        sa.ForeignKeyConstraint(["asset_id", "source_version_id"], ["asset_versions.asset_id", "asset_versions.id"], ondelete="RESTRICT", name="fk_media_presentations_source_scope"),
        sa.CheckConstraint("revision > 0", name=op.f("ck_media_presentations_revision")),
        sa.CheckConstraint("owner_type IN ('asset','panel','production') AND length(owner_id) > 0", name=op.f("ck_media_presentations_owner")),
    )
    op.create_index("ix_media_presentations_asset_id", "media_presentations", ["asset_id"])
    op.create_index("ix_media_presentations_source_version_id", "media_presentations", ["source_version_id"])


def downgrade():
    if op.get_context().as_sql or op.get_bind().execute(sa.text("SELECT 1 FROM media_presentations LIMIT 1")).first():
        raise RuntimeError("Presentation history cannot be discarded")
    op.drop_table("media_presentations")
    with op.batch_alter_table("asset_versions") as batch:
        batch.drop_constraint("uq_asset_versions_asset_identity", type_="unique")
    with op.batch_alter_table("assets") as batch:
        batch.drop_constraint("uq_assets_project_identity", type_="unique")
