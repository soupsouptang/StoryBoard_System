"""End-to-end project PDF routes against a disposable server and database."""

import http.cookiejar
import io
import json
import os
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.error
import urllib.request
from pathlib import Path

from pypdf import PdfReader
from pypdf import PdfWriter
from project_pdf_roundtrip import extract_project_backup


class ProjectPdfApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="frameforge-project-pdf-api-")
        cls.root = Path(cls.temp.name)
        with __import__("socket").socket() as sock:
            sock.bind(("127.0.0.1", 0))
            cls.port = sock.getsockname()[1]
        cls.base = f"http://127.0.0.1:{cls.port}"
        env = dict(os.environ, PORT=str(cls.port), STORYBOARD_BIND="127.0.0.1",
                   STORYBOARD_DATA_ROOT=str(cls.root / "data"),
                   STORYBOARD_ADMIN_USER="pdf-admin", STORYBOARD_ADMIN_PASSWORD="FrameForgePDF2026!",
                   PYTHONDONTWRITEBYTECODE="1")
        cls.server = subprocess.Popen([sys.executable, "server.py"],
            cwd=Path(__file__).resolve().parents[1], env=env,
            stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        cls.client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        for _ in range(100):
            if cls.server.poll() is not None:
                raise AssertionError(f"server exited: {cls.server.stderr.read()[-2000:]!r}")
            try:
                with urllib.request.urlopen(cls.base + "/healthz", timeout=1):
                    break
            except (OSError, TimeoutError):
                time.sleep(0.1)
        else:
            raise AssertionError("server did not start")

    @classmethod
    def tearDownClass(cls):
        cls.server.terminate()
        cls.server.wait(timeout=5)
        cls.server.stderr.close()
        cls.temp.cleanup()

    def request(self, route, method="GET", body=None, csrf=None, mime="application/json"):
        if isinstance(body, dict):
            body = json.dumps(body).encode()
        headers = {"Content-Type": mime}
        if csrf:
            headers["X-CSRF-Token"] = csrf
        request = urllib.request.Request(self.base + route, body, headers, method=method)
        try:
            response = self.client.open(request, timeout=15)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            raw = response.read()
            return response.status, json.loads(raw) if "json" in response.headers.get("Content-Type", "") else raw

    def test_export_import_complete_project_and_reject_plain_pdf(self):
        status, session = self.request("/api/login", "POST", {"username": "pdf-admin", "password": "FrameForgePDF2026!"})
        self.assertEqual(status, 200)
        csrf = session["csrf"]
        status, source = self.request("/api/projects", "POST", {"name": "工程 PDF 合成验收", "fps": 25}, csrf)
        self.assertEqual(status, 201)
        source_id = source["project"]["id"]
        status, created = self.request(f"/api/projects/{source_id}/shots", "POST",
                                 {"title": "第一镜头", "description": "可检索画面"}, csrf)
        self.assertEqual(status, 201)
        shot_id = created["shots"][-1]["id"]
        media_bytes = b"\x89PNG\r\n\x1a\n" + b"project-pdf-synthetic-media"
        status, asset = self.request(f"/api/projects/{source_id}/media?shot_id={shot_id}&filename=fixture.png",
                                     "POST", media_bytes, csrf, "image/png")
        self.assertEqual(status, 201)
        status, pdf = self.request(f"/api/projects/{source_id}/export/project-pdf")
        self.assertEqual(status, 200)
        self.assertTrue(pdf.startswith(b"%PDF-"))
        reader = PdfReader(io.BytesIO(pdf))
        self.assertIn("第一镜头", "\n".join(page.extract_text() for page in reader.pages))
        backup = json.loads(extract_project_backup(pdf))
        self.assertEqual(backup["_backup"]["version"], 2)
        self.assertEqual(len(backup["_backup"]["tables"]["shots"]), len(source["shots"]) + 1)
        self.assertEqual(len(backup["_backup"]["tables"]["assets"]), 1)
        status, restored = self.request("/api/projects/import-project-pdf", "POST", pdf, csrf, "application/pdf")
        self.assertEqual(status, 201)
        self.assertNotEqual(restored["project"]["id"], source_id)
        self.assertEqual(len(restored["shots"]), len(backup["shots"]))
        self.assertEqual(len(restored["assets"]), 1)
        self.assertNotEqual(restored["assets"][0]["id"], asset["id"])
        self.assertEqual(self.request(f"/media/{restored['assets'][0]['id']}")[1], media_bytes)
        plain_writer = PdfWriter()
        plain_writer.add_blank_page(width=595, height=842)
        plain_stream = io.BytesIO()
        plain_writer.write(plain_stream)
        status, plain_pdf = self.request("/api/projects/import-project-pdf", "POST",
                                         plain_stream.getvalue(), csrf, "application/pdf")
        self.assertEqual(status, 400)
        self.assertIn("不是可完整导入", plain_pdf["error"])

        tampered_writer = PdfWriter(clone_from=reader)
        tampered_writer.add_metadata({"/FrameForgeBackupSHA256": "0" * 64})
        tampered_stream = io.BytesIO()
        tampered_writer.write(tampered_stream)
        status, error = self.request("/api/projects/import-project-pdf", "POST",
                                     tampered_stream.getvalue(), csrf, "application/pdf")
        self.assertEqual(status, 400)
        self.assertIn("哈希校验失败", error["error"])

        status, error = self.request("/api/projects/import-project-pdf", "POST", pdf, None, "application/pdf")
        self.assertEqual(status, 403)

        anonymous = urllib.request.build_opener()
        with self.assertRaises(urllib.error.HTTPError) as response:
            anonymous.open(self.base + f"/api/projects/{source_id}/export/project-pdf", timeout=5)
        self.assertIn(response.exception.code, (401, 403))
        with self.assertRaises(urllib.error.HTTPError) as response:
            anonymous.open(urllib.request.Request(self.base + "/api/projects/import-project-pdf",
                pdf, {"Content-Type": "application/pdf", "X-CSRF-Token": csrf}, method="POST"), timeout=5)
        self.assertIn(response.exception.code, (401, 403))

        try:
            import pypdfium2 as pdfium
            import zxingcpp
        except ImportError:
            return
        document = pdfium.PdfDocument(pdf)
        page = document[0]
        image = page.render(scale=4).to_pil()
        page.close()
        document.close()
        codes = zxingcpp.read_barcodes(image)
        self.assertEqual(len(codes), 1, "首面的二维码应能从实际渲染图像解码")
        manifest = json.loads(codes[0].text)
        self.assertEqual(manifest["n"], source["project"]["name"])
        self.assertEqual(manifest["s"], len(backup["shots"]))
        self.assertEqual(manifest["a"], len(backup["_backup"]["tables"]["assets"]))
        self.assertEqual(manifest["f"], 25)
        self.assertEqual(manifest["r"], backup["project"]["aspect_ratio"])
        self.assertRegex(manifest["t"], r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")
        self.assertEqual(manifest["h"], __import__("hashlib").sha256(extract_project_backup(pdf)).hexdigest())
        x_span = abs(codes[0].position.top_right.x - codes[0].position.top_left.x)
        self.assertGreaterEqual(x_span, 220)  # The symbol sits inside a 72 pt = 25.4 mm square.
        self.assertLessEqual(x_span, 290)


if __name__ == "__main__":
    unittest.main()
