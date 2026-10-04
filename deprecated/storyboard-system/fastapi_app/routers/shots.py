"""Shots router for FastAPI, delegating directly to domain command services."""

from __future__ import annotations

import sqlite3
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi_app.dependencies import get_current_user, get_db_connection
from fastapi_app.schemas import BulkShotUpdateRequest, SingleShotUpdateRequest
from shot_updates import ShotConflict, ShotNotFound, ShotUpdateError, update_single_shot
from shot_bulk_updates import BulkShotConflict, BulkShotError, update_bulk_shots

router = APIRouter(tags=["shots"])


@router.get("/api/projects/{project_id}/shots")
def list_shots(
    project_id: str,
    conn: sqlite3.Connection = Depends(get_db_connection),
    current_user: sqlite3.Row = Depends(get_current_user),
):
    cur = conn.execute(
        """
        SELECT id, project_id, position, number, sort_index, title, description, action,
               duration_frames, shot_size, lens, movement, status, revision, updated_at
        FROM shots
        WHERE project_id = ? AND is_deleted = 0 AND deleted_at IS NULL
        ORDER BY sort_index ASC, position ASC
        """,
        (project_id,),
    )
    shots = [dict(row) for row in cur.fetchall()]
    return {"shots": shots, "total": len(shots)}


@router.put("/api/shots/{shot_id}")
def update_shot(
    shot_id: str,
    payload: Dict[str, Any],
    conn: sqlite3.Connection = Depends(get_db_connection),
    current_user: sqlite3.Row = Depends(get_current_user),
):
    user_session = {
        "user_id": current_user["id"],
        "display_name": current_user["display_name"],
        "role": current_user["role"],
    }
    try:
        updated_shot = update_single_shot(conn, shot_id, payload, user_session)
        conn.commit()
        return updated_shot
    except ShotNotFound as err:
        conn.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err))
    except ShotConflict as err:
        conn.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail={"error": "conflict", "message": str(err)})
    except ShotUpdateError as err:
        conn.rollback()
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(err))


@router.put("/api/projects/{project_id}/shots")
def bulk_update(
    project_id: str,
    payload: Dict[str, Any],
    conn: sqlite3.Connection = Depends(get_db_connection),
    current_user: sqlite3.Row = Depends(get_current_user),
):
    user_session = {
        "user_id": current_user["id"],
        "display_name": current_user["display_name"],
        "role": current_user["role"],
    }
    try:
        res = update_bulk_shots(conn, project_id, payload, user_session)
        conn.commit()
        return res
    except BulkShotConflict as err:
        conn.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail={"error": "conflict", "message": str(err)})
    except BulkShotError as err:
        conn.rollback()
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(err))
