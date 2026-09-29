#!/usr/bin/env python3
"""Reject newly introduced direct business mutations in FastAPI router modules.

Existing debt is tolerated so the guard is adoptable. New added lines in router
files must not create a second mutation owner; mutations belong in services/commands.
"""

from __future__ import annotations
import argparse
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ROUTER_PREFIX = "apps/api/app/api/v1/"
ROUTER_SUFFIX = ".py"

PATTERNS = (
    re.compile(r"\b(?:db|session)\.(?:add|add_all|delete|merge|commit|flush)\s*\("),
    re.compile(r"\b(?:db|session)\.execute\s*\(\s*(?:update|delete|insert)\s*\("),
    re.compile(r"\btext\s*\(\s*[furbFURB]*['\"]\s*(?:UPDATE|DELETE|INSERT|ALTER|DROP|CREATE)\b", re.IGNORECASE),
)

def git(*args: str) -> str:
    return subprocess.check_output(["git", *args], cwd=ROOT, text=True, encoding="utf-8", errors="replace")

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", required=True)
    args = parser.parse_args()

    subprocess.check_call(["git","cat-file","-e",f"{args.base}^{{commit}}"], cwd=ROOT)
    diff = git("diff","--unified=0",f"{args.base}...HEAD","--","apps/api/app/api/v1")

    current_file = None
    violations: list[str] = []
    for line in diff.splitlines():
        if line.startswith("+++ b/"):
            current_file = line[6:]
            continue
        if not current_file or not current_file.startswith(ROUTER_PREFIX) or not current_file.endswith(ROUTER_SUFFIX):
            continue
        if not line.startswith("+") or line.startswith("+++"):
            continue
        added = line[1:]
        for pattern in PATTERNS:
            if pattern.search(added):
                violations.append(f"{current_file}: {added.strip()}")
                break

    if violations:
        print("FRAMEFORGE command-boundary guard FAILED:", file=sys.stderr)
        print("New router-level persistence mutation detected. Move the rule/write into an application service or command.", file=sys.stderr)
        for item in violations:
            print(f" - {item}", file=sys.stderr)
        return 1

    print("PASS: no new direct persistence mutations were introduced in VNext routers")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
