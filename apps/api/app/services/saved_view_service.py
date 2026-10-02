"""Canonical saved-view persistence and revision handling."""
from __future__ import annotations

from datetime import datetime, timezone
import json
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, DomainError, NotFoundError
from app.models.collaboration import AuditLog
from app.models.command import OutboxEvent
from app.models.production import Production
from app.models.user import User
from app.models.shot import Shot
from app.models.view import SavedView, ViewRowLayout
from app.schemas.saved_view import SavedViewCreate, SavedViewUpdate
from app.services.column_lifecycle import purged_column_keys, sanitize_saved_view_config


class SavedViewService:
    @staticmethod
    def _has_permission(user: User, permission: str) -> bool:
        permissions = getattr(getattr(user, "role", None), "permissions", None) or {}
        return bool(permissions.get("*") or permissions.get(permission))

    @staticmethod
    async def _production(db: AsyncSession, production_id: str, *, for_update: bool = False) -> Production:
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
    def _require_write(user: User) -> None:
        if not SavedViewService._has_permission(user, "shot.write"):
            raise DomainError("当前账号没有保存项目视图的权限", code="FORBIDDEN")

    @staticmethod
    def _audit(
        db: AsyncSession,
        *,
        user_id: str,
        action: str,
        view_id: str,
        production_id: str,
        metadata: dict | None = None,
    ) -> None:
        db.add(AuditLog(
            user_id=user_id,
            action=action,
            entity_type="saved_view",
            entity_id=view_id,
            metadata_json={"production_id": production_id, **(metadata or {})},
        ))

    @staticmethod
    def _event(db: AsyncSession, view: SavedView, action: str) -> None:
        db.add(OutboxEvent(
            production_id=view.production_id, command_id=str(uuid.uuid4()),
            event_type=action, revision=view.revision,
            entity_ids={"saved_view_id": view.id, "is_shared": view.is_shared,
                        "created_by": view.created_by},
        ))

    @staticmethod
    def _validate_config(config: dict) -> None:
        try:
            if len(json.dumps(config, ensure_ascii=False, allow_nan=False)) > 100000:
                raise ValueError()
        except (TypeError, ValueError):
            raise DomainError("视图配置无效或过大", code="INVALID_VIEW_CONFIG")
        presentation = config.get("presentation", {})
        if not isinstance(presentation, dict):
            raise DomainError("表格显示配置必须是对象", code="INVALID_VIEW_CONFIG")
        if any("columnheight" in key.lower().replace("_", "") for key in presentation):
            raise DomainError("支持自定义行高，不支持列高", code="INVALID_VIEW_CONFIG")
        for section in (presentation, config.get("customColumns", {})):
            if not isinstance(section, dict):
                raise DomainError("列配置必须是对象", code="INVALID_VIEW_CONFIG")
            for key in ("columnWidths", "widths"):
                widths = section.get(key, {})
                if not isinstance(widths, dict) or any(type(value) is not int or not 0 < value <= 10000 for value in widths.values()):
                    raise DomainError("列宽必须是有效的正整数像素值", code="INVALID_VIEW_CONFIG")
            modes = section.get("columnWidthModes", {})
            if not isinstance(modes, dict) or any(not isinstance(value, str) or value not in {"manual", "auto"} for value in modes.values()):
                raise DomainError("列宽策略必须为手动或自动", code="INVALID_VIEW_CONFIG")

    @staticmethod
    async def _rows(db: AsyncSession, view: SavedView, changes: list) -> bool:
        ids = [item.shot_id for item in changes]
        if len(ids) != len(set(ids)):
            raise DomainError("同一镜头不能重复设置行高", code="INVALID_VIEW_LAYOUT")
        if ids:
            result = await db.execute(select(Shot.id).where(
                Shot.production_id == view.production_id, Shot.id.in_(ids), Shot.deleted_at.is_(None),
            ))
            if set(result.scalars()) != set(ids):
                raise DomainError("行高目标必须是本项目的活动镜头", code="INVALID_VIEW_LAYOUT")
        rows = {item.shot_id: item for item in view.row_layouts}
        changed = False
        for item in changes:
            row = rows.get(item.shot_id)
            if item.height_mode == "auto":
                if row is not None:
                    view.row_layouts.remove(row)
                    changed = True
            elif row is None:
                view.row_layouts.append(ViewRowLayout(
                    production_id=view.production_id, shot_id=item.shot_id,
                    height_mode="manual", manual_height_px=item.manual_height_px,
                ))
                changed = True
            elif row.manual_height_px != item.manual_height_px:
                row.height_mode = "manual"
                row.manual_height_px = item.manual_height_px
                changed = True
        return changed

    @staticmethod
    async def list_views(
        db: AsyncSession,
        production_id: str,
        user: User,
    ) -> list[SavedView]:
        await SavedViewService._production(db, production_id)
        result = await db.execute(
            select(SavedView)
            .where(
                SavedView.production_id == production_id,
                (SavedView.is_shared.is_(True)) | (SavedView.created_by == user.id),
            )
            .order_by(SavedView.created_at.asc(), SavedView.id.asc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def create_view(
        db: AsyncSession,
        production_id: str,
        req: SavedViewCreate,
        user: User,
    ) -> SavedView:
        SavedViewService._require_write(user)
        await SavedViewService._production(db, production_id, for_update=True)

        name = req.name.strip()
        if not name:
            raise DomainError("视图名称不能为空", code="VALIDATION_ERROR")

        blocked_keys = await purged_column_keys(db, production_id)
        sanitized_config, _ = sanitize_saved_view_config(req.config, blocked_keys)
        SavedViewService._validate_config(sanitized_config)
        if (req.row_height_mode == "manual") != (req.manual_row_height_px is not None):
            raise DomainError("手动行高需指定像素值，自动行高需清除手动值", code="INVALID_VIEW_LAYOUT")

        view = SavedView(
            production_id=production_id,
            name=name,
            view_type=req.view_type,
            is_shared=req.is_shared,
            created_by=user.id,
            config=sanitized_config,
            revision=1,
            row_height_mode=req.row_height_mode,
            manual_row_height_px=req.manual_row_height_px,
            row_layouts=[],
        )
        db.add(view)
        await db.flush()
        await SavedViewService._rows(db, view, req.row_layouts)
        SavedViewService._audit(
            db,
            user_id=user.id,
            action="saved_view.create",
            view_id=view.id,
            production_id=production_id,
            metadata={"name": view.name, "view_type": view.view_type},
        )
        SavedViewService._event(db, view, "saved_view.create")
        await db.flush()
        return view

    @staticmethod
    async def update_view(
        db: AsyncSession,
        production_id: str,
        view_id: str,
        req: SavedViewUpdate,
        user: User,
    ) -> SavedView:
        SavedViewService._require_write(user)
        await SavedViewService._production(db, production_id, for_update=True)

        result = await db.execute(
            select(SavedView)
            .where(
                SavedView.id == view_id,
                SavedView.production_id == production_id,
            )
            .with_for_update()
        )
        view = result.scalar_one_or_none()
        if not view:
            raise NotFoundError("保存视图不存在")
        if not view.is_shared and view.created_by != user.id and not SavedViewService._has_permission(user, "review.approve"):
            raise DomainError("无权修改其他用户的私有视图", code="FORBIDDEN")

        if view.revision != req.revision:
            raise ConflictError(
                message="保存视图已被其他用户修改，请刷新后重试。",
                details={
                    "saved_view_id": view.id,
                    "server_revision": view.revision,
                    "client_revision": req.revision,
                },
            )

        changed: list[str] = []
        if req.name is not None:
            name = req.name.strip()
            if not name:
                raise DomainError("视图名称不能为空", code="VALIDATION_ERROR")
            if view.name != name:
                view.name = name
                changed.append("name")
        if req.is_shared is not None and view.is_shared != req.is_shared:
            view.is_shared = req.is_shared
            changed.append("is_shared")
        if req.config is not None:
            blocked_keys = await purged_column_keys(db, production_id)
            sanitized_config, _ = sanitize_saved_view_config(req.config, blocked_keys)
            SavedViewService._validate_config(sanitized_config)
            if view.config != sanitized_config:
                view.config = sanitized_config
                changed.append("config")

        mode = req.row_height_mode or view.row_height_mode
        height = req.manual_row_height_px if "manual_row_height_px" in req.model_fields_set else view.manual_row_height_px
        if req.row_height_mode == "auto":
            if req.manual_row_height_px is not None:
                raise DomainError("自动行高不能携带手动覆盖", code="INVALID_VIEW_LAYOUT")
            height = None
        if (mode == "manual") != (height is not None):
            raise DomainError("手动行高需指定像素值，自动行高需清除手动值", code="INVALID_VIEW_LAYOUT")
        if (view.row_height_mode, view.manual_row_height_px) != (mode, height):
            view.row_height_mode, view.manual_row_height_px = mode, height
            changed.append("row_height")
        if req.row_layouts is not None and await SavedViewService._rows(db, view, req.row_layouts):
            changed.append("row_layouts")

        if not changed:
            return view

        view.revision += 1
        if set(changed) & {"config", "row_height", "row_layouts"}:
            view.measurement_generation += 1
            view.measurement_context = {}
        view.updated_at = datetime.now(timezone.utc)
        SavedViewService._audit(
            db,
            user_id=user.id,
            action="saved_view.update",
            view_id=view.id,
            production_id=production_id,
            metadata={"changed_fields": changed, "revision": view.revision},
        )
        SavedViewService._event(db, view, "saved_view.update")
        await db.flush()
        return view

    @staticmethod
    async def delete_view(
        db: AsyncSession,
        production_id: str,
        view_id: str,
        user: User,
    ) -> bool:
        SavedViewService._require_write(user)
        await SavedViewService._production(db, production_id, for_update=True)

        result = await db.execute(
            select(SavedView).where(
                SavedView.id == view_id,
                SavedView.production_id == production_id,
            ).with_for_update()
        )
        view = result.scalar_one_or_none()
        if not view:
            return False
        if not view.is_shared and view.created_by != user.id and not SavedViewService._has_permission(user, "review.approve"):
            raise DomainError("无权删除其他用户的私有视图", code="FORBIDDEN")

        SavedViewService._audit(
            db,
            user_id=user.id,
            action="saved_view.delete",
            view_id=view.id,
            production_id=production_id,
            metadata={"name": view.name},
        )
        SavedViewService._event(db, view, "saved_view.delete")
        await db.delete(view)
        await db.flush()
        return True
