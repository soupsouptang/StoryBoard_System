"""Disposable Alembic board rehearsal and history/media constraints."""
import sqlite3
import pytest
from tests.backend.test_column_schema_migrations import insert, migrate


def test_board_migration_preserves_media_pins_and_refuses_history_loss(tmp_path):
    database = tmp_path / "boards.sqlite"
    migrate(database, "upgrade", "head")
    with sqlite3.connect(database) as db:
        db.execute("PRAGMA foreign_keys=ON")
        insert(db, "productions", id="p")
        insert(db, "assets", id="a", production_id="p", storage_key="synthetic.png")
        insert(db, "asset_versions", id="v", asset_id="a")
        insert(db, "creative_boards", id="b", production_id="p", kind="lighting", width=1600, height=1000)
        insert(db, "board_asset_references", id="r", board_id="b", asset_version_id="v")
        with pytest.raises(sqlite3.IntegrityError):
            db.execute("DELETE FROM asset_versions WHERE id='v'")
        with pytest.raises(sqlite3.IntegrityError):
            db.execute("UPDATE creative_boards SET width=-1 WHERE id='b'")
        with pytest.raises(sqlite3.IntegrityError):
            insert(db, "board_asset_references", id="duplicate", board_id="b", asset_version_id="v")
        assert db.execute("PRAGMA foreign_key_check").fetchall() == []
    with pytest.raises(AssertionError, match="Nonempty creative boards"):
        migrate(database, "downgrade", "a83f02c1d765")
    empty = tmp_path / "empty.sqlite"
    migrate(empty, "upgrade", "head")
    migrate(empty, "downgrade", "a83f02c1d765")
    migrate(empty, "upgrade", "head")
