#!/usr/bin/env python3
"""Prevent new persistence/business-mutation ownership from leaking into FastAPI routers.

Existing direct-mutation route functions are temporarily grandfathered in a machine
baseline. The allow-list may shrink as services/commands take ownership, but CI
rejects any new direct mutation function.
"""

from __future__ import annotations

import ast
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ROUTERS = ROOT / "apps/api/app/api/v1"
BASELINE = ROOT / ".frameforge/baseline/router-mutation-exceptions.json"

DB_MUTATORS = {"add", "add_all", "delete", "flush", "commit", "merge"}
SQL_MUTATORS = {"update", "delete", "insert"}
RAW_SQL_NAMES = {"text"}


def route_decorated(node: ast.AsyncFunctionDef | ast.FunctionDef) -> bool:
    for dec in node.decorator_list:
        target = dec.func if isinstance(dec, ast.Call) else dec
        if isinstance(target, ast.Attribute) and isinstance(target.value, ast.Name) and target.value.id == "router":
            return True
    return False


def contains_direct_mutation(fn: ast.AsyncFunctionDef | ast.FunctionDef) -> list[str]:
    reasons: list[str] = []
    for node in ast.walk(fn):
        if not isinstance(node, ast.Call):
            continue

        # db.add/delete/flush/etc.
        if isinstance(node.func, ast.Attribute) and isinstance(node.func.value, ast.Name):
            if node.func.value.id in {"db", "session"} and node.func.attr in DB_MUTATORS:
                reasons.append(f"{node.func.value.id}.{node.func.attr}()")

        # db.execute(update(...)), delete(...), insert(...), text(...)
        if (
            isinstance(node.func, ast.Attribute)
            and isinstance(node.func.value, ast.Name)
            and node.func.value.id in {"db", "session"}
            and node.func.attr == "execute"
            and node.args
            and isinstance(node.args[0], ast.Call)
        ):
            inner = node.args[0].func
            if isinstance(inner, ast.Name) and inner.id in SQL_MUTATORS | RAW_SQL_NAMES:
                reasons.append(f"{node.func.value.id}.execute({inner.id}(...))")

        # setattr(model, field, value) is a mutation smell when a route already
        # owns persistence. Capture it independently so new direct assignment
        # workflows cannot bypass the db-call matcher.
        if isinstance(node.func, ast.Name) and node.func.id == "setattr":
            reasons.append("setattr(...)")

    return sorted(set(reasons))


def main() -> int:
    allowed = set(json.loads(BASELINE.read_text(encoding="utf-8"))["allowed_direct_mutation_functions"])
    observed: dict[str, list[str]] = {}
    syntax_errors: list[str] = []

    for path in sorted(ROUTERS.glob("*.py")):
        try:
            tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
        except SyntaxError as exc:
            syntax_errors.append(f"{path.relative_to(ROOT)}:{exc.lineno}: {exc.msg}")
            continue
        for node in tree.body:
            if isinstance(node, (ast.AsyncFunctionDef, ast.FunctionDef)) and route_decorated(node):
                reasons = contains_direct_mutation(node)
                if reasons:
                    key = f"{path.relative_to(ROOT).as_posix()}::{node.name}"
                    observed[key] = reasons

    new_violations = sorted(set(observed) - allowed)
    if syntax_errors or new_violations:
        print("FRAMEFORGE command-boundary guard FAILED:", file=sys.stderr)
        for err in syntax_errors:
            print(f" - {err}", file=sys.stderr)
        for key in new_violations:
            print(f" - new router mutation owner {key}: {', '.join(observed[key])}", file=sys.stderr)
        print("Move mutation orchestration into a service/command; do not expand the baseline.", file=sys.stderr)
        return 1

    retired = sorted(allowed - set(observed))
    print(f"PASS: no new direct router mutation owners; {len(observed)} grandfathered functions remain")
    if retired:
        print("Baseline can shrink for:", ", ".join(retired))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
