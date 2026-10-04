"""Offline backup/restore rehearsal with synthetic, disposable data."""

import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path

from tools.sqlite_backup_rehearsal import rehearse


class SqliteBackupRehearsalTest(unittest.TestCase):
    def test_round_trip_preserves_schema_and_row_content(self):
        with tempfile.TemporaryDirectory(prefix="frameforge-backup-test-") as directory:
            source = Path(directory) / "source.db"
            with closing(sqlite3.connect(source)) as db:
                db.execute("PRAGMA foreign_keys=ON")
                db.execute("CREATE TABLE projects(id TEXT PRIMARY KEY, name TEXT NOT NULL)")
                db.execute("CREATE TABLE shots(id TEXT PRIMARY KEY, project_id TEXT REFERENCES projects(id), title TEXT)")
                db.execute("INSERT INTO projects VALUES ('p1', 'unpublished project')")
                db.execute("INSERT INTO shots VALUES ('s1', 'p1', 'unpublished shot')")
                db.commit()
            mtime = source.stat().st_mtime_ns
            report = rehearse(source)
            self.assertEqual(source.stat().st_mtime_ns, mtime)
            self.assertTrue(all(report[key] for key in (
                "same_schema", "same_row_counts", "same_data", "source_integrity_ok", "restored_integrity_ok"
            )))
            self.assertEqual(report["source_foreign_key_errors"], 0)
            self.assertEqual(report["restored_foreign_key_errors"], 0)
            self.assertNotIn("unpublished", str(report))

    def test_reports_foreign_key_violation_without_changing_source(self):
        with tempfile.TemporaryDirectory(prefix="frameforge-backup-invalid-") as directory:
            source = Path(directory) / "source.db"
            with closing(sqlite3.connect(source)) as db:
                db.execute("CREATE TABLE projects(id TEXT PRIMARY KEY)")
                db.execute("CREATE TABLE shots(id TEXT PRIMARY KEY, project_id TEXT REFERENCES projects(id))")
                db.execute("INSERT INTO shots VALUES ('orphan', 'missing')")
                db.commit()
            report = rehearse(source)
            self.assertEqual(report["source_foreign_key_errors"], 1)
            self.assertEqual(report["restored_foreign_key_errors"], 1)
            self.assertTrue(report["same_data"])


if __name__ == "__main__":
    unittest.main()
