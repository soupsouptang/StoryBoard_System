#!/usr/bin/env python3
"""Validate machine-readable migration state and prevent optimistic status promotion."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
STATE_FILE = ROOT / ".frameforge/migration-state.json"
OWNER_MATRIX = ROOT / "storyboard-system/docs/CANONICAL_OWNER_MATRIX.md"

ALLOWED = {
    "VERIFIED", "IMPLEMENTED_NOT_INTEGRATED", "INTEGRATED_NOT_CUT_OVER",
    "CUTOVER_READY", "CUT_OVER", "LEGACY_RETIRED", "BLOCKED",
}


def main() -> int:
    payload = json.loads(STATE_FILE.read_text(encoding="utf-8"))
    errors: list[str] = []

    if set(payload.get("allowed_states", [])) != ALLOWED:
        errors.append("migration-state allowed_states does not match repository constitution")

    matrix = OWNER_MATRIX.read_text(encoding="utf-8")
    capabilities = payload.get("capabilities", {})
    if not capabilities:
        errors.append("migration-state contains no capabilities")

    for key, item in capabilities.items():
        state = item.get("state")
        if state not in ALLOWED:
            errors.append(f"{key}: invalid state {state!r}")
            continue

        for field in ("current_owner_paths", "target_owner_paths", "consumer_paths", "tests", "evidence_paths"):
            for relative in item.get(field, []):
                if not (ROOT / relative).exists():
                    errors.append(f"{key}: {field} path does not exist: {relative}")

        label = item.get("matrix_label")
        if label:
            row = next((line for line in matrix.splitlines() if line.startswith(f"| {label} |")), None)
            if row is None:
                errors.append(f"{key}: owner-matrix row missing for {label}")
            elif state not in row:
                errors.append(f"{key}: machine state {state} disagrees with owner-matrix row: {row}")

        consumers = item.get("consumer_paths", [])
        tests = item.get("tests", [])
        legacy = item.get("current_owner_paths", [])

        if state in {"INTEGRATED_NOT_CUT_OVER", "CUTOVER_READY", "CUT_OVER", "LEGACY_RETIRED"} and not consumers:
            errors.append(f"{key}: {state} requires at least one real consumer path")
        if state in {"CUTOVER_READY", "CUT_OVER", "LEGACY_RETIRED"} and not tests:
            errors.append(f"{key}: {state} requires explicit verification/test evidence")
        if state in {"CUT_OVER", "LEGACY_RETIRED"} and not item.get("cutover_evidence"):
            errors.append(f"{key}: {state} requires cutover_evidence")
        if state == "LEGACY_RETIRED":
            if legacy:
                errors.append(f"{key}: LEGACY_RETIRED cannot retain current_owner_paths")
            if not item.get("retirement_evidence"):
                errors.append(f"{key}: LEGACY_RETIRED requires retirement_evidence")

    if errors:
        print("FRAMEFORGE migration-state guard FAILED:", file=sys.stderr)
        for error in errors:
            print(f" - {error}", file=sys.stderr)
        return 1

    print(f"PASS: {len(capabilities)} migration capabilities have structurally valid evidence")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
