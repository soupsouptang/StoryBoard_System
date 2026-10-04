"""Isolated HTTP and persistence contract for the single-shot write path."""

import http.cookiejar
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import threading
import unittest
import urllib.error
import urllib.request


class SingleShotUpdateTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.previous_env = {name: os.environ.get(name) for name in (
            "STORYBOARD_DATA_ROOT", "STORYBOARD_ADMIN_USER", "STORYBOARD_ADMIN_PASSWORD",
        )}
        os.environ.update({
            "STORYBOARD_DATA_ROOT": cls.temp.name,
            "STORYBOARD_ADMIN_USER": "shot-update-qa",
            "STORYBOARD_ADMIN_PASSWORD": "ShotUpdate2026!QA",
        })
        source = Path(__file__).resolve().parents[1] / "server.py"
        spec = importlib.util.spec_from_file_location("shot_update_test_server", source)
        cls.app = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.app)
        cls.app.init_db()
        cls.httpd = cls.app.ThreadingHTTPServer(("127.0.0.1", 0), cls.app.AppHandler)
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.httpd.server_port}"
        cls.client = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()),
        )

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()
        cls.temp.cleanup()
        for name, previous in cls.previous_env.items():
            if previous is None:
                os.environ.pop(name, None)
            else:
                os.environ[name] = previous

    def request(self, path, method="GET", payload=None, csrf=None):
        headers = {"Content-Type": "application/json"}
        if csrf:
            headers["X-CSRF-Token"] = csrf
        body = json.dumps(payload).encode() if payload is not None else None
        request = urllib.request.Request(self.base + path, body, headers, method=method)
        try:
            response = self.client.open(request)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            return response.status, json.loads(response.read())

    def test_update_merge_conflict_and_review_audit(self):
        status, _ = self.request("/api/shots/unknown", "PUT", {"title": "Denied"})
        self.assertEqual(status, 401)
        status, session = self.request("/api/login", "POST", {
            "username": "shot-update-qa", "password": "ShotUpdate2026!QA",
        })
        self.assertEqual(status, 200)
        csrf = session["csrf"]
        status, _ = self.request("/api/shots/unknown", "PUT", {"title": "Absent"}, csrf)
        self.assertEqual(status, 404)
        status, bundle = self.request("/api/projects", "POST", {"name": "Shot Update Contract"}, csrf)
        self.assertEqual(status, 201)
        shot = bundle["shots"][0]
        shot_id = shot["id"]
        original_revision = shot["revision"]

        status, updated = self.request(f"/api/shots/{shot_id}", "PUT", {
            "base_revision": original_revision,
            "changed_fields": ["title", "duration_frames"],
            "title": "Revision one", "duration_frames": 0,
        }, csrf)
        self.assertEqual(status, 200)
        self.assertEqual(updated["title"], "Revision one")
        self.assertEqual(updated["duration_frames"], 1)
        self.assertEqual(updated["revision"], original_revision + 1)

        status, conflict = self.request(f"/api/shots/{shot_id}", "PUT", {
            "base_revision": original_revision,
            "changed_fields": ["title"], "title": "Stale overwrite",
        }, csrf)
        self.assertEqual(status, 409)
        self.assertEqual(conflict["conflicting_fields"], ["title"])
        self.assertEqual(conflict["server_version"]["title"], "Revision one")

        status, merged = self.request(f"/api/shots/{shot_id}", "PUT", {
            "base_revision": original_revision,
            "changed_fields": ["scene"], "scene": "Non-overlapping edit",
            "title": "Stale overwrite",
        }, csrf)
        self.assertEqual(status, 200)
        self.assertEqual(merged["title"], "Revision one")
        self.assertEqual(merged["scene"], "Non-overlapping edit")

        status, reviewed = self.request(f"/api/shots/{shot_id}", "PUT", {
            "base_revision": merged["revision"],
            "changed_fields": ["status"], "status": "Ready for Review",
        }, csrf)
        self.assertEqual(status, 200)
        with self.app.connect() as db:
            self.assertEqual(db.execute(
                "SELECT COUNT(*) FROM review_decisions WHERE shot_id=?", (shot_id,),
            ).fetchone()[0], 1)
            self.assertEqual(db.execute(
                "SELECT COUNT(*) FROM shot_change_events WHERE shot_id=?", (shot_id,),
            ).fetchone()[0], 3)
            self.assertEqual(db.execute(
                "SELECT COUNT(*) FROM audit_log WHERE action='update_shot' AND target=?", (shot_id,),
            ).fetchone()[0], 3)
            self.assertEqual(reviewed["revision"], db.execute(
                "SELECT revision FROM shots WHERE id=?", (shot_id,),
            ).fetchone()[0])

        status, unchanged_review = self.request(f"/api/shots/{shot_id}", "PUT", {
            "base_revision": reviewed["revision"],
            "changed_fields": ["scene"], "scene": "Scene-only change",
            "status": "Approved",
        }, csrf)
        self.assertEqual(status, 200)
        self.assertEqual(unchanged_review["status"], "Ready for Review")
        with self.app.connect() as db:
            self.assertEqual(db.execute(
                "SELECT COUNT(*) FROM review_decisions WHERE shot_id=?", (shot_id,),
            ).fetchone()[0], 1)

    def test_y_review_version_must_belong_to_updated_shot(self):
        status, session = self.request("/api/login", "POST", {
            "username": "shot-update-qa", "password": "ShotUpdate2026!QA",
        })
        self.assertEqual(status, 200)
        csrf = session["csrf"]
        status, first = self.request("/api/projects", "POST", {"name": "Review Owner A"}, csrf)
        self.assertEqual(status, 201)
        status, second = self.request("/api/projects", "POST", {"name": "Review Owner B"}, csrf)
        self.assertEqual(status, 201)
        sid = first["shots"][0]["id"]
        other_sid = second["shots"][0]["id"]
        status, own_version = self.request(f"/api/shots/{sid}/versions", "POST", {}, csrf)
        self.assertEqual(status, 201)
        status, other_version = self.request(f"/api/shots/{other_sid}/versions", "POST", {}, csrf)
        self.assertEqual(status, 201)

        with self.app.connect() as db:
            before = dict(db.execute(
                "SELECT status, revision, updated_at FROM shots WHERE id=?", (sid,),
            ).fetchone())
            project_before = db.execute(
                "SELECT updated_at FROM projects WHERE id=?", (first["project"]["id"],),
            ).fetchone()[0]
            counts_before = tuple(db.execute(
                f"SELECT COUNT(*) FROM {table} WHERE {column}=?",
                (sid,),
            ).fetchone()[0] for table, column in (
                ("review_decisions", "shot_id"),
                ("shot_change_events", "shot_id"),
                ("audit_log", "target"),
            ))

        for bad_version in (other_version["id"], "unknown-version"):
            status, error = self.request(f"/api/shots/{sid}", "PUT", {
                "base_revision": before["revision"],
                "changed_fields": ["status"],
                "status": "Ready for Review",
                "version_id": bad_version,
            }, csrf)
            self.assertEqual(status, 400)
            self.assertEqual(error["error"], "版本不存在或不属于当前镜头")
            with self.app.connect() as db:
                self.assertEqual(dict(db.execute(
                    "SELECT status, revision, updated_at FROM shots WHERE id=?", (sid,),
                ).fetchone()), before)
                self.assertEqual(db.execute(
                    "SELECT updated_at FROM projects WHERE id=?", (first["project"]["id"],),
                ).fetchone()[0], project_before)
                self.assertEqual(tuple(db.execute(
                    f"SELECT COUNT(*) FROM {table} WHERE {column}=?",
                    (sid,),
                ).fetchone()[0] for table, column in (
                    ("review_decisions", "shot_id"),
                    ("shot_change_events", "shot_id"),
                    ("audit_log", "target"),
                )), counts_before)

        status, reviewed = self.request(f"/api/shots/{sid}", "PUT", {
            "changed_fields": ["status"], "status": "Ready for Review",
            "version_id": own_version["id"],
        }, csrf)
        self.assertEqual(status, 200)
        self.assertEqual(reviewed["status"], "Ready for Review")
        with self.app.connect() as db:
            self.assertEqual(db.execute(
                "SELECT version_id FROM review_decisions WHERE shot_id=?", (sid,),
            ).fetchone()[0], own_version["id"])

        status, unversioned = self.request(f"/api/shots/{sid}", "PUT", {
            "changed_fields": ["status"], "status": "Approved", "version_id": None,
        }, csrf)
        self.assertEqual(status, 200)
        self.assertEqual(unversioned["status"], "Approved")
        with self.app.connect() as db:
            self.assertEqual(db.execute(
                "SELECT version_id FROM review_decisions WHERE shot_id=? ORDER BY created_at DESC LIMIT 1",
                (sid,),
            ).fetchone()[0], None)

    def test_y_single_shot_rejects_invalid_commands_and_skips_noops(self):
        status, session = self.request("/api/login", "POST", {
            "username": "shot-update-qa", "password": "ShotUpdate2026!QA",
        })
        self.assertEqual(status, 200)
        csrf = session["csrf"]
        status, bundle = self.request("/api/projects", "POST", {"name": "Single Shot Command"}, csrf)
        self.assertEqual(status, 201)
        sid = bundle["shots"][0]["id"]
        pid = bundle["project"]["id"]
        status, first = self.request(f"/api/shots/{sid}", "PUT", {"title": "Current title"}, csrf)
        self.assertEqual(status, 200)
        self.assertEqual(first["revision"], bundle["shots"][0]["revision"] + 1)

        def snapshot():
            with self.app.connect() as db:
                shot = dict(db.execute(
                    "SELECT title, status, revision, updated_at FROM shots WHERE id=?", (sid,),
                ).fetchone())
                project = db.execute("SELECT updated_at FROM projects WHERE id=?", (pid,)).fetchone()[0]
                counts = tuple(db.execute(
                    f"SELECT COUNT(*) FROM {table} WHERE {column}=?", (sid,),
                ).fetchone()[0] for table, column in (
                    ("shot_change_events", "shot_id"),
                    ("review_decisions", "shot_id"),
                    ("audit_log", "target"),
                ))
                return shot, project, counts

        before = snapshot()
        invalid = (
            {"base_revision": first["revision"] + 1, "title": "future"},
            {"base_revision": "bad", "title": "malformed"},
            {"base_revision": 0, "title": "zero"},
            {"changed_fields": "title", "title": "string list"},
            {"changed_fields": ["not_a_field"], "not_a_field": "unknown"},
            {"changed_fields": ["title"], "status": "Approved"},
            {"changed_fields": ["title", "title"], "title": "duplicate"},
        )
        for payload in invalid:
            status, error = self.request(f"/api/shots/{sid}", "PUT", payload, csrf)
            self.assertEqual(status, 400, payload)
            self.assertIn("error", error)
            self.assertEqual(snapshot(), before)

        for payload in (
            {"changed_fields": []},
            {"changed_fields": ["title"], "title": "Current title"},
            {"base_revision": bundle["shots"][0]["revision"],
             "changed_fields": ["title"], "title": "Current title"},
            {"title": "Current title"},
            {"version_id": "ignored-without-status-change"},
            {"changed_fields": ["status"], "status": first["status"],
             "version_id": "ignored-when-status-is-unchanged"},
        ):
            status, unchanged = self.request(f"/api/shots/{sid}", "PUT", payload, csrf)
            self.assertEqual(status, 200, payload)
            self.assertEqual(unchanged["revision"], first["revision"])
            self.assertEqual(snapshot(), before)

        status, merged = self.request(f"/api/shots/{sid}", "PUT", {
            "base_revision": bundle["shots"][0]["revision"],
            "changed_fields": ["scene", "title"], "scene": "Independent scene",
            "title": "Current title",
        }, csrf)
        self.assertEqual(status, 200)
        self.assertEqual(merged["title"], "Current title")
        self.assertEqual(merged["scene"], "Independent scene")
        with self.app.connect() as db:
            fields = db.execute(
                "SELECT changed_fields_json FROM shot_change_events WHERE shot_id=? ORDER BY revision DESC LIMIT 1",
                (sid,),
            ).fetchone()[0]
            self.assertEqual(json.loads(fields), ["scene"])
        status, conflict = self.request(f"/api/shots/{sid}", "PUT", {
            "base_revision": bundle["shots"][0]["revision"],
            "changed_fields": ["title"], "title": "Actual overlap",
        }, csrf)
        self.assertEqual(status, 409)
        self.assertEqual(conflict["conflicting_fields"], ["title"])

    def test_y_bulk_validates_effective_changes_and_review_version(self):
        status, session = self.request("/api/login", "POST", {
            "username": "shot-update-qa", "password": "ShotUpdate2026!QA",
        })
        self.assertEqual(status, 200)
        csrf = session["csrf"]
        status, first = self.request("/api/projects", "POST", {"name": "Bulk Command A"}, csrf)
        self.assertEqual(status, 201)
        status, second = self.request("/api/projects", "POST", {"name": "Bulk Command B"}, csrf)
        self.assertEqual(status, 201)
        pid, sid = first["project"]["id"], first["shots"][0]["id"]
        status, foreign = self.request(
            f"/api/shots/{second['shots'][0]['id']}/versions", "POST", {}, csrf,
        )
        self.assertEqual(status, 201)

        def snapshot():
            with self.app.connect() as db:
                shot = dict(db.execute(
                    "SELECT status, revision, updated_at FROM shots WHERE id=?", (sid,),
                ).fetchone())
                project = db.execute("SELECT updated_at FROM projects WHERE id=?", (pid,)).fetchone()[0]
                counts = tuple(db.execute(
                    f"SELECT COUNT(*) FROM {table} WHERE {column}=?", (key,),
                ).fetchone()[0] for table, column, key in (
                    ("shot_change_events", "shot_id", sid),
                    ("review_decisions", "shot_id", sid),
                    ("audit_log", "target", pid),
                    ("project_snapshots", "project_id", pid),
                ))
                return shot, project, counts

        before = snapshot()
        invalid = (
            {"shots": [{"id": sid, "base_revision": before[0]["revision"] + 1,
                        "changed_fields": ["status"], "status": "Ready for Review"}]},
            {"shots": [{"id": sid, "base_revision": "bad",
                        "changed_fields": ["status"], "status": "Ready for Review"}]},
            {"shots": [{"id": sid, "changed_fields": ["status"]}]},
            {"shots": [{"id": sid, "changed_fields": None, "status": "Ready for Review"}]},
            {"shots": [{"id": sid, "changed_fields": ["unknown"], "unknown": "x"}]},
            {"shots": [{"id": sid, "changed_fields": ["status", "status"],
                        "status": "Ready for Review"}]},
            {"shots": [{"id": sid, "changed_fields": ["status"],
                        "status": "Ready for Review", "version_id": foreign["id"]}]},
        )
        for payload in invalid:
            status, error = self.request(f"/api/projects/{pid}/shots", "PUT", payload, csrf)
            self.assertEqual(status, 400, payload)
            self.assertIn("error", error)
            self.assertEqual(snapshot(), before)

        for payload in (
            {"shots": []},
            {"shots": [{"id": sid, "changed_fields": []}]},
            {"shots": [{"id": sid, "changed_fields": ["status"], "status": before[0]["status"]}]},
            {"shots": [{"id": sid, "status": before[0]["status"]}]},
        ):
            status, response = self.request(f"/api/projects/{pid}/shots", "PUT", payload, csrf)
            self.assertEqual(status, 200, response)
            self.assertEqual(snapshot(), before)

        status, updated = self.request(f"/api/projects/{pid}/shots", "PUT", {"shots": [{
            "id": sid, "base_revision": before[0]["revision"],
            "changed_fields": ["status"], "status": "Ready for Review", "version_id": None,
        }]}, csrf)
        self.assertEqual(status, 200, updated)
        self.assertEqual(updated["shots"][0]["status"], "Ready for Review")
        with self.app.connect() as db:
            self.assertIsNone(db.execute(
                "SELECT version_id FROM review_decisions WHERE shot_id=?", (sid,),
            ).fetchone()[0])
            self.assertEqual(json.loads(db.execute(
                "SELECT changed_fields_json FROM shot_change_events WHERE shot_id=? ORDER BY revision DESC LIMIT 1",
                (sid,),
            ).fetchone()[0]), ["status"])
        after_change = snapshot()
        status, same = self.request(f"/api/projects/{pid}/shots", "PUT", {"shots": [{
            "id": sid, "base_revision": before[0]["revision"],
            "changed_fields": ["status"], "status": "Ready for Review",
        }]}, csrf)
        self.assertEqual(status, 200, same)
        self.assertEqual(snapshot(), after_change)

    def test_y_bulk_unchanged_custom_fields_and_panels_do_not_write(self):
        status, session = self.request("/api/login", "POST", {
            "username": "shot-update-qa", "password": "ShotUpdate2026!QA",
        })
        self.assertEqual(status, 200)
        csrf = session["csrf"]
        status, bundle = self.request("/api/projects", "POST", {"name": "Bulk Nested Noop"}, csrf)
        self.assertEqual(status, 201)
        pid, sid = bundle["project"]["id"], bundle["shots"][0]["id"]
        status, _ = self.request(f"/api/projects/{pid}/custom-fields", "POST", {
            "key": "qa_note", "label": "QA Note", "field_type": "text",
        }, csrf)
        self.assertEqual(status, 201)
        status, _ = self.request(f"/api/projects/{pid}/shots", "PUT", {"shots": [{
            "id": sid, "changed_fields": ["custom_fields"],
            "custom_fields": {"qa_note": "unchanged"},
        }]}, csrf)
        self.assertEqual(status, 200)

        with self.app.connect() as db:
            panel = db.execute(
                "SELECT id, label, duration_frames, notes, media_id FROM panels WHERE shot_id=? LIMIT 1",
                (sid,),
            ).fetchone()
        if panel is None:
            status, _ = self.request(f"/api/shots/{sid}/panels", "POST", {}, csrf)
            self.assertEqual(status, 201)
            with self.app.connect() as db:
                panel = db.execute(
                    "SELECT id, label, duration_frames, notes, media_id FROM panels WHERE shot_id=? LIMIT 1",
                    (sid,),
                ).fetchone()
        panel_payload = dict(panel)
        with self.app.connect() as db:
            before = (
                db.execute("SELECT revision, updated_at FROM shots WHERE id=?", (sid,)).fetchone()[:],
                db.execute("SELECT updated_at FROM projects WHERE id=?", (pid,)).fetchone()[0],
                db.execute("SELECT COUNT(*) FROM shot_change_events WHERE shot_id=?", (sid,)).fetchone()[0],
                db.execute("SELECT COUNT(*) FROM project_snapshots WHERE project_id=?", (pid,)).fetchone()[0],
                db.execute("SELECT updated_at FROM panels WHERE id=?", (panel["id"],)).fetchone()[0],
            )

        status, _ = self.request(f"/api/projects/{pid}/shots", "PUT", {"shots": [{
            "id": sid, "changed_fields": ["custom_fields", "panels"],
            "custom_fields": {"qa_note": "unchanged"},
            "panels": [panel_payload],
        }]}, csrf)
        self.assertEqual(status, 200)
        with self.app.connect() as db:
            after = (
                db.execute("SELECT revision, updated_at FROM shots WHERE id=?", (sid,)).fetchone()[:],
                db.execute("SELECT updated_at FROM projects WHERE id=?", (pid,)).fetchone()[0],
                db.execute("SELECT COUNT(*) FROM shot_change_events WHERE shot_id=?", (sid,)).fetchone()[0],
                db.execute("SELECT COUNT(*) FROM project_snapshots WHERE project_id=?", (pid,)).fetchone()[0],
                db.execute("SELECT updated_at FROM panels WHERE id=?", (panel["id"],)).fetchone()[0],
            )
        self.assertEqual(after, before)

        # A partial panel patch must leave fields omitted by the caller intact.
        with self.app.connect() as db:
            db.execute("UPDATE panels SET notes=? WHERE id=?", ("Keep these notes", panel["id"]))
        with self.app.connect() as db:
            panel_before = dict(db.execute(
                "SELECT label, duration_frames, notes, media_id, updated_at FROM panels WHERE id=?",
                (panel["id"],),
            ).fetchone())
            revision_before = db.execute("SELECT revision FROM shots WHERE id=?", (sid,)).fetchone()[0]
            events_before = db.execute("SELECT COUNT(*) FROM shot_change_events WHERE shot_id=?", (sid,)).fetchone()[0]
        status, _ = self.request(f"/api/projects/{pid}/shots", "PUT", {"shots": [{
            "id": sid, "changed_fields": ["panels"],
            "panels": [{"id": panel["id"], "label": panel_before["label"]}],
        }]}, csrf)
        self.assertEqual(status, 200)
        with self.app.connect() as db:
            self.assertEqual(dict(db.execute(
                "SELECT label, duration_frames, notes, media_id, updated_at FROM panels WHERE id=?",
                (panel["id"],),
            ).fetchone()), panel_before)
            self.assertEqual(db.execute("SELECT revision FROM shots WHERE id=?", (sid,)).fetchone()[0], revision_before)
            self.assertEqual(db.execute("SELECT COUNT(*) FROM shot_change_events WHERE shot_id=?", (sid,)).fetchone()[0], events_before)

        status, _ = self.request(f"/api/projects/{pid}/shots", "PUT", {"shots": [{
            "id": sid, "changed_fields": ["panels"],
            "panels": [{"id": panel["id"], "notes": "Changed notes"}],
        }]}, csrf)
        self.assertEqual(status, 200)
        with self.app.connect() as db:
            updated_panel = dict(db.execute(
                "SELECT label, duration_frames, notes, media_id FROM panels WHERE id=?",
                (panel["id"],),
            ).fetchone())
            self.assertEqual(updated_panel, {**{key: panel_before[key] for key in updated_panel}, "notes": "Changed notes"})
            self.assertEqual(db.execute("SELECT revision FROM shots WHERE id=?", (sid,)).fetchone()[0], revision_before + 1)
            self.assertEqual(json.loads(db.execute(
                "SELECT changed_fields_json FROM shot_change_events WHERE shot_id=? ORDER BY revision DESC LIMIT 1",
                (sid,),
            ).fetchone()[0]), ["panels"])

    def test_y_bulk_explicit_order_restore_and_legacy_full_save(self):
        status, session = self.request("/api/login", "POST", {
            "username": "shot-update-qa", "password": "ShotUpdate2026!QA",
        })
        self.assertEqual(status, 200)
        csrf = session["csrf"]
        status, bundle = self.request("/api/projects", "POST", {"name": "Bulk Order"}, csrf)
        self.assertEqual(status, 201)
        pid = bundle["project"]["id"]
        initial_ids = [shot["id"] for shot in bundle["shots"]]
        status, bundle = self.request(f"/api/projects/{pid}/shots", "POST", {
            "title": "Second shot",
        }, csrf)
        self.assertEqual(status, 201)
        second_id = bundle["created_shot_id"]
        ordered_ids = [second_id, *initial_ids]
        status, reordered = self.request(f"/api/projects/{pid}/shots", "PUT", {
            "restore_order": True,
            "shots": [{"id": shot_id, "changed_fields": []} for shot_id in ordered_ids],
        }, csrf)
        self.assertEqual(status, 200)
        self.assertEqual([shot["id"] for shot in reordered["shots"]], ordered_ids)
        with self.app.connect() as db:
            saved = (
                tuple(db.execute(
                    "SELECT id, revision FROM shots WHERE project_id=? ORDER BY position", (pid,),
                ).fetchall()),
                db.execute("SELECT COUNT(*) FROM project_snapshots WHERE project_id=?", (pid,)).fetchone()[0],
            )
        status, same = self.request(f"/api/projects/{pid}/shots", "PUT", {
            "shots": [{"id": shot_id} for shot_id in ordered_ids],
        }, csrf)
        self.assertEqual(status, 200)
        self.assertEqual([shot["id"] for shot in same["shots"]], ordered_ids)
        with self.app.connect() as db:
            after = (
                tuple(db.execute(
                    "SELECT id, revision FROM shots WHERE project_id=? ORDER BY position", (pid,),
                ).fetchall()),
                db.execute("SELECT COUNT(*) FROM project_snapshots WHERE project_id=?", (pid,)).fetchone()[0],
            )
        self.assertEqual(after, saved)

    def test_z_bulk_update_rolls_back_invalid_panel_and_keeps_field_merge(self):
        status, session = self.request("/api/login", "POST", {
            "username": "shot-update-qa", "password": "ShotUpdate2026!QA",
        })
        self.assertEqual(status, 200)
        csrf = session["csrf"]
        status, bundle = self.request("/api/projects", "POST", {"name": "Bulk Update Contract"}, csrf)
        self.assertEqual(status, 201)
        pid = bundle["project"]["id"]
        shot = bundle["shots"][0]
        sid = shot["id"]
        original_revision = shot["revision"]

        status, updated = self.request(f"/api/projects/{pid}/shots", "PUT", {"shots": [{
            "id": sid, "base_revision": original_revision,
            "changed_fields": ["description"], "description": "First editor",
        }]}, csrf)
        self.assertEqual(status, 200)
        current = next(item for item in updated["shots"] if item["id"] == sid)
        self.assertEqual(current["description"], "First editor")

        status, merged = self.request(f"/api/projects/{pid}/shots", "PUT", {"shots": [{
            "id": sid, "base_revision": original_revision,
            "changed_fields": ["voiceover"], "voiceover": "Second editor",
            "description": "Stale full snapshot",
        }]}, csrf)
        self.assertEqual(status, 200)
        current = next(item for item in merged["shots"] if item["id"] == sid)
        self.assertEqual(current["description"], "First editor")
        self.assertEqual(current["voiceover"], "Second editor")

        status, conflict = self.request(f"/api/projects/{pid}/shots", "PUT", {"shots": [{
            "id": sid, "base_revision": original_revision,
            "changed_fields": ["description"], "description": "Conflicting edit",
        }]}, csrf)
        self.assertEqual(status, 409)
        self.assertIn("description", conflict["conflicting_fields"])

        status, error = self.request(f"/api/projects/{pid}/shots", "PUT", {"shots": [{
            "id": sid, "base_revision": current["revision"],
            "changed_fields": ["description", "panels"],
            "description": "Must roll back",
            "panels": [{"id": "panel-test", "media_id": "foreign-asset"}],
        }]}, csrf)
        self.assertEqual(status, 400)
        self.assertIn("Panel 媒体不存在", error["error"])
        with self.app.connect() as db:
            persisted = db.execute("SELECT description, revision FROM shots WHERE id=?", (sid,)).fetchone()
            self.assertEqual(persisted["description"], "First editor")
            self.assertEqual(persisted["revision"], current["revision"])
            self.assertEqual(db.execute(
                "SELECT COUNT(*) FROM audit_log WHERE action='bulk_update_shots' AND target=?", (pid,),
            ).fetchone()[0], 2)

        for invalid in (
            {"shots": [42]},
            {"shots": [{"id": sid, "changed_fields": "title", "title": "invalid"}]},
            {"shots": [{"id": sid, "base_revision": "bad", "changed_fields": ["title"], "title": "invalid"}]},
            {"shots": [{"id": sid, "changed_fields": ["panels"], "panels": [42]}]},
        ):
            status, _ = self.request(f"/api/projects/{pid}/shots", "PUT", invalid, csrf)
            self.assertEqual(status, 400)
        with self.app.connect() as db:
            self.assertEqual(db.execute("SELECT revision FROM shots WHERE id=?", (sid,)).fetchone()[0], current["revision"])

        status, same_status = self.request(f"/api/projects/{pid}/shots", "PUT", {"shots": [{
            "id": sid, "changed_fields": ["status"], "status": "Draft",
        }]}, csrf)
        self.assertEqual(status, 200)
        with self.app.connect() as db:
            self.assertEqual(db.execute("SELECT COUNT(*) FROM review_decisions WHERE shot_id=?", (sid,)).fetchone()[0], 0)


if __name__ == "__main__":
    unittest.main()
