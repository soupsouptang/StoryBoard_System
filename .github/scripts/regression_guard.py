#!/usr/bin/env python3
"""Repository-level guardrails against silent FRAMEFORGE regression.

This script is intentionally dependency-free so every GitHub runner can execute it
before application dependencies are installed.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASELINE = "5e86a0bb11a20ecd631d9c2af66260a73d7c92e7"

FORBIDDEN_ROOT_FILES = {
    "patch.py",
    "refactor_shots.js",
    "replace.js",
    "update_matrix.js",
    "tash drop stash@{0}",
}
FORBIDDEN_ROOT_SUFFIXES = {".orig", ".rej", ".patch", ".diff", ".tmp"}

REQUIRED_CONSTITUTION = (
    BASELINE,
    "Single Owner Invariant",
    "UI QA Hard Gate",
    "Presence and Realtime Invariant",
    "No False Completion",
    "LEGACY_RETIRED",
)

REQUIRED_PRODUCT_CAPABILITIES = (
    "Project Cover Fallback",
    "Workspace IA: Narration",
    "Workspace IA: Moodboard",
    "Workspace IA: Lighting",
    "Workspace IA: Review",
    "Read-first Table",
    "Inline Double-click Editing",
    "Column Manager",
    "Saved View / Column Layout",
    "Search",
    "Filtering & Sorting",
    "Grouping",
    "Bulk Actions",
    "Context Menu",
    "Shot Reorder",
    "Undo / Redo",
    "Save Status",
    "Production Steps",
    "Custom Fields",
    "Comments",
    "Versions",
    "Share",
    "Shot Trash",
    "Strict No-Op Revision",
    "Shot Command Parity",
    "409 Conflict",
    "Ephemeral Presence",
    "Real-time Sync",
)

FORBIDDEN_REVIEW_PAGE_TOKENS = (
    "useApplyReviewDecision",
    "runDecision(",
    "applyDecision.",
)

REQUIRED_SCREEN_ROWS = (
    "/login",
    "/projects",
    "/projects/[id]",
    "/projects/[id]/shots",
    "/projects/[id]/timeline",
    "/projects/[id]/storyboard",
    "/projects/[id]/deliverables",
    "/projects/[id]/review",
    "/projects/[id]/narration",
    "/projects/[id]/moodboard",
    "/projects/[id]/planning",
)

TEXT_SUFFIXES = {
    ".md", ".py", ".js", ".jsx", ".ts", ".tsx", ".json", ".yml", ".yaml",
    ".css", ".html", ".toml", ".ini", ".mjs", ".cjs",
}


def git(*args: str) -> str:
    return subprocess.check_output(["git", *args], cwd=ROOT, text=True, encoding="utf-8", errors="replace")


def tracked_files() -> list[Path]:
    raw = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT)
    return [Path(p.decode("utf-8", "surrogateescape")) for p in raw.split(b"\0") if p]


def fail(errors: list[str], message: str) -> None:
    errors.append(message)


def check_hygiene(errors: list[str]) -> None:
    for rel in tracked_files():
        if len(rel.parts) == 1:
            if rel.name in FORBIDDEN_ROOT_FILES or rel.suffix.lower() in FORBIDDEN_ROOT_SUFFIXES:
                fail(errors, f"tracked temporary/root patch artifact is forbidden: {rel}")

        if rel.suffix.lower() not in TEXT_SUFFIXES:
            continue
        if not (
            len(rel.parts) == 1
            or rel.parts[0] in {".github", "apps", "packages"}
            or rel.as_posix().startswith("storyboard-system/docs/")
            or rel.as_posix().startswith("storyboard-system/src/")
            or rel.as_posix().startswith("storyboard-system/fastapi_app/")
            or (rel.parts[0] == "storyboard-system" and len(rel.parts) == 2 and rel.suffix == ".py")
        ):
            continue

        path = ROOT / rel
        try:
            data = path.read_bytes()
        except OSError as exc:
            fail(errors, f"cannot read tracked text file {rel}: {exc}")
            continue
        bad = sorted({b for b in data if b < 32 and b not in (9, 10, 13)})
        if bad:
            fail(errors, f"control characters {bad} found in tracked text file: {rel}")


def require_tokens(errors: list[str], relative: str, tokens: tuple[str, ...]) -> None:
    path = ROOT / relative
    if not path.is_file():
        fail(errors, f"required file missing: {relative}")
        return
    text = path.read_text(encoding="utf-8")
    for token in tokens:
        if token not in text:
            fail(errors, f"{relative} lost required contract/inventory token: {token}")


def check_review_ui_policy(errors: list[str]) -> None:
    path = ROOT / "apps/web/app/(workspace)/production/[id]/review/page.tsx"
    if not path.is_file():
        fail(errors, f"required review page missing: {path.relative_to(ROOT)}")
        return
    text = path.read_text(encoding="utf-8")
    for token in FORBIDDEN_REVIEW_PAGE_TOKENS:
        if token in text:
            fail(errors, f"review page restored prohibited global approval control: {token}")


def check_static_contracts(errors: list[str]) -> None:
    require_tokens(errors, "AGENTS.md", REQUIRED_CONSTITUTION)
    require_tokens(
        errors,
        "storyboard-system/docs/PRODUCT_PARITY_MATRIX.md",
        REQUIRED_PRODUCT_CAPABILITIES,
    )
    require_tokens(
        errors,
        "storyboard-system/docs/SCREEN_PARITY_MATRIX.md",
        REQUIRED_SCREEN_ROWS,
    )
    for path in (
        "storyboard-system/docs/ACTIVE_WORKSTREAMS.md",
        "storyboard-system/docs/CANONICAL_OWNER_MATRIX.md",
        "storyboard-system/docs/API_ROUTE_PARITY_MATRIX.md",
        "storyboard-system/docs/UI_PRIMITIVE_PARITY.md",
        "storyboard-system/docs/ARCHITECTURE.md",
        "storyboard-system/docs/ARCHITECTURE_MIGRATION.md",
    ):
        if not (ROOT / path).is_file():
            fail(errors, f"canonical migration document missing: {path}")


def changed_paths(base: str) -> tuple[set[str], list[tuple[str, str]]]:
    changed: set[str] = set()
    statuses: list[tuple[str, str]] = []
    for line in git("diff", "--name-status", f"{base}...HEAD").splitlines():
        fields = line.split("\t")
        if not fields:
            continue
        status = fields[0]
        if status.startswith("R") and len(fields) >= 3:
            changed.update((fields[1], fields[2]))
            statuses.append((status, fields[1]))
            statuses.append((status, fields[2]))
        elif len(fields) >= 2:
            changed.add(fields[1])
            statuses.append((status, fields[1]))
    return changed, statuses


def check_diff_policy(errors: list[str], base: str | None) -> None:
    if not base:
        return
    try:
        subprocess.check_call(["git", "cat-file", "-e", f"{base}^{{commit}}"], cwd=ROOT)
    except subprocess.CalledProcessError:
        fail(errors, f"diff base is unavailable: {base}")
        return

    changed, statuses = changed_paths(base)
    docs = {
        "active": "storyboard-system/docs/ACTIVE_WORKSTREAMS.md",
        "owner": "storyboard-system/docs/CANONICAL_OWNER_MATRIX.md",
        "product": "storyboard-system/docs/PRODUCT_PARITY_MATRIX.md",
        "screen": "storyboard-system/docs/SCREEN_PARITY_MATRIX.md",
        "api": "storyboard-system/docs/API_ROUTE_PARITY_MATRIX.md",
        "ui": "storyboard-system/docs/UI_PRIMITIVE_PARITY.md",
    }

    critical_prefixes = (
        "apps/web/app/",
        "apps/web/components/",
        "apps/api/app/",
        "packages/",
        "storyboard-system/src/",
        "storyboard-system/packages/",
        "storyboard-system/static/",
    )
    retirement = [
        path for status, path in statuses
        if (status.startswith("D") or status.startswith("R")) and path.startswith(critical_prefixes)
    ]

    large_deletions: list[str] = []
    for line in git("diff", "--numstat", f"{base}...HEAD").splitlines():
        fields = line.split("\t")
        if len(fields) != 3 or not fields[0].isdigit() or not fields[1].isdigit():
            continue
        additions, deletions, path = int(fields[0]), int(fields[1]), fields[2]
        if path.startswith(critical_prefixes) and deletions >= 50 and deletions > additions:
            large_deletions.append(path)

    sensitive = retirement + large_deletions
    if not sensitive:
        return

    required = {docs["active"], docs["owner"]}
    if any(p.startswith(("apps/web/", "storyboard-system/src/", "storyboard-system/static/")) for p in sensitive):
        required.update((docs["product"], docs["screen"]))
    if any(p.startswith(("apps/api/", "storyboard-system/")) and not p.startswith(("storyboard-system/src/", "storyboard-system/static/")) for p in sensitive):
        required.add(docs["api"])
    if any(p.startswith(("packages/ui/", "storyboard-system/packages/ui/")) for p in sensitive):
        required.add(docs["ui"])

    missing = sorted(required - changed)
    if missing:
        fail(
            errors,
            "critical deletion/large contraction requires migration ledgers in the same change; "
            f"sensitive={sorted(set(sensitive))}; missing={missing}",
        )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default=None)
    args = parser.parse_args()

    errors: list[str] = []
    check_hygiene(errors)
    check_static_contracts(errors)
    check_review_ui_policy(errors)
    check_diff_policy(errors, args.base)

    if errors:
        print("FRAMEFORGE regression guard FAILED:", file=sys.stderr)
        for item in errors:
            print(f" - {item}", file=sys.stderr)
        return 1

    print("PASS: repository hygiene, constitution, parity inventory, and diff policy are intact")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())