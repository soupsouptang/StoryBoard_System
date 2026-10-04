"""Optional end-to-end import check for a user-provided workbook.

Set STORYBOARD_REAL_IMPORT_SAMPLE to an external .xlsx path. The source file
is read in place; all application data is written under a temporary root.
"""

import http.cookiejar
import importlib.util
import json
import os
from pathlib import Path
import sqlite3
import tempfile
import threading
import time
import unittest
import urllib.parse
import urllib.request


class RealImportOptInTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        sample = os.environ.get("STORYBOARD_REAL_IMPORT_SAMPLE", "")
        if not sample:
            raise unittest.SkipTest("set STORYBOARD_REAL_IMPORT_SAMPLE to opt in")
        cls.sample = Path(sample)
        if not cls.sample.is_file() or cls.sample.suffix.lower() != ".xlsx":
            raise unittest.SkipTest("opt-in XLSX sample is unavailable")
        cls.temp = tempfile.TemporaryDirectory(prefix="frameforge-real-import-")
        cls.old_env = {key: os.environ.get(key) for key in (
            "STORYBOARD_DATA_ROOT", "STORYBOARD_ADMIN_USER", "STORYBOARD_ADMIN_PASSWORD"
        )}
        os.environ["STORYBOARD_DATA_ROOT"] = cls.temp.name
        os.environ["STORYBOARD_ADMIN_USER"] = "qa-admin"
        os.environ["STORYBOARD_ADMIN_PASSWORD"] = "FrameForge2026!QA"
        path = Path(__file__).resolve().parents[1] / "server.py"
        spec = importlib.util.spec_from_file_location("storyboard_real_import", path)
        cls.app = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.app)
        cls.app.init_db()
        cls.httpd = cls.app.ThreadingHTTPServer(("127.0.0.1", 0), cls.app.AppHandler)
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.httpd.server_port}"
        cls.client = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
        )

    @classmethod
    def tearDownClass(cls):
        if hasattr(cls, "httpd"):
            cls.httpd.shutdown()
            cls.httpd.server_close()
        if hasattr(cls, "temp"):
            cls.temp.cleanup()
        for key, value in getattr(cls, "old_env", {}).items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value

    def request(self, path, method="GET", payload=None, csrf=None, content_type="application/json"):
        body = json.dumps(payload, ensure_ascii=False).encode() if isinstance(payload, (dict, list)) else payload
        headers = {"Content-Type": content_type}
        if csrf:
            headers["X-CSRF-Token"] = csrf
        request = urllib.request.Request(self.base + path, data=body, headers=headers, method=method)
        with self.client.open(request, timeout=300) as response:
            return response.status, json.loads(response.read())

    def test_preview_commit_and_reload(self):
        _, session = self.request("/api/login", "POST", {
            "username": "qa-admin", "password": "FrameForge2026!QA"
        })
        _, project = self.request("/api/projects", "POST", {"name": "External XLSX Import QA"}, csrf=session["csrf"])
        pid = project["project"]["id"]
        query = urllib.parse.urlencode({"filename": self.sample.name})

        started = time.monotonic()
        status, preview = self.request(
            f"/api/projects/{pid}/import-preview?{query}", "POST", self.sample.read_bytes(),
            session["csrf"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        preview_seconds = round(time.monotonic() - started, 2)
        self.assertEqual(status, 200)
        self.assertGreater(preview["total_rows"], 0)
        self.assertEqual(preview["total_rows"], sum(any(str(cell).strip() for cell in row) for row in preview["rows"]))
        self.assertTrue(preview["mapping"])
        self.assertEqual(preview["upload_size"], self.sample.stat().st_size)
        self.assertFalse(any("data" in image or "raw" in image for image in preview["embedded_images"]))

        started = time.monotonic()
        status, result = self.request(f"/api/projects/{pid}/import-commit", "POST", {
            "preview_id": preview["preview_id"], "mapping": preview["mapping"],
            "custom_columns": preview["custom_columns"], "mode": "replace"
        }, session["csrf"])
        commit_seconds = round(time.monotonic() - started, 2)
        self.assertEqual(status, 200)
        self.assertEqual(result["imported"], preview["total_rows"])
        self.assertEqual(result["after_count"], preview["total_rows"])
        self.assertEqual(result["images_imported"], preview["embedded_image_count"])
        self.assertEqual(len(result["bundle"]["shots"]), preview["total_rows"])

        status, reloaded = self.request(f"/api/projects/{pid}")
        self.assertEqual(status, 200)
        self.assertEqual(len(reloaded["shots"]), preview["total_rows"])
        self.assertEqual(
            [shot["id"] for shot in reloaded["shots"]],
            [shot["id"] for shot in result["bundle"]["shots"]]
        )
        selected = {int(info["col"]) for info in preview["mapping"].values()}
        selected.update(int(spec["source_col"]) for spec in preview["custom_columns"])
        self.assertEqual(selected, set(range(len(preview["headers"]))))
        nonempty_rows = [row for row in preview["rows"] if any(str(cell).strip() for cell in row)]
        for data_index, row in enumerate(nonempty_rows):
            raw_values = reloaded["shots"][data_index]["import_columns"]
            for column in selected:
                label = preview["headers"][column].strip()
                if not label or preview["headers"].count(label) != 1:
                    continue
                self.assertEqual(raw_values[label], str(row[column]).strip() if column < len(row) else "")
        self.assertEqual(len(list(self.app.IMPORT_ROOT.iterdir())), 0)
        with sqlite3.connect(self.app.DB_PATH) as db:
            stored = db.execute(
                "SELECT stored_name, size FROM assets WHERE project_id=? AND category='Storyboard'",
                (pid,)
            ).fetchall()
            attached_panels = db.execute(
                "SELECT COUNT(*) FROM panels p JOIN shots s ON s.id=p.shot_id "
                "WHERE s.project_id=? AND s.is_deleted=0 AND p.media_id IS NOT NULL",
                (pid,)
            ).fetchone()[0]
        self.assertEqual(len(stored), preview["embedded_image_count"])
        self.assertEqual(attached_panels, preview["embedded_image_count"])
        for stored_name, size in stored:
            self.assertEqual((self.app.MEDIA_ROOT / stored_name).stat().st_size, size)
        print(json.dumps({
            "sample_bytes": self.sample.stat().st_size,
            "header_row": preview["header_row"],
            "header_count": len(preview["headers"]),
            "mapping_fields": sorted(preview["mapping"]),
            "custom_columns": len(preview["custom_columns"]),
            "data_rows": preview["total_rows"],
            "preview_images": preview["embedded_image_count"],
            "unassigned_images": preview["unassigned_image_count"],
            "committed_images": result["images_imported"],
            "attached_image_panels": attached_panels,
            "preview_seconds": preview_seconds,
            "commit_seconds": commit_seconds,
        }, ensure_ascii=False))


if __name__ == "__main__":
    unittest.main()
