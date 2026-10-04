"""Small shared SQLite writes used by HTTP and domain services."""

from __future__ import annotations

import json
import sqlite3

from runtime_clock import now_iso


def audit(db: sqlite3.Connection, actor: str, action: str, target: str, detail: str = "") -> None:
    db.execute("INSERT INTO audit_log(at, actor, action, target, detail) VALUES (?,?,?,?,?)",
               (now_iso(), actor, action, target, str(detail)[:2000]))


def touch_project(db: sqlite3.Connection, project_id: str, session: sqlite3.Row, at: str | None = None) -> None:
    stamp = at or now_iso()
    actor = str(session["display_name"] or session["username"] or "")
    db.execute("UPDATE projects SET updated_at=?, updated_by=?, updated_by_user_id=? WHERE id=?", (stamp, actor, session["user_id"], project_id))


def insert_record(db, table, record):
    """Only called with internal table names; bind every imported value."""
    columns = {row["name"] for row in db.execute(f"PRAGMA table_info({table})")}
    values = {key: json.dumps(value, ensure_ascii=False, separators=(",", ":")) if isinstance(value, (dict, list)) else value
              for key, value in record.items() if key in columns}
    db.execute(f"INSERT INTO {table} ({','.join(values)}) VALUES ({','.join('?' for _ in values)})", tuple(values.values()))
