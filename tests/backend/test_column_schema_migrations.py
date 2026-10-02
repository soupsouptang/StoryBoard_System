"""Alembic rehearsals on disposable VNext databases; no app/default DB access."""
import os
from pathlib import Path
import sqlite3
import subprocess
import sys

import pytest

ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / "apps/api/alembic.ini"
PREVIOUS = "d72a81e5c409"
COLUMNS = "e18c4a7d92b0"


def migrate(path, action, target):
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "-c", str(CONFIG), action, target],
        cwd=ROOT,
        env={**os.environ, "DATABASE_URL": f"sqlite+aiosqlite:///{path.as_posix()}",
             "DATABASE_SYNC_URL": f"sqlite:///{path.as_posix()}"},
        capture_output=True, text=True,
    )
    assert result.returncode == 0, result.stderr


def insert(connection, table, **values):
    """Fill old NOT NULL fields with synthetic data, not live entity defaults."""
    for _, name, kind, required, default, primary in connection.execute(f"PRAGMA table_info({table})"):
        if name in values or not required or default is not None:
            continue
        if name in {"created_at", "updated_at"}:
            values[name] = "2026-10-02 00:00:00"
        elif "JSON" in kind:
            values[name] = "[]" if name in {"secondary_methods", "options"} else "{}"
        elif any(t in kind for t in ("INT", "BOOL", "FLOAT")):
            values[name] = 1
        else:
            values[name] = "synthetic"
    keys = list(values)
    connection.execute(f"INSERT INTO {table} ({','.join(keys)}) VALUES ({','.join('?' for _ in keys)})", [values[key] for key in keys])


