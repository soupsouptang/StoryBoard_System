"""Nonempty table imports use the standard Shot command and its audit."""
import base64
import sys
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "apps" / "api"))

from main import app
from app.core.database import Base, get_db
from app.core.security import create_access_token
from app.models.collaboration import AuditLog
from app.models.production import Production, Sequence
from app.models.shot import Panel, Shot
from app.models.user import Role, User


@pytest.mark.asyncio
async def test_nonempty_import_fields_permission_and_standard_audit(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'import.db'}")
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with sessions() as session:
        writer = Role(id="writer-role", name="writer", permissions={"shot.write": True})
        reader = Role(id="reader-role", name="reader", permissions={})
        session.add_all([
            writer, reader,
            User(id="writer", email="writer@example.invalid", password_hash="unused", role=writer),
            User(id="reader", email="reader@example.invalid", password_hash="unused", role=reader),
            Production(id="production", name="Import", fps_num=24, fps_den=1),
            Production(id="other-production", name="Other"),
            Sequence(id="sequence", production_id="production", name="Sequence"),
            Sequence(id="other-sequence", production_id="other-production", name="Other"),
        ])
        await session.commit()

    async def isolated_db():
        async with sessions() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = isolated_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            headers = {"Authorization": f"Bearer {create_access_token({'sub': 'writer'})}"}
            preview = await client.post("/api/v1/productions/production/import-preview", headers=headers, json={
                "filename": "shots.csv",
                "file_base64": base64.b64encode(
                    "镜号,旁白,运镜,时长(秒),帧数,焦段\n010,旁白文本,横摇,2,,50mm\n,第二行,推镜,,36,35mm\n".encode()
                ).decode(),
            })
            assert preview.status_code == 200
            payload = {
                "rows": preview.json()["raw_rows"] + [["", " "]],
                "mapping": preview.json()["mapping"],
            }
            path = "/api/v1/productions/production/import-commit"
            assert (await client.post(path, json=payload)).status_code == 401
            denied = await client.post(path, json=payload, headers={
                "Authorization": f"Bearer {create_access_token({'sub': 'reader'})}",
            })
            assert denied.status_code == 403
            assert denied.json()["error"]["code"] == "FORBIDDEN"
            invalid = await client.post(path, headers=headers, json={**payload, "sequence_id": "other-sequence"})
            assert invalid.status_code == 400
            invalid_mapping = await client.post(path, headers=headers, json={
                "rows": [["value"]], "mapping": {"voiceover": {"col": "0"}},
            })
            assert invalid_mapping.status_code == 400
            imported = await client.post(path, headers=headers, json=payload)
            assert imported.status_code == 201
            assert imported.json() == {"ok": True, "imported_count": 2}

        async with sessions() as session:
            shots = (await session.execute(select(Shot).order_by(Shot.sort_index))).scalars().all()
            assert [shot.display_number for shot in shots] == ["010", "002"]
            assert [shot.voice_over for shot in shots] == ["旁白文本", "第二行"]
            assert [shot.camera_movement for shot in shots] == [{"type": "横摇"}, {"type": "推镜"}]
            assert [shot.duration_frames for shot in shots] == [48, 36]
            assert [shot.lens_mm for shot in shots] == [50.0, 35.0]
            assert [shot.sort_index for shot in shots] == [1000.0, 2000.0]
            assert all(shot.sequence_id == "sequence" and shot.revision == 1 and shot.created_by == "writer" for shot in shots)
            panels = (await session.execute(select(Panel))).scalars().all()
            assert {panel.shot_id: panel.duration_frames for panel in panels} == {shot.id: shot.duration_frames for shot in shots}
            audits = (await session.execute(select(AuditLog))).scalars().all()
            assert len(audits) == 2
            assert {audit.entity_id for audit in audits} == {shot.id for shot in shots}
            assert all(audit.action == "shot.create" and audit.user_id == "writer" for audit in audits)
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            added = await client.post(path, headers=headers, json={
                "rows": [["004", "指定镜号"], ["", "自动镜号"]],
                "mapping": {"number": {"col": 0}, "name": {"col": 1}},
            })
            assert added.status_code == 201
        async with sessions() as session:
            numbers = (await session.execute(select(Shot.display_number).order_by(Shot.sort_index))).scalars().all()
            assert numbers == ["010", "002", "004", "005"], 'Generated number must avoid imported numbers'
    finally:
        app.dependency_overrides.pop(get_db, None)
        await engine.dispose()
