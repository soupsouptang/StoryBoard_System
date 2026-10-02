"""Authenticated image storage for the first storyboard panel of a shot."""
from __future__ import annotations


from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.core.database import db_session
from app.core.exceptions import DomainError, NotFoundError
from app.models.asset import Asset
from app.models.production import Production
from app.models.user import User
from app.services.panel_media_service import PanelMediaService, ShotRevisionConflict, MEDIA_ROOT

router = APIRouter(tags=["Panel Media"])
MAX_IMAGE_BYTES = 10 * 1024 * 1024


@router.post("/shots/{shot_id}/panel-image")
async def upload_panel_image(
    shot_id: str,
    revision: int = Form(...),
    image: UploadFile = File(...),
    db: AsyncSession = db_session,
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
    try:
        return await PanelMediaService.save_panel_image(
            db,
            shot=shot,
            data=data,
            filename=image.filename or "panel-image",
            user_id=current_user.id,
            media_root=MEDIA_ROOT,
        )
    except DomainError as error:
        raise HTTPException(415 if error.code == "INVALID_IMAGE" else 413 if error.code == "IMAGE_TOO_LARGE" else 400,
            detail={"code": error.code, "message": error.message}) from error


@router.get("/assets/{asset_id}/content")
async def read_asset_content(
    asset_id: str,
    db: AsyncSession = db_session,
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
    return FileResponse(path, media_type=asset.mime_type, headers={"Cache-Control": "private, no-cache", "ETag": '"' + asset.hash_sha256 + '"', "X-Content-Type-Options": "nosniff"})
