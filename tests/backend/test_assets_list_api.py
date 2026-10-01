"""Isolated contract test for production-scoped asset reads and references."""
from datetime import datetime, timezone
from pathlib import Path
import sys
import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "apps" / "api"))

from main import app
from app.core.config import settings
from app.core.database import Base, get_db
from app.models.asset import Asset, ShotAssetLink
from app.models.shot import Panel, Shot
from app.models.user import Role, User
from app.core.security import get_password_hash
from app.services.seed import seed_database


@pytest.fixture
async def setup_db(tmp_path):
    # This test owns a new database; never drop tables in the configured app DB.
    assert settings.ENVIRONMENT != "production"
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'assets-test.db'}")
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with sessions() as session:
        await seed_database(session)
        await session.commit()

    async def test_db():
        async with sessions() as session:
            yield session
            await session.commit()

    previous = app.dependency_overrides.get(get_db)
    app.dependency_overrides[get_db] = test_db
    try:
        yield sessions
    finally:
        if previous is None:
            app.dependency_overrides.pop(get_db, None)
        else:
            app.dependency_overrides[get_db] = previous
        await engine.dispose()


@pytest.mark.asyncio
async def test_production_asset_list_uses_real_metadata_and_deduped_active_references(setup_db):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        login = await client.post("/api/v1/auth/login", json={
            "email": settings.INITIAL_ADMIN_EMAIL,
            "password": settings.INITIAL_ADMIN_PASSWORD,
        })
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        production = await client.post(
            "/api/v1/productions", headers=headers, json={"name": "Asset list"}
        )
        production_id = production.json()["id"]
        shots = []
        for number in ("001", "002", "003", "004"):
            response = await client.post(
                f"/api/v1/productions/{production_id}/shots",
                headers=headers,
                json={"display_number": number, "name": f"Shot {number}"},
            )
            shots.append(response.json()["id"])

        asset_id = str(uuid.uuid4())
        unreferenced_id = str(uuid.uuid4())
        foreign_id = str(uuid.uuid4())
        foreign_production = await client.post(
            "/api/v1/productions", headers=headers, json={"name": "Other project"}
        )
        foreign_production_id = foreign_production.json()["id"]
        async with setup_db() as session:
            session.add(Asset(
                id=asset_id, production_id=production_id, filename="real.png",
                display_name="Real image", asset_type="storyboard", source_type="internal",
                storage_key=f"{asset_id}.png", mime_type="image/png", width=640,
                height=360, file_size=1234, hash_sha256="abc123",
            ))
            session.add(Asset(
                id=unreferenced_id, production_id=production_id, filename="unused.webp",
                display_name="Unused", asset_type="reference", source_type="internal",
                storage_key=f"{unreferenced_id}.webp", mime_type="image/webp",
                width=None, height=None, file_size=77, hash_sha256="def456",
            ))
            session.add(Asset(
                id=foreign_id, production_id=foreign_production_id, filename="foreign.jpg",
                display_name="Foreign", asset_type="storyboard", source_type="internal",
                storage_key=f"{foreign_id}.jpg", mime_type="image/jpeg", file_size=50,
            ))
            await session.flush()
            # The same shot references the same asset through both supported paths.
            first_panel = (await session.execute(
                select(Panel).where(Panel.shot_id == shots[0])
            )).scalar_one()
            first_panel.asset_id = asset_id
            deleted_panel = (await session.execute(
                select(Panel).where(Panel.shot_id == shots[3])
            )).scalar_one()
            deleted_panel.asset_id = asset_id
            deleted_panel.deleted_at = datetime.now(timezone.utc)
            session.add(ShotAssetLink(shot_id=shots[0], asset_id=asset_id, role="storyboard"))
            session.add(ShotAssetLink(shot_id=shots[1], asset_id=asset_id, role="reference"))
            session.add(ShotAssetLink(shot_id=shots[2], asset_id=asset_id, role="storyboard"))
            deleted_shot = (await session.execute(
                select(Shot).where(Shot.id == shots[2])
            )).scalar_one()
            deleted_shot.deleted_at = datetime.now(timezone.utc)
            await session.commit()

        listed = await client.get(
            f"/api/v1/productions/{production_id}/assets", headers=headers
        )
        assert listed.status_code == 200
        rows = {item["id"]: item for item in listed.json()}
        assert set(rows) == {asset_id, unreferenced_id}
        assert rows[asset_id]["filename"] == "real.png"
        assert rows[asset_id]["width"] == 640
        assert rows[asset_id]["file_size"] == 1234
        assert rows[asset_id]["reference_shot_count"] == 2
        assert rows[unreferenced_id]["reference_shot_count"] == 0

        missing = await client.get(
            f"/api/v1/productions/{uuid.uuid4()}/assets", headers=headers
        )
        assert missing.status_code == 404

        async with setup_db() as session:
            role = Role(name="asset-no-read", permissions={})
            session.add(role)
            await session.flush()
            session.add(User(
                email="asset-no-read@example.com", display_name="No read",
                password_hash=get_password_hash("test-password"), role_id=role.id,
                is_active=True,
            ))
            await session.commit()
        denied_login = await client.post("/api/v1/auth/login", json={
            "email": "asset-no-read@example.com", "password": "test-password",
        })
        denied = await client.get(
            f"/api/v1/productions/{production_id}/assets",
            headers={"Authorization": f"Bearer {denied_login.json()['access_token']}"},
        )
        assert denied.status_code == 403

        denied_content = await client.get(
            f"/api/v1/assets/{asset_id}/content",
            headers={"Authorization": f"Bearer {denied_login.json()['access_token']}"},
        )
        assert denied_content.status_code == 403
