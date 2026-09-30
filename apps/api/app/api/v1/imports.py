"""Import API Routes for Excel / CSV Table Ingestion."""
from __future__ import annotations

import base64
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.core.database import get_db
from app.core.exceptions import DomainError, NotFoundError
from app.models.user import User
from app.services.importer import map_headers, parse_table
from app.services.import_service import ImportService

router = APIRouter(prefix="/productions/{production_id}", tags=["Imports"])


class ImportPreviewRequest(BaseModel):
    filename: str
    file_base64: str


class ImportCommitRequest(BaseModel):
    rows: list[list[str]]
    mapping: dict[str, dict[str, Any]]
    sequence_id: str | None = None


@router.post("/import-preview")
async def preview_table_import(
    production_id: str,
    req: ImportPreviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Parse uploaded Excel/CSV file, match headers, and return preview sample."""
    try:
        content = base64.b64decode(req.file_base64)
    except Exception:
        raise HTTPException(status_code=400, detail={"code": "INVALID_FILE", "message": "文件 Base64 解码失败"})

    rows = parse_table(content, req.filename)
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
        "raw_rows": data_rows
    }


@router.post("/import-commit", status_code=status.HTTP_201_CREATED)
async def commit_table_import(
    production_id: str,
    req: ImportCommitRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Commit mapped Excel/CSV rows through the standard Shot command."""
    try:
        return await ImportService.commit_table_import(
            db, production_id, rows=req.rows, mapping=req.mapping,
            sequence_id=req.sequence_id, user=current_user,
        )
    except NotFoundError as exc:
        raise HTTPException(404, detail={"code": exc.code, "message": exc.message})
    except DomainError as exc:
        raise HTTPException(
            403 if exc.code == "FORBIDDEN" else 400,
            detail={"code": exc.code, "message": exc.message},
        )
