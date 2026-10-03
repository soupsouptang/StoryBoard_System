"""Native board command integration; synthetic projects and media only."""
import sys
from pathlib import Path
from types import SimpleNamespace
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "apps" / "api"))
from main import app
from app.api.v1.deps import get_current_user
from app.core.config import settings
from app.core.database import Base, AsyncSessionLocal, async_engine
from app.models.command import OutboxEvent
from app.models.history import HistoryEntry
from app.services.project_snapshot import capture_project, content_hash
from app.services.seed import seed_database


@pytest.fixture(autouse=True)
async def setup_db():
    async with async_engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
        await connection.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as db:
        await seed_database(db)
        await db.commit()
    yield
    app.dependency_overrides.clear()


async def setup(client):
    login = await client.post("/api/v1/auth/login", json={"email": settings.INITIAL_ADMIN_EMAIL, "password": settings.INITIAL_ADMIN_PASSWORD})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    production = (await client.post("/api/v1/productions", headers=headers, json={"name": "Board synthetic test"})).json()
    return headers, production["id"], f"/api/v1/productions/{production['id']}/boards"


@pytest.mark.asyncio
async def test_history_conflict_noop_branch_and_reload():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers, production, root = await setup(client)
        created = await client.post(root, headers=headers, json={"kind": "lighting", "name": "Lighting1"})
        assert created.status_code == 201, created.text
        board = created.json()
        url = root+"/"+board["id"]
        objects = [{"id": "light1", "type": "light", "x": 200, "y": 300, "z": 250, "rotation": 30}]
        patched = await client.patch(url, headers=headers, json={"revision": 1, "objects": objects})
        assert patched.status_code == 200, patched.text
        history_url = f"/api/v1/productions/{production}/history"
        state = (await client.get(history_url, headers=headers)).json()
        assert state["can_undo"] and state["undo_count"] == 2
        assert (await client.patch(url, headers=headers, json={"revision": 1, "name": "stale"})).status_code == 409
        noop = await client.patch(url, headers=headers, json={"revision": 2, "objects": patched.json()["objects"]})
        assert noop.json()["revision"] == 2
        undone = await client.post(url+"/undo", headers=headers, json={"revision": 2, "history_revision": state["revision"]})
        assert undone.status_code == 200 and undone.json()["objects"] == []
        state = (await client.get(history_url, headers=headers)).json()
        assert state["can_redo"]
        redone = await client.post(url+"/redo", headers=headers, json={"revision": 3, "history_revision": state["revision"]})
        assert redone.status_code == 200 and redone.json()["objects"][0]["x"] == 200
        state = (await client.get(history_url, headers=headers)).json()
        await client.post(url+"/undo", headers=headers, json={"revision": 4, "history_revision": state["revision"]})
        await client.patch(url, headers=headers, json={"revision": 5, "name": "new branch"})
        state = (await client.get(history_url, headers=headers)).json()
        assert (await client.post(url+"/redo", headers=headers, json={"revision": 6, "history_revision": state["revision"]})).status_code == 400
        reloaded = (await client.get(url, headers=headers)).json()
        assert reloaded["name"] == "new branch" and reloaded["objects"] == []
        async with AsyncSessionLocal() as db:
            assert await db.scalar(select(func.count()).select_from(OutboxEvent)) == 6
            assert await db.scalar(select(func.count()).select_from(HistoryEntry)) == 2


@pytest.mark.asyncio
async def test_kind_scopes_links_and_readonly_permission():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers, production, root = await setup(client)
        other = (await client.post("/api/v1/productions", headers=headers, json={"name": "Other"})).json()["id"]
        shot = (await client.post(f"/api/v1/productions/{other}/shots", headers=headers, json={"display_number": "001"})).json()
        invalid = await client.post(root, headers=headers, json={"kind": "lighting", "name": "a", "shot_ids": [shot["id"]]})
        assert invalid.status_code == 400
        board = (await client.post(root, headers=headers, json={"kind": "moodboard", "name": "mood"})).json()
        assert (await client.get(f"/api/v1/productions/{other}/boards/{board['id']}", headers=headers)).status_code == 404
        assert (await client.patch(root+"/"+board["id"], headers=headers, json={"revision": 1, "objects": [{"id": "x", "type": "light"}]})).status_code == 400
        assert (await client.patch(root+"/"+board["id"], headers=headers, json={"revision": 1, "objects": [{"id": "x", "type": "link", "url": "javascript:alert(1)"}]})).status_code == 422
        app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id="reader", role=SimpleNamespace(permissions={"production.read": True}))
        assert (await client.get(root, headers=headers)).status_code == 200
        assert (await client.patch(root+"/"+board["id"], headers=headers, json={"revision": 1, "name": "denied"})).status_code == 403


