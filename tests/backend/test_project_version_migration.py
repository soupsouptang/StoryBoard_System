"""Disposable migration constraints and fail-closed version history downgrade."""
import sqlite3
import pytest
from tests.backend.test_column_schema_migrations import insert, migrate


def test_project_commit_migration_scope_and_downgrade(tmp_path):
    database = tmp_path / "versions.sqlite"
    migrate(database, "upgrade", "head")
    with sqlite3.connect(database) as connection:
        connection.execute("PRAGMA foreign_keys=ON")
        for project in ("a", "b"):
            insert(connection, "productions", id=project)
        insert(connection, "project_commits", id="root", production_id="a", message="Root", snapshot='{"schema_version":1,"sections":{}}')
        insert(connection, "project_branches", id="branch", production_id="a", name="main", head_id="root")
        with pytest.raises(sqlite3.IntegrityError):
            insert(connection, "project_commits", id="invalid", production_id="b", parent_id="root")
        with pytest.raises(sqlite3.IntegrityError):
            insert(connection, "project_branches", id="foreign", production_id="b", name="main", head_id="root")
        with pytest.raises(sqlite3.IntegrityError):
            insert(connection, "project_commits", id="self", production_id="a", parent_id="self")
        assert connection.execute("PRAGMA foreign_key_check").fetchall() == []
    with pytest.raises(AssertionError, match="Cannot discard project version history"):
        migrate(database, "downgrade", "a36d9b21f807")
    empty = tmp_path / "empty.sqlite"
    migrate(empty, "upgrade", "head")
    migrate(empty, "downgrade", "a36d9b21f807")
    migrate(empty, "upgrade", "head")