def test_empty_database_has_one_canonical_column_owner(tmp_path):
    db = tmp_path / "empty.sqlite"
    migrate(db, "upgrade", "head")
    with sqlite3.connect(db) as conn:
        tables = {row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        assert {"project_columns", "shot_column_values"} <= tables
        assert not {"custom_field_definitions", "shot_custom_field_values"} & tables
        assert conn.execute("PRAGMA foreign_key_check").fetchall() == []


def test_vnext_upgrade_preserves_identity_nulls_trash_and_tombstones(tmp_path):
    db = tmp_path / "upgrade.sqlite"
    migrate(db, "upgrade", PREVIOUS)
    with sqlite3.connect(db) as conn:
        insert(conn, "productions", id="p")
        insert(conn, "shots", id="s", production_id="p")
        for state in ("live", "trash", "purge"):
            insert(conn, "custom_field_definitions", id=state, production_id="p", key=state,
                   label="保留列" if state != "purge" else "已删除内容", is_purged=state == "purge",
                   description="private synthetic metadata", options='["secret fixture"]', default_value='"default fixture"')
            insert(conn, "column_preferences", id="pref-" + state, production_id="p", column_key="custom:" + state,
                   state="visible" if state == "live" else "removed", permanently_deleted=state == "purge")
        insert(conn, "shot_custom_field_values", id="value", shot_id="s", field_definition_id="live", value="null")
    migrate(db, "upgrade", COLUMNS)
    with sqlite3.connect(db) as conn:
        assert conn.execute("SELECT id, state FROM project_columns ORDER BY id").fetchall() == [("live", "active"), ("purge", "purged"), ("trash", "trashed")]
        assert conn.execute("SELECT id, production_id, column_id, value FROM shot_column_values").fetchone() == ("value", "p", "live", "null")
        assert conn.execute("SELECT label,description,options,default_value FROM project_columns WHERE id='purge'").fetchone() == ("", "", "[]", None)
        assert conn.execute("SELECT state FROM column_preferences WHERE id='pref-trash'").fetchone() == ("hidden",)
        assert conn.execute("PRAGMA foreign_key_check").fetchall() == []
    migrate(db, "downgrade", PREVIOUS)
    migrate(db, "upgrade", COLUMNS)
    with sqlite3.connect(db) as conn:
        assert conn.execute("SELECT id, value FROM shot_column_values").fetchone() == ("value", "null")
        assert conn.execute("SELECT state FROM project_columns WHERE id='purge'").fetchone() == ("purged",)


def test_database_rejects_cross_project_and_entity_value_copies(tmp_path):
    db = tmp_path / "constraints.sqlite"
    migrate(db, "upgrade", COLUMNS)
    with sqlite3.connect(db) as conn:
        conn.execute("PRAGMA foreign_keys=ON")
        for project in ("a", "b"):
            insert(conn, "productions", id=project)
            insert(conn, "shots", id="s-" + project, production_id=project)
        insert(conn, "project_columns", id="custom", production_id="a", key="custom", label="自定义")
        insert(conn, "project_columns", id="entity", production_id="a", key="entity", label="标题", binding_kind="entity", binding_key="shot.name")
        for project, column, shot in (("a", "custom", "s-b"), ("b", "custom", "s-b"), ("a", "entity", "s-a")):
            with pytest.raises(sqlite3.IntegrityError):
                insert(conn, "shot_column_values", id="invalid", production_id=project, shot_id=shot, column_id=column, value='"copy"')
        insert(conn, "shot_column_values", id="valid", production_id="a", shot_id="s-a", column_id="custom", value="null")
        assert conn.execute("PRAGMA foreign_key_check").fetchall() == []


def test_comment_upgrade_bootstrap_scope_constraints_and_colors(tmp_path):
    db = tmp_path / "comments.sqlite"
    migrate(db, "upgrade", "f29b6c8a01d3")
    with sqlite3.connect(db) as conn:
        for project in ("a", "b"):
            insert(conn, "productions", id=project)
            insert(conn, "shots", id="s-" + project, production_id=project)
        insert(conn, "users", id="user-a", email="fixture@example.com")
        insert(conn, "comments", id="root", production_id="a", shot_id="s-a", body="historical fixture")
        insert(conn, "comments", id="reply", production_id="a", shot_id="s-a", parent_id="root", body="reply fixture", created_at="2026-10-02 01:00:00")
    migrate(db, "upgrade", "head")
    with sqlite3.connect(db) as conn:
        conn.execute("PRAGMA foreign_keys=ON")
        assert conn.execute("SELECT comment_event_seq FROM shots WHERE id='s-a'").fetchone() == (2,)
        assert conn.execute("SELECT comment_id,seq,event_type,actor_id FROM comment_events ORDER BY seq").fetchall() == [("root", 1, "bootstrap", None), ("reply", 2, "bootstrap", None)]
        assert conn.execute("SELECT annotation_color,revision FROM users").fetchone() == ("#DB2777", 1)
        with pytest.raises(sqlite3.IntegrityError):
            conn.execute("UPDATE users SET annotation_color='#12xx00'")
        with pytest.raises(sqlite3.IntegrityError):
            insert(conn, "comments", id="foreign-parent", production_id="b", shot_id="s-b", parent_id="root")
        with pytest.raises(sqlite3.IntegrityError):
            insert(conn, "comment_events", id="foreign-event", production_id="b", shot_id="s-b", comment_id="root", seq=1, event_type="edit")
        with pytest.raises(sqlite3.IntegrityError):
            insert(conn, "comment_read_states", id="foreign-state", production_id="b", shot_id="s-a", user_id="user-a", last_read_seq=1)
        assert conn.execute("PRAGMA foreign_key_check").fetchall() == []
    migrate(db, "downgrade", "f29b6c8a01d3")
    migrate(db, "upgrade", "head")
    with sqlite3.connect(db) as conn:
        assert conn.execute("SELECT COUNT(*) FROM comment_events").fetchone() == (2,)


def test_builtin_lifecycle_and_row_height_constraints_upgrade(tmp_path):
    db = tmp_path / "layout.sqlite"
    migrate(db, "upgrade", COLUMNS)
    with sqlite3.connect(db) as conn:
        insert(conn, "productions", id="p")
        insert(conn, "productions", id="other")
        insert(conn, "shots", id="s", production_id="p")
        insert(conn, "shots", id="outside", production_id="other")
        insert(conn, "saved_views", id="view", production_id="p", is_shared=False, config='{"private":"synthetic"}')
        insert(conn, "column_preferences", id="builtin-id", production_id="p", column_key="description", state="removed", revision=3)
    migrate(db, "upgrade", "head")
    with sqlite3.connect(db) as conn:
        conn.execute("PRAGMA foreign_keys=ON")
        assert conn.execute("SELECT id,key,state,revision FROM project_columns WHERE origin='builtin'").fetchone() == ("builtin-id", "builtin:description", "trashed", 3)
        assert conn.execute("SELECT is_shared,config FROM saved_views WHERE id='view'").fetchone() == (0, '{"private":"synthetic"}')
        with pytest.raises(sqlite3.IntegrityError):
            insert(conn, "view_row_layouts", id="bad-scope", production_id="p", saved_view_id="view", shot_id="outside", height_mode="manual", manual_height_px=64)
        with pytest.raises(sqlite3.IntegrityError):
            insert(conn, "view_row_layouts", id="bad-height", production_id="p", saved_view_id="view", shot_id="s", height_mode="manual", manual_height_px=-1)
        insert(conn, "view_row_layouts", id="good", production_id="p", saved_view_id="view", shot_id="s", height_mode="manual", manual_height_px=96)
        assert conn.execute("PRAGMA foreign_key_check").fetchall() == []
