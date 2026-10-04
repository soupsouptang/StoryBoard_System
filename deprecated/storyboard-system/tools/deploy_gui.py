#!/usr/bin/env python3
"""
FRAMEFORGE Unified Release & Deployment Platform (tools/deploy_gui.py)

Dual-mode tool:
  1. GUI Mode (Default when launched interactively): Tkinter-based desktop deployment controller.
  2. CLI / Agent Mode: Headless automation for CI/CD, scripting, and Codex/Agent execution.

Usage:
  python tools/deploy_gui.py                        # Launches GUI
  python tools/deploy_gui.py --auto                 # Headless build & self-verification
  python tools/deploy_gui.py --build-only           # Build release package zip
  python tools/deploy_gui.py --dry-run              # Dry run deployment verification
  python tools/deploy_gui.py --deploy               # Execute remote deploy via SSH/SCP
  python tools/deploy_gui.py --rollback             # Trigger remote rollback
  python tools/deploy_gui.py --health-only          # Query remote health status
"""

import argparse
import datetime
import hashlib
import json
import os
import py_compile
import re
import shutil
import subprocess
import sys
import threading
import time
import urllib.request
import zipfile
from pathlib import Path

VERSION = "4.7.0"
DEFAULT_PROFILE = "Local Test"
PROFILES = {
    "TrueNAS storyboard": {
        "host": "192.168.13.5",
        "port": 22,
        "user": "admin",
        "remote_app": "/mnt/Media2/Apps/storyboard/app",
        "service": "storyboard",
        "health_url": "http://127.0.0.1:18765/healthz",
        "app_port": 18765,
    },
    "Local Test": {
        "host": "127.0.0.1",
        "port": 22,
        "user": "local",
        "remote_app": "./dist/local_stage",
        "service": "none",
        "health_url": "http://127.0.0.1:8080/api/healthz",
        "app_port": 8080,
    }
}

def get_repo_root() -> Path:
    """Find the storyboard-system repository root."""
    current = Path(__file__).resolve().parent
    for candidate in [current.parent, current]:
        if (candidate / "server.py").is_file() and (candidate / "static").is_dir():
            return candidate
    return current.parent

def compute_sha256(filepath: Path) -> str:
    """Compute SHA256 hex digest of a file."""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def get_git_info(repo_root: Path) -> dict:
    """Collect git commit, branch, and status."""
    info = {"commit": "unknown", "branch": "unknown", "dirty": False}
    try:
        res = subprocess.run(["git", "rev-parse", "HEAD"], cwd=repo_root, capture_output=True, text=True, check=True)
        info["commit"] = res.stdout.strip()
    except Exception:
        pass
    try:
        res = subprocess.run(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=repo_root, capture_output=True, text=True, check=True)
        info["branch"] = res.stdout.strip()
    except Exception:
        pass
    try:
        res = subprocess.run(["git", "status", "--porcelain"], cwd=repo_root, capture_output=True, text=True, check=True)
        info["dirty"] = bool(res.stdout.strip())
    except Exception:
        pass
    return info

