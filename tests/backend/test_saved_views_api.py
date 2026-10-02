"""Integration coverage for server-persisted saved views."""
from pathlib import Path
import sys

import pytest
from httpx import ASGITransport, AsyncClient

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "apps" / "api"))

from main import app
from app.core.config import settings
from app.core.database import Base, AsyncSessionLocal, async_engine
from app.services.seed import seed_database
from sqlalchemy import func, select
from app.models.command import OutboxEvent


@pytest.fixture(autouse=True)
async def setup_db():
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as session:
        await seed_database(session)
        await session.commit()
    yield


@pytest.mark.asyncio
async def test_shared_dimensions_revisions_row_scope_and_atomic_outbox():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        login = await client.post("/api/v1/auth/login", json={"email": settings.INITIAL_ADMIN_EMAIL, "password": settings.INITIAL_ADMIN_PASSWORD})
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        a = (await client.post("/api/v1/productions", headers=headers, json={"name": "Shared dimensions"})).json()
        b = (await client.post("/api/v1/productions", headers=headers, json={"name": "Other scope"})).json()
        shot = (await client.post(f"/api/v1/productions/{a['id']}/shots", headers=headers, json={"display_number": "001"})).json()
        other = (await client.post(f"/api/v1/productions/{b['id']}/shots", headers=headers, json={"display_number": "001"})).json()
        root = f"/api/v1/productions/{a['id']}/saved-views"
        config = {"presentation": {"columnWidths": {"description": 320}, "columnWidthModes": {"description": "manual"}}}
        created = await client.post(root, headers=headers, json={"name": "Shared table", "config": config, "row_height_mode": "manual", "manual_row_height_px": 64,
            "row_layouts": [{"shot_id": shot['id'], "height_mode": "manual", "manual_height_px": 96}]})
        assert created.status_code == 201, created.text
        view = created.json()
        assert view['is_shared'] and view['manual_row_height_px'] == 64
        assert view['row_layouts'] == [{"shot_id": shot['id'], "height_mode": "manual", "manual_height_px": 96}]
        url = root + '/' + view['id']
        for bad in ({"columnHeights": {"description": 60}}, {"columnWidths": {"description": -1}}, {"columnWidthModes": {"description": {}}}):
            invalid = await client.patch(url, headers=headers, json={"revision": 1, "config": {"presentation": bad}})
            assert invalid.status_code == 400, invalid.text
        invalid_row = await client.patch(url, headers=headers, json={"revision": 1, "name": "Must rollback", "row_layouts": [{"shot_id": other['id'], "manual_height_px": 80}]})
        assert invalid_row.status_code == 400
        listed = (await client.get(root, headers=headers)).json()[0]
        assert listed['name'] == "Shared table" and listed['revision'] == 1
        noop = await client.patch(url, headers=headers, json={"revision": 1, "row_layouts": [{"shot_id": shot['id'], "manual_height_px": 96}]})
        assert noop.status_code == 200 and noop.json()['revision'] == 1
        changed = await client.patch(url, headers=headers, json={"revision": 1, "row_height_mode": "auto", "row_layouts": [{"shot_id": shot['id'], "height_mode": "auto"}]})
        assert changed.status_code == 200, changed.text
        assert changed.json()['row_layouts'] == [] and changed.json()['manual_row_height_px'] is None
        assert changed.json()['measurement_generation'] == 1
        stale = await client.patch(url, headers=headers, json={"revision": 1, "manual_row_height_px": 80})
        assert stale.status_code == 409
        async with AsyncSessionLocal() as db:
            count = await db.scalar(select(func.count()).select_from(OutboxEvent))
            assert count == 2  # create + successful change; failed/no-op commands emit nothing
            events = list((await db.execute(select(OutboxEvent))).scalars())
            assert all(event.published_at is None for event in events)
            assert all("Shared table" not in str(event.entity_ids) for event in events)


@pytest.mark.asyncio
async def test_saved_view_crud_is_revision_aware_and_noop_safe():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        login = await client.post("/api/v1/auth/login", json={
            "email": settings.INITIAL_ADMIN_EMAIL,
            "password": settings.INITIAL_ADMIN_PASSWORD,
        })
        assert login.status_code == 200
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

        production = await client.post("/api/v1/productions", headers=headers, json={
            "name": "Saved View Contract",
            "template_type": "film",
            "fps_num": 24,
            "aspect_ratio": "16:9",
        })
        assert production.status_code == 201
        production_id = production.json()["id"]

        config = {
            "presentation": {
                "version": 1,
                "columnOrder": ["description", "voice_over", "status"],
                "hiddenColumns": ["owner_id"],
                "columnWidths": {"description": 320},
                "rowHeight": "compact",
            },
            "filters": {
                "searchQuery": "night",
                "primaryMethod": "live",
                "department": "Camera",
                "status": "review",
            },
            "sort": {"key": "description", "direction": "asc"},
        }

        created = await client.post(
            f"/api/v1/productions/{production_id}/saved-views",
            headers=headers,
            json={
                "name": "Director Review",
                "view_type": "table",
                "is_shared": True,
                "config": config,
            },
        )
        assert created.status_code == 201
        view = created.json()
        assert view["name"] == "Director Review"
        assert view["revision"] == 1
        assert view["config"] == config

        listed = await client.get(
            f"/api/v1/productions/{production_id}/saved-views",
            headers=headers,
        )
        assert listed.status_code == 200
        assert [item["id"] for item in listed.json()] == [view["id"]]

        noop = await client.patch(
            f"/api/v1/productions/{production_id}/saved-views/{view['id']}",
            headers=headers,
            json={
                "revision": 1,
                "name": "Director Review",
                "is_shared": True,
                "config": config,
            },
        )
        assert noop.status_code == 200
        assert noop.json()["revision"] == 1

        changed_config = {
            **config,
            "sort": {"key": "status", "direction": "desc"},
        }
        updated = await client.patch(
            f"/api/v1/productions/{production_id}/saved-views/{view['id']}",
            headers=headers,
            json={
                "revision": 1,
                "name": "Director Review v2",
                "config": changed_config,
            },
        )
        assert updated.status_code == 200
        assert updated.json()["revision"] == 2
        assert updated.json()["name"] == "Director Review v2"
        assert updated.json()["config"]["sort"]["key"] == "status"

        stale = await client.patch(
            f"/api/v1/productions/{production_id}/saved-views/{view['id']}",
            headers=headers,
            json={
                "revision": 1,
                "name": "stale",
            },
        )
        assert stale.status_code == 409
        assert stale.json()["error"]["code"] == "SAVED_VIEW_REVISION_CONFLICT"

        deleted = await client.delete(
            f"/api/v1/productions/{production_id}/saved-views/{view['id']}",
            headers=headers,
        )
        assert deleted.status_code == 204

        after_delete = await client.get(
            f"/api/v1/productions/{production_id}/saved-views",
            headers=headers,
        )
        assert after_delete.status_code == 200
        assert after_delete.json() == []
