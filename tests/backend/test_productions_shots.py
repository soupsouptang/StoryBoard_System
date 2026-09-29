"""Pytest Suite for Productions, Shots, Soft Delete, Reordering, and Revision Conflicts."""
import os
import sys
from pathlib import Path
import pytest
from httpx import ASGITransport, AsyncClient

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "apps" / "api"))

from main import app
from app.core.database import Base, async_engine, AsyncSessionLocal
from app.services.seed import seed_database


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


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
async def test_production_and_shot_pipeline():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Login as Admin
        login_res = await client.post("/api/v1/auth/login", json={
            "email": "admin@company.internal",
            "password": "FrameForge2026!Admin"
        })
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Development/test seed initializes required roles/admin only. Product
        # demo data is explicit opt-in and must not pollute a normal test run.
        empty_list = await client.get("/api/v1/productions", headers=headers)
        assert empty_list.status_code == 200
        assert empty_list.json() == []

        # 2. Create Production
        p_res = await client.post("/api/v1/productions", headers=headers, json={
            "name": "2026 电影概念先导片",
            "template_type": "film",
            "fps_num": 24,
            "aspect_ratio": "2.39:1"
        })
        assert p_res.status_code == 201
        prod_data = p_res.json()
        pid = prod_data["id"]

        # 3. Create Shot with Production Method
        s_res = await client.post(f"/api/v1/productions/{pid}/shots", headers=headers, json={
            "display_number": "001",
            "name": "星际港口特写",
            "description": "【实拍+包装】飞船缓缓滑入对接舱。",
            "primary_method": "live",
            "secondary_methods": ["ae", "vfx"],
            "duration_frames": 96,
            "lens_mm": 50.0
        })
        assert s_res.status_code == 201
        shot_data = s_res.json()
        sid = shot_data["id"]
        assert shot_data["revision"] == 1
        assert shot_data["primary_method"] == "live"

        # 4. Patch Shot with Correct Revision -> Success
        patch_res = await client.patch(f"/api/v1/shots/{sid}", headers=headers, json={
            "revision": 1,
            "changes": {"lens_mm": 85.0, "status": "ready"}
        })
        assert patch_res.status_code == 200
        updated_shot = patch_res.json()
        assert updated_shot["revision"] == 2
        assert updated_shot["lens_mm"] == 85.0

        # 5. Patch Shot with Stale Revision -> 409 Conflict
        conflict_res = await client.patch(f"/api/v1/shots/{sid}", headers=headers, json={
            "revision": 1,  # Stale! Server is now at revision 2
            "changes": {"lens_mm": 35.0}
        })
        assert conflict_res.status_code == 409
        err = conflict_res.json()
        assert err["error"]["code"] == "SHOT_REVISION_CONFLICT"

        # 6. Reorder Transaction
        reorder_res = await client.post("/api/v1/shots/reorder", headers=headers, json={
            "items": [{"id": sid, "sort_index": 1500.0}]
        })
        assert reorder_res.status_code == 200

        # 7. Soft Delete Shot
        del_res = await client.delete(f"/api/v1/shots/{sid}", headers=headers)
        assert del_res.status_code == 204

        # Verify Shot is filtered out after soft delete
        list_res = await client.get(f"/api/v1/productions/{pid}/shots", headers=headers)
        assert len(list_res.json()) == 0

        # 8. Trash list exposes the soft-deleted shot.
        trash_res = await client.get(f"/api/v1/productions/{pid}/shots/trash", headers=headers)
        assert trash_res.status_code == 200
        trash_rows = trash_res.json()
        assert [row["id"] for row in trash_rows] == [sid]

        # 9. Restore returns the authoritative bumped revision and makes the shot visible again.
        restore_res = await client.post(f"/api/v1/shots/{sid}/restore", headers=headers)
        assert restore_res.status_code == 200
        restored = restore_res.json()
        assert restored["id"] == sid
        assert restored["revision"] == 3

        list_after_restore = await client.get(f"/api/v1/productions/{pid}/shots", headers=headers)
        assert len(list_after_restore.json()) == 1
        assert list_after_restore.json()[0]["revision"] == 3

        # 10. Purge is only reachable after the shot is back in Trash.
        del_again = await client.delete(f"/api/v1/shots/{sid}", headers=headers)
        assert del_again.status_code == 204
        purge_res = await client.delete(f"/api/v1/shots/{sid}/purge", headers=headers)
        assert purge_res.status_code == 204

        trash_after_purge = await client.get(f"/api/v1/productions/{pid}/shots/trash", headers=headers)
        assert trash_after_purge.status_code == 200
        assert trash_after_purge.json() == []