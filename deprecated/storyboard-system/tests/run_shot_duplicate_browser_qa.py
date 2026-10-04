"""Run the row duplicate regression against a disposable SQLite server."""
import os
import subprocess
import sys

TEST_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(TEST_DIR))
sys.path.insert(0, TEST_DIR)

from test_v62_editor_actions import V62EditorActionsTest

V62EditorActionsTest.setUpClass()
try:
    V62EditorActionsTest.app.AppHandler.log_message = lambda *args: None
    with V62EditorActionsTest.app.connect() as db:
        shot = db.execute(
            "SELECT id FROM shots WHERE project_id=? AND is_deleted=0 ORDER BY position LIMIT 1",
            (V62EditorActionsTest.pid,),
        ).fetchone()
        shot_id = shot["id"]
        db.execute(
            "UPDATE shots SET voiceover=?, dialogue=? WHERE id=?",
            ("原镜头旁白", "角色台词应随镜头副本保留。", shot_id),
        )
        db.commit()

    env = dict(os.environ, SHOT_DUP_QA_URL=V62EditorActionsTest.base, SHOT_DUP_QA_SHOT_ID=shot_id)
    subprocess.run(["node", os.path.join(TEST_DIR, "shot_duplicate_browser_qa.cjs")], env=env, check=True)
finally:
    V62EditorActionsTest.tearDownClass()
