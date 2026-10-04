"""Run browser persistence checks with a disposable database and real HTTP server."""
import os
import subprocess
import sys

TEST_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(TEST_DIR))
sys.path.insert(0, TEST_DIR)
from test_creative_boards_contract import CreativeBoardsContractTest

CreativeBoardsContractTest.setUpClass()
try:
    env = dict(os.environ, MOOD_QA_URL=CreativeBoardsContractTest.base)
    subprocess.run(['node', os.path.join(TEST_DIR, 'moodboard_browser_qa.cjs')], env=env, check=True)
finally:
    CreativeBoardsContractTest.tearDownClass()
