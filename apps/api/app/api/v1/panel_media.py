"""Authenticated image storage for the first storyboard panel of a shot."""
from __future__ import annotations

import hashlib
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.core.database import get_db
from app.models.asset import Asset, ShotAssetLink
from app.models.collaboration import AuditLog
from app.models.shot import Panel, Shot
from app.models.user import User

router = APIRouter(tags=["Panel Media"])
MEDIA_ROOT = Path(os.environ.get("FRAMEFORGE_MEDIA_DIR", Path(__file__).resolve().parents[3] / "media"))
MAX_IMAGE_BYTES = 10 * 1024 * 1024


def _image_format(data: bytes) -> tuple[str, str] | None:
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png", "png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg", "jpg"
    if data.startswith((b"GIF87a", b"GIF89a")):
        return "image/gif", "gif"
    if data.startswith(b"RIFF") and data[8:12] == b"WEBP":
        return "image/webp", "webp"
    return None


@router.post("/shots/{shot_id}/panel-image")
async def upload_panel_image(
    shot_id: str,
    revision: int = Form(...),
    image: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    permissions = getattr(getattr(current_user, "role", None), "permissions", None) or {}
    if not (permissions.get("*") or permissions.get("production.write")):
        raise HTTPException(403, detail={"code": "FORBIDDEN", "message": "当前账号没有修改镜头的权限"})

    shot = (await db.execute(select(Shot).where(Shot.id == shot_id, Shot.deleted_at.is_(None)))).scalar_one_or_none()
    if shot is None:
        raise HTTPException(404, detail={"code": "NOT_FOUND", "message": "镜头不存在"})
    if shot.revision != revision:
        raise HTTPException(409, detail={"code": "SHOT_REVISION_CONFLICT", "message": "镜头版本已变化，请刷新后重试", "details": {"server_revision": shot.revision, "client_revision": revision}})

    data = await image.read(MAX_IMAGE_BYTES + 1)
    await image.close()
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(413, detail={"code": "IMAGE_TOO_LARGE", "message": "图片不得超过 10 MB"})
    image_format = _image_format(data)
    if image_format is None:
        raise HTTPException(415, detail={"code": "INVALID_IMAGE", "message": "仅支持 PNG、JPEG、GIF 或 WebP 图片"})
    mime_type, extension = image_format

    panel = (await db.execute(
        select(Panel).where(Panel.shot_id == shot_id, Panel.deleted_at.is_(None))
        .order_by(Panel.sort_index, Panel.id).limit(1)
    )).scalar_one_or_none()
    if panel is None:
        panel = Panel(shot_id=shot_id, display_number="A", sort_index=1000.0)
        db.add(panel)

    asset_id = str(uuid.uuid4())
    storage_key = f"{asset_id}.{extension}"
    MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
    target = MEDIA_ROOT / storage_key
    temporary = MEDIA_ROOT / f".{asset_id}.tmp"
    try:
        temporary.write_bytes(data)
        temporary.replace(target)
        asset = Asset(
            id=asset_id,
            production_id=shot.production_id,
            filename=Path(image.filename or "panel-image").name[:255],
            display_name=f"镜头 {shot.display_number} 分镜画面",
            asset_type="storyboard",
            source_type="internal",
            storage_key=storage_key,
            mime_type=mime_type,
            file_size=len(data),
            hash_sha256=hashlib.sha256(data).hexdigest(),
            created_by=current_user.id,
        )
        db.add(asset)
        await db.execute(delete(ShotAssetLink).where(ShotAssetLink.shot_id == shot_id, ShotAssetLink.role == "storyboard"))
        db.add(ShotAssetLink(shot_id=shot_id, asset_id=asset_id, role="storyboard"))
        panel.asset_id = asset_id
        shot.revision += 1
        shot.updated_at = datetime.now(timezone.utc)
        db.add(AuditLog(user_id=current_user.id, action="shot.panel_image", entity_type="shot", entity_id=shot_id, metadata_json={"asset_id": asset_id, "revision": shot.revision}))
        await db.commit()
    except Exception:
        await db.rollback()
        temporary.unlink(missing_ok=True)
        target.unlink(missing_ok=True)
        raise
    return {"asset_id": asset_id, "revision": shot.revision}


@router.get("/assets/{asset_id}/content")
async def read_asset_content(
    asset_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    asset = (await db.execute(select(Asset).where(Asset.id == asset_id, Asset.deleted_at.is_(None)))).scalar_one_or_none()
    if asset is None:
        raise HTTPException(404, detail={"code": "NOT_FOUND", "message": "图片不存在"})
    root = MEDIA_ROOT.resolve()
    path = (root / asset.storage_key).resolve()
    if not path.is_relative_to(root) or not path.is_file():
        raise HTTPException(404, detail={"code": "NOT_FOUND", "message": "图片文件不存在"})
    return FileResponse(path, media_type=asset.mime_type, headers={"Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff"})
