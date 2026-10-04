"""Presence System package for FrameForge."""

from presence_system.contracts import (
    CellLock,
    PresenceRoomSnapshot,
    PresenceSession,
    PresenceState,
)
from presence_system.lock_manager import SoftLockManager
from presence_system.engine import PresenceEngine
from presence_system.websocket_handler import WebSocketConnectionManager

__all__ = [
    "CellLock",
    "PresenceRoomSnapshot",
    "PresenceSession",
    "PresenceState",
    "SoftLockManager",
    "PresenceEngine",
    "WebSocketConnectionManager",
]
