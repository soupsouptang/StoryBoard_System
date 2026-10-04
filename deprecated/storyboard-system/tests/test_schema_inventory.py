"""Read-only schema inventories disclose definitions and counts, not rows."""

import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path

from tools.schema_inventory import compare, inventory


class SchemaInventoryTest(unittest.TestCase):
    def test_compares_offline_copies_without_writing_or_exposing_rows(self):
        with tempfile.TemporaryDirectory(prefix="frameforge-schema-inventory-") as directory:
            before_path = Path(directory) / "before.db"
            after_path = Path(directory) / "after.db"
            with closing(sqlite3.connect(before_path)) as db:
                db.execute("CREATE TABLE shots(id TEXT PRIMARY KEY, title TEXT NOT NULL)")
                db.execute("INSERT INTO shots VALUES ('shot-secret', 'unpublished script')")
                db.commit()
                with closing(sqlite3.connect(after_path)) as copied:
                    db.backup(copied)
            with closing(sqlite3.connect(after_path)) as db:
                db.execute("ALTER TABLE shots ADD COLUMN revision INTEGER NOT NULL DEFAULT 1")
                db.commit()
            mtime_before = before_path.stat().st_mtime_ns
            old = inventory(before_path, include_counts=True)
            new = inventory(after_path, include_counts=True)
            self.assertEqual(before_path.stat().st_mtime_ns, mtime_before)
            self.assertEqual(old["tables"]["shots"]["row_count"], 1)
            self.assertNotIn("unpublished script", str(old))
            self.assertNotIn("shot-secret", str(old))
            self.assertEqual(compare(old, new)["changed_tables"], ["shots"])
            self.assertFalse(compare(old, new)["same_schema"])

    def test_missing_path_is_not_created(self):
        with tempfile.TemporaryDirectory(prefix="frameforge-schema-missing-") as directory:
            path = Path(directory) / "absent.db"
            with self.assertRaises(FileNotFoundError):
                inventory(path)
            self.assertFalse(path.exists())


if __name__ == "__main__":
    unittest.main()
