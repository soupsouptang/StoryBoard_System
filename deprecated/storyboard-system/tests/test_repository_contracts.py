"""Unit tests for the repository abstraction layer."""

import os
import sys
import tempfile
import unittest

TEST_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(TEST_DIR)
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

import sqlite3
from repositories.contracts import CustomFieldDTO, ProjectDTO, ShotDTO
from repositories.sqlite_repo import (
    SQLiteFieldRepository,
    SQLiteProjectRepository,
    SQLiteShotRepository,
    SQLiteUnitOfWork,
)


class TestRepositoryContracts(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.temp_dir.name, "test_repo.db")
        self.conn = sqlite3.connect(self.db_path)
        self._init_schema()

    def tearDown(self):
        self.conn.close()
        self.temp_dir.cleanup()

    def _init_schema(self):
        self.conn.executescript(
            """
            CREATE TABLE projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                production_type TEXT NOT NULL DEFAULT 'promo',
                fps REAL NOT NULL DEFAULT 25.0,
                start_tc TEXT NOT NULL DEFAULT '01:00:00:00',
                target_seconds REAL NOT NULL DEFAULT 270.0,
                aspect_ratio TEXT NOT NULL DEFAULT '16:9',
                status TEXT NOT NULL DEFAULT 'development',
                share_token TEXT UNIQUE,
                is_drop_frame INTEGER NOT NULL DEFAULT 0,
                director TEXT NOT NULL DEFAULT '',
                dp TEXT NOT NULL DEFAULT '',
                producer TEXT NOT NULL DEFAULT '',
                company TEXT NOT NULL DEFAULT '',
                custom_template_json TEXT NOT NULL DEFAULT '{}',
                deleted_at TEXT,
                updated_by TEXT NOT NULL DEFAULT '',
                updated_by_user_id TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE shots (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                sequence_id TEXT,
                position INTEGER NOT NULL,
                number TEXT NOT NULL,
                sort_index INTEGER NOT NULL DEFAULT 0,
                title TEXT NOT NULL DEFAULT '',
                chapter TEXT NOT NULL DEFAULT '',
                scene TEXT NOT NULL DEFAULT '',
                panel_frame TEXT NOT NULL DEFAULT '',
                description TEXT NOT NULL DEFAULT '',
                action TEXT NOT NULL DEFAULT '',
                performance TEXT NOT NULL DEFAULT '',
                composition TEXT NOT NULL DEFAULT '',
                director_notes TEXT NOT NULL DEFAULT '',
                notes TEXT NOT NULL DEFAULT '',
                duration_frames INTEGER NOT NULL DEFAULT 75,
                locked INTEGER NOT NULL DEFAULT 0,
                handles_head_frames INTEGER NOT NULL DEFAULT 0,
                handles_tail_frames INTEGER NOT NULL DEFAULT 0,
                shot_size TEXT NOT NULL DEFAULT '全景',
                lens TEXT NOT NULL DEFAULT '',
                lens_source TEXT NOT NULL DEFAULT '',
                angle TEXT NOT NULL DEFAULT '',
                height TEXT NOT NULL DEFAULT '',
                movement TEXT NOT NULL DEFAULT '固定',
                equipment TEXT NOT NULL DEFAULT '',
                sensor TEXT NOT NULL DEFAULT '',
                aperture TEXT NOT NULL DEFAULT '',
                shutter TEXT NOT NULL DEFAULT '',
                camera_fps REAL NOT NULL DEFAULT 25.0,
                voiceover TEXT NOT NULL DEFAULT '',
                dialogue TEXT NOT NULL DEFAULT '',
                subtitle TEXT NOT NULL DEFAULT '',
                music TEXT NOT NULL DEFAULT '',
                sound TEXT NOT NULL DEFAULT '',
                primary_method TEXT NOT NULL DEFAULT 'LIVE',
                secondary_methods TEXT NOT NULL DEFAULT '[]',
                department TEXT NOT NULL DEFAULT 'Camera',
                owner TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'Draft',
                approval_version TEXT NOT NULL DEFAULT 'v001',
                transition TEXT NOT NULL DEFAULT '',
                is_deleted INTEGER NOT NULL DEFAULT 0,
                deleted_at TEXT,
                method_data_json TEXT NOT NULL DEFAULT '{}',
                revision INTEGER NOT NULL DEFAULT 1,
                import_columns_json TEXT NOT NULL DEFAULT '{}',
                rich_text_json TEXT NOT NULL DEFAULT '{}',
                script_character TEXT NOT NULL DEFAULT '',
                script_parenthetical TEXT NOT NULL DEFAULT '',
                script_scene_type TEXT NOT NULL DEFAULT '',
                script_time_of_day TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE custom_field_definitions (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                key TEXT NOT NULL,
                label TEXT NOT NULL,
                type TEXT NOT NULL DEFAULT 'text',
                options_json TEXT NOT NULL DEFAULT '[]',
                sort_order INTEGER NOT NULL DEFAULT 0,
                is_required INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            );
            CREATE TABLE custom_field_values (
                id TEXT PRIMARY KEY,
                shot_id TEXT NOT NULL,
                field_id TEXT NOT NULL,
                value_json TEXT NOT NULL DEFAULT 'null',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            """
        )

    def test_project_repository_crud(self):
        repo = SQLiteProjectRepository(self.conn)
        proj = ProjectDTO(id="p1", name="Test Project", created_at="2026-09-29T00:00:00Z", updated_at="2026-09-29T00:00:00Z")
        repo.save(proj)
        self.conn.commit()

        loaded = repo.get_by_id("p1")
        self.assertIsNotNone(loaded)
        self.assertEqual(loaded.name, "Test Project")

        active_list = repo.list_active()
        self.assertEqual(len(active_list), 1)

        repo.soft_delete("p1", "2026-09-29T01:00:00Z")
        self.conn.commit()
        self.assertEqual(len(repo.list_active()), 0)

        repo.restore("p1")
        self.conn.commit()
        self.assertEqual(len(repo.list_active()), 1)

    def test_shot_repository_revision_conflict(self):
        repo = SQLiteShotRepository(self.conn)
        shot = ShotDTO(id="s1", project_id="p1", revision=1, created_at="2026-09-29T00:00:00Z", updated_at="2026-09-29T00:00:00Z")
        repo.save(shot)
        self.conn.commit()

        # Valid revision update
        new_rev = repo.update_revision("s1", expected_revision=1, updates={"title": "New Title"})
        self.conn.commit()
        self.assertEqual(new_rev, 2)

        # Conflict on stale revision
        with self.assertRaises(ValueError):
            repo.update_revision("s1", expected_revision=1, updates={"title": "Stale"})

    def test_field_repository_lifecycle(self):
        repo = SQLiteFieldRepository(self.conn)
        f = CustomFieldDTO(id="f1", project_id="p1", key="lens_type", label="Lens Type", created_at="2026-09-29T00:00:00Z")
        repo.save(f)
        self.conn.commit()

        loaded = repo.get_by_key("p1", "lens_type")
        self.assertIsNotNone(loaded)
        self.assertEqual(loaded.label, "Lens Type")

        self.assertTrue(repo.purge_field("p1", "f1"))
        self.conn.commit()
        self.assertIsNone(repo.get_by_key("p1", "lens_type"))

    def test_unit_of_work(self):
        with SQLiteUnitOfWork(self.conn) as uow:
            uow.projects.save(ProjectDTO(id="p2", name="UOW Project", created_at="now", updated_at="now"))
            uow.shots.save(ShotDTO(id="s2", project_id="p2", created_at="now", updated_at="now"))
        
        # Verify committed
        p = SQLiteProjectRepository(self.conn).get_by_id("p2")
        self.assertIsNotNone(p)
        s = SQLiteShotRepository(self.conn).get_by_id("s2")
        self.assertIsNotNone(s)


if __name__ == "__main__":
    unittest.main()
