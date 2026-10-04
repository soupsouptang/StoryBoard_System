#!/usr/bin/env python3
"""
FrameForge Professional Film/Video Storyboard & Shot Production Management System.
Master Specification V3.0 Backend Engine.
Standard library only: HTTP + SQLite + Threading + Encryption + Media Proxy.
"""
from __future__ import annotations

import base64
import colorsys
import csv
import hashlib
import hmac
import io
import json
import math
import mimetypes
import os
import re
import secrets
import shutil
import sqlite3
import sys
import threading
import time
import urllib.parse
import uuid
import zipfile
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from delivery_exports import (
    frames_to_tc, tc_to_frames, generate_cmx3600_edl, generate_otio_json,
    generate_fcpxml, generate_srt_subtitles, generate_vtt_subtitles,
)
from portable_project_export import export_portable_project
from shot_updates import ShotConflict, ShotNotFound, ShotUpdateError, update_single_shot
from shot_bulk_updates import BulkShotConflict, BulkShotError, update_bulk_shots
from asset_cleanup import asset_usage_reasons, project_asset_cleanup_plan
from narration_timing import estimate_narration_frames, compute_auto_timing
from text_format import normalize_rich_text
from field_lifecycle import purge_columns, purged_fields, column_preferences as project_column_preferences, write_column_preferences
from creative_boards import SCHEMA as CREATIVE_BOARDS_SCHEMA, handle_creative_boards, CreativeBoardsConflict, normalize_boards
from import_parsing import (
    norm_header, map_headers, parse_pdf_storyboard, build_import_custom_columns,
    parse_xlsx_package, parse_xlsx_rows,
)
from schema_migrations import apply_schema_migrations
from import_staging import (
    cache_import_parse, load_import_parse, staged_image_bytes,
    cleanup_import_staging, remove_staged_import,
)
from persistence_helpers import audit, insert_record, touch_project
from runtime_clock import now_iso
from shot_versions import apply_shot_version_snapshot, record_review_decision, complete_shot_snapshot
from project_pdf_roundtrip import (
    ProjectPdfError, embed_project_backup, extract_project_backup,
    render_project_summary_pdf,
)

APP_ROOT = Path(__file__).resolve().parent
VENDOR_ROOT = APP_ROOT / "vendor"
if VENDOR_ROOT.is_dir() and str(VENDOR_ROOT) not in sys.path:
    sys.path.insert(0, str(VENDOR_ROOT))
STATIC_ROOT = APP_ROOT / "static"
DATA_ROOT = Path(os.environ.get("STORYBOARD_DATA_ROOT", APP_ROOT / "data")).resolve()
DB_PATH = DATA_ROOT / "storyboard.db"
MEDIA_ROOT = DATA_ROOT / "media"
EXPORT_ROOT = DATA_ROOT / "exports"
IMPORT_ROOT = DATA_ROOT / "import_staging"
AVATAR_ROOT = DATA_ROOT / "avatars"
MAX_BODY = int(os.environ.get("STORYBOARD_MAX_BODY", str(400 * 1024 * 1024)))
MEDIA_UPLOAD_MAX_BYTES = int(os.environ.get("STORYBOARD_MEDIA_MAX_BODY", str(120 * 1024 * 1024)))
PANEL_DRAWING_BUNDLE_LIMIT = 256 * 1024
IMPORT_TTL_SECONDS = int(os.environ.get("STORYBOARD_IMPORT_TTL", str(2 * 60 * 60)))
SESSION_SECONDS = 14 * 86400
FPS_VALUES = {23.976, 24.0, 25.0, 29.97, 30.0, 48.0, 50.0, 59.94, 60.0}
SESSION_COOKIE = "frameforge_session"

# Standard Production Methods (Spec Section 5)
PRODUCTION_METHODS = [
    "LIVE", "STOCK", "CLIENT", "ARCHIVE", "STILL",
    "AE", "MG", "3D", "VFX", "TYPE"
]

# Standard Departments (Spec Section 8)
DEPARTMENTS = [
    "Director", "Camera", "Production", "Art", "Stock",
    "Editorial", "Motion", "MG", "3D", "VFX", "Sound", "Color", "Legal"
]

# Standard Approval Statuses (Spec Section 96)
APPROVAL_STATUSES = [
    "Draft", "WIP", "Ready for Review", "Changes Requested", "Approved", "Locked", "Deprecated"
]




def avatar_url(user) -> str | None:
    if not user or not user["avatar_file"]:
        return None
    uid = user["user_id"] if "user_id" in user.keys() else user["id"]
    version = hashlib.sha256(str(user["avatar_file"]).encode()).hexdigest()[:20]
    return f"/api/avatars/{uid}?v={version}"


def json_dumps(value) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def normalize_drawing_json(value):
    """Unwrap legacy JSON-in-JSON without discarding unrecognized drawing data."""
    original = value
    for _ in range(64):
        if not isinstance(value, str):
            return json_dumps(value)
        try:
            decoded = json.loads(value)
        except (ValueError, TypeError):
            return original if isinstance(original, str) else json_dumps(original)
        if decoded == value:
            break
        value = decoded
    return original if isinstance(original, str) else json_dumps(original)


_database_context = threading.local()


class Database(sqlite3.Connection):
    """Transaction context that also commits/rollbacks."""
    def __enter__(self):
        self._previous_context = getattr(_database_context, "connection", None)
        _database_context.connection = self
        return self

    def __exit__(self, exc_type, exc, traceback):
        try:
            if exc_type is None:
                self.commit()
            else:
                self.rollback()
        finally:
            _database_context.connection = self._previous_context
            self.close()
        return False


def connect() -> sqlite3.Connection:
    db = sqlite3.connect(DB_PATH, timeout=30, factory=Database)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    db.execute("PRAGMA journal_mode=WAL")
    return db


def password_hash(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    rounds = 310_000
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, rounds)
    return f"pbkdf2_sha256${rounds}${base64.urlsafe_b64encode(salt).decode()}${base64.urlsafe_b64encode(digest).decode()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        _, rounds, salt, expected = encoded.split("$", 3)
        salt_b = base64.urlsafe_b64decode(salt)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt_b, int(rounds))
        return hmac.compare_digest(actual, base64.urlsafe_b64decode(expected))
    except Exception:
        return False


# ===============================================
# VO Auto-Timing Engine (Spec Section 23-30)
# ===============================================

# Narration timing implementation lives in narration_timing.py.

# ==========================================
# Collaboration & Realtime Engine (Spec Master Spec V3.2)
# ==========================================

class CollaborationManager:
    """
    Lightweight in-memory collaboration engine with Redis-like semantics.
    Zero-Residency: Ephemeral presence and soft reservations only, never written to disk.
    """
    def __init__(self):
        self._lock = threading.Lock()
        self.presence: dict[str, dict[str, dict]] = {}
        self.reservations: dict[tuple[str, str], dict] = {}
        self.reorder_leases: dict[str, dict] = {}
        self.timing_leases: dict[str, dict] = {}

    PRESENCE_COLORS = (
        "#F24E1E", "#A259FF", "#1ABCFE", "#0ACF83", "#FF7262",
        "#E84AA9", "#5B8DEF", "#F2A33A", "#6C7CF2", "#20A39E"
    )

    @classmethod
    def presence_color(cls, user_id: str) -> str:
        digest = hashlib.sha256(str(user_id).encode("utf-8")).digest()
        return cls.PRESENCE_COLORS[int.from_bytes(digest[:2], "big") % len(cls.PRESENCE_COLORS)]

    @staticmethod
    def normalize_cursor_value(value):
        try:
            number = float(value)
        except (TypeError, ValueError):
            return None
        if not math.isfinite(number):
            return None
        return round(max(0.0, min(1.0, number)), 5)

    def heartbeat(self, production_id: str, user_id: str, display_name: str, workspace: str = "table", module: str = "", shot_id: str = None, field: str = None, cursor_x=None, cursor_y=None, cursor_visible: bool = False, color: str = "", avatar_url: str = "", presence_state: str = "viewing") -> list[dict]:
        now = time.time()
        normalized_x = self.normalize_cursor_value(cursor_x)
        normalized_y = self.normalize_cursor_value(cursor_y)
        normalized_visible = bool(cursor_visible and normalized_x is not None and normalized_y is not None)
        with self._lock:
            if production_id not in self.presence:
                self.presence[production_id] = {}
            self.presence[production_id][user_id] = {
                "user_id": user_id,
                "display_name": display_name or user_id,
                "workspace": workspace or "table",
                "module": module or workspace or "table",
                "shot_id": shot_id,
                "field": field,
                "presence_state": presence_state if presence_state in {"idle", "viewing", "selected", "editing"} else "viewing",
                "cursor_x": normalized_x,
                "cursor_y": normalized_y,
                "cursor_visible": normalized_visible,
                "color": color if re.fullmatch(r"#[0-9A-Fa-f]{6}", str(color or "")) else self.presence_color(user_id),
                "avatar_url": avatar_url,
                "last_seen": now,
                "status": "online"
            }
            # Clean expired (>45s)
            expired = [uid for uid, p in self.presence[production_id].items() if now - p["last_seen"] > 45]
            for uid in expired:
                del self.presence[production_id][uid]
            # Mark idle (>20s)
            for p in self.presence[production_id].values():
                p["status"] = "idle" if now - p["last_seen"] > 20 else "online"

            return list(self.presence[production_id].values())

    def update_identity(self, user_id: str, display_name: str, color: str, avatar_url: str) -> None:
        with self._lock:
            for project_presence in self.presence.values():
                person = project_presence.get(user_id)
                if person:
                    person.update(display_name=display_name, color=color, avatar_url=avatar_url)

    def leave(self, production_id: str, user_id: str) -> bool:
        with self._lock:
            project_presence = self.presence.get(production_id)
            if not project_presence:
                return False
            removed = project_presence.pop(user_id, None) is not None
            if not project_presence:
                self.presence.pop(production_id, None)
            return removed

    def get_presence(self, production_id: str) -> list[dict]:
        now = time.time()
        with self._lock:
            if production_id not in self.presence:
                return []
            active = []
            for uid, p in list(self.presence[production_id].items()):
                if now - p["last_seen"] <= 45:
                    p["status"] = "idle" if now - p["last_seen"] > 20 else "online"
                    active.append(p)
                else:
                    del self.presence[production_id][uid]
            return active

    def acquire_reservation(self, shot_id: str, field_key: str, user_id: str, user_name: str) -> dict:
        now = time.time()
        with self._lock:
            key = (shot_id, field_key)
            cur = self.reservations.get(key)
            if cur and cur["expires_at"] > now and cur["user_id"] != user_id:
                return {"success": False, "holder": cur["user_name"], "user_id": cur["user_id"], "expires_in": round(cur["expires_at"] - now)}
            self.reservations[key] = {
                "user_id": user_id,
                "user_name": user_name,
                "expires_at": now + 30.0
            }
            return {"success": True, "holder": user_name, "expires_in": 30}

    def release_reservation(self, shot_id: str, field_key: str, user_id: str) -> bool:
        with self._lock:
            key = (shot_id, field_key)
            cur = self.reservations.get(key)
            if cur and cur["user_id"] == user_id:
                del self.reservations[key]
                return True
            return False

    def acquire_reorder_lease(self, sequence_id: str, user_id: str, user_name: str) -> dict:
        now = time.time()
        with self._lock:
            cur = self.reorder_leases.get(sequence_id)
            if cur and cur["expires_at"] > now and cur["user_id"] != user_id:
                return {"success": False, "holder": cur["user_name"], "expires_in": round(cur["expires_at"] - now)}
            self.reorder_leases[sequence_id] = {
                "user_id": user_id,
                "user_name": user_name,
                "expires_at": now + 10.0
            }
            return {"success": True, "expires_in": 10}

    def release_reorder_lease(self, sequence_id: str, user_id: str):
        with self._lock:
            cur = self.reorder_leases.get(sequence_id)
            if cur and cur["user_id"] == user_id:
                del self.reorder_leases[sequence_id]

    def acquire_timing_lease(self, production_id: str, user_id: str, user_name: str) -> dict:
        now = time.time()
        with self._lock:
            cur = self.timing_leases.get(production_id)
            if cur and cur["expires_at"] > now and cur["user_id"] != user_id:
                return {"success": False, "holder": cur["user_name"], "expires_in": round(cur["expires_at"] - now)}
            self.timing_leases[production_id] = {
                "user_id": user_id,
                "user_name": user_name,
                "expires_at": now + 20.0
            }
            return {"success": True, "expires_in": 20}

    def release_timing_lease(self, production_id: str, user_id: str):
        with self._lock:
            cur = self.timing_leases.get(production_id)
            if cur and cur["user_id"] == user_id:
                del self.timing_leases[production_id]

collab_mgr = CollaborationManager()


