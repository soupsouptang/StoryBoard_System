"""Custom field values and project column lifecycle models."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from sqlalchemy import BigInteger, Boolean, CheckConstraint, ForeignKey, ForeignKeyConstraint, Index, Integer, JSON, String, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ProjectColumn(Base):
    """Single definition/lifecycle owner; entity bindings never copy values here."""
    __tablename__ = "project_columns"
    __table_args__ = (
        UniqueConstraint(
            "production_id",
            "key",
            name="uq_project_columns_production_key",
        ),
        UniqueConstraint("production_id", "id", name="uq_project_columns_production_id"),
        UniqueConstraint("production_id", "id", "binding_kind", name="uq_project_columns_binding_identity"),
        CheckConstraint("origin IN ('builtin','preset','custom','import')", name="origin"),
        CheckConstraint("binding_kind IN ('entity','derived','custom','pending')", name="binding_kind"),
        CheckConstraint("state IN ('active','trashed','purging','purged')", name="state"),
        CheckConstraint("revision > 0 AND schema_version > 0", name="versions"),
        CheckConstraint("(state = 'purged') = (purged_at IS NOT NULL)", name="purged_timestamp"),
        CheckConstraint("state NOT IN ('trashed','purging') OR deleted_at IS NOT NULL", name="deleted_timestamp"),
        CheckConstraint("state <> 'purged' OR (label = '' AND description = '' AND group_name = '' AND required = false)", name="purged_metadata"),
        Index("ix_project_columns_state", "production_id", "state"),
        Index("uq_project_columns_live_binding", "production_id", "binding_key", unique=True,
              postgresql_where=text("binding_key IS NOT NULL AND binding_kind <> 'pending' AND state <> 'purged'"),
              sqlite_where=text("binding_key IS NOT NULL AND binding_kind <> 'pending' AND state <> 'purged'")),
    )

    production_id: Mapped[str] = mapped_column(
        ForeignKey("productions.id", ondelete="RESTRICT"),
        index=True,
    )
    key: Mapped[str] = mapped_column(String(80))
    label: Mapped[str] = mapped_column(String(80))
    description: Mapped[str] = mapped_column(Text, default="")
    field_type: Mapped[str] = mapped_column(String(32), default="text", index=True)
    group_name: Mapped[str] = mapped_column(String(80), default="Custom")
    options: Mapped[list] = mapped_column(JSON().with_variant(JSONB(), "postgresql"), default=list)
    required: Mapped[bool] = mapped_column(Boolean, default=False)
    default_value: Mapped[Optional[Any]] = mapped_column(JSON().with_variant(JSONB(), "postgresql"), nullable=True)
    sort_index: Mapped[int] = mapped_column(Integer, default=0, index=True)
    origin: Mapped[str] = mapped_column(String(16), default="custom", server_default="custom")
    binding_kind: Mapped[str] = mapped_column(String(16), default="custom", server_default="custom")
    binding_key: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    schema_version: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    state: Mapped[str] = mapped_column(String(16), default="active", server_default="active")
    deleted_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    purged_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    created_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    revision: Mapped[int] = mapped_column(BigInteger, default=1, server_default="1")


class ShotColumnValue(Base):
    __tablename__ = "shot_column_values"
    __table_args__ = (
        UniqueConstraint(
            "shot_id",
            "column_id",
            name="uq_shot_column_values_shot_column",
        ),
        ForeignKeyConstraint(["production_id", "shot_id"], ["shots.production_id", "shots.id"], ondelete="RESTRICT", name="fk_shot_column_values_project_shot"),
        ForeignKeyConstraint(["production_id", "column_id", "binding_kind"], ["project_columns.production_id", "project_columns.id", "project_columns.binding_kind"], ondelete="RESTRICT", name="fk_shot_column_values_project_column"),
        CheckConstraint("binding_kind = 'custom'", name="custom_binding"),
        Index("ix_column_values_lookup", "production_id", "column_id", "shot_id"),
    )

    production_id: Mapped[str] = mapped_column(String, nullable=False)
    shot_id: Mapped[str] = mapped_column(String, index=True)
    column_id: Mapped[str] = mapped_column(String, index=True)
    binding_kind: Mapped[str] = mapped_column(String(16), default="custom", server_default="custom")
    value: Mapped[Optional[Any]] = mapped_column(JSON().with_variant(JSONB(), "postgresql"), nullable=True)
    updated_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)


class ColumnPreference(Base):
    __tablename__ = "column_preferences"
    __table_args__ = (
        UniqueConstraint(
            "production_id",
            "column_key",
            name="uq_column_preferences_production_key",
        ),
    )

    production_id: Mapped[str] = mapped_column(
        ForeignKey("productions.id", ondelete="CASCADE"),
        index=True,
    )
    column_key: Mapped[str] = mapped_column(String(120))
    state: Mapped[str] = mapped_column(String(16), default="visible", index=True)
    permanently_deleted: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    position: Mapped[int] = mapped_column(Integer, default=0)
    width_px: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    wrap_text: Mapped[bool] = mapped_column(Boolean, default=False)
    updated_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    revision: Mapped[int] = mapped_column(Integer, default=1)
