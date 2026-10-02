"""Import API Routes for Excel / CSV Table Ingestion."""
from __future__ import annotations

import base64
from typing import Any, Annotated
from starlette.concurrency import run_in_threadpool
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.core.database import db_session
from app.core.exceptions import DomainError, NotFoundError
from app.models.user import User
from app.services.importer import map_headers
from app.services.document_import import parse_document, MAX_FILE_BYTES
from app.services.import_service import ImportService

router = APIRouter(prefix="/productions/{production_id}", tags=["Imports"])


class ImportPreviewRequest(BaseModel):
    filename: str = Field(max_length=255)
    file_base64: str = Field(max_length=(MAX_FILE_BYTES + 2) // 3 * 4)


Cell = Annotated[str, Field(max_length=10000)]

class ImportImagePayload(BaseModel):
    row_index: int = Field(ge=0, le=9999, strict=True)
    filename: str = Field(default='image.png', max_length=255)
    mime: str | None = Field(default=None, max_length=128)
    data_base64: str = Field(max_length=14*1024*1024)

class ImportCommitRequest(BaseModel):
    rows: list[Annotated[list[Cell], Field(max_length=200)]] = Field(max_length=10000)
    mapping: dict[str, dict[str, Any]]
    sequence_id: str | None = None
    headers: list[Annotated[str, Field(max_length=1000)]] | None = Field(default=None, max_length=200)
    images: list[ImportImagePayload] = Field(default_factory=list, max_length=1000)


@router.post("/import-preview")
async def preview_table_import(
    production_id: str,
    req: ImportPreviewRequest,
    db: AsyncSession = db_session,
    current_user: User = Depends(get_current_user)
):
    """Parse uploaded Excel/CSV file, match headers, and return preview sample."""
    try:
        await ImportService.require_production(db, production_id, current_user)
    except NotFoundError as exc:
        raise HTTPException(404, detail={"code": exc.code, "message": exc.message})
    except DomainError as exc:
        raise HTTPException(403, detail={"code": exc.code, "message": exc.message})
    if len(req.file_base64) > (MAX_FILE_BYTES + 2) // 3 * 4:
        raise HTTPException(413, detail={"code": "FILE_TOO_LARGE", "message": "文件不得超过 40 MB"})
    try:
        content = base64.b64decode(req.file_base64, validate=True)
    except Exception:
        raise HTTPException(status_code=400, detail={"code": "INVALID_FILE", "message": "文件 Base64 解码失败"})

    try:
        parsed = await run_in_threadpool(parse_document, content, req.filename)
    except Exception as exc:
        message = str(exc) if isinstance(exc, ValueError) else '文档损坏、格式不受支持或无法识别，请检查文件。'
        raise HTTPException(400, detail={"code": "INVALID_FILE", "message": message}) from exc
    rows = parsed['rows']
    if not rows:
        raise HTTPException(status_code=400, detail={"code": "EMPTY_TABLE", "message": "无法解析表格内容或表格为空"})

    headers = [str(c).strip() for c in rows[0]]
    mapping = map_headers(headers)
    data_rows = rows[1:]

    preview_sample: list[dict[str, Any]] = []
    for r in data_rows[:10]:
        shot_sample = {}
        for f, info in mapping.items():
            col = info["col"]
            shot_sample[f] = r[col] if col < len(r) else ""
        preview_sample.append(shot_sample)

    return {
        "total_rows": len(data_rows),
        "headers": headers,
        "mapping": mapping,
        "sample_preview": preview_sample,
        "raw_rows": data_rows, "images": parsed["images"], "warnings": parsed["warnings"]
    }


@router.post("/import-commit", status_code=status.HTTP_201_CREATED)
async def commit_table_import(
    production_id: str,
    req: ImportCommitRequest,
    db: AsyncSession = db_session,
    current_user: User = Depends(get_current_user)
):
    """Commit mapped Excel/CSV rows through the standard Shot command."""
    try:
        return await ImportService.commit_table_import(
            db, production_id, rows=req.rows, mapping=req.mapping,
            sequence_id=req.sequence_id, user=current_user, headers=req.headers, images=[image.model_dump() for image in req.images],
        )
    except NotFoundError as exc:
        raise HTTPException(404, detail={"code": exc.code, "message": exc.message})
    except DomainError as exc:
        raise HTTPException(
            403 if exc.code == "FORBIDDEN" else 400,
            detail={"code": exc.code, "message": exc.message},
        )
