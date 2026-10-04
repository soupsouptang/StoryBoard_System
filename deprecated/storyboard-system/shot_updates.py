"""Single-shot update command and its SQLite write contract.

The caller owns the transaction, authentication, review decisions and audit.
This module owns the shot mutation, field-aware conflict check and change event.
"""

from dataclasses import dataclass
import json
import sqlite3
import uuid


VERSION_RESTORE_FIELDS = (
    "title", "chapter", "scene", "panel_frame", "description", "action", "performance",
    "composition", "director_notes", "notes", "duration_frames", "locked", "shot_size",
    "lens", "lens_source", "angle", "height", "movement", "equipment", "sensor", "aperture", "shutter",
    "camera_fps", "voiceover", "dialogue", "subtitle", "music", "sound", "primary_method",
    "secondary_methods", "department", "owner", "status", "transition", "method_data_json",
    "import_columns_json", "rich_text_json", "script_character", "script_parenthetical", "script_scene_type", "script_time_of_day",
)


class ShotNotFound(LookupError):
    pass


class ShotUpdateError(ValueError):
    pass


@dataclass(frozen=True)
class ShotConflict(Exception):
    current: sqlite3.Row
    fields: list[str]


@dataclass(frozen=True)
class ShotUpdateResult:
    project_id: str
    current: sqlite3.Row
    updated: sqlite3.Row
    previous_status: str
    requested_version_id: str | None
    changed_fields: list[str]


def update_single_shot(
    db: sqlite3.Connection,
    shot_id: str,
    data: dict,
    *,
    actor_id: str,
    actor_name: str,
    at: str,
) -> ShotUpdateResult:
    """Apply one legacy shot update inside the caller's transaction.

    Unrelated stale fields can merge; overlapping fields return a conflict.
    Unlisted payload fields are ignored; explicitly listed fields must be editable and present.
    """
    current = db.execute("SELECT * FROM shots WHERE id=?", (shot_id,)).fetchone()
    if current is None:
        raise ShotNotFound(shot_id)

    current_revision = int(current["revision"]) if "revision" in current.keys() else 1
    base_revision = data.get("base_revision")
    if base_revision is not None:
        if isinstance(base_revision, bool) or not str(base_revision).isdigit() or int(base_revision) < 1:
            raise ShotUpdateError("base_revision 必须为正整数")
        base_revision = int(base_revision)
        if base_revision > current_revision:
            raise ShotUpdateError("base_revision 超过当前镜头版本")

    if "changed_fields" in data:
        requested = data["changed_fields"]
        if not isinstance(requested, list) or any(
            not isinstance(key, str) or key not in VERSION_RESTORE_FIELDS or key not in data
            for key in requested
        ) or len(requested) != len(set(requested)):
            raise ShotUpdateError("changed_fields 必须是带值且不重复的可编辑字段列表")
    else:
        requested = [key for key in data if key in VERSION_RESTORE_FIELDS]

    assignments = []
    values = []
    changed_fields = []
    for key in requested:
        value = data[key]
        if key == "locked":
            value = 1 if value else 0
        elif key == "duration_frames":
            try:
                value = max(1, int(value))
            except (TypeError, ValueError, OverflowError):
                raise ShotUpdateError("duration_frames 必须为整数")
        elif key in ("secondary_methods", "method_data_json", "import_columns_json", "rich_text_json") and isinstance(value, (list, dict)):
            value = json.dumps(value)
        if value != current[key]:
            assignments.append(f"{key}=?")
            values.append(value)
            changed_fields.append(key)

    if base_revision is not None and base_revision < current_revision and changed_fields:
        rows = db.execute(
            "SELECT changed_fields_json FROM shot_change_events WHERE shot_id=? AND revision>?",
            (shot_id, base_revision),
        ).fetchall()
        server_changed = set()
        for row in rows:
            try:
                server_changed.update(json.loads(row["changed_fields_json"]))
            except Exception:
                pass
        overlapping = server_changed.intersection(changed_fields)
        if overlapping:
            raise ShotConflict(current, sorted(overlapping))

    if changed_fields:
        new_revision = current_revision + 1
        db.execute(
            f"UPDATE shots SET {','.join(assignments)}, revision=?, updated_at=? WHERE id=?",
            (*values, new_revision, at, shot_id),
        )
        db.execute(
            """INSERT INTO shot_change_events
               (id, shot_id, revision, changed_fields_json, user_id, user_name, created_at)
               VALUES (?,?,?,?,?,?,?)""",
            (str(uuid.uuid4()), shot_id, new_revision, json.dumps(changed_fields), actor_id, actor_name, at),
        )
    updated = db.execute("SELECT * FROM shots WHERE id=?", (shot_id,)).fetchone()
    version_id = data.get("version_id")
    return ShotUpdateResult(
        project_id=current["project_id"],
        current=current,
        updated=updated,
        previous_status=str(current["status"] or ""),
        requested_version_id=(str(version_id).strip() if version_id is not None else None) or None,
        changed_fields=changed_fields,
    )
