"""History HTTP adapter: clients send only direction and cursor revision."""
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from app.api.v1.deps import get_current_user
from app.core.database import db_session
from app.core.exceptions import ConflictError, DomainError, NotFoundError
from app.services.history_service import HistoryService

router = APIRouter(prefix='/productions/{production_id}', tags=['History'])


class HistoryMove(BaseModel):
    revision: int = Field(ge=0, strict=True)


class LayoutUpdate(BaseModel):
    revision: int = Field(ge=0, strict=True)
    config: dict
    initialize: bool = False


def failure(error):
    code = 409 if isinstance(error, ConflictError) else 404 if isinstance(error, NotFoundError) else 403 if error.code == 'FORBIDDEN' else 400
    return HTTPException(code, detail={'code': error.code, 'message': error.message, 'details': getattr(error, 'details', {})})


@router.get('/history')
async def history(production_id: str, db=db_session, user=Depends(get_current_user)):
    try: return await HistoryService.summary(db, production_id, user)
    except DomainError as error: raise failure(error)


@router.post('/history/{direction}')
async def move(production_id: str, direction: Literal['undo', 'redo'], req: HistoryMove, db=db_session, user=Depends(get_current_user)):
    try: return await HistoryService.move(db, production_id, user, direction, req.revision)
    except DomainError as error: raise failure(error)


@router.get('/workspace-layout')
async def read_layout(production_id: str, db=db_session, user=Depends(get_current_user)):
    try:
        await HistoryService.summary(db, production_id, user)
        return await HistoryService.layout(db, production_id, user)
    except DomainError as error: raise failure(error)


@router.put('/workspace-layout')
async def update_layout(production_id: str, req: LayoutUpdate, db=db_session, user=Depends(get_current_user)):
    try:
        await HistoryService.lock(db, production_id)
        existing = await HistoryService.layout(db, production_id, user)
        if req.initialize:
            if existing['config'] is not None: raise ConflictError('表格布局已初始化，请刷新后重试。')
        else:
            await HistoryService.begin(db, production_id, user, '调整表格布局', HistoryService.layout_permission(user))
        return await HistoryService.layout(db, production_id, user, req.config, req.revision)
    except DomainError as error: raise failure(error)
