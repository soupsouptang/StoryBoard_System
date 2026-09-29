#!/usr/bin/env python3
"""Validate machine-readable migration state and reject optimistic promotions."""

from __future__ import annotations
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
STATE_PATH = ROOT / ".frameforge" / "migration-state.json"
OWNER_MATRIX = ROOT / "storyboard-system" / "docs" / "CANONICAL_OWNER_MATRIX.md"
ALLOWED = {"VERIFIED","IMPLEMENTED_NOT_INTEGRATED","INTEGRATED_NOT_CUT_OVER","CUTOVER_READY","CUT_OVER","LEGACY_RETIRED","BLOCKED","BLOCKED_VISUAL"}
PROMOTED = {"CUTOVER_READY","CUT_OVER","LEGACY_RETIRED"}

def main() -> int:
    errors: list[str] = []
    data = json.loads(STATE_PATH.read_text(encoding="utf-8"))
    matrix = OWNER_MATRIX.read_text(encoding="utf-8")
    if data.get("product_baseline") != "5e86a0bb11a20ecd631d9c2af66260a73d7c92e7":
        errors.append("product baseline changed unexpectedly")
    capabilities = data.get("capabilities")
    if not isinstance(capabilities, dict) or not capabilities:
        errors.append("capabilities must be a non-empty object")
        capabilities = {}
    for name, item in capabilities.items():
        state = item.get("state")
        if state not in ALLOWED:
            errors.append(f"{name}: invalid state {state!r}")
            continue
        evidence = item.get("evidence") or {}
        tests = evidence.get("tests") or []
        if not item.get("current_owner") or not item.get("target_owner"):
            errors.append(f"{name}: current_owner and target_owner are required")
        if state in {"BLOCKED","BLOCKED_VISUAL"} and not item.get("blocker"):
            errors.append(f"{name}: blocked state requires blocker")
        if state in PROMOTED and (not evidence.get("runtime_verified") or not tests):
            errors.append(f"{name}: {state} requires runtime evidence and named tests")
        if state in {"CUTOVER_READY","CUT_OVER","LEGACY_RETIRED"} and not evidence.get("real_consumer"):
            errors.append(f"{name}: {state} requires a real target consumer")
        if state in {"CUT_OVER","LEGACY_RETIRED"} and item.get("legacy_owner") and not evidence.get("legacy_zero_consumers"):
            errors.append(f"{name}: {state} requires legacy_zero_consumers=true")
        matrix_name = "PostgreSQL persistence" if name == "PostgreSQL" else name
        if f"| {matrix_name} |" not in matrix:
            errors.append(f"{name}: missing CANONICAL_OWNER_MATRIX row")
    if errors:
        print("FRAMEFORGE migration-state guard FAILED:", file=sys.stderr)
        for error in errors:
            print(f" - {error}", file=sys.stderr)
        return 1
    print(f"PASS: {len(capabilities)} capabilities validated")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
