#!/usr/bin/env python3
"""Validate machine-readable FRAMEFORGE migration evidence."""

from __future__ import annotations
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
STATE = ROOT / ".frameforge" / "migration-state.json"
VALID = {
    "VERIFIED",
    "IMPLEMENTED_NOT_INTEGRATED",
    "INTEGRATED_NOT_CUT_OVER",
    "CUTOVER_READY",
    "CUT_OVER",
    "LEGACY_RETIRED",
    "BLOCKED",
}


def main() -> int:
    errors: list[str] = []
    data = json.loads(STATE.read_text(encoding="utf-8"))
    capabilities = data.get("capabilities", {})
    if not capabilities:
        errors.append("migration-state.json has no capabilities")

    for name, item in capabilities.items():
        state = item.get("state")
        if state not in VALID:
            errors.append(f"{name}: invalid state {state!r}")
            continue
        for field in ("current_owner", "target_owner", "real_consumer", "legacy_owner_active"):
            if field not in item:
                errors.append(f"{name}: missing required field {field}")

        if state in {"INTEGRATED_NOT_CUT_OVER", "CUTOVER_READY", "CUT_OVER", "LEGACY_RETIRED"} and not item.get("real_consumer"):
            errors.append(f"{name}: {state} requires a real consumer")

        if state == "LEGACY_RETIRED" and item.get("legacy_owner_active"):
            errors.append(f"{name}: LEGACY_RETIRED cannot keep an active legacy owner")

        if state == "CUT_OVER" and item.get("legacy_owner_active") and not item.get("evidence"):
            errors.append(f"{name}: CUT_OVER with an active legacy source requires explicit evidence")

    agents = (ROOT / "AGENTS.md").read_text(encoding="utf-8")
    for state in VALID:
        if state not in agents:
            errors.append(f"AGENTS.md lost migration-state token {state}")

    if errors:
        print("FRAMEFORGE migration evidence guard FAILED:", file=sys.stderr)
        for error in errors:
            print(f" - {error}", file=sys.stderr)
        return 1

    print(f"PASS: validated {len(capabilities)} machine-readable migration capability records")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
