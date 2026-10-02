"""User and Role SQLAlchemy 2 Models."""
from __future__ import annotations

from typing import Optional
import uuid
from sqlalchemy import BigInteger, Boolean, CheckConstraint, ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

ANNOTATION_PALETTE = ("#2563EB", "#7C3AED", "#DB2777", "#EA580C", "#059669", "#0891B2", "#CA8A04", "#4F46E5")
COLOR_CHECK = "annotation_color IS NULL OR (length(annotation_color) = 7 AND substr(annotation_color,1,1) = '#' AND " + " AND ".join(
    f"substr(annotation_color,{position},1) IN ('0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F')" for position in range(2, 8)
) + ")"


def automatic_annotation_color(identity: str) -> str:
    suffix = identity[-1:].lower()
    index = int(suffix, 16) if suffix in "0123456789abcdef" and suffix else len(identity)
    return ANNOTATION_PALETTE[index % len(ANNOTATION_PALETTE)]


def _assigned_color(context) -> str:
    return automatic_annotation_color(str(context.get_current_parameters().get("id") or uuid.uuid4()))


class Role(Base):
    __tablename__ = "roles"

    name: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    permissions: Mapped[dict] = mapped_column(JSON, default=dict)

    users: Mapped[list["User"]] = relationship(back_populates="role")


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(COLOR_CHECK, name="annotation_color"),
        CheckConstraint("revision > 0", name="revision"),
    )

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(128), default="")
    password_hash: Mapped[str] = mapped_column(String(255))
    role_id: Mapped[Optional[str]] = mapped_column(ForeignKey("roles.id", ondelete="SET NULL"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    annotation_color: Mapped[Optional[str]] = mapped_column(String(7), nullable=True, default=_assigned_color)
    revision: Mapped[int] = mapped_column(BigInteger, default=1, server_default="1")

    role: Mapped[Optional[Role]] = relationship(back_populates="users", lazy="selectin")

    @property
    def effective_annotation_color(self) -> str:
        return self.annotation_color or automatic_annotation_color(self.id)
