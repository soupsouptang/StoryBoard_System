"""Keep Alembic's synchronous connection on the API's database."""
import os
import subprocess
import sys
from pathlib import Path

import pytest
from alembic.config import Config
from alembic.script import ScriptDirectory

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


def test_alembic_has_one_head_after_parallel_schema_changes() -> None:
    config = Config(str(Path(__file__).resolve().parents[2] / "apps" / "api" / "alembic.ini"))
    scripts = ScriptDirectory.from_config(config)
    assert len(scripts.get_heads()) == 1
    assert set(scripts.get_revision("d72a81e5c409").down_revision) == {
        "b4c18d2e7f90",
        "b4e7a21d9c60",
    }


def test_postgres_migration_compiles_offline() -> None:
    config_path = Path(__file__).resolve().parents[2] / "apps" / "api" / "alembic.ini"
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "-c", str(config_path), "upgrade", "head", "--sql"],
        env={
            **os.environ,
            "DATABASE_URL": "postgresql+asyncpg://local:local@localhost/local",
            "DATABASE_SYNC_URL": "postgresql+psycopg://local:local@localhost/local",
        },
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stderr
    assert "CREATE TABLE custom_field_definitions" in result.stdout
    assert "d72a81e5c409" in result.stdout
