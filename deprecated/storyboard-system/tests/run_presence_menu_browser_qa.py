"""Run the targeted presence/menu browser QA against an isolated local server."""
import os
import subprocess
import sys

sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from test_v62_editor_actions import V62EditorActionsTest


V62EditorActionsTest.setUpClass()
try:
    app = V62EditorActionsTest.app
    with app.connect() as db:
        now = app.now_iso()
        for user_id, username, display_name in (
            ('collab-peer-1', 'peer1', '协作者一号'),
            ('collab-peer-2', 'peer2', '协作者二号'),
        ):
            db.execute(
                'INSERT OR REPLACE INTO users (id,username,password_hash,role,status,display_name,created_at) VALUES (?,?,?,?,?,?,?)',
                (user_id, username, app.password_hash('FrameForge2026!QA'), 'admin', 'ACTIVE', display_name, now),
            )
    env = dict(os.environ, PRESENCE_QA_URL=V62EditorActionsTest.base)
    result = subprocess.run(['node', os.path.join(os.path.dirname(__file__), 'presence_menu_browser_qa.cjs')], env=env)
    if result.returncode:
        raise SystemExit(result.returncode)
finally:
    V62EditorActionsTest.tearDownClass()
