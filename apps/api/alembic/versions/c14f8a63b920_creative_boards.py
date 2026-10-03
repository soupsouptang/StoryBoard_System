"""Native boards and media pins; undo uses canonical project command history."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "c14f8a63b920"
down_revision = "a83f02c1d765"
branch_labels = depends_on = None
DOCUMENT = sa.JSON().with_variant(JSONB(), "postgresql")


def common():
    return [sa.Column("id", sa.String(), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False)]


def upgrade():
    op.create_table("creative_boards", *common(),
        sa.Column("production_id", sa.String(), sa.ForeignKey("productions.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("width", sa.Integer(), nullable=False),
        sa.Column("height", sa.Integer(), nullable=False),
        sa.Column("objects", DOCUMENT, nullable=False),
        sa.Column("shot_ids", DOCUMENT, nullable=False),
        sa.Column("revision", sa.BigInteger(), nullable=False),
        sa.Column("created_by", sa.String(64), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("production_id", "id", name="uq_creative_boards_project_id"),
        sa.CheckConstraint("kind IN ('lighting','moodboard')", name=op.f("ck_creative_boards_kind")),
        sa.CheckConstraint("revision > 0", name=op.f("ck_creative_boards_revision")),
        sa.CheckConstraint("width BETWEEN 100 AND 10000 AND height BETWEEN 100 AND 10000", name=op.f("ck_creative_boards_dimensions")))
    op.create_index("ix_creative_boards_production_id", "creative_boards", ["production_id"])
    op.create_table("board_asset_references", *common(),
        sa.Column("board_id", sa.String(), sa.ForeignKey("creative_boards.id", ondelete="CASCADE"), nullable=False),
        sa.Column("asset_version_id", sa.String(), sa.ForeignKey("asset_versions.id", ondelete="RESTRICT"), nullable=False),
        sa.UniqueConstraint("board_id", "asset_version_id", name="uq_board_asset_references_version"))
    op.create_index("ix_board_asset_references_board_id", "board_asset_references", ["board_id"])
    op.create_index("ix_board_asset_references_asset_version_id", "board_asset_references", ["asset_version_id"])


def downgrade():
    if op.get_context().as_sql or op.get_bind().execute(sa.text("SELECT 1 FROM creative_boards LIMIT 1")).first():
        raise RuntimeError("Nonempty creative boards cannot be discarded")
    op.drop_table("board_asset_references")
    op.drop_table("creative_boards")
