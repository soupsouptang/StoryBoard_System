"""Exercise the visible column manager against a disposable local project."""
import os
import subprocess
import sys
from pathlib import Path

TEST_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(TEST_DIR.parent))
sys.path.insert(0, str(TEST_DIR))
from test_v62_editor_actions import V62EditorActionsTest

V62EditorActionsTest.setUpClass()
try:
    env = dict(os.environ, COLUMN_QA_URL=V62EditorActionsTest.base)
    subprocess.run(["node", str(TEST_DIR / "column_lifecycle_browser_qa.cjs")],
                   cwd=TEST_DIR.parent, env=env, check=True)
finally:
    V62EditorActionsTest.tearDownClass()
