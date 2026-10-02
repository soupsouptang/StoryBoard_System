"""Business-field and split-line comparison, independent of persistence."""
from __future__ import annotations

from difflib import SequenceMatcher
import json

LABELS = {
    "name": "标题", "description": "画面描述", "voice_over": "对应旁白",
    "duration_frames": "时长 / 帧数", "display_number": "编号",
    "asset_id": "画面素材", "label": "列名称", "value": "单元格值",
    "body": "批注正文", "is_resolved": "已解决", "deleted_at": "删除状态",
    "lens_mm": "焦段", "camera_movement": "运镜", "camera_angle": "机位角度",
    "sort_index": "排序", "config": "视图配置", "hash_sha256": "文件摘要",
}
SECTION_LABELS = {
    "production": "项目", "sequences": "篇章", "scenes": "场景", "shots": "镜头",
    "panels": "分镜画面", "steps": "制作步骤", "columns": "列定义", "values": "列值",
    "assets": "素材", "asset_versions": "素材版本", "asset_links": "素材关联",
    "asset_requests": "素材请求", "comments": "批注", "approvals": "审核",
    "review_decisions": "审阅决定", "views": "共享视图", "row_layouts": "行高",
    "column_preferences": "列显示设置",
}


def _text(value) -> str:
    return value if isinstance(value, str) else json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2)


def split_lines(before, after, context: int = 3) -> list[dict]:
    left, right = _text(before).splitlines(), _text(after).splitlines()
    output = []
    for tag, i, j, a, b in SequenceMatcher(None, left, right, autojunk=False).get_opcodes():
        if tag == "equal":
            indexes = list(range(j - i))
            if len(indexes) > context * 2:
                indexes = indexes[:context] + [None] + indexes[-context:] if context else [None]
            for offset in indexes:
                if offset is None:
                    output.append({"kind": "fold", "unchanged_lines": j - i - context * 2})
                else:
                    output.append({"kind": "equal", "left_line": i + offset + 1, "right_line": a + offset + 1,
                        "before": left[i + offset], "after": right[a + offset]})
        else:
            for offset in range(max(j - i, b - a)):
                output.append({"kind": tag,
                    "left_line": i + offset + 1 if i + offset < j else None,
                    "right_line": a + offset + 1 if a + offset < b else None,
                    "before": left[i + offset] if i + offset < j else None,
                    "after": right[a + offset] if a + offset < b else None})
    return output


def compare_snapshots(before: dict, after: dict, shot_id: str | None = None) -> dict:
    left, right = before["sections"], after["sections"]
    changes = []
    unchanged = 0
    related_columns, related_assets, related_sequences, related_scenes, related_views = set(), set(), set(), set(), set()
    if shot_id:
        for sections in (left, right):
            shot = sections.get("shots", {}).get(shot_id, {})
            related_sequences.add(shot.get("sequence_id"))
            related_scenes.add(shot.get("scene_id"))
            for row in sections.get("values", {}).values():
                if row.get("shot_id") == shot_id:
                    related_columns.add(row.get("column_id"))
            for section in ("panels", "steps", "asset_links", "comments"):
                for row in sections.get(section, {}).values():
                    if row.get("shot_id") == shot_id:
                        related_assets.update(row.get(key) for key in ("asset_id", "input_asset_id", "output_asset_id"))
            for row in sections.get("row_layouts", {}).values():
                if row.get("shot_id") == shot_id:
                    related_views.add(row.get("saved_view_id"))
    for section in sorted(set(left) | set(right)):
        for identity in sorted(set(left.get(section, {})) | set(right.get(section, {}))):
            old = left.get(section, {}).get(identity)
            new = right.get(section, {}).get(identity)
            rows = [row for row in (old, new) if row is not None]
            if shot_id:
                scoped = (section == "shots" and identity == shot_id or
                    any(row.get("shot_id") == shot_id for row in rows) or
                    section == "columns" and identity in related_columns or
                    section == "assets" and identity in related_assets or
                    section == "asset_versions" and any(row.get("asset_id") in related_assets for row in rows) or
                    section == "sequences" and identity in related_sequences or
                    section == "scenes" and identity in related_scenes or
                    section == "views" and identity in related_views)
                if not scoped:
                    continue
            if old == new:
                unchanged += 1
                continue
            if old is None or new is None:
                changes.append({"section": section, "section_label": SECTION_LABELS.get(section, section),
                    "entity_id": identity, "field": None, "label": "新增" if old is None else "删除",
                    "kind": "insert" if old is None else "delete", "before": old, "after": new,
                    "lines": split_lines(old, new)})
            else:
                for field in sorted(set(old) | set(new)):
                    if old.get(field) != new.get(field):
                        changes.append({"section": section, "section_label": SECTION_LABELS.get(section, section),
                            "entity_id": identity, "field": field, "label": LABELS.get(field, field),
                            "kind": "replace", "before": old.get(field), "after": new.get(field),
                            "lines": split_lines(old.get(field), new.get(field))})
    return {"shot_id": shot_id, "changed_count": len(changes), "unchanged_entities": unchanged, "changes": changes}
