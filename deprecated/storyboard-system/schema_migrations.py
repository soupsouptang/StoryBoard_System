"""Explicit SQLite compatibility migrations for the current FrameForge schema.

The baseline describes columns that older installed databases may lack. New
databases already contain most of them in server.SCHEMA. Keep the migration
transactional and fail closed on drift instead of ignoring arbitrary ALTER
errors. Future changes get a new numbered migration; version 1 is immutable.
"""

from __future__ import annotations

import sqlite3
from datetime import datetime, timezone


BASELINE_VERSION = 1
BASELINE_NAME = "legacy-column-baseline"

# Names and definitions are constants, never derived from request data.
LEGACY_COLUMNS: tuple[tuple[str, str, str], ...] = (
    ("shots", "revision", "INTEGER NOT NULL DEFAULT 1"),
    ("comments", "is_resolved", "INTEGER NOT NULL DEFAULT 0"),
    ("comments", "quote_field", "TEXT NOT NULL DEFAULT ''"),
    ("comments", "quote_text", "TEXT NOT NULL DEFAULT ''"),
    ("shot_versions", "branch_name", "TEXT NOT NULL DEFAULT 'main'"),
    ("shot_versions", "parent_version_id", "TEXT"),
    ("shot_versions", "merge_parent_id", "TEXT"),
    ("shot_versions", "is_accepted", "INTEGER NOT NULL DEFAULT 0"),
    ("shot_versions", "updated_at", "TEXT NOT NULL DEFAULT ''"),
    ("users", "status", "TEXT NOT NULL DEFAULT 'ACTIVE'"),
    ("users", "user_color", "TEXT NOT NULL DEFAULT ''"),
    ("users", "avatar_file", "TEXT NOT NULL DEFAULT ''"),
    ("projects", "deleted_at", "TEXT"),
    ("projects", "updated_by", "TEXT NOT NULL DEFAULT ''"),
    ("shots", "panel_frame", "TEXT NOT NULL DEFAULT ''"),
    ("shots", "import_columns_json", "TEXT NOT NULL DEFAULT '{}'"),
    ("project_column_preferences", "permanently_deleted", "INTEGER NOT NULL DEFAULT 0"),
    ("shots", "deleted_at", "TEXT"),
    ("shots", "lens_source", "TEXT NOT NULL DEFAULT ''"),
    ("shots", "rich_text_json", "TEXT NOT NULL DEFAULT '{}'"),
    ("shots", "script_character", "TEXT NOT NULL DEFAULT ''"),
    ("shots", "script_parenthetical", "TEXT NOT NULL DEFAULT ''"),
    ("shots", "script_scene_type", "TEXT NOT NULL DEFAULT ''"),
    ("shots", "script_time_of_day", "TEXT NOT NULL DEFAULT ''"),
    ("comments", "author_user_id", "TEXT"),
    ("projects", "updated_by_user_id", "TEXT"),
    ("assets", "sha256", "TEXT NOT NULL DEFAULT ''"),
    ("assets", "created_by", "TEXT NOT NULL DEFAULT ''"),
    ("share_links", "password_hash", "TEXT NOT NULL DEFAULT ''"),
    ("share_links", "revoked_at", "TEXT"),
    ("share_links", "created_by", "TEXT NOT NULL DEFAULT ''"),
    ("production_steps", "sort_index", "INTEGER NOT NULL DEFAULT 0"),
    ("production_steps", "type", "TEXT NOT NULL DEFAULT 'TASK'"),
    ("production_steps", "input_asset", "TEXT NOT NULL DEFAULT ''"),
    ("production_steps", "output_asset", "TEXT NOT NULL DEFAULT ''"),
)


class SchemaMigrationError(RuntimeError):
    """The database needs manual inspection before it can be opened safely."""


def _column_names(db: sqlite3.Connection, table: str) -> set[str]:
    if db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (table,)).fetchone() is None:
        raise SchemaMigrationError(f"missing required table: {table}")
    return {row[1] for row in db.execute(f'PRAGMA table_info("{table}")')}


def _validate_baseline(db: sqlite3.Connection) -> None:
    by_table: dict[str, set[str]] = {}
    for table, column, _ in LEGACY_COLUMNS:
        if table not in by_table:
            by_table[table] = _column_names(db, table)
        if column not in by_table[table]:
            raise SchemaMigrationError(f"baseline column missing: {table}.{column}")


def apply_schema_migrations(db: sqlite3.Connection) -> None:
    """Upgrade a prepared schema to version 1, or verify its existing baseline.

    Call after the CREATE TABLE IF NOT EXISTS scripts. A savepoint makes the
    version marker and all legacy ALTERs atomic, even inside an outer request.
    """
    db.execute("SAVEPOINT frameforge_schema_migration")
    try:
        db.execute("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                applied_at TEXT NOT NULL
            )
        """)
        rows = db.execute("SELECT version, name FROM schema_migrations ORDER BY version").fetchall()
        if any(row[0] > BASELINE_VERSION or row[0] < BASELINE_VERSION for row in rows):
            raise SchemaMigrationError("unsupported database schema version")
        if rows:
            if len(rows) != 1 or rows[0][1] != BASELINE_NAME:
                raise SchemaMigrationError("schema migration history differs from this release")
            _validate_baseline(db)
        else:
            by_table: dict[str, set[str]] = {}
            for table, column, definition in LEGACY_COLUMNS:
                if table not in by_table:
                    by_table[table] = _column_names(db, table)
                if column not in by_table[table]:
                    db.execute(f'ALTER TABLE "{table}" ADD COLUMN "{column}" {definition}')
                    by_table[table].add(column)
            _validate_baseline(db)
            db.execute(
                "INSERT INTO schema_migrations(version, name, applied_at) VALUES (?,?,?)",
                (BASELINE_VERSION, BASELINE_NAME, datetime.now(timezone.utc).isoformat()),
            )
        db.execute("RELEASE SAVEPOINT frameforge_schema_migration")
    except Exception:
        db.execute("ROLLBACK TO SAVEPOINT frameforge_schema_migration")
        db.execute("RELEASE SAVEPOINT frameforge_schema_migration")
        raise
