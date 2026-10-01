"""Map table rows to the canonical Shot creation command."""
from __future__ import annotations

from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DomainError, NotFoundError
from app.models.production import Production, Sequence
from app.models.shot import Shot
from app.models.user import User
from app.schemas.shot import ShotCreate
from app.services.shot_service import ShotService


class ImportService:
    @staticmethod
    async def commit_table_import(
        db: AsyncSession,
        production_id: str,
        *,
        rows: list[list[str]],
        mapping: dict[str, dict[str, Any]],
        sequence_id: str | None,
        user: User,
    ) -> dict[str, bool | int]:
        permissions = getattr(getattr(user, "role", None), "permissions", None) or {}
        if not (permissions.get("*") or permissions.get("shot.write")):
            raise DomainError("当前账号没有导入镜头的权限", code="FORBIDDEN")
        if any(type(info.get("col", -1)) is not int for info in mapping.values()):
            raise DomainError("导入字段的列号必须是整数", code="VALIDATION_ERROR")

        prod = (await db.execute(select(Production).where(
            Production.id == production_id, Production.deleted_at.is_(None),
        ))).scalar_one_or_none()
        if not prod:
            raise NotFoundError("项目不存在")
        fps = prod.fps_num / (prod.fps_den or 1)

        sequence_query = select(Sequence).where(Sequence.production_id == production_id)
        if sequence_id:
            sequence_query = sequence_query.where(Sequence.id == sequence_id)
        sequence = (await db.execute(sequence_query.limit(1))).scalar_one_or_none()
        if sequence_id and sequence is None:
            raise DomainError("导入篇章不属于当前项目", code="VALIDATION_ERROR")
        sequence_id = sequence.id if sequence else None

        current_sort = (await db.execute(
            select(func.coalesce(func.max(Shot.sort_index), 0.0)).where(Shot.production_id == production_id)
        )).scalar() or 0.0
        imported_count = 0
        for row in rows:
            if not any(cell.strip() for cell in row):
                continue
            values = {
                field: row[info.get("col", -1)].strip()
                if 0 <= info.get("col", -1) < len(row) else ""
                for field, info in mapping.items()
            }
            current_sort += 1000.0
            number = values.get("number") or f"{int(current_sort / 1000):03d}"

            duration = values.get("duration", "")
            frames = values.get("duration_frames", "")
            if frames and frames.isdigit():
                duration_frames = max(1, int(frames))
            elif duration:
                try:
                    seconds = float("".join(c for c in duration if c.isdigit() or c == "."))
                    duration_frames = max(1, int(round(seconds * fps)))
                except (ValueError, OverflowError):
                    duration_frames = 75
            else:
                duration_frames = 75

            method = (values.get("primary_method") or "live").lower()
            if method not in ("live", "stock", "client", "archive", "still", "ae", "mg", "three_d", "vfx", "type"):
                method = "live"
            lens = None
            if values.get("lens_mm"):
                try:
                    lens = float("".join(c for c in values["lens_mm"] if c.isdigit() or c == "."))
                except ValueError:
                    pass

            await ShotService.create_shot(db, production_id, ShotCreate(
                sequence_id=sequence_id,
                display_number=number,
                name=values.get("name") or f"镜头 {number}",
                description=values.get("description", ""),
                voice_over=values.get("voiceover", ""),
                camera_movement={"type": values.get("movement", "固定")},
                duration_frames=duration_frames,
                shot_size=values.get("shot_size", "全景"),
                lens_mm=lens,
                camera_angle=values.get("camera_angle", "平视"),
                primary_method=method,
                department=values.get("department", "camera"),
                owner_id=values.get("owner_id", ""),
                director_notes=values.get("director_notes", ""),
            ), user)
            imported_count += 1
        return {"ok": True, "imported_count": imported_count}
