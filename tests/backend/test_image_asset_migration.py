"""Bootstrap existing native assets and refuse to discard edited image history."""
import sqlite3
import pytest
from tests.backend.test_column_schema_migrations import insert, migrate


def test_asset_version_bootstrap_and_revision_constraints(tmp_path):
    database = tmp_path / "images.sqlite"
    migrate(database, "upgrade", "b47e1c90d628")
    with sqlite3.connect(database) as conn:
        insert(conn, "productions", id="p")
        insert(conn, "assets", id="a", production_id="p", storage_key="synthetic.png")
    migrate(database, "upgrade", "c58f2d01e739")
    with sqlite3.connect(database) as conn:
        conn.execute("PRAGMA foreign_keys=ON")
        assert conn.execute("SELECT revision,category FROM assets").fetchone() == (1, "")
        assert conn.execute("SELECT asset_id,version_number,storage_key FROM asset_versions").fetchone() == ("a", 1, "synthetic.png")
        with pytest.raises(sqlite3.IntegrityError):
            insert(conn, "asset_versions", id="duplicate", asset_id="a", version_number=1)
        with pytest.raises(sqlite3.IntegrityError):
            conn.execute("UPDATE assets SET revision=0")
        insert(conn, "asset_versions", id="new", asset_id="a", version_number=2)
    with pytest.raises(AssertionError, match="Cannot discard edited image"):
        migrate(database, "downgrade", "b47e1c90d628")

