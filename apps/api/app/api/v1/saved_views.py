"""Saved view routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.core.database import db_session
from app.core.exceptions import ConflictError, DomainError, NotFoundError
from app.models.user import User
from app.schemas.saved_view import SavedViewCreate, SavedViewOut, SavedViewUpdate
from app.services.saved_view_service import SavedViewService

router = APIRouter(prefix="/productions/{production_id}/saved-views", tags=["Saved Views"])


def _http(error: DomainError) -> HTTPException:
    if isinstance(error, NotFoundError):
        return HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": error.code, "message": error.message},
        )
    if isinstance(error, ConflictError):
        return HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "SAVED_VIEW_REVISION_CONFLICT",
                "message": error.message,
                "details": error.details,
            },
        )
    if error.code == "FORBIDDEN":
        return HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": error.code, "message": error.message},
        )
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={"code": error.code, "message": error.message},
    )


@router.get("", response_model=list[SavedViewOut])
async def list_saved_views(
    production_id: str,
    db: AsyncSession = db_session,
    current_user: User = Depends(get_current_user),
):
    try:
        return await SavedViewService.list_views(db, production_id, current_user)
    except DomainError as error:
        raise _http(error)


@router.post("", response_model=SavedViewOut, status_code=status.HTTP_201_CREATED)
async def create_saved_view(
    production_id: str,
    req: SavedViewCreate,
    db: AsyncSession = db_session,
    current_user: User = Depends(get_current_user),
):
    try:
        return await SavedViewService.create_view(db, production_id, req, current_user)
    except DomainError as error:
        raise _http(error)


@router.patch("/{view_id}", response_model=SavedViewOut)
async def update_saved_view(
    production_id: str,
    view_id: str,
    req: SavedViewUpdate,
    db: AsyncSession = db_session,
    current_user: User = Depends(get_current_user),
):
    try:
        return await SavedViewService.update_view(
            db,
            production_id,
            view_id,
            req,
            current_user,
        )
    except DomainError as error:
        raise _http(error)


@router.delete("/{view_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_saved_view(
    production_id: str,
    view_id: str,
    db: AsyncSession = db_session,
    current_user: User = Depends(get_current_user),
):
    try:
        await SavedViewService.delete_view(db, production_id, view_id, current_user)
        return None
    except DomainError as error:
        raise _http(error)
