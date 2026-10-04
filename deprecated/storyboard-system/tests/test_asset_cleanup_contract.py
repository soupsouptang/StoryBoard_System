import http.cookiejar
import importlib.util
import json
import os
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request
import uuid
from pathlib import Path


class AssetCleanupContractTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.previous_env = {key: os.environ.get(key) for key in (
            "STORYBOARD_DATA_ROOT", "STORYBOARD_ADMIN_USER", "STORYBOARD_ADMIN_PASSWORD"
        )}
        os.environ["STORYBOARD_DATA_ROOT"] = cls.temp.name
        os.environ["STORYBOARD_ADMIN_USER"] = "asset-qa"
        os.environ["STORYBOARD_ADMIN_PASSWORD"] = "AssetCleanup2026!QA"
        server_path = Path(__file__).resolve().parents[1] / "server.py"
        spec = importlib.util.spec_from_file_location("storyboard_asset_cleanup", server_path)
        cls.app = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.app)
        cls.app.init_db()
        cls.httpd = cls.app.ThreadingHTTPServer(("127.0.0.1", 0), cls.app.AppHandler)
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.httpd.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()
        cls.temp.cleanup()
        for key, value in cls.previous_env.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value

    def setUp(self):
        jar = http.cookiejar.CookieJar()
        self.client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
        self.csrf = self.request("/api/login", "POST", {
            "username": "asset-qa", "password": "AssetCleanup2026!QA"
        })[1]["csrf"]
        status, bundle = self.request("/api/projects", "POST", {
            "name": "Asset cleanup " + uuid.uuid4().hex[:8], "production_type": "tvc",
            "fps": 25, "target_seconds": 10, "aspect_ratio": "16:9"
        }, self.csrf)
        self.assertEqual(status, 201)
        self.pid = bundle["project"]["id"]
        self.sid = bundle["shots"][0]["id"]

    def request(self, path, method="GET", payload=None, csrf=None, client=None):
        body = json.dumps(payload).encode("utf-8") if payload is not None else None
        headers = {"Content-Type": "application/json"}
        if csrf:
            headers["X-CSRF-Token"] = csrf
        req = urllib.request.Request(self.base + path, data=body, headers=headers, method=method)
        try:
            with (client or self.client).open(req) as response:
                raw = response.read()
                return response.status, json.loads(raw) if raw else None
        except urllib.error.HTTPError as error:
            raw = error.read()
            return error.code, json.loads(raw) if raw else None

    def add_asset(self, name):
        aid = str(uuid.uuid4())
        stored_name = aid + ".png"
        self.app.MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
        (self.app.MEDIA_ROOT / stored_name).write_bytes(b"x" * 128)
        with self.app.connect() as db:
            db.execute("""INSERT INTO assets
                (id, project_id, filename, stored_name, mime, size, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (aid, self.pid, name, stored_name, "image/png", 128, self.app.now_iso()))
        return aid

    def test_preview_matches_cleanup_with_all_durable_protections(self):
        clear = self.add_asset("clear.png")
        stale = self.add_asset("stale-link.png")
        panel = self.add_asset("panel.png")
        step = self.add_asset("step.png")
        board = self.add_asset("board.png")
        version = self.add_asset("version.png")
        snapshot = self.add_asset("snapshot.png")
        metadata_source = self.add_asset("metadata-source.png")
        active_share = self.add_asset("active-share.png")
        inactive_share = self.add_asset("expired-share.png")
        at = self.app.now_iso()
        with self.app.connect() as db:
            db.execute("INSERT INTO panels (id, shot_id, position, media_id, created_at, updated_at) VALUES (?, ?, 0, ?, ?, ?)",
                       (str(uuid.uuid4()), self.sid, panel, at, at))
            db.execute("INSERT INTO production_steps (id, shot_id, step_order, name, input_asset, created_at, updated_at) VALUES (?, ?, 0, 'Asset input', ?, ?, ?)",
                       (str(uuid.uuid4()), self.sid, step, at, at))
            db.execute("INSERT INTO project_creative_boards (project_id, data_json, revision, updated_at) VALUES (?, ?, 1, ?)",
                       (self.pid, json.dumps([{"asset_id": board}]), at))
            db.execute("INSERT INTO shot_versions (id, shot_id, version_num, snapshot_json, asset_id, created_at, updated_at) VALUES (?, ?, 'v001', ?, ?, ?, ?)",
                       (str(uuid.uuid4()), self.sid, json.dumps({"asset_id": version}), version, at, at))
            db.execute("INSERT INTO project_snapshots (id, project_id, version_num, snapshot_json, created_at) VALUES (?, ?, 'v900', ?, ?)",
                       (str(uuid.uuid4()), self.pid, json.dumps({"asset_id": snapshot}), at))
            db.execute("UPDATE assets SET metadata_json=? WHERE id=?",
                       (json.dumps({"source_asset_id": metadata_source}), panel))
            db.execute("INSERT INTO share_links (token, project_id, snapshot_json, expires_at, created_at) VALUES (?, ?, ?, NULL, ?)",
                       ("active-" + uuid.uuid4().hex, self.pid, json.dumps({"asset_id": active_share}), at))
            db.execute("INSERT INTO share_links (token, project_id, snapshot_json, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
                       ("expired-" + uuid.uuid4().hex, self.pid, json.dumps({"asset_id": inactive_share}), int(time.time()) - 60, at))
            db.execute("INSERT INTO shot_asset_links (id, shot_id, asset_id, role, created_at) VALUES (?, ?, ?, 'Reference', ?)",
                       (str(uuid.uuid4()), self.sid, stale, at))

        preview_path = f"/api/projects/{self.pid}/assets/unused/preview"
        status, preview = self.request(preview_path)
        self.assertEqual(status, 200)
        eligible_ids = {item["id"] for item in preview["deletable"]}
        self.assertEqual(eligible_ids, {clear, stale, inactive_share})
        self.assertEqual(preview["deletable_count"], len(eligible_ids))
        self.assertEqual(preview["protected_count"], 7)
        self.assertIn("asset_metadata", next(item["reasons"] for item in preview["protected"]
                                               if item["id"] == metadata_source))
        self.assertEqual(preview["stale_links_to_prune"], 1)
        with self.app.connect() as db:
            self.assertEqual(db.execute("SELECT COUNT(*) FROM shot_asset_links WHERE asset_id=?", (stale,)).fetchone()[0], 1,
                             "preview must not mutate stale links")

        status, deleted = self.request(f"/api/projects/{self.pid}/assets/unused", "DELETE", {}, self.csrf)
        self.assertEqual(status, 200)
        self.assertEqual({item["id"] for item in deleted["deleted_assets"]}, eligible_ids)
        self.assertEqual(deleted["deleted"], preview["deletable_count"])
        self.assertEqual(deleted["protected"], preview["protected_count"])
        self.assertEqual(deleted["stale_links_pruned"], preview["stale_links_to_prune"])
        self.assertEqual(deleted["files_removed"], len(eligible_ids))
        self.assertEqual(deleted["bytes_freed"], 128 * len(eligible_ids))
        self.assertTrue(all((self.app.MEDIA_ROOT / (asset_id + ".png")).exists()
                            for asset_id in (panel, step, board, version, snapshot, metadata_source, active_share)))
        with self.app.connect() as db:
            remaining = {row["id"] for row in db.execute("SELECT id FROM assets WHERE project_id=?", (self.pid,))}
            self.assertEqual(remaining, {panel, step, board, version, snapshot, metadata_source, active_share})
            self.assertEqual(db.execute("SELECT COUNT(*) FROM shot_asset_links WHERE asset_id=?", (stale,)).fetchone()[0], 0)

        status, second = self.request(f"/api/projects/{self.pid}/assets/unused", "DELETE", {}, self.csrf)
        self.assertEqual(status, 200)
        self.assertEqual(second["deleted"], 0)
        self.assertEqual(second["protected"], 7)

    def test_shared_storage_key_is_not_unlinked(self):
        protected = self.add_asset("protected.png")
        unused = self.add_asset("unused.png")
        at = self.app.now_iso()
        with self.app.connect() as db:
            db.execute("INSERT INTO panels (id, shot_id, position, media_id, created_at, updated_at) VALUES (?, ?, 0, ?, ?, ?)",
                       (str(uuid.uuid4()), self.sid, protected, at, at))
            db.execute("""INSERT INTO asset_versions
                (id, asset_id, version_number, storage_key, mime_type, size, created_at)
                VALUES (?, ?, 'v002', ?, 'image/png', 128, ?)""",
                (str(uuid.uuid4()), protected, unused + ".png", at))
        status, deleted = self.request(f"/api/projects/{self.pid}/assets/unused", "DELETE", {}, self.csrf)
        self.assertEqual(status, 200)
        self.assertEqual(deleted["deleted"], 1)
        self.assertEqual(deleted["files_removed"], 0)
        self.assertTrue((self.app.MEDIA_ROOT / (protected + ".png")).exists())
        self.assertTrue((self.app.MEDIA_ROOT / (unused + ".png")).exists())

    def test_preview_requires_auth_and_cleanup_requires_csrf(self):
        asset = self.add_asset("keep-until-authorized.png")
        preview_path = f"/api/projects/{self.pid}/assets/unused/preview"
        self.assertEqual(self.request(preview_path, client=urllib.request.build_opener())[0], 401)
        status, denied = self.request(f"/api/projects/{self.pid}/assets/unused", "DELETE", {})
        self.assertEqual(status, 403)
        self.assertIn("CSRF", denied["error"])
        with self.app.connect() as db:
            self.assertIsNotNone(db.execute("SELECT 1 FROM assets WHERE id=?", (asset,)).fetchone())


if __name__ == "__main__":
    unittest.main()
