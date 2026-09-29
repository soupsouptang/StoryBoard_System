#!/usr/bin/env python3
"""Verify FRAMEFORGE safety invariants without contacting external services."""

from __future__ import annotations

import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
API = ROOT / "apps" / "api"
EPHEMERAL_FIELD_NAMES = {
    "presence", "presence_state", "heartbeat", "last_seen",
    "cursor_x", "cursor_y", "cursor_visible", "active_viewport",
    "typing", "cell_lock", "edit_lock",
}


def run_config(extra: dict[str, str], remove: tuple[str, ...] = ()) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    for key in remove:
        env.pop(key, None)
    env.update(extra)
    env["PYTHONPATH"] = str(API)
    return subprocess.run(
        [sys.executable, "-c", "from app.core.config import settings; print(settings.ENVIRONMENT)"],
        cwd=API,
        env=env,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )


def main() -> int:
    errors: list[str] = []

    config_text = (API / "app/core/config.py").read_text(encoding="utf-8")
    if config_text.count("AI_ENABLED: bool = False") < 2:
        errors.append("AI must remain disabled by default in both configuration paths")

    insecure = run_config(
        {"ENVIRONMENT": "production"},
        remove=("SECRET_KEY", "INITIAL_ADMIN_PASSWORD"),
    )
    if insecure.returncode == 0:
        errors.append("production configuration did not fail closed with default/missing secrets")

    secure = run_config(
        {
            "ENVIRONMENT": "production",
            "SECRET_KEY": "ci-explicit-nondefault-secret-not-for-production",
            "INITIAL_ADMIN_PASSWORD": "ci-explicit-nondefault-admin-password",
        }
    )
    if secure.returncode != 0:
        errors.append("production configuration rejected explicitly configured non-default secrets")
        print(secure.stderr, file=sys.stderr)

    main_text = (API / "main.py").read_text(encoding="utf-8")
    guard_pos = main_text.find('if settings.ENVIRONMENT != "production":')
    create_pos = main_text.find("Base.metadata.create_all")
    if guard_pos < 0 or create_pos < 0 or create_pos < guard_pos:
        errors.append("Base.metadata.create_all is not visibly guarded from production startup")

    models_dir = API / "app/models"
    for path in models_dir.glob("*.py"):
        text = path.read_text(encoding="utf-8")
        if re.search(r"__tablename__\s*=\s*['\"][^'\"]*presence", text, re.IGNORECASE):
            errors.append(f"Presence must remain ephemeral; persistent presence table found in {path.relative_to(ROOT)}")
        for field in EPHEMERAL_FIELD_NAMES:
            pattern = rf"^\s*{re.escape(field)}\s*:\s*Mapped\["
            if re.search(pattern, text, re.MULTILINE):
                errors.append(
                    f"Presence must remain ephemeral; durable model field {field!r} found in {path.relative_to(ROOT)}"
                )

    tracked = subprocess.check_output(["git", "ls-files"], cwd=ROOT, text=True).splitlines()
    forbidden_names = {".env", ".env.production", "id_rsa", "id_ed25519"}
    for name in tracked:
        p = Path(name)
        if p.name in forbidden_names or p.suffix.lower() in {".pem", ".key", ".p12", ".pfx"}:
            errors.append(f"sensitive credential-like file must not be tracked: {name}")

    if errors:
        print("FRAMEFORGE security invariant guard FAILED:", file=sys.stderr)
        for error in errors:
            print(f" - {error}", file=sys.stderr)
        return 1

    print("PASS: fail-closed config, AI default-off, ephemeral Presence, and credential-file invariants")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
