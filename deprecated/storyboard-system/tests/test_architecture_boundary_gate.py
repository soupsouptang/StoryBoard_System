"""Contract checks for the first enforced architecture boundary."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from tools.architecture_boundary_gate import check_backend_modules, check_ui_package


REPO_ROOT = Path(__file__).resolve().parents[1]


class ArchitectureBoundaryGateTests(unittest.TestCase):
    def test_current_shared_ui_has_no_application_or_io_dependency(self):
        self.assertEqual([], check_ui_package(REPO_ROOT))

    def test_current_backend_modules_do_not_import_http_entrypoint(self):
        self.assertEqual([], check_backend_modules(REPO_ROOT))

    def test_app_import_and_io_are_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = root / "packages" / "ui" / "src"
            source.mkdir(parents=True)
            (source / "bad.tsx").write_text(
                'import { state } from "../../../../src/workspace/store";\n'
                'export async function bad() { return fetch("/api/projects"); }\n',
                encoding="utf-8",
            )
            violations = check_ui_package(root)
            self.assertEqual(2, len(violations))
            self.assertTrue(any("escapes" in violation for violation in violations))
            self.assertTrue(any("I/O" in violation for violation in violations))

    def test_local_primitives_and_vendor_imports_are_allowed(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = root / "packages" / "ui" / "src"
            source.mkdir(parents=True)
            (source / "index.tsx").write_text(
                'import * as React from "react";\n'
                'export { Button } from "./button";\n',
                encoding="utf-8",
            )
            self.assertEqual([], check_ui_package(root))

    def test_server_dependency_is_checked_without_a_manual_module_list(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "server.py").write_text("from shot_domain import update_shot\n", encoding="utf-8")
            (root / "shot_domain.py").write_text(
                "def update_shot():\n    from server import now_iso\n    return now_iso()\n",
                encoding="utf-8",
            )
            violations = check_backend_modules(root)
            self.assertEqual(1, len(violations))
            self.assertIn("shot_domain.py:2", violations[0])

    def test_unreferenced_scratch_module_is_outside_runtime_boundary(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "server.py").write_text("from shot_domain import update_shot\n", encoding="utf-8")
            (root / "shot_domain.py").write_text("def update_shot():\n    return 1\n", encoding="utf-8")
            (root / "scratch.py").write_text("import server\n", encoding="utf-8")
            self.assertEqual([], check_backend_modules(root))

    def test_transitive_backend_dependency_is_checked(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "server.py").write_text("from shot_versions import restore\n", encoding="utf-8")
            (root / "shot_versions.py").write_text(
                "from persistence_helpers import touch_project\n"
                "def restore():\n    return touch_project()\n",
                encoding="utf-8",
            )
            (root / "persistence_helpers.py").write_text("import server\n", encoding="utf-8")
            violations = check_backend_modules(root)
            self.assertEqual(1, len(violations))
            self.assertIn("persistence_helpers.py:1", violations[0])


if __name__ == "__main__":
    unittest.main()
