"""Presence contracts and real-time collaboration structures for FrameForge.

Strictly enforces ARCHITECTURE_MIGRATION.md Section 17:
- Zero-residency: Never written to disk database
- Clear separation between UI presence state and persistent entity data
- Supports viewing, selection, and editing soft-locks.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class PresenceState(str, Enum):
    IDLE = "idle"
    VIEWING = "viewing"
    SELECTED = "selected"
    EDITING = "editing"


@dataclass
class CellLock:
    shot_id: str
    field_name: str
    user_id: str
    session_id: str
    acquired_at: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "shot_id": self.shot_id,
            "field": self.field_name,
            "user_id": self.user_id,
            "session_id": self.session_id,
            "acquired_at": self.acquired_at,
        }


@dataclass
class PresenceSession:
    session_id: str
    user_id: str
    display_name: str
    project_id: str
    workspace: str = "table"
    module: str = ""
    shot_id: Optional[str] = None
    field_name: Optional[str] = None
    cursor_x: Optional[float] = None
    cursor_y: Optional[float] = None
    cursor_visible: bool = False
    color: str = "#3B82F6"
    avatar_url: str = ""
    presence_state: PresenceState = PresenceState.VIEWING
    last_seen: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "session_id": self.session_id,
            "user_id": self.user_id,
            "display_name": self.display_name,
            "project_id": self.project_id,
            "workspace": self.workspace,
            "module": self.module,
            "shot_id": self.shot_id,
            "field": self.field_name,
            "cursor_x": self.cursor_x,
            "cursor_y": self.cursor_y,
            "cursor_visible": self.cursor_visible,
            "color": self.color,
            "avatar_url": self.avatar_url,
            "presence_state": self.presence_state.value,
            "last_seen": self.last_seen,
        }


@dataclass
class PresenceRoomSnapshot:
    project_id: str
    active_users: List[Dict[str, Any]]
    active_locks: List[Dict[str, Any]]
    total_online: int

    def to_dict(self) -> Dict[str, Any]:
        return {
            "project_id": self.project_id,
            "active_users": self.active_users,
            "active_locks": self.active_locks,
            "total_online": self.total_online,
        }