class DeploySession:
    def __init__(self, repo_root: Path, profile: dict, log_callback=None):
        self.repo_root = repo_root
        self.profile = profile
        self.log_callback = log_callback or (lambda msg: print(msg, flush=True))
        self.timestamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
        self.log_dir = repo_root / "deployments" / self.timestamp
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self.log_file = self.log_dir / "deploy.log"
        self.archive_path = None
        self.manifest = None

    def log(self, message: str):
        stamped = f"[{datetime.datetime.now().strftime('%H:%M:%S')}] {message}"
        self.log_callback(stamped)
        try:
            with open(self.log_file, "a", encoding="utf-8") as f:
                f.write(stamped + "\n")
        except Exception:
            pass

    def preflight_check(self) -> bool:
        """Syntax and structure pre-flight verification."""
        self.log("==> Phase 1: Pre-flight Syntax & Integrity Check")
        core_files = [
            "server.py", "creative_boards.py", "text_format.py",
            "asset_cleanup.py", "narration_timing.py", "field_lifecycle.py",
            "delivery_exports.py", "shot_updates.py", "shot_bulk_updates.py", "import_parsing.py", "import_staging.py",
            "schema_migrations.py", "shot_versions.py", "persistence_helpers.py", "runtime_clock.py",
            "project_pdf_roundtrip.py",
        ]
        for cf in core_files:
            target = self.repo_root / cf
            if not target.is_file():
                self.log(f"[-] Missing core file: {cf}")
                return False
            try:
                py_compile.compile(str(target), doraise=True)
                self.log(f"[+] Syntax valid: {cf}")
            except Exception as e:
                self.log(f"[-] Syntax error in {cf}: {e}")
                return False

        static_dir = self.repo_root / "static"
        if not static_dir.is_dir():
            self.log("[-] Missing static directory")
            return False

        for req in ["index.html", "app.js", "styles.css", "workspace-v73.js", "workspace-v73.css", "creative-board-navigation.js", "creative-boards.js"]:
            if not (static_dir / req).is_file():
                self.log(f"[-] Missing critical static asset: static/{req}")
                return False
            self.log(f"[+] Static asset verified: static/{req}")

        # Real Excel import is a runtime feature, but fixture spreadsheets and
        # credentials must never become publicly served static files.
        forbidden_suffixes = {".xls", ".xlsx", ".csv", ".tsv", ".pem", ".key", ".p12", ".pfx"}
        forbidden_name = re.compile(r"(^\.env(?:\.|$)|askpass|credential|secret|password|private[_-]?key)", re.I)
        rejected = [
            path.relative_to(static_dir).as_posix()
            for path in static_dir.rglob("*") if path.is_file()
            and (path.suffix.lower() in forbidden_suffixes or forbidden_name.search(path.name))
        ]
        if rejected:
            for name in sorted(rejected):
                self.log(f"[-] Unreviewed data or credential file under public static/: {name}")
            return False

        # Check every root-relative resource referenced by the served HTML and
        # CSS, including fonts and nested vendor bundles. The release copier
        # mirrors static/ wholesale, so a missing source asset would otherwise
        # produce a valid-looking but incomplete archive.
        referenced_assets = set()
        for html_ref in re.findall(r'''(?:src|href)=["'](/[^"'#?]+)''', (static_dir / "index.html").read_text(encoding="utf-8")):
            referenced_assets.add(html_ref.lstrip("/"))
        for css_path in static_dir.rglob("*.css"):
            try:
                css_text = css_path.read_text(encoding="utf-8")
            except (OSError, UnicodeError):
                continue
            for css_ref in re.findall(r'''url\(["']?(/[^"')?#]+)''', css_text):
                referenced_assets.add(css_ref.lstrip("/"))
        missing_assets = sorted(ref for ref in referenced_assets if not (static_dir / ref).is_file())
        if missing_assets:
            for ref in missing_assets:
                self.log(f"[-] Missing referenced static asset: static/{ref}")
            return False

        # These outputs are generated by `npm run build`; packaging stale
        # bundles can silently omit source changes even when all files exist.
        generated_pairs = [
            (self.repo_root / "src/workspace/index.tsx", static_dir / "workspace-v73.js"),
            (self.repo_root / "src/workspace/theme.css", static_dir / "workspace-v73.css"),
            (self.repo_root / "src/material-web.js", static_dir / "vendor/material-web.js"),
            (self.repo_root / "src/three-bundle.js", static_dir / "vendor/three-bundle.js"),
        ]
        stale_outputs = [
            (source, output) for source, output in generated_pairs
            if source.is_file() and output.is_file() and source.stat().st_mtime > output.stat().st_mtime
        ]
        if stale_outputs:
            for source, output in stale_outputs:
                self.log(f"[-] Generated asset is older than its source: {output.relative_to(self.repo_root)} < {source.relative_to(self.repo_root)}")
            self.log("[-] Run `npm run build`, review the generated diff, then rerun preflight.")
            return False

        self.log("[+] Pre-flight validation completely PASSED")
        return True

    def build_release_package(self, output_dir: Path = None) -> Path:
        """Create canonical release zip: frameforge-release-YYYYMMDD-HHMM-<gitsha>.zip"""
        self.log("==> Phase 2: Building Canonical Release Package")
        git_info = get_git_info(self.repo_root)
        short_sha = git_info["commit"][:8] if git_info["commit"] != "unknown" else "local"
        pkg_time = datetime.datetime.now().strftime("%Y%m%d-%H%M")
        pkg_name = f"frameforge-release-{pkg_time}-{short_sha}.zip"

        out_folder = output_dir or (self.repo_root / "dist" / "releases")
        out_folder.mkdir(parents=True, exist_ok=True)
        archive_dest = out_folder / pkg_name

        stage_dir = self.log_dir / "stage"
        if stage_dir.exists():
            shutil.rmtree(stage_dir)
        stage_dir.mkdir(parents=True, exist_ok=True)

        # 1. Copy core backend files
        for f in ["server.py", "creative_boards.py", "text_format.py",
                  "asset_cleanup.py", "narration_timing.py", "field_lifecycle.py",
                  "delivery_exports.py", "shot_updates.py", "shot_bulk_updates.py", "import_parsing.py", "import_staging.py",
                  "schema_migrations.py", "shot_versions.py", "persistence_helpers.py", "runtime_clock.py",
                  "project_pdf_roundtrip.py",
                  "requirements.txt"]:
            src = self.repo_root / f
            if src.is_file():
                shutil.copy2(src, stage_dir / f)

        vendor_dir = self.repo_root / "vendor"
        if vendor_dir.is_dir():
            shutil.copytree(vendor_dir, stage_dir / "vendor",
                            ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))

        # 2. Copy static files (excluding scratch / dev artifacts)
        dest_static = stage_dir / "static"
        shutil.copytree(
            self.repo_root / "static", dest_static,
            ignore=shutil.ignore_patterns("*.tmp", "*.log", ".git*", "__pycache__", "*.pyc", "*.pyo", "GEOMETRY_TEST.txt", "README.txt"),
        )

        # 3. Add deploy helper scripts
        scripts_dir = stage_dir / "scripts"
        scripts_dir.mkdir(parents=True, exist_ok=True)

        # Linux deploy.sh
        deploy_sh = f"""#!/usr/bin/env bash
set -Eeuo pipefail
APP="{self.profile.get('remote_app', '/mnt/Media2/Apps/storyboard/app')}"
SERVICE="{self.profile.get('service', 'storyboard')}"
HEALTH_URL="{self.profile.get('health_url', 'http://127.0.0.1:18765/healthz')}"

echo "[DEPLOY] Starting atomic deployment to $APP..."
test -d "$APP" || mkdir -p "$APP"
STAMP=$(date +%Y%m%d_%H%M%S)
BACKUP="$APP.backup-$STAMP"

if [ -f "$APP/server.py" ]; then
    echo "[DEPLOY] Creating backup at $BACKUP..."
    cp -r "$APP" "$BACKUP"
fi

rollback() {{
    local code=$?
    if [ $code -ne 0 ] && [ -d "$BACKUP" ]; then
        echo "[DEPLOY] Deployment failed (code $code)! Rolling back..." >&2
        rm -rf "$APP"
        mv "$BACKUP" "$APP"
        if [ "$SERVICE" != "none" ]; then
            systemctl restart "$SERVICE" || true
        fi
        echo "[DEPLOY] Rollback completed." >&2
    fi
    exit $code
}}
trap rollback EXIT

echo "[DEPLOY] Syncing files to application directory..."
cp -r ./* "$APP/"

# The checked-in service runs /usr/bin/python3. Install only into this
# backed-up application's vendor directory, never into system site-packages.
if [ "$SERVICE" != "none" ]; then
    SERVICE_EXEC=$(systemctl show "$SERVICE" --property=ExecStart --value)
    if [[ "$SERVICE_EXEC" != *"/usr/bin/python3 $APP/server.py"* ]]; then
        echo "[DEPLOY] Service Python differs from expected /usr/bin/python3; dependencies were not installed." >&2
        exit 1
    fi
fi
echo "[DEPLOY] Installing Python dependencies into $APP/vendor..."
if ! /usr/bin/python3 -m pip install --disable-pip-version-check --no-input --upgrade \\
    --target "$APP/vendor" -r "$APP/requirements.txt"; then
    echo "[DEPLOY] Python dependency install failed; check package network access and pip availability." >&2
    exit 1
fi
if ! PYTHONPATH="$APP/vendor${{PYTHONPATH:+:$PYTHONPATH}}" /usr/bin/python3 -c \\
    'import reportlab, pypdf, typing_extensions'; then
    echo "[DEPLOY] Python dependency import preflight failed." >&2
    exit 1
fi

if [ "$SERVICE" != "none" ]; then
    echo "[DEPLOY] Restarting systemd service: $SERVICE..."
    systemctl restart "$SERVICE"
fi

echo "[DEPLOY] Waiting for health check: $HEALTH_URL..."
for i in $(seq 1 15); do
    if curl -fsS --max-time 3 "$HEALTH_URL" >/dev/null 2>&1; then
        echo "[DEPLOY] Health check passed!"
        trap - EXIT
        echo "[DEPLOY] Success! Backup preserved at $BACKUP"
        exit 0
    fi
    sleep 1
done

echo "[DEPLOY] Health check timed out after 15s!" >&2
exit 1
"""
        with open(scripts_dir / "deploy.sh", "w", encoding="utf-8", newline="\n") as f:
            f.write(deploy_sh)

        # Linux rollback.sh
        rollback_sh = f"""#!/usr/bin/env bash
set -Eeuo pipefail
APP="{self.profile.get('remote_app', '/mnt/Media2/Apps/storyboard/app')}"
SERVICE="{self.profile.get('service', 'storyboard')}"
LATEST_BACKUP=$(ls -d "$APP".backup-* 2>/dev/null | sort -r | head -n 1)
if [ -z "$LATEST_BACKUP" ] || [ ! -d "$LATEST_BACKUP" ]; then
    echo "[-] No backup found to restore." >&2
    exit 1
fi
echo "[ROLLBACK] Restoring from $LATEST_BACKUP..."
rm -rf "$APP"
mv "$LATEST_BACKUP" "$APP"
if [ "$SERVICE" != "none" ]; then
    systemctl restart "$SERVICE"
fi
echo "[ROLLBACK] Restore complete."
"""
        with open(scripts_dir / "rollback.sh", "w", encoding="utf-8", newline="\n") as f:
            f.write(rollback_sh)

        # Linux healthcheck.sh
        healthcheck_sh = f"""#!/usr/bin/env bash
HEALTH_URL="{self.profile.get('health_url', 'http://127.0.0.1:18765/healthz')}"
curl -fsS --max-time 5 "$HEALTH_URL" && echo " [HEALTH OK]" || (echo " [HEALTH FAIL]"; exit 1)
"""
        with open(scripts_dir / "healthcheck.sh", "w", encoding="utf-8", newline="\n") as f:
            f.write(healthcheck_sh)

        # start.bat & start.sh
        with open(stage_dir / "start.bat", "w", encoding="utf-8") as f:
            f.write("@echo off\npython server.py\npause\n")
        with open(stage_dir / "start.sh", "w", encoding="utf-8", newline="\n") as f:
            f.write("#!/usr/bin/env bash\npython3 server.py\n")

        # 4. Generate SHA256SUMS and manifest.json
        file_hashes = {}
        sha256_lines = []
        for p in sorted(stage_dir.rglob("*")):
            if p.is_file():
                rel = p.relative_to(stage_dir).as_posix()
                h = compute_sha256(p)
                file_hashes[rel] = h
                sha256_lines.append(f"{h}  {rel}")

        with open(stage_dir / "SHA256SUMS", "w", encoding="utf-8", newline="\n") as f:
            f.write("\n".join(sha256_lines) + "\n")

        self.manifest = {
            "app": "FRAMEFORGE",
            "version": VERSION,
            "createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "git": git_info,
            "profile": {key: value for key, value in self.profile.items() if key not in ("password", "ssh_key")},
            "fileCount": len(file_hashes),
            "files": file_hashes,
            "deployment": {
                "service": self.profile.get("service", "storyboard"),
                "remoteApp": self.profile.get("remote_app"),
                "healthUrl": self.profile.get("health_url"),
            }
        }

        with open(stage_dir / "manifest.json", "w", encoding="utf-8") as f:
            json.dump(self.manifest, f, indent=2, ensure_ascii=False)

        with open(self.log_dir / "manifest.json", "w", encoding="utf-8") as f:
            json.dump(self.manifest, f, indent=2, ensure_ascii=False)

        # 5. Build ZIP archive
        self.log(f"[+] Assembling zip archive: {archive_dest.name}")
        with zipfile.ZipFile(archive_dest, "w", zipfile.ZIP_DEFLATED) as zf:
            for p in sorted(stage_dir.rglob("*")):
                if p.is_file():
                    zf.write(p, p.relative_to(stage_dir))

        pkg_sha = compute_sha256(archive_dest)
        pkg_size = archive_dest.stat().st_size
        self.archive_path = archive_dest

        self.log(f"[+] Package created: {archive_dest}")
        self.log(f"[+] Size: {pkg_size / (1024*1024):.2f} MB")
        self.log(f"[+] SHA256: {pkg_sha}")

        build_result = {
            "archive": str(archive_dest),
            "filename": archive_dest.name,
            "sizeBytes": pkg_size,
            "sha256": pkg_sha,
            "fileCount": len(file_hashes),
            "builtAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }
        with open(self.log_dir / "build.json", "w", encoding="utf-8") as f:
            json.dump(build_result, f, indent=2)

        return archive_dest

    def dry_run(self) -> bool:
        """Simulate deployment without modifying remote state."""
        self.log("==> Phase 3: Executing Deployment DRY RUN")
        if not self.preflight_check():
            return False
        pkg = self.build_release_package()
        self.log(f"[DRY RUN] Package ready: {pkg.name}")
        self.log(f"[DRY RUN] Target host: {self.profile.get('user')}@{self.profile.get('host')}:{self.profile.get('port')}")
        self.log(f"[DRY RUN] Remote app destination: {self.profile.get('remote_app')}")
        self.log(f"[DRY RUN] Systemd service to restart: {self.profile.get('service')}")
        self.log(f"[DRY RUN] Post-deploy health probe: {self.profile.get('health_url')}")
        self.log("[DRY RUN] Preflight verification complete. No remote modifications made.")
        
        result = {"status": "SUCCESS", "mode": "DRY_RUN", "package": str(pkg)}
        with open(self.log_dir / "result.json", "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2)
        return True

    def deploy_remote(self) -> bool:
        """Execute full remote deployment."""
        self.log("==> Phase 4: Executing Live Remote Deployment")
        if not self.preflight_check():
            return False

        pkg = self.build_release_package()
        host = self.profile.get("host")
        user = self.profile.get("user")
        port = self.profile.get("port", 22)
        ssh_key = self.profile.get("ssh_key")
        password = self.profile.get("password")
        remote_app = self.profile.get("remote_app")
        service = self.profile.get("service")
        health_url = self.profile.get("health_url")

        if host == "127.0.0.1":
            self.log("[LOCAL DEPLOY] Target is localhost.")
            dest = Path(remote_app)
            dest.mkdir(parents=True, exist_ok=True)
            with zipfile.ZipFile(pkg, 'r') as zf:
                zf.extractall(dest)
            self.log(f"[LOCAL DEPLOY] Extracted to {dest}")
            return True

        remote_tmp = f"/tmp/{pkg.name}"
        self.log(f"[+] Uploading {pkg.name} to {user}@{host}:{remote_tmp} via SCP...")
        
        env = os.environ.copy()
        if password:
            env["DEPLOY_PASSWORD"] = password
            askpass_bat = self.log_dir / "askpass.bat"
            with open(askpass_bat, "w") as f:
                f.write(f'@echo off\n"{sys.executable}" -c "import os; print(os.environ.get(\'DEPLOY_PASSWORD\', \'\'))"\n')
            env["SSH_ASKPASS"] = str(askpass_bat.absolute())
            env["SSH_ASKPASS_REQUIRE"] = "force"
            env["DISPLAY"] = "dummy:0"

        scp_cmd = ["scp", "-P", str(port), "-o", "StrictHostKeyChecking=no"]
        if ssh_key:
            scp_cmd.extend(["-i", os.path.expanduser(ssh_key)])
        elif password:
            scp_cmd.extend(["-o", "BatchMode=no"])
        else:
            scp_cmd.extend(["-o", "BatchMode=yes"])
            
        scp_cmd.extend([str(pkg), f"{user}@{host}:{remote_tmp}"])
        
        res = subprocess.run(scp_cmd, env=env, capture_output=True, text=True)
        if res.returncode != 0:
            self.log(f"[-] SCP upload failed: {res.stderr}")
            return False
        self.log("[+] Package upload successful.")

        remote_script = f"""
set -Eeuo pipefail
TMP_PKG="{remote_tmp}"
STAGE_DIR=$(mktemp -d /tmp/ff_deploy_XXXXXX)
unzip -q "$TMP_PKG" -d "$STAGE_DIR"
cd "$STAGE_DIR"
chmod +x scripts/*.sh
sudo ./scripts/deploy.sh
rm -rf "$STAGE_DIR" "$TMP_PKG"
"""
        self.log("[+] Running remote atomic deploy script via SSH...")
        ssh_cmd = ["ssh", "-p", str(port), "-o", "StrictHostKeyChecking=no"]
        if ssh_key:
            ssh_cmd.extend(["-i", os.path.expanduser(ssh_key)])
        elif password:
            ssh_cmd.extend(["-o", "BatchMode=no"])
        else:
            ssh_cmd.extend(["-o", "BatchMode=yes"])
            
        ssh_cmd.extend([f"{user}@{host}", "bash", "-s"])
        
        res = subprocess.run(ssh_cmd, env=env, input=remote_script, capture_output=True, text=True)
        self.log(f"[REMOTE OUTPUT]\n{res.stdout}")
        if res.returncode != 0:
            self.log(f"[-] Remote deployment failed with code {res.returncode}:\n{res.stderr}")
            return False

        self.log("[+] Remote deployment successfully verified and active.")
        result = {"status": "SUCCESS", "mode": "LIVE_DEPLOY", "package": str(pkg)}
        with open(self.log_dir / "result.json", "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2)
        return True

    def query_health(self) -> dict:
        """Query health status of target service."""
        url = self.profile.get("health_url")
        self.log(f"==> Probing Health URL: {url}")
        status = {"url": url, "ok": False, "status": None, "error": None}
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "FrameForgeDeploy/1.0"})
            with urllib.request.urlopen(req, timeout=5) as response:
                status["status"] = response.status
                status["ok"] = response.status == 200
                content = response.read().decode('utf-8', errors='ignore')
                status["response"] = content[:300]
                self.log(f"[+] Health OK: HTTP {response.status}")
        except Exception as e:
            status["error"] = str(e)
            self.log(f"[-] Health Probe Failed: {e}")
        
        with open(self.log_dir / "health.json", "w", encoding="utf-8") as f:
            json.dump(status, f, indent=2)
        return status

# ==============================================================================
#  Tkinter GUI Interface
# ==============================================================================
def run_gui(repo_root: Path):
    try:
        import tkinter as tk
        from tkinter import ttk, messagebox, filedialog, simpledialog
    except ImportError:
        print("[-] Tkinter is not available in this environment. Falling back to CLI mode.")
        run_cli(["--auto"])
        return

    root = tk.Tk()
    root.title(f"FRAMEFORGE Deploy & Release Studio — v{VERSION}")
    root.geometry("820x640")
    root.minsize(700, 520)

    style = ttk.Style(root)
    try:
        style.theme_use("clam")
    except Exception:
        pass

    header_frame = ttk.Frame(root, padding="12 10")
    header_frame.pack(fill=tk.X)

    title_label = ttk.Label(header_frame, text="FRAMEFORGE 统一部署与发布平台", font=("Segoe UI", 14, "bold"))
    title_label.pack(side=tk.LEFT)

    subtitle_label = ttk.Label(header_frame, text=f"v{VERSION} · Production Ready", font=("Segoe UI", 9))
    subtitle_label.pack(side=tk.RIGHT, padx=5)

    notebook = ttk.Notebook(root)
    notebook.pack(fill=tk.BOTH, expand=True, padx=12, pady=6)

    deploy_tab = ttk.Frame(notebook, padding="10")
    notebook.add(deploy_tab, text="部署控制台")

    config_frame = ttk.LabelFrame(deploy_tab, text="目标配置 (Profile)", padding="10")
    config_frame.pack(fill=tk.X, pady=4)

    profile_var = tk.StringVar(value=DEFAULT_PROFILE)
    host_var = tk.StringVar(value=PROFILES[DEFAULT_PROFILE]["host"])
    user_var = tk.StringVar(value=PROFILES[DEFAULT_PROFILE]["user"])
    remote_app_var = tk.StringVar(value=PROFILES[DEFAULT_PROFILE]["remote_app"])
    service_var = tk.StringVar(value=PROFILES[DEFAULT_PROFILE]["service"])
    health_url_var = tk.StringVar(value=PROFILES[DEFAULT_PROFILE]["health_url"])

    def on_profile_change(event=None):
        name = profile_var.get()
        if name in PROFILES:
            p = PROFILES[name]
            host_var.set(p["host"])
            user_var.set(p["user"])
            remote_app_var.set(p["remote_app"])
            service_var.set(p["service"])
            health_url_var.set(p["health_url"])

    ttk.Label(config_frame, text="配置文件:").grid(row=0, column=0, sticky=tk.W, pady=3)
    profile_combo = ttk.Combobox(config_frame, textvariable=profile_var, values=list(PROFILES.keys()), state="readonly", width=25)
    profile_combo.grid(row=0, column=1, sticky=tk.W, pady=3, padx=5)
    profile_combo.bind("<<ComboboxSelected>>", on_profile_change)

    ttk.Label(config_frame, text="主机 IP:").grid(row=1, column=0, sticky=tk.W, pady=3)
    ttk.Entry(config_frame, textvariable=host_var, width=28).grid(row=1, column=1, sticky=tk.W, pady=3, padx=5)

    ttk.Label(config_frame, text="SSH 用户:").grid(row=1, column=2, sticky=tk.W, pady=3)
    ttk.Entry(config_frame, textvariable=user_var, width=20).grid(row=1, column=3, sticky=tk.W, pady=3, padx=5)

    ttk.Label(config_frame, text="远端路径:").grid(row=2, column=0, sticky=tk.W, pady=3)
    ttk.Entry(config_frame, textvariable=remote_app_var, width=38).grid(row=2, column=1, columnspan=2, sticky=tk.W, pady=3, padx=5)

    ttk.Label(config_frame, text="Systemd 服务:").grid(row=2, column=2, sticky=tk.W, pady=3)
    ttk.Entry(config_frame, textvariable=service_var, width=20).grid(row=2, column=3, sticky=tk.W, pady=3, padx=5)

    ttk.Label(config_frame, text="健康探测 URL:").grid(row=3, column=0, sticky=tk.W, pady=3)
    ttk.Entry(config_frame, textvariable=health_url_var, width=38).grid(row=3, column=1, columnspan=2, sticky=tk.W, pady=3, padx=5)

    actions_frame = ttk.LabelFrame(deploy_tab, text="操作命令", padding="10")
    actions_frame.pack(fill=tk.X, pady=6)

    log_frame = ttk.LabelFrame(deploy_tab, text="执行日志", padding="6")
    log_frame.pack(fill=tk.BOTH, expand=True, pady=4)

    log_text = tk.Text(log_frame, wrap=tk.WORD, height=12, font=("Consolas", 9), bg="#181a1c", fg="#e0e0e0")
    log_scroll = ttk.Scrollbar(log_frame, orient=tk.VERTICAL, command=log_text.yview)
    log_text.configure(yscrollcommand=log_scroll.set)
    log_text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
    log_scroll.pack(side=tk.RIGHT, fill=tk.Y)

    status_var = tk.StringVar(value="就绪 (Ready)")
    status_bar = ttk.Label(root, textvariable=status_var, relief=tk.SUNKEN, anchor=tk.W, padding="6 3")
    status_bar.pack(side=tk.BOTTOM, fill=tk.X)

    def gui_log(msg: str):
        log_text.insert(tk.END, msg + "\n")
        log_text.see(tk.END)

    def get_current_profile():
        return {
            "host": host_var.get().strip(),
            "port": 22,
            "user": user_var.get().strip(),
            "remote_app": remote_app_var.get().strip(),
            "service": service_var.get().strip(),
            "health_url": health_url_var.get().strip(),
            "ssh_key": PROFILES.get(profile_var.get(), {}).get("ssh_key"),
        }

    def run_in_thread(target_fn, task_name, require_auth=False):
        def worker():
            profile = get_current_profile()
            
            if require_auth and profile["host"] != "127.0.0.1" and not profile.get("ssh_key"):
                # No SSH key configured, ask for password via GUI dialog before blocking
                pwd = simpledialog.askstring("SSH Password", f"Enter password for {profile['user']}@{profile['host']}:", show="*")
                if not pwd:
                    status_var.set("已取消部署 (Password required)")
                    return
                profile["password"] = pwd

            status_var.set(f"正在执行: {task_name}...")
            gui_log(f"\n--- [START] {task_name} ---")
            session = DeploySession(repo_root, profile, log_callback=gui_log)
            try:
                success = target_fn(session)
                if success:
                    status_var.set(f"{task_name} 完成 (SUCCESS)")
                    gui_log(f"--- [DONE] {task_name} Succeeded ---")
                else:
                    status_var.set(f"{task_name} 失败 (FAILED)")
                    gui_log(f"--- [ERROR] {task_name} Failed ---")
            except Exception as e:
                status_var.set(f"{task_name} 异常: {e}")
                gui_log(f"[-] Exception: {e}")
        threading.Thread(target=worker, daemon=True).start()

    ttk.Button(actions_frame, text="构建发布包 (Build ZIP)", command=lambda: run_in_thread(lambda s: bool(s.build_release_package()), "构建发布包")).pack(side=tk.LEFT, padx=4)
    ttk.Button(actions_frame, text="部署演练 (Dry Run)", command=lambda: run_in_thread(lambda s: s.dry_run(), "部署演练 (Dry Run)")).pack(side=tk.LEFT, padx=4)
    ttk.Button(actions_frame, text="健康探测 (Health Check)", command=lambda: run_in_thread(lambda s: s.query_health()["ok"], "健康探测")).pack(side=tk.LEFT, padx=4)
    ttk.Button(actions_frame, text="正式部署 (Deploy)", command=lambda: run_in_thread(lambda s: s.deploy_remote(), "正式部署", require_auth=True)).pack(side=tk.LEFT, padx=4)

    def open_releases():
        releases_dir = repo_root / "dist" / "releases"
        releases_dir.mkdir(parents=True, exist_ok=True)
        if sys.platform == "win32":
            os.startfile(str(releases_dir))
        elif sys.platform == "darwin":
            subprocess.run(["open", str(releases_dir)])
        else:
            subprocess.run(["xdg-open", str(releases_dir)])

    ttk.Button(actions_frame, text="打开发布目录", command=open_releases).pack(side=tk.RIGHT, padx=4)

    root.mainloop()

# ==============================================================================
#  CLI Automation Interface
# ==============================================================================
def run_cli(args_list=None):
    parser = argparse.ArgumentParser(description="FRAMEFORGE Release & Deployment Automation CLI")
    parser.add_argument("--auto", action="store_true", help="Automated end-to-end build and verify")
    parser.add_argument("--build-only", action="store_true", help="Build canonical release package only")
    parser.add_argument("--dry-run", action="store_true", help="Perform pre-flight and dry run verification")
    parser.add_argument("--deploy", action="store_true", help="Execute live remote deployment via SSH/SCP")
    parser.add_argument("--health-only", action="store_true", help="Probe target health endpoint")
    parser.add_argument("--host", help="Override remote host")
    parser.add_argument("--user", help="Override remote SSH user")
    parser.add_argument("--remote-app", help="Override remote application directory")
    parser.add_argument("--service", help="Override systemd service name")
    parser.add_argument("--health-url", help="Override health probe URL")
    parser.add_argument("--profile", default=DEFAULT_PROFILE, help="Profile name from PROFILES")
    parser.add_argument("--output-dir", help="Output directory for generated packages")

    args = parser.parse_args(args_list)
    repo_root = get_repo_root()

    profile = PROFILES.get(args.profile, PROFILES[DEFAULT_PROFILE]).copy()
    if args.host: profile["host"] = args.host
    if args.user: profile["user"] = args.user
    if args.remote_app: profile["remote_app"] = args.remote_app
    if args.service: profile["service"] = args.service
    if args.health_url: profile["health_url"] = args.health_url

    session = DeploySession(repo_root, profile)

    if args.build_only:
        out = Path(args.output_dir) if args.output_dir else None
        pkg = session.build_release_package(out)
        print(f"\n[CLI SUCCESS] Package ready at: {pkg}")
        sys.exit(0)

    if args.dry_run or args.auto:
        ok = session.dry_run()
        if ok:
            print(f"\n[CLI SUCCESS] Dry-run and verification passed.")
            sys.exit(0)
        else:
            print(f"\n[CLI FAILED] Preflight or dry-run failed.")
            sys.exit(1)

    if args.deploy:
        ok = session.deploy_remote()
        sys.exit(0 if ok else 1)

    if args.health_only:
        res = session.query_health()
        sys.exit(0 if res["ok"] else 1)

    run_gui(repo_root)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        run_cli()
    else:
        run_gui(get_repo_root())
