"""Pytest Suite for Productions, Shots, Soft Delete, Reordering, and Revision Conflicts."""
import asyncio
import os
import sys
from datetime import datetime
from pathlib import Path
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "apps" / "api"))

from main import app
from app.core.config import settings
from app.core.database import Base, async_engine, AsyncSessionLocal
from app.models.asset import Asset, ShotAssetLink
from app.models.collaboration import AuditLog
from app.models.user import Role, User
from app.api.v1 import panel_media
from app.core.security import get_password_hash
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
            "password": settings.INITIAL_ADMIN_PASSWORD
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
            "production_id": pid,
            "base_order": [sid],
            "items": [{"id": sid, "sort_index": 1000.0, "revision": updated_shot["revision"]}]
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
        assert restored["revision"] == 4

        list_after_restore = await client.get(f"/api/v1/productions/{pid}/shots", headers=headers)
        assert len(list_after_restore.json()) == 1
        assert list_after_restore.json()[0]["revision"] == 4

        # 10. Purge is only reachable after the shot is back in Trash.
        del_again = await client.delete(f"/api/v1/shots/{sid}", headers=headers)
        assert del_again.status_code == 204
        purge_res = await client.delete(f"/api/v1/shots/{sid}/purge", headers=headers)
        assert purge_res.status_code == 204

        trash_after_purge = await client.get(f"/api/v1/productions/{pid}/shots/trash", headers=headers)
        assert trash_after_purge.status_code == 200
        assert trash_after_purge.json() == []


@pytest.mark.asyncio
async def test_readonly_role_cannot_mutate_shots_through_any_write_route():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        admin = await client.post("/api/v1/auth/login", json={
            "email": "admin@company.internal",
            "password": settings.INITIAL_ADMIN_PASSWORD,
        })
        admin_headers = {"Authorization": f"Bearer {admin.json()['access_token']}"}
        readonly = await client.post("/api/v1/auth/register", json={
            "email": "shot-reader@example.com",
            "password": "test-password",
            "role_name": "readonly",
        })
        assert readonly.status_code == 201
        readonly_headers = {"Authorization": f"Bearer {readonly.json()['access_token']}"}

        production = await client.post(
            "/api/v1/productions", headers=admin_headers, json={"name": "Shot Write Permission"}
        )
        production_id = production.json()["id"]
        created = await client.post(
            f"/api/v1/productions/{production_id}/shots",
            headers=admin_headers,
            json={"display_number": "001", "name": "Protected", "duration_frames": 24},
        )
        shot = created.json()
        shot_id = shot["id"]

        requests = [
            client.post(
                f"/api/v1/productions/{production_id}/shots",
                headers=readonly_headers,
                json={"display_number": "002", "name": "Denied"},
            ),
            client.patch(
                f"/api/v1/shots/{shot_id}",
                headers=readonly_headers,
                json={"revision": shot["revision"], "changes": {"name": "Denied"}},
            ),
            client.delete(f"/api/v1/shots/{shot_id}", headers=readonly_headers),
            client.post(f"/api/v1/shots/{shot_id}/restore", headers=readonly_headers),
            client.delete(f"/api/v1/shots/{shot_id}/purge", headers=readonly_headers),
            client.post(
                f"/api/v1/productions/{production_id}/shots/bulk-trash",
                headers=readonly_headers,
                json={"shot_ids": [shot_id]},
            ),
            client.post(
                "/api/v1/shots/reorder",
                headers=readonly_headers,
                json={"production_id": production_id, "base_order": [shot_id],
                      "items": [{"id": shot_id, "sort_index": 1000, "revision": shot["revision"]}]},
            ),
            client.post(
                "/api/v1/shots/bulk-update",
                headers=readonly_headers,
                json={"shot_ids": [shot_id], "updates": {"department": "art"},
                      "revisions": {shot_id: shot["revision"]}},
            ),
        ]
        responses = await asyncio.gather(*requests)
        assert [response.status_code for response in responses] == [403] * 8

        current = await client.get(
            f"/api/v1/productions/{production_id}/shots", headers=admin_headers
        )
        assert len(current.json()) == 1
        assert current.json()[0]["name"] == "Protected"


