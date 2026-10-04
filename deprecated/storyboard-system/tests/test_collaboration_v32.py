import json
import urllib.request
import urllib.parse
import http.cookiejar
import importlib.util
import os
import tempfile
import threading
import unittest
from pathlib import Path

class TestFrameforgeV32Collaboration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.previous_env = {
            key: os.environ.get(key)
            for key in ("STORYBOARD_DATA_ROOT", "STORYBOARD_ADMIN_USER", "STORYBOARD_ADMIN_PASSWORD")
        }
        os.environ["STORYBOARD_DATA_ROOT"] = cls.temp.name
        os.environ["STORYBOARD_ADMIN_USER"] = "qa-admin"
        os.environ["STORYBOARD_ADMIN_PASSWORD"] = "FrameForge2026!QA"
        server_path = Path(__file__).resolve().parents[1] / "server.py"
        spec = importlib.util.spec_from_file_location("storyboard_collaboration_server", server_path)
        cls.app = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.app)
        cls.app.init_db()
        cls.httpd = cls.app.ThreadingHTTPServer(("127.0.0.1", 0), cls.app.AppHandler)
        cls.server_thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.server_thread.start()
        cls.base_url = f"http://127.0.0.1:{cls.httpd.server_port}"

        # Create session cookie opener for admin
        cls.admin_cj = http.cookiejar.CookieJar()
        cls.admin_opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cls.admin_cj))
        
        # Login admin
        login_data = json.dumps({"username": "qa-admin", "password": "FrameForge2026!QA"}).encode('utf-8')
        req = urllib.request.Request(f"{cls.base_url}/api/login", data=login_data, headers={"Content-Type": "application/json"})
        resp = cls.admin_opener.open(req)
        cls.admin_session = json.loads(resp.read().decode('utf-8'))
        cls.admin_csrf = cls.admin_session["csrf"]

        # Create session cookie opener for user2
        cls.user2_cj = http.cookiejar.CookieJar()
        cls.user2_opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cls.user2_cj))
        login_data2 = json.dumps({"username": "director_lin", "password": "FrameForge2026!Admin"}).encode('utf-8')
        try:
            req2 = urllib.request.Request(f"{cls.base_url}/api/login", data=login_data2, headers={"Content-Type": "application/json"})
            resp2 = cls.user2_opener.open(req2)
            cls.user2_session = json.loads(resp2.read().decode('utf-8'))
            cls.user2_csrf = cls.user2_session["csrf"]
        except Exception:
            # If user2 not in DB, use admin session as mock
            cls.user2_session = cls.admin_session
            cls.user2_csrf = cls.admin_csrf
            cls.user2_opener = cls.admin_opener

        create_payload = json.dumps({"name": "Collaboration QA TVC", "production_type": "tvc", "fps": 25, "target_seconds": 30, "aspect_ratio": "16:9"}).encode("utf-8")
        create_req = urllib.request.Request(f"{cls.base_url}/api/projects", data=create_payload, headers={"Content-Type": "application/json", "X-CSRF-Token": cls.admin_csrf})
        create_resp = cls.admin_opener.open(create_req)
        cls.project_id = json.loads(create_resp.read().decode("utf-8"))["project"]["id"]

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

    def test_01_presence_heartbeat(self):
        # Admin sends heartbeat
        payload = json.dumps({
            "production_id": self.project_id,
            "workspace": "table",
            "shot_id": "shot-1",
            "field": "description",
            "cursor": {"x": 0.42, "y": 0.28, "visible": True}
        }).encode('utf-8')
        req = urllib.request.Request(
            f"{self.base_url}/api/v1/presence/heartbeat",
            data=payload,
            headers={"Content-Type": "application/json", "X-CSRF-Token": self.admin_csrf}
        )
        resp = self.admin_opener.open(req)
        data = json.loads(resp.read().decode('utf-8'))
        self.assertTrue(data.get("ok") or data.get("success"))
        self.assertGreaterEqual(len(data["presence"]), 1)
        current = next(item for item in data["presence"] if item["user_id"] == self.admin_session["user_id"])
        self.assertEqual(current["cursor_x"], 0.42)
        self.assertEqual(current["cursor_y"], 0.28)
        self.assertTrue(current["cursor_visible"])
        self.assertRegex(current["color"], r"^#[0-9A-F]{6}$")

        leave_payload = json.dumps({"production_id": self.project_id}).encode("utf-8")
        leave_req = urllib.request.Request(
            f"{self.base_url}/api/v1/presence/leave",
            data=leave_payload,
            headers={"Content-Type": "application/json", "X-CSRF-Token": self.admin_csrf}
        )
        leave_data = json.loads(self.admin_opener.open(leave_req).read().decode("utf-8"))
        self.assertTrue(leave_data["removed"])
        self.assertEqual(self.app.collab_mgr.get_presence(self.project_id), [])

    def test_02_edit_reservation_soft_lock(self):
        # Acquire soft lock
        payload = json.dumps({
            "shot_id": "shot-001",
            "field": "description",
            "action": "acquire"
        }).encode('utf-8')
        req = urllib.request.Request(
            f"{self.base_url}/api/v1/edit-reservations",
            data=payload,
            headers={"Content-Type": "application/json", "X-CSRF-Token": self.admin_csrf}
        )
        resp = self.admin_opener.open(req)
        data = json.loads(resp.read().decode('utf-8'))
        self.assertTrue(data.get("success") or data.get("ok"))

        # Release soft lock
        payload_rel = json.dumps({
            "shot_id": "shot-001",
            "field": "description",
            "action": "release"
        }).encode('utf-8')
        req_rel = urllib.request.Request(
            f"{self.base_url}/api/v1/edit-reservations",
            data=payload_rel,
            headers={"Content-Type": "application/json", "X-CSRF-Token": self.admin_csrf}
        )
        resp_rel = self.admin_opener.open(req_rel)
        data_rel = json.loads(resp_rel.read().decode('utf-8'))
        self.assertTrue(data_rel.get("released") or data_rel.get("ok"))

    def test_03_custom_fields_crud(self):
        # Create custom field
        payload = json.dumps({
            "key": "client_approved_status",
            "label": "甲方审阅结论",
            "field_type": "select",
            "group_name": "Production"
        }).encode('utf-8')
        req = urllib.request.Request(
            f"{self.base_url}/api/projects/{self.project_id}/custom-fields",
            data=payload,
            headers={"Content-Type": "application/json", "X-CSRF-Token": self.admin_csrf}
        )
        resp = self.admin_opener.open(req)
        field = json.loads(resp.read().decode('utf-8'))
        self.assertEqual(field["key"], "client_approved_status")

        # Get custom fields
        req_get = urllib.request.Request(f"{self.base_url}/api/projects/{self.project_id}/custom-fields")
        resp_get = self.admin_opener.open(req_get)
        fields = json.loads(resp_get.read().decode('utf-8'))
        self.assertTrue(any(f["key"] == "client_approved_status" for f in fields))

    def test_04_saved_views_crud(self):
        # Create saved view
        payload = json.dumps({
            "name": "摄影跟组专属视图",
            "view_type": "table",
            "is_shared": True,
            "config": {"columns": ["presence", "number", "thumb", "lens", "movement"], "density": "compact"}
        }).encode('utf-8')
        req = urllib.request.Request(
            f"{self.base_url}/api/projects/{self.project_id}/saved-views",
            data=payload,
            headers={"Content-Type": "application/json", "X-CSRF-Token": self.admin_csrf}
        )
        resp = self.admin_opener.open(req)
        view = json.loads(resp.read().decode('utf-8'))
        self.assertEqual(view["name"], "摄影跟组专属视图")

        # List saved views
        req_get = urllib.request.Request(f"{self.base_url}/api/projects/{self.project_id}/saved-views")
        resp_get = self.admin_opener.open(req_get)
        views = json.loads(resp_get.read().decode('utf-8'))
        self.assertTrue(any(v["name"] == "摄影跟组专属视图" for v in views))

    def test_05_field_aware_concurrency_and_conflict_resolution(self):
        # Fetch fresh project bundle
        req = urllib.request.Request(f"{self.base_url}/api/projects/{self.project_id}")
        resp = self.admin_opener.open(req)
        bundle = json.loads(resp.read().decode('utf-8'))
        target_shot = bundle["shots"][0]
        shot_id = target_shot["id"]
        base_rev = target_shot.get("revision", 1)

        # 1. Edit non-overlapping field (description) by Client A
        edit_a = {**target_shot, "description": "Client A updated description at " + str(base_rev), "base_revision": base_rev, "changed_fields": ["description"]}
        payload_a = json.dumps({"shots": [edit_a]}).encode('utf-8')
        req_a = urllib.request.Request(
            f"{self.base_url}/api/projects/{self.project_id}/shots",
            data=payload_a,
            headers={"Content-Type": "application/json", "X-CSRF-Token": self.admin_csrf}
        )
        req_a.get_method = lambda: 'PUT'
        resp_a = self.admin_opener.open(req_a)
        bundle_after_a = json.loads(resp_a.read().decode('utf-8'))
        shot_after_a = next(s for s in bundle_after_a["shots"] if s["id"] == shot_id)
        self.assertGreater(shot_after_a["revision"], base_rev)

        # 2. Client B modifies different field (voiceover) with stale base_revision -> auto merged!
        edit_b = {**target_shot, "voiceover": "Client B updated VO concurrently", "base_revision": base_rev, "changed_fields": ["voiceover"]}
        payload_b = json.dumps({"shots": [edit_b]}).encode('utf-8')
        req_b = urllib.request.Request(
            f"{self.base_url}/api/projects/{self.project_id}/shots",
            data=payload_b,
            headers={"Content-Type": "application/json", "X-CSRF-Token": self.admin_csrf}
        )
        req_b.get_method = lambda: 'PUT'
        resp_b = self.admin_opener.open(req_b)
        bundle_after_b = json.loads(resp_b.read().decode('utf-8'))
        shot_after_b = next(s for s in bundle_after_b["shots"] if s["id"] == shot_id)
        # Both description from A and voiceover from B must be preserved!
        self.assertIn("Client A updated", shot_after_b["description"])
        self.assertEqual(shot_after_b["voiceover"], "Client B updated VO concurrently")

        # 3. Client C modifies overlapping field (description) with stale base_revision -> HTTP 409 Conflict!
        edit_c = {**target_shot, "description": "Client C conflicting description", "base_revision": base_rev, "changed_fields": ["description"]}
        payload_c = json.dumps({"shots": [edit_c]}).encode('utf-8')
        req_c = urllib.request.Request(
            f"{self.base_url}/api/projects/{self.project_id}/shots",
            data=payload_c,
            headers={"Content-Type": "application/json", "X-CSRF-Token": self.admin_csrf}
        )
        req_c.get_method = lambda: 'PUT'
        try:
            self.admin_opener.open(req_c)
            self.fail("Expected HTTP 409 Conflict")
        except urllib.error.HTTPError as e:
            self.assertEqual(e.code, 409)
            err_data = json.loads(e.read().decode('utf-8'))
            self.assertEqual(err_data["conflict"], True)
            self.assertIn("description", err_data["conflicting_fields"])
            self.assertIn("server_version", err_data)

if __name__ == "__main__":
    unittest.main()
