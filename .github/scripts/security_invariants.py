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


def check_ai_zero_egress(errors: list[str]) -> None:
    code = r'''
import asyncio
import sys

def audit(event, args):
    if event in {"socket.connect", "socket.getaddrinfo"}:
        raise RuntimeError("network egress attempted while AI is disabled/offline")

sys.addaudithook(audit)

from app.services.ai_provider import provider_registry
assert provider_registry.is_enabled is False
provider = provider_registry.get("mock-provider-offline")
assert provider is not None
asyncio.run(provider.execute_job("voice_alignment", {"text": "offline contract"}))
print("offline-ai-ok")
'''
    env = os.environ.copy()
    env["PYTHONPATH"] = str(API)
    result = subprocess.run(
        [sys.executable, "-c", code],
        cwd=API,
        env=env,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if result.returncode != 0:
        errors.append("AI offline/default-disabled execution attempted network access or lost its disabled contract")
        print(result.stdout, file=sys.stderr)
        print(result.stderr, file=sys.stderr)


def check_presence_not_persisted(errors: list[str]) -> None:
    forbidden = re.compile(
        r"\b(cursor_x|cursor_y|presence_state|heartbeat|last_heartbeat|focused_field|"
        r"selected_shot_id|cell_lock|presence_session)\b",
        re.IGNORECASE,
    )
    for path in (API / "app/models").glob("*.py"):
        text = path.read_text(encoding="utf-8")
        if re.search(r"__tablename__\s*=\s*['\"][^'\"]*presence", text, re.IGNORECASE):
            errors.append(f"Presence must remain ephemeral; persistent presence table found in {path.relative_to(ROOT)}")
        for line_no, line in enumerate(text.splitlines(), start=1):
            if forbidden.search(line) and ("mapped_column" in line or "Column(" in line):
                errors.append(
                    f"Presence-like ephemeral field is persisted in {path.relative_to(ROOT)}:{line_no}: {line.strip()}"
                )


def main() -> int:
    errors: list[str] = []

    config_text = (API / "app/core/config.py").read_text(encoding="utf-8")
    if config_text.count("AI_ENABLED: bool = False") != 2:
        errors.append("AI_ENABLED must be explicitly false in both configuration implementations")
    if config_text.count("INITIAL_ADMIN_PASSWORD: str =") != 2:
        errors.append("INITIAL_ADMIN_PASSWORD must have exactly one declaration per configuration implementation")

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

    check_ai_zero_egress(errors)
    check_presence_not_persisted(errors)

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

    print("PASS: fail-closed config, zero-egress AI, ephemeral Presence, and credential invariants")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
