"""Official catalog; project instances and their values have separate identities."""
BUILTIN_KEYS = frozenset({"display_number", "panel_image", "tc_in", "duration_frames", "name", "sequence_id", "description", "primary_method", "status"})
BUILTIN_BINDINGS = {
    "display_number": ("镜号", "entity", "shot.display_number", "text"),
    "tc_in": ("时码 TC", "derived", "timecode.tc_in", "timecode"),
    "panel_image": ("分镜画面", "derived", "panel.assets", "media"),
    "name": ("镜头标题", "entity", "shot.name", "text"),
    "description": ("画面描述", "entity", "shot.description", "textarea"),
    "voice_over": ("对应旁白", "entity", "shot.voice_over", "textarea"),
    "performance": ("表演提示", "entity", "shot.performance", "textarea"),
    "dialogue": ("对白", "entity", "shot.dialogue", "textarea"),
    "action": ("动作", "entity", "shot.action", "textarea"),
    "duration_frames": ("时长", "entity", "shot.duration_frames", "number"),
    "lens_mm": ("焦段", "entity", "shot.lens_mm", "number"),
    "sequence_id": ("篇章", "entity", "shot.sequence_id", "select"),
    "owner_id": ("负责人", "entity", "shot.owner_id", "text"),
    "primary_method": ("制作方式", "entity", "shot.production_methods", "multiselect"),
    "status": ("状态", "entity", "shot.status", "select"),
    "department": ("责任部门", "entity", "shot.department", "select"),
    "shot_size": ("景别", "entity", "shot.shot_size", "select"),
    "camera_angle": ("机位角度", "entity", "shot.camera_angle", "select"),
    "camera_movement": ("运镜", "entity", "shot.camera_movement", "json"),
    **{key: (label, "pending", None, "text") for key, label in (
        ("shot_reference", "镜头"), ("location", "场景/地点"), ("int_ext", "内外景"),
        ("day_night", "日夜"), ("dialogue_character", "对白角色"), ("edit_transition", "剪辑/转场"),
        ("notes", "备注"), ("feasibility", "可行性"), ("replacement", "建议替换内容"),
        ("execution_method", "执行方式"),
    )},
}
PRESET_KEYS = frozenset(BUILTIN_BINDINGS) - BUILTIN_KEYS


def column_class(key):
    return "builtin" if key in BUILTIN_KEYS else "preset"


def builtin_definitions(production_id, user_id):
    from app.models.field import ProjectColumn
    return [ProjectColumn(production_id=production_id, key="builtin:" + key, label=label,
        column_class="builtin", origin="builtin", binding_kind=kind, binding_key=binding,
        field_type=field_type, group_name="Builtin", created_by=user_id)
        for key, (label, kind, binding, field_type) in BUILTIN_BINDINGS.items() if key in BUILTIN_KEYS]
