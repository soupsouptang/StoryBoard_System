#!/usr/bin/env python3
"""Require third-party GitHub Actions to be pinned to immutable commit SHAs."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORKFLOWS = ROOT / ".github/workflows"
USES_RE = re.compile(r"^\s*-?\s*uses:\s*([^\s#]+)", re.MULTILINE)
SHA_RE = re.compile(r"^[0-9a-fA-F]{40}$")


def main() -> int:
    errors: list[str] = []
    checked = 0
    for path in sorted(WORKFLOWS.glob("*.y*ml")):
        text = path.read_text(encoding="utf-8")
        for spec in USES_RE.findall(text):
            if spec.startswith("./") or spec.startswith("docker://"):
                continue
            checked += 1
            if "@" not in spec:
                errors.append(f"{path.relative_to(ROOT)}: action has no ref: {spec}")
                continue
            _, ref = spec.rsplit("@", 1)
            if not SHA_RE.fullmatch(ref):
                errors.append(f"{path.relative_to(ROOT)}: action is not SHA-pinned: {spec}")

    if errors:
        print("GitHub Actions pin guard FAILED:", file=sys.stderr)
        for error in errors:
            print(f" - {error}", file=sys.stderr)
        return 1
    print(f"PASS: {checked} external action references are pinned to immutable SHAs")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