@pytest.mark.asyncio
async def test_mood_exclusion_lighting_compare_and_confirmed_purge():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers, production, root = await setup(client)
        async with AsyncSessionLocal() as db:
            initial = content_hash(await capture_project(db, production))
        mood = (await client.post(root, headers=headers, json={"kind": "moodboard", "name": "mood"})).json()
        async with AsyncSessionLocal() as db:
            assert content_hash(await capture_project(db, production)) == initial
        light = (await client.post(root, headers=headers, json={"kind": "lighting", "name": "light"})).json()
        async with AsyncSessionLocal() as db:
            snapshot = await capture_project(db, production)
            assert light["id"] in snapshot["sections"]["lighting_boards"]
            assert content_hash(snapshot) != initial
        url = root+"/"+light["id"]
        assert (await client.delete(url+"?revision=1&permanent=true&confirm=true", headers=headers)).status_code == 400
        deleted = await client.delete(url+"?revision=1", headers=headers)
        assert deleted.status_code == 200 and deleted.json()["deleted_at"]
        assert (await client.get(root+"?state=trashed", headers=headers)).json()[0]["id"] == light["id"]
        assert (await client.delete(url+"?revision=2&permanent=true", headers=headers)).status_code == 400
        restored = await client.post(url+"/restore", headers=headers, json={"revision": 2})
        assert restored.status_code == 200
        await client.delete(url+"?revision=3", headers=headers)
        purged = await client.delete(url+"?revision=4&permanent=true&confirm=true", headers=headers)
        assert purged.status_code == 200
        assert (await client.post(url+"/restore", headers=headers, json={"revision": 4})).status_code == 404
        async with AsyncSessionLocal() as db:
            assert light["id"] not in (await capture_project(db, production))["sections"]["lighting_boards"]


@pytest.mark.asyncio
async def test_media_pins_survive_undo_and_object_lock_is_enforced(tmp_path, monkeypatch):
    import importlib
    from io import BytesIO
    from PIL import Image
    from app.models.board import BoardAssetReference
    import app.services.panel_media_service as media_service
    monkeypatch.setattr(importlib.import_module("app.api.v1.assets"), "MEDIA_ROOT", tmp_path)
    monkeypatch.setattr(media_service, "MEDIA_ROOT", tmp_path)
    image = BytesIO()
    Image.new("RGB", (160, 90), "blue").save(image, format="PNG")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers, production, root = await setup(client)
        asset_root = f"/api/v1/productions/{production}/assets"
        uploaded = await client.post(asset_root+"/images", headers=headers, files={"image": ("synthetic.png", image.getvalue(), "image/png")})
        assert uploaded.status_code == 201, uploaded.text
        asset_id = uploaded.json()["asset_id"]
        versions = (await client.get(asset_root+f"/{asset_id}/image-versions", headers=headers)).json()
        version_id = versions[0]["id"]
        board = (await client.post(root, headers=headers, json={"kind": "moodboard", "name": "Images", "objects": [
            {"id": "photo", "type": "image", "asset_version_id": version_id, "locked": True}]})).json()
        url = root+"/"+board["id"]
        changed = {**board["objects"][0], "x": 500}
        assert (await client.patch(url, headers=headers, json={"revision": 1, "objects": [changed]})).status_code == 400
        unlocked = await client.patch(url, headers=headers, json={"revision": 1, "objects": [{**board["objects"][0], "locked": False}]})
        assert unlocked.status_code == 200
        assert (await client.get(url+f"/media/{version_id}", headers=headers)).status_code == 200
        assert (await client.get(url+"/media/unrelated-version", headers=headers)).status_code == 404
        removed = await client.patch(url, headers=headers, json={"revision": 2, "objects": []})
        assert removed.status_code == 200
        refs = (await client.get(asset_root+f"/{asset_id}/references", headers=headers)).json()
        assert refs["reference_board_count"] == 1
        asset_deleted = await client.delete(asset_root+f"/{asset_id}?revision=1", headers=headers)
        assert asset_deleted.status_code == 400 and asset_deleted.json()["error"]["code"] == "ASSET_IN_USE"
        async with AsyncSessionLocal() as db:
            assert await db.scalar(select(func.count()).select_from(BoardAssetReference)) == 1
