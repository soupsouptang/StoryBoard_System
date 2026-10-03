"""Native creative boards; renderer modes never own a second scene document."""
from datetime import datetime
from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, Integer, JSON, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

DOCUMENT = JSON().with_variant(JSONB(), "postgresql")


class CreativeBoard(Base):
    __tablename__ = "creative_boards"
    __table_args__ = (
        UniqueConstraint("production_id", "id", name="uq_creative_boards_project_id"),
        CheckConstraint("kind IN ('lighting','moodboard')", name="kind"),
        CheckConstraint("revision > 0", name="revision"),
        CheckConstraint("width BETWEEN 100 AND 10000 AND height BETWEEN 100 AND 10000", name="dimensions"),
    )
    production_id: Mapped[str] = mapped_column(ForeignKey("productions.id", ondelete="RESTRICT"), index=True)
    kind: Mapped[str] = mapped_column(String(16))
    name: Mapped[str] = mapped_column(String(80))
    width: Mapped[int] = mapped_column(Integer, default=1600)
    height: Mapped[int] = mapped_column(Integer, default=1000)
    objects: Mapped[list] = mapped_column(DOCUMENT, default=list)
    shot_ids: Mapped[list] = mapped_column(DOCUMENT, default=list)
    revision: Mapped[int] = mapped_column(BigInteger, default=1)
    created_by: Mapped[str] = mapped_column(String(64))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class BoardAssetReference(Base):
    """Pin media reachable by the working board or canonical project history."""
    __tablename__ = "board_asset_references"
    __table_args__ = (UniqueConstraint("board_id", "asset_version_id", name="uq_board_asset_references_version"),)
    board_id: Mapped[str] = mapped_column(ForeignKey("creative_boards.id", ondelete="CASCADE"), index=True)
    asset_version_id: Mapped[str] = mapped_column(ForeignKey("asset_versions.id", ondelete="RESTRICT"), index=True)
