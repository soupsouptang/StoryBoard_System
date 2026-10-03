"""Per-actor project command journal; business data and cursor commit together."""
from sqlalchemy import BigInteger, Boolean, CheckConstraint, ForeignKey, JSON, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class HistoryState(Base):
    __tablename__ = 'history_states'
    __table_args__ = (UniqueConstraint('production_id', 'user_id', name='uq_history_states_scope'),
                      CheckConstraint('revision > 0 AND next_sequence > 0', name='versions'))
    production_id: Mapped[str] = mapped_column(ForeignKey('productions.id', ondelete='RESTRICT'), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id', ondelete='RESTRICT'), index=True)
    revision: Mapped[int] = mapped_column(BigInteger, default=1)
    next_sequence: Mapped[int] = mapped_column(BigInteger, default=1)


class HistoryEntry(Base):
    __tablename__ = 'history_entries'
    __table_args__ = (UniqueConstraint('state_id', 'sequence', name='uq_history_entries_sequence'),
                      CheckConstraint('sequence > 0', name='sequence'))
    state_id: Mapped[str] = mapped_column(ForeignKey('history_states.id', ondelete='CASCADE'), index=True)
    sequence: Mapped[int] = mapped_column(BigInteger)
    label: Mapped[str] = mapped_column(String(80))
    permission: Mapped[str] = mapped_column(String(80))
    applied: Mapped[bool] = mapped_column(Boolean, default=True)
    changes: Mapped[list] = mapped_column(JSON().with_variant(JSONB(), 'postgresql'))


class WorkspaceLayout(Base):
    __tablename__ = 'workspace_layouts'
    __table_args__ = (UniqueConstraint('production_id', 'user_id', name='uq_workspace_layouts_scope'),
                      CheckConstraint('revision > 0', name='revision'))
    production_id: Mapped[str] = mapped_column(ForeignKey('productions.id', ondelete='RESTRICT'), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id', ondelete='RESTRICT'), index=True)
    revision: Mapped[int] = mapped_column(BigInteger, default=1)
    config: Mapped[dict] = mapped_column(JSON().with_variant(JSONB(), 'postgresql'), default=dict)
