"""Project commits and branch heads; business records keep their own owners."""
from __future__ import annotations

from typing import Optional
from sqlalchemy import BigInteger, CheckConstraint, ForeignKey, ForeignKeyConstraint, JSON, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class ProjectCommit(Base):
    __tablename__ = "project_commits"
    __table_args__ = (
        UniqueConstraint("production_id", "id", name="uq_project_commits_scope"),
        ForeignKeyConstraint(["production_id", "parent_id"], ["project_commits.production_id", "project_commits.id"], ondelete="RESTRICT", name="fk_project_commits_parent_scope"),
        ForeignKeyConstraint(["production_id", "merge_parent_id"], ["project_commits.production_id", "project_commits.id"], ondelete="RESTRICT", name="fk_project_commits_merge_scope"),
        CheckConstraint("schema_version > 0 AND redaction_revision >= 0", name="versions"),
        CheckConstraint("parent_id IS NULL OR parent_id <> id", name="parent_not_self"),
        CheckConstraint("merge_parent_id IS NULL OR merge_parent_id <> id", name="merge_not_self"),
    )
    production_id: Mapped[str] = mapped_column(ForeignKey("productions.id", ondelete="RESTRICT"), index=True)
    message: Mapped[str] = mapped_column(Text)
    branch_name: Mapped[str] = mapped_column(String(64))
    parent_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    merge_parent_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    snapshot: Mapped[dict] = mapped_column(JSON().with_variant(JSONB(), "postgresql"))
    content_hash: Mapped[str] = mapped_column(String(64))
    schema_version: Mapped[int] = mapped_column(default=1, server_default="1")
    redaction_revision: Mapped[int] = mapped_column(BigInteger, default=0, server_default="0")
    created_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)


class ProjectBranch(Base):
    __tablename__ = "project_branches"
    __table_args__ = (
        UniqueConstraint("production_id", "name", name="uq_project_branches_name"),
        ForeignKeyConstraint(["production_id", "head_id"], ["project_commits.production_id", "project_commits.id"], ondelete="RESTRICT", name="fk_project_branches_head_scope"),
        CheckConstraint("revision > 0", name="revision"),
    )
    production_id: Mapped[str] = mapped_column(ForeignKey("productions.id", ondelete="RESTRICT"), index=True)
    name: Mapped[str] = mapped_column(String(64))
    head_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    revision: Mapped[int] = mapped_column(BigInteger, default=1, server_default="1")
    created_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
