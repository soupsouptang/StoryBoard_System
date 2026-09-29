"""Keep Alembic's synchronous connection on the API's database."""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "apps" / "api"))

from app.core.config import resolve_sync_database_url


def test_sync_url_follows_async_database() -> None:
    assert resolve_sync_database_url("sqlite+aiosqlite:////tmp/frameforge.db", None) == (
        "sqlite:////tmp/frameforge.db"
    )
    assert resolve_sync_database_url(
        "postgresql+asyncpg://user:secret@localhost:5432/frameforge", None
    ) == "postgresql+psycopg://user:secret@localhost:5432/frameforge"


def test_sync_url_rejects_wrong_database() -> None:
    with pytest.raises(ValueError, match="same database"):
        resolve_sync_database_url(
            "postgresql+asyncpg://user:secret@localhost/frameforge",
            "sqlite:////tmp/frameforge.db",
        )
    with pytest.raises(ValueError, match="same database"):
        resolve_sync_database_url(
            "postgresql+asyncpg://user:secret@localhost/frameforge",
            "postgresql+psycopg://user:secret@localhost/other",
        )
