"""Immutable presentation revisions; source bytes remain owned by AssetVersion."""
from sqlalchemy import BigInteger, CheckConstraint, ForeignKeyConstraint, JSON, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class MediaPresentation(Base):
    __tablename__ = "media_presentations"
    __table_args__ = (
        UniqueConstraint("production_id", "owner_type", "owner_id", "revision", name="uq_media_presentations_owner_revision"),
        ForeignKeyConstraint(["production_id", "asset_id"], ["assets.production_id", "assets.id"], ondelete="RESTRICT", name="fk_media_presentations_asset_scope"),
        ForeignKeyConstraint(["asset_id", "source_version_id"], ["asset_versions.asset_id", "asset_versions.id"], ondelete="RESTRICT", name="fk_media_presentations_source_scope"),
        CheckConstraint("revision > 0", name="revision"),
        CheckConstraint("owner_type IN ('asset','panel','production') AND length(owner_id) > 0", name="owner"),
    )
    production_id: Mapped[str] = mapped_column(String)
    asset_id: Mapped[str] = mapped_column(String, index=True)
    source_version_id: Mapped[str] = mapped_column(String, index=True)
    owner_type: Mapped[str] = mapped_column(String(16))
    owner_id: Mapped[str] = mapped_column(String)
    revision: Mapped[int] = mapped_column(BigInteger)
    transform: Mapped[dict] = mapped_column(JSON().with_variant(JSONB(), "postgresql"))
    created_by: Mapped[str] = mapped_column(String)
