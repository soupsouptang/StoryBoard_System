"""Export API Routes for CMX 3600 EDL, OpenTimelineIO, SubRip SRT, and CSV."""
from __future__ import annotations
from typing import Annotated
from pydantic import BaseModel, Field, StringConstraints

import json
import re
import urllib.parse
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.core.database import db_session
from app.models.production import Production
from app.models.shot import Shot
from app.models.user import User
from app.services.exporter import (
    generate_cmx3600_edl,
    generate_otio,
    generate_srt
)

router = APIRouter(prefix="/productions/{production_id}/export", tags=["Exports"])

def get_export_user(user: User = Depends(get_current_user)):
    from app.services.document_export import require_export_permission
    from app.core.exceptions import DomainError
    try:
        require_export_permission(user)
    except DomainError as error:
        raise HTTPException(403, detail={"code": error.code, "message": error.message}) from error
    return user



@router.get("/edl")
async def export_edl(
    production_id: str,
    db: AsyncSession = db_session,
    current_user: User = Depends(get_export_user)
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
    db: AsyncSession = db_session,
    current_user: User = Depends(get_export_user)
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
    db: AsyncSession = db_session,
    current_user: User = Depends(get_export_user)
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


@router.get('/fields')
async def available_export_fields(production_id: str, db: AsyncSession = db_session, current_user: User = Depends(get_export_user)):
    from app.services.document_export import export_fields
    from app.core.exceptions import DomainError
    try:
        return await export_fields(db, production_id, current_user)
    except DomainError as exc:
        raise HTTPException(403 if exc.code == 'FORBIDDEN' else 404 if exc.code == 'NOT_FOUND' else 400, detail={"code":exc.code,"message":exc.message})


class ExportTemplateSave(BaseModel):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]
    field_ids: list[Annotated[str, StringConstraints(min_length=1, max_length=100)]] = Field(min_length=1, max_length=1000)
    revision: int | None = Field(default=None, ge=1)


def template_http(error):
    code = 409 if error.code == 'CONFLICT' else 403 if error.code == 'FORBIDDEN' else 404 if error.code == 'NOT_FOUND' else 400
    return HTTPException(code, detail={'code': error.code, 'message': error.message})


@router.get('/templates')
async def export_templates(production_id: str, db: AsyncSession = db_session, user: User = Depends(get_export_user)):
    from app.services.export_template_service import list_templates
    from app.core.exceptions import DomainError
    try: return await list_templates(db, production_id, user)
    except DomainError as error: raise template_http(error) from error


async def save_export_template(production_id, req, template_id, db, user):
    from app.services.export_template_service import save_template
    from app.core.exceptions import DomainError
    try: return await save_template(db, production_id, req, user, template_id)
    except DomainError as error: raise template_http(error) from error


@router.post('/templates', status_code=201)
async def create_export_template(production_id: str, req: ExportTemplateSave, db: AsyncSession = db_session, user: User = Depends(get_export_user)):
    return await save_export_template(production_id, req, None, db, user)


@router.patch('/templates/{template_id}')
async def update_export_template(production_id: str, template_id: str, req: ExportTemplateSave, db: AsyncSession = db_session, user: User = Depends(get_export_user)):
    return await save_export_template(production_id, req, template_id, db, user)


@router.get('/{document_format}')
async def export_office_document(production_id: str, document_format: str, fields: str | None = Query(None, max_length=10000), preview: bool = False, page: int = Query(0, ge=0, le=20000), db: AsyncSession = db_session, current_user: User = Depends(get_export_user)):
    from app.services.document_export import export_document, render_pdf_preview, MIMES
    from starlette.concurrency import run_in_threadpool
    from app.core.exceptions import DomainError, NotFoundError
    if document_format not in MIMES:
        raise HTTPException(404, detail={"code": "NOT_FOUND", "message": "不支持该导出格式"})
    try:
        title, content = await export_document(db, production_id, document_format, current_user, fields.split(",") if fields is not None else None)
        if preview and document_format == "pdf":
            image, count = await run_in_threadpool(render_pdf_preview, content, page)
            return Response(image, media_type="image/png", headers={"X-Page-Count": str(count), "Cache-Control": "no-store"})
    except NotFoundError as exc:
        raise HTTPException(404, detail={"code": exc.code, "message": exc.message})
    except DomainError as exc:
        raise HTTPException(403 if exc.code == 'FORBIDDEN' else 400, detail={"code": exc.code, "message": exc.message})
    safe_name = re.sub(r'[\\/:*?"<>|\x00-\x1f]', '_', title).strip(' .')[:160] or 'Storyboard'
    filename = urllib.parse.quote(f'{safe_name}.{document_format}')
    return Response(content=content, media_type=MIMES[document_format], headers={'Content-Disposition': f"{'inline' if preview else 'attachment'}; filename*=UTF-8''{filename}"})
