"""Canonical SRT route contract against the running Legacy export format."""

import sys
from pathlib import Path
from urllib.parse import quote

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "apps" / "api"))

from main import app
from app.core.database import Base, get_db
from app.core.security import create_access_token
from app.models.production import Production
from app.models.shot import Shot
from app.models.user import User


@pytest.fixture
async def export_client(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{(tmp_path / 'exports.db').as_posix()}")
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with sessions() as session:
        session.add(User(id="export-user", email="export@example.invalid", password_hash="unused", is_active=True))
        session.add(Production(
            id="export-production", name="My/Film: 开场", code="UNUSED", fps_num=25,
            fps_den=1, start_timecode_frames=90000, created_by="export-user",
        ))
        session.add_all([
            Shot(id="shot-c", production_id="export-production", sort_index=30,
                 duration_frames=25, voice_over="第二句"),
            Shot(id="shot-b", production_id="export-production", sort_index=20,
                 duration_frames=25, voice_over="", dialogue="Dialogue is not a voiceover cue"),
            Shot(id="shot-a", production_id="export-production", sort_index=10,
                 duration_frames=50, voice_over=" 第一句 "),
        ])
        await session.commit()

    async def isolated_db():
        async with sessions() as session:
            yield session

    app.dependency_overrides[get_db] = isolated_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            yield client
    finally:
        app.dependency_overrides.pop(get_db, None)
        await engine.dispose()


@pytest.mark.asyncio
async def test_srt_requires_auth_and_existing_production(export_client):
    path = "/api/v1/productions/export-production/export/srt"
    assert (await export_client.get(path)).status_code == 401
    assert (await export_client.get(path, headers={"Authorization": "Bearer bad-token"})).status_code == 401
    token = create_access_token({"sub": "export-user"})
    missing = await export_client.get(
        "/api/v1/productions/missing/export/srt",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert missing.status_code == 404


@pytest.mark.asyncio
async def test_srt_uses_legacy_timing_voiceover_and_download_bytes(export_client):
    token = create_access_token({"sub": "export-user"})
    response = await export_client.get(
        "/api/v1/productions/export-production/export/srt",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/plain; charset=utf-8"
    assert response.headers["content-disposition"] == (
        "attachment; filename*=UTF-8''" + quote("My_Film_ 开场.srt")
    )
    assert response.content == (
        "1\r\n01:00:00,000 --> 01:00:02,000\r\n第一句\r\n\r\n"
        "2\r\n01:00:03,000 --> 01:00:04,000\r\n第二句\r\n"
    ).encode("utf-8-sig")
    assert int(response.headers["content-length"]) == len(response.content)


@pytest.mark.asyncio
async def test_vtt_uses_legacy_timing_voiceover_and_download_bytes(export_client):
    token = create_access_token({"sub": "export-user"})
    response = await export_client.get(
        "/api/v1/productions/export-production/export/vtt",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/vtt; charset=utf-8"
    assert response.headers["content-disposition"] == (
        "attachment; filename*=UTF-8''" + quote("My_Film_ 开场.vtt")
    )
    assert response.content == (
        "WEBVTT\r\n\r\n"
        "1\r\n01:00:00.000 --> 01:00:02.000\r\n第一句\r\n\r\n"
        "2\r\n01:00:03.000 --> 01:00:04.000\r\n第二句\r\n"
    ).encode("utf-8-sig")


@pytest.mark.asyncio
async def test_edl_export(export_client):
    token = create_access_token({"sub": "export-user"})
    response = await export_client.get(
        "/api/v1/productions/export-production/export/edl",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert "attachment" in response.headers["content-disposition"]
    assert ".edl" in response.headers["content-disposition"]
    text = response.text
    assert "TITLE:" in text
    assert "FCM:" in text
    assert "001  AX" in text
    assert "第一句" in text


@pytest.mark.asyncio
async def test_otio_export(export_client):
    import json
    token = create_access_token({"sub": "export-user"})
    response = await export_client.get(
        "/api/v1/productions/export-production/export/otio",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert "attachment" in response.headers["content-disposition"]
    assert ".otio" in response.headers["content-disposition"]
    data = json.loads(response.text)
    assert data["OTIO_SCHEMA"] == "Timeline.1"
    assert "tracks" in data
    clips = data["tracks"]["children"][0]["children"]
    assert len(clips) == 3


@pytest.mark.asyncio
async def test_csv_export(export_client):
    token = create_access_token({"sub": "export-user"})
    response = await export_client.get(
        "/api/v1/productions/export-production/export/csv",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert "attachment" in response.headers["content-disposition"]
    assert ".csv" in response.headers["content-disposition"]
    content = response.content
    assert content.startswith(b"\xef\xbb\xbf")  # UTF-8 BOM for Excel
    text = content.decode("utf-8-sig")
    assert "镜号" in text
    assert "对应解说词旁白" in text
    assert "第一句" in text

