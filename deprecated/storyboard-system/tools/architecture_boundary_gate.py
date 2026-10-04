"""Check the first enforceable boundary in the FrameForge migration.

This is deliberately a source-only check: it never imports the application,
opens its database, starts a server, or writes to the workspace.
"""

from __future__ import annotations

import ast
import re
from pathlib import Path


SOURCE_SUFFIXES = {".ts", ".tsx", ".js", ".jsx"}
IMPORT = re.compile(
    r"\b(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?[\"']([^\"']+)[\"']"
    r"|\bimport\s*\(\s*[\"']([^\"']+)[\"']\s*\)",
    re.MULTILINE,
)
SERVICE_CALL = re.compile(
    r"\b(?:fetch|WebSocket|EventSource|XMLHttpRequest)\s*\("
    r"|\b(?:localStorage|sessionStorage)\b"
    r"|\bdocument\s*\.\s*cookie\b"
)


def check_ui_package(repo_root: Path) -> list[str]:
    """Return source locations where shared UI crosses into app/service state."""
    package = repo_root / "packages" / "ui"
    source = package / "src"
    if not source.is_dir():
        return [f"{source}: shared UI source is missing"]
    violations: list[str] = []
    for path in sorted(source.rglob("*")):
        if not path.is_file() or path.suffix not in SOURCE_SUFFIXES:
            continue
        content = path.read_text(encoding="utf-8")
        relative = path.relative_to(repo_root)
        for match in IMPORT.finditer(content):
            target = match.group(1) or match.group(2)
            if target.startswith("."):
                resolved = (path.parent / target).resolve()
                if not resolved.is_relative_to(source.resolve()):
                    line = content.count("\n", 0, match.start()) + 1
                    violations.append(f"{relative}:{line}: UI import escapes packages/ui/src: {target}")
            elif target.startswith(("src/", "static/", "@frameforge/workspace", "@frameforge/domain")):
                line = content.count("\n", 0, match.start()) + 1
                violations.append(f"{relative}:{line}: UI imports an application module: {target}")
        for match in SERVICE_CALL.finditer(content):
            line = content.count("\n", 0, match.start()) + 1
            violations.append(f"{relative}:{line}: UI owns I/O or persisted state: {match.group(0)}")
    return violations


def check_backend_modules(repo_root: Path) -> list[str]:
    """Keep modules reachable from the HTTP entrypoint independent of it.

    Follow local imports so newly extracted modules and their dependencies are
    checked without maintaining a second, easily stale module list.
    """
    entry = repo_root / "server.py"
    if not entry.is_file():
        return [f"{entry}: backend entrypoint is missing"]
    try:
        server_tree = ast.parse(entry.read_text(encoding="utf-8"), filename=str(entry))
    except SyntaxError as error:
        return [f"server.py:{error.lineno}: invalid Python: {error.msg}"]

    def local_imports(tree: ast.AST) -> set[Path]:
        found: set[Path] = set()
        for node in ast.walk(tree):
            names: list[str] = []
            if isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
                names = [node.module.split(".", 1)[0]]
            elif isinstance(node, ast.Import):
                names = [alias.name.split(".", 1)[0] for alias in node.names]
            for name in names:
                path = repo_root / f"{name}.py"
                if name != "server" and path.is_file():
                    found.add(path)
        return found

    pending = list(local_imports(server_tree))
    checked: set[Path] = set()
    violations: list[str] = []
    while pending:
        path = pending.pop()
        if path in checked:
            continue
        checked.add(path)
        relative = path.relative_to(repo_root)
        try:
            tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
        except SyntaxError as error:
            violations.append(f"{relative}:{error.lineno}: invalid Python: {error.msg}")
            continue
        pending.extend(local_imports(tree) - checked)
        for node in ast.walk(tree):
            target = None
            if isinstance(node, ast.ImportFrom):
                target = node.module
            elif isinstance(node, ast.Import):
                for alias in node.names:
                    if alias.name == "server" or alias.name.startswith("server."):
                        violations.append(f"{relative}:{node.lineno}: backend module imports server: {alias.name}")
            if target == "server" or (target and target.startswith("server.")):
                violations.append(f"{relative}:{node.lineno}: backend module imports server: {target}")
    return sorted(violations)


def main() -> int:
    repo_root = Path(__file__).resolve().parents[1]
    violations = check_ui_package(repo_root) + check_backend_modules(repo_root)
    if violations:
        print("\n".join(violations))
        return 1
    print("PASS: shared UI and extracted backend modules respect their entrypoint boundaries")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
