"""Production API Routes."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.v1.deps import get_current_user
from app.core.database import get_db
from app.models.production import Production
from app.models.shot import Shot
from app.models.user import User
from app.schemas.production import ProductionCreate, ProductionOut, ProductionUpdate

router = APIRouter(prefix="/productions", tags=["Productions"])


@router.get("", response_model=list[ProductionOut])
async def list_productions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = (
        select(
            Production,
            func.count(Shot.id).filter(Shot.deleted_at.is_(None)).label("shot_count"),
            func.coalesce(func.sum(Shot.duration_frames).filter(Shot.deleted_at.is_(None)), 0).label("total_duration_frames")
        )
        .outerjoin(Shot, Shot.production_id == Production.id)
        .where(Production.deleted_at.is_(None))
        .group_by(Production.id)
        .order_by(Production.updated_at.desc())
    )
    result = await db.execute(query)
    rows = result.all()

    output = []
    for prod, count, dur in rows:
        p_dict = ProductionOut.model_validate(prod)
        p_dict.shot_count = count
        p_dict.total_duration_frames = dur
        output.append(p_dict)
    return output


@router.post("", response_model=ProductionOut, status_code=status.HTTP_201_CREATED)
async def create_production(
    req: ProductionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    pid = str(uuid.uuid4())
    prod = Production(
        id=pid,
        name=req.name,
        code=req.code or req.name[:6].upper(),
        template_type=req.template_type,
        fps_num=req.fps_num,
        fps_den=req.fps_den,
        drop_frame=req.drop_frame,
        start_timecode_frames=req.start_timecode_frames,
        target_duration_frames=req.target_duration_frames,
        aspect_ratio=req.aspect_ratio,
        width=req.width,
        height=req.height,
        status="development",
        created_by=current_user.id
    )
    db.add(prod)

    await db.flush()

    p_out = ProductionOut.model_validate(prod)
    p_out.shot_count = 0
    p_out.total_duration_frames = 0
    return p_out


@router.get("/{id}", response_model=ProductionOut)
async def get_production(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Production).where(Production.id == id, Production.deleted_at.is_(None))
    )
    prod = result.scalar_one_or_none()
    if not prod:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "项目不存在"})

    # Get shot count & duration
    shot_stats = await db.execute(
        select(
            func.count(Shot.id),
            func.coalesce(func.sum(Shot.duration_frames), 0)
        ).where(Shot.production_id == id, Shot.deleted_at.is_(None))
    )
    count, dur = shot_stats.one()

    p_out = ProductionOut.model_validate(prod)
    p_out.shot_count = count
    p_out.total_duration_frames = dur
    return p_out


@router.patch("/{id}", response_model=ProductionOut)
async def update_production(
    id: str,
    req: ProductionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Production).where(Production.id == id, Production.deleted_at.is_(None))
    )
    prod = result.scalar_one_or_none()
    if not prod:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "项目不存在"})

    update_data = req.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(prod, field, val)

    prod.updated_at = datetime.now(timezone.utc)
    await db.flush()

    p_out = ProductionOut.model_validate(prod)
    return p_out


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_production(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Production).where(Production.id == id, Production.deleted_at.is_(None))
    )
    prod = result.scalar_one_or_none()
    if prod:
        # Soft delete per specification
        prod.deleted_at = datetime.now(timezone.utc)
        await db.flush()
    return None
