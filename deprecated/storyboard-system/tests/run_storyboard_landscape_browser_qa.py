"""Exercise the landscape storyboard PDF preview against a disposable project."""
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
    env = dict(os.environ, LANDSCAPE_QA_URL=V62EditorActionsTest.base)
    subprocess.run(["node", str(TEST_DIR / "storyboard_landscape_browser_qa.cjs")],
                   cwd=TEST_DIR.parent, env=env, check=True)
finally:
    V62EditorActionsTest.tearDownClass()
