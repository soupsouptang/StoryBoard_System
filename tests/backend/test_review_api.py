"""Integration coverage for canonical review comments and decisions."""
from pathlib import Path
import sys

import pytest
from httpx import ASGITransport, AsyncClient

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "apps" / "api"))

from main import app
from app.core.config import settings
from app.core.database import Base, AsyncSessionLocal, async_engine
from app.services.seed import seed_database


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
async def test_review_comments_and_decisions_are_persistent_and_revision_aware():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        login = await client.post("/api/v1/auth/login", json={
            "email": settings.INITIAL_ADMIN_EMAIL,
            "password": settings.INITIAL_ADMIN_PASSWORD,
        })
        assert login.status_code == 200
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

        production = await client.post("/api/v1/productions", headers=headers, json={
            "name": "Review Contract",
            "template_type": "film",
            "fps_num": 24,
            "aspect_ratio": "16:9",
        })
        assert production.status_code == 201
        production_id = production.json()["id"]

        shot = await client.post(
            f"/api/v1/productions/{production_id}/shots",
            headers=headers,
            json={
                "display_number": "001",
                "name": "Review Shot",
                "description": "Baseline frame description",
            },
        )
        assert shot.status_code == 201
        shot_id = shot.json()["id"]
        assert shot.json()["revision"] == 1
        assert shot.json()["status"] == "draft"

        created_comment = await client.post(
            f"/api/v1/shots/{shot_id}/comments",
            headers=headers,
            json={
                "body": "调整画面节奏",
                "quote_field": "description",
            },
        )
        assert created_comment.status_code == 201
        comment = created_comment.json()
        assert comment["body"] == "调整画面节奏"
        assert comment["quote_text"] == "Baseline frame description"
        assert comment["is_resolved"] is False

        comments = await client.get(f"/api/v1/shots/{shot_id}/comments", headers=headers)
        assert comments.status_code == 200
        assert [item["id"] for item in comments.json()] == [comment["id"]]

        edited = await client.patch(
            f"/api/v1/comments/{comment['id']}",
            headers=headers,
            json={"body": "调整画面节奏并缩短尾部停顿"},
        )
        assert edited.status_code == 200
        assert edited.json()["body"] == "调整画面节奏并缩短尾部停顿"

        resolved = await client.post(
            f"/api/v1/comments/{comment['id']}/resolve",
            headers=headers,
            json={"resolved": True},
        )
        assert resolved.status_code == 200
        assert resolved.json()["is_resolved"] is True

        reopened = await client.post(
            f"/api/v1/comments/{comment['id']}/resolve",
            headers=headers,
            json={"resolved": False},
        )
        assert reopened.status_code == 200
        assert reopened.json()["is_resolved"] is False

        submitted = await client.post(
            f"/api/v1/shots/{shot_id}/review-decisions",
            headers=headers,
            json={"revision": 1, "action": "submit", "version_id": None},
        )
        assert submitted.status_code == 200
        assert submitted.json()["changed"] is True
        assert submitted.json()["status"] == "review"
        assert submitted.json()["revision"] == 2
        assert submitted.json()["decision"]["action_label"] == "提交意见"

        stale_approve = await client.post(
            f"/api/v1/shots/{shot_id}/review-decisions",
            headers=headers,
            json={"revision": 1, "action": "approve", "version_id": None},
        )
        assert stale_approve.status_code == 409
        assert stale_approve.json()["error"]["code"] == "SHOT_REVISION_CONFLICT"

        approved = await client.post(
            f"/api/v1/shots/{shot_id}/review-decisions",
            headers=headers,
            json={"revision": 2, "action": "approve", "version_id": None},
        )
        assert approved.status_code == 200
        assert approved.json()["status"] == "approved"
        assert approved.json()["revision"] == 3
        assert approved.json()["decision"]["action_label"] == "同意意见"

        decisions = await client.get(
            f"/api/v1/shots/{shot_id}/review-decisions",
            headers=headers,
        )
        assert decisions.status_code == 200
        assert [item["action_label"] for item in decisions.json()] == ["同意意见", "提交意见"]

        deleted = await client.delete(f"/api/v1/comments/{comment['id']}", headers=headers)
        assert deleted.status_code == 204
        comments_after_delete = await client.get(
            f"/api/v1/shots/{shot_id}/comments",
            headers=headers,
        )
        assert comments_after_delete.status_code == 200
        assert comments_after_delete.json() == []