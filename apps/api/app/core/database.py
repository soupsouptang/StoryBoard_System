"""Database engine, base model, and session context."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import AsyncGenerator
from fastapi import Depends
from sqlalchemy import DateTime, MetaData, create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker
from app.core.config import settings

convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s"
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=convention)
    type_annotation_map = {datetime: DateTime(timezone=True)}

    id: Mapped[str] = mapped_column(primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )


# Database Engine Setup
# If asyncpg is not available or if using SQLite fallback:
is_sqlite = settings.DATABASE_URL.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}

async_engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args=connect_args
)

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

sync_engine = create_engine(
    settings.DATABASE_SYNC_URL,
    echo=False,
    connect_args=connect_args
)

SyncSessionLocal = sessionmaker(
    bind=sync_engine,
    autoflush=False,
    autocommit=False
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency injection session generator."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            from app.services.history_service import HistoryService
            await HistoryService.finish(session)
            await session.commit()
        except Exception:
            await session.rollback()
            for path in getattr(session, "info", {}).get("created_media_files", []):
                path.unlink(missing_ok=True)
            raise
        finally:
            await session.close()

# A successful response acknowledges a committed transaction, including commit failures.
db_session = Depends(get_db, scope="function")
