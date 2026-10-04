#!/usr/bin/env python3
"""Check current repository boundaries, not the retired feature inventory.

No application imports, network, database access or product test claims.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
INVENTORY = "docs/current/REPOSITORY_INVENTORY_2026-10-05.json"
TEXT_SUFFIXES = {".md", ".py", ".js", ".jsx", ".ts", ".tsx", ".json", ".yml",
                 ".yaml", ".css", ".html", ".toml", ".ini", ".mjs", ".cjs"}
RUNTIME_PREFIXES = ("apps/", "packages/", "infra/", "tests/", "tools/")


def git(*args: str) -> bytes:
    return subprocess.check_output(["git", *args], cwd=ROOT)


def tracked_files() -> list[str]:
    return [p.decode("utf-8") for p in git("ls-files", "-z").split(b"\0") if p]


def safe_path(value: str) -> Path:
    if not isinstance(value, str) or not value or "\\" in value:
        raise ValueError("nonempty repository path required")
    rel = PurePosixPath(value)
    if rel.is_absolute() or ".." in rel.parts or re.match(r"^[A-Za-z]:", value):
        raise ValueError(f"unsafe repository path: {value}")
    path = (ROOT / value).resolve()
    if not path.is_relative_to(ROOT):
        raise ValueError(f"path escapes checkout: {value}")
    return path


def check_inventory(errors: list[str]) -> dict[str, dict]:
    manifest = json.loads((ROOT / INVENTORY).read_text(encoding="utf-8"))
    if manifest.get("schema_version") != 1 or not isinstance(manifest.get("records"), list):
        raise ValueError("unsupported cleanup inventory")
    archived = {}
    for record in manifest["records"]:
        source = record["source"]
        destination = record["destination"]
        safe_path(source)
        target = safe_path(destination)
        if record["operation"] not in {"keep", "copy", "move"} or not record.get("reason"):
            raise ValueError(f"incomplete classification: {source}")
        if not target.is_file():
            errors.append(f"classified file missing: {destination}")
        if not destination.startswith("deprecated/"):
            continue
        archived[source] = record
        if target.is_file():
            data = target.read_bytes()
            if record.get("canonical_utf8_text"):
                data = data.replace(b"\r\n", b"\n")
            if hashlib.sha256(data).hexdigest() != record.get("canonical_sha256"):
                errors.append(f"archive content changed without updating inventory: {destination}")
        if record["operation"] == "move" and (ROOT / source).is_file():
            errors.append(f"retired source restored into normal tree: {source}")
    return archived


def check_boundaries(errors: list[str]) -> None:
    required = ("AGENTS.md", "README.md", "docs/README.md",
                "docs/current/NEXT_GENERATION_BOUNDARY.md", "docs/current/CONTINUE_WORK.md",
                "deprecated/AGENTS.md", "deprecated/README.md", INVENTORY)
    for name in required:
        if not (ROOT / name).is_file():
            errors.append(f"required current entry missing: {name}")
    constitution = (ROOT / "AGENTS.md").read_text(encoding="utf-8")
    for token in ("旧功能基线已失效", "Single Owner Invariant", "UI QA Hard Gate",
                  "Presence and Realtime Invariant", "No False Completion"):
        if token not in constitution:
            errors.append(f"current safety/authority rule missing: {token}")
    dockerignore = (ROOT / ".dockerignore").read_text(encoding="utf-8").splitlines()
    if "deprecated" not in dockerignore:
        errors.append("deprecated must be excluded from Docker context")
    pytest_config = (ROOT / "pytest.ini").read_text(encoding="utf-8")
    if "testpaths = tests" not in pytest_config or "norecursedirs = deprecated" not in pytest_config:
        errors.append("pytest discovery must explicitly exclude retired tests")

    for relative in tracked_files():
        if relative.startswith("deprecated/"):
            continue
        path = ROOT / relative
        if not path.is_file() or path.suffix not in TEXT_SUFFIXES:
            continue
        data = path.read_bytes()
        if any(byte < 32 and byte not in (9, 10, 13) for byte in data):
            errors.append(f"control character in current text: {relative}")
        if relative.startswith(RUNTIME_PREFIXES) and path.suffix != ".md" and relative != "tools/repository_boundary_guard.py":
            text = data.decode("utf-8", errors="replace")
            if "storyboard-system/" in text or "storyboard-system\"" in text:
                errors.append(f"normal code still refers to old runtime: {relative}")
            if re.search(r"(?:from|import|require|COPY|sys\.path|Path\()[^\n]*deprecated[/\\]", text):
                errors.append(f"normal code consumes deprecated tree: {relative}")


def check_diff(errors: list[str], base: str | None, archived: dict[str, dict]) -> None:
    if not base:
        return
    git("cat-file", "-e", f"{base}^{{commit}}")
    raw = git("diff", "--name-status", "--no-renames", "-z", f"{base}...HEAD").split(b"\0")
    changes = [(raw[i].decode(), raw[i + 1].decode("utf-8")) for i in range(0, len(raw) - 1, 2)]
    changed = {path for _, path in changes}
    removed = [path for status, path in changes if status == "D" and path.startswith(RUNTIME_PREFIXES)]
    for path in removed:
        if path not in archived:
            errors.append(f"current code deletion needs explicit disposition: {path}")
    contractions = []
    for line in git("-c", "core.quotePath=false", "diff", "--numstat", "--no-renames", f"{base}...HEAD").decode("utf-8").splitlines():
        fields = line.split("\t")
        if len(fields) == 3 and all(f.isdigit() for f in fields[:2]):
            added, deleted, path = int(fields[0]), int(fields[1]), fields[2]
            if path.startswith(RUNTIME_PREFIXES) and deleted >= 50 and deleted > added:
                contractions.append(path)
    if removed or contractions:
        report = "docs/current/REPOSITORY_CLEANUP_2026-10-05.md"
        if report not in changed:
            errors.append(f"current code contraction requires same-change disposition report: {report}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base")
    args = parser.parse_args()
    errors: list[str] = []
    try:
        archived = check_inventory(errors)
        check_boundaries(errors)
        check_diff(errors, args.base, archived)
    except (OSError, ValueError, KeyError, TypeError, subprocess.CalledProcessError) as exc:
        errors.append(str(exc))
    if errors:
        print("Repository boundary guard FAILED:", file=sys.stderr)
        for error in errors:
            print(f" - {error}", file=sys.stderr)
        return 1
    print("PASS: current entries, archive integrity, retired-code isolation and disposition; product tests not run")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
