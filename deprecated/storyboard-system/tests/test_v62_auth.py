import http.cookiejar
import importlib.util
import json
import os
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path


class V62AuthFlowTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.previous_env = {key: os.environ.get(key) for key in ("STORYBOARD_DATA_ROOT", "STORYBOARD_ADMIN_USER", "STORYBOARD_ADMIN_PASSWORD")}
        os.environ["STORYBOARD_DATA_ROOT"] = cls.temp.name
        os.environ["STORYBOARD_ADMIN_USER"] = "qa-admin"
        os.environ["STORYBOARD_ADMIN_PASSWORD"] = "FrameForge2026!QA"
        path = Path(__file__).resolve().parents[1] / "server.py"
        spec = importlib.util.spec_from_file_location("storyboard_v62_auth", path)
        cls.app = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.app)
        cls.app.init_db()
        cls.httpd = cls.app.ThreadingHTTPServer(("127.0.0.1", 0), cls.app.AppHandler)
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.httpd.server_port}"
        cls.jar = http.cookiejar.CookieJar()
        cls.client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cls.jar))

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

    def request(self, path, method="GET", payload=None, csrf=None):
        body = json.dumps(payload).encode() if payload is not None else None
        headers = {"Content-Type": "application/json"}
        if csrf:
            headers["X-CSRF-Token"] = csrf
        req = urllib.request.Request(self.base + path, data=body, headers=headers, method=method)
        try:
            with self.client.open(req) as response:
                return response.status, json.loads(response.read())
        except urllib.error.HTTPError as error:
            return error.code, json.loads(error.read())

    def test_registration_pending_approval_and_login(self):
        status, pending = self.request("/api/register", "POST", {
            "username": "new-editor", "display_name": "新编辑", "password": "EditorPass2026!"
        })
        self.assertEqual(status, 201)
        self.assertEqual(pending["status"], "PENDING")

        status, blocked = self.request("/api/login", "POST", {
            "username": "new-editor", "password": "EditorPass2026!"
        })
        self.assertEqual(status, 403)
        self.assertIn("等待管理员审批", blocked["error"])

        status, admin = self.request("/api/login", "POST", {
            "username": "qa-admin", "password": "FrameForge2026!QA"
        })
        self.assertEqual(status, 200)
        users_status, users = self.request("/api/admin/users")
        self.assertEqual(users_status, 200)
        new_user = next(item for item in users if item["username"] == "new-editor")
        status, result = self.request(f"/api/admin/users/{new_user['id']}/approve", "POST", {}, admin["csrf"])
        self.assertEqual(status, 200)
        self.assertEqual(result["status"], "ACTIVE")

        status, logged_in = self.request("/api/login", "POST", {
            "username": "new-editor", "password": "EditorPass2026!"
        })
        self.assertEqual(status, 200)
        self.assertEqual(logged_in["role"], "user")


if __name__ == "__main__":
    unittest.main()