# ==========================================
# Database Schema (Spec Master Spec V3.2)
# ==========================================

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    display_name TEXT NOT NULL DEFAULT '',
    user_color TEXT NOT NULL DEFAULT '',
    avatar_file TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    csrf TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    production_type TEXT NOT NULL DEFAULT 'promo',
    fps REAL NOT NULL DEFAULT 25.0,
    start_tc TEXT NOT NULL DEFAULT '01:00:00:00',
    target_seconds REAL NOT NULL DEFAULT 270.0,
    aspect_ratio TEXT NOT NULL DEFAULT '16:9',
    status TEXT NOT NULL DEFAULT 'development',
    share_token TEXT UNIQUE,
    is_drop_frame INTEGER NOT NULL DEFAULT 0,
    director TEXT NOT NULL DEFAULT '',
    dp TEXT NOT NULL DEFAULT '',
    producer TEXT NOT NULL DEFAULT '',
    company TEXT NOT NULL DEFAULT '',
    custom_template_json TEXT NOT NULL DEFAULT '{}',
    deleted_at TEXT,
    updated_by TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sequences (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    code TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shots (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    sequence_id TEXT REFERENCES sequences(id) ON DELETE SET NULL,
    position INTEGER NOT NULL,
    number TEXT NOT NULL,
    sort_index INTEGER NOT NULL DEFAULT 0,
    title TEXT NOT NULL DEFAULT '',
    chapter TEXT NOT NULL DEFAULT '',
    scene TEXT NOT NULL DEFAULT '',
    panel_frame TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    action TEXT NOT NULL DEFAULT '',
    performance TEXT NOT NULL DEFAULT '',
    composition TEXT NOT NULL DEFAULT '',
    director_notes TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    duration_frames INTEGER NOT NULL DEFAULT 75,
    locked INTEGER NOT NULL DEFAULT 0,
    handles_head_frames INTEGER NOT NULL DEFAULT 0,
    handles_tail_frames INTEGER NOT NULL DEFAULT 0,
    shot_size TEXT NOT NULL DEFAULT '全景',
    lens TEXT NOT NULL DEFAULT '',
    lens_source TEXT NOT NULL DEFAULT '',
    angle TEXT NOT NULL DEFAULT '',
    height TEXT NOT NULL DEFAULT '',
    movement TEXT NOT NULL DEFAULT '固定',
    equipment TEXT NOT NULL DEFAULT '',
    sensor TEXT NOT NULL DEFAULT '',
    aperture TEXT NOT NULL DEFAULT '',
    shutter TEXT NOT NULL DEFAULT '',
    camera_fps REAL NOT NULL DEFAULT 25.0,
    voiceover TEXT NOT NULL DEFAULT '',
    dialogue TEXT NOT NULL DEFAULT '',
    subtitle TEXT NOT NULL DEFAULT '',
    music TEXT NOT NULL DEFAULT '',
    sound TEXT NOT NULL DEFAULT '',
    primary_method TEXT NOT NULL DEFAULT 'LIVE',
    secondary_methods TEXT NOT NULL DEFAULT '[]',
    department TEXT NOT NULL DEFAULT 'Camera',
    owner TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Draft',
    approval_version TEXT NOT NULL DEFAULT 'v001',
    transition TEXT NOT NULL DEFAULT '',
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    method_data_json TEXT NOT NULL DEFAULT '{}',
    revision INTEGER NOT NULL DEFAULT 1,
    import_columns_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS shots_proj_pos ON shots(project_id, position);
CREATE INDEX IF NOT EXISTS shots_deleted ON shots(is_deleted);

CREATE TABLE IF NOT EXISTS panels (
    id TEXT PRIMARY KEY,
    shot_id TEXT NOT NULL REFERENCES shots(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    label TEXT NOT NULL DEFAULT 'A',
    duration_frames INTEGER NOT NULL DEFAULT 75,
    media_id TEXT,
    drawing_json TEXT NOT NULL DEFAULT '{}',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS production_steps (
    id TEXT PRIMARY KEY,
    shot_id TEXT NOT NULL REFERENCES shots(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    sort_index INTEGER NOT NULL DEFAULT 0,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'TASK',
    input_asset TEXT NOT NULL DEFAULT '',
    output_asset TEXT NOT NULL DEFAULT '',
    department TEXT NOT NULL DEFAULT '',
    owner TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Pending',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    stored_name TEXT NOT NULL UNIQUE,
    mime TEXT NOT NULL,
    size INTEGER NOT NULL,
    category TEXT NOT NULL DEFAULT 'Storyboard',
    version TEXT NOT NULL DEFAULT 'v001',
    rights_info TEXT NOT NULL DEFAULT '',
    source_url TEXT NOT NULL DEFAULT '',
    metadata_json TEXT NOT NULL DEFAULT '{}',
    sha256 TEXT NOT NULL DEFAULT '',
    created_by TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS asset_versions (
    id TEXT PRIMARY KEY,
    asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    version_number TEXT NOT NULL,
    storage_key TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    sha256 TEXT NOT NULL DEFAULT '',
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_by TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    UNIQUE(asset_id, version_number)
);
CREATE INDEX IF NOT EXISTS asset_versions_asset ON asset_versions(asset_id, created_at DESC);

CREATE TABLE IF NOT EXISTS shot_asset_links (
    id TEXT PRIMARY KEY,
    shot_id TEXT NOT NULL REFERENCES shots(id) ON DELETE CASCADE,
    asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'Reference',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shot_versions (
    id TEXT PRIMARY KEY,
    shot_id TEXT NOT NULL REFERENCES shots(id) ON DELETE CASCADE,
    version_num TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    snapshot_json TEXT NOT NULL,
    asset_id TEXT,
    status TEXT NOT NULL DEFAULT 'Draft',
    branch_name TEXT NOT NULL DEFAULT 'main',
    parent_version_id TEXT,
    merge_parent_id TEXT,
    is_accepted INTEGER NOT NULL DEFAULT 0,
    created_by TEXT NOT NULL DEFAULT 'Admin',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS project_snapshots (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version_num TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    snapshot_json TEXT NOT NULL,
    parent_snapshot_id TEXT,
    created_by TEXT NOT NULL DEFAULT 'Admin',
    created_at TEXT NOT NULL,
    UNIQUE(project_id, version_num)
);
CREATE INDEX IF NOT EXISTS project_snapshots_project ON project_snapshots(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    shot_id TEXT NOT NULL REFERENCES shots(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Director',
    text TEXT NOT NULL,
    timecode TEXT NOT NULL DEFAULT '',
    quote_field TEXT NOT NULL DEFAULT '',
    quote_text TEXT NOT NULL DEFAULT '',
    parent_id TEXT,
    is_resolved INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS review_decisions (
    id TEXT PRIMARY KEY,
    shot_id TEXT NOT NULL REFERENCES shots(id) ON DELETE CASCADE,
    version_id TEXT,
    previous_status TEXT NOT NULL DEFAULT '',
    next_status TEXT NOT NULL,
    action_label TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS review_decisions_shot ON review_decisions(shot_id, created_at DESC);

CREATE TABLE IF NOT EXISTS share_links (
    token TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    snapshot_json TEXT NOT NULL,
    is_permanent INTEGER NOT NULL DEFAULT 1,
    allow_download INTEGER NOT NULL DEFAULT 1,
    watermark TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL DEFAULT '',
    revoked_at TEXT,
    created_by TEXT NOT NULL DEFAULT '',
    expires_at INTEGER,
    view_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS custom_field_definitions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    label TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    field_type TEXT NOT NULL DEFAULT 'text',
    group_name TEXT NOT NULL DEFAULT 'Custom',
    options_json TEXT NOT NULL DEFAULT '[]',
    required INTEGER NOT NULL DEFAULT 0,
    default_value TEXT NOT NULL DEFAULT '',
    sort_index INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL DEFAULT 'admin',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shot_custom_field_values (
    id TEXT PRIMARY KEY,
    shot_id TEXT NOT NULL REFERENCES shots(id) ON DELETE CASCADE,
    field_definition_id TEXT NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
    value_text TEXT,
    value_json TEXT,
    updated_at TEXT NOT NULL,
    UNIQUE(shot_id, field_definition_id)
);

CREATE TABLE IF NOT EXISTS shot_change_events (
    id TEXT PRIMARY KEY,
    shot_id TEXT NOT NULL REFERENCES shots(id) ON DELETE CASCADE,
    revision INTEGER NOT NULL,
    changed_fields_json TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS saved_views (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    view_type TEXT NOT NULL DEFAULT 'table',
    is_shared INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL DEFAULT 'admin',
    config_json TEXT NOT NULL,
    revision INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- View configuration is deliberately separate from the column catalogue.
-- Built-in columns are virtual catalogue entries; this table only records a
-- project's user choice, so hidden columns can be restored and removed
-- columns can be added back without deleting data or schema definitions.
CREATE TABLE IF NOT EXISTS project_column_preferences (
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    column_key TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'visible' CHECK(state IN ('visible', 'hidden', 'removed')),
    permanently_deleted INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0,
    width_px INTEGER,
    wrap_text INTEGER NOT NULL DEFAULT 0,
    updated_by TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL,
    PRIMARY KEY(project_id, column_key)
);
CREATE INDEX IF NOT EXISTS project_column_preferences_project ON project_column_preferences(project_id, position);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    payload_json TEXT NOT NULL DEFAULT '{}',
    read_at TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    at TEXT NOT NULL,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS login_attempts (
    key TEXT PRIMARY KEY,
    window_start INTEGER NOT NULL,
    attempts INTEGER NOT NULL
);
"""

DEFAULT_TABLE_COLUMN_KEYS = {
    "select", "number", "thumb", "tc", "duration", "title", "chapter", "scene",
    "panel_frame", "shot_size", "lens", "movement", "angle", "description", "voiceover",
    "methods", "status", "department", "actions", "script_scene_type",
    "script_time_of_day", "script_character", "script_parenthetical", "dialogue", "transition",
}


def allocate_user_color(db: sqlite3.Connection, user_id: str) -> str:
    """Return a persistent color not assigned to any other user."""
    used = {str(row["user_color"] or "").upper() for row in db.execute("SELECT user_color FROM users")}
    seed = int.from_bytes(hashlib.sha256(user_id.encode("utf-8")).digest()[:4], "big")
    for band_index, (saturation, lightness) in enumerate(((0.72, 0.58), (0.78, 0.68), (0.60, 0.48), (0.82, 0.42))):
        for offset in range(360):
            hue = ((seed + offset * 137 + band_index * 47) % 360) / 360
            red, green, blue = colorsys.hls_to_rgb(hue, lightness, saturation)
            candidate = f"#{round(red * 255):02X}{round(green * 255):02X}{round(blue * 255):02X}"
            if candidate not in used:
                return candidate
    raise RuntimeError("用户颜色池已耗尽")


def init_db() -> None:
    DATA_ROOT.mkdir(parents=True, exist_ok=True)
    MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
    EXPORT_ROOT.mkdir(parents=True, exist_ok=True)
    IMPORT_ROOT.mkdir(parents=True, exist_ok=True)
    AVATAR_ROOT.mkdir(parents=True, exist_ok=True)
    db = connect()
    try:
        db.executescript(SCHEMA)
        db.executescript(CREATIVE_BOARDS_SCHEMA)
        apply_schema_migrations(db)
        db.execute("UPDATE users SET status='ACTIVE' WHERE status IS NULL OR status='' ")
        db.execute("UPDATE production_steps SET sort_index=step_order")
        db.execute("""
            INSERT OR IGNORE INTO asset_versions
                (id, asset_id, version_number, storage_key, mime_type, size, sha256, metadata_json, created_by, created_at)
            SELECT lower(hex(randomblob(16))), id, COALESCE(version, 'v001'), stored_name, mime, size,
                   COALESCE(sha256, ''), COALESCE(metadata_json, '{}'), COALESCE(created_by, ''), created_at
            FROM assets
        """)
        username = os.environ.get("STORYBOARD_ADMIN_USER", "admin")
        password = os.environ.get("STORYBOARD_ADMIN_PASSWORD", "FrameForge2026!Admin")
        row = db.execute("SELECT 1 FROM users WHERE username=?", (username,)).fetchone()
        if not row:
            db.execute(
                "INSERT INTO users (id, username, password_hash, role, display_name, created_at) VALUES (?,?,?,?,?,?)",
                (str(uuid.uuid4()), username, password_hash(password), "admin", "系统管理员", now_iso())
            )
        seen_colors: set[str] = set()
        for user in db.execute("SELECT id, user_color FROM users ORDER BY created_at, id").fetchall():
            color = str(user["user_color"] or "").upper()
            if not re.fullmatch(r"#[0-9A-F]{6}", color) or color in seen_colors:
                color = allocate_user_color(db, user["id"])
                db.execute("UPDATE users SET user_color=? WHERE id=?", (color, user["id"]))
            seen_colors.add(color)
        db.execute("CREATE UNIQUE INDEX IF NOT EXISTS users_unique_color ON users(user_color) WHERE user_color<>''")
        # Seed the bundled source storyboard only when it is available; never synthesize fake shots.
        seed_demo_if_empty(db)
        expired = [row["id"] for row in db.execute("SELECT id FROM shots WHERE is_deleted=1 AND deleted_at IS NOT NULL AND datetime(deleted_at) < datetime('now','-30 days')")]
        if expired:
            purge_shot_records(db, expired)
        db.commit()
        cleanup_orphan_media_files(db)
    finally:
        db.close()



def renumber_project_shots(db: sqlite3.Connection, project_id: str, at: str | None = None) -> None:
    """Keep editorial order, display number and derived timecode order aligned."""
    stamp = at or now_iso()
    rows = db.execute(
        "SELECT id FROM shots WHERE project_id=? AND is_deleted=0 ORDER BY position, id",
        (project_id,),
    ).fetchall()
    for index, row in enumerate(rows):
        db.execute(
            "UPDATE shots SET position=?, sort_index=?, number=?, updated_at=? WHERE id=? AND project_id=?",
            (index, index, f"{index + 1:03d}", stamp, row["id"], project_id),
        )



def purge_shot_records(db: sqlite3.Connection, shot_ids: list[str]) -> int:
    ids = list(dict.fromkeys(str(item) for item in shot_ids if item))
    if not ids:
        return 0
    placeholders = ",".join("?" for _ in ids)
    asset_rows = db.execute(f"SELECT DISTINCT asset_id FROM shot_asset_links WHERE shot_id IN ({placeholders})", ids).fetchall()
    # Permanent deletion severs associations, never deletes the creative board.
    for saved in db.execute("SELECT project_id,data_json FROM project_creative_boards").fetchall():
        boards = json.loads(saved["data_json"])
        changed = False
        for board in boards:
            refs = board.get("shot_ids", [])
            remaining = [sid for sid in refs if sid not in ids]
            if remaining != refs:
                board["shot_ids"] = remaining
                changed = True
        if changed:
            db.execute("UPDATE project_creative_boards SET data_json=?,revision=revision+1,updated_at=? WHERE project_id=?",
                       (json.dumps(boards, ensure_ascii=False), now_iso(), saved["project_id"]))
    db.execute(f"DELETE FROM shots WHERE id IN ({placeholders})", ids)
    for row in asset_rows:
        aid = row["asset_id"]
        if db.execute("SELECT 1 FROM shot_asset_links WHERE asset_id=? LIMIT 1", (aid,)).fetchone():
            continue
        if db.execute("SELECT 1 FROM panels WHERE media_id=? LIMIT 1", (aid,)).fetchone():
            continue
        if db.execute("SELECT 1 FROM production_steps WHERE input_asset=? OR output_asset=? LIMIT 1", (aid, aid)).fetchone():
            continue
        if db.execute("SELECT 1 FROM project_creative_boards WHERE instr(data_json,?)>0 LIMIT 1", (aid,)).fetchone():
            continue
        # JSON snapshots and shares can retain historical media independently
        # of live shot links. Conservative matching keeps uncertain references.
        if any(db.execute(f"SELECT 1 FROM {table} WHERE instr(snapshot_json,?)>0 LIMIT 1", (aid,)).fetchone()
               for table in ("shot_versions", "project_snapshots", "share_links")):
            continue
        if db.execute("SELECT 1 FROM assets WHERE id<>? AND instr(metadata_json,?)>0 LIMIT 1", (aid, aid)).fetchone():
            continue
        db.execute("DELETE FROM assets WHERE id=?", (aid,))
        # File deletion is deferred until after commit and the orphan grace period.
    return len(ids)



def prune_stale_storyboard_asset_links(db: sqlite3.Connection, project_id: str) -> int:
    """Remove legacy Reference links that no longer have a matching Panel.

    Browser uploads historically created both a Panel media_id and a
    shot_asset_links row. Deleting/replacing the Panel used to leave the link
    behind, which could resurrect the old thumbnail through the client fallback
    and made truly unused assets look live forever.
    """
    before = db.total_changes
    db.execute("""
        DELETE FROM shot_asset_links
        WHERE role='Reference'
          AND shot_id IN (SELECT id FROM shots WHERE project_id=?)
          AND NOT EXISTS (
              SELECT 1 FROM panels p
              WHERE p.shot_id=shot_asset_links.shot_id
                AND p.media_id=shot_asset_links.asset_id
          )
    """, (project_id,))
    return db.total_changes - before


def asset_storage_keys(db: sqlite3.Connection, asset_id: str, stored_name: str = "") -> set[str]:
    """Collect every physical object owned by one asset/version chain."""
    keys = {clean_name(str(stored_name or ""))} if stored_name else set()
    keys.update(
        clean_name(str(row["storage_key"] or ""))
        for row in db.execute("SELECT storage_key FROM asset_versions WHERE asset_id=?", (asset_id,))
        if row["storage_key"]
    )
    return {key for key in keys if key and Path(key).name == key}


def remove_media_storage_keys(keys: set[str]) -> tuple[int, int]:
    """Best-effort physical cleanup after DB commit.

    Returning bytes/files lets the UI report what was actually reclaimed.
    Orphan maintenance can remove any file that could not be unlinked here.
    """
    files_removed = 0
    bytes_freed = 0
    root = MEDIA_ROOT.resolve()
    for key in sorted(keys):
        target = (MEDIA_ROOT / clean_name(key)).resolve()
        if target.parent != root:
            continue
        try:
            if target.is_file():
                size = target.stat().st_size
                target.unlink()
                files_removed += 1
                bytes_freed += size
        except OSError:
            continue
    return files_removed, bytes_freed

def cleanup_orphan_media_files(db: sqlite3.Connection, grace_seconds: int = 24 * 3600) -> int:
    """Remove aged filesystem objects that have no database storage reference."""
    referenced = {clean_name(str(row["stored_name"] or "")) for row in db.execute("SELECT stored_name FROM assets")}
    referenced.update(clean_name(str(row["storage_key"] or "")) for row in db.execute("SELECT storage_key FROM asset_versions"))
    cutoff = time.time() - max(0, grace_seconds)
    removed = 0
    for target in MEDIA_ROOT.iterdir():
        try:
            if target.is_file() and target.name not in referenced and target.stat().st_mtime < cutoff:
                target.unlink()
                removed += 1
        except OSError:
            continue
    return removed


def run_trash_maintenance():
    with connect() as db:
        db.execute("BEGIN IMMEDIATE")
        expired = [row["id"] for row in db.execute("SELECT id FROM shots WHERE is_deleted=1 AND deleted_at IS NOT NULL AND datetime(deleted_at)<datetime('now','-30 days')")]
        purge_shot_records(db, expired)
        db.commit()
        # Serialize the reference scan with uploads and asset cloning.
        db.execute("BEGIN IMMEDIATE")
        cleanup_orphan_media_files(db)


def maintenance_loop(stop):
    while not stop.wait(3600):
        try:
            run_trash_maintenance()
        except Exception as exc:
            print(json_dumps({"event": "trash_maintenance_failed", "error": str(exc)}), flush=True)


def shot_dict(row: sqlite3.Row, custom_values: dict = None) -> dict:
    data = dict(row)
    data["locked"] = bool(data.get("locked", 0))
    data["is_deleted"] = bool(data.get("is_deleted", 0))
    data["revision"] = int(data.get("revision") or 1)
    try:
        data["secondary_methods"] = json.loads(data.get("secondary_methods") or "[]")
    except Exception:
        data["secondary_methods"] = []
    try:
        data["method_data_json"] = json.loads(data.get("method_data_json") or "{}")
    except Exception:
        data["method_data_json"] = {}
    try:
        data["import_columns"] = json.loads(data.get("import_columns_json") or "{}")
    except Exception:
        data["import_columns"] = {}
    data["custom_fields"] = custom_values or {}
    data["rich_text_json"] = normalize_rich_text(data.get("rich_text_json"), data)
    return data



BACKUP_PROJECT_TABLES = ("projects", "sequences", "shots", "assets", "custom_field_definitions", "saved_views", "project_column_preferences", "project_snapshots", "project_creative_boards")
BACKUP_SHOT_TABLES = ("panels", "production_steps", "shot_asset_links", "comments", "shot_versions", "review_decisions", "shot_change_events", "shot_custom_field_values")
BACKUP_TABLES = (*BACKUP_PROJECT_TABLES, "asset_versions", *BACKUP_SHOT_TABLES)


def export_project_backup(db, project_id):
    db.execute("BEGIN")
    bundle = project_bundle(db, project_id, include_deleted=True)
    if not bundle:
        raise ValueError("项目不存在")
    bundle["_portable_project"] = export_portable_project(bundle)
    records = {}
    for table in BACKUP_PROJECT_TABLES:
        key = "id" if table == "projects" else "project_id"
        records[table] = [dict(row) for row in db.execute(f"SELECT * FROM {table} WHERE {key}=?", (project_id,))]
    for table in BACKUP_SHOT_TABLES:
        records[table] = [dict(row) for row in db.execute(f"SELECT t.* FROM {table} t JOIN shots s ON s.id=t.shot_id WHERE s.project_id=?", (project_id,))]
    records["asset_versions"] = [dict(row) for row in db.execute("SELECT v.* FROM asset_versions v JOIN assets a ON a.id=v.asset_id WHERE a.project_id=?", (project_id,))]
    keys = {row["stored_name"] for row in records["assets"]} | {row["storage_key"] for row in records["asset_versions"]}
    files, total = {}, 0
    for key in sorted(keys):
        path = (MEDIA_ROOT / key).resolve()
        if path.parent != MEDIA_ROOT.resolve() or not path.is_file():
            raise ValueError("备份素材缺失；未生成不完整备份")
        raw = path.read_bytes()
        total += len(raw)
        if total > MAX_BODY // 2:
            raise ValueError("项目媒体过大，超出 JSON 完整备份限制")
        files[key] = {"data": base64.b64encode(raw).decode("ascii"), "sha256": hashlib.sha256(raw).hexdigest()}
    bundle["_backup"] = {"version": 2, "tables": records, "files": files}
    return bundle


def import_project_backup(db, bundle, session):
    archive = bundle.get("_backup", {})
    if archive.get("version") != 2 or not isinstance(archive.get("tables"), dict) or not isinstance(archive.get("files"), dict):
        raise ValueError("完整备份格式无效")
    records = dict(archive["tables"])
    # Version-2 backups from before creative boards remain importable.
    records.setdefault("project_creative_boards", [])
    if set(records) != set(BACKUP_TABLES) or any(not isinstance(rows, list) or len(rows) > 100000 for rows in records.values()):
        raise ValueError("备份表集合或记录数无效")
    if len(records["projects"]) != 1 or len(records["shots"]) > 10000:
        raise ValueError("备份必须包含一个项目，最多一万镜头")
    source_id = records["projects"][0].get("id")
    id_map, ids_by_table = {}, {}
    for table, rows in records.items():
        ids_by_table[table] = set()
        for row in rows:
            if not isinstance(row, dict):
                raise ValueError("备份记录格式无效")
            if "id" in row:
                key = row["id"]
                if not isinstance(key, str) or not key or key in id_map:
                    raise ValueError("备份 ID 重复或无效")
                id_map[key] = str(uuid.uuid4())
                ids_by_table[table].add(key)
            if table in BACKUP_PROJECT_TABLES and table != "projects" and row.get("project_id") != source_id:
                raise ValueError("备份项目归属无效")
    pid = id_map[source_id]
    if len(records["project_creative_boards"]) > 1:
        raise ValueError("创意板备份记录重复")
    for row in records["project_creative_boards"]:
        row["data_json"] = json.dumps(normalize_boards(json.loads(row.get("data_json", "[]")), ids_by_table["shots"], ids_by_table["assets"]), ensure_ascii=False)
    for table in BACKUP_SHOT_TABLES:
        if any(row.get("shot_id") not in ids_by_table["shots"] for row in records[table]):
            raise ValueError("备份镜头引用无效")
    for table, column, target in (("asset_versions", "asset_id", "assets"), ("shot_asset_links", "asset_id", "assets"), ("shot_custom_field_values", "field_definition_id", "custom_field_definitions"), ("panels", "media_id", "assets")):
        if any(row.get(column) and row[column] not in ids_by_table[target] for row in records[table]):
            raise ValueError("备份关联引用不完整")
    project = records["projects"][0]
    if float(project.get("fps", 0)) not in FPS_VALUES or not str(project.get("name", "")).strip():
        raise ValueError("备份项目参数无效")
    required_files = {row["stored_name"] for row in records["assets"]} | {row["storage_key"] for row in records["asset_versions"]}
    if required_files != set(archive["files"]):
        raise ValueError("备份媒体清单不完整")
    decoded, storage_map, total = {}, {}, 0
    for key, item in archive["files"].items():
        raw = base64.b64decode(item["data"], validate=True)
        total += len(raw)
        if total > MAX_BODY // 2 or hashlib.sha256(raw).hexdigest() != item.get("sha256"):
            raise ValueError("备份媒体校验失败或超限")
        decoded[key] = raw
        storage_map[key] = f"{uuid.uuid4().hex}_{clean_name(Path(key).name)}"
    for table, key in (("assets", "stored_name"), ("asset_versions", "storage_key")):
        for row in records[table]:
            raw = decoded[row[key]]
            if int(row.get("size", -1)) != len(raw) or (row.get("sha256") and row["sha256"] != hashlib.sha256(raw).hexdigest()):
                raise ValueError("备份素材记录与文件不一致")

    def remap(value):
        if isinstance(value, dict):
            return {key: remap(item) for key, item in value.items()}
        if isinstance(value, list):
            return [remap(item) for item in value]
        return id_map.get(value, value) if isinstance(value, str) else value

    created_files = []
    db.execute("BEGIN IMMEDIATE")
    try:
        db.execute("PRAGMA defer_foreign_keys=ON")
        for key, raw in decoded.items():
            path = MEDIA_ROOT / storage_map[key]
            created_files.append(path)
            path.write_bytes(raw)
        for table in BACKUP_TABLES:
            for source in records[table]:
                row = remap(source)
                for key in list(row):
                    if key.endswith("_json") and isinstance(row[key], str):
                        row[key] = json_dumps(remap(json.loads(row[key])))
                for key in ("stored_name", "storage_key"):
                    if key in source:
                        row[key] = storage_map[source[key]]
                if table == "projects":
                    row.update(share_token=None, deleted_at=None, updated_by_user_id=None)
                if table == "comments":
                    row["author_user_id"] = None
                insert_record(db, table, row)
        touch_project(db, pid, session)
        db.commit()
        return pid
    except Exception:
        db.rollback()
        for path in created_files:
            path.unlink(missing_ok=True)
        raise


def paste_shots(db, target_id, payload, session):
    source_id = str(payload.get("source_project_id", ""))
    ids = payload.get("source_ids")
    mode = payload.get("mode", "copy")
    if mode not in {"copy", "cut"} or not isinstance(ids, list) or not ids or len(ids) > 10000 or any(not isinstance(sid, str) for sid in ids) or len(set(ids)) != len(ids):
        raise ValueError("粘贴模式或源镜头列表无效")
    db.execute("BEGIN IMMEDIATE")
    created_files = []
    try:
        for pid in (source_id, target_id):
            if not db.execute("SELECT 1 FROM projects WHERE id=? AND deleted_at IS NULL", (pid,)).fetchone():
                raise ValueError("源项目或目标项目不存在")
        sources = []
        for sid in ids:
            row = db.execute("SELECT * FROM shots WHERE id=? AND project_id=? AND is_deleted=0", (sid, source_id)).fetchone()
            if not row:
                raise ValueError("源镜头不存在或已删除；未粘贴任何镜头")
            sources.append(dict(row))
        target_order = [r["id"] for r in db.execute("SELECT id FROM shots WHERE project_id=? AND is_deleted=0 ORDER BY position,id", (target_id,))]
        position = payload.get("position", len(target_order))
        if not isinstance(position, int) or isinstance(position, bool) or not 0 <= position <= len(target_order):
            raise ValueError("粘贴位置无效")
        at = now_iso()
        # Same-project cut is a reorder and retains all IDs and history.
        if mode == "cut" and source_id == target_id:
            position -= sum(sid in ids for sid in target_order[:position])
            target_order = [sid for sid in target_order if sid not in ids]
            result_ids = ids
        else:
            field_map, asset_map, result_ids = {}, {}, []
            for definition in db.execute("SELECT * FROM custom_field_definitions WHERE project_id=?", (source_id,)).fetchall():
                definition = dict(definition)
                existing = db.execute("SELECT * FROM custom_field_definitions WHERE project_id=? AND key=?", (target_id, definition["key"])).fetchone()
                if existing and (existing["field_type"] != definition["field_type"] or existing["options_json"] != definition["options_json"]):
                    raise ValueError(f"目标自定义列类型或选项冲突：{definition['key']}")
                fid = existing["id"] if existing else str(uuid.uuid4())
                field_map[definition["id"]] = fid
                if not existing:
                    insert_record(db, "custom_field_definitions", {**definition, "id": fid, "project_id": target_id})

            def copy_asset(aid):
                if not aid or aid in asset_map:
                    return asset_map.get(aid, aid)
                asset = db.execute("SELECT * FROM assets WHERE id=? AND project_id=?", (aid, source_id)).fetchone()
                if not asset:
                    raise ValueError("源素材不存在或归属错误")
                if source_id == target_id:
                    asset_map[aid] = aid
                    return aid
                new_id = str(uuid.uuid4())
                storage_map = {}
                def copy_file(key):
                    if key not in storage_map:
                        source = (MEDIA_ROOT / str(key)).resolve()
                        if source.parent != MEDIA_ROOT.resolve() or not source.is_file():
                            raise ValueError("源素材文件缺失")
                        name = f"{uuid.uuid4().hex}_{clean_name(source.name)}"
                        destination = MEDIA_ROOT / name
                        created_files.append(destination)
                        shutil.copyfile(source, destination)
                        storage_map[key] = name
                    return storage_map[key]
                insert_record(db, "assets", {**dict(asset), "id": new_id, "project_id": target_id, "stored_name": copy_file(asset["stored_name"])})
                for version in db.execute("SELECT * FROM asset_versions WHERE asset_id=?", (aid,)).fetchall():
                    insert_record(db, "asset_versions", {**dict(version), "id": str(uuid.uuid4()), "asset_id": new_id, "storage_key": copy_file(version["storage_key"])})
                asset_map[aid] = new_id
                return new_id

            for shot in sources:
                old_id, sid = shot["id"], str(uuid.uuid4())
                result_ids.append(sid)
                insert_record(db, "shots", {**shot, "id": sid, "project_id": target_id, "revision": 1, "created_at": at, "updated_at": at})
                for panel in db.execute("SELECT * FROM panels WHERE shot_id=?", (old_id,)).fetchall():
                    insert_record(db, "panels", {**dict(panel), "id": str(uuid.uuid4()), "shot_id": sid, "media_id": copy_asset(panel["media_id"])})
                for step in db.execute("SELECT * FROM production_steps WHERE shot_id=?", (old_id,)).fetchall():
                    values = dict(step)
                    for key in ("input_asset", "output_asset"):
                        if db.execute("SELECT 1 FROM assets WHERE id=? AND project_id=?", (values[key], source_id)).fetchone():
                            values[key] = copy_asset(values[key])
                    insert_record(db, "production_steps", {**values, "id": str(uuid.uuid4()), "shot_id": sid})
                for link in db.execute("SELECT * FROM shot_asset_links WHERE shot_id=?", (old_id,)).fetchall():
                    insert_record(db, "shot_asset_links", {**dict(link), "id": str(uuid.uuid4()), "shot_id": sid, "asset_id": copy_asset(link["asset_id"])})
                for value in db.execute("SELECT * FROM shot_custom_field_values WHERE shot_id=?", (old_id,)).fetchall():
                    insert_record(db, "shot_custom_field_values", {**dict(value), "id": str(uuid.uuid4()), "shot_id": sid, "field_definition_id": field_map[value["field_definition_id"]]})
            if mode == "cut":
                for sid in ids:
                    db.execute("UPDATE shots SET is_deleted=1,deleted_at=?,updated_at=?,revision=revision+1 WHERE id=?", (at, at, sid))
                renumber_project_shots(db, source_id, at)
                touch_project(db, source_id, session, at)
        target_order[position:position] = result_ids
        for index, sid in enumerate(target_order):
            db.execute("UPDATE shots SET position=?,sort_index=?,number=? WHERE id=?", (index, index, f"{index+1:03d}", sid))
        touch_project(db, target_id, session, at)
        create_project_snapshot(db, target_id, session["username"], "粘贴镜头")
        db.commit()
        return result_ids
    except Exception:
        db.rollback()
        for file in created_files:
            file.unlink(missing_ok=True)
        raise


def project_bundle(db: sqlite3.Connection, project_id: str, include_deleted: bool = False) -> dict | None:
    p = db.execute("SELECT * FROM projects WHERE id=? AND deleted_at IS NULL", (project_id,)).fetchone()
    if not p:
        return None
    proj = dict(p)
    proj["is_drop_frame"] = bool(proj.get("is_drop_frame", 0))
    try:
        proj["custom_template_json"] = json.loads(proj.get("custom_template_json") or "{}")
    except Exception:
        proj["custom_template_json"] = {}

    del_filter = "" if include_deleted else " AND is_deleted=0"
    shot_rows = db.execute(
        f"SELECT * FROM shots WHERE project_id=?{del_filter} ORDER BY position, id", (project_id,)
    ).fetchall()

    # Load custom field values
    custom_val_map: dict[str, dict] = {}
    for r in db.execute("""
        SELECT v.shot_id, d.key, v.value_text, v.value_json
        FROM shot_custom_field_values v
        JOIN custom_field_definitions d ON d.id=v.field_definition_id
        WHERE d.project_id=?
    """, (project_id,)):
        sid = r["shot_id"]
        if sid not in custom_val_map:
            custom_val_map[sid] = {}
        val = r["value_text"]
        if r["value_json"]:
            try:
                val = json.loads(r["value_json"])
            except Exception:
                pass
        custom_val_map[sid][r["key"]] = val

    shots = [shot_dict(r, custom_val_map.get(r["id"])) for r in shot_rows]

    # Calculate cumulative timecodes
    cursor = tc_to_frames(proj["start_tc"], proj["fps"])
    is_df = proj["is_drop_frame"]
    fps = proj["fps"]

    for s in shots:
        s["tc_in_frames"] = cursor
        s["tc_in"] = frames_to_tc(cursor, fps, is_df)
        cursor += s["duration_frames"]
        s["tc_out_frames"] = cursor
        s["tc_out"] = frames_to_tc(cursor, fps, is_df)
        s["duration_seconds"] = round(s["duration_frames"] / fps, 3)

    # Attach panels, steps, and assets
    shot_ids = [s["id"] for s in shots]
    panels_map: dict[str, list[dict]] = {sid: [] for sid in shot_ids}
    steps_map: dict[str, list[dict]] = {sid: [] for sid in shot_ids}
    links_map: dict[str, list[dict]] = {sid: [] for sid in shot_ids}
    comments_map: dict[str, list[dict]] = {sid: [] for sid in shot_ids}
    decisions_map: dict[str, list[dict]] = {sid: [] for sid in shot_ids}
    versions_map: dict[str, list[dict]] = {sid: [] for sid in shot_ids}
    change_summary_map: dict[str, dict] = {sid: {"change_count": 0, "last_change_at": ""} for sid in shot_ids}

    if shot_ids:
        placeholders = ",".join("?" for _ in shot_ids)
        for r in db.execute(f"SELECT * FROM panels WHERE shot_id IN ({placeholders}) ORDER BY position", shot_ids):
            panel = dict(r)
            raw_drawing = panel.get("drawing_json") or "{}"
            if len(raw_drawing) <= PANEL_DRAWING_BUNDLE_LIMIT:
                panel["drawing_json"] = normalize_drawing_json(raw_drawing)
            else:
                # Large legacy drawings are loaded by a dedicated editor
                # request, never on every project open/sync/upload response.
                panel.pop("drawing_json", None)
                panel["drawing_json_omitted"] = True
            panels_map[r["shot_id"]].append(panel)
        for r in db.execute(f"SELECT * FROM production_steps WHERE shot_id IN ({placeholders}) ORDER BY sort_index, step_order", shot_ids):
            steps_map[r["shot_id"]].append(dict(r))
        for r in db.execute(f"""
            SELECT l.id as link_id, l.shot_id, l.role, a.* 
            FROM shot_asset_links l JOIN assets a ON l.asset_id=a.id 
            WHERE l.shot_id IN ({placeholders}) ORDER BY a.created_at
        """, shot_ids):
            item = dict(r)
            item.pop("stored_name", None)
            links_map[r["shot_id"]].append(item)
        for r in db.execute(f"SELECT * FROM comments WHERE shot_id IN ({placeholders}) ORDER BY created_at", shot_ids):
            comments_map[r["shot_id"]].append(dict(r))
        for r in db.execute(f"SELECT id, shot_id, version_id, previous_status, next_status, action_label, created_by, created_at FROM review_decisions WHERE shot_id IN ({placeholders}) ORDER BY created_at DESC", shot_ids):
            decisions_map[r["shot_id"]].append(dict(r))
        for r in db.execute(f"SELECT * FROM shot_versions WHERE shot_id IN ({placeholders}) ORDER BY created_at DESC", shot_ids):
            versions_map[r["shot_id"]].append(dict(r))
        for r in db.execute(f"""
            SELECT shot_id, COUNT(*) AS change_count, MAX(created_at) AS last_change_at
            FROM shot_change_events WHERE shot_id IN ({placeholders}) GROUP BY shot_id
        """, shot_ids):
            change_summary_map[r["shot_id"]] = {
                "change_count": int(r["change_count"] or 0),
                "last_change_at": str(r["last_change_at"] or "")
            }

    for s in shots:
        s["panels"] = panels_map.get(s["id"], [])
        s["steps"] = steps_map.get(s["id"], [])
        s["assets"] = links_map.get(s["id"], [])
        s["comments"] = comments_map.get(s["id"], [])
        s["review_history"] = decisions_map.get(s["id"], [])
        s["versions"] = versions_map.get(s["id"], [])
        s.update(change_summary_map.get(s["id"], {"change_count": 0, "last_change_at": ""}))

    # Global project assets
    assets = []
    for r in db.execute("SELECT * FROM assets WHERE project_id=? ORDER BY created_at DESC", (project_id,)):
        item = dict(r)
        item.pop("stored_name", None)
        item["versions"] = []
        for version in db.execute(
            "SELECT id, version_number, mime_type, size, sha256, metadata_json, created_by, created_at "
            "FROM asset_versions WHERE asset_id=? ORDER BY CAST(SUBSTR(version_number, 2) AS INTEGER) DESC, created_at DESC",
            (item["id"],),
        ):
            version_item = dict(version)
            try:
                version_item["metadata"] = json.loads(version_item.pop("metadata_json") or "{}")
            except Exception:
                version_item["metadata"] = {}
                version_item.pop("metadata_json", None)
            item["versions"].append(version_item)
        assets.append(item)

    # Sequences / Chapters
    sequences = [dict(r) for r in db.execute("SELECT * FROM sequences WHERE project_id=? ORDER BY position", (project_id,))]

    # Custom Field Definitions
    custom_field_defs = []
    for r in db.execute("SELECT * FROM custom_field_definitions WHERE project_id=? AND is_active=1 ORDER BY sort_index, created_at", (project_id,)):
        item = dict(r)
        try:
            item["options"] = json.loads(item.get("options_json") or "[]")
        except Exception:
            item["options"] = []
        custom_field_defs.append(item)

    # Saved Views
    saved_views = []
    for r in db.execute("SELECT * FROM saved_views WHERE project_id=? ORDER BY created_at", (project_id,)):
        item = dict(r)
        try:
            item["config"] = json.loads(item.get("config_json") or "{}")
        except Exception:
            item["config"] = {}
        saved_views.append(item)

    column_preferences = project_column_preferences(db, project_id)

    snapshots = [dict(r) for r in db.execute(
        "SELECT id, version_num, name, parent_snapshot_id, created_by, created_at FROM project_snapshots WHERE project_id=? ORDER BY created_at DESC",
        (project_id,),
    )]

    # Realtime Ephemeral Presence
    presence = collab_mgr.get_presence(project_id)

    return {
        "project": proj,
        "shots": shots,
        "assets": assets,
        "sequences": sequences,
        "custom_fields": custom_field_defs,
        "saved_views": saved_views,
        "column_preferences": column_preferences,
        "snapshots": snapshots,
        "presence": presence,
        "total_frames": sum(s["duration_frames"] for s in shots),
        "total_seconds": sum(s["duration_frames"] for s in shots) / fps if fps else 0
    }


def create_project_snapshot(db: sqlite3.Connection, project_id: str, username: str, name: str = "自动更新") -> dict:
    """Persist a complete project bundle as an immutable, lightweight Git-style commit."""
    bundle = project_bundle(db, project_id)
    if not bundle:
        raise ValueError("项目不存在")
    bundle.pop("snapshots", None)
    latest = db.execute(
        "SELECT id, version_num FROM project_snapshots WHERE project_id=? ORDER BY created_at DESC LIMIT 1",
        (project_id,),
    ).fetchone()
    count = int(db.execute("SELECT COUNT(*) AS n FROM project_snapshots WHERE project_id=?", (project_id,)).fetchone()["n"])
    at = now_iso()
    sid = str(uuid.uuid4())
    version_num = f"v{count + 1:03d}"
    db.execute(
        "INSERT INTO project_snapshots (id, project_id, version_num, name, snapshot_json, parent_snapshot_id, created_by, created_at) VALUES (?,?,?,?,?,?,?,?)",
        (sid, project_id, version_num, str(name)[:160], json.dumps(bundle, ensure_ascii=False), latest["id"] if latest else None, username, at),
    )
    return {"id": sid, "project_id": project_id, "version_num": version_num, "name": str(name)[:160], "parent_snapshot_id": latest["id"] if latest else None, "created_by": username, "created_at": at}


def compact_share_bundle(bundle: dict, visible_columns: list[str] | None = None) -> dict:
    """Build a presentation-only share payload; never expose import/database internals."""
    requested = {str(item) for item in (visible_columns or [])}
    allowed = requested if visible_columns is not None else {"number", "title", "tc", "duration", "shot_size", "lens", "movement", "angle", "description", "voiceover", "methods", "scene", "thumb", "status"}
    safe_project = {key: bundle.get("project", {}).get(key, "") for key in ("id", "name", "fps", "aspect_ratio", "start_tc", "is_drop_frame")}
    safe_shots = []
    for shot in bundle.get("shots", []):
        safe = {"id": shot.get("id", ""), "number": shot.get("number", ""), "title": shot.get("title", ""),
                "tc_in": shot.get("tc_in", ""), "tc_out": shot.get("tc_out", ""), "duration_seconds": shot.get("duration_seconds", 0),
                "duration_frames": shot.get("duration_frames", 0), "shot_size": shot.get("shot_size", ""), "lens": shot.get("lens", ""),
                "movement": shot.get("movement", ""), "angle": shot.get("angle", ""), "scene": shot.get("scene", ""),
                "description": shot.get("description", ""), "voiceover": shot.get("voiceover", ""), "primary_method": shot.get("primary_method", ""),
                "secondary_methods": shot.get("secondary_methods", []), "status": shot.get("status", "Draft")}
        safe["custom_fields"] = {key: value for key, value in (shot.get("custom_fields") or {}).items() if f"custom:{key}" in allowed}
        for field in ("chapter", "panel_frame", "department", "owner", "notes", "action", "dialogue", "script_character", "script_parenthetical", "script_scene_type", "script_time_of_day", "transition"):
            if field in allowed:
                safe[field] = shot.get(field, "")
        # Preserve an explicitly cleared panel: otherwise the viewer falls
        # back to historical reference assets and resurrects an undone image.
        safe["panels"] = [{"id": panel.get("id", ""), "media_id": panel.get("media_id")} for panel in shot.get("panels", [])]
        safe["assets"] = [{"id": asset.get("id", ""), "filename": asset.get("filename", ""), "mime": asset.get("mime", "")} for asset in shot.get("assets", []) if asset.get("id")]
        groups = {"tc_in": "tc", "tc_out": "tc", "duration_seconds": "duration", "duration_frames": "duration", "primary_method": "methods", "secondary_methods": "methods", "panels": "thumb", "assets": "thumb"}
        safe = {key: value for key, value in safe.items() if key in {"id", "custom_fields"} or groups.get(key, key) in allowed}
        marks = normalize_rich_text(shot.get("rich_text_json"), safe)
        if marks:
            safe["rich_text_json"] = marks
        safe_shots.append(safe)
    return {"project": safe_project, "shots": safe_shots,
            "custom_fields": [{key: field.get(key, "") for key in ("key", "label", "field_type", "options")} for field in bundle.get("custom_fields", []) if f"custom:{field.get('key')}" in allowed],
            "share_view": {**bundle.get("share_view", {}), "visible_columns": list(visible_columns) if visible_columns is not None else sorted(allowed)},
            **({"total_frames": bundle.get("total_frames", 0), "total_seconds": bundle.get("total_seconds", 0)} if "duration" in allowed else {})}





# ==========================================
# Seed 80-Shot Demo Production
# ==========================================

def seed_demo_if_empty(db: sqlite3.Connection) -> None:
    """Pre-load the 80-shot Tianjin Agricultural Trade Center production."""
    row = db.execute("SELECT id FROM projects WHERE name LIKE '%天津国际农产品交易中心%'").fetchone()
    if row:
        return

    pid = str(uuid.uuid4())
    at = now_iso()
    db.execute("""
        INSERT INTO projects (
            id, name, production_type, fps, start_tc, target_seconds, aspect_ratio, status,
            director, dp, producer, company, created_at, updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, (
        pid, "天津国际农产品交易中心 · 4分30秒形象宣传片", "promo", 25.0, "01:00:00:00",
        270.0, "16:9", "approved", "张导", "李摄影", "王制片", "北方国际影视传媒", at, at
    ))

    # Check sample files in repo
    sample_js_path = APP_ROOT.parent / "天津国际农产品交易中心_分镜制作网页_V1" / "shots-data.js"
    images_dir = APP_ROOT.parent / "天津国际农产品交易中心_分镜制作网页_V1" / "images"

    shots_data = []
    if sample_js_path.exists():
        content = sample_js_path.read_text(encoding="utf-8", errors="ignore")
        match = re.search(r"window\.STORYBOARD_SHOTS\s*=\s*(\[[\s\S]*?\]);", content)
        if match:
            try:
                shots_data = json.loads(match.group(1))
            except Exception:
                shots_data = []

    if not shots_data:
        # An empty deployment must stay empty. Do not manufacture placeholder
        # shots or synthetic narration that could be mistaken for client data.
        db.execute("DELETE FROM projects WHERE id=?", (pid,))
        return

    method_map = {
        "实拍航拍": "LIVE", "实拍/版权": "STOCK", "实拍航拍/版权": "STOCK",
        "实拍航拍/延时": "LIVE", "MG/合成": "MG", "MG/合成 / MG/3D": "MG",
        "MG动画/三维": "3D", "三维渲染": "3D", "AE包装": "AE", "客户供片": "CLIENT"
    }

    pos = 0
    for item in shots_data:
        sid = str(uuid.uuid4())
        num_str = f"{item.get('id', pos+1):03d}"
        dur_sec = float(item.get("duration", 3.0))
        dur_frames = max(1, int(round(dur_sec * 25.0)))
        raw_method = item.get("method", "实拍")
        p_method = "LIVE"
        for k, v in method_map.items():
            if k in raw_method:
                p_method = v
                break
        if "3D" in raw_method or "三维" in raw_method:
            p_method = "3D"
        elif "MG" in raw_method or "动画" in raw_method:
            p_method = "MG"
        elif "AE" in raw_method or "包装" in raw_method:
            p_method = "AE"
        elif "版权" in raw_method or "网络" in raw_method or "购买" in raw_method:
            p_method = "STOCK"
        elif "客户" in raw_method or "资料" in raw_method:
            p_method = "CLIENT"

        db.execute("""
            INSERT INTO shots (
                id, project_id, position, number, sort_index, title, chapter, scene,
                description, voiceover, duration_frames, shot_size, lens, movement,
                primary_method, secondary_methods, department, owner, status, created_at, updated_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            sid, pid, pos, num_str, pos, item.get("location", f"镜头 {num_str}"),
            item.get("chapter", "篇章一"), item.get("location", ""),
            item.get("description", ""), item.get("voiceover", ""),
            dur_frames, item.get("shotSize", "全景"), item.get("focal", "35mm"),
            item.get("movement", "固定"), p_method, json.dumps([]),
            "Camera" if p_method == "LIVE" else "Motion" if p_method in ("AE", "MG") else "3D" if p_method == "3D" else "Production",
            "王指导", "Approved" if pos < 20 else "WIP", at, at
        ))

        # Check and copy image asset if exists
        img_name = Path(item.get("image", "")).name
        src_img = images_dir / img_name if images_dir.exists() else None
        if src_img and src_img.exists():
            aid = str(uuid.uuid4())
            stored = f"{aid}_{img_name}"
            dest = MEDIA_ROOT / stored
            try:
                shutil.copyfile(src_img, dest)
                db.execute("""
                    INSERT INTO assets (id, project_id, filename, stored_name, mime, size, category, version, created_at)
                    VALUES (?,?,?,?,?,?,?,?,?)
                """, (aid, pid, img_name, stored, "image/jpeg", src_img.stat().st_size, "Storyboard", "v001", at))
                db.execute("""
                    INSERT OR IGNORE INTO asset_versions
                        (id, asset_id, version_number, storage_key, mime_type, size, sha256, metadata_json, created_by, created_at)
                    VALUES (?,?,?,?,?,?,?,?,?,?)
                """, (str(uuid.uuid4()), aid, "v001", stored, "image/jpeg", src_img.stat().st_size, "", "{}", "seed", at))
                db.execute("""
                    INSERT INTO shot_asset_links (id, shot_id, asset_id, role, created_at)
                    VALUES (?,?,?,?,?)
                """, (str(uuid.uuid4()), sid, aid, "Reference", at))
                db.execute("""
                    INSERT INTO panels (id, shot_id, position, label, duration_frames, media_id, created_at, updated_at)
                    VALUES (?,?,?,?,?,?,?,?)
                """, (str(uuid.uuid4()), sid, 0, "A", dur_frames, aid, at, at))
            except Exception:
                pass
        else:
            # Create default panel
            db.execute("""
                INSERT INTO panels (id, shot_id, position, label, duration_frames, created_at, updated_at)
                VALUES (?,?,?,?,?,?,?)
            """, (str(uuid.uuid4()), sid, 0, "A", dur_frames, at, at))

        # Create production steps
        steps = ["01 构图设计", "02 制作执行", "03 审片确认"]
        if p_method == "LIVE":
            steps = ["01 勘景与通告", "02 现场拍摄", "03 剪辑回放"]
        elif p_method in ("AE", "MG"):
            steps = ["01 Styleframe", "02 动态包装", "03 合成与文字"]
        elif p_method == "3D":
            steps = ["01 模型材质", "02 动画灯光", "03 渲染合成"]
        elif p_method == "STOCK":
            steps = ["01 搜索初筛", "02 导演确认", "03 版权购买与下载"]

        for s_idx, st in enumerate(steps):
            db.execute("""
                INSERT INTO production_steps (id, shot_id, step_order, sort_index, name, type, department, status, created_at, updated_at)
                VALUES (?,?,?,?,?,?,?,?,?,?)
            """, (str(uuid.uuid4()), sid, s_idx, s_idx, st, "TASK", "Production", "Done" if pos < 15 else "Pending", at, at))

        pos += 1


def delete_project_files(db: sqlite3.Connection, project_id: str) -> dict[str, object]:
    """Collect project file candidates without touching disk before commit."""
    asset_rows = db.execute("SELECT id, stored_name FROM assets WHERE project_id=?", (project_id,)).fetchall()
    storage_keys = {str(row["stored_name"] or "") for row in asset_rows}
    storage_keys.update(str(row["storage_key"] or "") for row in db.execute(
        "SELECT v.storage_key FROM asset_versions v JOIN assets a ON a.id=v.asset_id WHERE a.project_id=?",
        (project_id,),
    ))

    # Older builds could leave a version file named with the asset id. Capture
    # exact candidates now; the executor rechecks references after commit.
    legacy_keys: set[str] = set()
    for asset in asset_rows:
        asset_id = str(asset["id"] or "")
        if not re.fullmatch(r"[A-Za-z0-9_-]{8,80}", asset_id):
            continue
        for target in MEDIA_ROOT.glob(f"{asset_id}_*"):
            if target.is_file():
                legacy_keys.add(target.name)

    import_files: set[str] = set()
    for manifest_path in IMPORT_ROOT.glob("*.json"):
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        if str(manifest.get("project_id", "")) != project_id:
            continue
        import_files.add(str(manifest.get("stored_name", "")))
        import_files.add(manifest_path.name)

    export_dir = (EXPORT_ROOT / project_id).resolve()
    return {
        "storage_keys": storage_keys,
        "legacy_keys": legacy_keys,
        "import_files": import_files,
        "export_dir": export_dir,
    }


def remove_deleted_project_files(db: sqlite3.Connection, plan: dict[str, object]) -> tuple[int, list[str]]:
    """Delete candidates after commit, retaining any still-referenced media."""
    removed = 0
    errors: list[str] = []
    referenced = {clean_name(str(row["stored_name"] or ""))
                  for row in db.execute("SELECT stored_name FROM assets")}
    referenced.update(clean_name(str(row["storage_key"] or ""))
                      for row in db.execute("SELECT storage_key FROM asset_versions"))
    media_candidates = {
        clean_name(str(key)) for key in set(plan["storage_keys"]) | set(plan["legacy_keys"])
        if key and Path(str(key)).name == str(key)
    } - referenced

    def remove_file(root: Path, name: str) -> None:
        nonlocal removed
        if not name or Path(name).name != name:
            errors.append(f"非法存储文件名：{name[:80]}")
            return
        target = (root / name).resolve()
        if target.parent != root.resolve():
            errors.append(f"文件超出存储目录：{name[:80]}")
            return
        try:
            if target.is_file():
                target.unlink()
                removed += 1
        except OSError as exc:
            errors.append(f"无法删除 {name[:80]}：{exc}")

    for key in media_candidates:
        remove_file(MEDIA_ROOT, key)
    for key in plan["import_files"]:
        remove_file(IMPORT_ROOT, str(key))

    export_dir = Path(plan["export_dir"])
    if export_dir.parent == EXPORT_ROOT.resolve() and export_dir.is_dir():
        try:
            shutil.rmtree(export_dir)
            removed += 1
        except OSError as exc:
            errors.append(f"无法删除工程导出目录：{exc}")
    return removed, errors


def parse_table(payload: bytes, filename: str) -> list[list[str]]:
    if filename.lower().endswith(".xlsx"):
        return parse_xlsx_rows(payload)
    text = payload.decode("utf-8-sig", errors="replace")
    dialect = csv.Sniffer().sniff(text[:4096], delimiters=",\t;") if text.strip() else csv.excel
    return list(csv.reader(io.StringIO(text), dialect))


# ==========================================
# HTTP Request Handler
# ==========================================

class AppHandler(BaseHTTPRequestHandler):
    server_version = "FrameForge/3.0"

    def log_message(self, fmt, *args):
        # Never emit request paths, query strings, cookies, tokens, filenames,
        # or remote IPs to process logs.  The public relay must remain
        # metadata-free; the application only retains structured audit events
        # in its internal database when an authenticated mutation occurs.
        status = str(args[1]) if len(args) > 1 else "unknown"
        print(json_dumps({"at": now_iso(), "event": "http_response", "status": status}), flush=True)

    def security_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Permissions-Policy", "camera=(),microphone=(),geolocation=()")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; img-src 'self' blob: data:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; "
            "script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
        )

    def send_json(self, status: int, data: dict | list, extra_headers: dict[str, str] | None = None):
        # A successful response is an acknowledgement of a committed write.
        # Never let the client's immediate GET race the context-manager commit.
        db = getattr(_database_context, "connection", None)
        if db is not None and db.in_transaction:
            if status < 400 or self.route() == "/api/login":
                db.commit()
            else:
                db.rollback()
        body = json_dumps(data).encode("utf-8")
        self.send_response(status)
        self.security_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        for key, value in (extra_headers or {}).items():
            self.send_header(key, value)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            # The browser may cancel a large response after its deadline. Do
            # not attempt a second 500 response on the already closed socket.
            return

    def send_error_json(self, status: int, message: str):
        self.send_json(status, {"error": message})

    def body(self) -> bytes:
        try:
            size = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            raise ValueError("invalid content length")
        if size < 0 or size > MAX_BODY:
            raise OverflowError("request body exceeds limit")
        return self.rfile.read(size)

    def body_to_file(self, target: Path) -> int:
        """Stream a large upload to internal staging instead of duplicating it in RAM."""
        try:
            size = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            raise ValueError("invalid content length")
        if size <= 0 or size > MAX_BODY:
            raise OverflowError("request body exceeds limit")
        remaining = size
        with target.open("wb") as handle:
            while remaining:
                chunk = self.rfile.read(min(1024 * 1024, remaining))
                if not chunk:
                    raise ConnectionError("upload ended before content length")
                handle.write(chunk)
                remaining -= len(chunk)
        return size

    def json_body(self) -> dict:
        raw = self.body()
        return json.loads(raw.decode("utf-8")) if raw else {}

    def query(self) -> dict[str, list[str]]:
        return urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)

    def session(self, db: sqlite3.Connection):
        cookie = SimpleCookie(self.headers.get("Cookie", ""))
        morsel = cookie.get(SESSION_COOKIE)
        if not morsel:
            return None
        token_hash = hashlib.sha256(morsel.value.encode()).hexdigest()
        row = db.execute(
            "SELECT s.*, u.username, u.role, u.display_name, u.status, u.user_color, u.avatar_file FROM sessions s JOIN users u ON u.id=s.user_id WHERE token_hash=? AND expires_at>?",
            (token_hash, int(time.time()))
        ).fetchone()
        return row

    def has_share_access(self, token: str) -> bool:
        cookie = SimpleCookie(self.headers.get("Cookie", ""))
        morsel = cookie.get("FRAMEFORGE_SHARE_ACCESS")
        return bool(morsel and hmac.compare_digest(morsel.value, token))

    def require_auth(self, db: sqlite3.Connection, mutation=False):
        row = self.session(db)
        if not row:
            self.send_error_json(HTTPStatus.UNAUTHORIZED, "请登录系统")
            return None
        if mutation and str(row["role"] or "").lower() in {"viewer", "client", "guest"}:
            self.send_error_json(HTTPStatus.FORBIDDEN, "当前账号只有查看权限")
            return None
        if mutation and not hmac.compare_digest(self.headers.get("X-CSRF-Token", ""), row["csrf"]):
            self.send_error_json(HTTPStatus.FORBIDDEN, "CSRF 校验失败")
            return None
        return row

    def require_admin(self, db: sqlite3.Connection, mutation=True):
        row = self.require_auth(db, mutation=mutation)
        if not row:
            return None
        if str(row["role"] or "").lower() != "admin":
            self.send_error_json(HTTPStatus.FORBIDDEN, "仅管理员可执行此操作")
            return None
        return row

    def route(self):
        return urllib.parse.unquote(urllib.parse.urlsplit(self.path).path)

    # ----------------------------------------
    # GET Routes
    # ----------------------------------------
    def do_GET(self):
        try:
            path = self.route()
            if path == "/healthz":
                return self.send_json(200, {"ok": True, "service": "FrameForge V3.0", "storage": "internal", "tunnel": "connected"})

            match = re.fullmatch(r"/api/projects/([^/]+)/creative-boards", path)
            if match:
                with connect() as db:
                    if not self.require_auth(db):
                        return
                    try:
                        result = handle_creative_boards(db, match.group(1), "GET")
                    except LookupError:
                        return self.send_error_json(404, "项目不存在")
                    return self.send_json(200, result)

            match = re.fullmatch(r"/api/projects/([^/]+)/assets/unused/preview", path)
            if match:
                with connect() as db:
                    if not self.require_auth(db):
                        return
                    db.execute("BEGIN")
                    pid = match.group(1)
                    if not db.execute(
                        "SELECT 1 FROM projects WHERE id=? AND deleted_at IS NULL",
                        (pid,),
                    ).fetchone():
                        return self.send_error_json(404, "项目不存在")
                    plan = project_asset_cleanup_plan(db, pid)
                    return self.send_json(200, plan)

            if path == "/api/session":
                with connect() as db:
                    s = self.session(db)
                    return self.send_json(200, {
                        "authenticated": bool(s),
                        "user_id": s["user_id"] if s else None,
                        "username": s["username"] if s else None,
                        "display_name": s["display_name"] if s else None,
                        "role": s["role"] if s else None,
                        "status": s["status"] if s else None,
                        "color": s["user_color"] if s else None,
                        "avatar_url": avatar_url(s),
                        "csrf": s["csrf"] if s else None
                    })

            if path == "/api/admin/users":
                with connect() as db:
                    s = self.require_admin(db, mutation=False)
                    if not s:
                        return
                    rows = [dict(r) for r in db.execute(
                        "SELECT id, username, display_name, role, status, user_color AS color, avatar_file, created_at FROM users ORDER BY created_at DESC"
                    )]
                    return self.send_json(200, rows)

            match = re.fullmatch(r"/api/avatars/([^/]+)", path)
            if match:
                with connect() as db:
                    if not self.require_auth(db):
                        return
                    row = db.execute("SELECT avatar_file FROM users WHERE id=?", (match.group(1),)).fetchone()
                    filename = str(row["avatar_file"] or "") if row else ""
                    target = (AVATAR_ROOT / clean_name(filename)).resolve()
                    if not filename or target.parent != AVATAR_ROOT or not target.exists():
                        return self.send_error_json(404, "头像不存在")
                    raw = target.read_bytes()
                    self.send_response(200)
                    self.security_headers()
                    self.send_header("Content-Type", mimetypes.guess_type(filename)[0] or "application/octet-stream")
                    self.send_header("Cache-Control", "private, max-age=300")
                    self.send_header("Content-Length", str(len(raw)))
                    self.end_headers()
                    self.wfile.write(raw)
                    return

            if path == "/api/admin/backup":
                import tempfile as _tmpf, sqlite3 as _sq
                with connect() as db:
                    s = self.require_admin(db, mutation=False)
                    if not s:
                        return
                    tmp_fd, tmp_path = _tmpf.mkstemp(suffix=".db")
                    try:
                        import os as _os
                        _os.close(tmp_fd)
                        dst = _sq.connect(tmp_path)
                        db.backup(dst)
                        dst.close()
                    except Exception as exc:
                        try:
                            import os as _os; _os.unlink(tmp_path)
                        except Exception:
                            pass
                        return self.send_error_json(500, f"备份失败：{exc}")
                import os as _os
                try:
                    with open(tmp_path, "rb") as fh:
                        data = fh.read()
                finally:
                    try: _os.unlink(tmp_path)
                    except Exception: pass
                ts = time.strftime("%Y%m%d_%H%M%S")
                fname = f"frameforge_backup_{ts}.db"
                self.send_response(200)
                self.send_header("Content-Type", "application/octet-stream")
                self.send_header("Content-Disposition", f'attachment; filename="{fname}"')
                self.send_header("Content-Length", str(len(data)))
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(data)
                return

            if path == "/api/projects":
                with connect() as db:
                    if not self.require_auth(db):
                        return
                    rows = [dict(r) for r in db.execute("""
                        SELECT p.*,
                            (SELECT count(*) FROM shots s WHERE s.project_id=p.id AND s.is_deleted=0) as shot_count,
                            (SELECT coalesce(sum(duration_frames),0) FROM shots s WHERE s.project_id=p.id AND s.is_deleted=0) as total_frames,
                            COALESCE(
                              (SELECT pa.media_id
                                 FROM shots s
                                 JOIN panels pa ON pa.shot_id=s.id
                                 JOIN assets cover_a ON cover_a.id=pa.media_id
                                WHERE s.project_id=p.id
                                  AND s.is_deleted=0
                                  AND pa.media_id IS NOT NULL
                                  AND cover_a.mime LIKE 'image/%'
                                ORDER BY s.position ASC, pa.position ASC
                                LIMIT 1),
                              (SELECT sal.asset_id
                                 FROM shots s
                                 JOIN shot_asset_links sal ON sal.shot_id=s.id
                                 JOIN assets cover_link_a ON cover_link_a.id=sal.asset_id
                                WHERE s.project_id=p.id
                                  AND s.is_deleted=0
                                  AND cover_link_a.mime LIKE 'image/%'
                                ORDER BY s.position ASC, cover_link_a.created_at ASC
                                LIMIT 1)
                            ) as cover_media_id
                        FROM projects p WHERE p.deleted_at IS NULL ORDER BY updated_at DESC
                    """)]
                    return self.send_json(200, rows)

            # Reserved AI capability contract. Providers remain disabled until an
            # internal adapter is configured; the public entry point never calls
            # an external model service directly.
            if path == "/api/ai/capabilities":
                with connect() as db:
                    if not self.require_auth(db):
                        return
                    enabled = os.environ.get("STORYBOARD_AI_ENABLED", "0").lower() in {"1", "true", "yes"}
                    return self.send_json(200, {
                        "enabled": enabled,
                        "provider": os.environ.get("STORYBOARD_AI_PROVIDER", "") if enabled else None,
                        "transport": "internal-provider-adapter",
                        "capabilities": {"script_breakdown": False, "visual_suggestions": False, "timing_assist": False},
                        "endpoints": {"script_breakdown": "/api/ai/script-breakdown", "visual_suggestions": "/api/ai/visual-suggestions"},
                        "message": "AI 能力当前关闭，仅保留内网 Provider 接口契约。"
                    })

            # Single project bundle
            match = re.fullmatch(r"/api/projects/([^/]+)", path)
            if match:
                with connect() as db:
                    if not self.require_auth(db):
                        return
                    bundle = project_bundle(db, match.group(1))
                    return self.send_json(200, bundle) if bundle else self.send_error_json(404, "项目不存在")

            match = re.fullmatch(r"/api/projects/([^/]+)/sync-state", path)
            if match:
                with connect() as db:
                    if not self.require_auth(db):
                        return
                    row = db.execute(
                        "SELECT id, updated_at, updated_by FROM projects WHERE id=? AND deleted_at IS NULL",
                        (match.group(1),),
                    ).fetchone()
                    return self.send_json(200, dict(row)) if row else self.send_error_json(404, "项目不存在")

            match = re.fullmatch(r"/api/projects/([^/]+)/trash", path)
            if match:
                with connect() as db:
                    if not self.require_auth(db):
                        return
                    rows = [dict(row) for row in db.execute(
                        "SELECT id, number, title, deleted_at, position FROM shots WHERE project_id=? AND is_deleted=1 ORDER BY deleted_at DESC, position",
                        (match.group(1),),
                    )]
                    return self.send_json(200, rows)

            match = re.fullmatch(r"/api/projects/([^/]+)/snapshots", path)
            if match:
                with connect() as db:
                    if not self.require_auth(db):
                        return
                    pid = match.group(1)
                    if not db.execute("SELECT 1 FROM projects WHERE id=? AND deleted_at IS NULL", (pid,)).fetchone():
                        return self.send_error_json(404, "项目不存在")
                    rows = [dict(r) for r in db.execute(
                        "SELECT id, version_num, name, parent_snapshot_id, created_by, created_at FROM project_snapshots WHERE project_id=? ORDER BY created_at DESC",
                        (pid,),
                    )]
                    return self.send_json(200, rows)

            # Deliverables export
            match = re.fullmatch(r"/api/projects/([^/]+)/export/([a-zA-Z0-9_-]+)", path)
            if match:
                with connect() as db:
                    if not self.require_auth(db):
                        return
                    pid, export_type = match.group(1), match.group(2)
                    bundle = project_bundle(db, pid)
                    if not bundle:
                        return self.send_error_json(404, "项目不存在")
                    return self.handle_export(bundle, export_type)

            # Anonymous Share
            match = re.fullmatch(r"/api/shares/([^/]+)", path)
            if match:
                with connect() as db:
                    token = match.group(1)
                    row = db.execute("SELECT * FROM share_links WHERE token=?", (token,)).fetchone()
                    if not row:
                        return self.send_error_json(404, "分享链接不存在或已撤销")
                    if row["revoked_at"]:
                        return self.send_error_json(410, "该审片分享已撤销")
                    if row["expires_at"] and row["expires_at"] < int(time.time()):
                        return self.send_error_json(410, "该审片分享已过期")
                    if row["password_hash"] and not self.has_share_access(token):
                        return self.send_json(401, {"password_required": True, "message": "该审片链接需要密码"})
                    db.execute("UPDATE share_links SET view_count = view_count + 1 WHERE token=?", (token,))
                    snapshot = json.loads(row["snapshot_json"])
                    return self.send_json(200, {
                        "share": {"token": token, "allow_download": bool(row["allow_download"]), "watermark": row["watermark"], "password_required": bool(row["password_hash"])},
                        "bundle": snapshot
                    })

            match = re.fullmatch(r"/api/shares/([^/]+)/download", path)
            if match:
                with connect() as db:
                    token = match.group(1)
                    row = db.execute("SELECT * FROM share_links WHERE token=?", (token,)).fetchone()
                    if not row:
                        return self.send_error_json(404, "分享链接不存在")
                    if row["revoked_at"]:
                        return self.send_error_json(410, "该审片分享已撤销")
                    if row["expires_at"] and row["expires_at"] < int(time.time()):
                        return self.send_error_json(410, "该审片分享已过期")
                    if row["password_hash"] and not self.has_share_access(token):
                        return self.send_json(401, {"password_required": True, "message": "下载该审片包需要密码"})
                    if not row["allow_download"]:
                        return self.send_error_json(403, "发布者已禁用下载")
                    snapshot = json.loads(row["snapshot_json"])
                    return self.download_share_zip(snapshot, db)

            # Realtime Presence
            match = re.fullmatch(r"/api/v1/productions/([^/]+)/presence", path)
            if match:
                with connect() as db:
                    if not self.require_auth(db):
                        return
                    return self.send_json(200, collab_mgr.get_presence(match.group(1)))

            # Shot Activity & Change History
            match = re.fullmatch(r"/api/v1/shots/([^/]+)/activity", path)
            if match:
                with connect() as db:
                    if not self.require_auth(db):
                        return
                    rows = [dict(r) for r in db.execute("""
                        SELECT id, shot_id, revision, changed_fields_json, user_name, created_at
                        FROM shot_change_events WHERE shot_id=? ORDER BY created_at DESC LIMIT 30
                    """, (match.group(1),))]
                    for r in rows:
                        try:
                            r["changed_fields"] = json.loads(r["changed_fields_json"])
                        except Exception:
                            r["changed_fields"] = []
                    return self.send_json(200, rows)

            # Custom Fields List
            match = re.fullmatch(r"/api/projects/([^/]+)/custom-fields", path)
            if match:
                with connect() as db:
                    if not self.require_auth(db):
                        return
                    rows = [dict(r) for r in db.execute("""
                        SELECT * FROM custom_field_definitions WHERE project_id=? AND is_active=1 ORDER BY sort_index, created_at
                    """, (match.group(1),))]
                    for r in rows:
                        try:
                            r["options"] = json.loads(r.get("options_json") or "[]")
                        except Exception:
                            r["options"] = []
                    return self.send_json(200, rows)

            # Column preferences are project data. A removed state is the
            # archive; permanently_deleted is a project-scoped tombstone so
            # a purged built-in column cannot reappear from the virtual
            # catalogue on another device.
            match = re.fullmatch(r"/api/projects/([^/]+)/column-preferences", path)
            if match:
                with connect() as db:
                    if not self.require_auth(db):
                        return
                    pid = match.group(1)
                    if not db.execute("SELECT 1 FROM projects WHERE id=? AND deleted_at IS NULL", (pid,)).fetchone():
                        return self.send_error_json(404, "项目不存在")
                    return self.send_json(200, project_column_preferences(db, pid))

            # Authenticated image thumbnails for the staged Excel preview.
            match = re.fullmatch(r"/api/projects/([^/]+)/import-preview/([A-Za-z0-9_-]{20,80})/image/(\d+)", path)
            if match:
                with connect() as db:
                    s = self.require_auth(db)
                    if not s:
                        return
                    return self.serve_import_preview_image(db, s, match.group(1), match.group(2), int(match.group(3)))

            # Saved Views List
            match = re.fullmatch(r"/api/projects/([^/]+)/saved-views", path)
            if match:
                with connect() as db:
                    if not self.require_auth(db):
                        return
                    rows = [dict(r) for r in db.execute("""
                        SELECT * FROM saved_views WHERE project_id=? ORDER BY created_at
                    """, (match.group(1),))]
                    for r in rows:
                        try:
                            r["config"] = json.loads(r.get("config_json") or "{}")
                        except Exception:
                            r["config"] = {}
                    return self.send_json(200, rows)

            # Notifications
            if path == "/api/notifications":
                with connect() as db:
                    s = self.require_auth(db)
                    if not s:
                        return
                    rows = [dict(r) for r in db.execute("""
                        SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50
                    """, (s["user_id"],))]
                    return self.send_json(200, rows)

            # Serve Media
            match = re.fullmatch(r"/media/([^/]+)", path)
            if match:
                with connect() as db:
                    return self.serve_media(db, match.group(1))

            return self.serve_static(path)
        except Exception as exc:
            self.log_error("GET failed: %r", exc)
            return self.send_error_json(500, "服务器内部错误")

    # ----------------------------------------
    # POST Routes
    # ----------------------------------------
    def do_POST(self):
        try:
            path = self.route()
            if path == "/api/login":
                return self.login()
            if path == "/api/register":
                return self.register()

            # Password gate for anonymous share links. It creates a short-lived
            # HttpOnly access cookie; the raw password never appears in the URL.
            match = re.fullmatch(r"/api/shares/([^/]+)/access", path)
            if match:
                token = match.group(1)
                with connect() as db:
                    row = db.execute("SELECT * FROM share_links WHERE token=?", (token,)).fetchone()
                    if not row or row["revoked_at"] or (row["expires_at"] and row["expires_at"] < int(time.time())):
                        return self.send_error_json(404, "分享链接不存在或已失效")
                    data = self.json_body()
                    supplied = str(data.get("password", ""))
                    if not row["password_hash"] or not verify_password(supplied, row["password_hash"]):
                        return self.send_error_json(403, "分享密码错误")
                    snapshot = json.loads(row["snapshot_json"])
                    return self.send_json(200, {"share": {"token": token, "allow_download": bool(row["allow_download"]), "watermark": row["watermark"]}, "bundle": snapshot}, {
                        "Set-Cookie": f"FRAMEFORGE_SHARE_ACCESS={token}; Path=/; Max-Age=86400; HttpOnly; SameSite=Lax"
                    })

            with connect() as db:
                s = self.require_auth(db, mutation=True)
                if not s:
                    return

                if path == "/api/logout":
                    cookie = SimpleCookie(self.headers.get("Cookie", ""))
                    morsel = cookie.get(SESSION_COOKIE)
                    if morsel:
                        db.execute("DELETE FROM sessions WHERE token_hash=?", (hashlib.sha256(morsel.value.encode()).hexdigest(),))
                    audit(db, s["username"], "logout", "session")
                    self.send_response(204)
                    self.security_headers()
                    self.send_header("Set-Cookie", f"{SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax")
                    self.end_headers()
                    return

                if path == "/api/profile/avatar":
                    mime = self.headers.get("Content-Type", "").split(";", 1)[0].lower()
                    suffix = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}.get(mime)
                    payload = self.body()
                    if not suffix or not payload or len(payload) > 5 * 1024 * 1024 or not media_signature_matches(mime, payload):
                        return self.send_error_json(415, "头像仅支持 5MB 内的 JPG、PNG 或 WebP")
                    filename = f"{s['user_id']}_{uuid.uuid4().hex}{suffix}"
                    target = (AVATAR_ROOT / filename).resolve()
                    old = str(s["avatar_file"] or "")
                    target.write_bytes(payload)
                    db.execute("UPDATE users SET avatar_file=? WHERE id=?", (filename, s["user_id"]))
                    if old and old != filename:
                        old_target = (AVATAR_ROOT / clean_name(old)).resolve()
                        if old_target.parent == AVATAR_ROOT:
                            old_target.unlink(missing_ok=True)
                    new_avatar_url = avatar_url({**dict(s), "avatar_file": filename})
                    collab_mgr.update_identity(s["user_id"], s["display_name"] or s["username"], s["user_color"], new_avatar_url)
                    audit(db, s["username"], "update_avatar", s["user_id"])
                    return self.send_json(200, {"avatar_url": new_avatar_url})

                match = re.fullmatch(r"/api/admin/users/([^/]+)/(approve|reject|suspend|reactivate)", path)
                if match:
                    admin = self.require_admin(db)
                    if not admin:
                        return
                    user_id, action = match.group(1), match.group(2)
                    user = db.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
                    if not user:
                        return self.send_error_json(404, "用户不存在")
                    if action == "approve":
                        new_status = "ACTIVE"
                    elif action == "reject":
                        new_status = "REJECTED"
                    elif action == "suspend":
                        if user["id"] == admin["user_id"]:
                            return self.send_error_json(400, "不能停用当前管理员账号")
                        new_status = "SUSPENDED"
                    else:
                        new_status = "ACTIVE"
                    db.execute("UPDATE users SET status=? WHERE id=?", (new_status, user_id))
                    audit(db, admin["username"], f"user_{action}", user_id, user["username"])
                    return self.send_json(200, {"ok": True, "id": user_id, "status": new_status})

                # Presence Heartbeat
                if path == "/api/v1/presence/heartbeat":
                    data = self.json_body()
                    pid = str(data.get("production_id", "")).strip()
                    ws = str(data.get("workspace", "table")).strip()
                    sid = data.get("shot_id")
                    field = data.get("field")
                    cursor = data.get("cursor") if isinstance(data.get("cursor"), dict) else {}
                    presence_list = collab_mgr.heartbeat(
                        pid,
                        s["user_id"],
                        s["display_name"] or s["username"],
                        workspace=ws,
                        module=str(data.get("module", ws)).strip(),
                        shot_id=sid,
                        field=field,
                        cursor_x=cursor.get("x"),
                        cursor_y=cursor.get("y"),
                        cursor_visible=cursor.get("visible", False),
                        color=s["user_color"],
                        avatar_url=avatar_url(s) or "",
                        presence_state=str(data.get("presence_state", "viewing"))
                    )
                    return self.send_json(200, {"ok": True, "presence": presence_list})

                if path == "/api/v1/presence/leave":
                    data = self.json_body()
                    pid = str(data.get("production_id", "")).strip()
                    return self.send_json(200, {"ok": True, "removed": collab_mgr.leave(pid, s["user_id"])})

                # Soft Edit Reservation
                if path == "/api/v1/edit-reservations":
                    data = self.json_body()
                    sid = str(data.get("shot_id", "")).strip()
                    field = str(data.get("field", "")).strip()
                    action = str(data.get("action", "acquire")).strip()
                    if action == "release":
                        released = collab_mgr.release_reservation(sid, field, s["user_id"])
                        return self.send_json(200, {"ok": True, "released": released})
                    else:
                        res = collab_mgr.acquire_reservation(sid, field, s["user_id"], s["display_name"] or s["username"])
                        return self.send_json(200, res)

                match = re.fullmatch(r"/api/projects/([^/]+)/snapshots", path)
                if match:
                    pid = match.group(1)
                    if not db.execute("SELECT 1 FROM projects WHERE id=? AND deleted_at IS NULL", (pid,)).fetchone():
                        return self.send_error_json(404, "项目不存在")
                    data = self.json_body()
                    snapshot = create_project_snapshot(db, pid, s["username"], str(data.get("name", "手动快照")))
                    audit(db, s["username"], "create_project_snapshot", pid, snapshot["version_num"])
                    return self.send_json(201, snapshot)

                # Create Project
                match = re.fullmatch(r"/api/projects/([^/]+)/shots/paste", path)
                if match:
                    pid = match.group(1)
                    pasted_ids = paste_shots(db, pid, self.json_body(), s)
                    result = project_bundle(db, pid)
                    result["pasted_shot_ids"] = pasted_ids
                    return self.send_json(201, result)

                if path == "/api/projects/import-backup":
                    payload = self.json_body()
                    bundle = payload.get("bundle", payload) if isinstance(payload, dict) else {}
                    if "_backup" in bundle:
                        pid = import_project_backup(db, bundle, s)
                        return self.send_json(201, project_bundle(db, pid))
                    source = bundle.get("project") if isinstance(bundle, dict) else None
                    shots = bundle.get("shots", []) if isinstance(bundle, dict) else []
                    if not isinstance(source, dict) or not str(source.get("name", "")).strip() or not isinstance(shots, list) or len(shots) > 10000:
                        return self.send_error_json(400, "备份格式无效")
                    pid, at = str(uuid.uuid4()), now_iso()
                    db.execute("INSERT INTO projects (id,name,production_type,fps,start_tc,target_seconds,aspect_ratio,status,director,dp,producer,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", (
                        pid, str(source.get("name", "备份项目"))[:120], str(source.get("production_type", "promo"))[:32], float(source.get("fps", 25.0)), str(source.get("start_tc", "01:00:00:00"))[:16], float(source.get("target_seconds", 270.0)), str(source.get("aspect_ratio", "16:9"))[:16], "development", str(source.get("director", ""))[:64], str(source.get("dp", ""))[:64], str(source.get("producer", ""))[:64], at, at))
                    touch_project(db, pid, s, at)
                    field_ids = {}
                    for field in bundle.get("custom_fields", []):
                        if not isinstance(field, dict): continue
                        fid, key = str(uuid.uuid4()), re.sub(r"[^a-zA-Z0-9_]", "_", str(field.get("key", "custom")).lower())[:64]
                        field_ids[key] = fid
                        db.execute("INSERT INTO custom_field_definitions (id,project_id,key,label,description,field_type,group_name,options_json,required,default_value,sort_index,is_active,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", (fid,pid,key,str(field.get("label",key))[:80],str(field.get("description", ""))[:500],str(field.get("field_type", "text"))[:32],str(field.get("group_name", "Custom"))[:64],json.dumps(field.get("options", []), ensure_ascii=False),1 if field.get("required") else 0,str(field.get("default_value", ""))[:500],int(field.get("sort_index", 0)),1,s["username"],at,at))
                    for pos, source_shot in enumerate(shots):
                        if not isinstance(source_shot, dict): continue
                        sid = str(uuid.uuid4())
                        dur = max(1, int(source_shot.get("duration_frames", 75)))
                        db.execute("INSERT INTO shots (id,project_id,position,number,sort_index,title,chapter,scene,description,voiceover,duration_frames,shot_size,lens,movement,angle,primary_method,secondary_methods,department,owner,status,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", (sid,pid,pos,f"{pos+1:03d}",pos,str(source_shot.get("title", f"镜头 {pos+1:03d}"))[:200],str(source_shot.get("chapter", ""))[:200],str(source_shot.get("scene", ""))[:200],str(source_shot.get("description", ""))[:10000],str(source_shot.get("voiceover", ""))[:10000],dur,str(source_shot.get("shot_size", "全景"))[:64],str(source_shot.get("lens", ""))[:64],str(source_shot.get("movement", "固定"))[:64],str(source_shot.get("angle", ""))[:64],str(source_shot.get("primary_method", "LIVE"))[:32],json.dumps(source_shot.get("secondary_methods", []), ensure_ascii=False),str(source_shot.get("department", "Camera"))[:64],str(source_shot.get("owner", ""))[:64],str(source_shot.get("status", "Draft"))[:32],str(source_shot.get("notes", ""))[:10000],at,at))
                        db.execute("INSERT INTO panels (id,shot_id,position,label,duration_frames,created_at,updated_at) VALUES (?,?,?,?,?,?,?)", (str(uuid.uuid4()),sid,0,"A",dur,at,at))
                        for key, value in (source_shot.get("custom_fields", {}) or {}).items():
                            if key in field_ids:
                                db.execute("INSERT INTO shot_custom_field_values (id,shot_id,field_definition_id,value_text,value_json,updated_at) VALUES (?,?,?,?,?,?)", (str(uuid.uuid4()),sid,field_ids[key],str(value) if not isinstance(value,(dict,list)) else None,json.dumps(value,ensure_ascii=False) if isinstance(value,(dict,list)) else None,at))
                    create_project_snapshot(db, pid, s["username"], "备份导入")
                    audit(db, s["username"], "import_project_backup", pid, f"{len(shots)} shots")
                    result = project_bundle(db, pid)
                    result["restore_complete"] = False
                    result["restore_warnings"] = ["旧版 JSON 只导入基础镜头字段与自定义列；媒体、完整 Panel、步骤及历史未恢复。完整恢复请重新导出带 _backup.version=2 的备份。"]
                    return self.send_json(201, result)

                if path == "/api/projects/import-project-pdf":
                    if self.headers.get("Content-Type", "").split(";", 1)[0].lower() != "application/pdf":
                        return self.send_error_json(415, "仅支持 PDF 文件")
                    pdf_bytes = self.body()
                    if not pdf_bytes.startswith(b"%PDF-"):
                        return self.send_error_json(400, "所选文件不是有效 PDF")
                    try:
                        backup_bytes = extract_project_backup(pdf_bytes, max_pdf_bytes=MAX_BODY)
                        bundle = json.loads(backup_bytes)
                        pid = import_project_backup(db, bundle, s)
                    except ProjectPdfError as exc:
                        return self.send_error_json(400, str(exc))
                    audit(db, s["username"], "import_project_pdf", pid, f"{len(bundle['shots'])} shots")
                    return self.send_json(201, project_bundle(db, pid))

                if path == "/api/projects":
                    data = self.json_body()
                    pid = str(uuid.uuid4())
                    at = now_iso()
                    name = str(data.get("name", "未命名制作项目")).strip()[:120] or "未命名制作项目"
                    ptype = str(data.get("production_type", "promo"))[:32]
                    fps = float(data.get("fps", 25.0))
                    fps = fps if fps in FPS_VALUES else 25.0
                    target = max(1.0, min(float(data.get("target_seconds", 60.0)), 86400.0))
                    start_tc = str(data.get("start_tc", "01:00:00:00")).strip()

                    db.execute("""
                        INSERT INTO projects (
                            id, name, production_type, fps, start_tc, target_seconds, aspect_ratio,
                            status, director, dp, producer, created_at, updated_at
                        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
                    """, (
                        pid, name, ptype, fps, start_tc, target, str(data.get("aspect_ratio", "16:9")),
                        "development", str(data.get("director", "")), str(data.get("dp", "")),
                        str(data.get("producer", "")), at, at
                    ))
                    touch_project(db, pid, s, at)

                    # Seed 5 initial template shots
                    nominal_fps = int(round(fps))
                    for i in range(1, 6):
                        sid = str(uuid.uuid4())
                        db.execute("""
                            INSERT INTO shots (
                                id, project_id, position, number, sort_index, title, duration_frames,
                                shot_size, primary_method, department, status, created_at, updated_at
                            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
                        """, (sid, pid, i - 1, f"{i:03d}", i - 1, f"镜头 {i:03d}", nominal_fps * 3, "全景", "LIVE", "Camera", "Draft", at, at))
                        db.execute("""
                            INSERT INTO panels (id, shot_id, position, label, duration_frames, created_at, updated_at)
                            VALUES (?,?,?,?,?,?,?)
                        """, (str(uuid.uuid4()), sid, 0, "A", nominal_fps * 3, at, at))

                    create_project_snapshot(db, pid, s["username"], "初始快照")
                    audit(db, s["username"], "create_project", pid, name)
                    db.commit()
                    return self.send_json(201, project_bundle(db, pid))

                # Create Shot
                match = re.fullmatch(r"/api/projects/([^/]+)/shots", path)
                if match:
                    pid = match.group(1)
                    if not db.execute("SELECT 1 FROM projects WHERE id=?", (pid,)).fetchone():
                        return self.send_error_json(404, "项目不存在")
                    data = self.json_body()
                    active_count = db.execute("SELECT COUNT(*) AS n FROM shots WHERE project_id=? AND is_deleted=0", (pid,)).fetchone()["n"]
                    client_request_id = data.get("client_request_id")
                    try:
                        sid = str(uuid.UUID(str(client_request_id))) if client_request_id else str(uuid.uuid4())
                    except (ValueError, TypeError):
                        return self.send_error_json(400, "新增请求标识无效")
                    existing_request = db.execute("SELECT project_id FROM shots WHERE id=?", (sid,)).fetchone()
                    if existing_request:
                        if existing_request["project_id"] != pid:
                            return self.send_error_json(409, "新增请求标识已被使用")
                        bundle = project_bundle(db, pid)
                        bundle["created_shot_id"] = sid
                        return self.send_json(200, bundle)
                    try:
                        requested_pos = int(data.get("position", active_count))
                    except (TypeError, ValueError):
                        requested_pos = active_count
                    if data.get("anchor_id"):
                        anchor = db.execute("SELECT position FROM shots WHERE id=? AND project_id=? AND is_deleted=0", (str(data["anchor_id"]), pid)).fetchone()
                        if anchor:
                            requested_pos = anchor["position"] + (1 if data.get("insert_direction") == "after" else 0)
                    pos = max(0, min(requested_pos, active_count))
                    db.execute("UPDATE shots SET position=position+1, sort_index=sort_index+1 WHERE project_id=? AND is_deleted=0 AND position>=?", (pid, pos))
                    at = now_iso()
                    number = str(data.get("number", f"{pos+1:03d}"))[:32]
                    fps = float(db.execute("SELECT fps FROM projects WHERE id=?", (pid,)).fetchone()["fps"])
                    dur_frames = max(1, int(data.get("duration_frames", round(fps * 3))))

                    db.execute("""
                        INSERT INTO shots (
                            id, project_id, position, number, sort_index, title, chapter, scene,
                            description, voiceover, dialogue, duration_frames, shot_size, lens, movement,
                            primary_method, secondary_methods, department, owner, status, created_at, updated_at
                        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                    """, (
                        sid, pid, pos, number, pos, str(data.get("title", f"镜头 {number}"))[:200],
                        str(data.get("chapter", "")), str(data.get("scene", "")),
                        str(data.get("description", "")), str(data.get("voiceover", "")),
                        str(data.get("dialogue", "")), dur_frames, str(data.get("shot_size", "全景")), str(data.get("lens", "")),
                        str(data.get("movement", "固定")), str(data.get("primary_method", "LIVE")),
                        json.dumps(data.get("secondary_methods", [])),
                        str(data.get("department", "Camera")), str(data.get("owner", "")),
                        "Draft", at, at
                    ))
                    db.execute("""
                        INSERT INTO panels (id, shot_id, position, label, duration_frames, created_at, updated_at)
                        VALUES (?,?,?,?,?,?,?)
                    """, (str(uuid.uuid4()), sid, 0, "A", dur_frames, at, at))
                    touch_project(db, pid, s, at)
                    renumber_project_shots(db, pid, at)
                    create_project_snapshot(db, pid, s["username"], "新增镜头")
                    audit(db, s["username"], "create_shot", sid, f"Project {pid} Shot {number}")
                    bundle = project_bundle(db, pid)
                    bundle["created_shot_id"] = sid
                    return self.send_json(201, bundle)

                # Custom Fields CRUD
                match = re.fullmatch(r"/api/projects/([^/]+)/custom-fields", path)
                if match:
                    pid = match.group(1)
                    data = self.json_body()
                    cid = str(uuid.uuid4())
                    at = now_iso()
                    key = re.sub(r'[^a-zA-Z0-9_]', '_', str(data.get("key", "")).strip().lower())
                    if not key:
                        key = f"custom_{int(time.time())%10000}"
                    label = str(data.get("label", key)).strip()[:80]
                    ftype = str(data.get("field_type", "text")).strip()[:32]
                    if not label or ftype not in {"text", "textarea", "number", "boolean", "date", "url", "select"}:
                        return self.send_error_json(400, "自定义列名称或类型无效")
                    if f"custom:{key}" in purged_fields(db, pid):
                        return self.send_error_json(409, "该列键已永久删除，请使用新的列键")
                    if db.execute("SELECT 1 FROM custom_field_definitions WHERE project_id=? AND key=? AND is_active=1", (pid, key)).fetchone():
                        return self.send_error_json(409, "该列键已存在")
                    group_name = str(data.get("group_name", "Custom")).strip()[:64]
                    options = data.get("options", [])
                    if not isinstance(options, list) or len(options) > 100:
                        return self.send_error_json(400, "自定义列选项无效")
                    options = [str(item).strip()[:120] for item in options if str(item).strip()]
                    if ftype != "select":
                        options = []
                    options_json = json.dumps(options, ensure_ascii=False)
                    db.execute("""
                        INSERT INTO custom_field_definitions (
                            id, project_id, key, label, description, field_type, group_name,
                            options_json, required, default_value, sort_index, is_active, created_by, created_at, updated_at
                        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                    """, (cid, pid, key, label, str(data.get("description", "")), ftype, group_name,
                          options_json, 1 if data.get("required") else 0, str(data.get("default_value", "")),
                          int(data.get("sort_index", 0)), 1, s["username"], at, at))
                    touch_project(db, pid, s, at)
                    create_project_snapshot(db, pid, s["username"], "新增自定义列")
                    audit(db, s["username"], "create_custom_field", cid, f"{label} ({key})")
                    return self.send_json(201, {"id": cid, "key": key, "label": label, "field_type": ftype})

                # Saved Views CRUD
                match = re.fullmatch(r"/api/projects/([^/]+)/saved-views", path)
                if match:
                    pid = match.group(1)
                    data = self.json_body()
                    vid = str(uuid.uuid4())
                    at = now_iso()
                    name = str(data.get("name", "自定义视图")).strip()[:80]
                    vtype = str(data.get("view_type", "table")).strip()[:32]
                    is_shared = 1 if data.get("is_shared", True) else 0
                    config_json = json.dumps(data.get("config", {}))
                    db.execute("""
                        INSERT INTO saved_views (id, project_id, name, view_type, is_shared, created_by, config_json, revision, created_at, updated_at)
                        VALUES (?,?,?,?,?,?,?,1,?,?)
                    """, (vid, pid, name, vtype, is_shared, s["username"], config_json, at, at))
                    audit(db, s["username"], "create_saved_view", vid, name)
                    return self.send_json(201, {"id": vid, "name": name, "view_type": vtype, "config": data.get("config", {})})

                # Resolve Comment
                match = re.fullmatch(r"/api/comments/([^/]+)/resolve", path)
                if match:
                    cid = match.group(1)
                    data = self.json_body()
                    resolved = 1 if data.get("resolved", True) else 0
                    comment = db.execute("SELECT id FROM comments WHERE id=?", (cid,)).fetchone()
                    if not comment:
                        return self.send_error_json(404, "评论不存在")
                    db.execute("UPDATE comments SET is_resolved=? WHERE id=?", (resolved, cid))
                    audit(db, s["username"], "resolve_comment" if resolved else "reopen_comment", cid)
                    return self.send_json(200, {"ok": True, "id": cid, "is_resolved": bool(resolved)})

                # Sequence Reorder Lease & Reorder Commit
                match = re.fullmatch(r"/api/projects/([^/]+)/shots/bulk-delete", path)
                if match:
                    pid = match.group(1)
                    data = self.json_body()
                    ids = [str(item) for item in data.get("shot_ids", []) if isinstance(item, str)]
                    ids = list(dict.fromkeys(ids))[:10000]
                    if not ids:
                        return self.send_error_json(400, "未选择镜头")
                    placeholders = ",".join("?" for _ in ids)
                    existing = [row["id"] for row in db.execute(
                        f"SELECT id FROM shots WHERE project_id=? AND id IN ({placeholders})",
                        (pid, *ids),
                    )]
                    if len(existing) != len(ids):
                        return self.send_error_json(409, "部分镜头不属于当前工程，请刷新选择后重试")
                    owned = [row["id"] for row in db.execute(
                        f"SELECT id FROM shots WHERE project_id=? AND is_deleted=0 AND id IN ({placeholders})",
                        (pid, *ids),
                    )]
                    # Idempotent batch deletion: another collaborator may
                    # have already moved some selected shots to the trash.
                    # Delete the remaining active rows instead of failing the
                    # whole operation and making the optimistic UI roll back.
                    if owned:
                        at = now_iso()
                        owned_placeholders = ",".join("?" for _ in owned)
                        db.execute(f"UPDATE shots SET is_deleted=1, deleted_at=?, updated_at=? WHERE project_id=? AND id IN ({owned_placeholders})", (at, at, pid, *owned))
                        renumber_project_shots(db, pid, at)
                        touch_project(db, pid, s, at)
                        create_project_snapshot(db, pid, s["username"], f"批量删除 {len(owned)} 镜")
                        audit(db, s["username"], "bulk_delete_shots", pid, f"{len(owned)} shots")
                    db.commit()
                    return self.send_json(200, project_bundle(db, pid))

                match = re.fullmatch(r"/api/projects/([^/]+)/trash/restore", path)
                if match:
                    pid = match.group(1)
                    data = self.json_body()
                    ids = list(dict.fromkeys(str(item) for item in data.get("shot_ids", []) if isinstance(item, str)))[:10000]
                    if not ids:
                        return self.send_error_json(400, "未选择要恢复的镜头")
                    placeholders = ",".join("?" for _ in ids)
                    at = now_iso()
                    db.execute(f"UPDATE shots SET is_deleted=0, deleted_at=NULL, updated_at=? WHERE project_id=? AND id IN ({placeholders})", (at, pid, *ids))
                    renumber_project_shots(db, pid, at)
                    touch_project(db, pid, s, at)
                    create_project_snapshot(db, pid, s["username"], f"从废纸篓恢复 {len(ids)} 镜")
                    audit(db, s["username"], "restore_shots", pid, f"{len(ids)} shots")
                    return self.send_json(200, project_bundle(db, pid))

                # Sequence Reorder Lease & Reorder Commit
                match = re.fullmatch(r"/api/projects/([^/]+)/shots/reorder", path)
                if match:
                    pid = match.group(1)
                    data = self.json_body()
                    seq_id = str(data.get("sequence_id", pid))
                    action = str(data.get("action", "commit"))
                    if action == "acquire_lease":
                        lease = collab_mgr.acquire_reorder_lease(seq_id, s["user_id"], s["display_name"] or s["username"])
                        return self.send_json(200, lease)

                    shot_ids = data.get("shot_ids", [])
                    if not db.in_transaction:
                        db.execute("BEGIN IMMEDIATE")
                    project_row = db.execute("SELECT updated_at FROM projects WHERE id=? AND deleted_at IS NULL", (pid,)).fetchone()
                    base_updated_at = str(data.get("base_updated_at", ""))
                    if "base_order" not in data and base_updated_at and project_row and base_updated_at != str(project_row["updated_at"] or ""):
                        return self.send_error_json(409, "项目已被其他协作者更新，请先同步后再调整顺序")
                    # Reorder is an editorial operation: accept exactly the
                    # current non-deleted shot set, so a stale/partial client
                    # can never silently renumber another sequence.
                    current_ids = [r["id"] for r in db.execute(
                        "SELECT id FROM shots WHERE project_id=? AND is_deleted=0 ORDER BY position, id", (pid,)
                    )]
                    if "base_order" in data and data["base_order"] != current_ids:
                        return self.send_error_json(409, "镜头顺序已被其他协作者调整，请同步后重试")
                    if isinstance(shot_ids, list) and shot_ids and set(shot_ids) == set(current_ids) and len(shot_ids) == len(current_ids):
                        at = now_iso()
                        for pos, sid in enumerate(shot_ids):
                            db.execute("UPDATE shots SET position=?, sort_index=?, number=?, updated_at=? WHERE id=? AND project_id=?",
                                       (pos, pos, f"{pos + 1:03d}", at, sid, pid))
                        touch_project(db, pid, s, at)
                        collab_mgr.release_reorder_lease(seq_id, s["user_id"])
                        create_project_snapshot(db, pid, s["username"], "调整镜头顺序")
                        audit(db, s["username"], "reorder_shots", pid, f"{len(shot_ids)} shots")
                        db.commit()
                        return self.send_json(200, project_bundle(db, pid))
                    return self.send_error_json(400, "镜头排序数据已过期，请刷新后重试")

                # Auto Timing calculation (with lease check)
                match = re.fullmatch(r"/api/projects/([^/]+)/auto-timing", path)
                if match:
                    pid = match.group(1)
                    bundle = project_bundle(db, pid)
                    if not bundle:
                        return self.send_error_json(404, "项目不存在")
                    data = self.json_body()
                    if not isinstance(data, dict):
                        return self.send_error_json(400, "自动计时参数必须是对象")
                    raw_rate = data.get("speech_rate", 1.0)
                    if isinstance(raw_rate, bool):
                        return self.send_error_json(400, "语速必须在 0.5 到 2.0 之间")
                    try:
                        speech_rate = float(raw_rate)
                    except (TypeError, ValueError):
                        return self.send_error_json(400, "语速必须在 0.5 到 2.0 之间")
                    if not math.isfinite(speech_rate) or not 0.5 <= speech_rate <= 2.0:
                        return self.send_error_json(400, "语速必须在 0.5 到 2.0 之间")
                    p = bundle["project"]
                    shots = bundle["shots"]
                    computed = compute_auto_timing(shots, p["target_seconds"], p["fps"], speech_rate)
                    at = now_iso()
                    for s_item in computed:
                        db.execute("UPDATE shots SET duration_frames=?, updated_at=? WHERE id=?",
                                   (s_item["duration_frames"], at, s_item["id"]))
                    touch_project(db, pid, s, at)
                    create_project_snapshot(db, pid, s["username"], "自动计时")
                    audit(db, s["username"], "auto_timing", pid, f"Calculated {len(shots)} shots at {speech_rate:g}x speech rate")
                    return self.send_json(200, project_bundle(db, pid))

                # Publish Anonymous Share Snapshot (Spec Section 100-104)
                match = re.fullmatch(r"/api/projects/([^/]+)/share", path)
                if match:
                    pid = match.group(1)
                    bundle = project_bundle(db, pid)
                    if not bundle:
                        return self.send_error_json(404, "项目不存在")
                    data = self.json_body()
                    token = secrets.token_urlsafe(24)
                    is_perm = 1 if data.get("is_permanent", True) else 0
                    allow_dl = 1 if data.get("allow_download", True) else 0
                    watermark = str(data.get("watermark", "")).strip()[:80]
                    share_password = str(data.get("password", ""))[:200]
                    share_password_hash = password_hash(share_password) if share_password else ""
                    expires_at = int(time.time()) + int(data.get("expire_days", 30)) * 86400 if not is_perm else None

                    # Strip sensitive db internals from snapshot
                    bundle["project"].pop("share_token", None)
                    view_config = data.get("view_config", {})
                    visible_columns = None
                    if isinstance(view_config, dict):
                        visible_columns = [str(item)[:80] for item in view_config["visible_columns"] if isinstance(item, str)][:100] if "visible_columns" in view_config else None
                        bundle["share_view"] = {
                            "visible_columns": visible_columns,
                            "column_order": [str(item)[:80] for item in view_config.get("column_order", []) if isinstance(item, str)][:100],
                        }
                    bundle = compact_share_bundle(bundle, visible_columns)
                    db.execute("""
                        INSERT INTO share_links (token, project_id, snapshot_json, is_permanent, allow_download, watermark, password_hash, revoked_at, created_by, expires_at, created_at)
                        VALUES (?,?,?,?,?,?,?,?,?,?,?)
                    """, (token, pid, json.dumps(bundle, ensure_ascii=False), is_perm, allow_dl, watermark, share_password_hash, None, s["username"], expires_at, now_iso()))
                    at = now_iso()
                    db.execute("UPDATE projects SET share_token=? WHERE id=?", (token, pid))
                    touch_project(db, pid, s, at)
                    audit(db, s["username"], "publish_share", pid, f"Token {token}")
                    return self.send_json(200, {"token": token, "url": f"/share/{token}", "password_required": bool(share_password_hash)})

                # Upload Media Asset / Review Proxy
                match = re.fullmatch(r"/api/projects/([^/]+)/media", path)
                if match:
                    return self.upload_media(db, s, match.group(1))

                # Excel Import preview & commit
                match = re.fullmatch(r"/api/projects/([^/]+)/import-preview", path)
                if match:
                    return self.import_preview(db, s, match.group(1))

                match = re.fullmatch(r"/api/projects/([^/]+)/import-commit", path)
                if match:
                    return self.import_commit(db, s, match.group(1))

                # Panel is a child of Shot, never a duplicate Shot entity.
                match = re.fullmatch(r"/api/shots/([^/]+)/panels", path)
                if match:
                    sid = match.group(1)
                    shot = db.execute("SELECT project_id, duration_frames FROM shots WHERE id=? AND is_deleted=0", (sid,)).fetchone()
                    if not shot:
                        return self.send_error_json(404, "镜头不存在")
                    data = self.json_body()
                    position = db.execute("SELECT COALESCE(MAX(position), -1) + 1 AS n FROM panels WHERE shot_id=?", (sid,)).fetchone()["n"]
                    at = now_iso()
                    panel_id = str(uuid.uuid4())
                    duration = max(1, int(data.get("duration_frames", shot["duration_frames"])))
                    db.execute("""INSERT INTO panels (id, shot_id, position, label, duration_frames, drawing_json, notes, created_at, updated_at)
                        VALUES (?,?,?,?,?,?,?,?,?)""", (panel_id, sid, position, str(data.get("label", chr(65 + min(position, 25))))[:8], duration, json.dumps(data.get("drawing_json", {})), str(data.get("notes", ""))[:2000], at, at))
                    touch_project(db, shot["project_id"], s, at)
                    audit(db, s["username"], "create_panel", sid, panel_id)
                    return self.send_json(201, {"id": panel_id, "shot_id": sid, "position": position, "duration_frames": duration})

                match = re.fullmatch(r"/api/shots/([^/]+)/production-steps", path)
                if match:
                    sid = match.group(1)
                    shot = db.execute("SELECT project_id FROM shots WHERE id=? AND is_deleted=0", (sid,)).fetchone()
                    if not shot:
                        return self.send_error_json(404, "镜头不存在")
                    data = self.json_body()
                    order = db.execute("SELECT COALESCE(MAX(step_order), -1) + 1 AS n FROM production_steps WHERE shot_id=?", (sid,)).fetchone()["n"]
                    step_id, at = str(uuid.uuid4()), now_iso()
                    db.execute("""INSERT INTO production_steps (id, shot_id, step_order, sort_index, name, type, input_asset, output_asset, department, owner, status, notes, created_at, updated_at)
                        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""", (step_id, sid, order, order, str(data.get("name", "自定义步骤"))[:160], str(data.get("type", "TASK"))[:40], str(data.get("input_asset", ""))[:500], str(data.get("output_asset", ""))[:500], str(data.get("department", ""))[:80], str(data.get("owner", ""))[:80], str(data.get("status", "未开始"))[:40], str(data.get("notes", ""))[:2000], at, at))
                    touch_project(db, shot["project_id"], s, at)
                    audit(db, s["username"], "create_production_step", sid, step_id)
                    return self.send_json(201, dict(db.execute("SELECT * FROM production_steps WHERE id=?", (step_id,)).fetchone()))

                # Comments
                match = re.fullmatch(r"/api/shots/([^/]+)/comments", path)
                if match:
                    sid = match.group(1)
                    data = self.json_body()
                    shot = db.execute(
                        "SELECT id, project_id, number, title, description, voiceover FROM shots WHERE id=? AND is_deleted=0",
                        (sid,)
                    ).fetchone()
                    if not shot:
                        return self.send_error_json(404, "镜头不存在")
                    cid = str(uuid.uuid4())
                    at = now_iso()
                    text = str(data.get("text", "")).strip()[:1000]
                    if not text:
                        return self.send_error_json(400, "评论内容不能为空")
                    requested_field = str(data.get("quote_field", "")).strip()
                    quote_field = requested_field if requested_field in ("description", "voiceover", "title") else ""
                    if not quote_field:
                        quote_field = "description" if str(shot["description"] or "").strip() else "voiceover" if str(shot["voiceover"] or "").strip() else "title"
                    quote_text = str(data.get("quote_text", "")).strip()[:2000] or str(shot[quote_field] or "").strip()[:2000]
                    timecode = str(data.get("timecode", "")).strip()[:32]
                    if not timecode:
                        current_bundle = project_bundle(db, shot["project_id"])
                        current_shot = next((item for item in (current_bundle or {}).get("shots", []) if item["id"] == sid), {})
                        timecode = str(current_shot.get("tc_in", ""))[:32]
                    db.execute("""
                        INSERT INTO comments (id, shot_id, author_name, role, text, timecode, quote_field, quote_text, parent_id, created_at)
                        VALUES (?,?,?,?,?,?,?,?,?,?)
                    """, (cid, sid, s["display_name"] or s["username"], str(data.get("role", "Director")), text, timecode, quote_field, quote_text, str(data.get("parent_id", "")) or None, at))
                    db.execute("UPDATE comments SET author_user_id=? WHERE id=?", (s["user_id"], cid))
                    touch_project(db, shot["project_id"], s, at)
                    audit(db, s["username"], "add_comment", sid, text[:60])
                    return self.send_json(201, {
                        "id": cid, "shot_id": sid, "text": text,
                        "author_name": s["display_name"] or s["username"],
                        "role": str(data.get("role", "Director")), "timecode": timecode,
                        "quote_field": quote_field, "quote_text": quote_text,
                        "parent_id": str(data.get("parent_id", "")) or None,
                        "is_resolved": False, "created_at": at
                    })

                # Git-style shot version actions: accept a baseline, restore
                # an earlier commit, or merge a branch snapshot into current.
                match = re.fullmatch(r"/api/versions/([^/]+)/(accept|restore|merge)", path)
                if match:
                    db.execute("BEGIN IMMEDIATE")
                    data = self.json_body()
                    version_id, action = match.group(1), match.group(2)
                    version = db.execute("SELECT * FROM shot_versions WHERE id=?", (version_id,)).fetchone()
                    if not version:
                        return self.send_error_json(404, "版本不存在")
                    sid = version["shot_id"]
                    at = now_iso()
                    if action == "accept":
                        db.execute("UPDATE shot_versions SET is_accepted=0 WHERE shot_id=?", (sid,))
                        db.execute("UPDATE shot_versions SET is_accepted=1, status='Accepted', updated_at=? WHERE id=?", (at, version_id))
                        audit(db, s["username"], "accept_version", sid, version["version_num"])
                        accepted = db.execute("SELECT * FROM shot_versions WHERE id=?", (version_id,)).fetchone()
                        return self.send_json(200, dict(accepted))

                    target_snapshot = json.loads(version["snapshot_json"] or "{}")
                    current_snapshot, project_id = complete_shot_snapshot(db, sid, project_bundle)
                    if not current_snapshot or not project_id:
                        return self.send_error_json(404, "镜头不存在")
                    count = int(db.execute("SELECT COUNT(*) AS n FROM shot_versions WHERE shot_id=?", (sid,)).fetchone()["n"])
                    backup_id = str(uuid.uuid4())
                    backup_num = f"v{count + 1:03d}"
                    branch = str(data.get("branch_name", "main")).strip()[:64] or "main"
                    db.execute("""
                        INSERT INTO shot_versions (id, shot_id, version_num, name, snapshot_json, status, branch_name, parent_version_id, merge_parent_id, is_accepted, created_by, created_at, updated_at)
                        VALUES (?,?,?,?,?,'Draft',?,?,?,?,?,?,?)
                    """, (
                        backup_id, sid, backup_num,
                        "合并前备份" if action == "merge" else "回滚前备份",
                        json.dumps(current_snapshot, ensure_ascii=False), branch,
                        version_id if action == "restore" else None,
                        version_id if action == "merge" else None,
                        0, s["username"], at, at,
                    ))
                    project_id = apply_shot_version_snapshot(db, sid, target_snapshot, s, f"version_{action}")
                    return self.send_json(200, project_bundle(db, project_id))

                # Create a named branch from the current shot or a selected
                # version. A branch is a regular immutable snapshot with a
                # branch label and explicit parent pointer.
                match = re.fullmatch(r"/api/shots/([^/]+)/branches", path)
                if match:
                    sid = match.group(1)
                    branch = str(data.get("branch_name", "")).strip()[:64]
                    if not branch:
                        return self.send_error_json(400, "请输入分支名称")
                    parent_id = str(data.get("parent_version_id", "")).strip() or None
                    snapshot, _ = complete_shot_snapshot(db, sid, project_bundle)
                    if not snapshot:
                        return self.send_error_json(404, "镜头不存在")
                    if parent_id:
                        parent = db.execute("SELECT snapshot_json FROM shot_versions WHERE id=? AND shot_id=?", (parent_id, sid)).fetchone()
                        if not parent:
                            return self.send_error_json(404, "父版本不存在")
                        snapshot = json.loads(parent["snapshot_json"] or "{}")
                    count = int(db.execute("SELECT COUNT(*) AS n FROM shot_versions WHERE shot_id=?", (sid,)).fetchone()["n"])
                    at = now_iso()
                    vid = str(uuid.uuid4())
                    v_num = f"v{count + 1:03d}"
                    db.execute("""
                        INSERT INTO shot_versions (id, shot_id, version_num, name, snapshot_json, status, branch_name, parent_version_id, is_accepted, created_by, created_at, updated_at)
                        VALUES (?,?,?,?,?,'Draft',?,?,0,?,?,?)
                    """, (vid, sid, v_num, f"分支 {branch}", json.dumps(snapshot, ensure_ascii=False), branch, parent_id, s["username"], at, at))
                    audit(db, s["username"], "create_version_branch", sid, branch)
                    return self.send_json(201, dict(db.execute("SELECT * FROM shot_versions WHERE id=?", (vid,)).fetchone()))

                # Version Snapshot
                match = re.fullmatch(r"/api/shots/([^/]+)/versions", path)
                if match:
                    db.execute("BEGIN IMMEDIATE")
                    sid = match.group(1)
                    snapshot, _ = complete_shot_snapshot(db, sid, project_bundle)
                    if not snapshot:
                        return self.send_error_json(404, "镜头不存在")
                    data = self.json_body()
                    branch = str(data.get("branch_name", "main")).strip()[:64] or "main"
                    at = now_iso()
                    latest = db.execute("SELECT * FROM shot_versions WHERE shot_id=? AND branch_name=? ORDER BY created_at DESC LIMIT 1", (sid, branch)).fetchone()
                    if data.get("update_existing") and latest:
                        name = str(data.get("name", latest["name"] or f"更新 {latest['version_num']}"))[:160]
                        db.execute("UPDATE shot_versions SET name=?, snapshot_json=?, updated_at=? WHERE id=?", (name, json.dumps(snapshot, ensure_ascii=False), at, latest["id"]))
                        audit(db, s["username"], "update_version", sid, latest["version_num"])
                        return self.send_json(200, dict(db.execute("SELECT * FROM shot_versions WHERE id=?", (latest["id"],)).fetchone()))
                    count = int(db.execute("SELECT COUNT(*) AS n FROM shot_versions WHERE shot_id=?", (sid,)).fetchone()["n"])
                    v_num = f"v{count + 1:03d}"
                    vid = str(uuid.uuid4())
                    parent_id = latest["id"] if latest else None
                    db.execute("""
                        INSERT INTO shot_versions (id, shot_id, version_num, name, snapshot_json, status, branch_name, parent_version_id, is_accepted, created_by, created_at, updated_at)
                        VALUES (?,?,?,?,?,'Draft',?,?,0,?,?,?)
                    """, (vid, sid, v_num, str(data.get("name", f"快照 {v_num}"))[:160], json.dumps(snapshot, ensure_ascii=False), branch, parent_id, s["username"], at, at))
                    audit(db, s["username"], "create_version", sid, v_num)
                    return self.send_json(201, dict(db.execute("SELECT * FROM shot_versions WHERE id=?", (vid,)).fetchone()))

            return self.send_error_json(404, "接口不存在")
        except OverflowError as exc:
            self.log_error("POST body too large: %r", exc)
            return self.send_error_json(413, "请求参数或文件超过允许大小")
        except (ValueError, json.JSONDecodeError) as exc:
            self.log_error("POST payload error: %r", exc)
            return self.send_error_json(400, "参数格式错误")
        except Exception as exc:
            self.log_error("POST error: %r", exc)
            return self.send_error_json(500, "服务器处理失败")

    # ----------------------------------------
    # PUT Routes
    # ----------------------------------------
    def do_PUT(self):
        try:
            path = self.route()
            data = self.json_body()
            with connect() as db:
                s = self.require_auth(db, mutation=True)
                if not s:
                    return

                match = re.fullmatch(r"/api/projects/([^/]+)/creative-boards", path)
                if match:
                    try:
                        db.execute("BEGIN IMMEDIATE")
                        result = handle_creative_boards(db, match.group(1), "PUT", data, s["user_id"])
                    except CreativeBoardsConflict as exc:
                        return self.send_json(409, {"error": str(exc), "current": exc.current})
                    except LookupError:
                        return self.send_error_json(404, "项目不存在")
                    except ValueError as exc:
                        return self.send_error_json(400, str(exc))
                    touch_project(db, match.group(1), s)
                    audit(db, s["username"], "save_creative_boards", match.group(1))
                    db.commit()
                    return self.send_json(200, result)

                if path == "/api/profile":
                    username = str(data.get("username", s["username"])).strip()
                    display_name = str(data.get("display_name", s["display_name"] or username)).strip()[:80]
                    if not re.fullmatch(r"[A-Za-z0-9_.-]{3,40}", username) or not display_name:
                        return self.send_error_json(400, "用户名或显示名称格式无效")
                    if db.execute("SELECT 1 FROM users WHERE username=? AND id<>?", (username, s["user_id"])).fetchone():
                        return self.send_error_json(409, "用户名已存在")
                    db.execute("UPDATE users SET username=?, display_name=? WHERE id=?", (username, display_name, s["user_id"]))
                    # Legacy names without an identity are deliberately left unchanged.
                    db.execute("UPDATE projects SET updated_by=? WHERE updated_by_user_id=?", (display_name, s["user_id"]))
                    db.execute("UPDATE comments SET author_name=? WHERE author_user_id=?", (display_name, s["user_id"]))
                    db.execute("UPDATE shot_change_events SET user_name=? WHERE user_id=?", (display_name, s["user_id"]))
                    profile_avatar_url = avatar_url(s)
                    collab_mgr.update_identity(s["user_id"], display_name, s["user_color"], profile_avatar_url or "")
                    audit(db, username, "update_profile", s["user_id"])
                    return self.send_json(200, {"user_id": s["user_id"], "username": username, "display_name": display_name, "color": s["user_color"], "avatar_url": profile_avatar_url})

                # Review comments support inline correction without creating
                # a second thread item. The audit trail records the edit.
                match = re.fullmatch(r"/api/comments/([^/]+)", path)
                if match:
                    cid = match.group(1)
                    row = db.execute("SELECT id, shot_id, text FROM comments WHERE id=?", (cid,)).fetchone()
                    if not row:
                        return self.send_error_json(404, "评论不存在")
                    text = str(data.get("text", "")).strip()[:1000]
                    if not text:
                        return self.send_error_json(400, "评论内容不能为空")
                    db.execute("UPDATE comments SET text=? WHERE id=?", (text, cid))
                    audit(db, s["username"], "edit_comment", row["shot_id"], text[:60])
                    return self.send_json(200, {"id": cid, "shot_id": row["shot_id"], "text": text})

                # Project update
                match = re.fullmatch(r"/api/projects/([^/]+)", path)
                if match:
                    pid = match.group(1)
                    row = db.execute("SELECT * FROM projects WHERE id=?", (pid,)).fetchone()
                    if not row:
                        return self.send_error_json(404, "项目不存在")
                    fields = {
                        "name": str(data.get("name", row["name"]))[:120],
                        "production_type": str(data.get("production_type", row["production_type"]))[:32],
                        "fps": float(data.get("fps", row["fps"])) if float(data.get("fps", row["fps"])) in FPS_VALUES else row["fps"],
                        "start_tc": str(data.get("start_tc", row["start_tc"]))[:16],
                        "target_seconds": max(1.0, min(float(data.get("target_seconds", row["target_seconds"])), 86400.0)),
                        "aspect_ratio": str(data.get("aspect_ratio", row["aspect_ratio"]))[:16],
                        "status": str(data.get("status", row["status"]))[:32],
                        "director": str(data.get("director", row["director"]))[:64],
                        "dp": str(data.get("dp", row["dp"]))[:64],
                        "producer": str(data.get("producer", row["producer"]))[:64],
                        "is_drop_frame": 1 if data.get("is_drop_frame", row["is_drop_frame"]) else 0
                    }
                    db.execute("""
                        UPDATE projects SET name=?, production_type=?, fps=?, start_tc=?, target_seconds=?,
                        aspect_ratio=?, status=?, director=?, dp=?, producer=?, is_drop_frame=?, updated_at=?, updated_by=?
                        WHERE id=?
                    """, (*fields.values(), now_iso(), str(s["display_name"] or s["username"]), pid))
                    touch_project(db, pid, s)
                    create_project_snapshot(db, pid, s["username"], "更新项目")
                    audit(db, s["username"], "update_project", pid)
                    return self.send_json(200, project_bundle(db, pid))

                # Persist column visibility/archive state separately from shot data.
                match = re.fullmatch(r"/api/projects/([^/]+)/column-preferences", path)
                if match:
                    pid = match.group(1)
                    if not db.execute("SELECT 1 FROM projects WHERE id=? AND deleted_at IS NULL", (pid,)).fetchone():
                        return self.send_error_json(404, "项目不存在")
                    try:
                        preferences = write_column_preferences(
                            db, pid, data.get("preferences", []), DEFAULT_TABLE_COLUMN_KEYS,
                            s["display_name"] or s["username"], now_iso())
                    except ValueError as exc:
                        return self.send_error_json(400, str(exc))
                    audit(db, s["username"], "update_column_preferences", pid, f"{len(preferences)} columns")
                    return self.send_json(200, preferences)

                # Batch Shots Update with Field-Aware Concurrency & Custom Fields
                match = re.fullmatch(r"/api/projects/([^/]+)/shots", path)
                if match:
                    db.execute("BEGIN IMMEDIATE")
                    pid = match.group(1)
                    try:
                        update_bulk_shots(
                            db, pid, data, s, now_iso(),
                            shot_to_dict=shot_dict,
                            normalize_rich_text=normalize_rich_text,
                            normalize_drawing_json=normalize_drawing_json,
                            record_review_decision=record_review_decision,
                            renumber_project_shots=renumber_project_shots,
                            touch_project=touch_project,
                            create_project_snapshot=create_project_snapshot,
                            audit=audit,
                        )
                    except BulkShotConflict as conflict:
                        db.rollback()
                        return self.send_json(409, conflict.payload)
                    except BulkShotError as error:
                        db.rollback()
                        return self.send_error_json(400, str(error))
                    db.commit()
                    return self.send_json(200, project_bundle(db, pid))

                # Single Shot Update
                match = re.fullmatch(r"/api/shots/([^/]+)", path)
                if match:
                    db.execute("BEGIN IMMEDIATE")
                    sid = match.group(1)
                    at = now_iso()
                    try:
                        result = update_single_shot(
                            db, sid, data,
                            actor_id=s["user_id"],
                            actor_name=s["display_name"] or s["username"],
                            at=at,
                        )
                    except ShotNotFound:
                        return self.send_error_json(404, "镜头不存在")
                    except ShotUpdateError as error:
                        return self.send_error_json(400, str(error))
                    except ShotConflict as conflict:
                        return self.send_json(409, {
                            "conflict": True,
                            "shot_id": sid,
                            "shot_number": conflict.current["number"],
                            "conflicting_fields": conflict.fields,
                            "server_version": shot_dict(conflict.current),
                            "your_version": data,
                        })

                    if not result.changed_fields:
                        return self.send_json(200, shot_dict(result.updated))
                    touch_project(db, result.project_id, s, at)
                    if "status" in result.changed_fields and str(result.updated["status"] or "") != result.previous_status:
                        try:
                            record_review_decision(db, sid, result.requested_version_id, result.previous_status, str(result.updated["status"] or ""), s["username"], at)
                        except ValueError as error:
                            db.rollback()
                            return self.send_error_json(400, str(error))
                    audit(db, s["username"], "update_shot", sid)
                    return self.send_json(200, shot_dict(result.updated))

                # Saved Views Update
                # Panel / storyboard-frame updates stay scoped to the owning shot.
                match = re.fullmatch(r"/api/panels/([^/]+)", path)
                if match:
                    panel_id = match.group(1)
                    panel = db.execute("SELECT p.*, s.project_id FROM panels p JOIN shots s ON s.id=p.shot_id WHERE p.id=?", (panel_id,)).fetchone()
                    if not panel:
                        return self.send_error_json(404, "分镜画面不存在")
                    fields = {
                        "label": str(data.get("label", panel["label"]))[:80],
                        "notes": str(data.get("notes", panel["notes"]))[:2000],
                        "position": max(0, int(data.get("position", panel["position"]))),
                        "duration_frames": max(1, int(data.get("duration_frames", panel["duration_frames"]))),
                        "drawing_json": normalize_drawing_json(data.get("drawing_json", panel["drawing_json"] or "{}"))
                    }
                    db.execute("UPDATE panels SET label=?, notes=?, position=?, duration_frames=?, drawing_json=?, updated_at=? WHERE id=?",
                               (*fields.values(), now_iso(), panel_id))
                    audit(db, s["username"], "update_panel", panel["shot_id"], panel_id)
                    return self.send_json(200, {"ok": True, "id": panel_id})

                # Production steps are first-class editable records under a Shot.
                match = re.fullmatch(r"/api/production-steps/([^/]+)", path)
                if match:
                    step_id = match.group(1)
                    step = db.execute("SELECT * FROM production_steps WHERE id=?", (step_id,)).fetchone()
                    if not step:
                        return self.send_error_json(404, "制作步骤不存在")
                    allowed = ("name", "type", "input_asset", "output_asset", "department", "owner", "status", "notes", "sort_index")
                    values = {field: data.get(field, step[field]) for field in allowed}
                    if "step_order" in data and "sort_index" not in data:
                        values["sort_index"] = data["step_order"]
                    values["name"] = str(values["name"])[:160]
                    values["type"] = str(values["type"])[:40]
                    values["input_asset"] = str(values["input_asset"])[:500]
                    values["output_asset"] = str(values["output_asset"])[:500]
                    values["department"] = str(values["department"])[:80]
                    values["owner"] = str(values["owner"])[:80]
                    values["status"] = str(values["status"])[:40]
                    values["notes"] = str(values["notes"])[:2000]
                    values["sort_index"] = max(0, int(values["sort_index"]))
                    db.execute("UPDATE production_steps SET name=?, type=?, input_asset=?, output_asset=?, department=?, owner=?, status=?, notes=?, sort_index=?, step_order=?, updated_at=? WHERE id=?",
                               (values["name"], values["type"], values["input_asset"], values["output_asset"], values["department"], values["owner"], values["status"], values["notes"], values["sort_index"], values["sort_index"], now_iso(), step_id))
                    audit(db, s["username"], "update_production_step", step["shot_id"], step_id)
                    return self.send_json(200, dict(db.execute("SELECT * FROM production_steps WHERE id=?", (step_id,)).fetchone()))

                # Custom column definition update. The stable key maps every
                # cell value, so only its presentation and editor metadata may change.
                match = re.fullmatch(r"/api/projects/([^/]+)/custom-fields/([^/]+)", path)
                if match:
                    pid, cid = match.group(1), match.group(2)
                    field = db.execute("SELECT * FROM custom_field_definitions WHERE id=? AND project_id=? AND is_active=1", (cid, pid)).fetchone()
                    if not field:
                        return self.send_error_json(404, "自定义列不存在")
                    if "key" in data and str(data.get("key", "")).strip() != field["key"]:
                        return self.send_error_json(409, "列键创建后不可修改")
                    key = re.sub(r"[^a-zA-Z0-9_]", "_", str(data.get("key", field["key"])).strip().lower())
                    label = str(data.get("label", field["label"])).strip()[:80]
                    field_type = str(data.get("field_type", field["field_type"])).strip()
                    if not key or not label or field_type not in {"text", "textarea", "number", "boolean", "date", "url", "select"}:
                        return self.send_error_json(400, "自定义列名称、键或类型无效")
                    duplicate = db.execute("SELECT 1 FROM custom_field_definitions WHERE project_id=? AND key=? AND is_active=1 AND id<>?", (pid, key, cid)).fetchone()
                    if duplicate:
                        return self.send_error_json(409, "该列键已存在")
                    options = data.get("options", json.loads(field["options_json"] or "[]"))
                    if not isinstance(options, list) or len(options) > 100:
                        return self.send_error_json(400, "自定义列选项无效")
                    options = [str(item).strip()[:120] for item in options if str(item).strip()]
                    if field_type != "select":
                        options = []
                    db.execute("UPDATE custom_field_definitions SET key=?, label=?, field_type=?, options_json=?, updated_at=? WHERE id=? AND project_id=?", (key, label, field_type, json.dumps(options, ensure_ascii=False), now_iso(), cid, pid))
                    create_project_snapshot(db, pid, s["username"], "更新自定义列")
                    audit(db, s["username"], "update_custom_field", cid, f"{label} ({key})")
                    return self.send_json(200, {"ok": True, "id": cid, "key": key, "label": label, "field_type": field_type})

                match = re.fullmatch(r"/api/projects/([^/]+)/saved-views/([^/]+)", path)
                if match:
                    pid, vid = match.group(1), match.group(2)
                    config_json = json.dumps(data.get("config", {}))
                    db.execute("UPDATE saved_views SET config_json=?, name=?, updated_at=? WHERE id=? AND project_id=?",
                               (config_json, str(data.get("name", "自定义视图")), now_iso(), vid, pid))
                    return self.send_json(200, {"ok": True, "id": vid})

                # Mark Notification Read
                match = re.fullmatch(r"/api/notifications/([^/]+)/read", path)
                if match:
                    nid = match.group(1)
                    db.execute("UPDATE notifications SET read_at=? WHERE id=? AND user_id=?", (now_iso(), nid, s["user_id"]))
                    return self.send_json(200, {"ok": True, "id": nid})

            return self.send_error_json(404, "接口不存在")
        except Exception as exc:
            self.log_error("PUT error: %r", exc)
            return self.send_error_json(400, "更新失败")

    # ----------------------------------------
    # DELETE Routes
    # ----------------------------------------
    def do_DELETE(self):
        try:
            path = self.route()
            with connect() as db:
                s = self.require_auth(db, mutation=True)
                if not s:
                    return

                match = re.fullmatch(r"/api/projects/([^/]+)/columns/purge", path)
                if match:
                    pid = match.group(1)
                    if not db.execute('SELECT id FROM projects WHERE id=? AND deleted_at IS NULL', (pid,)).fetchone():
                        return self.send_error_json(404, '项目不存在')
                    data = self.json_body()
                    db.execute('BEGIN IMMEDIATE')
                    at = now_iso()
                    try:
                        removed = purge_columns(db, pid, data.get('fields'), DEFAULT_TABLE_COLUMN_KEYS, s['username'], at)
                    except ValueError as error:
                        db.rollback()
                        return self.send_error_json(400, str(error))
                    touch_project(db, pid, s, at)
                    audit(db, s['username'], 'purge_columns', pid, json.dumps(removed, ensure_ascii=False))
                    db.commit()
                    return self.send_json(200, {'deleted': removed, 'bundle': project_bundle(db, pid)})

                match = re.fullmatch(r"/api/projects/([^/]+)/trash", path)
                if match:
                    pid = match.group(1)
                    data = self.json_body()
                    requested = list(dict.fromkeys(str(item) for item in data.get("shot_ids", []) if isinstance(item, str)))[:10000]
                    if requested:
                        placeholders = ",".join("?" for _ in requested)
                        ids = [row["id"] for row in db.execute(f"SELECT id FROM shots WHERE project_id=? AND is_deleted=1 AND id IN ({placeholders})", (pid, *requested))]
                    else:
                        ids = [row["id"] for row in db.execute("SELECT id FROM shots WHERE project_id=? AND is_deleted=1", (pid,))]
                    removed = purge_shot_records(db, ids)
                    # Periodic maintenance removes unreferenced files after the
                    # transaction commits and the upload grace period elapses.
                    orphan_files = 0
                    touch_project(db, pid, s)
                    audit(db, s["username"], "purge_trash", pid, f"{removed} shots; {orphan_files} orphan files")
                    return self.send_json(200, {"purged": removed, "orphan_files_removed": orphan_files})

                # Comments are removable from the review thread. This is a
                # hard delete because the user explicitly asks to withdraw
                # the annotation; the action itself remains in the audit log.
                match = re.fullmatch(r"/api/comments/([^/]+)", path)
                if match:
                    cid = match.group(1)
                    comment = db.execute("SELECT shot_id, text FROM comments WHERE id=?", (cid,)).fetchone()
                    if not comment:
                        return self.send_error_json(404, "评论不存在")
                    db.execute("DELETE FROM comments WHERE id=?", (cid,))
                    audit(db, s["username"], "delete_comment", comment["shot_id"], str(comment["text"] or "")[:60])
                    db.commit()
                    self.send_response(204)
                    self.security_headers()
                    self.end_headers()
                    return

                # Permanently remove assets that are genuinely unused.
                #
                # "Unused" is intentionally stricter than "not shown in a
                # thumbnail": active Panels, explicit shot links, production
                # steps, visual boards, version history, project snapshots and
                # active share snapshots all protect the media from deletion.
                match = re.fullmatch(r"/api/projects/([^/]+)/assets/unused", path)
                if match:
                    pid = match.group(1)
                    if not db.execute(
                        "SELECT 1 FROM projects WHERE id=? AND deleted_at IS NULL",
                        (pid,),
                    ).fetchone():
                        return self.send_error_json(404, "项目不存在")

                    db.execute("BEGIN IMMEDIATE")
                    pruned_links = prune_stale_storyboard_asset_links(db, pid)
                    plan = project_asset_cleanup_plan(db, pid)
                    deletable = plan["deletable"]
                    protected = plan["protected"]
                    storage_keys: set[str] = set()

                    for item in deletable:
                        row = db.execute(
                            "SELECT stored_name FROM assets WHERE id=? AND project_id=?",
                            (item["id"], pid),
                        ).fetchone()
                        if row:
                            storage_keys.update(asset_storage_keys(db, item["id"], row["stored_name"]))

                    for item in deletable:
                        db.execute("DELETE FROM assets WHERE id=? AND project_id=?", (item["id"], pid))

                    # A legacy import may let two assets point at one storage
                    # key. Never unlink a file still named by a surviving row.
                    storage_keys = {
                        key for key in storage_keys
                        if not db.execute("""
                            SELECT 1 FROM assets WHERE stored_name=?
                            UNION ALL
                            SELECT 1 FROM asset_versions WHERE storage_key=?
                            LIMIT 1
                        """, (key, key)).fetchone()
                    }

                    touch_project(db, pid, s)
                    audit(
                        db,
                        s["username"],
                        "purge_unused_assets",
                        pid,
                        f"{len(deletable)} deleted; {len(protected)} protected; {pruned_links} stale links pruned",
                    )
                    db.commit()

                    files_removed, bytes_freed = remove_media_storage_keys(storage_keys)
                    return self.send_json(200, {
                        "deleted": len(deletable),
                        "protected": len(protected),
                        "stale_links_pruned": pruned_links,
                        "files_removed": files_removed,
                        "bytes_freed": bytes_freed,
                        "deleted_assets": deletable,
                        "protected_assets": protected,
                    })

                # Project deletion is final: remove its physical files and let
                # SQLite foreign-key cascades clear all project-owned records.
                match = re.fullmatch(r"/api/projects/([^/]+)", path)
                if match:
                    pid = match.group(1)
                    project = db.execute("SELECT id, name FROM projects WHERE id=? AND deleted_at IS NULL", (pid,)).fetchone()
                    if not project:
                        return self.send_error_json(404, "项目不存在")
                    cleanup_plan = delete_project_files(db, pid)
                    db.execute("DELETE FROM projects WHERE id=?", (pid,))
                    audit(db, s["username"], "delete_project", pid, project["name"])
                    db.commit()
                    removed_files, cleanup_errors = remove_deleted_project_files(db, cleanup_plan)
                    return self.send_json(200, {
                        "deleted": True,
                        "project_id": pid,
                        "files_removed": removed_files,
                        "cleanup_errors": cleanup_errors[:3],
                    })

                # Soft delete / trash shot (Spec Section 128)
                match = re.fullmatch(r"/api/shots/([^/]+)", path)
                if match:
                    sid = match.group(1)
                    shot = db.execute("SELECT project_id, number FROM shots WHERE id=?", (sid,)).fetchone()
                    if not shot:
                        return self.send_error_json(404, "镜头不存在")
                    at = now_iso()
                    db.execute("UPDATE shots SET is_deleted=1, deleted_at=?, updated_at=? WHERE id=?", (at, at, sid))
                    touch_project(db, shot["project_id"], s, at)
                    renumber_project_shots(db, shot["project_id"], at)
                    audit(db, s["username"], "trash_shot", sid, f"Shot {shot['number']}")
                    # Commit before sending 204: otherwise a fast follow-up
                    # GET can race the connection context manager's commit.
                    db.commit()
                    self.send_response(204)
                    self.security_headers()
                    self.end_headers()
                    return

                match = re.fullmatch(r"/api/panels/([^/]+)", path)
                if match:
                    panel_id = match.group(1)
                    panel = db.execute(
                        "SELECT shot_id, position, media_id FROM panels WHERE id=?",
                        (panel_id,),
                    ).fetchone()
                    if not panel:
                        return self.send_error_json(404, "分镜画面不存在")
                    db.execute("DELETE FROM panels WHERE id=?", (panel_id,))
                    db.execute(
                        "UPDATE panels SET position=position-1 WHERE shot_id=? AND position>?",
                        (panel["shot_id"], panel["position"]),
                    )
                    # Uploads create a matching Reference link for the Panel.
                    # Once the last Panel using this media is removed, the live
                    # shot association must disappear too; the asset itself stays
                    # in the project asset library until explicit cleanup.
                    if panel["media_id"] and not db.execute(
                        "SELECT 1 FROM panels WHERE shot_id=? AND media_id=? LIMIT 1",
                        (panel["shot_id"], panel["media_id"]),
                    ).fetchone():
                        db.execute(
                            "DELETE FROM shot_asset_links WHERE shot_id=? AND asset_id=? AND role='Reference'",
                            (panel["shot_id"], panel["media_id"]),
                        )
                    shot = db.execute("SELECT project_id FROM shots WHERE id=?", (panel["shot_id"],)).fetchone()
                    if shot:
                        touch_project(db, shot["project_id"], s)
                    audit(db, s["username"], "delete_panel", panel["shot_id"], panel_id)
                    db.commit()
                    self.send_response(204)
                    self.security_headers()
                    self.end_headers()
                    return

                match = re.fullmatch(r"/api/production-steps/([^/]+)", path)
                if match:
                    step_id = match.group(1)
                    step = db.execute("SELECT shot_id, step_order FROM production_steps WHERE id=?", (step_id,)).fetchone()
                    if not step:
                        return self.send_error_json(404, "制作步骤不存在")
                    db.execute("DELETE FROM production_steps WHERE id=?", (step_id,))
                    db.execute("UPDATE production_steps SET step_order=step_order-1, sort_index=sort_index-1 WHERE shot_id=? AND step_order>?", (step["shot_id"], step["step_order"]))
                    audit(db, s["username"], "delete_production_step", step["shot_id"], step_id)
                    db.commit()
                    self.send_response(204)
                    self.security_headers()
                    self.end_headers()
                    return

                # Revoke share link (Spec Section 102)
                match = re.fullmatch(r"/api/projects/([^/]+)/share", path)
                if match:
                    pid = match.group(1)
                    db.execute("UPDATE share_links SET revoked_at=? WHERE project_id=? AND revoked_at IS NULL", (now_iso(), pid))
                    db.execute("UPDATE projects SET share_token=NULL WHERE id=?", (pid,))
                    touch_project(db, pid, s)
                    audit(db, s["username"], "revoke_share", pid)
                    db.commit()
                    self.send_response(204)
                    self.security_headers()
                    self.end_headers()
                    return

                # Delete Custom Field
                match = re.fullmatch(r"/api/projects/([^/]+)/custom-fields/([^/]+)", path)
                if match:
                    pid, cid = match.group(1), match.group(2)
                    field = db.execute("SELECT key, label FROM custom_field_definitions WHERE id=? AND project_id=? AND is_active=1", (cid, pid)).fetchone()
                    if not field:
                        return self.send_error_json(404, "自定义列不存在或已删除")
                    # Remove live cell values as well as the definition. Old
                    # project snapshots remain immutable, but active views can
                    # no longer resurrect a deleted custom column.
                    db.execute("DELETE FROM shot_custom_field_values WHERE field_definition_id=?", (cid,))
                    db.execute("UPDATE custom_field_definitions SET is_active=0, updated_at=? WHERE id=? AND project_id=?", (now_iso(), cid, pid))
                    create_project_snapshot(db, pid, s["username"], "删除自定义列")
                    audit(db, s["username"], "delete_custom_field", cid, str(field["label"]))
                    db.commit()
                    self.send_response(204)
                    self.security_headers()
                    self.end_headers()
                    return

                # Purge one imported/raw column from the live project. Raw
                # columns are JSON keys rather than schema fields, so delete
                # the exact key from every shot and remove its shared column
                # preference. Historical snapshots stay immutable.
                match = re.fullmatch(r"/api/projects/([^/]+)/import-columns/(.+)", path)
                if match:
                    pid, column_key = match.group(1), match.group(2)
                    if not db.execute("SELECT 1 FROM projects WHERE id=? AND deleted_at IS NULL", (pid,)).fetchone():
                        return self.send_error_json(404, "项目不存在")
                    changed = 0
                    for shot in db.execute("SELECT id, import_columns_json FROM shots WHERE project_id=?", (pid,)):
                        try:
                            imported = json.loads(shot["import_columns_json"] or "{}")
                        except Exception:
                            imported = {}
                        if not isinstance(imported, dict) or column_key not in imported:
                            continue
                        del imported[column_key]
                        db.execute("UPDATE shots SET import_columns_json=?, updated_at=? WHERE id=?", (json.dumps(imported, ensure_ascii=False), now_iso(), shot["id"]))
                        changed += 1
                    db.execute("DELETE FROM project_column_preferences WHERE project_id=? AND column_key=?", (pid, f"import:{column_key}"))
                    touch_project(db, pid, s)
                    create_project_snapshot(db, pid, s["username"], "永久删除原始列")
                    audit(db, s["username"], "purge_import_column", pid, f"{column_key}; {changed} shots")
                    db.commit()
                    return self.send_json(200, {"ok": True, "column_key": column_key, "shots_changed": changed})

                # Delete Saved View
                match = re.fullmatch(r"/api/projects/([^/]+)/saved-views/([^/]+)", path)
                if match:
                    pid, vid = match.group(1), match.group(2)
                    db.execute("DELETE FROM saved_views WHERE id=? AND project_id=?", (vid, pid))
                    audit(db, s["username"], "delete_saved_view", vid)
                    db.commit()
                    self.send_response(204)
                    self.security_headers()
                    self.end_headers()
                    return

            return self.send_error_json(404, "接口不存在")
        except Exception as exc:
            self.log_error("DELETE error: %r", exc)
            return self.send_error_json(500, "删除操作失败")

    # ----------------------------------------
    # Handler Methods
    # ----------------------------------------
    def login(self):
        data = self.json_body()
        username = str(data.get("username", "")).strip()
        password = str(data.get("password", ""))
        remote = self.client_address[0]
        key = f"{remote}:{username}"
        now = int(time.time())

        with connect() as db:
            attempt = db.execute("SELECT * FROM login_attempts WHERE key=?", (key,)).fetchone()
            if attempt and attempt["attempts"] >= 5:
                if attempt["window_start"] > now - 30:
                    audit(db, username, "login_rate_limited", remote)
                    return self.send_json(
                        HTTPStatus.TOO_MANY_REQUESTS,
                        {"error": "错误次数过多", "retry_after": 30},
                        {"Retry-After": "30"},
                    )
                # The 30-second cooldown has elapsed; start a fresh window.
                db.execute("DELETE FROM login_attempts WHERE key=?", (key,))
                attempt = None

            user = db.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()
            if not user or not verify_password(password, user["password_hash"]):
                attempts = (attempt["attempts"] + 1) if attempt and attempt["window_start"] > now - 300 else 1
                db.execute(
                    "INSERT INTO login_attempts(key, window_start, attempts) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET window_start=?, attempts=?",
                    (key, now, attempts, now, attempts)
                )
                audit(db, username, "login_failed", remote)
                return self.send_error_json(HTTPStatus.UNAUTHORIZED, "用户名或密码错误")

            if str(user["status"] or "ACTIVE") != "ACTIVE":
                audit(db, username, "login_blocked", user["status"])
                messages = {"PENDING": "账号正在等待管理员审批", "REJECTED": "账号申请未通过", "SUSPENDED": "账号已被停用"}
                return self.send_error_json(HTTPStatus.FORBIDDEN, messages.get(user["status"], "账号当前不可用"))

            db.execute("DELETE FROM login_attempts WHERE key=?", (key,))
            token = secrets.token_urlsafe(32)
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            csrf = secrets.token_hex(24)
            db.execute(
                "INSERT INTO sessions (token_hash, user_id, csrf, expires_at, created_at) VALUES (?,?,?,?,?)",
                (token_hash, user["id"], csrf, now + SESSION_SECONDS, now_iso())
            )
            audit(db, username, "login_success", remote)
            db.commit()

            body = json.dumps({"csrf": csrf, "user_id": user["id"], "username": user["username"], "display_name": user["display_name"], "role": user["role"], "status": user["status"], "color": user["user_color"], "avatar_url": avatar_url(user)}).encode()
            self.send_response(200)
            self.security_headers()
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Set-Cookie", f"{SESSION_COOKIE}={token}; Path=/; Max-Age={SESSION_SECONDS}; HttpOnly; SameSite=Lax")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    def register(self):
        data = self.json_body()
        username = str(data.get("username", "")).strip()
        password = str(data.get("password", ""))
        display_name = str(data.get("display_name", "")).strip()[:80]
        if not re.fullmatch(r"[A-Za-z0-9_.-]{3,40}", username):
            return self.send_error_json(400, "用户名需为 3-40 位字母、数字、下划线、点或短横线")
        if len(password) < 8 or len(password) > 200:
            return self.send_error_json(400, "密码需为 8-200 位")
        with connect() as db:
            if db.execute("SELECT 1 FROM users WHERE username=?", (username,)).fetchone():
                return self.send_error_json(409, "用户名已存在")
            user_id, at = str(uuid.uuid4()), now_iso()
            color = allocate_user_color(db, user_id)
            db.execute("INSERT INTO users (id, username, password_hash, role, status, display_name, user_color, created_at) VALUES (?,?,?,?,?,?,?,?)",
                       (user_id, username, password_hash(password), "user", "PENDING", display_name or username, color, at))
            audit(db, username, "registration_submitted", user_id)
            return self.send_json(201, {"ok": True, "status": "PENDING", "message": "申请已提交，请等待管理员审批"})

    def upload_media(self, db: sqlite3.Connection, s: sqlite3.Row, pid: str):
        q = self.query()
        filename = clean_name(q.get("filename", ["review_proxy.webp"])[0])
        shot_id = q.get("shot_id", [None])[0]
        asset_id = q.get("asset_id", [None])[0]
        category = q.get("category", ["Storyboard"])[0]
        mime = self.headers.get("Content-Type", "image/webp").split(";")[0]

        allowed_mimes = {"image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm", "video/quicktime"}
        if mime not in allowed_mimes:
            return self.send_error_json(415, "仅支持 JPEG、PNG、WebP、GIF、MP4、WebM 或 MOV 媒体")
        if not re.search(r"\.(?:jpe?g|png|webp|gif|mp4|webm|mov)$", filename, re.IGNORECASE):
            return self.send_error_json(400, "媒体文件扩展名不受支持")

        try:
            declared_size = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return self.send_error_json(400, "媒体文件大小无效")
        if declared_size <= 0:
            return self.send_error_json(400, "文件内容为空")
        if declared_size > MEDIA_UPLOAD_MAX_BYTES:
            return self.send_error_json(413, "媒体文件超过 120MB，请先压缩后再上传")

        payload = self.body()
        if not payload:
            return self.send_error_json(400, "文件内容为空")
        if not media_signature_matches(mime, payload):
            return self.send_error_json(415, "媒体内容与声明的文件类型不一致")

        # A stale browser upload must never attach media to a shot from a
        # different project (or to a shot already in the trash). Validate the
        # relationship before writing the asset to disk.
        if shot_id and not db.execute(
            "SELECT 1 FROM shots WHERE id=? AND project_id=? AND is_deleted=0",
            (shot_id, pid),
        ).fetchone():
            return self.send_error_json(404, "目标镜头不存在或已移入废纸篓")

        if not db.in_transaction:
            db.execute("BEGIN IMMEDIATE")
        existing = db.execute("SELECT * FROM assets WHERE id=? AND project_id=?", (asset_id, pid)).fetchone() if asset_id else None
        if asset_id and not existing:
            return self.send_error_json(404, "待替换素材不存在或不属于当前项目")
        # Replacement creates a new immutable asset identity. Old panel media_id
        # values in undo history and published snapshots must still resolve.
        aid = str(uuid.uuid4())
        version = f"v{int(str(existing['version']).lstrip('v') or 0) + 1:03d}" if existing else "v001"
        stored_name = f"{aid}_{filename}"
        target = MEDIA_ROOT / stored_name
        target.write_bytes(payload)

        asset_metadata = json.dumps({"proxy": True, "source": "browser", "previous_asset_id": existing["id"] if existing else None})
        asset_sha = hashlib.sha256(payload).hexdigest()
        at = now_iso()
        db.execute("""
            INSERT INTO assets (id, project_id, filename, stored_name, mime, size, category, version, metadata_json, sha256, created_by, created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
        """, (aid, pid, filename, stored_name, mime, len(payload), category, version,
              asset_metadata, asset_sha, s["username"], at))
        db.execute("""
            INSERT INTO asset_versions
                (id, asset_id, version_number, storage_key, mime_type, size, sha256, metadata_json, created_by, created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?)
        """, (str(uuid.uuid4()), aid, version, stored_name, mime, len(payload), asset_sha,
              asset_metadata, s["username"], at))

        if shot_id:
            if not db.execute("SELECT 1 FROM shot_asset_links WHERE shot_id=? AND asset_id=?", (shot_id, aid)).fetchone():
                db.execute("INSERT INTO shot_asset_links (id, shot_id, asset_id, role, created_at) VALUES (?,?,?,?,?)",
                           (str(uuid.uuid4()), shot_id, aid, "Reference", now_iso()))
            # Update default panel
            primary_panel = db.execute("SELECT id FROM panels WHERE shot_id=? ORDER BY position LIMIT 1", (shot_id,)).fetchone()
            if primary_panel:
                db.execute("UPDATE panels SET media_id=?, updated_at=? WHERE id=?", (aid, at, primary_panel["id"]))
            else:
                duration = db.execute("SELECT duration_frames FROM shots WHERE id=?", (shot_id,)).fetchone()[0]
                insert_record(db, "panels", {"id": str(uuid.uuid4()), "shot_id": shot_id, "position": 0, "label": "A", "duration_frames": duration, "media_id": aid, "created_at": at, "updated_at": at})

            # Replacement changes the live Panel association to the new asset.
            # Keep the old asset itself for versions/shares, but do not leave a
            # stale live Reference link that makes it reappear after deletion.
            if existing and not db.execute(
                "SELECT 1 FROM panels WHERE shot_id=? AND media_id=? LIMIT 1",
                (shot_id, existing["id"]),
            ).fetchone():
                db.execute(
                    "DELETE FROM shot_asset_links WHERE shot_id=? AND asset_id=? AND role='Reference'",
                    (shot_id, existing["id"]),
                )

        audit(db, s["username"], "upload_media", pid, f"{filename} ({len(payload)} bytes)")
        touch_project(db, pid, s, at)
        db.commit()
        panel = db.execute("SELECT id, shot_id, position, label, duration_frames, media_id, created_at, updated_at FROM panels WHERE shot_id=? ORDER BY position LIMIT 1", (shot_id,)).fetchone() if shot_id else None
        # Never return drawing_json/notes from the upload acknowledgement. A
        # legacy panel may contain tens of megabytes of drawing data and the
        # upload response must remain a small control-plane response.
        return self.send_json(201, {"id": aid, "filename": filename, "size": len(payload), "mime": mime, "version": version, "panel": dict(panel) if panel else None})

    def store_import_image(self, db: sqlite3.Connection, s: sqlite3.Row, pid: str, shot_id: str, image: dict, at: str) -> bool:
        """Persist one worksheet drawing and attach it to the shot's panel."""
        try:
            mime = str(image.get("mime", ""))
            suffix = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}.get(mime)
            supplied_raw = image.get("raw")
            raw = bytes(supplied_raw) if isinstance(supplied_raw, (bytes, bytearray)) else base64.b64decode(str(image.get("data", "")), validate=True)
            if not suffix or not raw or len(raw) > 30 * 1024 * 1024 or not media_signature_matches(mime, raw):
                return False
            aid = str(uuid.uuid4())
            filename = clean_name(str(image.get("filename") or f"excel-image-{aid[:8]}{suffix}"))
            if not re.search(r"\.(?:jpe?g|png|webp|gif)$", filename, re.IGNORECASE):
                filename += suffix
            stored_name = f"{aid}_{filename}"
            target = MEDIA_ROOT / stored_name
            target.write_bytes(raw)
            sha = hashlib.sha256(raw).hexdigest()
            metadata = json.dumps({"proxy": False, "source": "excel_embedded_image", "browser_compressed": False})
            db.execute("""
                INSERT INTO assets (id, project_id, filename, stored_name, mime, size, category, version, metadata_json, sha256, created_by, created_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
            """, (aid, pid, filename, stored_name, mime, len(raw), "Storyboard", "v001", metadata, sha, s["username"], at))
            db.execute("""
                INSERT INTO asset_versions (id, asset_id, version_number, storage_key, mime_type, size, sha256, metadata_json, created_by, created_at)
                VALUES (?,?,?,?,?,?,?,?,?,?)
            """, (str(uuid.uuid4()), aid, "v001", stored_name, mime, len(raw), sha, metadata, s["username"], at))
            db.execute("INSERT INTO shot_asset_links (id, shot_id, asset_id, role, created_at) VALUES (?,?,?,?,?)",
                       (str(uuid.uuid4()), shot_id, aid, "Reference", at))
            empty_panel = db.execute("SELECT id FROM panels WHERE shot_id=? AND media_id IS NULL ORDER BY position LIMIT 1", (shot_id,)).fetchone()
            if empty_panel:
                db.execute("UPDATE panels SET media_id=? WHERE id=?", (aid, empty_panel["id"]))
            else:
                position = db.execute("SELECT COALESCE(MAX(position),-1)+1 FROM panels WHERE shot_id=?", (shot_id,)).fetchone()[0]
                duration = db.execute("SELECT duration_frames FROM shots WHERE id=?", (shot_id,)).fetchone()[0]
                insert_record(db, "panels", {"id": str(uuid.uuid4()), "shot_id": shot_id, "position": position, "label": chr(65 + position) if position < 26 else str(position+1), "duration_frames": duration, "media_id": aid, "created_at": at, "updated_at": at})
            return True
        except (ValueError, OSError, sqlite3.Error):
            return False

    def serve_import_preview_image(self, db: sqlite3.Connection, s: sqlite3.Row, pid: str, preview_id: str, image_index: int):
        """Serve one staged workbook image to the authenticated import wizard.

        Preview images stay on the internal server.  Only a small authorized
        binary response crosses the browser boundary; the workbook and its
        full image set are never serialized into preview JSON.
        """
        if not re.fullmatch(r"[A-Za-z0-9_-]{20,80}", preview_id):
            return self.send_error_json(400, "导入预览标识无效")
        manifest_path = IMPORT_ROOT / f"{preview_id}.json"
        if not manifest_path.exists():
            return self.send_error_json(410, "导入预览已过期，请重新选择文件")
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return self.send_error_json(410, "导入预览已损坏，请重新选择文件")
        if manifest.get("project_id") != pid or manifest.get("user_id") != s["user_id"]:
            return self.send_error_json(403, "无权访问此导入预览")
        if int(time.time()) - int(manifest.get("created_at", 0)) > IMPORT_TTL_SECONDS:
            return self.send_error_json(410, "导入预览已过期，请重新选择文件")
        staged = IMPORT_ROOT / str(manifest.get("stored_name", ""))
        if staged.parent != IMPORT_ROOT or not staged.exists() or staged.suffix.lower() not in {".xlsx", ".pdf"}:
            return self.send_error_json(404, "导入预览图片不存在")
        if image_index < 0 or image_index >= 10000:
            return self.send_error_json(404, "导入预览图片不存在")
        try:
            is_pdf = staged.suffix.lower() == ".pdf"
            all_rows, records = load_import_parse(staged)
            header_index = int(manifest.get("header_index", 0))
            assignable = []
            for record in records:
                sheet_row = int(record.get("data_row", -1))
                data_index = sheet_row - header_index - 1
                if data_index < 0 or sheet_row >= len(all_rows):
                    continue
                if not any(str(cell).strip() for cell in all_rows[sheet_row]):
                    continue
                assignable.append(record)
            record = assignable[image_index]
            if is_pdf:
                raw = staged_image_bytes(staged, record)
            else:
                with zipfile.ZipFile(staged) as archive:
                    raw = archive.read(str(record["archive_name"]))
            if not raw:
                raise ValueError("empty image")
            self.send_response(200)
            self.security_headers()
            self.send_header("Content-Type", str(record.get("mime") or "application/octet-stream"))
            self.send_header("Cache-Control", "private, max-age=300, must-revalidate")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)
        except (IndexError, KeyError, OSError, ValueError, zipfile.BadZipFile):
            return self.send_error_json(404, "导入预览图片不存在")

    def import_preview(self, db: sqlite3.Connection, s: sqlite3.Row, pid: str):
        q = self.query()
        filename = q.get("filename", ["import.xlsx"])[0]
        suffix = Path(filename).suffix.lower()
        if suffix not in {".xlsx", ".csv", ".tsv", ".pdf"}:
            return self.send_error_json(415, "仅支持 XLSX、CSV、TSV 或 PDF 文件")
        cleanup_import_staging(IMPORT_ROOT, IMPORT_TTL_SECONDS)
        preview_id = secrets.token_urlsafe(24)
        stored_name = f"{preview_id}{suffix}"
        staged_path = IMPORT_ROOT / stored_name
        manifest_path = IMPORT_ROOT / f"{preview_id}.json"
        try:
            upload_size = self.body_to_file(staged_path)
            embedded_images = []
            source_diagnostics = []
            if suffix == ".xlsx":
                rows, embedded_images = parse_xlsx_package(staged_path)
            elif suffix == ".pdf":
                rows, embedded_images, pdf_metadata = parse_pdf_storyboard(staged_path, with_metadata=True)
                # The PDF parser creates page placeholders for pages without a
                # text layer. Keep image-only import available, but do not
                # present those generated columns as extracted field mappings.
                if pdf_metadata["page_count"] and pdf_metadata["text_page_count"] == 0:
                    full_page_images = pdf_metadata["rendered_page_count"] == pdf_metadata["page_count"]
                    image_note = (
                        "可见页面会作为整页图片保留，但图片中的文字不可编辑，也不能作为无损工程回导。"
                        if full_page_images else
                        "仅能导入解析器取得的图片，其他可见绘制内容可能缺失；请先用 OCR 或可保留文字的方式重新生成 PDF。"
                    )
                    source_diagnostics.append({
                        "code": "pdf_text_not_extracted",
                        "severity": "warning",
                        "page_count": pdf_metadata["page_count"],
                        "text_page_count": 0,
                        "rendered_page_count": pdf_metadata["rendered_page_count"],
                        "image_count": len(embedded_images),
                        "message": "当前 PDF 解析器未取得可用文字；页面上可能仍有清晰可见的文字，但需要 OCR 才能识别分镜字段。继续导入会按页创建占位镜头，镜号和标题由页码生成。" + image_note,
                    })
            else:
                rows = parse_table(staged_path.read_bytes(), filename)
            if suffix in {".xlsx", ".pdf"}:
                cache_import_parse(staged_path, rows, embedded_images)
        except Exception:
            if staged_path.exists():
                staged_path.unlink()
            raise
        if not rows:
            if staged_path.exists():
                staged_path.unlink()
            return self.send_error_json(400, "无法解析表格内容或表格为空")

        # Excel workbooks often have a title/summary row above the real table.
        # Select the row with the strongest known-header signal instead of
        # assuming row 1 is the header.
        header_index = 0
        header_score = -1
        for index, candidate in enumerate(rows[:20]):
            candidate_headers = [str(c).strip() for c in candidate]
            score = len(map_headers(candidate_headers))
            if score > header_score:
                header_index, header_score = index, score
        headers = [str(c).strip() for c in rows[header_index]]
        mapping = map_headers(headers)
        if any(item["code"] == "pdf_text_not_extracted" for item in source_diagnostics):
            mapping = {field: info for field, info in mapping.items() if field in {"number", "title"}}
        custom_columns = build_import_custom_columns(headers, mapping)
        if source_diagnostics:
            custom_columns = []
        data_rows = rows[header_index + 1:]
        if embedded_images:
            image_header_terms = ("分镜图", "分镜框", "图片", "图像", "缩略图", "image", "photo", "thumbnail", "storyboardframe")
            custom_columns = [item for item in custom_columns if not any(term in norm_header(item.get("label", "")) for term in image_header_terms)]

        preview_shots = []
        diagnostics = []
        for r in data_rows[:10]:
            shot_sample = {}
            for f, info in mapping.items():
                col = info["col"]
                shot_sample[f] = r[col] if col < len(r) else ""
            preview_shots.append(shot_sample)

        for index, r in enumerate(data_rows, start=2):
            if not any(str(c).strip() for c in r):
                continue
            row_values = {}
            for f, info in mapping.items():
                col = info["col"]
                row_values[f] = str(r[col]).strip() if col < len(r) else ""
            errors = []
            warnings = []
            if not row_values.get("title") and not row_values.get("description"):
                warnings.append("缺少镜头标题和画面描述")
            if row_values.get("duration"):
                raw_duration = row_values["duration"]
                try:
                    parsed = float(re.sub(r"[^\d.]", "", raw_duration))
                    if parsed <= 0 or parsed > 3600:
                        errors.append("时长必须在 0 到 3600 秒之间")
                except ValueError:
                    errors.append("时长不是可识别的数字")
            if errors or warnings:
                issue_fields = []
                if not row_values.get("title"): issue_fields.append("title")
                if not row_values.get("description"): issue_fields.append("description")
                if errors: issue_fields.append("duration")
                diagnostics.append({"row": index, "fields": issue_fields, "errors": errors, "warnings": warnings})

        import_images = []
        unassigned_image_count = 0
        for image in embedded_images:
            sheet_row = int(image.get("data_row", -1))
            if sheet_row > header_index:
                data_index = sheet_row - header_index - 1
                if data_index >= len(data_rows) or not any(str(cell).strip() for cell in data_rows[data_index]):
                    unassigned_image_count += 1
                    continue
                item = dict(image)
                item["data_row"] = data_index
                item["preview_url"] = f"/api/projects/{pid}/import-preview/{preview_id}/image/{len(import_images)}"
                item.pop("archive_name", None)
                item.pop("data", None)
                item.pop("raw", None)
                import_images.append(item)

        manifest_path.write_text(json.dumps({
            "preview_id": preview_id,
            "project_id": pid,
            "user_id": s["user_id"],
            "filename": filename,
            "stored_name": stored_name,
            "created_at": int(time.time()),
            "header_index": header_index,
        }, ensure_ascii=False), encoding="utf-8")

        return self.send_json(200, {
            "preview_id": preview_id,
            "upload_size": upload_size,
            "total_rows": sum(1 for row in data_rows if any(str(cell).strip() for cell in row)),
            "headers": headers,
            "header_row": header_index + 1,
            "mapping": mapping,
            "custom_columns": custom_columns,
            "rows": data_rows[:10000],
            "sample_preview": preview_shots,
            "diagnostics": diagnostics[:200],
            "source_diagnostics": source_diagnostics,
            "embedded_images": import_images[:10000],
            "embedded_image_count": len(import_images),
            "embedded_image_bytes": sum(int(item.get("size", 0)) for item in import_images),
            "unassigned_image_count": unassigned_image_count,
        })

    def import_commit(self, db: sqlite3.Connection, s: sqlite3.Row, pid: str):
        data = self.json_body()
        preview_id = str(data.get("preview_id", "")).strip()
        stage_path = None
        stage_manifest_path = None
        header_index = 0
        archive = None
        if preview_id:
            if not re.fullmatch(r"[A-Za-z0-9_-]{20,80}", preview_id):
                return self.send_error_json(400, "导入预览标识无效")
            stage_manifest_path = IMPORT_ROOT / f"{preview_id}.json"
            if not stage_manifest_path.exists():
                return self.send_error_json(410, "导入预览已过期，请重新选择文件")
            try:
                manifest = json.loads(stage_manifest_path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                return self.send_error_json(410, "导入预览已损坏，请重新选择文件")
            if manifest.get("project_id") != pid or manifest.get("user_id") != s["user_id"]:
                return self.send_error_json(403, "无权提交此导入预览")
            if int(time.time()) - int(manifest.get("created_at", 0)) > IMPORT_TTL_SECONDS:
                return self.send_error_json(410, "导入预览已过期，请重新选择文件")
            stage_path = IMPORT_ROOT / str(manifest.get("stored_name", ""))
            if stage_path.parent != IMPORT_ROOT or not stage_path.exists():
                return self.send_error_json(410, "导入文件已过期，请重新选择文件")
            filename = str(manifest.get("filename", stage_path.name))
            header_index = int(manifest.get("header_index", 0))
            if stage_path.suffix.lower() == ".xlsx":
                all_rows, image_records = load_import_parse(stage_path)
                archive = zipfile.ZipFile(stage_path)
            elif stage_path.suffix.lower() == ".pdf":
                all_rows, image_records = load_import_parse(stage_path)
                image_records = [{**record, "raw": staged_image_bytes(stage_path, record)} for record in image_records]
            else:
                all_rows = parse_table(stage_path.read_bytes(), filename)
                image_records = []
            if header_index < 0 or header_index >= len(all_rows):
                if archive:
                    archive.close()
                return self.send_error_json(400, "导入表头已失效，请重新预览")
            headers = [str(c).strip() for c in all_rows[header_index]]
            rows = all_rows[header_index + 1:]
        else:
            # Compatibility for existing API clients. The web client always
            # uses staged commits so large workbooks and image data are never
            # echoed through JSON.
            rows = data.get("rows", [])
            headers = data.get("headers", [])
            image_records = data.get("embedded_images", [])
        mapping = data.get("mapping", {})
        mode = str(data.get("mode", "append")).lower()
        if mode not in {"append", "update", "replace"}:
            if archive:
                archive.close()
            return self.send_error_json(400, "导入模式无效")
        project = db.execute("SELECT fps FROM projects WHERE id=?", (pid,)).fetchone()
        if not project:
            if archive:
                archive.close()
            return self.send_error_json(404, "项目不存在")
        fps = float(project["fps"])
        tombstones = purged_fields(db, pid)
        mapped_fields = set(mapping) | ({"methods"} if set(mapping) & {"primary_method", "secondary_methods"} else set())
        if mapped_fields & tombstones:
            if archive:
                archive.close()
            return self.send_error_json(409, "导入映射包含已永久删除的列，请重新选择映射")

        # Any source column not consumed by the core mapping becomes a real
        # project custom field.  The browser may remove entries from this list
        # before commit, but the default is lossless Excel import.
        requested_custom = data.get("custom_columns")
        if not isinstance(requested_custom, list):
            requested_custom = build_import_custom_columns(headers, mapping)
        mapped_cols = set()
        for info in (mapping or {}).values():
            if isinstance(info, dict):
                try:
                    col = int(info.get("col", -1))
                except (TypeError, ValueError):
                    col = -1
                if col >= 0:
                    mapped_cols.add(col)
        custom_specs: list[dict] = []
        used_keys = {str(row["key"]) for row in db.execute(
            "SELECT key FROM custom_field_definitions WHERE project_id=?", (pid,)
        )}
        custom_field_ids: dict[str, str] = {}
        for item in requested_custom:
            if not isinstance(item, dict):
                continue
            try:
                source_col = int(item.get("source_col", -1))
            except (TypeError, ValueError):
                source_col = -1
            if source_col < 0 or source_col >= len(headers) or source_col in mapped_cols:
                continue
            label = str(item.get("label") or headers[source_col] or f"未命名列{source_col + 1}").strip()[:80]
            if not label:
                continue
            key = re.sub(r"[^a-zA-Z0-9_]", "_", str(item.get("key") or "").strip().lower())
            if not key:
                digest = hashlib.sha1(f"{source_col}:{headers[source_col]}".encode("utf-8")).hexdigest()[:10]
                key = f"excel_col_{source_col + 1}_{digest}"
            if not re.match(r"^[a-zA-Z][a-zA-Z0-9_]*$", key):
                key = f"excel_{key}"
            base_key = key[:48]
            if f"custom:{base_key}" in tombstones:
                if archive:
                    archive.close()
                db.rollback()
                return self.send_error_json(409, "导入列键已永久删除，请重新选择列键")
            key = base_key
            suffix = 2
            while key in used_keys or f"custom:{key}" in tombstones:
                existing = db.execute(
                    "SELECT id FROM custom_field_definitions WHERE project_id=? AND key=? AND is_active=1",
                    (pid, key),
                ).fetchone()
                if existing:
                    break
                key = f"{base_key[:max(1, 48 - len(str(suffix)) - 1)]}_{suffix}"
                suffix += 1
            existing = db.execute(
                "SELECT id FROM custom_field_definitions WHERE project_id=? AND key=? AND is_active=1",
                (pid, key),
            ).fetchone()
            if existing:
                field_id = str(existing["id"])
            else:
                field_id = str(uuid.uuid4())
                at_field = now_iso()
                db.execute("""
                    INSERT INTO custom_field_definitions (
                        id, project_id, key, label, description, field_type, group_name,
                        options_json, required, default_value, sort_index, is_active, created_by, created_at, updated_at
                    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """, (field_id, pid, key, label, "从 Excel 导入的自定义列", "text", "Excel 导入",
                      "[]", 0, "", 1000 + source_col, 1, s["username"], at_field, at_field))
            used_keys.add(key)
            custom_field_ids[key] = field_id
            custom_specs.append({"source_col": source_col, "label": label, "key": key, "field_type": "text"})

        at = now_iso()
        imported = 0
        updated = 0
        skipped = 0
        errors = []
        warnings = []
        before_count = int(db.execute("SELECT COUNT(*) AS n FROM shots WHERE project_id=? AND is_deleted=0", (pid,)).fetchone()["n"])
        pos = db.execute("SELECT COALESCE(MAX(position), -1) + 1 as n FROM shots WHERE project_id=? AND is_deleted=0", (pid,)).fetchone()["n"]

        if mode == "replace":
            # This remains inside the same SQLite transaction. Any validation
            # error below rolls the clear back, so “替换所有” cannot leave a
            # half-imported project.
            db.execute("UPDATE shots SET is_deleted=1, updated_at=? WHERE project_id=? AND is_deleted=0", (at, pid))
            pos = 0

        embedded_images: dict[int, list[dict]] = {}
        for item in image_records:
            if not isinstance(item, dict):
                continue
            sheet_row = int(item.get("data_row", -1))
            data_row = sheet_row - header_index - 1 if preview_id else sheet_row
            if data_row >= 0:
                embedded_images.setdefault(data_row, []).append(item)
        images_imported = 0

        def write_import_custom_values(shot_id: str, row: list[str]) -> None:
            for spec in custom_specs:
                source_col = int(spec["source_col"])
                key = str(spec["key"])
                field_id = custom_field_ids.get(key)
                if not field_id:
                    continue
                value = str(row[source_col]).strip() if source_col < len(row) else ""
                db.execute("""
                    INSERT INTO shot_custom_field_values (id, shot_id, field_definition_id, value_text, value_json, updated_at)
                    VALUES (?,?,?,?,?,?)
                    ON CONFLICT(shot_id, field_definition_id) DO UPDATE SET value_text=excluded.value_text, value_json=excluded.value_json, updated_at=excluded.updated_at
                """, (str(uuid.uuid4()), shot_id, field_id, value, None, at))

        for row_number, r in enumerate(rows, start=2):
            if not any(str(c).strip() for c in r):
                continue
            values = {}
            for f, info in mapping.items():
                col = info.get("col", -1)
                values[f] = str(r[col]).strip() if 0 <= col < len(r) else ""
            imported_columns = {}
            # Keep only columns explicitly selected as a core mapping or as a
            # custom field. Unselected Excel columns are intentionally not
            # copied into the raw-import section/sidebar.
            retained_source_cols = {
                int(info.get("col")) for info in mapping.values()
                if isinstance(info, dict) and str(info.get("col", "")).lstrip("-").isdigit() and int(info.get("col")) >= 0
            }
            retained_source_cols.update(int(spec["source_col"]) for spec in custom_specs)
            if isinstance(headers, list):
                seen_headers = {}
                for index in sorted(retained_source_cols):
                    if index >= len(headers):
                        continue
                    label = str(headers[index]).strip() or f"未命名列{index + 1}"
                    seen_headers[label] = seen_headers.get(label, 0) + 1
                    key = label if seen_headers[label] == 1 else f"{label} ({seen_headers[label]})"
                    if f"import:{key}" in tombstones:
                        if archive:
                            archive.close()
                        db.rollback()
                        return self.send_error_json(409, "导入包含已永久删除的原始列，请取消该列映射")
                    imported_columns[key] = str(r[index]).strip() if index < len(r) else ""

            num = values.get("number") or f"{pos+1:03d}"
            dur_raw = values.get("duration", "")
            try:
                dur_sec = float(re.sub(r"[^\d.]", "", dur_raw)) if dur_raw else 3.0
                if dur_sec <= 0 or dur_sec > 3600:
                    raise ValueError
            except ValueError:
                errors.append({"row": row_number, "message": "时长不是 0 到 3600 秒之间的有效数字"})
                continue
            dur_frames = max(1, int(round(dur_sec * fps)))

            existing = db.execute(
                "SELECT * FROM shots WHERE project_id=? AND number=? AND is_deleted=0 ORDER BY position LIMIT 1",
                (pid, num),
            ).fetchone()
            if mode == "update" and not existing:
                errors.append({"row": row_number, "message": f"找不到镜号 {num}，无法更新"})
                continue

            SHOT_SIZE_LENS_RECOMMENDATIONS = {
                '大远景': '24mm', '远景': '28mm', '大全景': '24mm', '全景': '35mm',
                '中全景': '35mm', '中景': '50mm', '中近景': '50mm', '近景': '85mm',
                '特写': '85mm', '大特写': '100mm', '微距': '100mm'
            }

            if mode == "update" and existing:
                imp_shot_size = values.get("shot_size", existing["shot_size"])
                imp_lens = values.get("lens", "")
                imp_lens_source = existing["lens_source"] if "lens_source" in existing.keys() else ""
                if "lens" in values and str(values["lens"]).strip():
                    final_lens = str(values["lens"]).strip()
                    imp_lens_source = "imported-explicit"
                elif "shot_size" in values and not existing["lens"]:
                    final_lens = SHOT_SIZE_LENS_RECOMMENDATIONS.get(imp_shot_size, "")
                    if final_lens:
                        imp_lens_source = "auto-shot-size"
                else:
                    final_lens = existing["lens"]

                updates = {
                    "title": values.get("title", existing["title"]), "chapter": values.get("chapter", existing["chapter"]),
                    "scene": values.get("scene", existing["scene"]), "description": values.get("description", existing["description"]),
                    "panel_frame": values.get("panel_frame", existing["panel_frame"]),
                    "voiceover": values.get("voiceover", existing["voiceover"]), "duration_frames": dur_frames,
                    "shot_size": imp_shot_size, "lens": final_lens, "lens_source": imp_lens_source,
                    "movement": values.get("movement", existing["movement"]), "department": values.get("department", existing["department"]),
                    "owner": values.get("owner", existing["owner"]),
                }
                p_method = values.get("primary_method", existing["primary_method"]).upper()
                updates["primary_method"] = p_method if p_method in PRODUCTION_METHODS else existing["primary_method"]
                db.execute("""UPDATE shots SET title=?, chapter=?, scene=?, panel_frame=?, description=?, voiceover=?, duration_frames=?,
                    shot_size=?, lens=?, lens_source=?, movement=?, department=?, owner=?, primary_method=?, revision=revision+1, updated_at=? WHERE id=?""",
                    (*updates.values(), at, existing["id"]))
                db.execute("UPDATE shots SET import_columns_json=? WHERE id=?", (json.dumps(imported_columns, ensure_ascii=False), existing["id"]))
                write_import_custom_values(existing["id"], r)
                updated += 1
                continue

            sid = str(uuid.uuid4())
            p_method = values.get("primary_method", "LIVE").upper()
            if p_method not in PRODUCTION_METHODS:
                p_method = "LIVE"

            raw_shot_size = str(values.get("shot_size", "全景")).strip() or "全景"
            raw_lens = str(values.get("lens", "")).strip()
            if raw_lens:
                final_lens = raw_lens
                final_lens_source = "imported-explicit"
            else:
                final_lens = SHOT_SIZE_LENS_RECOMMENDATIONS.get(raw_shot_size, "")
                final_lens_source = "auto-shot-size" if final_lens else ""

            db.execute("""
                INSERT INTO shots (
                    id, project_id, position, number, sort_index, title, chapter, scene, panel_frame,
                    description, voiceover, duration_frames, shot_size, lens, lens_source, movement,
                    primary_method, secondary_methods, department, owner, status, import_columns_json, created_at, updated_at
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (
                sid, pid, pos, num, pos, values.get("title", f"镜头 {num}"),
                values.get("chapter", ""), values.get("scene", ""), values.get("panel_frame", ""),
                values.get("description", ""), values.get("voiceover", ""),
                dur_frames, raw_shot_size, final_lens, final_lens_source,
                values.get("movement", "固定"), p_method, json.dumps([]),
                values.get("department", "Camera"), values.get("owner", ""),
                "Draft", json.dumps(imported_columns, ensure_ascii=False), at, at
            ))
            db.execute("""
                INSERT INTO panels (id, shot_id, position, label, duration_frames, created_at, updated_at)
                VALUES (?,?,?,?,?,?,?)
            """, (str(uuid.uuid4()), sid, 0, "A", dur_frames, at, at))
            write_import_custom_values(sid, r)
            pos += 1
            imported += 1
            for image in embedded_images.get(row_number - 2, []):
                try:
                    image_payload = dict(image)
                    if archive and image.get("archive_name"):
                        image_payload["raw"] = archive.read(str(image["archive_name"]))
                    if self.store_import_image(db, s, pid, sid, image_payload, at):
                        images_imported += 1
                except (KeyError, OSError, zipfile.BadZipFile):
                    warnings.append({"row": row_number, "message": "Excel 内嵌图片读取失败"})

        # Commit is atomic: any validation error prevents partial import.
        if errors:
            if archive:
                archive.close()
            db.rollback()
            return self.send_json(422, {
                "error": "导入预检未通过，未写入任何镜头",
                "imported": 0, "updated": 0, "skipped": skipped,
                "errors": errors[:200], "warnings": warnings[:200], "images_imported": 0, "atomic": True
            })
        touch_project(db, pid, s, at)
        audit(db, s["username"], "import_shots", pid, f"mode={mode}; imported={imported}; updated={updated}")
        if imported or updated:
            renumber_project_shots(db, pid, at)
        after_count = int(db.execute("SELECT COUNT(*) AS n FROM shots WHERE project_id=? AND is_deleted=0", (pid,)).fetchone()["n"])
        expected_count = imported if mode == "replace" else None
        if mode == "replace" and after_count != expected_count:
            if archive:
                archive.close()
            db.rollback()
            return self.send_json(409, {
                "error": "全量替换数量校验失败，已回滚",
                "atomic": True,
                "before_count": before_count,
                "after_count": before_count,
                "expected_count": expected_count,
                "mode": mode,
            })
        create_project_snapshot(db, pid, s["username"], f"智能导入 {imported + updated} 镜")
        if archive:
            archive.close()
        response_bundle = project_bundle(db, pid)
        if stage_path:
            remove_staged_import(stage_path, IMPORT_ROOT)
        if stage_manifest_path and stage_manifest_path.exists():
            stage_manifest_path.unlink()
        return self.send_json(200, {"imported": imported, "updated": updated, "skipped": skipped,
                                    "errors": errors, "warnings": warnings, "atomic": True,
                                    "replaced": mode == "replace", "images_imported": images_imported,
                                    "mode": mode, "before_count": before_count, "after_count": after_count,
                                    "expected_count": expected_count, "bundle": response_bundle})

    def handle_export(self, bundle: dict, export_type: str):
        p = bundle["project"]
        safe_name = clean_name(p["name"])

        if export_type == "edl":
            body = generate_cmx3600_edl(bundle).encode("utf-8")
            self.send_file(body, f"{safe_name}.edl", "text/plain; charset=utf-8")
        elif export_type == "otio":
            body = json_dumps(generate_otio_json(bundle)).encode("utf-8")
            self.send_file(body, f"{safe_name}.otio", "application/json; charset=utf-8")
        elif export_type == "fcpxml":
            body = generate_fcpxml(bundle).encode("utf-8")
            self.send_file(body, f"{safe_name}.fcpxml", "application/xml; charset=utf-8")
        elif export_type == "srt":
            body = generate_srt_subtitles(bundle).encode("utf-8-sig")
            self.send_file(body, f"{safe_name}.srt", "text/plain; charset=utf-8")
        elif export_type == "vtt":
            body = generate_vtt_subtitles(bundle).encode("utf-8-sig")
            self.send_file(body, f"{safe_name}.vtt", "text/vtt; charset=utf-8")
        elif export_type in ("shooting_list", "stock_list", "motion_list", "vfx_list", "csv"):
            body = self.generate_csv_export(bundle, export_type).encode("utf-8-sig")
            self.send_file(body, f"{safe_name}_{export_type}.csv", "text/csv; charset=utf-8")
        elif export_type == "json":
            with connect() as backup_db:
                body = json_dumps(export_project_backup(backup_db, p["id"])).encode("utf-8")
            if len(body) > MAX_BODY:
                raise ValueError("完整备份超出可导入大小限制")
            self.send_file(body, f"{safe_name}_backup.json", "application/json; charset=utf-8")
        elif export_type == "project-pdf":
            with connect() as backup_db:
                archive = export_project_backup(backup_db, p["id"])
            backup_bytes = json_dumps(archive).encode("utf-8")
            if len(backup_bytes) > MAX_BODY - 1024 * 1024:
                return self.send_error_json(413, "完整工程备份过大，无法封装为 PDF")
            try:
                summary = render_project_summary_pdf(archive, backup_bytes)
                body = embed_project_backup(summary, backup_bytes, max_pdf_bytes=MAX_BODY)
            except ProjectPdfError as exc:
                return self.send_error_json(400, str(exc))
            if len(body) > MAX_BODY:
                return self.send_error_json(413, "工程 PDF 超过可导入大小限制")
            self.send_file(body, f"{safe_name}-工程.pdf", "application/pdf")
        else:
            self.send_error_json(400, f"不支持的导出格式: {export_type}")

    def generate_csv_export(self, bundle: dict, kind: str) -> str:
        output = io.StringIO()
        writer = csv.writer(output)

        if "share_view" in bundle:
            fields = [("number", "镜号", "number"), ("title", "标题", "title"), ("chapter", "篇章", "chapter"),
                      ("scene", "场景", "scene"), ("tc_in", "TC IN", "tc"), ("tc_out", "TC OUT", "tc"),
                      ("duration_seconds", "时长(秒)", "duration"), ("duration_frames", "帧数", "duration"),
                      ("shot_size", "景别", "shot_size"), ("lens", "焦段", "lens"), ("movement", "运镜", "movement"),
                      ("angle", "机位角度", "angle"), ("primary_method", "制作方式", "methods"),
                      ("description", "画面描述", "description"), ("voiceover", "旁白", "voiceover"),
                      ("department", "部门", "department"), ("owner", "责任人", "owner"), ("status", "状态", "status"), ("notes", "备注", "notes")]
            visible = set(bundle.get("share_view", {}).get("visible_columns") or [])
            fields = [field for field in fields if field[2] in visible]
            custom = [field for field in bundle.get("custom_fields", []) if f"custom:{field['key']}" in visible]
            writer.writerow([label for _, label, _ in fields] + [field.get("label", field["key"]) for field in custom])
            for shot in bundle.get("shots", []):
                writer.writerow([shot.get(key, "") for key, _, _ in fields] + [(shot.get("custom_fields") or {}).get(field["key"], "") for field in custom])
            return output.getvalue()

        if kind == "shooting_list":
            writer.writerow(["镜号", "场景", "景别", "焦段", "机位/运镜", "画面描述", "制作方式", "责任人", "状态"])
            for s in bundle["shots"]:
                writer.writerow([s["number"], s["scene"], s["shot_size"], s["lens"], s["movement"], s["description"], s["primary_method"], s["owner"], s["status"]])
        elif kind == "stock_list":
            writer.writerow(["镜号", "标题", "制作方式", "画面描述", "旁白", "状态"])
            for s in bundle["shots"]:
                if s["primary_method"] == "STOCK" or "STOCK" in s.get("secondary_methods", []):
                    writer.writerow([s["number"], s["title"], s["primary_method"], s["description"], s["voiceover"], s["status"]])
        elif kind in ("motion_list", "vfx_list"):
            writer.writerow(["镜号", "标题", "制作方式", "画面描述", "责任部门", "责任人", "状态"])
            for s in bundle["shots"]:
                if s["primary_method"] in ("AE", "MG", "3D", "VFX") or any(m in ("AE", "MG", "3D", "VFX") for m in s.get("secondary_methods", [])):
                    writer.writerow([s["number"], s["title"], s["primary_method"], s["description"], s["department"], s["owner"], s["status"]])
        else:
            # Full CSV
            writer.writerow(["镜号", "篇章", "场景", "TC IN", "TC OUT", "时长(秒)", "帧数", "景别", "焦段", "运镜", "制作方式", "画面描述", "旁白", "部门", "状态"])
            for s in bundle["shots"]:
                writer.writerow([
                    s["number"], s["chapter"], s["scene"], s["tc_in"], s["tc_out"],
                    s["duration_seconds"], s["duration_frames"], s["shot_size"], s["lens"], s["movement"],
                    s["primary_method"], s["description"], s["voiceover"], s["department"], s["status"]
                ])

        return output.getvalue()

    def download_share_zip(self, snapshot: dict, db: sqlite3.Connection | None = None):
        p = snapshot["project"]
        safe_name = clean_name(p["name"])
        zip_buf = io.BytesIO()

        with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("project.json", json_dumps(snapshot))
            visible = set(snapshot.get("share_view", {}).get("visible_columns") or [])
            if {"number", "title", "tc", "duration", "methods"} <= visible:
                zf.writestr(f"{safe_name}.edl", generate_cmx3600_edl(snapshot))
            if {"tc", "duration", "voiceover"} <= visible:
                zf.writestr(f"{safe_name}.srt", generate_srt_subtitles(snapshot))
            zf.writestr(f"{safe_name}_shots.csv", self.generate_csv_export(snapshot, "csv").encode("utf-8-sig"))
            if db is not None:
                media_ids = set()
                for shot in snapshot.get("shots", []):
                    for panel in shot.get("panels", []):
                        if panel.get("media_id"):
                            media_ids.add(str(panel["media_id"]))
                    for asset in shot.get("assets", []):
                        if asset.get("id"):
                            media_ids.add(str(asset["id"]))
                for asset_id in media_ids:
                    asset = db.execute("SELECT id, filename, stored_name FROM assets WHERE id=?", (asset_id,)).fetchone()
                    if not asset:
                        continue
                    target = (MEDIA_ROOT / asset["stored_name"]).resolve()
                    if target.exists() and str(target).startswith(str(MEDIA_ROOT)):
                        zf.write(target, f"media/{asset['id']}_{clean_name(asset['filename'])}")

        zip_bytes = zip_buf.getvalue()
        self.send_file(zip_bytes, f"{safe_name}_Package.zip", "application/zip")

    def send_file(self, body: bytes, filename: str, content_type: str):
        self.send_response(200)
        self.security_headers()
        self.send_header("Content-Type", content_type)
        encoded_name = urllib.parse.quote(filename)
        self.send_header("Content-Disposition", f"attachment; filename*=UTF-8''{encoded_name}")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def serve_media(self, db: sqlite3.Connection, filename: str):
        cleaned = clean_name(filename)
        asset = db.execute("SELECT * FROM assets WHERE id=? OR stored_name=?", (cleaned, cleaned)).fetchone()
        if not asset:
            return self.send_error_json(404, "媒体文件不存在")

        requested_version = self.query().get("version", [""])[0].strip()
        version_row = None
        if requested_version:
            version_row = db.execute(
                "SELECT storage_key, mime_type, sha256 FROM asset_versions WHERE asset_id=? AND version_number=?",
                (asset["id"], requested_version),
            ).fetchone()
            if not version_row:
                return self.send_error_json(404, "媒体版本不存在")

        if not self.session(db):
            token = self.query().get("share", [""])[0]
            share = db.execute("SELECT expires_at, revoked_at, password_hash, snapshot_json FROM share_links WHERE token=? AND project_id=?", (token, asset["project_id"])).fetchone() if token else None
            if not share or share["revoked_at"] or (share["expires_at"] and share["expires_at"] < int(time.time())) or (share["password_hash"] and not self.has_share_access(token)):
                return self.send_error_json(403, "媒体访问需要登录或有效的审片链接")
            snapshot = json.loads(share["snapshot_json"])
            shared_media = {str(panel.get("media_id")) for shot in snapshot.get("shots", []) for panel in shot.get("panels", []) if panel.get("media_id")}
            shared_media.update(str(item.get("id")) for shot in snapshot.get("shots", []) for item in shot.get("assets", []) if item.get("id"))
            if asset["id"] not in shared_media:
                return self.send_error_json(403, "该媒体未包含在分享快照中")

        storage_key = version_row["storage_key"] if version_row else asset["stored_name"]
        target = (MEDIA_ROOT / clean_name(storage_key)).resolve()
        if not target.exists() or os.path.commonpath([str(target), str(MEDIA_ROOT.resolve())]) != str(MEDIA_ROOT.resolve()):
            return self.send_error_json(404, "媒体文件不存在")
        mime = version_row["mime_type"] if version_row else asset["mime"]
        sha = str(version_row["sha256"] if version_row else asset["sha256"] or "")
        etag = f'"{sha or f"{target.stat().st_size:x}-{int(target.stat().st_mtime):x}"}"'
        if self.headers.get("If-None-Match") == etag:
            self.send_response(304)
            self.security_headers()
            self.send_header("ETag", etag)
            self.send_header("Cache-Control", "private, max-age=3600, must-revalidate")
            self.end_headers()
            return
        payload = target.read_bytes()
        self.send_response(200)
        self.security_headers()
        self.send_header("Content-Type", mime or "application/octet-stream")
        self.send_header("ETag", etag)
        self.send_header("Cache-Control", "private, max-age=3600, must-revalidate")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def serve_static(self, path: str):
        rel = "index.html" if path in ("/", "") or path.startswith("/share/") else path.lstrip("/")
        target = (STATIC_ROOT / rel).resolve()
        if not target.exists() or not str(target).startswith(str(STATIC_ROOT)):
            target = STATIC_ROOT / "index.html"

        mime, _ = mimetypes.guess_type(target.name)
        if target.name.endswith(".css"):
            mime = "text/css; charset=utf-8"
        elif target.name.endswith(".js"):
            mime = "application/javascript; charset=utf-8"
        elif target.name.endswith(".html"):
            mime = "text/html; charset=utf-8"

        payload = target.read_bytes()
        self.send_response(200)
        self.security_headers()
        self.send_header("Content-Type", mime or "text/plain")
        if target.suffix.lower() == ".woff2":
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        elif target.suffix.lower() in {".html", ".css", ".js"}:
            self.send_header("Cache-Control", "no-cache")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


def clean_name(value: str) -> str:
    value = re.sub(r"[\\/:*?\"<>|\x00-\x1f]", "_", value).strip(" .")
    return value[:160] or "file"


def media_signature_matches(mime: str, payload: bytes) -> bool:
    """Reject HTML/SVG/polyglot uploads before they enter private media storage."""
    if mime == "image/jpeg":
        return payload[:3] == b"\xff\xd8\xff"
    if mime == "image/png":
        return payload[:8] == b"\x89PNG\r\n\x1a\n"
    if mime == "image/gif":
        return payload[:6] in (b"GIF87a", b"GIF89a")
    if mime == "image/webp":
        return payload[:4] == b"RIFF" and payload[8:12] == b"WEBP"
    if mime in {"video/mp4", "video/quicktime"}:
        return len(payload) >= 12 and payload[4:8] == b"ftyp"
    if mime == "video/webm":
        return payload[:4] == b"\x1a\x45\xdf\xa3"
    return False


def run_server(port: int = 8080):
    init_db()
    bind = os.environ.get("STORYBOARD_BIND", "0.0.0.0")
    httpd = ThreadingHTTPServer((bind, port), AppHandler)
    maintenance_stop = threading.Event()
    maintenance_thread = threading.Thread(target=maintenance_loop, args=(maintenance_stop,), daemon=True)
    maintenance_thread.start()
    print(f"[FrameForge V3.0] Production server listening on http://{bind}:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
    finally:
        maintenance_stop.set()
        maintenance_thread.join(timeout=5)
        httpd.server_close()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8080"))
    run_server(port)
