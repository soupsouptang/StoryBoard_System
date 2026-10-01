"""Shot API Routes with Revision Optimistic Concurrency and Transactional Reordering."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.api.v1.deps import get_current_user
from app.core.database import get_db
from app.models.production import Production
from app.models.shot import Panel, ProductionStep, Shot
from app.models.user import User
from app.schemas.shot import (
    BulkTrashShotsRequest,
    BulkUpdateShotsRequest,
    ShotCreate,
    ShotOut,
    ShotPatch,
    ShotReorderRequest
)
from app.services.shot_service import ShotService
from app.core.exceptions import DomainError, NotFoundError, ConflictError

router = APIRouter(tags=["Shots"])


def _domain_http(error: DomainError) -> HTTPException:
    code = getattr(error, "code", "DOMAIN_ERROR")
    status_code = status.HTTP_403_FORBIDDEN if code == "FORBIDDEN" else status.HTTP_400_BAD_REQUEST
    return HTTPException(status_code=status_code, detail={"code": code, "message": str(error)})


@router.get("/productions/{production_id}/shots", response_model=list[ShotOut])
async def list_production_shots(
    production_id: str,
    sequence_id: Optional[str] = Query(None),
    primary_method: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = (
        select(Shot).options(selectinload(Shot.panels))
        .where(Shot.production_id == production_id, Shot.deleted_at.is_(None))
        .order_by(Shot.sort_index.asc(), Shot.display_number.asc())
    )
    if sequence_id:
        query = query.where(Shot.sequence_id == sequence_id)
    if primary_method:
        query = query.where(Shot.primary_method == primary_method)
    if department:
        query = query.where(Shot.department == department)
    if status_filter:
        query = query.where(Shot.status == status_filter)

    result = await db.execute(query)
    return result.scalars().all()


@router.post("/productions/{production_id}/shots", response_model=ShotOut, status_code=status.HTTP_201_CREATED)
async def create_shot(
    production_id: str,
    req: ShotCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        shot = await ShotService.create_shot(db, production_id, req, current_user)
        return shot
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": e.message})
    except DomainError as e:
        raise _domain_http(e)


@router.patch("/shots/{id}", response_model=ShotOut)
async def patch_shot(
    id: str,
    req: ShotPatch,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        shot = await ShotService.patch_shot(db, id, req, current_user)
        return shot
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": e.message})
    except ConflictError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail={"code": "SHOT_REVISION_CONFLICT", "message": e.message, "details": e.details})
    except DomainError as e:
        raise _domain_http(e)


@router.delete("/shots/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shot(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        await ShotService.trash_shot(db, id, current_user)
    except DomainError as e:
        raise _domain_http(e)
    return None


@router.post("/shots/{id}/restore", status_code=status.HTTP_200_OK)
async def restore_shot(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> dict:
    """Restore a soft-deleted shot."""
    try:
        shot = await ShotService.restore_shot(db, id, current_user)
        return {"ok": True, "id": shot.id, "revision": shot.revision}
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail={"code": e.code, "message": e.message})
    except DomainError as e:
        raise _domain_http(e)


@router.delete("/shots/{id}/purge", status_code=status.HTTP_204_NO_CONTENT)
async def purge_shot(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Permanently delete a shot that is already in Trash."""
    try:
        await ShotService.purge_shot(db, id, current_user)
    except DomainError as e:
        raise _domain_http(e)
    return None


@router.post("/productions/{production_id}/shots/bulk-trash", status_code=status.HTTP_200_OK)
async def bulk_trash_shots(
    production_id: str,
    req: BulkTrashShotsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atomically move a project-scoped shot selection into Trash."""
    try:
        return await ShotService.bulk_trash_shots(db, production_id, req.shot_ids, current_user)
    except ConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "BULK_SHOT_SCOPE_CONFLICT",
                "message": e.message,
                "details": e.details,
            },
        )
    except DomainError as e:
        raise _domain_http(e)


@router.get("/productions/{production_id}/shots/trash", response_model=list[dict])
async def list_trash_shots(
    production_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List soft-deleted shots for a production. Retention cleanup is not implemented here."""
    result = await db.execute(
        select(Shot).where(
            Shot.production_id == production_id,
            Shot.deleted_at.is_not(None)
        ).order_by(Shot.deleted_at.desc())
    )
    shots = result.scalars().all()
    # Simple dict serialization
    return [
        {
            "id": s.id,
            "display_number": s.display_number,
            "name": s.name,
            "deleted_at": s.deleted_at.isoformat() if s.deleted_at else None
        }
        for s in shots
    ]


@router.post("/shots/reorder", status_code=status.HTTP_200_OK)
async def reorder_shots(
    req: ShotReorderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Revision-aware atomic numeric reorder through the canonical ShotService."""
    try:
        return await ShotService.reorder_shots(db, req, current_user)
    except NotFoundError as e:
        raise HTTPException(
            status_code=404,
            detail={"code": e.code, "message": e.message},
        )
    except ConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "SHOT_REVISION_CONFLICT",
                "message": e.message,
                "details": e.details,
            },
        )
    except DomainError as e:
        raise _domain_http(e)


@router.post("/shots/bulk-update", status_code=status.HTTP_200_OK)
async def bulk_update_shots(
    req: BulkUpdateShotsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Revision-aware atomic bulk update through the canonical ShotService."""
    try:
        return await ShotService.bulk_update_shots(db, req, current_user)
    except NotFoundError as e:
        raise HTTPException(
            status_code=404,
            detail={"code": e.code, "message": e.message},
        )
    except ConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "SHOT_REVISION_CONFLICT",
                "message": e.message,
                "details": e.details,
            },
        )
    except DomainError as e:
        raise _domain_http(e)
