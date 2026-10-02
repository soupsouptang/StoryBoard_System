"""Comments, Approvals, ShotVersions, Shares, Exports and AuditLog Models."""
from __future__ import annotations

from datetime import datetime
from typing import Optional
from sqlalchemy import BigInteger, Boolean, CheckConstraint, ForeignKey, ForeignKeyConstraint, Index, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Comment(Base):
    __tablename__ = "comments"
    __table_args__ = (
        UniqueConstraint("production_id", "shot_id", "id", name="uq_comments_project_shot_id"),
        ForeignKeyConstraint(["production_id", "shot_id"], ["shots.production_id", "shots.id"], name="fk_comments_project_shot", ondelete="RESTRICT"),
        ForeignKeyConstraint(["production_id", "shot_id", "parent_id"], ["comments.production_id", "comments.shot_id", "comments.id"], name="fk_comments_parent_scope", ondelete="RESTRICT"),
        CheckConstraint("revision > 0 AND event_seq >= 0 AND last_activity_seq >= event_seq", name="event_versions"),
        Index("ix_comments_shot_activity", "shot_id", "last_activity_seq"),
    )
    revision: Mapped[int] = mapped_column(BigInteger, default=1, server_default="1")
    event_seq: Mapped[int] = mapped_column(BigInteger, default=0, server_default="0")
    last_activity_seq: Mapped[int] = mapped_column(BigInteger, default=0, server_default="0")
    last_actor_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    production_id: Mapped[str] = mapped_column(ForeignKey("productions.id", ondelete="CASCADE"), index=True)
    shot_id: Mapped[Optional[str]] = mapped_column(ForeignKey("shots.id", ondelete="CASCADE"), nullable=True, index=True)
    asset_id: Mapped[Optional[str]] = mapped_column(ForeignKey("assets.id", ondelete="CASCADE"), nullable=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    role: Mapped[str] = mapped_column(String(64), default="Director")
    body: Mapped[str] = mapped_column(Text)
    timecode: Mapped[str] = mapped_column(String(32), default="")
    quote_field: Mapped[str] = mapped_column(String(128), default="")
    quote_text: Mapped[str] = mapped_column(Text, default="")
    parent_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("comments.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(nullable=True, index=True)


class CommentEvent(Base):
    """Value-free activity ledger, ordered independently of Shot content revision."""
    __tablename__ = "comment_events"
    __table_args__ = (
        UniqueConstraint("shot_id", "seq", name="uq_comment_events_shot_seq"),
        ForeignKeyConstraint(["production_id", "shot_id", "comment_id"], ["comments.production_id", "comments.shot_id", "comments.id"], name="fk_comment_events_scope", ondelete="RESTRICT"),
        CheckConstraint("seq > 0", name="seq"),
        CheckConstraint("event_type IN ('bootstrap','create','edit','resolve','reopen','delete')", name="event_type"),
    )
    production_id: Mapped[str] = mapped_column(String)
    shot_id: Mapped[str] = mapped_column(String, index=True)
    comment_id: Mapped[str] = mapped_column(String)
    seq: Mapped[int] = mapped_column(BigInteger)
    event_type: Mapped[str] = mapped_column(String(16))
    actor_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)


class CommentReadState(Base):
    """Each user advances only their own observed Shot activity watermark."""
    __tablename__ = "comment_read_states"
    __table_args__ = (
        UniqueConstraint("user_id", "shot_id", name="uq_comment_read_states_user_shot"),
        ForeignKeyConstraint(["production_id", "shot_id"], ["shots.production_id", "shots.id"], name="fk_comment_read_states_scope", ondelete="RESTRICT"),
        CheckConstraint("last_read_seq >= 0", name="watermark"),
    )
    production_id: Mapped[str] = mapped_column(String)
    shot_id: Mapped[str] = mapped_column(String, index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    last_read_seq: Mapped[int] = mapped_column(BigInteger, default=0, server_default="0")


class Approval(Base):
    __tablename__ = "approvals"

    shot_id: Mapped[str] = mapped_column(ForeignKey("shots.id", ondelete="CASCADE"), index=True)
    shot_version: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(64), default="approved")
    user_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class ReviewDecision(Base):
    """Immutable review decision bound to the Shot revision/version context."""

    __tablename__ = "review_decisions"

    shot_id: Mapped[str] = mapped_column(
        ForeignKey("shots.id", ondelete="CASCADE"),
        index=True,
    )
    version_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("shot_versions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    previous_status: Mapped[str] = mapped_column(String(64))
    next_status: Mapped[str] = mapped_column(String(64))
    action_label: Mapped[str] = mapped_column(String(64))
    created_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)


class ShotVersion(Base):
    __tablename__ = "shot_versions"
    __table_args__ = (
        UniqueConstraint(
            "shot_id",
            "version_number",
            name="uq_shot_versions_shot_version_number",
        ),
    )

    shot_id: Mapped[str] = mapped_column(ForeignKey("shots.id", ondelete="CASCADE"), index=True)
    version_number: Mapped[int] = mapped_column(Integer, default=1)
    name: Mapped[str] = mapped_column(String(160), default="")
    snapshot: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(64), default="Draft")
    branch_name: Mapped[str] = mapped_column(String(64), default="main", index=True)
    parent_version_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("shot_versions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    merge_parent_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("shot_versions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    is_accepted: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    user_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(128), index=True)
    entity_type: Mapped[str] = mapped_column(String(64), index=True)
    entity_id: Mapped[str] = mapped_column(String(64), index=True)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)


class Share(Base):
    __tablename__ = "shares"

    production_id: Mapped[str] = mapped_column(ForeignKey("productions.id", ondelete="CASCADE"), index=True)
    snapshot_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    snapshot_json: Mapped[dict] = mapped_column(JSON, default=dict)
    token_hash: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    allow_download: Mapped[bool] = mapped_column(Boolean, default=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    created_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)


class Export(Base):
    __tablename__ = "exports"

    production_id: Mapped[str] = mapped_column(ForeignKey("productions.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String(64), default="pdf")
    status: Mapped[str] = mapped_column(String(64), default="pending")
    parameters: Mapped[dict] = mapped_column(JSON, default=dict)
    storage_key: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    created_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
