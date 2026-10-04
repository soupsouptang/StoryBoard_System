"""PresenceEngine orchestrating project presence sessions and lock states."""

from __future__ import annotations

import hashlib
import re
import threading
import time
from typing import Any, Dict, List, Optional
from presence_system.contracts import (
    PresenceRoomSnapshot,
    PresenceSession,
    PresenceState,
)
from presence_system.lock_manager import SoftLockManager


class PresenceEngine:
    """Thread-safe zero-residency collaboration and presence engine."""

    PRESENCE_COLORS = (
        "#F87171", "#FB923C", "#FBBF24", "#34D399", "#2DD4BF",
        "#38BDF8", "#818CF8", "#C084FC", "#F472B6", "#FB7185",
    )

    def __init__(self, ttl_seconds: float = 45.0):
        self._ttl_seconds = ttl_seconds
        self._lock = threading.RLock()
        # project_id -> user_id -> PresenceSession
        self._rooms: Dict[str, Dict[str, PresenceSession]] = {}
        self._lock_mgr = SoftLockManager(lock_timeout_seconds=ttl_seconds)

    @classmethod
    def get_color_for_user(cls, user_id: str) -> str:
        digest = hashlib.sha256(user_id.encode("utf-8")).digest()
        idx = int.from_bytes(digest[:2], "big") % len(cls.PRESENCE_COLORS)
        return cls.PRESENCE_COLORS[idx]

    def heartbeat(
        self,
        project_id: str,
        user_id: str,
        display_name: str,
        workspace: str = "table",
        module: str = "",
        shot_id: Optional[str] = None,
        field_name: Optional[str] = None,
        cursor_x: Optional[float] = None,
        cursor_y: Optional[float] = None,
        cursor_visible: bool = False,
        color: str = "",
        avatar_url: str = "",
        presence_state: str = "viewing",
        session_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        now = time.time()
        s_id = session_id or f"sess-{user_id}"

        # Clean color
        validated_color = color if re.fullmatch(r"#[0-9A-Fa-f]{6}", str(color or "")) else self.get_color_for_user(user_id)

        # Parse presence state
        try:
            st = PresenceState(presence_state)
        except ValueError:
            st = PresenceState.VIEWING

        with self._lock:
            room = self._rooms.setdefault(project_id, {})
            session = PresenceSession(
                session_id=s_id,
                user_id=user_id,
                display_name=display_name,
                project_id=project_id,
                workspace=workspace,
                module=module,
                shot_id=shot_id,
                field_name=field_name,
                cursor_x=cursor_x,
                cursor_y=cursor_y,
                cursor_visible=cursor_visible,
                color=validated_color,
                avatar_url=avatar_url,
                presence_state=st,
                last_seen=now,
            )
            room[user_id] = session

            # If editing, acquire soft lock automatically
            if st == PresenceState.EDITING and shot_id and field_name:
                self._lock_mgr.acquire(project_id, shot_id, field_name, user_id, s_id)
            elif shot_id and field_name is None:
                # Switched to shot selection or non-editing, release any existing locks for this session
                self._lock_mgr.release_all_for_session(project_id, s_id)

            # Reap expired sessions
            expired_uids = [uid for uid, s in room.items() if now - s.last_seen > self._ttl_seconds]
            for uid in expired_uids:
                s = room.pop(uid)
                self._lock_mgr.release_all_for_session(project_id, s.session_id)

            return [s.to_dict() for s in room.values()]

    def leave(self, project_id: str, user_id: str) -> bool:
        with self._lock:
            room = self._rooms.get(project_id)
            if not room:
                return False
            session = room.pop(user_id, None)
            if session:
                self._lock_mgr.release_all_for_session(project_id, session.session_id)
            if not room:
                self._rooms.pop(project_id, None)
            return session is not None

    def get_room_presence(self, project_id: str) -> List[Dict[str, Any]]:
        now = time.time()
        with self._lock:
            room = self._rooms.get(project_id)
            if not room:
                return []
            expired_uids = [uid for uid, s in room.items() if now - s.last_seen > self._ttl_seconds]
            for uid in expired_uids:
                s = room.pop(uid)
                self._lock_mgr.release_all_for_session(project_id, s.session_id)
            return [s.to_dict() for s in room.values()]

    def get_snapshot(self, project_id: str) -> PresenceRoomSnapshot:
        with self._lock:
            active_users = self.get_room_presence(project_id)
            active_locks = [l.to_dict() for l in self._lock_mgr.list_active(project_id)]
            return PresenceRoomSnapshot(
                project_id=project_id,
                active_users=active_users,
                active_locks=active_locks,
                total_online=len(active_users),
            )
