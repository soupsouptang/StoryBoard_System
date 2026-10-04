"""Batch shot update command for the collaborative project shots route.

The HTTP handler owns authentication, transaction boundaries and response
formatting. This module owns the complete batch mutation and audit sequence.
"""
from __future__ import annotations

from dataclasses import dataclass
import json
import sqlite3
import uuid
from typing import Callable


@dataclass(frozen=True)
class BulkShotConflict(Exception):
    payload: dict


class BulkShotError(ValueError):
    pass


def update_bulk_shots(
    db: sqlite3.Connection,
    pid: str,
    data: dict,
    session: dict,
    at: str,
    *,
    shot_to_dict: Callable,
    normalize_rich_text: Callable,
    normalize_drawing_json: Callable,
    record_review_decision: Callable,
    renumber_project_shots: Callable,
    touch_project: Callable,
    create_project_snapshot: Callable,
    audit: Callable,
) -> None:
    s = session
    if not isinstance(data, dict):
        raise BulkShotError("镜头数据格式不正确")
    shots_list = data.get("shots", [])
    if not isinstance(shots_list, list) or len(shots_list) > 10000:
        raise BulkShotError("镜头数据列表格式不正确")

    allowed = [
        "number", "title", "chapter", "scene", "description", "action", "performance",
        "composition", "director_notes", "notes", "duration_frames", "locked",
        "shot_size", "lens", "lens_source", "angle", "height", "movement", "equipment", "sensor",
        "aperture", "shutter", "voiceover", "dialogue", "subtitle", "music", "sound",
        "primary_method", "secondary_methods", "department", "owner", "status",
        "transition", "method_data_json", "import_columns_json", "is_deleted", "panel_frame", "camera_fps",
        "rich_text_json", "script_character", "script_parenthetical", "script_scene_type", "script_time_of_day"
    ]
    conflict_markers = {"custom_fields", "panels"}
    cf_defs = {r["key"]: r["id"] for r in db.execute("SELECT id, key FROM custom_field_definitions WHERE project_id=?", (pid,))}
    needs_renumber = False
    did_mutate = False

    for pos, item in enumerate(shots_list):
        if not isinstance(item, dict):
            raise BulkShotError("镜头数据项格式不正确")
        sid = str(item.get("id", ""))
        if not sid:
            continue
        cur = db.execute("SELECT * FROM shots WHERE id=? AND project_id=?", (sid, pid)).fetchone()
        if not cur:
            continue

        cur_rev = int(cur["revision"]) if "revision" in cur.keys() else 1
        previous_status = str(cur["status"] or "")
        base_rev = item.get("base_revision")
        if base_rev is not None:
            if isinstance(base_rev, bool) or not str(base_rev).isdigit() or int(base_rev) < 1:
                raise BulkShotError("镜头基础版本格式不正确")
            base_rev = int(base_rev)
            if base_rev > cur_rev:
                raise BulkShotError("镜头基础版本超过当前版本")

        has_changed_fields = "changed_fields" in item
        requested_changes = item.get("changed_fields")
        if has_changed_fields:
            if not isinstance(requested_changes, list) or any(
                not isinstance(field, str)
                or field not in allowed and field not in conflict_markers
                or field not in item
                for field in requested_changes
            ) or len(requested_changes) != len(set(requested_changes)):
                raise BulkShotError("镜头变更字段必须是带值且不重复的可编辑字段列表")
            requested = requested_changes
        else:
            requested = [key for key in allowed if key in item]
            if isinstance(item.get("custom_fields"), dict):
                requested.append("custom_fields")
            if isinstance(item.get("panels"), list):
                requested.append("panels")

        # Collaboration patches do not carry order. Legacy full saves and
        # explicit restores may update positions and display numbers.
        restore_order = not has_changed_fields or data.get("restore_order") is True
        if not restore_order:
            requested = [key for key in requested if key != "number"]

        normalized = {}
        changed_keys = []
        for key in requested:
            if key not in allowed:
                continue
            val = item[key]
            try:
                if key == "duration_frames":
                    val = max(1, min(int(val), 10_000_000))
                elif key in ("locked", "is_deleted"):
                    val = 1 if val else 0
                elif key == "secondary_methods":
                    val = json.dumps(val if isinstance(val, list) else [])
                elif key == "method_data_json":
                    val = json.dumps(val if isinstance(val, dict) else {})
                elif key == "import_columns_json":
                    val = json.dumps(val if isinstance(val, dict) else {})
                elif key == "rich_text_json":
                    effective = {**dict(cur), **{field: item[field] for field in requested if field in allowed and field in item}}
                    val = json.dumps(normalize_rich_text(val, effective), ensure_ascii=False)
                else:
                    val = str(val or "")[:10000]
            except (TypeError, ValueError, OverflowError) as error:
                raise BulkShotError(f"{key} 格式不正确") from error
            if val != cur[key]:
                normalized[key] = val
                changed_keys.append(key)

        custom_updates = []
        if "custom_fields" in requested:
            if not isinstance(item["custom_fields"], dict):
                raise BulkShotError("自定义字段格式不正确")
            for cf_k, cf_v in item["custom_fields"].items():
                cf_id = cf_defs.get(cf_k)
                if not cf_id:
                    continue
                val_t = str(cf_v) if not isinstance(cf_v, (dict, list)) else None
                val_j = json.dumps(cf_v) if isinstance(cf_v, (dict, list)) else None
                stored = db.execute(
                    "SELECT value_text, value_json FROM shot_custom_field_values WHERE shot_id=? AND field_definition_id=?",
                    (sid, cf_id),
                ).fetchone()
                if stored is None or stored["value_text"] != val_t or stored["value_json"] != val_j:
                    custom_updates.append((cf_id, val_t, val_j))
            if custom_updates:
                changed_keys.append("custom_fields")

        panel_updates = []
        if "panels" in requested:
            if not isinstance(item["panels"], list):
                raise BulkShotError("Panel 数据格式不正确")
            for p_data in item["panels"]:
                if not isinstance(p_data, dict):
                    raise BulkShotError("Panel 数据项格式不正确")
                pid_val = p_data.get("id")
                if not pid_val:
                    continue
                media = p_data.get("media_id")
                if media and not db.execute("SELECT 1 FROM assets WHERE id=? AND project_id=?", (media, pid)).fetchone():
                    raise BulkShotError("Panel 媒体不存在或不属于当前项目")
                stored = db.execute("SELECT * FROM panels WHERE id=? AND shot_id=?", (pid_val, sid)).fetchone()
                if not stored:
                    continue
                try:
                    duration = int(p_data.get("duration_frames", 75))
                    drawing = normalize_drawing_json(p_data["drawing_json"]) if "drawing_json" in p_data else None
                except (TypeError, ValueError, OverflowError) as error:
                    raise BulkShotError("Panel 数据项格式不正确") from error
                if ("label" in p_data and stored["label"] != str(p_data["label"])
                    or "duration_frames" in p_data and stored["duration_frames"] != duration
                    or "notes" in p_data and stored["notes"] != str(p_data["notes"])
                    or drawing is not None and stored["drawing_json"] != drawing
                    or "media_id" in p_data and stored["media_id"] != media):
                    panel_updates.append(p_data)
            if panel_updates:
                changed_keys.append("panels")

        position_changed = restore_order and cur["position"] != pos
        if position_changed:
            changed_keys.append("position")
        if not changed_keys:
            continue

        if base_rev is not None and base_rev < cur_rev:
            ev_rows = db.execute("SELECT changed_fields_json FROM shot_change_events WHERE shot_id=? AND revision>?", (sid, base_rev)).fetchall()
            server_changed = set()
            for er in ev_rows:
                try:
                    server_changed.update(json.loads(er["changed_fields_json"]))
                except Exception:
                    pass
            conflict_keys = sorted(server_changed.intersection(changed_keys))
            if conflict_keys:
                raise BulkShotConflict({
                    "conflict": True, "shot_id": sid, "shot_number": cur["number"],
                    "conflicting_fields": conflict_keys, "server_version": shot_to_dict(cur),
                    "your_version": item,
                })

        did_mutate = True
        new_rev = cur_rev + 1
        if position_changed or any(key in changed_keys for key in ("number", "is_deleted")):
            needs_renumber = True
        assignments = [f"{key}=?" for key in normalized]
        vals = list(normalized.values())
        if position_changed:
            assignments.insert(0, "position=?")
            vals.insert(0, pos)
        assignments.extend(("revision=?", "updated_at=?"))
        db.execute(
            f"UPDATE shots SET {','.join(assignments)} WHERE id=?",
            (*vals, new_rev, at, sid),
        )
        if "is_deleted" in normalized:
            db.execute("UPDATE shots SET deleted_at=? WHERE id=? AND project_id=?",
                       (at if normalized["is_deleted"] else None, sid, pid))
        if "status" in normalized:
            version_id = item.get("version_id")
            try:
                record_review_decision(db, sid, (str(version_id).strip() if version_id is not None else None) or None,
                                       previous_status, str(normalized["status"] or ""), s["username"], at)
            except ValueError as error:
                raise BulkShotError(str(error)) from error

        db.execute("""
            INSERT INTO shot_change_events (id, shot_id, revision, changed_fields_json, user_id, user_name, created_at)
            VALUES (?,?,?,?,?,?,?)
        """, (str(uuid.uuid4()), sid, new_rev, json.dumps(changed_keys),
              s["user_id"], s["display_name"] or s["username"], at))

        for cf_id, val_t, val_j in custom_updates:
            db.execute("""
                INSERT INTO shot_custom_field_values (id, shot_id, field_definition_id, value_text, value_json, updated_at)
                VALUES (?,?,?,?,?,?)
                ON CONFLICT(shot_id, field_definition_id) DO UPDATE SET
                    value_text=excluded.value_text, value_json=excluded.value_json, updated_at=excluded.updated_at
            """, (str(uuid.uuid4()), sid, cf_id, val_t, val_j, at))

        for p_data in panel_updates:
            pid_val = p_data["id"]
            media = p_data.get("media_id")
            panel_values = []
            panel_sets = []
            for key in ("label", "duration_frames"):
                if key in p_data:
                    panel_sets.append(f"{key}=?")
                    panel_values.append(str(p_data[key]) if key == "label" else int(p_data[key]))
            if "drawing_json" in p_data:
                panel_sets.append("drawing_json=?")
                panel_values.append(normalize_drawing_json(p_data.get("drawing_json", {})))
            if "notes" in p_data:
                panel_sets.append("notes=?")
                panel_values.append(str(p_data["notes"]))
            if "media_id" in p_data:
                panel_sets.append("media_id=?")
                panel_values.append(media)
            panel_sets.append("updated_at=?")
            panel_values.extend([at, pid_val, sid])
            db.execute(f"UPDATE panels SET {', '.join(panel_sets)} WHERE id=? AND shot_id=?", panel_values)

    if not did_mutate:
        return
    if needs_renumber:
        renumber_project_shots(db, pid, at)
    touch_project(db, pid, s, at)
    create_project_snapshot(db, pid, s["username"], "自动保存")
    audit(db, s["username"], "bulk_update_shots", pid, f"{len(shots_list)} shots")
