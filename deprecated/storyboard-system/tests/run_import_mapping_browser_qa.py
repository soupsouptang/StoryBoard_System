"""Run the import mapping UI check against an isolated local database."""
import os
import gc
import subprocess
import sys
import threading
import time
from pathlib import Path

TEST_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(TEST_DIR.parent))
sys.path.insert(0, str(TEST_DIR))
from test_v62_editor_actions import V62EditorActionsTest


V62EditorActionsTest.setUpClass()
try:
    env = dict(os.environ, QA_URL=V62EditorActionsTest.base,
               QA_USER="qa-admin", QA_PASS="FrameForge2026!QA")
    subprocess.run(["node", str(TEST_DIR / "import_mapping_browser_qa.cjs")], env=env, check=True)
finally:
    # Image preview requests can still be finishing as Chromium exits.
    time.sleep(2)
    V62EditorActionsTest.httpd.shutdown()
    V62EditorActionsTest.httpd.server_close()
    V62EditorActionsTest.thread.join(timeout=3)
    for worker in threading.enumerate():
        if worker is not threading.current_thread():
            worker.join(timeout=5)
    for attempt in range(20):
        gc.collect()
        try:
            V62EditorActionsTest.temp.cleanup()
            break
        except PermissionError:
            if attempt == 19:
                raise
            time.sleep(0.5)
