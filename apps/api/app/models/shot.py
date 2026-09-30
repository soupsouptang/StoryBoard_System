"""Shot, Panel and ProductionStep SQLAlchemy 2 Models."""
from __future__ import annotations

from datetime import datetime
from typing import Optional
from sqlalchemy import BigInteger, Boolean, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Shot(Base):
    __tablename__ = "shots"

    production_id: Mapped[str] = mapped_column(ForeignKey("productions.id", ondelete="CASCADE"), index=True)
    sequence_id: Mapped[Optional[str]] = mapped_column(ForeignKey("sequences.id", ondelete="SET NULL"), nullable=True, index=True)
    scene_id: Mapped[Optional[str]] = mapped_column(ForeignKey("scenes.id", ondelete="SET NULL"), nullable=True, index=True)

    display_number: Mapped[str] = mapped_column(String(64), default="001", index=True)
    sort_index: Mapped[float] = mapped_column(Float, default=1000.0, index=True)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    description: Mapped[str] = mapped_column(Text, default="")
    panel_frame: Mapped[str] = mapped_column(Text, default="")
    action: Mapped[str] = mapped_column(Text, default="")
    performance: Mapped[str] = mapped_column(Text, default="")
    composition: Mapped[str] = mapped_column(Text, default="")
    director_notes: Mapped[str] = mapped_column(Text, default="")

    duration_frames: Mapped[int] = mapped_column(BigInteger, default=75)
    timing_locked: Mapped[bool] = mapped_column(Boolean, default=False)

    shot_size: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    camera_angle: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    camera_height: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    lens_mm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    camera: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    sensor: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    aperture: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    shutter: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    camera_movement: Mapped[dict] = mapped_column(JSON, default=dict)

    dialogue: Mapped[str] = mapped_column(Text, default="")
    voice_over: Mapped[str] = mapped_column(Text, default="")
    subtitle: Mapped[str] = mapped_column(Text, default="")
    music_notes: Mapped[str] = mapped_column(Text, default="")
    sfx_notes: Mapped[str] = mapped_column(Text, default="")

    primary_method: Mapped[str] = mapped_column(String(64), default="live", index=True)
    secondary_methods: Mapped[list] = mapped_column(JSON, default=list)

    department: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    owner_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    status: Mapped[str] = mapped_column(String(64), default="draft", index=True)
    approval_status: Mapped[str] = mapped_column(String(64), default="pending", index=True)

    vfx_required: Mapped[bool] = mapped_column(Boolean, default=False)
    continuity_notes: Mapped[str] = mapped_column(Text, default="")
    risk_notes: Mapped[str] = mapped_column(Text, default="")

    current_version: Mapped[int] = mapped_column(Integer, default=1)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    created_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(nullable=True, index=True)

    production: Mapped["Production"] = relationship(back_populates="shots")
    panels: Mapped[list["Panel"]] = relationship(back_populates="shot", cascade="all, delete-orphan")
    steps: Mapped[list["ProductionStep"]] = relationship(back_populates="shot", cascade="all, delete-orphan")


class Panel(Base):
    __tablename__ = "panels"

    shot_id: Mapped[str] = mapped_column(ForeignKey("shots.id", ondelete="CASCADE"), index=True)
    display_number: Mapped[str] = mapped_column(String(64), default="A")
    sort_index: Mapped[float] = mapped_column(Float, default=1000.0, index=True)
    asset_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    duration_frames: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(nullable=True, index=True)

    shot: Mapped[Shot] = relationship(back_populates="panels")


class ProductionStep(Base):
    __tablename__ = "production_steps"

    shot_id: Mapped[str] = mapped_column(ForeignKey("shots.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String(64), default="shoot")
    department: Mapped[str] = mapped_column(String(64), default="camera")
    owner_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(64), default="pending")
    sort_index: Mapped[float] = mapped_column(Float, default=1000.0)
    input_asset_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    output_asset_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    notes: Mapped[str] = mapped_column(Text, default="")
    deleted_at: Mapped[Optional[datetime]] = mapped_column(nullable=True, index=True)

    shot: Mapped[Shot] = relationship(back_populates="steps")
