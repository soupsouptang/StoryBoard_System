import uuid
from datetime import datetime, timezone
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.exceptions import DomainError, NotFoundError, ConflictError
from app.models.production import Production
from app.models.shot import Panel, Shot
from app.schemas.shot import BulkUpdateShotsRequest, ShotCreate, ShotPatch

class ShotService:
    # Patchable shot data only. Identity, ownership, revision, timestamps,
    # deletion and ordering are managed by their dedicated commands.
    PATCH_FIELDS = frozenset({
        "sequence_id", "scene_id", "display_number", "name", "description",
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
    async def create_shot(db: AsyncSession, production_id: str, req: ShotCreate, user_id: str) -> Shot:
        p_res = await db.execute(select(Production).where(Production.id == production_id, Production.deleted_at.is_(None)))
        if not p_res.scalar_one_or_none():
            raise NotFoundError("项目不存在")

        max_res = await db.execute(
            select(func.coalesce(func.max(Shot.sort_index), 0.0)).where(Shot.production_id == production_id)
        )
        max_sort = max_res.scalar() or 0.0
        new_sort = max_sort + 1000.0

        sid = str(uuid.uuid4())
        shot = Shot(
            id=sid,
            production_id=production_id,
            sequence_id=req.sequence_id,
            scene_id=req.scene_id,
            display_number=req.display_number,
            sort_index=new_sort,
            name=req.name,
            description=req.description,
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
            created_by=user_id
        )
        db.add(shot)

        panel = Panel(
            id=str(uuid.uuid4()),
            shot_id=sid,
            display_number="A",
            sort_index=1000.0,
            duration_frames=req.duration_frames
        )
        db.add(panel)
        await db.flush()
        return shot

    @staticmethod
    async def patch_shot(db: AsyncSession, shot_id: str, req: ShotPatch, user_id: str) -> Shot:
        result = await db.execute(select(Shot).where(Shot.id == shot_id, Shot.deleted_at.is_(None)))
        shot = result.scalar_one_or_none()
        if not shot:
            raise NotFoundError("镜头不存在")

        if shot.revision != req.revision:
            raise ConflictError(
                message="该镜头已被其他用户修改，请刷新并核对最新版本。",
                details={
                    "server_revision": shot.revision,
                    "client_revision": req.revision
                }
            )

        changed = False
        for field, val in req.changes.items():
            if field in ShotService.PATCH_FIELDS:
                current_val = getattr(shot, field)
                if current_val != val:
                    setattr(shot, field, val)
                    changed = True

        if changed:
            shot.revision += 1
            shot.updated_at = datetime.now(timezone.utc)
            await db.flush()

        return shot

    @staticmethod
    async def trash_shot(db: AsyncSession, shot_id: str, user_id: str) -> bool:
        """Soft-delete an active shot. Already-missing/deleted shots stay idempotent."""
        result = await db.execute(select(Shot).where(Shot.id == shot_id, Shot.deleted_at.is_(None)))
        shot = result.scalar_one_or_none()
        if not shot:
            return False

        shot.deleted_at = datetime.now(timezone.utc)
        shot.updated_at = shot.deleted_at
        await db.flush()
        return True

    @staticmethod
    async def restore_shot(db: AsyncSession, shot_id: str, user_id: str) -> Shot:
        """Restore a trashed shot and advance the authoritative revision exactly once."""
        result = await db.execute(select(Shot).where(Shot.id == shot_id, Shot.deleted_at.is_not(None)))
        shot = result.scalar_one_or_none()
        if not shot:
            raise NotFoundError("镜头不在废纸篓中")

        shot.deleted_at = None
        shot.revision += 1
        shot.updated_at = datetime.now(timezone.utc)
        await db.flush()
        return shot

    @staticmethod
    async def purge_shot(db: AsyncSession, shot_id: str, user_id: str) -> bool:
        """Permanently delete a shot only when it is already in Trash."""
        result = await db.execute(select(Shot).where(Shot.id == shot_id, Shot.deleted_at.is_not(None)))
        shot = result.scalar_one_or_none()
        if not shot:
            return False

        await db.delete(shot)
        await db.flush()
        return True

    @staticmethod
    async def bulk_update_shots(
        db: AsyncSession,
        req: BulkUpdateShotsRequest,
        user_id: str,
    ) -> dict[str, int | bool]:
        """Apply an atomic revision-aware bulk patch.

        Every selected shot must carry the revision the client actually read.
        All revisions are validated before any entity is mutated, so a stale
        row fails the whole request instead of partially applying a batch.
        """
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
            changed = False
            for field, value in req.updates.items():
                if getattr(shot, field) != value:
                    setattr(shot, field, value)
                    changed = True

            if not changed:
                unchanged_count += 1
                continue

            shot.revision += 1
            shot.updated_at = now
            updated_count += 1

        if updated_count:
            await db.flush()

        return {
            "ok": True,
            "updated_count": updated_count,
            "unchanged_count": unchanged_count,
        }
