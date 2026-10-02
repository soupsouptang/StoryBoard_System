"""Durable post-commit notifications. No business values or transient Presence."""
from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, Index, Integer, JSON, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class OutboxEvent(Base):
    __tablename__ = "outbox_events"
    __table_args__ = (
        UniqueConstraint("production_id", "command_id", "event_type", name="uq_outbox_events_project_command_type"),
        CheckConstraint("revision > 0 AND attempt >= 0", name="versions"),
        Index("ix_outbox_events_pending", "published_at", "created_at"),
    )
    production_id: Mapped[str] = mapped_column(ForeignKey("productions.id", ondelete="RESTRICT"), index=True)
    command_id: Mapped[str] = mapped_column(String(80))
    event_type: Mapped[str] = mapped_column(String(64))
    entity_ids: Mapped[dict] = mapped_column(JSON().with_variant(JSONB(), "postgresql"), default=dict)
    revision: Mapped[int] = mapped_column(BigInteger)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    attempt: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
