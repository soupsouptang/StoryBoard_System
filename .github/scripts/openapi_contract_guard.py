#!/usr/bin/env python3
"""Reject silent removal of required VNext HTTP contracts."""

from __future__ import annotations
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
API = ROOT / "apps" / "api"
sys.path.insert(0, str(API))

from main import app  # noqa: E402

EXPECTED = json.loads((ROOT / ".frameforge" / "openapi-required-contracts.json").read_text(encoding="utf-8"))


def main() -> int:
    schema = app.openapi()
    available = {
        (method.upper(), path)
        for path, item in schema.get("paths", {}).items()
        for method in item
        if method.lower() in {"get","post","put","patch","delete","options","head"}
    }
    required = {tuple(pair) for pair in EXPECTED["required"]}
    missing = sorted(required - available)
    if missing:
        print("FRAMEFORGE OpenAPI contract guard FAILED:", file=sys.stderr)
        for method, path in missing:
            print(f" - missing {method} {path}", file=sys.stderr)
        return 1
    print(f"PASS: {len(required)} required HTTP contracts remain present")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
