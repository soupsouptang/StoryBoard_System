"""Read-only production asset routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.core.database import db_session
from app.core.exceptions import NotFoundError
from app.models.user import User
from app.schemas.asset import AssetOut
from app.services.asset_service import AssetService

router = APIRouter(prefix="/productions", tags=["Assets"])


@router.get("/{production_id}/assets", response_model=list[AssetOut])
async def list_production_assets(
    production_id: str,
    db: AsyncSession = db_session,
    current_user: User = Depends(get_current_user),
):
    permissions = getattr(getattr(current_user, "role", None), "permissions", None) or {}
    if not (permissions.get("*") or permissions.get("production.read")):
        raise HTTPException(
            status_code=403,
            detail={"code": "FORBIDDEN", "message": "当前账号没有读取项目的权限"},
        )
    try:
        return await AssetService.list_production_assets(db, production_id)
    except NotFoundError as error:
        raise HTTPException(
            status_code=404,
            detail={"code": error.code, "message": error.message},
        ) from error
