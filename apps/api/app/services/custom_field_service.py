"""Canonical custom-field lifecycle.

The irreversible invariant is deliberate: a purged column keeps an immutable
definition/preference tombstone. Old Saved Views, browser caches or import
mappings may still mention the key, but they cannot recreate the field.
"""
from __future__ import annotations

import re
import uuid
import copy
import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, DomainError, NotFoundError
from app.models.collaboration import AuditLog
from app.models.field import ColumnPreference, ProjectColumn, ShotColumnValue
from app.models.production import Production, Sequence
from app.models.shot import Shot
from app.models.user import User
from app.models.view import SavedView
from app.services.column_lifecycle import sanitize_saved_view_config
from app.services.column_catalog import BUILTIN_BINDINGS, column_class
from app.schemas.custom_field import (
    CustomFieldCreate,
    CustomFieldPurgeRequest,
    CustomFieldStateUpdate,
    CustomFieldUpdate,
    CustomFieldValuePatch,
    CustomFieldInsert,
    ColumnCopyRequest,
    BuiltinColumnStateUpdate,
)


class CustomFieldService:
    FIELD_TYPES = {"text", "textarea", "number", "boolean", "date", "url", "select", "multiselect", "json"}
    COLUMN_STATES = {"visible", "hidden", "removed"}
    PROTECTED_LABELS = {"镜号", "时码", "时码 TC", "分镜画面"}
    RETIRED_LABELS = {"原镜号", "原描述", "分镜图框", "机位/运镜"}
    # Explicit allowlist: column clipboard input must never expose arbitrary Shot attributes.
    COPY_COLUMNS = {
        "name": "text", "description": "textarea", "voice_over": "textarea",
        "performance": "textarea", "dialogue": "textarea", "action": "textarea",
        "duration_frames": "number", "lens_mm": "number", "sequence_id": "select",
        "owner_id": "text", "primary_method": "multiselect", "status": "select",
        "department": "select", "shot_size": "select", "camera_angle": "select",
        "camera_movement": "json",
        **{key: "text" for key in ("shot_reference", "location", "int_ext", "day_night",
            "dialogue_character", "edit_transition", "notes", "feasibility", "replacement", "execution_method")},
    }

    @staticmethod
    async def builtin_states(db: AsyncSession, production_id: str) -> list[dict]:
        await CustomFieldService._production(db, production_id)
        rows = await db.execute(select(ProjectColumn).where(
            ProjectColumn.production_id == production_id, ProjectColumn.column_class.in_(["builtin", "preset"])))
        return [{'column_key': row.key.removeprefix('builtin:'), 'state': 'visible' if row.state == 'active' else 'removed',
                 'revision': row.revision, 'column_id': row.id, 'column_class': row.column_class} for row in rows.scalars()]

    @staticmethod
    async def set_builtin_state(db: AsyncSession, production_id: str, column_key: str, req: BuiltinColumnStateUpdate, user: User) -> dict:
        CustomFieldService._require_write(user)
        if column_key not in {*CustomFieldService.COPY_COLUMNS, 'display_number', 'tc_in', 'panel_image'}:
            raise DomainError('该列不可操作', code='INVALID_COLUMN_KEY')
        await CustomFieldService._production(db, production_id, for_update=True)
        column = (await db.execute(select(ProjectColumn).where(
            ProjectColumn.production_id == production_id, ProjectColumn.key == "builtin:" + column_key,
        ).with_for_update())).scalar_one_or_none()
        revision = column.revision if column else 0
        if revision != req.revision:
            raise ConflictError(message='列状态已修改，请刷新后重试。', details={'server_revision': revision})
        if column and column.state == "purged":
            raise DomainError('永久删除的列不可恢复', code='FIELD_PERMANENTLY_DELETED')
        state = "trashed" if req.state == "removed" else "active"
        now = datetime.now(timezone.utc)
        if not column:
            label, kind, binding, field_type = BUILTIN_BINDINGS[column_key]
            column = ProjectColumn(production_id=production_id, key="builtin:" + column_key, label=label,
                origin=column_class(column_key), column_class=column_class(column_key), binding_kind=kind, binding_key=binding, field_type=field_type,
                group_name="Builtin", state=state, deleted_at=now if state == "trashed" else None,
                created_by=user.id, revision=1)
            db.add(column)
        elif column.state != state:
            column.state = state
            column.deleted_at = now if state == "trashed" else None
            column.revision += 1
            column.updated_at = now
        else:
            return {'column_key': column_key, 'state': req.state, 'revision': column.revision}
        await db.flush()
        CustomFieldService._audit(db, user_id=user.id, action='column.delete' if req.state == 'removed' else 'column.restore',
            field_id=column.id, production_id=production_id, metadata={'state': req.state, 'revision': column.revision})
        await db.flush()
        return {'column_key': column_key, 'state': req.state, 'revision': column.revision}

    @staticmethod
    def _retired_label(label: str) -> bool:
        heading = re.sub(r"^原始列\s*[·.]\s*", "", label.strip())
        return re.sub(r"\s*\(\d+\)$", "", heading) in CustomFieldService.RETIRED_LABELS

    @staticmethod
    def _has_permission(user: User, permission: str) -> bool:
        permissions = getattr(getattr(user, "role", None), "permissions", None) or {}
        return bool(permissions.get("*") or permissions.get(permission))

    @staticmethod
    def _require_write(user: User) -> None:
        if not CustomFieldService._has_permission(user, "shot.write"):
            raise DomainError("当前账号没有修改自定义列的权限", code="FORBIDDEN")

    @staticmethod
    async def _production(
        db: AsyncSession,
        production_id: str,
        *,
        for_update: bool = False,
    ) -> Production:
        query = select(Production).where(
            Production.id == production_id,
            Production.deleted_at.is_(None),
        )
        if for_update:
            query = query.with_for_update()
        result = await db.execute(query)
        production = result.scalar_one_or_none()
        if not production:
            raise NotFoundError("项目不存在")
        return production

    @staticmethod
    async def _field(
        db: AsyncSession,
        production_id: str,
        field_id: str,
        *,
        for_update: bool = False,
        include_purged: bool = False,
    ) -> ProjectColumn:
        query = select(ProjectColumn).where(
            ProjectColumn.id == field_id,
            ProjectColumn.production_id == production_id,
            ProjectColumn.binding_kind == "custom",
        )
        if not include_purged:
            query = query.where(ProjectColumn.state != "purged")
        if for_update:
            query = query.with_for_update()

        result = await db.execute(query)
        field = result.scalar_one_or_none()
        if not field:
            raise NotFoundError("自定义列不存在")
        return field

    @staticmethod
    async def _preference(
        db: AsyncSession,
        production_id: str,
        column_key: str,
        *,
        for_update: bool = False,
    ) -> ColumnPreference | None:
        query = select(ColumnPreference).where(
            ColumnPreference.production_id == production_id,
            ColumnPreference.column_key == column_key,
        )
        if for_update:
            query = query.with_for_update()
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    def _column_key(field: ProjectColumn) -> str:
        return f"custom:{field.key}" if field.binding_kind == "custom" else field.key.removeprefix("builtin:")

    @staticmethod
    async def column_catalog(db: AsyncSession, production_id: str) -> list[dict]:
        await CustomFieldService._production(db, production_id)
        fields = list((await db.execute(select(ProjectColumn).where(
            ProjectColumn.production_id == production_id, ProjectColumn.state != "purged"))).scalars())
        instances = {CustomFieldService._column_key(field): row for field, row in zip(fields,
            await CustomFieldService._projection(db, fields))}
        rows = []
        for key, (label, kind, binding, field_type) in BUILTIN_BINDINGS.items():
            instance = instances.pop(key, None)
            rows.append({"catalog_key": key, "label": label, "column_class": column_class(key),
                "binding_kind": kind, "field_type": field_type, "instance": instance})
        rows.extend({"catalog_key": None, "label": row["label"], "column_class": row["column_class"],
            "binding_kind": "custom", "field_type": row["field_type"], "instance": row} for row in instances.values())
        return rows

    @staticmethod
    def _unique_label(label: str, used: set[str], *, numbered: bool = False) -> str:
        if not numbered and label not in used:
            return label
        base = label
        suffix = 1
        while f"{base}{suffix:02d}" in used:
            suffix += 1
        result = f"{base}{suffix:02d}"
        if len(result) > 80:
            raise DomainError("新增后的列名不能超过 80 个字符", code="VALIDATION_ERROR")
        return result

    @staticmethod
    def _audit(
        db: AsyncSession,
        *,
        user_id: str,
        action: str,
        field_id: str,
        production_id: str,
        metadata: dict | None = None,
    ) -> None:
        db.add(AuditLog(
            user_id=user_id,
            action=action,
            entity_type="custom_field",
            entity_id=field_id,
            metadata_json={"production_id": production_id, **(metadata or {})},
        ))

    @staticmethod
    def _normalize_key(raw: str | None) -> str:
        if raw is None or not raw.strip():
            return f"field_{uuid.uuid4().hex[:10]}"
        key = raw.strip().lower().replace("-", "_").replace(" ", "_")
        key = re.sub(r"[^a-z0-9_]", "", key)
        key = re.sub(r"_+", "_", key).strip("_")
        if not key:
            raise DomainError(
                "自定义列键只能包含英文小写字母、数字和下划线",
                code="INVALID_FIELD_KEY",
            )
        if key[0].isdigit():
            key = f"field_{key}"
        return key[:80]

    @staticmethod
    def _normalize_options(options: list[str]) -> list[str]:
        normalized: list[str] = []
        seen: set[str] = set()
        for item in options:
            value = str(item).strip()[:120]
            if value and value not in seen:
                normalized.append(value)
                seen.add(value)
        if len(normalized) > 100:
            raise DomainError("自定义列选项过多", code="VALIDATION_ERROR")
        return normalized

    @staticmethod
    def _normalize_value(
        field_type: str,
        value: Any,
        options: list[str],
    ) -> Any:
        if value is None:
            return None

        if field_type == "json":
            try:
                encoded = json.dumps(value, ensure_ascii=False, allow_nan=False)
            except (TypeError, ValueError):
                raise DomainError("结构化列内容不是有效 JSON", code="VALIDATION_ERROR")
            if len(encoded) > 10000:
                raise DomainError("结构化列内容过长", code="VALIDATION_ERROR")
            return copy.deepcopy(value)

        if field_type in {"text", "textarea", "date", "url"}:
            text = str(value)
            max_length = 10000 if field_type == "textarea" else 2000
            if len(text) > max_length:
                raise DomainError("自定义列内容过长", code="VALIDATION_ERROR")
            return text

        if field_type == "number":
            if isinstance(value, bool):
                raise DomainError("数值列不能写入布尔值", code="VALIDATION_ERROR")
            if isinstance(value, (int, float)):
                return value
            try:
                number = float(str(value).strip())
            except (TypeError, ValueError):
                raise DomainError("数值列内容格式无效", code="VALIDATION_ERROR")
            return int(number) if number.is_integer() else number

        if field_type == "boolean":
            if not isinstance(value, bool):
                raise DomainError("布尔列只能写入 true/false", code="VALIDATION_ERROR")
            return value

        if field_type == "select":
            selected = str(value)
            if selected not in options:
                raise DomainError("选择值不在自定义列选项中", code="VALIDATION_ERROR")
            return selected

        if field_type == "multiselect":
            if not isinstance(value, list) or any(not isinstance(item, str) or item not in options for item in value):
                raise DomainError("多选值不在自定义列选项中", code="VALIDATION_ERROR")
            return list(dict.fromkeys(value))

        raise DomainError("不支持的自定义列类型", code="INVALID_FIELD_TYPE")

    @staticmethod
    async def _projection(
        db: AsyncSession,
        fields: list[ProjectColumn],
    ) -> list[dict]:
        if not fields:
            return []

        production_id = fields[0].production_id
        result = await db.execute(
            select(ColumnPreference).where(
                ColumnPreference.production_id == production_id,
                ColumnPreference.column_key.in_(
                    [CustomFieldService._column_key(field) for field in fields]
                ),
            )
        )
        preferences = {item.column_key: item for item in result.scalars().all()}

        rows: list[dict] = []
        for field in fields:
            column_key = CustomFieldService._column_key(field)
            preference = preferences.get(column_key)
            rows.append({
                "id": field.id,
                "production_id": field.production_id,
                "key": field.key,
                "column_key": column_key,
                "label": field.label,
                "description": field.description,
                "field_type": field.field_type,
                "group_name": field.group_name,
                "options": list(field.options or []),
                "required": field.required,
                "default_value": field.default_value,
                "sort_index": field.sort_index,
                "state": "removed" if field.state in {"trashed", "purging", "purged"} else (preference.state if preference else "visible"),
                "permanently_deleted": field.state == "purged",
                "position": preference.position if preference else field.sort_index,
                "width_px": preference.width_px if preference else 180,
                "wrap_text": preference.wrap_text if preference else field.field_type == "textarea",
                "revision": field.revision,
                "column_class": field.column_class,
                "origin": field.origin,
                "created_by": field.created_by,
                "created_at": field.created_at,
                "updated_at": field.updated_at,
            })
        return rows

    @staticmethod
    async def list_fields(
        db: AsyncSession,
        production_id: str,
    ) -> list[dict]:
        await CustomFieldService._production(db, production_id)
        result = await db.execute(
            select(ProjectColumn)
            .where(
                ProjectColumn.production_id == production_id,
                ProjectColumn.state != "purged",
                ProjectColumn.binding_kind == "custom",
            )
            .order_by(
                ProjectColumn.sort_index.asc(),
                ProjectColumn.created_at.asc(),
                ProjectColumn.id.asc(),
            )
        )
        return await CustomFieldService._projection(db, list(result.scalars().all()))

    @staticmethod
    async def create_field(
        db: AsyncSession,
        production_id: str,
        req: CustomFieldCreate,
        user: User,
    ) -> dict:
        CustomFieldService._require_write(user)
        await CustomFieldService._production(db, production_id, for_update=True)

        label = req.label.strip()
        if not label:
            raise DomainError("自定义列名称不能为空", code="VALIDATION_ERROR")
        if label in CustomFieldService.PROTECTED_LABELS or (CustomFieldService._retired_label(label) and req.group_name != "导入原文"):
            raise DomainError("镜号、时码、分镜画面不能重复新增；已取消的列不能新增。", code="COLUMN_PROTECTED")
        existing_labels = await db.execute(select(ProjectColumn.label).where(
            ProjectColumn.production_id == production_id, ProjectColumn.state != "purged"))
        label = CustomFieldService._unique_label(label, set(existing_labels.scalars()))

        key = CustomFieldService._normalize_key(req.key)
        existing_result = await db.execute(
            select(ProjectColumn).where(
                ProjectColumn.production_id == production_id,
                ProjectColumn.key == key,
            )
        )
        existing = existing_result.scalar_one_or_none()
        if existing:
            if existing.state == "purged":
                raise DomainError(
                    "该列键已被永久删除，不能由旧配置或新建操作重新激活",
                    code="FIELD_KEY_PURGED",
                )
            raise DomainError("该自定义列键已存在", code="FIELD_KEY_EXISTS")

        options = CustomFieldService._normalize_options(req.options)
        if req.field_type not in {"select", "multiselect"}:
            options = []
        elif not options:
            raise DomainError("选择列至少需要一个选项", code="VALIDATION_ERROR")

        default_value = CustomFieldService._normalize_value(
            req.field_type,
            req.default_value,
            options,
        )

        max_sort_result = await db.execute(
            select(func.coalesce(func.max(ProjectColumn.sort_index), 0)).where(
                ProjectColumn.production_id == production_id,
                ProjectColumn.state != "purged",
            )
        )
        sort_index = int(max_sort_result.scalar() or 0) + 100

        field = ProjectColumn(
            production_id=production_id,
            key=key,
            label=label,
            description=req.description.strip(),
            field_type=req.field_type,
            group_name=req.group_name.strip() or "Custom",
            options=options,
            required=req.required,
            default_value=default_value,
            sort_index=sort_index,
            state="active",
            origin="import" if req.group_name == "导入原文" else "custom",
            binding_kind="custom",
            created_by=user.id,
            revision=1,
        )
        db.add(field)
        await db.flush()

        preference = ColumnPreference(
            production_id=production_id,
            column_key=CustomFieldService._column_key(field),
            state="hidden" if CustomFieldService._retired_label(label) else "visible",
            permanently_deleted=False,
            position=sort_index,
            width_px=220 if req.field_type == "textarea" else 180,
            wrap_text=req.field_type == "textarea",
            updated_by=user.id,
            revision=1,
        )
        db.add(preference)

        CustomFieldService._audit(
            db,
            user_id=user.id,
            action="custom_field.create",
            field_id=field.id,
            production_id=production_id,
            metadata={"key": field.key, "field_type": field.field_type},
        )
        await db.flush()
        return (await CustomFieldService._projection(db, [field]))[0]

    @staticmethod
    async def insert_fields(db: AsyncSession, production_id: str, req: CustomFieldInsert, user: User) -> list[dict]:
        """Create/restore a dialog's selections in one acknowledged transaction."""
        CustomFieldService._require_write(user)
        await CustomFieldService._production(db, production_id, for_update=True)
        if not req.fields and not req.restore and not req.restore_columns:
            raise DomainError("请先选择或输入列名", code="VALIDATION_ERROR")
        restored = []
        for column_key, revision in req.restore_columns.items():
            await CustomFieldService.set_builtin_state(db, production_id, column_key,
                BuiltinColumnStateUpdate(revision=revision, state='visible'), user)
        for field_id, revision in req.restore.items():
            restored.append(await CustomFieldService.set_state(db, production_id, field_id,
                CustomFieldStateUpdate(revision=revision, state="visible"), user))
        created = [await CustomFieldService.create_field(db, production_id, field, user) for field in req.fields]
        return restored + created

    @staticmethod
    async def copy_column(db: AsyncSession, production_id: str, req: ColumnCopyRequest, user: User) -> dict:
        """Copy all live rows, never a filtered client matrix; reject stale clipboard snapshots."""
        CustomFieldService._require_write(user)
        await CustomFieldService._production(db, production_id, for_update=True)
        result = await db.execute(select(Shot).where(Shot.production_id == production_id,
            Shot.deleted_at.is_(None)).order_by(Shot.id).with_for_update())
        shots = list(result.scalars().all())
        if req.shot_revisions != {shot.id: shot.revision for shot in shots}:
            raise ConflictError(message="镜头数据已修改，请刷新后重新复制整列。", details={})
        source = None
        if req.source.startswith("custom:"):
            result = await db.execute(select(ProjectColumn).where(
                ProjectColumn.production_id == production_id,
                ProjectColumn.key == req.source[7:],
                ProjectColumn.state != "purged").with_for_update())
            source = result.scalar_one_or_none()
            if not source:
                raise NotFoundError("来源列不存在")
            if source.state != "active" or source.binding_kind != "custom":
                raise DomainError("请先恢复来源列再复制", code="FIELD_TRASHED")
            if CustomFieldService._retired_label(source.label):
                raise DomainError("该列已取消，不能复制。", code="COLUMN_RETIRED")
            if source.revision != req.field_revision:
                raise ConflictError(message="来源列已修改，请重新复制。", details={"server_revision": source.revision})
        elif req.source not in CustomFieldService.COPY_COLUMNS:
            raise DomainError("镜号、时码、分镜画面不能复制；已取消的列不可操作。", code="COLUMN_PROTECTED")
        if not source:
            builtin = (await db.execute(select(ProjectColumn).where(
                ProjectColumn.production_id == production_id, ProjectColumn.key == "builtin:" + req.source,
            ))).scalar_one_or_none()
            if builtin and builtin.state != "active":
                raise DomainError("来源列已删除，请恢复后重新复制。", code="COLUMN_REMOVED")
        preference = await CustomFieldService._preference(db, production_id, req.source, for_update=True)
        if preference and (preference.state == 'removed' or preference.permanently_deleted):
            raise DomainError('来源列已删除，请恢复后重新复制。', code='COLUMN_REMOVED')
        source_values = {}
        if source:
            result = await db.execute(select(ShotColumnValue).where(
                ShotColumnValue.column_id == source.id))
            source_values = {row.shot_id: row.value for row in result.scalars()}
        values = {}
        for shot in shots:
            if source:
                value = source_values.get(shot.id, source.default_value)
            elif req.source == "primary_method":
                value = list(dict.fromkeys([shot.primary_method, *(shot.secondary_methods or [])]))
            else:
                value = getattr(shot, req.source, None)
            values[shot.id] = copy.deepcopy(value)
        field_type = source.field_type if source else CustomFieldService.COPY_COLUMNS[req.source]
        options = list(source.options or []) if source else []
        if not source and field_type in {"select", "multiselect"}:
            if req.source == "sequence_id":
                sequence_ids = await db.execute(select(Sequence.id).where(Sequence.production_id == production_id))
                req.options = list(sequence_ids.scalars())
            options = CustomFieldService._normalize_options(req.options + [str(item) for value in values.values() if value is not None
                for item in (value if isinstance(value, list) else [value]) if item != ""])
            if not options:
                # Empty enum columns still need a valid, editable enum definition.
                options = ["未设置"]
        labels = {row["label"] for row in await CustomFieldService.list_fields(db, production_id)} | set(req.existing_labels)
        if not req.label.strip():
            raise DomainError("列名不能为空", code="VALIDATION_ERROR")
        label = CustomFieldService._unique_label(req.label.strip(), labels, numbered=True)
        created = await CustomFieldService.create_field(db, production_id, CustomFieldCreate(
            label=label, field_type=field_type, options=options,
            description=source.description if source else "",
            group_name=source.group_name if source else "Custom",
            required=source.required if source else False,
            default_value=copy.deepcopy(source.default_value) if source else None), user)
        preference = await CustomFieldService._preference(db, production_id, created["column_key"], for_update=True)
        preference.width_px = req.width_px
        preference.wrap_text = req.wrap_text
        for shot in shots:
            value = values[shot.id]
            db.add(ShotColumnValue(production_id=production_id, shot_id=shot.id, column_id=created["id"], value=value, updated_by=user.id))
            shot.revision += 1
            shot.updated_at = datetime.now(timezone.utc)
            db.add(AuditLog(user_id=user.id, action="shot.column.copy", entity_type="shot", entity_id=shot.id,
                metadata_json={"field_id": created["id"], "source": req.source, "revision": shot.revision}))
        await db.flush()
        return {"field": (await CustomFieldService._projection(db, [await CustomFieldService._field(db, production_id, created["id"])]))[0],
                "shot_revisions": {shot.id: shot.revision for shot in shots}}

    @staticmethod
    async def update_field(
        db: AsyncSession,
        production_id: str,
        field_id: str,
        req: CustomFieldUpdate,
        user: User,
    ) -> dict:
        CustomFieldService._require_write(user)
        await CustomFieldService._production(db, production_id, for_update=True)
        field = await CustomFieldService._field(
            db,
            production_id,
            field_id,
            for_update=True,
        )

        if field.revision != req.revision:
            raise ConflictError(
                message="自定义列已被其他用户修改，请刷新后重试。",
                details={
                    "field_id": field.id,
                    "server_revision": field.revision,
                    "client_revision": req.revision,
                },
            )

        next_field_type = req.field_type or field.field_type
        if next_field_type not in CustomFieldService.FIELD_TYPES:
            raise DomainError("不支持的自定义列类型", code="INVALID_FIELD_TYPE")
        type_changed = next_field_type != field.field_type

        value_rows: list[ShotColumnValue] = []
        if type_changed or req.options is not None:
            values_result = await db.execute(
                select(ShotColumnValue)
                .where(ShotColumnValue.column_id == field.id)
                .with_for_update()
            )
            value_rows = list(values_result.scalars().all())

        next_options = list(field.options or [])
        if next_field_type in {"select", "multiselect"}:
            if req.options is not None:
                next_options = CustomFieldService._normalize_options(req.options)
            elif field.field_type not in {"select", "multiselect"}:
                next_options = []

            if not next_options:
                raise DomainError("选择列至少需要一个选项", code="VALIDATION_ERROR")

            used = {str(value) for row in value_rows if row.value is not None
                    for value in (row.value if isinstance(row.value, list) else [row.value])}
            removed_in_use = sorted(
                str(value) for value in used if value not in next_options
            )
            if removed_in_use:
                raise DomainError(
                    "不能删除仍被镜头使用的选项：" + "、".join(removed_in_use[:10]),
                    code="FIELD_OPTION_IN_USE",
                )
        else:
            next_options = []

        if type_changed:
            incompatible_count = 0
            for row in value_rows:
                try:
                    normalized = CustomFieldService._normalize_value(
                        next_field_type,
                        row.value,
                        next_options,
                    )
                except DomainError:
                    incompatible_count += 1
                    continue

                # Changing a field definition must not silently rewrite Shot
                # business data without each Shot's expected revision. Permit a
                # type edit only when the stored JSON value is already valid
                # for the target type without representation changes.
                if type(normalized) is not type(row.value) or normalized != row.value:
                    incompatible_count += 1

            if incompatible_count:
                raise DomainError(
                    f"已有 {incompatible_count} 个镜头值需要数据迁移，不能直接修改字段类型；请先调整或清空这些值。",
                    code="FIELD_TYPE_VALUE_MIGRATION_REQUIRED",
                )

        changed: list[str] = []
        if req.label is not None:
            label = req.label.strip()
            if not label:
                raise DomainError("自定义列名称不能为空", code="VALIDATION_ERROR")
            if CustomFieldService._retired_label(label):
                raise DomainError("该列已取消，不能使用此名称。", code="COLUMN_RETIRED")
            if field.label != label:
                field.label = label
                changed.append("label")

        if req.description is not None:
            description = req.description.strip()
            if field.description != description:
                field.description = description
                changed.append("description")

        if req.group_name is not None:
            group_name = req.group_name.strip() or "Custom"
            if field.group_name != group_name:
                field.group_name = group_name
                changed.append("group_name")

        if type_changed:
            field.field_type = next_field_type
            changed.append("field_type")

        if list(field.options or []) != next_options:
            field.options = next_options
            changed.append("options")

        if req.required is not None and field.required != req.required:
            field.required = req.required
            changed.append("required")

        next_default = field.default_value
        if req.default_value_set:
            next_default = CustomFieldService._normalize_value(
                next_field_type,
                req.default_value,
                next_options,
            )
        elif type_changed and field.default_value is not None:
            try:
                next_default = CustomFieldService._normalize_value(
                    next_field_type,
                    field.default_value,
                    next_options,
                )
            except DomainError as error:
                raise DomainError(
                    "当前默认值与目标字段类型不兼容，请同时设置新的默认值。",
                    code="FIELD_TYPE_DEFAULT_INCOMPATIBLE",
                ) from error

        if field.default_value != next_default:
            field.default_value = next_default
            changed.append("default_value")

        if type_changed:
            preference = await CustomFieldService._preference(
                db,
                production_id,
                CustomFieldService._column_key(field),
                for_update=True,
            )
            if preference is not None:
                next_wrap = next_field_type == "textarea"
                if preference.wrap_text != next_wrap:
                    preference.wrap_text = next_wrap
                    preference.updated_by = user.id
                    preference.revision += 1
                    preference.updated_at = datetime.now(timezone.utc)

        if changed:
            field.revision += 1
            field.updated_at = datetime.now(timezone.utc)
            CustomFieldService._audit(
                db,
                user_id=user.id,
                action="custom_field.update",
                field_id=field.id,
                production_id=production_id,
                metadata={
                    "changed_fields": changed,
                    "revision": field.revision,
                    "validated_values": len(value_rows) if type_changed else 0,
                },
            )
            await db.flush()

        return (await CustomFieldService._projection(db, [field]))[0]

    @staticmethod
    async def set_state(
        db: AsyncSession,
        production_id: str,
        field_id: str,
        req: CustomFieldStateUpdate,
        user: User,
    ) -> dict:
        CustomFieldService._require_write(user)
        await CustomFieldService._production(db, production_id, for_update=True)
        field = await CustomFieldService._field(
            db,
            production_id,
            field_id,
            for_update=True,
        )
        if field.revision != req.revision:
            raise ConflictError(
                message="自定义列已被其他用户修改，请刷新后重试。",
                details={
                    "field_id": field.id,
                    "server_revision": field.revision,
                    "client_revision": req.revision,
                },
            )

        column_key = CustomFieldService._column_key(field)
        preference = await CustomFieldService._preference(
            db,
            production_id,
            column_key,
            for_update=True,
        )
        if preference and preference.permanently_deleted:
            raise DomainError(
                "永久删除的列不能重新显示或恢复",
                code="FIELD_PERMANENTLY_DELETED",
            )

        if not preference:
            preference = ColumnPreference(
                production_id=production_id,
                column_key=column_key,
                state="visible",
                permanently_deleted=False,
                position=field.sort_index,
                width_px=220 if field.field_type == "textarea" else 180,
                wrap_text=field.field_type == "textarea",
                updated_by=user.id,
                revision=1,
            )
            db.add(preference)
            await db.flush()

        target_state = "trashed" if req.state == "removed" else "active"
        target_visibility = "hidden" if req.state == "removed" else req.state
        if preference.state == target_visibility and field.state == target_state:
            return (await CustomFieldService._projection(db, [field]))[0]

        preference.state = target_visibility
        preference.updated_by = user.id
        preference.revision += 1
        preference.updated_at = datetime.now(timezone.utc)
        field.revision += 1
        field.updated_at = preference.updated_at
        field.state = target_state
        field.deleted_at = preference.updated_at if target_state == "trashed" else None

        CustomFieldService._audit(
            db,
            user_id=user.id,
            action={
                "visible": "custom_field.restore",
                "hidden": "custom_field.hide",
                "removed": "custom_field.delete",
            }[req.state],
            field_id=field.id,
            production_id=production_id,
            metadata={
                "column_key": column_key,
                "state": req.state,
                "revision": field.revision,
            },
        )
        await db.flush()
        return (await CustomFieldService._projection(db, [field]))[0]

    @staticmethod
    async def purge_field(
        db: AsyncSession,
        production_id: str,
        field_id: str,
        req: CustomFieldPurgeRequest,
        user: User,
    ) -> bool:
        CustomFieldService._require_write(user)
        await CustomFieldService._production(db, production_id, for_update=True)
        definition = await db.scalar(select(ProjectColumn).where(ProjectColumn.id == field_id,
            ProjectColumn.production_id == production_id).with_for_update())
        if definition and definition.column_class == "builtin":
            raise DomainError("内置列仅可删除到回收站并恢复，不允许永久删除。", code="BUILTIN_PURGE_FORBIDDEN")
        field = await CustomFieldService._field(
            db,
            production_id,
            field_id,
            for_update=True,
            include_purged=True,
        )
        if field.state == "purged":
            return False
        if field.revision != req.revision:
            raise ConflictError(
                message="自定义列已被其他用户修改，请刷新后重试。",
                details={
                    "field_id": field.id,
                    "server_revision": field.revision,
                    "client_revision": req.revision,
                },
            )

        column_key = CustomFieldService._column_key(field)
        preference = await CustomFieldService._preference(
            db,
            production_id,
            column_key,
            for_update=True,
        )
        if field.state != "trashed":
            raise DomainError(
                "请先将该列移入回收站，再确认永久删除",
                code="FIELD_NOT_TRASHED",
            )

        await db.execute(
            delete(ShotColumnValue).where(
                ShotColumnValue.column_id == field.id
            )
        )

        from app.services.version_redaction import redact_column_history, redact_live_column_quotes
        await redact_live_column_quotes(db, production_id, field.id, column_key, user)
        await redact_column_history(db, production_id, field.id, column_key)

        now = datetime.now(timezone.utc)
        field.state = "purged"
        field.purged_at = now
        field.label = ""
        field.description = ""
        field.group_name = ""
        field.options = []
        field.default_value = None
        field.required = False
        field.revision += 1
        field.updated_at = now

        if preference:
            await db.delete(preference)

        views_result = await db.execute(
            select(SavedView)
            .where(SavedView.production_id == production_id)
            .with_for_update()
        )
        for view in views_result.scalars().all():
            config = view.config if isinstance(view.config, dict) else {}
            sanitized, changed = sanitize_saved_view_config(
                config,
                {column_key},
            )
            if changed:
                view.config = sanitized
                view.revision += 1
                view.updated_at = now

        from app.models.export_template import ExportTemplate
        templates = await db.scalars(select(ExportTemplate).where(ExportTemplate.production_id == production_id).with_for_update())
        for template in templates:
            if field.id in template.field_ids:
                template.field_ids = [identity for identity in template.field_ids if identity != field.id]
                template.revision += 1
                template.updated_at = now

        CustomFieldService._audit(
            db,
            user_id=user.id,
            action="custom_field.purge",
            field_id=field.id,
            production_id=production_id,
            metadata={
                "key": field.key,
                "column_key": column_key,
                "revision": field.revision,
            },
        )
        await db.flush()
        return True

    @staticmethod
    async def value_matrix(
        db: AsyncSession,
        production_id: str,
    ) -> dict:
        await CustomFieldService._production(db, production_id)

        field_result = await db.execute(
            select(ProjectColumn.id).where(
                ProjectColumn.production_id == production_id,
                ProjectColumn.state != "purged",
            )
        )
        field_ids = set(field_result.scalars().all())
        if not field_ids:
            return {"values": {}}

        rows_result = await db.execute(
            select(ShotColumnValue).where(
                ShotColumnValue.column_id.in_(field_ids)
            )
        )
        values: dict[str, dict[str, Any]] = {}
        for row in rows_result.scalars().all():
            values.setdefault(row.shot_id, {})[row.column_id] = row.value
        return {"values": values}

    @staticmethod
    async def patch_value(
        db: AsyncSession,
        shot_id: str,
        field_id: str,
        req: CustomFieldValuePatch,
        user: User,
    ) -> dict:
        CustomFieldService._require_write(user)

        scope_result = await db.execute(select(Shot.production_id).where(Shot.id == shot_id, Shot.deleted_at.is_(None)))
        production_id = scope_result.scalar_one_or_none()
        if not production_id:
            raise NotFoundError("镜头不存在")
        await CustomFieldService._production(db, production_id, for_update=True)
        field = await CustomFieldService._field(db, production_id, field_id, for_update=True)
        shot_result = await db.execute(
            select(Shot)
            .where(Shot.id == shot_id, Shot.deleted_at.is_(None))
            .with_for_update()
        )
        shot = shot_result.scalar_one_or_none()
        if not shot:
            raise NotFoundError("镜头不存在")

        preference = await CustomFieldService._preference(
            db,
            shot.production_id,
            CustomFieldService._column_key(field),
        )
        if field.state != "active":
            raise DomainError("回收站中的列请先恢复后再编辑", code="FIELD_TRASHED")
        if preference and preference.permanently_deleted:
            raise DomainError("永久删除的列不能继续写入", code="FIELD_PERMANENTLY_DELETED")

        if shot.revision != req.revision:
            raise ConflictError(
                message="镜头已被其他用户修改，请刷新后重试。",
                details={
                    "shot_id": shot.id,
                    "server_revision": shot.revision,
                    "client_revision": req.revision,
                },
            )

        normalized = CustomFieldService._normalize_value(
            field.field_type,
            req.value,
            list(field.options or []),
        )
        if field.required and normalized in (None, "", []):
            raise DomainError("必填自定义列不能为空", code="FIELD_REQUIRED")

        value_result = await db.execute(
            select(ShotColumnValue).where(
                ShotColumnValue.shot_id == shot.id,
                ShotColumnValue.column_id == field.id,
            )
        )
        value_row = value_result.scalar_one_or_none()
        effective_current = (
            value_row.value if value_row is not None else field.default_value
        )

        if effective_current == normalized and (
            value_row is not None or normalized == field.default_value
        ):
            return {
                "changed": False,
                "shot_id": shot.id,
                "field_id": field.id,
                "value": normalized,
                "revision": shot.revision,
            }

        if value_row is None:
            db.add(ShotColumnValue(
                production_id=shot.production_id,
                shot_id=shot.id,
                column_id=field.id,
                value=normalized,
                updated_by=user.id,
            ))
        else:
            value_row.value = normalized
            value_row.updated_by = user.id
            value_row.updated_at = datetime.now(timezone.utc)

        shot.revision += 1
        shot.updated_at = datetime.now(timezone.utc)
        db.add(AuditLog(
            user_id=user.id,
            action="shot.custom_field.patch",
            entity_type="shot",
            entity_id=shot.id,
            metadata_json={
                "field_id": field.id,
                "field_key": field.key,
                "revision": shot.revision,
            },
        ))
        await db.flush()

        return {
            "changed": True,
            "shot_id": shot.id,
            "field_id": field.id,
            "value": normalized,
            "revision": shot.revision,
        }
