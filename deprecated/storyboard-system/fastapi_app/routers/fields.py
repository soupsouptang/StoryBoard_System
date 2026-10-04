"""Fields router delegating custom column lifecycle to field_lifecycle module."""

from __future__ import annotations

import sqlite3
import uuid
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi_app.dependencies import get_current_user, get_db_connection
from fastapi_app.schemas import CustomFieldCreateRequest
from field_lifecycle import purge_columns, purged_fields
from runtime_clock import now_iso

router = APIRouter(prefix="/api/projects/{project_id}/custom-fields", tags=["fields"])


@router.get("")
def list_custom_fields(
    project_id: str,
    conn: sqlite3.Connection = Depends(get_db_connection),
    current_user: sqlite3.Row = Depends(get_current_user),
):
    cur = conn.execute(
        """
        SELECT id, project_id, key, label, type, options_json, sort_order, is_required, created_at
        FROM custom_field_definitions WHERE project_id = ? ORDER BY sort_order ASC
        """,
        (project_id,),
    )
    return [dict(r) for r in cur.fetchall()]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_custom_field(
    project_id: str,
    payload: CustomFieldCreateRequest,
    conn: sqlite3.Connection = Depends(get_db_connection),
    current_user: sqlite3.Row = Depends(get_current_user),
):
    # Check duplicate key
    cur = conn.execute(
        "SELECT id FROM custom_field_definitions WHERE project_id = ? AND key = ?",
        (project_id, payload.key),
    )
    if cur.fetchone():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Field key {payload.key} already exists")

    field_id = f"cf-{uuid.uuid4().hex[:12]}"
    import json
    conn.execute(
        """
        INSERT INTO custom_field_definitions (id, project_id, key, label, type, options_json, sort_order, is_required, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
        """,
        (field_id, project_id, payload.key, payload.label, payload.type, json.dumps(payload.options), 1 if payload.is_required else 0, now_iso()),
    )
    conn.commit()
    return {"id": field_id, "project_id": project_id, "key": payload.key, "label": payload.label}


@router.post("/purge")
def purge_custom_fields(
    project_id: str,
    keys: List[str],
    conn: sqlite3.Connection = Depends(get_db_connection),
    current_user: sqlite3.Row = Depends(get_current_user),
):
    purge_columns(conn, project_id, keys)
    conn.commit()
    return {"ok": True, "purged": keys}
