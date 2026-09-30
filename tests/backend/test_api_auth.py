"""Pytest Suite for Authentication and User Registration."""
import os
import sys
from pathlib import Path
import pytest
from httpx import ASGITransport, AsyncClient

# Add apps/api to PYTHONPATH
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
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/healthz")
        assert res.status_code == 200
        assert res.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_admin_login_and_me():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post("/api/v1/auth/login", json={
            "email": "admin@company.internal",
            "password": "FrameForge2026!Admin"
        })
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        token = data["access_token"]

        # Access /me with token
        me_res = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_res.status_code == 200
        assert me_res.json()["email"] == "admin@company.internal"


@pytest.mark.asyncio
async def test_user_registration():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post("/api/v1/auth/register", json={
            "email": "director_qa@company.internal",
            "password": "DirectorPass2026!",
            "display_name": "张总导演",
            "role_name": "director"
        })
        assert res.status_code == 201
        data = res.json()
        assert data["user"]["display_name"] == "张总导演"
        assert data["user"]["role"]["name"] == "readonly"

        admin_request = await client.post("/api/v1/auth/register", json={
            "email": "self_admin@company.internal",
            "password": "AdminPass2026!",
            "role_name": "admin",
        })
        assert admin_request.status_code == 201
        assert admin_request.json()["user"]["role"]["name"] == "readonly"
        token = admin_request.json()["access_token"]
        denied = await client.post(
            "/api/v1/productions",
            headers={"Authorization": f"Bearer {token}"},
            json={"name": "Should be denied"},
        )
        assert denied.status_code == 403
