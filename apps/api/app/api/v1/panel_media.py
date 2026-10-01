"""Authenticated image storage for the first storyboard panel of a shot."""
from __future__ import annotations

import os
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.core.database import get_db
from app.core.exceptions import NotFoundError
from app.models.asset import Asset
from app.models.production import Production
from app.models.user import User
from app.services.panel_media_service import PanelMediaService, ShotRevisionConflict

router = APIRouter(tags=["Panel Media"])
MEDIA_ROOT = Path(os.environ.get("FRAMEFORGE_MEDIA_DIR", Path(__file__).resolve().parents[3] / "media"))
MAX_IMAGE_BYTES = 10 * 1024 * 1024


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

    try:
        shot = await PanelMediaService.get_upload_shot(db, shot_id=shot_id, revision=revision)
    except NotFoundError as error:
        raise HTTPException(404, detail={"code": error.code, "message": error.message}) from error
    except ShotRevisionConflict as error:
        raise HTTPException(409, detail={"code": error.code, "message": error.message, "details": error.details}) from error

    data = await image.read(MAX_IMAGE_BYTES + 1)
    await image.close()
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(413, detail={"code": "IMAGE_TOO_LARGE", "message": "图片不得超过 10 MB"})
    image_format = PanelMediaService.image_format(data)
    if image_format is None:
        raise HTTPException(415, detail={"code": "INVALID_IMAGE", "message": "仅支持 PNG、JPEG、GIF 或 WebP 图片"})
    mime_type, extension = image_format
    return await PanelMediaService.save_panel_image(
        db,
        shot=shot,
        data=data,
        filename=image.filename or "panel-image",
        mime_type=mime_type,
        extension=extension,
        user_id=current_user.id,
        media_root=MEDIA_ROOT,
    )


@router.get("/assets/{asset_id}/content")
async def read_asset_content(
    asset_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    permissions = getattr(getattr(current_user, "role", None), "permissions", None) or {}
    if not (permissions.get("*") or permissions.get("production.read")):
        raise HTTPException(403, detail={"code": "FORBIDDEN", "message": "当前账号没有读取项目的权限"})
    asset = (await db.execute(
        select(Asset).join(Production, Production.id == Asset.production_id).where(
            Asset.id == asset_id, Asset.deleted_at.is_(None), Production.deleted_at.is_(None)
        )
    )).scalar_one_or_none()
    if asset is None:
        raise HTTPException(404, detail={"code": "NOT_FOUND", "message": "图片不存在"})
    root = MEDIA_ROOT.resolve()
    path = (root / asset.storage_key).resolve()
    if not path.is_relative_to(root) or not path.is_file():
        raise HTTPException(404, detail={"code": "NOT_FOUND", "message": "图片文件不存在"})
    return FileResponse(path, media_type=asset.mime_type, headers={"Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff"})
