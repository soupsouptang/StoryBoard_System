"""Opt-in, isolated import probe for a local PDF supplied through the environment.

Prints only structural metadata. Never keeps the sample or imported data.
"""

import http.cookiejar
import importlib.util
import json
import os
import sys
import tempfile
import threading
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


def main():
    sample = Path(os.environ["FRAMEFORGE_SAMPLE_PDF"])
    if not sample.is_file() or sample.suffix.lower() != ".pdf":
        raise ValueError("FRAMEFORGE_SAMPLE_PDF must name an existing PDF")
    with tempfile.TemporaryDirectory(prefix="frameforge-pdf-import-") as data_root:
        os.environ["STORYBOARD_DATA_ROOT"] = data_root
        os.environ["STORYBOARD_ADMIN_USER"] = "pdf-qa-admin"
        os.environ["STORYBOARD_ADMIN_PASSWORD"] = "FrameForgePDF!QA2026"
        server_path = Path(__file__).resolve().parents[1] / "server.py"
        sys.path.insert(0, str(server_path.parent))
        spec = importlib.util.spec_from_file_location("storyboard_pdf_probe", server_path)
        app = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(app)
        app.init_db()
        httpd = app.ThreadingHTTPServer(("127.0.0.1", 0), app.AppHandler)
        thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        thread.start()
        base = f"http://127.0.0.1:{httpd.server_port}"
        client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

        def request(path, method="GET", payload=None, content_type="application/json", csrf=None):
            if isinstance(payload, (dict, list)):
                payload = json.dumps(payload, ensure_ascii=False).encode()
            headers = {"Content-Type": content_type}
            if csrf:
                headers["X-CSRF-Token"] = csrf
            req = urllib.request.Request(base + path, data=payload, headers=headers, method=method)
            try:
                with client.open(req) as response:
                    return response.status, response.headers.get("Content-Type", ""), response.read()
            except urllib.error.HTTPError as exc:
                return exc.code, exc.headers.get("Content-Type", ""), exc.read()

        try:
            status, _, raw = request("/api/login", "POST", {"username": "pdf-qa-admin", "password": "FrameForgePDF!QA2026"})
            assert status == 200, f"login HTTP {status}"
            session = json.loads(raw)
            status, _, raw = request("/api/projects", "POST", {"name": "PDF import isolated QA"}, csrf=session["csrf"])
            assert status == 201 or status == 200, f"create project HTTP {status}"
            project = json.loads(raw)
            pid = project["project"]["id"]
            initial_count = len(project["shots"])
            query = urllib.parse.urlencode({"filename": sample.name})
            status, _, raw = request(f"/api/projects/{pid}/import-preview?{query}", "POST", sample.read_bytes(), "application/pdf", session["csrf"])
            print("preview_http", status)
            if status != 200:
                print("preview_error_type", json.loads(raw).get("error", "unknown"))
                return
            preview = json.loads(raw)
            print("preview_header_row", preview["header_row"])
            print("preview_headers_count", len(preview["headers"]))
            print("preview_total_rows", preview["total_rows"])
            print("preview_mapping", sorted((key, value["col"]) for key, value in preview["mapping"].items()))
            print("preview_custom_columns_count", len(preview["custom_columns"]))
            print("preview_diagnostics_count", len(preview["diagnostics"]))
            print("preview_diagnostic_types", sorted({kind for entry in preview["diagnostics"] for kind in ("error" if entry["errors"] else "warning",)}))
            print("source_diagnostic_codes", [item.get("code") for item in preview.get("source_diagnostics", [])])
            print("preview_embedded_images", preview["embedded_image_count"])
            print("preview_unassigned_images", preview["unassigned_image_count"])
            print("preview_images_have_raw", any("raw" in item or "data" in item for item in preview["embedded_images"]))
            if preview["embedded_images"]:
                image_url = preview["embedded_images"][0]["preview_url"]
                image_status, image_type, image_body = request(image_url)
                print("first_preview_image_http", image_status)
                print("first_preview_image_type", image_type)
                print("first_preview_image_bytes", len(image_body))
            status, _, raw = request(f"/api/projects/{pid}/import-commit", "POST", {
                "preview_id": preview["preview_id"], "mapping": preview["mapping"], "mode": "replace",
            }, csrf=session["csrf"])
            print("commit_http", status)
            result = json.loads(raw)
            if status != 200:
                print("commit_error_type", result.get("error", "unknown"))
                return
            print("commit_imported", result.get("imported"))
            print("commit_images_imported", result.get("images_imported"))
            print("commit_before_after", result.get("before_count"), result.get("after_count"))
            print("commit_bundle_shots", len(result.get("bundle", {}).get("shots", [])))
            print("commit_numbered_shots", sum(bool(shot.get("number")) for shot in result.get("bundle", {}).get("shots", [])))
            print("commit_titled_shots", sum(bool(shot.get("title")) for shot in result.get("bundle", {}).get("shots", [])))
            print("staging_file_count_after_commit", sum(path.is_file() for path in app.IMPORT_ROOT.iterdir()))
            assert result["before_count"] == initial_count
            assert result["imported"] == preview["total_rows"]
            assert result["images_imported"] == preview["embedded_image_count"]
        finally:
            httpd.shutdown()
            httpd.server_close()
            thread.join(timeout=3)


if __name__ == "__main__":
    main()
