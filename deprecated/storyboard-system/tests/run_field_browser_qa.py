"""Isolated browser QA: temporary database; never touches production."""
import os
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from tests.test_v62_editor_actions import V62EditorActionsTest

V62EditorActionsTest.setUpClass()
try:
    app = V62EditorActionsTest.app
    with app.connect() as db:
        db.execute('INSERT INTO users (id,username,password_hash,role,status,display_name,created_at) VALUES (?,?,?,?,?,?,?)',
                   ('field-qa-peer','field-peer',app.password_hash('FrameForge2026!QA'),'admin','ACTIVE','协作测试用户',app.now_iso()))
    env = dict(os.environ, FIELD_QA_URL=V62EditorActionsTest.base)
    subprocess.run(['node', 'tests/field_browser_qa.cjs'], env=env, check=True)
finally:
    V62EditorActionsTest.tearDownClass()
