"""Run the narration speed browser regression against a disposable SQLite server."""
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
        dialogue_shot = db.execute(
            "SELECT id FROM shots WHERE project_id=? AND is_deleted=0 ORDER BY position LIMIT 1 OFFSET 1",
            (V62EditorActionsTest.pid,),
        ).fetchone()["id"]
        locked_shot = db.execute(
            "SELECT id FROM shots WHERE project_id=? AND is_deleted=0 ORDER BY position LIMIT 1 OFFSET 2",
            (V62EditorActionsTest.pid,),
        ).fetchone()["id"]
        db.execute(
            "UPDATE shots SET voiceover=?, duration_frames=75, locked=0 WHERE id=?",
            ("今天开始拍摄，先检查语速。第二句用于测试锁定状态。第三句验证计时保存。", shot_id),
        )
        db.execute("UPDATE shots SET dialogue=?, voiceover='', duration_frames=75, locked=0 WHERE id=?",
                   ("Take two, please.", dialogue_shot))
        db.execute("UPDATE shots SET voiceover='', duration_frames=77, locked=1 WHERE id=?", (locked_shot,))
        db.commit()

    env = dict(os.environ, TIMING_QA_URL=V62EditorActionsTest.base, TIMING_QA_SHOT_ID=shot_id)
    subprocess.run(["node", os.path.join(TEST_DIR, "timing_speed_browser_qa.cjs")], env=env, check=True)
finally:
    V62EditorActionsTest.tearDownClass()
