"""Unit tests for the AI Provider Registry, Proposal Engine, and Human-In-The-Loop flow."""

import os
import sys
import tempfile
import unittest

TEST_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(TEST_DIR)
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

import sqlite3
from ai_system.contracts import ProposalStatus, ScriptBreakdownRequest, VisualSuggestionRequest
from ai_system.providers import AIProviderRegistry, MockAIProvider
from ai_system.service import AIService


class TestAISystem(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.temp_dir.name, "test_ai.db")
        self.conn = sqlite3.connect(self.db_path)
        self._init_schema()

        self.registry = AIProviderRegistry()
        self.registry.register(MockAIProvider())
        self.service = AIService(self.conn, self.registry)

    def tearDown(self):
        self.conn.close()
        self.temp_dir.cleanup()

    def _init_schema(self):
        self.conn.executescript(
            """
            CREATE TABLE projects (id TEXT PRIMARY KEY, name TEXT);
            CREATE TABLE shots (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                position INTEGER NOT NULL,
                number TEXT NOT NULL,
                sort_index INTEGER NOT NULL DEFAULT 0,
                title TEXT NOT NULL DEFAULT '',
                description TEXT NOT NULL DEFAULT '',
                action TEXT NOT NULL DEFAULT '',
                shot_size TEXT NOT NULL DEFAULT '全景',
                movement TEXT NOT NULL DEFAULT '固定',
                duration_frames INTEGER NOT NULL DEFAULT 75,
                lens TEXT NOT NULL DEFAULT '',
                angle TEXT NOT NULL DEFAULT '',
                director_notes TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                at TEXT NOT NULL,
                actor TEXT NOT NULL,
                action TEXT NOT NULL,
                target TEXT NOT NULL,
                detail TEXT NOT NULL DEFAULT ''
            );
            INSERT INTO projects (id, name) VALUES ('proj-1', 'AI Test Project');
            INSERT INTO shots (id, project_id, position, number, sort_index, title, action, created_at, updated_at)
            VALUES ('s1', 'proj-1', 1, '1', 0, 'Shot 1', 'Character walks in rain', '2026-09-29T00:00:00Z', '2026-09-29T00:00:00Z');
            """
        )

    def test_disabled_by_default(self):
        caps = self.service.get_capabilities()
        self.assertFalse(caps.script_breakdown)
        self.assertFalse(caps.visual_suggestions)

        req = ScriptBreakdownRequest(project_id="proj-1", script_text="Scene 1\nRain falling.")
        with self.assertRaises(RuntimeError):
            self.service.request_script_breakdown(req)

    def test_breakdown_and_human_acceptance(self):
        self.registry.set_enabled(True)
        caps = self.service.get_capabilities()
        self.assertTrue(caps.script_breakdown)

        req = ScriptBreakdownRequest(
            project_id="proj-1",
            script_text="INT. CAFE - DAY\nAlice drinks coffee.\nBob enters anxiously.",
        )
        proposal = self.service.request_script_breakdown(req, user_id="user-1")
        self.assertEqual(proposal.status, ProposalStatus.PENDING)
        self.assertEqual(len(proposal.changes), 3)

        # Invariant check: shots table must not be mutated before acceptance
        cur = self.conn.execute("SELECT COUNT(*) FROM shots WHERE project_id = 'proj-1'")
        self.assertEqual(cur.fetchone()[0], 1)

        # Human acceptance
        res = self.service.accept_proposal(proposal.id, reviewer_user_id="director-1")
        self.assertEqual(res["status"], "accepted")
        self.assertEqual(res["applied_count"], 3)

        # Now shots table contains the new shots
        cur = self.conn.execute("SELECT COUNT(*) FROM shots WHERE project_id = 'proj-1'")
        self.assertEqual(cur.fetchone()[0], 4)

    def test_visual_suggestion_and_rejection(self):
        self.registry.set_enabled(True)
        req = VisualSuggestionRequest(
            project_id="proj-1",
            shot_id="s1",
            current_action="Character walks in rain",
        )
        proposal = self.service.request_visual_suggestions(req, user_id="user-1")
        self.assertEqual(proposal.status, ProposalStatus.PENDING)

        # Human rejection
        success = self.service.reject_proposal(proposal.id, reviewer_user_id="director-1")
        self.assertTrue(success)

        # Verify proposal status is rejected and shot was untouched
        loaded = self.service.get_proposal(proposal.id)
        self.assertEqual(loaded["status"], "rejected")

        cur = self.conn.execute("SELECT lens, director_notes FROM shots WHERE id = 's1'")
        row = cur.fetchone()
        self.assertEqual(row[0], "")
        self.assertEqual(row[1], "")


if __name__ == "__main__":
    unittest.main()
