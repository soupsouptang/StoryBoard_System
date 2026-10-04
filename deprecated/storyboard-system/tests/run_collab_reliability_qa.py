"""Isolated dual-browser collaboration reliability QA runner."""
import os
import sys
import subprocess

# Ensure current dir and tests dir are on sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from test_v62_editor_actions import V62EditorActionsTest

V62EditorActionsTest.setUpClass()
try:
    app = V62EditorActionsTest.app
    with app.connect() as db:
        now = app.now_iso()
        db.execute(
            'INSERT OR REPLACE INTO users (id,username,password_hash,role,status,display_name,created_at) VALUES (?,?,?,?,?,?,?)',
            ('collab-peer-1', 'peer1', app.password_hash('FrameForge2026!QA'), 'admin', 'ACTIVE', '协作者一号', now)
        )
        db.execute(
            'INSERT OR REPLACE INTO users (id,username,password_hash,role,status,display_name,created_at) VALUES (?,?,?,?,?,?,?)',
            ('collab-peer-2', 'peer2', app.password_hash('FrameForge2026!QA'), 'admin', 'ACTIVE', '协作者二号', now)
        )
    env = dict(os.environ, TEST_SERVER_URL=V62EditorActionsTest.base)
    result = subprocess.run(['node', os.path.join(os.path.dirname(__file__), 'collab_reliability_qa.cjs')], env=env)
    if result.returncode != 0:
        sys.exit(result.returncode)
finally:
    V62EditorActionsTest.tearDownClass()
