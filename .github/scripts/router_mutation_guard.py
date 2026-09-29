#!/usr/bin/env python3
"""Ratchet direct persistence writes out of FastAPI routers instead of allowing growth."""

from __future__ import annotations
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASELINE = json.loads((ROOT / ".frameforge" / "router-mutation-baseline.json").read_text(encoding="utf-8"))


def main() -> int:
    patterns = BASELINE["patterns"]
    expected = BASELINE["files"]
    actual: dict[str, int] = {}

    router_dir = ROOT / "apps" / "api" / "app" / "api" / "v1"
    for path in sorted(router_dir.glob("*.py")):
        text = path.read_text(encoding="utf-8")
        count = sum(text.count(pattern) for pattern in patterns)
        if count:
            actual[path.relative_to(ROOT).as_posix()] = count

    if actual != expected:
        print("FRAMEFORGE router mutation ratchet FAILED:", file=sys.stderr)
        print("Direct persistence ownership in HTTP routers changed.", file=sys.stderr)
        print(f"expected={expected}", file=sys.stderr)
        print(f"actual={actual}", file=sys.stderr)
        print(
            "Move persistence toward Application Service/Command ownership. "
            "If this PR intentionally reduces the debt, update the baseline in the same PR.",
            file=sys.stderr,
        )
        return 1

    print(f"PASS: router persistence debt did not grow ({sum(actual.values())} baseline operations)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
