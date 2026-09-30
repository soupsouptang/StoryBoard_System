"""Production API routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.core.database import get_db
from app.core.exceptions import NotFoundError
from app.models.user import User
from app.schemas.production import ProductionCreate, ProductionOut, ProductionUpdate
from app.services.production_service import ProductionService

router = APIRouter(prefix="/productions", tags=["Productions"])


def _require_write(user: User) -> None:
    permissions = getattr(getattr(user, "role", None), "permissions", None) or {}
    if not (permissions.get("*") or permissions.get("production.write")):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "当前账号没有修改项目的权限"},
        )


def _output(production, count=0, duration=0, cover_media_id=None) -> ProductionOut:
    result = ProductionOut.model_validate(production)
    result.shot_count = count
    result.total_duration_frames = duration
    result.cover_media_id = cover_media_id
    return result


@router.get("", response_model=list[ProductionOut])
async def list_productions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = await ProductionService.list_productions(db)
    return [_output(production, count, duration, cover) for production, count, duration, cover in rows]


@router.post("", response_model=ProductionOut, status_code=status.HTTP_201_CREATED)
async def create_production(
    req: ProductionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_write(current_user)
    production = await ProductionService.create_production(db, req, current_user.id)
    return _output(production)


@router.get("/{id}", response_model=ProductionOut)
async def get_production(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return _output(*await ProductionService.get_production(db, id))
    except NotFoundError as error:
        raise HTTPException(status_code=404, detail={"code": error.code, "message": error.message}) from error


@router.patch("/{id}", response_model=ProductionOut)
async def update_production(
    id: str,
    req: ProductionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_write(current_user)
    try:
        production, cover = await ProductionService.update_production(db, id, req, current_user.id)
        return _output(production, cover_media_id=cover)
    except NotFoundError as error:
        raise HTTPException(status_code=404, detail={"code": error.code, "message": error.message}) from error


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_production(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_write(current_user)
    await ProductionService.delete_production(db, id, current_user.id)
    return None
