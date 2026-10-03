"""HTTP adapter for native creative-board commands."""
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from app.api.v1.deps import get_current_user
from app.core.database import db_session
from app.core.exceptions import ConflictError, DomainError, NotFoundError
from app.models.user import User
from app.schemas.board import BoardCommand, BoardCreate, BoardPatch, BoardHistoryCommand
from app.services.board_service import BoardService

router = APIRouter(prefix="/productions/{production_id}/boards", tags=["Boards"])


async def respond(operation):
    try:
        return await operation
    except DomainError as exc:
        code = 404 if isinstance(exc, NotFoundError) else 409 if isinstance(exc, ConflictError) else 403 if exc.code == "FORBIDDEN" else 400
        raise HTTPException(code, detail={"code": exc.code, "message": exc.message, "details": getattr(exc, "details", {})}) from exc


@router.get("")
async def list_boards(production_id: str, kind: Literal["lighting", "moodboard"] | None = None,
    state: Literal["active", "trashed"] = "active", db=db_session, user: User=Depends(get_current_user)):
    return await respond(BoardService.list(db, production_id, kind, state, user))


@router.post("", status_code=201)
async def create_board(production_id: str, req: BoardCreate, db=db_session, user: User=Depends(get_current_user)):
    return await respond(BoardService.create(db, production_id, req, user))


@router.get("/{board_id}")
async def get_board(production_id: str, board_id: str, db=db_session, user: User=Depends(get_current_user)):
    async def read():
        return await BoardService.serialize(db, await BoardService.board(db, production_id, board_id, user))
    return await respond(read())


@router.patch("/{board_id}")
async def patch_board(production_id: str, board_id: str, req: BoardPatch, db=db_session, user: User=Depends(get_current_user)):
    return await respond(BoardService.patch(db, production_id, board_id, req, user))


@router.get("/{board_id}/media/{version_id}")
async def board_media(production_id: str, board_id: str, version_id: str, db=db_session, user: User=Depends(get_current_user)):
    async def read():
        path, mime, digest = await BoardService.media(db, production_id, board_id, version_id, user)
        return FileResponse(path, media_type=mime, headers={"Cache-Control": "private, no-cache",
            "ETag": '"' + digest + '"', "X-Content-Type-Options": "nosniff"})
    return await respond(read())


@router.post("/{board_id}/undo")
async def undo_board(production_id: str, board_id: str, req: BoardHistoryCommand, db=db_session, user: User=Depends(get_current_user)):
    return await respond(BoardService.history(db, production_id, board_id, req.revision, req.history_revision, -1, user))


@router.post("/{board_id}/redo")
async def redo_board(production_id: str, board_id: str, req: BoardHistoryCommand, db=db_session, user: User=Depends(get_current_user)):
    return await respond(BoardService.history(db, production_id, board_id, req.revision, req.history_revision, 1, user))


@router.post("/{board_id}/restore")
async def restore_board(production_id: str, board_id: str, req: BoardCommand, db=db_session, user: User=Depends(get_current_user)):
    return await respond(BoardService.restore(db, production_id, board_id, req.revision, user))


@router.delete("/{board_id}")
async def delete_board(production_id: str, board_id: str, revision: int=Query(gt=0), permanent: bool=False,
    confirm: bool=False, db=db_session, user: User=Depends(get_current_user)):
    return await respond(BoardService.remove(db, production_id, board_id, revision, user, permanent, confirm))
