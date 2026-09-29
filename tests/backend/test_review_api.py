"""VNext review comment and decision integration contract."""
import sys
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "apps" / "api"))

from main import app
from app.core.config import settings
from app.core.database import Base, AsyncSessionLocal, async_engine
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
async def test_review_comment_and_decision_pipeline():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        login = await client.post("/api/v1/auth/login", json={
            "email": "admin@company.internal",
            "password": settings.INITIAL_ADMIN_PASSWORD,
        })
        assert login.status_code == 200
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

        production = await client.post("/api/v1/productions", headers=headers, json={
            "name": "Review Contract",
            "template_type": "film",
            "fps_num": 24,
            "aspect_ratio": "2.39:1",
        })
        assert production.status_code == 201
        pid = production.json()["id"]

        shot = await client.post(f"/api/v1/productions/{pid}/shots", headers=headers, json={
            "display_number": "001",
            "name": "审片镜头",
            "description": "原始画面说明",
        })
        assert shot.status_code == 201
        sid = shot.json()["id"]
        assert shot.json()["revision"] == 1

        created_comment = await client.post(
            f"/api/v1/shots/{sid}/comments",
            headers=headers,
            json={
                "body": "节奏可以再紧一点",
                "timecode": "01:00:01:12",
                "quote_field": "description",
                "quote_text": "原始画面说明",
            },
        )
        assert created_comment.status_code == 201
        comment = created_comment.json()
        cid = comment["id"]
        assert comment["body"] == "节奏可以再紧一点"
        assert comment["shot_id"] == sid
        assert comment["author_name"]

        listed = await client.get(f"/api/v1/shots/{sid}/comments", headers=headers)
        assert listed.status_code == 200
        assert [row["id"] for row in listed.json()] == [cid]

        updated = await client.patch(
            f"/api/v1/comments/{cid}",
            headers=headers,
            json={"body": "节奏再紧一点，并缩短尾部停顿"},
        )
        assert updated.status_code == 200
        assert updated.json()["body"].startswith("节奏再紧")

        resolved = await client.post(
            f"/api/v1/comments/{cid}/resolve",
            headers=headers,
            json={"resolved": True},
        )
        assert resolved.status_code == 200
        assert resolved.json()["is_resolved"] is True

        submit = await client.post(
            f"/api/v1/shots/{sid}/review-decisions",
            headers=headers,
            json={"revision": 1, "action": "submit"},
        )
        assert submit.status_code == 200
        assert submit.json()["changed"] is True
        assert submit.json()["status"] == "review"
        assert submit.json()["revision"] == 2
        assert submit.json()["decision"]["action_label"] == "提交意见"

        stale = await client.post(
            f"/api/v1/shots/{sid}/review-decisions",
            headers=headers,
            json={"revision": 1, "action": "approve"},
        )
        assert stale.status_code == 409
        assert stale.json()["error"]["code"] == "SHOT_REVISION_CONFLICT"

        approve = await client.post(
            f"/api/v1/shots/{sid}/review-decisions",
            headers=headers,
            json={"revision": 2, "action": "approve"},
        )
        assert approve.status_code == 200
        assert approve.json()["status"] == "approved"
        assert approve.json()["revision"] == 3
        assert approve.json()["decision"]["action_label"] == "同意意见"

        decisions = await client.get(
            f"/api/v1/shots/{sid}/review-decisions",
            headers=headers,
        )
        assert decisions.status_code == 200
        assert [row["action_label"] for row in decisions.json()] == ["提交意见", "同意意见"]

        deleted = await client.delete(f"/api/v1/comments/{cid}", headers=headers)
        assert deleted.status_code == 204

        after_delete = await client.get(f"/api/v1/shots/{sid}/comments", headers=headers)
        assert after_delete.status_code == 200
        assert after_delete.json() == []
