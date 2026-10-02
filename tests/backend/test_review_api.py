"""Integration coverage for canonical review comments and decisions."""
from pathlib import Path
import sys

import pytest
from sqlalchemy import select
from httpx import ASGITransport, AsyncClient

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "apps" / "api"))

from main import app
from app.core.config import settings
from app.core.database import Base, AsyncSessionLocal, async_engine
from app.services.seed import seed_database


@pytest.mark.asyncio
async def test_personal_watermarks_colors_revisions_and_atomic_activity():
    from app.models.collaboration import CommentEvent
    from app.models.command import OutboxEvent
    from app.models.shot import Shot
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        login = (await client.post("/api/v1/auth/login", json={"email": settings.INITIAL_ADMIN_EMAIL, "password": settings.INITIAL_ADMIN_PASSWORD})).json()
        author = {"Authorization": "Bearer " + login["access_token"]}
        registered = await client.post("/api/v1/auth/register", json={"email": "reader@example.com", "password": "synthetic-only-password"})
        assert registered.status_code == 201, registered.text
        reader_login = registered.json()
        reader = {"Authorization": "Bearer " + reader_login["access_token"]}
        assert reader_login["user"]["annotation_color"].startswith("#")
        project = (await client.post("/api/v1/productions", headers=author, json={"name": "Personal activity synthetic"})).json()
        shot = (await client.post(f"/api/v1/productions/{project['id']}/shots", headers=author, json={"display_number": "001"})).json()
        path = f"/api/v1/shots/{shot['id']}/comments"
        root = (await client.post(path, headers=author, json={"body": "root fixture"})).json()
        assert (root["revision"], root["event_seq"], root["last_activity_seq"]) == (1, 1, 1)
        reply = await client.post(path, headers=reader, json={"body": "reply fixture", "parent_id": root["id"]})
        assert reply.status_code == 201, reply.text
        assert reply.json()["last_activity_seq"] == 2
        state_path = path + "/read-state"
        assert (await client.get(state_path, headers=reader)).json()["unread_count"] == 2
        assert (await client.patch(state_path, headers=author, json={"through_seq": 2})).json()["unread_count"] == 0
        assert (await client.get(state_path, headers=reader)).json()["last_read_seq"] == 0
        assert (await client.patch(state_path, headers=reader, json={"through_seq": 99})).status_code == 400
        root_path = f"/api/v1/comments/{root['id']}"
        assert (await client.patch(root_path, headers=reader, json={"body": "not owned", "revision": 1})).status_code == 403
        edited = await client.patch(root_path, headers=author, json={"body": "edited fixture", "revision": 1})
        assert edited.status_code == 200, edited.text
        assert (edited.json()["revision"], edited.json()["last_activity_seq"]) == (2, 3)
        assert (await client.patch(root_path, headers=author, json={"body": "edited fixture", "revision": 2})).json()["revision"] == 2
        stale = await client.patch(root_path, headers=author, json={"body": "lost write", "revision": 1})
        assert stale.status_code == 409 and stale.json()["error"]["code"] == "COMMENT_REVISION_CONFLICT"
        resolved = await client.post(root_path + "/resolve", headers=reader, json={"resolved": True, "revision": 2})
        assert resolved.status_code == 200 and resolved.json()["last_actor_id"] == reader_login["user"]["id"]
        # Resolution does not mark either person's unread state.
        assert (await client.get(state_path, headers=author)).json()["unread_count"] == 1
        assert (await client.get(state_path, headers=reader)).json()["unread_count"] == 2
        assert (await client.patch(state_path, headers=author, json={"through_seq": 1})).json()["last_read_seq"] == 2
        color = await client.patch("/api/v1/auth/me/style", headers=reader, json={"revision": 1, "annotation_color": "#ab23cd"})
        assert color.status_code == 200 and color.json()["annotation_color"] == "#AB23CD"
        assert (await client.patch("/api/v1/auth/me/style", headers=reader, json={"revision": 1, "annotation_color": "#123456"})).status_code == 409
        comments = (await client.get(path, headers=author)).json()
        assert comments[0]["last_actor_color"] == "#AB23CD" and comments[1]["author_color"] == "#AB23CD"
        assert (await client.delete(root_path + "?revision=2", headers=author)).status_code == 409
        assert (await client.delete(root_path + "?revision=3", headers=author)).status_code == 204
        assert (await client.get(state_path, headers=reader)).json()["unread_count"] == 1
        async with AsyncSessionLocal() as db:
            events = list((await db.execute(select(CommentEvent).where(CommentEvent.shot_id == shot["id"]).order_by(CommentEvent.seq))).scalars())
            assert [event.event_type for event in events] == ["create", "create", "edit", "resolve", "delete"]
            outbox = list((await db.execute(select(OutboxEvent).where(OutboxEvent.production_id == project["id"]))).scalars())
            assert len(outbox) == 5
            assert not any("fixture" in str(event.entity_ids) for event in outbox)
            persisted = await db.get(Shot, shot["id"])
            assert persisted.comment_event_seq == 5 and persisted.revision == 1


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
            json={"body": "调整画面节奏并缩短尾部停顿", "revision": 1},
        )
        assert edited.status_code == 200
        assert edited.json()["body"] == "调整画面节奏并缩短尾部停顿"

        resolved = await client.post(
            f"/api/v1/comments/{comment['id']}/resolve",
            headers=headers,
            json={"resolved": True, "revision": 2},
        )
        assert resolved.status_code == 200
        assert resolved.json()["is_resolved"] is True

        reopened = await client.post(
            f"/api/v1/comments/{comment['id']}/resolve",
            headers=headers,
            json={"resolved": False, "revision": 3},
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

        deleted = await client.delete(f"/api/v1/comments/{comment['id']}?revision=4", headers=headers)
        assert deleted.status_code == 204
        comments_after_delete = await client.get(
            f"/api/v1/shots/{shot_id}/comments",
            headers=headers,
        )
        assert comments_after_delete.status_code == 200
        assert comments_after_delete.json() == []
