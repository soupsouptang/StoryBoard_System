"""Export API Routes for CMX 3600 EDL, OpenTimelineIO, SRT, WebVTT, and CSV."""
from __future__ import annotations

import json
import re
import urllib.parse
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.core.database import get_db
from app.models.production import Production
from app.models.shot import Shot
from app.models.user import User
from app.services.exporter import (
    generate_cmx3600_edl,
    generate_csv,
    generate_otio,
    generate_srt,
    generate_vtt,
)

router = APIRouter(prefix="/productions/{production_id}/export", tags=["Exports"])


@router.get("/edl")
async def export_edl(
    production_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export CMX 3600 EDL for DaVinci Resolve / Premiere Pro."""
    p_res = await db.execute(select(Production).where(Production.id == production_id, Production.deleted_at.is_(None)))
    prod = p_res.scalar_one_or_none()
    if not prod:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "项目不存在"})

    s_res = await db.execute(
        select(Shot).where(Shot.production_id == production_id, Shot.deleted_at.is_(None)).order_by(Shot.sort_index.asc())
    )
    shots = s_res.scalars().all()

    fps = prod.fps_num / (prod.fps_den or 1)
    edl_content = generate_cmx3600_edl(shots, fps=fps, is_drop_frame=prod.drop_frame, title=prod.name)

    filename = f"{prod.code or 'PROD'}_Timeline.edl"
    encoded_filename = urllib.parse.quote(filename)
    return Response(
        content=edl_content,
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"}
    )


@router.get("/otio")
async def export_otio(
    production_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export OpenTimelineIO (.otio) JSON document."""
    p_res = await db.execute(select(Production).where(Production.id == production_id, Production.deleted_at.is_(None)))
    prod = p_res.scalar_one_or_none()
    if not prod:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "项目不存在"})

    s_res = await db.execute(
        select(Shot).where(Shot.production_id == production_id, Shot.deleted_at.is_(None)).order_by(Shot.sort_index.asc())
    )
    shots = s_res.scalars().all()

    fps = prod.fps_num / (prod.fps_den or 1)
    otio_doc = generate_otio(shots, fps=fps, title=prod.name)
    content = json.dumps(otio_doc, indent=2, ensure_ascii=False)
    safe_name = re.sub(r'[\\/:*?"<>|\x00-\x1f]', "_", prod.name).strip(" .")[:160] or "Timeline"
    filename = f"{safe_name}.otio"
    encoded_filename = urllib.parse.quote(filename)
    return Response(
        content=content,
        media_type="application/json; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"}
    )


@router.get("/srt")
async def export_srt(
    production_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export SubRip (.srt) subtitle cues aligned with shot timecodes."""
    p_res = await db.execute(select(Production).where(Production.id == production_id, Production.deleted_at.is_(None)))
    prod = p_res.scalar_one_or_none()
    if not prod:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "项目不存在"})

    s_res = await db.execute(
        select(Shot).where(Shot.production_id == production_id, Shot.deleted_at.is_(None)).order_by(Shot.sort_index.asc(), Shot.id.asc())
    )
    shots = s_res.scalars().all()

    fps = prod.fps_num / (prod.fps_den or 1)
    srt_content = generate_srt(
        shots,
        fps=fps,
        start_timecode_frames=prod.start_timecode_frames,
        is_drop_frame=prod.drop_frame,
    )

    safe_name = re.sub(r'[\\/:*?"<>|\x00-\x1f]', "_", prod.name).strip(" .")[:160] or "file"
    filename = f"{safe_name}.srt"
    encoded_filename = urllib.parse.quote(filename)
    return Response(
        content=srt_content.encode("utf-8-sig"),
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"}
    )


@router.get("/vtt")
async def export_vtt(
    production_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export WebVTT subtitle cues aligned with the Legacy integer-frame timing contract."""
    p_res = await db.execute(select(Production).where(Production.id == production_id, Production.deleted_at.is_(None)))
    prod = p_res.scalar_one_or_none()
    if not prod:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "项目不存在"})

    s_res = await db.execute(
        select(Shot).where(Shot.production_id == production_id, Shot.deleted_at.is_(None)).order_by(Shot.sort_index.asc(), Shot.id.asc())
    )
    shots = s_res.scalars().all()

    fps = prod.fps_num / (prod.fps_den or 1)
    vtt_content = generate_vtt(
        shots,
        fps=fps,
        start_timecode_frames=prod.start_timecode_frames,
        is_drop_frame=prod.drop_frame,
    )

    safe_name = re.sub(r'[\\/:*?"<>|\x00-\x1f]', "_", prod.name).strip(" .")[:160] or "file"
    filename = f"{safe_name}.vtt"
    encoded_filename = urllib.parse.quote(filename)
    return Response(
        content=vtt_content.encode("utf-8-sig"),
        media_type="text/vtt; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"}
    )


@router.get("/csv")
async def export_csv(
    production_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export Excel-compatible UTF-8 CSV with all production metadata."""
    p_res = await db.execute(select(Production).where(Production.id == production_id, Production.deleted_at.is_(None)))
    prod = p_res.scalar_one_or_none()
    if not prod:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "项目不存在"})

    s_res = await db.execute(
        select(Shot).where(Shot.production_id == production_id, Shot.deleted_at.is_(None)).order_by(Shot.sort_index.asc())
    )
    shots = s_res.scalars().all()

    fps = prod.fps_num / (prod.fps_den or 1)
    csv_content = generate_csv(shots, fps=fps)

    filename = f"{prod.code or 'PROD'}_Storyboard_Table.csv"
    encoded_filename = urllib.parse.quote(filename)
    return Response(
        content=csv_content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"}
    )
