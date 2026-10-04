import http.cookiejar
import importlib.util
import json
import os
import tempfile
import threading
import urllib.request
import urllib.parse
from pathlib import Path
import unittest


class V62XlsxImportTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        candidates = [
            Path(r"C:\Users\Hatsune\Desktop\天津国际农产品交易中心_4分30秒_画面分镜图版_V4_80镜-2.xlsx"),
            Path(r"C:\Users\Hatsune\Desktop\天津国际农产品交易中心_80镜图片素材包_V1\天津国际农产品交易中心_4分30秒_画面分镜图版_V4_80镜.xlsx"),
        ]
        cls.xlsx_path = next((path for path in candidates if path.exists()), candidates[0])
        if not cls.xlsx_path.exists():
            raise unittest.SkipTest("attached V4 xlsx is not available")
        cls.temp = tempfile.TemporaryDirectory()
        cls.previous_env = {key: os.environ.get(key) for key in ("STORYBOARD_DATA_ROOT", "STORYBOARD_ADMIN_USER", "STORYBOARD_ADMIN_PASSWORD")}
        os.environ["STORYBOARD_DATA_ROOT"] = cls.temp.name
        os.environ["STORYBOARD_ADMIN_USER"] = "qa-admin"
        os.environ["STORYBOARD_ADMIN_PASSWORD"] = "FrameForge2026!QA"
        path = Path(__file__).resolve().parents[1] / "server.py"
        spec = importlib.util.spec_from_file_location("storyboard_v62_xlsx", path)
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
        if hasattr(cls, "httpd"):
            cls.httpd.shutdown()
            cls.httpd.server_close()
        if hasattr(cls, "temp"):
            cls.temp.cleanup()
        for key, value in getattr(cls, "previous_env", {}).items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value

    def request(self, path, method="GET", payload=None, content_type="application/json", csrf=None):
        headers = {"Content-Type": content_type}
        body = payload
        if isinstance(payload, (dict, list)):
            body = json.dumps(payload, ensure_ascii=False).encode()
        if csrf:
            headers["X-CSRF-Token"] = csrf
        req = urllib.request.Request(self.base + path, data=body, headers=headers, method=method)
        with self.client.open(req) as response:
            return response.status, json.loads(response.read())

    def test_attached_workbook_preserves_header_and_all_rows(self):
        status, session = self.request("/api/login", "POST", {"username": "qa-admin", "password": "FrameForge2026!QA"})
        self.assertEqual(status, 200)
        status, project = self.request("/api/projects", "POST", {"name": "V4 XLSX Import QA", "target_seconds": 362}, csrf=session["csrf"])
        pid = project["project"]["id"]
        initial_count = len(project["shots"])
        raw = self.xlsx_path.read_bytes()
        query = urllib.parse.urlencode({"filename": self.xlsx_path.name})
        status, preview = self.request(f"/api/projects/{pid}/import-preview?{query}", "POST", raw, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", session["csrf"])
        self.assertEqual(status, 200)
        self.assertEqual(preview["header_row"], 2)
        self.assertTrue(preview["preview_id"])
        self.assertGreater(len(preview["rows"]), 75)
        self.assertLess(len(json.dumps(preview, ensure_ascii=False).encode("utf-8")), 2 * 1024 * 1024)
        self.assertIn("panel_frame", preview["mapping"])
        self.assertGreater(preview["embedded_image_count"], 0)
        self.assertFalse(any("data" in image for image in preview["embedded_images"]))
        status, result = self.request(f"/api/projects/{pid}/import-commit", "POST", {"preview_id": preview["preview_id"], "mapping": preview["mapping"], "mode": "replace"}, csrf=session["csrf"])
        self.assertEqual(status, 200)
        self.assertTrue(result["replaced"])
        self.assertEqual(result["before_count"], initial_count)
        self.assertEqual(result["after_count"], result["imported"])
        self.assertEqual(result["imported"], sum(1 for row in preview["rows"] if any(str(cell).strip() for cell in row)))
        self.assertEqual(len(result["bundle"]["shots"]), result["imported"])
        self.assertEqual(result["images_imported"], preview["embedded_image_count"])
        self.assertFalse(any(cls_path.is_file() for cls_path in self.app.IMPORT_ROOT.iterdir()))
        first = result["bundle"]["shots"][0]
        self.assertEqual(first["chapter"], first["import_columns"]["篇章"])
        self.assertEqual(first["panel_frame"], first["import_columns"]["分镜图框"])
        self.assertEqual(first["scene"], first["import_columns"]["场景/地点"])
        self.assertEqual(first["voiceover"], first["import_columns"]["对应旁白"])


if __name__ == "__main__":
    unittest.main()
