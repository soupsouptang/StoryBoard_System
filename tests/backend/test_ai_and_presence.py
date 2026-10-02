"""Pytest Suite for AI Proposals (Human-In-The-Loop) and Presence/Cell Locking."""
import sys
from pathlib import Path
import pytest
from httpx import ASGITransport, AsyncClient

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "apps" / "api"))

from main import app
from app.core.config import settings
from app.core.database import AsyncSessionLocal, Base, async_engine
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
async def test_ai_status_and_proposal_pipeline():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Login
        login_res = await client.post("/api/v1/auth/login", json={
            "email": "admin@company.internal",
            "password": settings.INITIAL_ADMIN_PASSWORD
        })
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Check AI status
        status_res = await client.get("/api/v1/ai/status", headers=headers)
        assert status_res.status_code == 200
        ai_meta = status_res.json()
        assert "supported_capabilities" in ai_meta

        # 3. Create Production & Shot
        p_res = await client.post("/api/v1/productions", headers=headers, json={
            "name": "AI 协作测试项目",
            "template_type": "commercial",
            "fps_num": 25,
            "aspect_ratio": "16:9"
        })
        pid = p_res.json()["id"]

        s_res = await client.post(f"/api/v1/productions/{pid}/shots", headers=headers, json={
            "display_number": "001",
            "name": "AI 提议目标镜头",
            "description": "原始镜头描述文本",
            "duration_frames": 75,
            "timing_locked": False
        })
        sid = s_res.json()["id"]
        assert s_res.json()["duration_frames"] == 75

        # 4. Generate AI Proposal (Human-In-The-Loop)
        prop_res = await client.post("/api/v1/ai/proposals/generate", headers=headers, json={
            "production_id": pid,
            "capability": "voice_alignment",
            "target_shot_id": sid,
            "parameters": {"target_dialogue": "测试台词对齐"}
        })
        assert prop_res.status_code == 201
        prop_data = prop_res.json()
        proposal_id = prop_data["id"]
        assert prop_data["status"] == "pending_review"
        assert prop_data["target_shot_id"] == sid
        assert prop_data["proposed_changes"]["duration_frames"] == 150

        # Verify Shot in DB is still untouched (no direct mutation)
        shots_res = await client.get(f"/api/v1/productions/{pid}/shots", headers=headers)
        current_shot = [s for s in shots_res.json() if s["id"] == sid][0]
        assert current_shot["duration_frames"] == 75

        # 5. Review Proposal - Accept
        rev_res = await client.post(f"/api/v1/ai/proposals/{proposal_id}/review", headers=headers, json={
            "action": "accept",
            "review_notes": "确认AI声画对齐时长调整"
        })
        assert rev_res.status_code == 200
        assert rev_res.json()["status"] == "accepted"

        # 6. Verify Shot in DB is now updated atomically
        shots_res_after = await client.get(f"/api/v1/productions/{pid}/shots", headers=headers)
        updated_shot = [s for s in shots_res_after.json() if s["id"] == sid][0]
        assert updated_shot["duration_frames"] == 150
        assert updated_shot["timing_locked"] is True
        assert updated_shot["revision"] == 2


@pytest.mark.asyncio
async def test_presence_and_cell_lock_pipeline():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Login Admin
        login_res = await client.post("/api/v1/auth/login", json={
            "email": "admin@company.internal",
            "password": settings.INITIAL_ADMIN_PASSWORD
        })
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        pid = "test-prod-collab-001"

        # 2. Heartbeat to join room
        hb_res = await client.post(f"/api/v1/presence/rooms/{pid}/heartbeat", headers=headers, json={
            "session_id": "sess-user-admin",
            "color": "#3B82F6",
            "state": "viewing"
        })
        assert hb_res.status_code == 200

        # 3. Snapshot
        snap_res = await client.get(f"/api/v1/presence/rooms/{pid}", headers=headers)
        assert snap_res.status_code == 200
        snap = snap_res.json()
        assert snap["active_user_count"] >= 1
        assert snap["sessions"][0]["session_id"] == "sess-user-admin"

        # 4. Acquire Lock
        lock_res = await client.post(f"/api/v1/presence/rooms/{pid}/lock", headers=headers, json={
            "shot_id": "shot-123",
            "field_name": "dialogue"
        })
        assert lock_res.status_code == 200
        assert lock_res.json()["ok"] is True

        # 5. Check Room Snapshot contains Lock
        snap2 = (await client.get(f"/api/v1/presence/rooms/{pid}", headers=headers)).json()
        assert len(snap2["locks"]) == 1
        assert snap2["locks"][0]["field_name"] == "dialogue"

        # 6. Release Lock
        unlock_res = await client.post(f"/api/v1/presence/rooms/{pid}/unlock", headers=headers, json={
            "shot_id": "shot-123",
            "field_name": "dialogue"
        })
        assert unlock_res.status_code == 200
        assert unlock_res.json()["released"] is True

        # 7. Check Lock Released in Snapshot
        snap3 = (await client.get(f"/api/v1/presence/rooms/{pid}", headers=headers)).json()
        assert len(snap3["locks"]) == 0
