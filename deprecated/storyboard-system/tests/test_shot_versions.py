"""Direct contracts for the extracted version and shared clock modules."""

import concurrent.futures
import importlib.util
from pathlib import Path
import sqlite3
import unittest

from runtime_clock import now_iso
from shot_versions import complete_shot_snapshot, record_review_decision


class ShotVersionsModuleTest(unittest.TestCase):
    def test_clock_is_strictly_monotonic_and_unique_across_threads(self):
        sequential = [now_iso() for _ in range(100)]
        self.assertEqual(sequential, sorted(set(sequential)))
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            concurrent_stamps = list(pool.map(lambda _: now_iso(), range(400)))
        self.assertEqual(len(concurrent_stamps), len(set(concurrent_stamps)))
        self.assertGreater(min(concurrent_stamps), sequential[-1])

    def test_review_record_and_snapshot_strip_recursive_history(self):
        db = sqlite3.connect(":memory:")
        db.row_factory = sqlite3.Row
        db.executescript("""
            CREATE TABLE shots (id TEXT PRIMARY KEY, project_id TEXT, is_deleted INTEGER);
            CREATE TABLE review_decisions (
                id TEXT PRIMARY KEY, shot_id TEXT, version_id TEXT, previous_status TEXT,
                next_status TEXT, action_label TEXT, created_by TEXT, created_at TEXT
            );
            INSERT INTO shots VALUES ('s1', 'p1', 0);
        """)
        record_review_decision(db, "s1", None, "Draft", "Approved", "director", "2026-01-01")
        decision = db.execute("SELECT * FROM review_decisions").fetchone()
        self.assertEqual((decision["action_label"], decision["created_by"]), ("同意意见", "director"))
        def bundle_loader(_db, project_id):
            self.assertEqual(project_id, "p1")
            return {"shots": [{"id": "s1", "title": "Shot", "versions": [1], "review_history": [2],
                               "assets": [{"id": "a1", "versions": [3]}]}]}
        snapshot, project_id = complete_shot_snapshot(db, "s1", bundle_loader)
        self.assertEqual(project_id, "p1")
        self.assertEqual(snapshot, {"id": "s1", "title": "Shot", "assets": [{"id": "a1"}]})
        self.assertEqual(complete_shot_snapshot(db, "missing", bundle_loader), (None, None))
        db.close()

    def test_server_uses_extracted_version_function_directly(self):
        source = Path(__file__).resolve().parents[1] / "server.py"
        spec = importlib.util.spec_from_file_location("version_alias_test_server", source)
        server = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(server)
        self.assertIs(server.now_iso, now_iso)
        self.assertIs(server.complete_shot_snapshot, complete_shot_snapshot)


if __name__ == "__main__":
    unittest.main()
