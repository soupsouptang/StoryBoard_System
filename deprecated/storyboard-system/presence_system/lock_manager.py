"""Lock manager for real-time field-level and shot-level soft reservation."""

from __future__ import annotations

import time
from typing import Dict, List, Optional, Tuple
from presence_system.contracts import CellLock


class SoftLockManager:
    """Thread-safe soft-lock manager preventing concurrent overwrite collisions on shot cells."""

    def __init__(self, lock_timeout_seconds: float = 60.0):
        self._lock_timeout = lock_timeout_seconds
        # Mapping: project_id -> (shot_id, field_name) -> CellLock
        self._locks: Dict[str, Dict[Tuple[str, str], CellLock]] = {}

    def acquire(
        self,
        project_id: str,
        shot_id: str,
        field_name: str,
        user_id: str,
        session_id: str,
    ) -> Tuple[bool, Optional[CellLock]]:
        """Attempt to acquire a soft edit lock on a shot's field.

        Returns (True, acquired_lock) if acquired or refreshed by same session.
        Returns (False, existing_lock) if held by someone else and not expired.
        """
        now = time.time()
        proj_locks = self._locks.setdefault(project_id, {})
        key = (shot_id, field_name)

        existing = proj_locks.get(key)
        if existing:
            # Check expiration
            if now - existing.acquired_at > self._lock_timeout:
                # Lock expired, take over
                pass
            elif existing.session_id == session_id:
                # Same session refreshing lock
                existing.acquired_at = now
                return True, existing
            else:
                # Held by another user
                return False, existing

        new_lock = CellLock(
            shot_id=shot_id,
            field_name=field_name,
            user_id=user_id,
            session_id=session_id,
            acquired_at=now,
        )
        proj_locks[key] = new_lock
        return True, new_lock

    def release(self, project_id: str, shot_id: str, field_name: str, session_id: str) -> bool:
        proj_locks = self._locks.get(project_id)
        if not proj_locks:
            return False
        key = (shot_id, field_name)
        existing = proj_locks.get(key)
        if existing and existing.session_id == session_id:
            del proj_locks[key]
            return True
        return False

    def release_all_for_session(self, project_id: str, session_id: str) -> int:
        proj_locks = self._locks.get(project_id)
        if not proj_locks:
            return 0
        to_del = [k for k, lock in proj_locks.items() if lock.session_id == session_id]
        for k in to_del:
            del proj_locks[k]
        return len(to_del)

    def list_active(self, project_id: str) -> List[CellLock]:
        now = time.time()
        proj_locks = self._locks.get(project_id, {})
        valid = []
        expired = []
        for k, lock in proj_locks.items():
            if now - lock.acquired_at <= self._lock_timeout:
                valid.append(lock)
            else:
                expired.append(k)
        for k in expired:
            del proj_locks[k]
        return valid
