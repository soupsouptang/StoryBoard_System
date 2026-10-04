"""Schema baseline upgrades run only against disposable in-memory databases."""

import importlib.util
import os
import sqlite3
import tempfile
import unittest
from pathlib import Path

from schema_migrations import LEGACY_COLUMNS, SchemaMigrationError, apply_schema_migrations


TABLES = tuple(dict.fromkeys(table for table, _, _ in LEGACY_COLUMNS))


def legacy_database(*, missing_table=None):
    db = sqlite3.connect(":memory:")
    for table in TABLES:
        if table != missing_table:
            db.execute(f'CREATE TABLE "{table}" (id TEXT PRIMARY KEY)')
            db.execute(f'INSERT INTO "{table}"(id) VALUES (?)', (table,))
    return db


class SchemaMigrationsTest(unittest.TestCase):
    def test_legacy_rows_gain_columns_once_and_version_is_stable(self):
        with legacy_database() as db:
            apply_schema_migrations(db)
            first = db.execute("SELECT version, name, applied_at FROM schema_migrations").fetchone()
            self.assertEqual(first[:2], (1, "legacy-column-baseline"))
            for table, column, _ in LEGACY_COLUMNS:
                names = {row[1] for row in db.execute(f'PRAGMA table_info("{table}")')}
                self.assertIn(column, names)
                self.assertEqual(db.execute(f'SELECT id FROM "{table}"').fetchone()[0], table)
            apply_schema_migrations(db)
            self.assertEqual(db.execute("SELECT version, name, applied_at FROM schema_migrations").fetchone(), first)

    def test_missing_table_rolls_back_all_columns_and_version_marker(self):
        with legacy_database(missing_table="production_steps") as db:
            with self.assertRaisesRegex(SchemaMigrationError, "missing required table"):
                apply_schema_migrations(db)
            names = {row[1] for row in db.execute('PRAGMA table_info("shots")')}
            self.assertNotIn("revision", names)
            self.assertIsNone(db.execute(
                "SELECT 1 FROM sqlite_master WHERE type='table' AND name='schema_migrations'"
            ).fetchone())

    def test_existing_version_rejects_drift_and_future_version(self):
        with legacy_database() as db:
            db.execute("CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY, name TEXT, applied_at TEXT)")
            db.execute("INSERT INTO schema_migrations VALUES (1, 'legacy-column-baseline', 'test')")
            with self.assertRaisesRegex(SchemaMigrationError, "baseline column missing"):
                apply_schema_migrations(db)
            db.execute("UPDATE schema_migrations SET version=2")
            with self.assertRaisesRegex(SchemaMigrationError, "unsupported database schema version"):
                apply_schema_migrations(db)

    def test_server_initializes_an_existing_database_without_losing_user(self):
        old_root = os.environ.get("STORYBOARD_DATA_ROOT")
        try:
            with tempfile.TemporaryDirectory(prefix="frameforge-schema-legacy-") as directory:
                os.environ["STORYBOARD_DATA_ROOT"] = directory
                spec = importlib.util.spec_from_file_location(
                    "frameforge_schema_integration", Path(__file__).resolve().parents[1] / "server.py"
                )
                app = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(app)
                conn = sqlite3.connect(Path(directory) / "storyboard.db")
                try:
                    conn.executescript(app.SCHEMA)
                    conn.executescript(app.CREATIVE_BOARDS_SCHEMA)
                    conn.execute("ALTER TABLE shots DROP COLUMN revision")
                    conn.execute("ALTER TABLE users DROP COLUMN status")
                    conn.execute(
                        "INSERT INTO users(id, username, password_hash, role, display_name, created_at) "
                        "VALUES ('old-user', 'legacy-user', 'test', 'viewer', '保留用户', '2020-01-01')"
                    )
                    conn.commit()
                finally:
                    conn.close()
                app.init_db()
                app.init_db()
                conn2 = app.connect()
                try:
                    user = conn2.execute("SELECT username, display_name, status FROM users WHERE id='old-user'").fetchone()
                    self.assertEqual(tuple(user), ("legacy-user", "保留用户", "ACTIVE"))
                    self.assertEqual(conn2.execute("SELECT version FROM schema_migrations").fetchall()[0][0], 1)
                finally:
                    conn2.close()
        finally:
            if old_root is None:
                os.environ.pop("STORYBOARD_DATA_ROOT", None)
            else:
                os.environ["STORYBOARD_DATA_ROOT"] = old_root


if __name__ == "__main__":
    unittest.main()
