"""Async WebSocket connection manager and protocol dispatcher for FrameForge Presence."""

from __future__ import annotations

import json
from typing import Any, Dict, List, Set
from presence_system.engine import PresenceEngine


class WebSocketConnectionManager:
    """Manages active WebSocket connections by project_id and broadcasts presence events."""

    def __init__(self, engine: PresenceEngine):
        self.engine = engine
        # project_id -> list of active websocket objects
        self.active_connections: Dict[str, List[Any]] = {}

    async def connect(self, websocket: Any, project_id: str) -> None:
        await websocket.accept()
        conns = self.active_connections.setdefault(project_id, [])
        conns.append(websocket)
        # Send initial snapshot
        snapshot = self.engine.get_snapshot(project_id)
        await websocket.send_text(json.dumps({
            "type": "presence_snapshot",
            "payload": snapshot.to_dict(),
        }))

    def disconnect(self, websocket: Any, project_id: str, user_id: Optional[str] = None) -> None:
        conns = self.active_connections.get(project_id, [])
        if websocket in conns:
            conns.remove(websocket)
        if not conns:
            self.active_connections.pop(project_id, None)
        if user_id:
            self.engine.leave(project_id, user_id)

    async def broadcast_to_room(self, project_id: str, message: Dict[str, Any]) -> None:
        conns = self.active_connections.get(project_id, [])
        dead_conns = []
        payload = json.dumps(message)
        for ws in conns:
            try:
                await ws.send_text(payload)
            except Exception:
                dead_conns.append(ws)
        for ws in dead_conns:
            if ws in conns:
                conns.remove(ws)

    async def handle_message(self, websocket: Any, project_id: str, raw_text: str) -> None:
        try:
            data = json.loads(raw_text)
        except Exception:
            return

        msg_type = data.get("type")
        payload = data.get("payload", {})

        if msg_type == "heartbeat":
            presence_list = self.engine.heartbeat(
                project_id=project_id,
                user_id=payload.get("user_id", ""),
                display_name=payload.get("display_name", ""),
                workspace=payload.get("workspace", "table"),
                module=payload.get("module", ""),
                shot_id=payload.get("shot_id"),
                field_name=payload.get("field"),
                cursor_x=payload.get("cursor_x"),
                cursor_y=payload.get("cursor_y"),
                cursor_visible=payload.get("cursor_visible", False),
                color=payload.get("color", ""),
                avatar_url=payload.get("avatar_url", ""),
                presence_state=payload.get("presence_state", "viewing"),
                session_id=payload.get("session_id"),
            )
            # Broadcast updated presence snapshot
            await self.broadcast_to_room(project_id, {
                "type": "presence_update",
                "payload": self.engine.get_snapshot(project_id).to_dict(),
            })

        elif msg_type == "leave":
            user_id = payload.get("user_id", "")
            self.engine.leave(project_id, user_id)
            await self.broadcast_to_room(project_id, {
                "type": "presence_update",
                "payload": self.engine.get_snapshot(project_id).to_dict(),
            })
