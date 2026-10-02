"""Enforce the intentionally small set of root FRAMEFORGE shared packages.

This is a repository-structure gate only. It performs no imports, network
access, database access, or workspace mutation.
"""

from __future__ import annotations

from pathlib import Path


CANONICAL_PACKAGES = frozenset({"contracts", "timecode", "types", "ui"})


def main() -> int:
    repo_root = Path(__file__).resolve().parents[1]
    packages_dir = repo_root / "packages"

    if not packages_dir.is_dir():
        print(f"FAIL: missing root packages directory: {packages_dir}")
        return 1

    actual = {
        path.name
        for path in packages_dir.iterdir()
        if path.is_dir() and not path.name.startswith(".")
    }

    unexpected = sorted(actual - CANONICAL_PACKAGES)
    missing = sorted(CANONICAL_PACKAGES - actual)

    if unexpected or missing:
        if unexpected:
            print("FAIL: unapproved top-level package(s): " + ", ".join(unexpected))
            print(
                "Root packages/ is closed. Put app-owned code in apps/* or "
                "obtain explicit architecture approval and update this gate."
            )
        if missing:
            print("FAIL: canonical package(s) unexpectedly missing: " + ", ".join(missing))
        return 1

    print("PASS: root packages are limited to " + ", ".join(sorted(CANONICAL_PACKAGES)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
