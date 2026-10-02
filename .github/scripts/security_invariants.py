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
    if not re.search(r"AI_ENABLED:\s*bool\s*=\s*False", config_text):
        errors.append("AI must remain disabled by default")

    insecure = run_config(
        {"ENVIRONMENT": "production"},
        remove=("SECRET_KEY", "INITIAL_ADMIN_PASSWORD", "DATABASE_URL", "DATABASE_SYNC_URL"),
    )
    if insecure.returncode == 0:
        errors.append("production configuration did not fail closed with default/missing secrets")

    secure = run_config(
        {
            "ENVIRONMENT": "production",
            "SECRET_KEY": "ci-explicit-nondefault-secret-not-for-production-32",
            "DATABASE_URL": "postgresql+asyncpg://ci:ci@127.0.0.1/frameforge",
        }
    )
    if secure.returncode != 0:
        errors.append("production configuration rejected explicitly configured non-default secrets")
        print(secure.stderr, file=sys.stderr)

    main_text = (API / "main.py").read_text(encoding="utf-8")
    create_pos = main_text.find("Base.metadata.create_all")
    if create_pos >= 0:
        errors.append("API startup must not create schemas; Alembic owns schema changes")

    models_dir = API / "app/models"
    for path in models_dir.glob("*.py"):
        text = path.read_text(encoding="utf-8")
        if re.search(r"__tablename__\s*=\s*['\"][^'\"]*presence", text, re.IGNORECASE):
            errors.append(f"Presence must remain ephemeral; persistent presence table found in {path.relative_to(ROOT)}")

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
