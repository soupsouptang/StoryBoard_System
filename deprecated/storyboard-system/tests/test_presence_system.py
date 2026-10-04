"""Unit tests for the PresenceEngine and SoftLockManager."""

import os
import sys
import unittest

TEST_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(TEST_DIR)
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from presence_system.contracts import PresenceState
from presence_system.engine import PresenceEngine
from presence_system.lock_manager import SoftLockManager


class TestPresenceSystem(unittest.TestCase):
    def setUp(self):
        self.engine = PresenceEngine(ttl_seconds=2.0)
        self.lock_mgr = SoftLockManager(lock_timeout_seconds=2.0)

    def test_heartbeat_and_viewing(self):
        users = self.engine.heartbeat(
            project_id="proj-alpha",
            user_id="u1",
            display_name="Alice",
            workspace="table",
            presence_state="viewing",
        )
        self.assertEqual(len(users), 1)
        self.assertEqual(users[0]["user_id"], "u1")
        self.assertEqual(users[0]["presence_state"], "viewing")

    def test_soft_locking_during_editing(self):
        # Alice starts editing shot-1 dialogue
        self.engine.heartbeat(
            project_id="proj-alpha",
            user_id="u1",
            display_name="Alice",
            shot_id="shot-1",
            field_name="dialogue",
            presence_state="editing",
            session_id="sess-u1",
        )

        snapshot = self.engine.get_snapshot("proj-alpha")
        self.assertEqual(len(snapshot.active_locks), 1)
        self.assertEqual(snapshot.active_locks[0]["field"], "dialogue")
        self.assertEqual(snapshot.active_locks[0]["user_id"], "u1")

        # Bob tries to acquire lock on same field
        acquired, existing = self.lock_mgr.acquire(
            project_id="proj-alpha",
            shot_id="shot-1",
            field_name="dialogue",
            user_id="u2",
            session_id="sess-u2",
        )
        # Should be acquired=False because Alice currently holds it
        # Note: testing direct lock_mgr with another project or session
        acq, lk = self.engine._lock_mgr.acquire(
            project_id="proj-alpha",
            shot_id="shot-1",
            field_name="dialogue",
            user_id="u2",
            session_id="sess-u2",
        )
        self.assertFalse(acq)
        self.assertEqual(lk.user_id, "u1")

    def test_leave_releases_locks(self):
        self.engine.heartbeat(
            project_id="proj-alpha",
            user_id="u1",
            display_name="Alice",
            shot_id="shot-2",
            field_name="lens",
            presence_state="editing",
            session_id="sess-u1",
        )
        self.assertEqual(len(self.engine.get_snapshot("proj-alpha").active_locks), 1)

        # Alice leaves
        self.engine.leave("proj-alpha", "u1")
        self.assertEqual(len(self.engine.get_snapshot("proj-alpha").active_users), 0)
        self.assertEqual(len(self.engine.get_snapshot("proj-alpha").active_locks), 0)

    def test_room_isolation(self):
        self.engine.heartbeat(project_id="proj-A", user_id="u1", display_name="Alice")
        self.engine.heartbeat(project_id="proj-B", user_id="u2", display_name="Bob")

        snapA = self.engine.get_snapshot("proj-A")
        snapB = self.engine.get_snapshot("proj-B")

        self.assertEqual(len(snapA.active_users), 1)
        self.assertEqual(snapA.active_users[0]["user_id"], "u1")
        self.assertEqual(len(snapB.active_users), 1)
        self.assertEqual(snapB.active_users[0]["user_id"], "u2")


if __name__ == "__main__":
    unittest.main()
