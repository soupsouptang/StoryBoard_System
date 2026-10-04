"""Presence router supporting HTTP polling and WebSocket realtime presence."""

from __future__ import annotations

import sqlite3
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from fastapi_app.dependencies import get_current_user, get_db_connection
from fastapi_app.schemas import PresenceHeartbeatRequest, PresenceLeaveRequest
from presence_system.engine import PresenceEngine
from presence_system.websocket_handler import WebSocketConnectionManager

router = APIRouter(tags=["presence"])

# Shared global presence engine instance for the application process
presence_engine = PresenceEngine()
ws_manager = WebSocketConnectionManager(presence_engine)


@router.get("/api/v1/productions/{production_id}/presence")
def get_production_presence(production_id: str):
    return presence_engine.get_room_presence(production_id)


@router.post("/api/v1/presence/heartbeat")
def presence_heartbeat(payload: PresenceHeartbeatRequest):
    users = presence_engine.heartbeat(
        project_id=payload.production_id,
        user_id=payload.user_id,
        display_name=payload.display_name,
        workspace=payload.workspace,
        module=payload.module,
        shot_id=payload.shot_id,
        field_name=payload.field,
        cursor_x=payload.cursor_x,
        cursor_y=payload.cursor_y,
        cursor_visible=payload.cursor_visible,
        color=payload.color,
        avatar_url=payload.avatar_url,
        presence_state=payload.presence_state,
        session_id=payload.session_id,
    )
    return {"ok": True, "presence": users}


@router.post("/api/v1/presence/leave")
def presence_leave(payload: PresenceLeaveRequest):
    removed = presence_engine.leave(payload.production_id, payload.user_id)
    return {"ok": True, "removed": removed}


@router.websocket("/ws/presence/{project_id}")
async def websocket_presence_endpoint(websocket: WebSocket, project_id: str):
    await ws_manager.connect(websocket, project_id)
    try:
        while True:
            text = await websocket.receive_text()
            await ws_manager.handle_message(websocket, project_id, text)
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, project_id)