@pytest.mark.asyncio
async def test_review_approver_decision_uses_canonical_revision_and_audit_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        admin = await client.post("/api/v1/auth/login", json={
            "email": "admin@company.internal",
            "password": settings.INITIAL_ADMIN_PASSWORD,
        })
        admin_headers = {"Authorization": f"Bearer {admin.json()['access_token']}"}
        production = await client.post(
            "/api/v1/productions", headers=admin_headers, json={"name": "Review Approval Permission"}
        )
        production_id = production.json()["id"]
        created = await client.post(
            f"/api/v1/productions/{production_id}/shots",
            headers=admin_headers,
            json={"display_number": "001", "name": "Review Target", "duration_frames": 24},
        )
        shot_id = created.json()["id"]
        submitted = await client.patch(
            f"/api/v1/shots/{shot_id}",
            headers=admin_headers,
            json={"revision": 1, "changes": {"status": "review"}},
        )
        assert submitted.status_code == 200
        assert submitted.json()["revision"] == 2

        async with AsyncSessionLocal() as session:
            reviewer_role = Role(name="reviewer_only", permissions={"review.approve": True})
            session.add(reviewer_role)
            await session.flush()
            session.add(User(
                email="reviewer-only@example.com",
                display_name="Reviewer",
                password_hash=get_password_hash("review-password"),
                role_id=reviewer_role.id,
                is_active=True,
            ))
            await session.commit()

        login = await client.post("/api/v1/auth/login", json={
            "email": "reviewer-only@example.com", "password": "review-password",
        })
        assert login.status_code == 200
        reviewer_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

        direct_patch = await client.patch(
            f"/api/v1/shots/{shot_id}",
            headers=reviewer_headers,
            json={"revision": 2, "changes": {"status": "approved"}},
        )
        assert direct_patch.status_code == 403

        decision = await client.post(
            f"/api/v1/shots/{shot_id}/review-decisions",
            headers=reviewer_headers,
            json={"revision": 2, "action": "approve", "version_id": None},
        )
        assert decision.status_code == 200
        assert decision.json()["revision"] == 3
        assert decision.json()["status"] == "approved"
        assert decision.json()["decision"]["action_label"] == "同意意见"

        decisions = await client.get(
            f"/api/v1/shots/{shot_id}/review-decisions", headers=reviewer_headers
        )
        assert [item["action_label"] for item in decisions.json()] == ["同意意见"]
        async with AsyncSessionLocal() as session:
            actions = (await session.execute(
                select(AuditLog.action).where(
                    AuditLog.action.in_(["shot.patch", "review.decision"]),
                )
            )).scalars().all()
        assert "shot.patch" in actions
        assert "review.decision" in actions


@pytest.mark.asyncio
async def test_production_cover_media_id_uses_first_linked_image():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        login_res = await client.post("/api/v1/auth/login", json={
            "email": "admin@company.internal",
            "password": settings.INITIAL_ADMIN_PASSWORD
        })
        headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

        production = await client.post("/api/v1/productions", headers=headers, json={
            "name": "封面 Read Model",
            "template_type": "film",
            "fps_num": 24,
            "aspect_ratio": "16:9"
        })
        assert production.status_code == 201
        pid = production.json()["id"]
        assert production.json()["cover_media_id"] is None

        shot = await client.post(f"/api/v1/productions/{pid}/shots", headers=headers, json={
            "display_number": "001",
            "name": "封面候选镜头",
            "duration_frames": 48
        })
        assert shot.status_code == 201
        sid = shot.json()["id"]

        async with AsyncSessionLocal() as session:
            document_asset = Asset(
                production_id=pid,
                filename="notes.pdf",
                display_name="Notes",
                asset_type="document",
                source_type="internal",
                storage_key=f"{pid}/notes.pdf",
                mime_type="application/pdf",
                file_size=32,
                hash_sha256="d" * 64,
            )
            image_asset = Asset(
                production_id=pid,
                filename="cover.webp",
                display_name="Cover",
                asset_type="image",
                source_type="internal",
                storage_key=f"{pid}/cover.webp",
                mime_type="image/webp",
                file_size=64,
                hash_sha256="c" * 64,
            )
            session.add_all([document_asset, image_asset])
            await session.flush()
            session.add_all([
                ShotAssetLink(shot_id=sid, asset_id=document_asset.id, role="reference"),
                ShotAssetLink(shot_id=sid, asset_id=image_asset.id, role="reference"),
            ])
            await session.commit()
            cover_id = image_asset.id

        listed = await client.get("/api/v1/productions", headers=headers)
        assert listed.status_code == 200
        assert listed.json()[0]["cover_media_id"] == cover_id

        detail = await client.get(f"/api/v1/productions/{pid}", headers=headers)
        assert detail.status_code == 200
        assert detail.json()["cover_media_id"] == cover_id


