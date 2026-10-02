"""Production asset HTTP adapters; image and lifecycle commands stay in services."""
from __future__ import annotations

from typing import Literal
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.core.database import db_session
from app.core.exceptions import ConflictError, DomainError, NotFoundError
from app.models.user import User
from app.schemas.asset import AssetOut, AssetRevision, AssetUpdate
from app.schemas.image_crop import ImageCropRequest
from app.services.asset_service import AssetService
from app.services.asset_mutation_service import AssetMutationService
from app.services.image_crop_service import ImageCropService, media_path
from app.services.panel_media_service import MEDIA_ROOT
from app.services.image_storage import MAX_BYTES

router = APIRouter(prefix="/productions", tags=["Assets"])


def _http(error):
    code = 404 if isinstance(error, NotFoundError) else 409 if isinstance(error, ConflictError) else 403 if error.code == "FORBIDDEN" else 413 if error.code == "IMAGE_TOO_LARGE" else 415 if error.code == "INVALID_IMAGE" else 400
    return HTTPException(code, detail={"code": "ASSET_REVISION_CONFLICT" if code == 409 and error.code == "CONFLICT" else error.code,
        "message": error.message, "details": getattr(error, "details", {})})


@router.get("/{production_id}/assets", response_model=list[AssetOut])
async def list_production_assets(
    production_id: str,
    search: str = Query("", max_length=255),
    category: str | None = Query(None, max_length=64),
    state: Literal["active", "trashed"] = "active",
    db: AsyncSession = db_session,
    current_user: User = Depends(get_current_user),
):
    try:
        AssetService.permission(current_user)
        return await AssetService.list_production_assets(db, production_id, search=search, category=category, state=state)
    except DomainError as error:
        raise _http(error) from error


@router.post("/{production_id}/assets/images", status_code=201)
async def upload_image(production_id: str, image: UploadFile = File(...), db=db_session, user=Depends(get_current_user)):
    try:
        AssetService.permission(user, write=True)
        data = await image.read(MAX_BYTES + 1)
        return await AssetMutationService.upload(db, production_id, data, image.filename or "image", user, MEDIA_ROOT)
    except DomainError as error:
        raise _http(error)
    finally:
        await image.close()


@router.patch("/{production_id}/assets/{asset_id}")
async def update_asset(production_id: str, asset_id: str, req: AssetUpdate, db=db_session, user=Depends(get_current_user)):
    try:
        return await AssetMutationService.update(db, production_id, asset_id, req, user)
    except DomainError as error:
        raise _http(error)


@router.delete("/{production_id}/assets/{asset_id}")
async def delete_asset(production_id: str, asset_id: str, revision: int = Query(..., ge=1), db=db_session, user=Depends(get_current_user)):
    try:
        return await AssetMutationService.delete_or_restore(db, production_id, asset_id, revision, user)
    except DomainError as error:
        raise _http(error)


@router.post("/{production_id}/assets/{asset_id}/restore")
async def restore_asset(production_id: str, asset_id: str, req: AssetRevision, db=db_session, user=Depends(get_current_user)):
    try:
        return await AssetMutationService.delete_or_restore(db, production_id, asset_id, req.revision, user, restore=True)
    except DomainError as error:
        raise _http(error)


@router.get("/{production_id}/assets/{asset_id}/references")
async def references(production_id: str, asset_id: str, db=db_session, user=Depends(get_current_user)):
    try:
        AssetService.permission(user)
        return await AssetService.references(db, production_id, asset_id)
    except DomainError as error:
        raise _http(error)


@router.get("/{production_id}/assets/{asset_id}/thumbnail")
async def thumbnail(production_id: str, asset_id: str, db=db_session, user=Depends(get_current_user)):
    try:
        AssetService.permission(user)
        asset = await AssetService.asset(db, production_id, asset_id)
        content, mime, digest = await ImageCropService.rendered(db, asset, MEDIA_ROOT, thumbnail=True)
        return _image_response(content, mime, digest)
    except DomainError as error:
        raise _http(error)


@router.get("/{production_id}/assets/{asset_id}/image-versions")
async def image_versions(production_id: str, asset_id: str, db=db_session, user=Depends(get_current_user)):
    try:
        return await ImageCropService.versions(db, production_id, asset_id, user)
    except DomainError as error:
        raise _http(error)


@router.get("/{production_id}/assets/{asset_id}/image-versions/{version_id}/content")
async def source_image(production_id: str, asset_id: str, version_id: str, db=db_session, user=Depends(get_current_user)):
    try:
        path, mime, digest = await ImageCropService.source(db, production_id, asset_id, version_id, user, MEDIA_ROOT)
        return FileResponse(path, media_type=mime,
            headers={"Cache-Control": "private, max-age=3600", "ETag": '"' + digest + '"', "X-Content-Type-Options": "nosniff"})
    except DomainError as error:
        raise _http(error)


@router.post("/{production_id}/assets/{asset_id}/crop")
async def crop_image(production_id: str, asset_id: str, req: ImageCropRequest, db=db_session, user=Depends(get_current_user)):
    try:
        return await ImageCropService.crop(db, production_id, asset_id, req, user, MEDIA_ROOT)
    except DomainError as error:
        raise _http(error)


def _image_response(content, mime, digest):
    response = Response if isinstance(content, bytes) else FileResponse
    return response(content, media_type=mime, headers={"Cache-Control": "private, no-cache",
        "ETag": '"' + digest + '"', "X-Content-Type-Options": "nosniff"})


@router.get("/{production_id}/assets/{asset_id}/presentation")
async def presentation(production_id: str, asset_id: str, owner_type: Literal["asset", "panel", "production"] = "asset",
    owner_id: str | None = None, db=db_session, user=Depends(get_current_user)):
    try:
        return await ImageCropService.presentation(db, production_id, asset_id, user, owner_type, owner_id)
    except DomainError as error:
        raise _http(error)


@router.get("/{production_id}/assets/{asset_id}/presentation/content")
async def presentation_image(production_id: str, asset_id: str, owner_type: Literal["asset", "panel", "production"] = "asset",
    owner_id: str | None = None, revision: int | None = Query(None, ge=0), db=db_session, user=Depends(get_current_user)):
    try:
        AssetService.permission(user)
        asset = await AssetService.asset(db, production_id, asset_id)
        return _image_response(*await ImageCropService.rendered(db, asset, MEDIA_ROOT,
            owner_type=owner_type, owner_id=owner_id, revision=revision))
    except DomainError as error:
        raise _http(error)
