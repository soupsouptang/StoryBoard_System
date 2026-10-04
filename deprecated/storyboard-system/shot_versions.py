"""Shot review decisions, compact snapshots, and version restoration."""

from __future__ import annotations

import json
import sqlite3
import uuid

from persistence_helpers import audit, insert_record, touch_project
from runtime_clock import now_iso
from shot_updates import VERSION_RESTORE_FIELDS


def record_review_decision(db: sqlite3.Connection, shot_id: str, version_id: str | None, previous: str, next_status: str, username: str, at: str) -> None:
    if version_id and not db.execute(
        "SELECT 1 FROM shot_versions WHERE id=? AND shot_id=?", (version_id, shot_id)
    ).fetchone():
        raise ValueError("版本不存在或不属于当前镜头")
    labels = {"Ready for Review": "提交意见", "Draft": "撤回意见", "Approved": "同意意见", "Changes Requested": "驳回意见"}
    db.execute(
        "INSERT INTO review_decisions (id, shot_id, version_id, previous_status, next_status, action_label, created_by, created_at) VALUES (?,?,?,?,?,?,?,?)",
        (str(uuid.uuid4()), shot_id, version_id, previous, next_status, labels.get(next_status, next_status), username, at),
    )


def complete_shot_snapshot(db: sqlite3.Connection, shot_id: str, bundle_loader) -> tuple[dict | None, str | None]:
    row = db.execute("SELECT project_id FROM shots WHERE id=? AND is_deleted=0", (shot_id,)).fetchone()
    if not row:
        return None, None
    bundle = bundle_loader(db, row["project_id"])
    shot = next((item for item in (bundle or {}).get("shots", []) if item["id"] == shot_id), None)
    if shot:
        shot = {key: value for key, value in shot.items() if key not in {"versions", "review_history", "history", "snapshots", "change_count", "last_change_at"}}
        shot["assets"] = [{key: value for key, value in asset.items() if key not in {"versions", "history", "snapshots"}} for asset in shot.get("assets", [])]
    return shot, row["project_id"]


def apply_shot_version_snapshot(db: sqlite3.Connection, shot_id: str, snapshot: dict, session: sqlite3.Row, action: str) -> str:
    current = db.execute("SELECT * FROM shots WHERE id=? AND is_deleted=0", (shot_id,)).fetchone()
    if not current:
        raise ValueError("镜头不存在")
    at = now_iso()
    assignments = []
    values = []
    changed = []
    for field in VERSION_RESTORE_FIELDS:
        if field not in snapshot or field not in current.keys():
            continue
        value = snapshot[field]
        if field in ("locked",):
            value = 1 if value else 0
        elif field == "duration_frames":
            value = max(1, int(value or 1))
        elif field in ("secondary_methods", "method_data_json") and isinstance(value, (list, dict)):
            value = json.dumps(value, ensure_ascii=False)
        elif field in ("import_columns_json", "rich_text_json") and isinstance(value, dict):
            value = json.dumps(value, ensure_ascii=False)
        if str(current[field] or "") != str(value or ""):
            changed.append(field)
        assignments.append(f"{field}=?")
        values.append(value)
    revision = int(current["revision"] or 1) + 1
    if assignments:
        db.execute(
            f"UPDATE shots SET {','.join(assignments)}, revision=?, updated_at=? WHERE id=?",
            (*values, revision, at, shot_id),
        )
    custom_values = snapshot.get("custom_fields")
    if isinstance(custom_values, dict):
        definitions = {row["key"]: row["id"] for row in db.execute(
            "SELECT id, key FROM custom_field_definitions WHERE project_id=? AND is_active=1",
            (current["project_id"],),
        )}
        for key, value in custom_values.items():
            definition_id = definitions.get(key)
            if not definition_id:
                continue
            value_text = str(value) if not isinstance(value, (dict, list)) else None
            value_json = json.dumps(value, ensure_ascii=False) if isinstance(value, (dict, list)) else None
            db.execute("""
                INSERT INTO shot_custom_field_values (id, shot_id, field_definition_id, value_text, value_json, updated_at)
                VALUES (?,?,?,?,?,?)
                ON CONFLICT(shot_id, field_definition_id) DO UPDATE SET value_text=excluded.value_text, value_json=excluded.value_json, updated_at=excluded.updated_at
            """, (str(uuid.uuid4()), shot_id, definition_id, value_text, value_json, at))
            changed.append(f"custom:{key}")
    if isinstance(snapshot.get("panels"), list):
        restored_panels = []
        for position, panel in enumerate(snapshot["panels"]):
            if not isinstance(panel, dict):
                raise ValueError("版本 Panel 格式无效")
            media = panel.get("media_id")
            if media and not db.execute("SELECT 1 FROM assets WHERE id=? AND project_id=?", (media, current["project_id"])).fetchone():
                raise ValueError("版本媒体缺失或归属错误；未回滚")
            panel_id = str(panel.get("id") or uuid.uuid4())
            owner = db.execute("SELECT shot_id FROM panels WHERE id=?", (panel_id,)).fetchone()
            if owner and owner["shot_id"] != shot_id:
                raise ValueError("版本 Panel 不属于当前镜头")
            restored_panels.append({**panel, "id": panel_id, "shot_id": shot_id, "position": position,
                                    "created_at": panel.get("created_at", at), "updated_at": at})
        db.execute("DELETE FROM panels WHERE shot_id=?", (shot_id,))
        for panel in restored_panels:
            insert_record(db, "panels", panel)
        changed.append("panels")
    touch_project(db, current["project_id"], session, at)
    if changed:
        db.execute("""
            INSERT INTO shot_change_events (id, shot_id, revision, changed_fields_json, user_id, user_name, created_at)
            VALUES (?,?,?,?,?,?,?)
        """, (str(uuid.uuid4()), shot_id, revision, json.dumps(sorted(set(changed))), session["user_id"], session["display_name"] or session["username"], at))
    audit(db, session["username"], action, shot_id, f"{len(set(changed))} fields")
    return current["project_id"]
