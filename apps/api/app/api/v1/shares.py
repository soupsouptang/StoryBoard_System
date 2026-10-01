"""Anonymous Review & Client Share API Routes."""
from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.core.database import db_session
from app.models.collaboration import Share
from app.models.production import Production
from app.models.shot import Shot
from app.models.user import User

router = APIRouter(tags=["Shares"])


class PublishShareRequest(BaseModel):
    allow_download: bool = True
    password: Optional[str] = None
    expire_days: Optional[int] = None


@router.post("/productions/{production_id}/share", status_code=status.HTTP_201_CREATED)
async def publish_production_share(
    production_id: str,
    req: PublishShareRequest,
    db: AsyncSession = db_session,
    current_user: User = Depends(get_current_user)
):
    """Publish an anonymous read-only snapshot with an unguessable token."""
    p_res = await db.execute(select(Production).where(Production.id == production_id, Production.deleted_at.is_(None)))
    prod = p_res.scalar_one_or_none()
    if not prod:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "项目不存在"})

    s_res = await db.execute(
        select(Shot).where(Shot.production_id == production_id, Shot.deleted_at.is_(None)).order_by(Shot.sort_index.asc())
    )
    shots = s_res.scalars().all()

    token = secrets.token_urlsafe(24)
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=req.expire_days) if req.expire_days else None

    # Construct frozen immutable snapshot
    snapshot: dict[str, Any] = {
        "production": {
            "id": prod.id,
            "name": prod.name,
            "code": prod.code,
            "template_type": prod.template_type,
            "fps_num": prod.fps_num,
            "fps_den": prod.fps_den,
            "drop_frame": prod.drop_frame,
            "aspect_ratio": prod.aspect_ratio,
            "target_duration_frames": prod.target_duration_frames,
            "status": prod.status
        },
        "shots": [
            {
                "id": s.id,
                "display_number": s.display_number,
                "name": s.name,
                "description": s.description,
                "voiceover": s.voice_over,
                "duration_frames": s.duration_frames,
                "timing_locked": s.timing_locked,
                "shot_size": s.shot_size,
                "lens_mm": s.lens_mm,
                "movement": s.camera_movement.get("type") if isinstance(s.camera_movement, dict) else None,
                "camera_angle": s.camera_angle,
                "primary_method": s.primary_method,
                "department": s.department,
                "owner_id": s.owner_id,
                "status": s.status
            }
            for s in shots
        ],
        "published_at": now.isoformat(),
        "allow_download": req.allow_download
    }

    share = Share(
        id=str(uuid.uuid4()),
        production_id=production_id,
        token_hash=token,
        snapshot_json=snapshot,
        allow_download=req.allow_download,
        expires_at=expires_at,
        created_by=current_user.id
    )
    db.add(share)
    await db.flush()

    return {
        "token": token,
        "url": f"/share/{token}",
        "allow_download": req.allow_download,
        "expires_at": expires_at.isoformat() if expires_at else None
    }


@router.get("/share/{token}")
async def get_shared_snapshot(
    token: str,
    db: AsyncSession = db_session
):
    """Anonymous public endpoint to fetch published frozen storyboard snapshot."""
    res = await db.execute(select(Share).where(Share.token_hash == token, Share.revoked_at.is_(None)))
    share = res.scalar_one_or_none()
    if not share:
        raise HTTPException(status_code=404, detail={"code": "SHARE_NOT_FOUND", "message": "该分享链接不存在或已被撤销"})

    now = datetime.now(timezone.utc)
    if share.expires_at and share.expires_at < now:
        raise HTTPException(status_code=410, detail={"code": "SHARE_EXPIRED", "message": "该分享链接已过期"})

    return share.snapshot_json


@router.delete("/productions/{production_id}/share", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_production_share(
    production_id: str,
    db: AsyncSession = db_session,
    current_user: User = Depends(get_current_user)
):
    """Revoke all active share links for a production."""
    res = await db.execute(select(Share).where(Share.production_id == production_id, Share.revoked_at.is_(None)))
    shares = res.scalars().all()
    now = datetime.now(timezone.utc)
    for s in shares:
        s.revoked_at = now
    await db.flush()
    return None
