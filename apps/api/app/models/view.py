"""Saved table/storyboard view models."""
from __future__ import annotations

from typing import Optional

from sqlalchemy import BigInteger, Boolean, CheckConstraint, ForeignKey, ForeignKeyConstraint, Integer, JSON, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class SavedView(Base):
    __tablename__ = "saved_views"
    __table_args__ = (
        UniqueConstraint("production_id", "id", name="uq_saved_views_production_id"),
        CheckConstraint("revision > 0 AND schema_version > 0 AND measurement_generation >= 0", name="versions"),
        CheckConstraint("row_height_mode IN ('manual','auto')", name="row_height_mode"),
        CheckConstraint("manual_row_height_px IS NULL OR manual_row_height_px > 0", name="row_height_positive"),
        CheckConstraint("row_height_mode <> 'manual' OR manual_row_height_px IS NOT NULL", name="manual_row_height"),
    )

    production_id: Mapped[str] = mapped_column(
        ForeignKey("productions.id", ondelete="CASCADE"),
        index=True,
    )
    name: Mapped[str] = mapped_column(String(80))
    view_type: Mapped[str] = mapped_column(String(32), default="table", index=True)
    is_shared: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    config: Mapped[dict] = mapped_column(JSON().with_variant(JSONB(), "postgresql"), default=dict)
    revision: Mapped[int] = mapped_column(BigInteger, default=1, server_default="1")
    schema_version: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    row_height_mode: Mapped[str] = mapped_column(String(16), default="auto", server_default="auto")
    manual_row_height_px: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    measurement_generation: Mapped[int] = mapped_column(BigInteger, default=0, server_default="0")
    measurement_context: Mapped[dict] = mapped_column(JSON().with_variant(JSONB(), "postgresql"), default=dict, server_default="{}")
    row_layouts: Mapped[list["ViewRowLayout"]] = relationship(
        cascade="all, delete-orphan", lazy="selectin", back_populates="view",
    )


class ViewRowLayout(Base):
    """Per-Shot manual override; density labels are distinct from pixel height."""
    __tablename__ = "view_row_layouts"
    __table_args__ = (
        UniqueConstraint("saved_view_id", "shot_id", name="uq_view_row_layouts_view_shot"),
        ForeignKeyConstraint(["production_id", "saved_view_id"], ["saved_views.production_id", "saved_views.id"], ondelete="CASCADE", name="fk_view_row_layouts_project_view"),
        ForeignKeyConstraint(["production_id", "shot_id"], ["shots.production_id", "shots.id"], ondelete="RESTRICT", name="fk_view_row_layouts_project_shot"),
        CheckConstraint("height_mode IN ('manual','auto')", name="height_mode"),
        CheckConstraint("manual_height_px IS NULL OR manual_height_px > 0", name="height_positive"),
        CheckConstraint("height_mode <> 'manual' OR manual_height_px IS NOT NULL", name="manual_height"),
    )
    production_id: Mapped[str] = mapped_column(String, index=True)
    saved_view_id: Mapped[str] = mapped_column(String, index=True)
    shot_id: Mapped[str] = mapped_column(String, index=True)
    height_mode: Mapped[str] = mapped_column(String(16), default="manual")
    manual_height_px: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    view: Mapped[SavedView] = relationship(back_populates="row_layouts")
