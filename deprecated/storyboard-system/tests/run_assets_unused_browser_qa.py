"""Real browser asset cleanup count check against a disposable local server."""
import os
import subprocess
import sys
import uuid
from pathlib import Path

TEST_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(TEST_DIR.parent))
sys.path.insert(0, str(TEST_DIR))
from test_asset_cleanup_contract import AssetCleanupContractTest

AssetCleanupContractTest.setUpClass()
fixture = AssetCleanupContractTest("test_preview_requires_auth_and_cleanup_requires_csrf")
try:
    fixture.setUp()
    protected = fixture.add_asset("protected-panel.png")
    deletable = fixture.add_asset("deletable.png")
    with fixture.app.connect() as db:
        at = fixture.app.now_iso()
        db.execute(
            "INSERT INTO panels (id, shot_id, position, media_id, created_at, updated_at) VALUES (?, ?, 0, ?, ?, ?)",
            (str(uuid.uuid4()), fixture.sid, protected, at, at),
        )
    env = dict(os.environ, ASSET_QA_URL=fixture.base,
               ASSET_QA_PROJECT_ID=fixture.pid,
               ASSET_QA_PROTECTED_ID=protected,
               ASSET_QA_DELETABLE_ID=deletable)
    subprocess.run(["node", str(TEST_DIR / "assets_unused_browser_qa.cjs")],
                   cwd=TEST_DIR.parent, env=env, check=True)
finally:
    AssetCleanupContractTest.tearDownClass()