@pytest.mark.asyncio
async def test_production_write_permission_and_soft_delete():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        admin = await client.post("/api/v1/auth/login", json={
            "email": "admin@company.internal",
            "password": settings.INITIAL_ADMIN_PASSWORD,
        })
        admin_headers = {"Authorization": f"Bearer {admin.json()['access_token']}"}
        readonly = await client.post("/api/v1/auth/register", json={
            "email": "reader@example.com",
            "password": "test-password",
            "role_name": "readonly",
        })
        assert readonly.status_code == 201
        readonly_headers = {"Authorization": f"Bearer {readonly.json()['access_token']}"}

        created = await client.post("/api/v1/productions", headers=admin_headers, json={"name": "Lifecycle"})
        assert created.status_code == 201
        production_id = created.json()["id"]
        path = f"/api/v1/productions/{production_id}"

        assert (await client.get(path, headers=readonly_headers)).status_code == 200
        assert (await client.post("/api/v1/productions", headers=readonly_headers, json={"name": "Denied"})).status_code == 403
        assert (await client.patch(path, headers=readonly_headers, json={"name": "Denied"})).status_code == 403
        assert (await client.delete(path, headers=readonly_headers)).status_code == 403

        updated = await client.patch(path, headers=admin_headers, json={"name": "Updated"})
        assert updated.status_code == 200
        assert updated.json()["name"] == "Updated"
        unchanged = await client.patch(path, headers=admin_headers, json={"name": "Updated"})
        assert unchanged.status_code == 200
        assert datetime.fromisoformat(unchanged.json()["updated_at"]).replace(tzinfo=None) == (
            datetime.fromisoformat(updated.json()["updated_at"]).replace(tzinfo=None)
        )

        assert (await client.delete(path, headers=admin_headers)).status_code == 204
        assert (await client.delete(path, headers=admin_headers)).status_code == 204
        assert (await client.get(path, headers=admin_headers)).status_code == 404
        assert (await client.get("/api/v1/productions", headers=admin_headers)).json() == []

        async with AsyncSessionLocal() as session:
            actions = (await session.execute(
                select(AuditLog.action).where(
                    AuditLog.entity_type == "production",
                    AuditLog.entity_id == production_id,
                ).order_by(AuditLog.created_at)
            )).scalars().all()
        assert actions == ["production.create", "production.update", "production.delete"]


@pytest.mark.asyncio
async def test_panel_frame_text_and_authenticated_image(tmp_path, monkeypatch):
    monkeypatch.setattr(panel_media, "MEDIA_ROOT", tmp_path)
    image_bytes = b"\x89PNG\r\n\x1a\n" + b"panel-frame-test"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        login = await client.post("/api/v1/auth/login", json={
            "email": "admin@company.internal",
            "password": settings.INITIAL_ADMIN_PASSWORD,
        })
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        production = await client.post("/api/v1/productions", headers=headers, json={"name": "Panel QA"})
        production_id = production.json()["id"]
        created = await client.post(f"/api/v1/productions/{production_id}/shots", headers=headers, json={
            "display_number": "001", "panel_frame": "正面双人构图",
        })
        assert created.status_code == 201
        shot = created.json()
        assert shot["panel_frame"] == "正面双人构图"
        assert len(shot["panels"]) == 1

        upload = await client.post(
            f"/api/v1/shots/{shot['id']}/panel-image", headers=headers,
            data={"revision": str(shot["revision"])},
            files={"image": ("frame.png", image_bytes, "image/png")},
        )
        assert upload.status_code == 200
        asset_id = upload.json()["asset_id"]
        assert upload.json()["revision"] == shot["revision"] + 1

        listed = await client.get(f"/api/v1/productions/{production_id}/shots", headers=headers)
        assert listed.status_code == 200
        assert listed.json()[0]["panels"][0]["asset_id"] == asset_id
        assert listed.json()[0]["panel_frame"] == "正面双人构图"
        assert (await client.get(f"/api/v1/assets/{asset_id}/content")).status_code == 401
        content = await client.get(f"/api/v1/assets/{asset_id}/content", headers=headers)
        assert content.status_code == 200
        assert content.content == image_bytes
        assert content.headers["content-type"] == "image/png"

        stale = await client.post(
            f"/api/v1/shots/{shot['id']}/panel-image", headers=headers,
            data={"revision": str(shot["revision"])},
            files={"image": ("frame.png", image_bytes, "image/png")},
        )
        assert stale.status_code == 409
        invalid = await client.post(
            f"/api/v1/shots/{shot['id']}/panel-image", headers=headers,
            data={"revision": str(upload.json()["revision"])},
            files={"image": ("bad.png", b"not an image", "image/png")},
        )
        assert invalid.status_code == 415
        assert len(list(tmp_path.iterdir())) == 1

        replaced = await client.post(
            f"/api/v1/shots/{shot['id']}/panel-image", headers=headers,
            data={"revision": str(upload.json()["revision"])},
            files={"image": ("replacement.png", image_bytes, "image/png")},
        )
        assert replaced.status_code == 200
        assert replaced.json()["asset_id"] != asset_id
        current = await client.get(f"/api/v1/productions/{production_id}/shots", headers=headers)
        assert current.json()[0]["panels"][0]["asset_id"] == replaced.json()["asset_id"]
        cover = await client.get(f"/api/v1/productions/{production_id}", headers=headers)
        assert cover.json()["cover_media_id"] == replaced.json()["asset_id"]
