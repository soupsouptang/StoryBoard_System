"""Migration inventories fail closed using the real schema in memory."""
import ast
import json
import sqlite3
import sys
import unittest
from contextlib import closing
from pathlib import Path

LEGACY_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(LEGACY_ROOT))

from repositories.migration_runner import (
    CORE_TABLES, TABLE_NAME_MAP, MigrationInventoryError,
    inventory_sqlite, verify_row_counts,
)


def schema_literal(path):
    for node in ast.parse(path.read_text()).body:
        if isinstance(node, ast.Assign) and any(
            isinstance(target, ast.Name) and target.id == "SCHEMA" for target in node.targets
        ):
            return ast.literal_eval(node.value)
    raise AssertionError(f"Missing SCHEMA literal: {path.name}")


class MigrationRunnerTest(unittest.TestCase):
    def test_real_source_inventory_mapping_and_missing_counts(self):
        with closing(sqlite3.connect(":memory:")) as db:
            db.executescript(schema_literal(LEGACY_ROOT / "server.py"))
            db.executescript(schema_literal(LEGACY_ROOT / "creative_boards.py"))
            db.execute("INSERT INTO shot_custom_field_values(id, shot_id, field_definition_id, updated_at) "
                       "VALUES ('value', 'shot', 'field', 'test')")
            counts = inventory_sqlite(db)
            self.assertEqual(set(counts), set(CORE_TABLES))
            self.assertEqual(counts["shot_custom_field_values"], 1)
            self.assertIn("project_creative_boards", counts)
            self.assertIn("saved_views", counts)
            self.assertNotIn("custom_field_values", counts)
            targets = {target: counts[source] for source, target in TABLE_NAME_MAP.items() if target}
            self.assertEqual(TABLE_NAME_MAP["projects"], "productions")
            self.assertEqual(TABLE_NAME_MAP["share_links"], "shares")
            self.assertEqual(TABLE_NAME_MAP["audit_log"], "audit_logs")
            self.assertEqual(TABLE_NAME_MAP["project_column_preferences"], "column_preferences")

            ok, issues = verify_row_counts(counts, targets)
            self.assertFalse(ok)  # Unimplemented owners are blockers, even for empty tables.
            self.assertEqual({issue["code"] for issue in issues}, {"UNMAPPED_SOURCE_TABLE"})
            self.assertIn("project_snapshots", {issue["source_table"] for issue in issues})
            self.assertEqual(json.loads(json.dumps(issues)), issues)

            missing = {name: count for name, count in targets.items() if name != "productions"}
            self.assertIn({"code": "MISSING_TARGET_COUNT", "source_table": "projects",
                           "target_table": "productions"}, verify_row_counts(counts, missing)[1])
            source_missing = {name: count for name, count in counts.items() if name != "projects"}
            self.assertIn({"code": "MISSING_SOURCE_COUNT", "source_table": "projects",
                           "target_table": "productions"}, verify_row_counts(source_missing, targets)[1])
            self.assertFalse(verify_row_counts({}, {})[0])
            self.assertIn({"code": "ROW_COUNT_MISMATCH", "source_table": "shot_custom_field_values",
                           "target_table": "shot_custom_field_values", "source_count": 1, "target_count": 0},
                          verify_row_counts(counts, {**targets, "shot_custom_field_values": 0})[1])
            for invalid in (None, True, -1, "0", 0.0):
                self.assertIn({"code": "INVALID_ROW_COUNT", "side": "target", "source_table": "projects",
                               "target_table": "productions"},
                              verify_row_counts(counts, {**targets, "productions": invalid})[1])

            db.execute('CREATE TABLE "extra""table" (id TEXT)')
            counts = inventory_sqlite(db)
            self.assertEqual(counts['extra"table'], 0)
            self.assertIn({"code": "UNMAPPED_SOURCE_TABLE", "source_table": 'extra"table',
                           "target_table": None}, verify_row_counts(counts, targets)[1])
            db.execute("DROP TABLE saved_views")
            with self.assertRaises(MigrationInventoryError) as raised:
                inventory_sqlite(db)
            self.assertEqual(raised.exception.details, {
                "code": "MISSING_SOURCE_TABLES", "missing_tables": ["saved_views"],
            })


if __name__ == "__main__":
    unittest.main()
