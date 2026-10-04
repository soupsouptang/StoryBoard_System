"""FastAPI dependency injection providers."""

from __future__ import annotations

import os
import sqlite3
from typing import Generator, Optional
from fastapi import Cookie, Depends, HTTPException, Header, status
from repositories.contracts import UnitOfWork
from repositories.sqlite_repo import SQLiteUnitOfWork

DATA_ROOT = os.environ.get("STORYBOARD_DATA_ROOT", os.path.join(os.path.dirname(__file__), "..", "data"))
DB_PATH = os.path.join(DATA_ROOT, "storyboard.db")


def get_db_connection() -> Generator[sqlite3.Connection, None, None]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def get_uow(conn: sqlite3.Connection = Depends(get_db_connection)) -> Generator[UnitOfWork, None, None]:
    uow = SQLiteUnitOfWork(conn)
    try:
        yield uow
    finally:
        pass


def get_current_user(
    conn: sqlite3.Connection = Depends(get_db_connection),
    frameforge_session: Optional[str] = Cookie(None),
    authorization: Optional[str] = Header(None),
) -> sqlite3.Row:
    """Validate session cookie or bearer token and return user row."""
    token = frameforge_session
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()

    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    import hashlib
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    cur = conn.execute(
        """
        SELECT u.id, u.email, u.display_name, u.role, u.status, u.user_color, u.avatar_file
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ? AND s.expires_at > strftime('%s', 'now')
        """,
        (token_hash,),
    )
    user = cur.fetchone()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session")
    return user
