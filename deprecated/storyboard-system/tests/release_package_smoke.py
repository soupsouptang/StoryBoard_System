"""Start an extracted release with disposable data before a live deployment."""

import os
import http.cookiejar
import json
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request
import zipfile
from pathlib import Path


def free_port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def main(package):
    with tempfile.TemporaryDirectory(prefix="frameforge-release-smoke-") as directory:
        root = Path(directory)
        with zipfile.ZipFile(package) as archive:
            names = set(archive.namelist())
            required = {"server.py", "project_pdf_roundtrip.py", "requirements.txt", "asset_cleanup.py", "narration_timing.py", "delivery_exports.py", "shot_updates.py", "shot_bulk_updates.py", "import_parsing.py", "import_staging.py", "schema_migrations.py",
                        "field_lifecycle.py", "creative_boards.py",
                        "static/index.html", "static/storyboard-landscape-export.js",
                        "static/storyboard-word-export.js", "static/storyboard-document-media.js",
                        "static/storyboard-pdf-export.js",
                        "static/workspace-v73.js", "static/workspace-v73.css"}
            assert required <= names, f"release is missing {sorted(required - names)}"
            assert b"reportlab==" in archive.read("requirements.txt"), "release lacks PDF renderer dependency"
            deploy_script = archive.read("scripts/deploy.sh")
            assert b'--target "$APP/vendor" -r "$APP/requirements.txt"' in deploy_script
            assert b'import reportlab, pypdf, typing_extensions' in deploy_script
            assert not any(name.startswith("data/") for name in names), "release includes private data"
            assert not any(name.startswith(("tests/", "qa-artifacts/", "scratch/", "deployments/"))
                           for name in names), "release includes development artifacts"
            assert not any(Path(name).suffix.lower() in {".xls", ".xlsx", ".csv", ".tsv"}
                           for name in names), "release includes a spreadsheet or test table"
            archive.extractall(root)
        port = free_port()
        env = dict(os.environ, PORT=str(port), STORYBOARD_BIND="127.0.0.1",
                   STORYBOARD_DATA_ROOT=str(root / "disposable-data"),
                   STORYBOARD_ADMIN_USER="release-pdf-admin",
                   STORYBOARD_ADMIN_PASSWORD="FrameForgeReleasePDF2026!",
                   PYTHONDONTWRITEBYTECODE="1")
        process = subprocess.Popen([sys.executable, "server.py"], cwd=root,
                                   env=env, stdout=subprocess.DEVNULL,
                                   stderr=subprocess.PIPE, text=True)
        try:
            for _ in range(60):
                if process.poll() is not None:
                    raise AssertionError(f"release server exited: {process.stderr.read()[-2000:]}")
                try:
                    with urllib.request.urlopen(f"http://127.0.0.1:{port}/healthz", timeout=1) as response:
                        assert response.status == 200
                    break
                except (OSError, TimeoutError):
                    time.sleep(0.1)
            else:
                raise AssertionError("release server did not become healthy")
            for asset in ("/", "/workspace-v73.js", "/storyboard-landscape-export.js", "/storyboard-word-export.js", "/storyboard-document-media.js", "/storyboard-pdf-export.js"):
                with urllib.request.urlopen(f"http://127.0.0.1:{port}{asset}", timeout=3) as response:
                    assert response.status == 200, asset
            client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
            login = urllib.request.Request(f"http://127.0.0.1:{port}/api/login",
                json.dumps({"username": "release-pdf-admin", "password": "FrameForgeReleasePDF2026!"}).encode(),
                {"Content-Type": "application/json"}, method="POST")
            # The release starts with a disposable administrator supplied below.
            with client.open(login, timeout=5) as response:
                csrf = json.load(response)["csrf"]
            create = urllib.request.Request(f"http://127.0.0.1:{port}/api/projects",
                json.dumps({"name": "Release PDF smoke", "fps": 25}).encode(),
                {"Content-Type": "application/json", "X-CSRF-Token": csrf}, method="POST")
            with client.open(create, timeout=5) as response:
                pid = json.load(response)["project"]["id"]
            with client.open(f"http://127.0.0.1:{port}/api/projects/{pid}/export/project-pdf", timeout=15) as response:
                assert response.headers.get("Content-Type") == "application/pdf"
                pdf = response.read()
            assert pdf.startswith(b"%PDF-")
            restore = urllib.request.Request(f"http://127.0.0.1:{port}/api/projects/import-project-pdf",
                pdf, {"Content-Type": "application/pdf", "X-CSRF-Token": csrf}, method="POST")
            with client.open(restore, timeout=15) as response:
                imported = json.load(response)
                assert response.status == 201 and imported["project"]["id"] != pid
            print(f"PASS release package smoke: {Path(package).name}, isolated HTTP PDF roundtrip and assets")
        finally:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)
            process.stderr.close()


if __name__ == "__main__":
    main(sys.argv[1])
