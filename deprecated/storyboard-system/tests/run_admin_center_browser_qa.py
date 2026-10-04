"""Run admin-center browser checks against an isolated temporary database."""
import os
import subprocess
import sys

TEST_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(TEST_DIR))
sys.path.insert(0, TEST_DIR)
from test_v62_editor_actions import V62EditorActionsTest

V62EditorActionsTest.setUpClass()
try:
    env = dict(
        os.environ,
        ADMIN_CENTER_QA_URL=V62EditorActionsTest.base,
        ADMIN_CENTER_QA_USER="qa-admin",
        ADMIN_CENTER_QA_PASSWORD="FrameForge2026!QA",
    )
    subprocess.run(["node", os.path.join(TEST_DIR, "admin_center_browser_qa.cjs")], env=env, check=True)
finally:
    V62EditorActionsTest.tearDownClass()
