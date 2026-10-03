import uuid
import re
from datetime import datetime, timezone
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.exceptions import DomainError, NotFoundError, ConflictError
from app.models.collaboration import AuditLog
from app.models.production import Production
from app.models.shot import Panel, Shot, ProductionStep
from app.models.asset import ShotAssetLink
from app.models.field import ShotColumnValue
from app.services.narration_timing import estimate_narration_frames
from app.models.user import User
from app.schemas.shot import BulkUpdateShotsRequest, ShotCreate, ShotPatch, ShotReorderRequest

class ShotService:
    # Patchable shot data only. Identity, ownership, revision, timestamps,
    # deletion and ordering are managed by their dedicated commands.
    PATCH_FIELDS = frozenset({
        "sequence_id", "scene_id", "display_number", "name", "description", "panel_frame",
        "action", "performance", "composition", "director_notes",
        "duration_frames", "timing_locked", "shot_size", "camera_angle",
        "camera_height", "lens_mm", "camera", "sensor", "aperture",
        "shutter", "camera_movement", "dialogue", "voice_over", "subtitle",
        "music_notes", "sfx_notes", "primary_method", "secondary_methods",
        "department", "owner_id", "status", "approval_status", "vfx_required",
        "continuity_notes", "risk_notes",
    })

    # Keep bulk editing narrower than single-shot PATCH until each additional
    # field has matching UI, validation and baseline-parity evidence.
    BULK_PATCH_FIELDS = frozenset({
        "primary_method", "department", "owner_id", "status",
        "sequence_id", "scene_id", "lens_mm",
    })

    @staticmethod
    def _has_permission(user: User, permission: str) -> bool:
        permissions = getattr(getattr(user, "role", None), "permissions", None) or {}
        return bool(permissions.get("*") or permissions.get(permission))

    @staticmethod
    def _require_write(user: User) -> None:
        if ShotService._has_permission(user, "shot.write"):
            return
        raise DomainError("当前账号没有修改镜头的权限", code="FORBIDDEN")

    @staticmethod
    def _audit_shot_mutation(
        db: AsyncSession,
        *,
        user_id: str,
        action: str,
        shot_id: str,
        metadata: dict | None = None,
    ) -> None:
        db.add(AuditLog(
            user_id=user_id,
            action=action,
            entity_type="shot",
            entity_id=shot_id,
            metadata_json=metadata or {},
        ))

    @staticmethod
    async def create_shot(db: AsyncSession, production_id: str, req: ShotCreate, user: User) -> Shot:
        ShotService._require_write(user)
        p_res = await db.execute(select(Production).where(Production.id == production_id, Production.deleted_at.is_(None)).with_for_update())
        if not p_res.scalar_one_or_none():
            raise NotFoundError("项目不存在")

        max_res = await db.execute(
            select(func.coalesce(func.max(Shot.sort_index), 0.0)).where(Shot.production_id == production_id)
        )
        max_sort = max_res.scalar() or 0.0
        new_sort = max_sort + 1000.0

        display_number = req.display_number
        if display_number is None:
            numbers = (await db.execute(select(Shot.display_number).where(
                Shot.production_id == production_id, Shot.deleted_at.is_(None)))).scalars()
            display_number = f"{max((int(number) for number in numbers if re.fullmatch(r'[0-9]+', number)), default=0) + 1:03d}"

        sid = str(uuid.uuid4())
        shot = Shot(
            id=sid,
            production_id=production_id,
            sequence_id=req.sequence_id,
            scene_id=req.scene_id,
            display_number=display_number,
            sort_index=new_sort,
            name=req.name or (f"镜头 {display_number}" if req.display_number is None else req.name),
            description=req.description,
            panel_frame=req.panel_frame,
            action=req.action,
            performance=req.performance,
            composition=req.composition,
            director_notes=req.director_notes,
            duration_frames=req.duration_frames,
            timing_locked=req.timing_locked,
            shot_size=req.shot_size,
            camera_angle=req.camera_angle,
            camera_height=req.camera_height,
            lens_mm=req.lens_mm,
            camera=req.camera,
            camera_movement=req.camera_movement or {"type": req.movement or "固定"},
            voice_over=req.voice_over,
            dialogue=req.dialogue,
            primary_method=req.primary_method,
            secondary_methods=req.secondary_methods,
            department=req.department,
            owner_id=req.owner_id,
            status=req.status,
            revision=1,
            created_by=user.id
        )
        db.add(shot)

        panel = Panel(
            id=str(uuid.uuid4()),
            shot_id=sid,
            display_number="A",
            sort_index=1000.0,
            duration_frames=req.duration_frames
        )
        shot.panels.append(panel)
        ShotService._audit_shot_mutation(
            db,
            user_id=user.id,
            action="shot.create",
            shot_id=shot.id,
            metadata={"revision": shot.revision, "production_id": production_id},
        )
        await db.flush()
        return shot

    @staticmethod
    async def patch_shot(db: AsyncSession, shot_id: str, req: ShotPatch, user: User) -> Shot:
        ShotService._require_write(user)
        return await ShotService._patch_shot(db, shot_id, req, user)

    @staticmethod
    async def patch_review_status(db: AsyncSession, shot_id: str, req: ShotPatch, user: User) -> Shot:
        next_status = req.changes.get("status") if set(req.changes) == {"status"} else None
        if (
            next_status not in {"approved", "changes_requested"}
            or not ShotService._has_permission(user, "review.approve")
        ):
            raise DomainError("当前账号没有审片决策权限", code="FORBIDDEN")
        return await ShotService._patch_shot(db, shot_id, req, user, review_only=True)

    @staticmethod
    async def _patch_shot(
        db: AsyncSession,
        shot_id: str,
        req: ShotPatch,
        user: User,
        *,
        review_only: bool = False,
    ) -> Shot:
        result = await db.execute(select(Shot).options(selectinload(Shot.panels)).where(Shot.id == shot_id, Shot.deleted_at.is_(None)).with_for_update().execution_options(populate_existing=True))
        shot = result.scalar_one_or_none()
        if not shot:
            raise NotFoundError("镜头不存在")

        if review_only:
            if shot.status != "review":
                raise DomainError("当前状态不允许执行审片决策", code="INVALID_REVIEW_TRANSITION")
        else:
            ShotService._require_write(user)

        if shot.revision != req.revision:
            raise ConflictError(
                message="该镜头已被其他用户修改，请刷新并核对最新版本。",
                details={
                    "server_revision": shot.revision,
                    "client_revision": req.revision
                }
            )

        changed_fields: list[str] = []
        for field, val in req.changes.items():
            if field in ShotService.PATCH_FIELDS:
                current_val = getattr(shot, field)
                if current_val != val:
                    setattr(shot, field, val)
                    changed_fields.append(field)

        if changed_fields:
            shot.revision += 1
            shot.updated_at = datetime.now(timezone.utc)
            ShotService._audit_shot_mutation(
                db,
                user_id=user.id,
                action="shot.patch",
                shot_id=shot.id,
                metadata={"changed_fields": changed_fields, "revision": shot.revision},
            )
            await db.flush()

        return shot

    @staticmethod
    async def trash_shot(db: AsyncSession, shot_id: str, user: User) -> bool:
        """Soft-delete an active shot. Already-missing/deleted shots stay idempotent."""
        ShotService._require_write(user)
        result = await db.execute(select(Shot).where(Shot.id == shot_id, Shot.deleted_at.is_(None)))
        shot = result.scalar_one_or_none()
        if not shot:
            return False

        shot.deleted_at = datetime.now(timezone.utc)
        shot.updated_at = shot.deleted_at
        shot.revision += 1
        ShotService._audit_shot_mutation(
            db,
            user_id=user.id,
            action="shot.trash",
            shot_id=shot.id,
            metadata={"revision": shot.revision},
        )
        await db.flush()
        return True

    @staticmethod
    async def restore_shot(db: AsyncSession, shot_id: str, user: User) -> Shot:
        """Restore a trashed shot and advance the authoritative revision exactly once."""
        ShotService._require_write(user)
        result = await db.execute(select(Shot).where(Shot.id == shot_id, Shot.deleted_at.is_not(None)))
        shot = result.scalar_one_or_none()
        if not shot:
            raise NotFoundError("镜头不在废纸篓中")

        shot.deleted_at = None
        shot.revision += 1
        shot.updated_at = datetime.now(timezone.utc)
        ShotService._audit_shot_mutation(
            db,
            user_id=user.id,
            action="shot.restore",
            shot_id=shot.id,
            metadata={"revision": shot.revision},
        )
        await db.flush()
        return shot

    @staticmethod
    async def purge_shot(db: AsyncSession, shot_id: str, user: User) -> bool:
        """Permanently delete a shot only when it is already in Trash."""
        ShotService._require_write(user)
        result = await db.execute(select(Shot).where(Shot.id == shot_id, Shot.deleted_at.is_not(None)))
        shot = result.scalar_one_or_none()
        if not shot:
            return False

        ShotService._audit_shot_mutation(
            db,
            user_id=user.id,
            action="shot.purge",
            shot_id=shot.id,
            metadata={"production_id": shot.production_id, "revision": shot.revision},
        )
        await db.delete(shot)
        await db.flush()
        from app.services.history_service import HistoryService
        await HistoryService.barrier(db, shot.production_id)
        return True

    @staticmethod
    async def bulk_trash_shots(
        db: AsyncSession,
        production_id: str,
        shot_ids: list[str],
        user: User,
    ) -> dict[str, int | bool]:
        """Idempotently move selected shots from one production into Trash.

        The full selection is scope-validated before mutation so a stale or
        cross-production selection cannot leave a partially deleted batch.
        """
        ShotService._require_write(user)
        unique_ids = list(dict.fromkeys(shot_ids))[:10000]
        if not unique_ids:
            raise DomainError("未选择镜头", code="VALIDATION_ERROR")

        result = await db.execute(select(Shot).where(Shot.id.in_(unique_ids)))
        shots = {shot.id: shot for shot in result.scalars().all()}

        missing_ids = [shot_id for shot_id in unique_ids if shot_id not in shots]
        foreign_ids = [
            shot_id for shot_id in unique_ids
            if shot_id in shots and shots[shot_id].production_id != production_id
        ]
        if missing_ids or foreign_ids:
            raise ConflictError(
                message="部分镜头不属于当前项目或已不存在，请刷新选择后重试。",
                details={
                    "missing_shot_ids": missing_ids,
                    "foreign_shot_ids": foreign_ids,
                },
            )

        now = datetime.now(timezone.utc)
        moved_count = 0
        already_trashed_count = 0
        for shot_id in unique_ids:
            shot = shots[shot_id]
            if shot.deleted_at is not None:
                already_trashed_count += 1
                continue
            shot.deleted_at = now
            shot.updated_at = now
            shot.revision += 1
            moved_count += 1
            ShotService._audit_shot_mutation(
                db,
                user_id=user.id,
                action="shot.trash",
                shot_id=shot.id,
                metadata={"revision": shot.revision, "bulk": True},
            )

        if moved_count:
            await db.flush()

        return {
            "ok": True,
            "moved_count": moved_count,
            "already_trashed_count": already_trashed_count,
        }

    @staticmethod
    async def reorder_shots(
        db: AsyncSession,
        req: ShotReorderRequest,
        user: User,
    ) -> dict[str, int | bool]:
        """Atomically reorder the complete active shot set for one production.

        Reorder is an editorial mutation. A stale or partial client must never
        silently renumber only part of the production, so the request carries
        both the complete target order and the exact base order the client saw.
        """

        ShotService._require_write(user)
        await db.execute(select(Production).where(Production.id == req.production_id).with_for_update())
        result = await db.execute(
            select(Shot).options(selectinload(Shot.panels), selectinload(Shot.steps)).where(
                Shot.production_id == req.production_id,
                Shot.deleted_at.is_(None),
            ).order_by(Shot.sort_index, Shot.id).with_for_update().execution_options(populate_existing=True)
        )
        active_shots = list(result.scalars().all())
        active_shots.sort(key=lambda shot: (shot.sort_index, shot.id))
        current_ids = [shot.id for shot in active_shots]

        target_items = list(req.items)
        target_ids = [item.id for item in target_items]

        if len(target_ids) != len(set(target_ids)):
            raise DomainError("镜头排序列表包含重复镜头", code="VALIDATION_ERROR")

        if req.base_order != current_ids:
            raise ConflictError(
                message="镜头顺序已被其他协作者调整，请同步后重试。",
                details={
                    "server_order": current_ids,
                    "client_base_order": req.base_order,
                },
            )

        if len(target_ids) != len(current_ids) or set(target_ids) != set(current_ids):
            raise ConflictError(
                message="镜头排序数据不完整或已过期，请刷新后重试。",
                details={
                    "server_order": current_ids,
                    "target_order": target_ids,
                },
            )

        shots = {shot.id: shot for shot in active_shots}
        for item in target_items:
            shot = shots[item.id]
            if shot.revision != item.revision:
                raise ConflictError(
                    message="排序列表包含已被其他用户更新的镜头，请刷新后重试。",
                    details={
                        "shot_id": item.id,
                        "server_revision": shot.revision,
                        "client_revision": item.revision,
                    },
                )

        reordered_count = 0
        unchanged_count = 0
        now = datetime.now(timezone.utc)

        # The target array is the order contract. Generate deterministic,
        # collision-free sort indexes instead of trusting client numeric hints.
        for index, item in enumerate(target_items):
            shot = shots[item.id]
            target_sort_index = float((index + 1) * 1000)
            target_number = f"{index + 1:03d}"
            if shot.sort_index == target_sort_index and shot.display_number == target_number:
                unchanged_count += 1
                continue

            previous_sort_index = shot.sort_index
            previous_number = shot.display_number
            shot.display_number = target_number
            shot.sort_index = target_sort_index
            shot.revision += 1
            shot.updated_at = now
            reordered_count += 1
            ShotService._audit_shot_mutation(
                db,
                user_id=user.id,
                action="shot.reorder",
                shot_id=shot.id,
                metadata={
                    "revision": shot.revision,
                    "previous_sort_index": previous_sort_index,
                    "previous_display_number": previous_number,
                    "display_number": target_number,
                    "sort_index": target_sort_index,
                },
            )

        if reordered_count:
            await db.flush()

        return {
            "ok": True,
            "reordered_count": reordered_count,
            "unchanged_count": unchanged_count,
        }

    @staticmethod
    async def bulk_update_shots(
        db: AsyncSession,
        req: BulkUpdateShotsRequest,
        user: User,
    ) -> dict[str, int | bool]:
        """Apply an atomic revision-aware bulk patch.

        Every selected shot must carry the revision the client actually read.
        All revisions are validated before any entity is mutated, so a stale
        row fails the whole request instead of partially applying a batch.
        """
        ShotService._require_write(user)
        shot_ids = list(dict.fromkeys(req.shot_ids))
        if not shot_ids:
            return {"ok": True, "updated_count": 0, "unchanged_count": 0}

        invalid_fields = sorted(set(req.updates) - ShotService.BULK_PATCH_FIELDS)
        if invalid_fields:
            raise DomainError(
                "存在不可批量修改的字段：" + "、".join(invalid_fields),
                code="VALIDATION_ERROR",
            )
        if not req.updates:
            raise DomainError("没有可应用的批量修改", code="VALIDATION_ERROR")

        missing_revision_ids = [sid for sid in shot_ids if sid not in req.revisions]
        if missing_revision_ids:
            raise DomainError(
                "批量修改缺少镜头版本信息，请刷新后重试。",
                code="BULK_REVISION_REQUIRED",
            )

        result = await db.execute(
            select(Shot).where(
                Shot.id.in_(shot_ids),
                Shot.deleted_at.is_(None),
            )
        )
        shots = {shot.id: shot for shot in result.scalars().all()}

        missing_shot_ids = [sid for sid in shot_ids if sid not in shots]
        if missing_shot_ids:
            raise NotFoundError("部分镜头不存在或已进入废纸篓，请刷新后重试。")

        # Validate the full batch before mutating any row.
        for sid in shot_ids:
            shot = shots[sid]
            client_revision = req.revisions[sid]
            if shot.revision != client_revision:
                raise ConflictError(
                    message="批量修改包含已被其他用户更新的镜头，请刷新并核对最新版本。",
                    details={
                        "shot_id": sid,
                        "server_revision": shot.revision,
                        "client_revision": client_revision,
                    },
                )

        updated_count = 0
        unchanged_count = 0
        now = datetime.now(timezone.utc)

        for sid in shot_ids:
            shot = shots[sid]
            changed_fields: list[str] = []
            for field, value in req.updates.items():
                if getattr(shot, field) != value:
                    setattr(shot, field, value)
                    changed_fields.append(field)

            if not changed_fields:
                unchanged_count += 1
                continue

            shot.revision += 1
            shot.updated_at = now
            updated_count += 1
            ShotService._audit_shot_mutation(
                db,
                user_id=user.id,
                action="shot.bulk_patch",
                shot_id=shot.id,
                metadata={
                    "changed_fields": changed_fields,
                    "revision": shot.revision,
                    "bulk": True,
                },
            )

        if updated_count:
            await db.flush()

        return {
            "ok": True,
            "updated_count": updated_count,
            "unchanged_count": unchanged_count,
        }


    @staticmethod
    async def relative_command(db, target_id, req, user):
        """One transaction for insert/clone/cut placement; no new persistence owner."""
        ShotService._require_write(user)
        target = (await db.execute(select(Shot).where(Shot.id == target_id, Shot.deleted_at.is_(None)))).scalar_one_or_none()
        if target is None: raise NotFoundError("镜头不存在")
        production = (await db.execute(select(Production).where(Production.id == target.production_id, Production.deleted_at.is_(None)).with_for_update())).scalar_one_or_none()
        if production is None: raise NotFoundError("项目不存在")
        active = list((await db.execute(select(Shot).options(selectinload(Shot.panels), selectinload(Shot.steps)).where(Shot.production_id == production.id, Shot.deleted_at.is_(None)).order_by(Shot.sort_index, Shot.id).with_for_update().execution_options(populate_existing=True))).scalars().all())
        ids = [s.id for s in active]
        if req.base_order != ids or any(req.revisions.get(s.id) != s.revision for s in active):
            raise ConflictError("镜头或顺序已变化，请刷新后重试。")
        by_id = {s.id: s for s in active}
        if len(req.source_ids) != len(set(req.source_ids)) or any(sid not in by_id for sid in req.source_ids):
            raise DomainError("剪贴板镜头不属于当前项目或已删除", code="VALIDATION_ERROR")
        sources = [s for s in active if s.id in req.source_ids]
        if req.action in {'insert_before', 'insert_after'} and sources:
            raise DomainError("插入新镜头不接受复制来源", code="VALIDATION_ERROR")
        if req.action in {'duplicate', 'paste', 'cut_paste'} and not sources:
            raise DomainError("剪贴板为空", code="VALIDATION_ERROR")
        if req.action == 'cut_paste' and target_id in req.source_ids:
            raise DomainError("不能在剪切镜头自身后粘贴", code="VALIDATION_ERROR")
        moving = []
        if req.action == 'cut_paste':
            moving = sources
        else:
            for source in sources or [None]:
                used = {s.display_number for s in active}
                n = 1
                while f"{n:03d}" in used: n += 1
                values = {field: getattr(source, field) for field in ShotCreate.model_fields if hasattr(source, field)} if source else {'name': '新镜头', 'duration_frames': max(1, round(3 * production.fps_num / (production.fps_den or 1)))}
                values['display_number'] = f"{n:03d}"
                new = await ShotService.create_shot(db, production.id, ShotCreate(**values), user)
                if source:
                    for field in ShotService.PATCH_FIELDS - set(ShotCreate.model_fields): setattr(new, field, getattr(source, field))
                    for panel in list(new.panels): await db.delete(panel)
                    new.panels.clear()
                    for panel in source.panels:
                        if panel.deleted_at is None:
                            new.panels.append(Panel(display_number=panel.display_number, sort_index=panel.sort_index, asset_id=panel.asset_id, duration_frames=panel.duration_frames, description=panel.description))
                    for step in source.steps:
                        if step.deleted_at is None:
                            db.add(ProductionStep(shot_id=new.id, **{key: getattr(step, key) for key in ['type','department','owner_id','status','sort_index','input_asset_id','output_asset_id','notes']}))
                    for link in (await db.execute(select(ShotAssetLink).where(ShotAssetLink.shot_id == source.id))).scalars().all():
                        db.add(ShotAssetLink(shot_id=new.id, asset_id=link.asset_id, role=link.role))
                    for value in (await db.execute(select(ShotColumnValue).where(ShotColumnValue.shot_id == source.id))).scalars().all():
                        db.add(ShotColumnValue(production_id=production.id, shot_id=new.id, column_id=value.column_id, value=value.value, updated_by=user.id))
                    ShotService._audit_shot_mutation(db, user_id=user.id, action='shot.clone', shot_id=new.id, metadata={'source_id': source.id})
                active.append(new); moving.append(new)
            await db.flush()
        moving_ids = [s.id for s in moving]
        remaining = [s.id for s in active if s.id not in moving_ids]
        position = remaining.index(target_id) + (0 if req.action == 'insert_before' else 1)
        order = remaining[:position] + moving_ids + remaining[position:]
        base = sorted(active, key=lambda s: (s.sort_index, s.id))
        revisions = {s.id: s.revision for s in active}
        reorder = ShotReorderRequest(production_id=production.id, base_order=[s.id for s in base], items=[{'id': sid, 'revision': revisions[sid], 'sort_index': (i+1)*1000} for i,sid in enumerate(order)])
        await ShotService.reorder_shots(db, reorder, user)
        return {'ok': True, 'shot_ids': moving_ids}

    @staticmethod
    async def auto_time_shot(db, shot_id, req, user):
        ShotService._require_write(user)
        shot = (await db.execute(select(Shot).where(Shot.id == shot_id, Shot.deleted_at.is_(None)))).scalar_one_or_none()
        if shot is None: raise NotFoundError("镜头不存在")
        if shot.timing_locked or not (shot.voice_over or "").strip():
            raise DomainError("镜头时长已锁定或没有旁白", code="VALIDATION_ERROR")
        production = (await db.execute(select(Production).where(Production.id == shot.production_id))).scalar_one()
        frames = estimate_narration_frames(shot.voice_over, production.fps_num / (production.fps_den or 1), req.speech_rate)
        return await ShotService.patch_shot(db, shot_id, ShotPatch(revision=req.revision, changes={'duration_frames': frames}), user)
