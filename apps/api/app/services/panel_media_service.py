"""Panel image storage and Shot/Asset persistence commands."""
from __future__ import annotations

import os
import hashlib
import uuid
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError
from app.models.asset import Asset, ShotAssetLink
from app.models.collaboration import AuditLog
from app.models.shot import Panel, Shot


MEDIA_ROOT = Path(os.environ.get("FRAMEFORGE_MEDIA_DIR", Path(__file__).resolve().parents[2] / "media"))

class ShotRevisionConflict(ConflictError):
    def __init__(self, server_revision: int, client_revision: int):
        super().__init__(
            message="镜头版本已变化，请刷新后重试",
            details={"server_revision": server_revision, "client_revision": client_revision},
        )
        self.code = "SHOT_REVISION_CONFLICT"


class PanelMediaService:
    @staticmethod
    def image_format(data: bytes) -> tuple[str, str] | None:
        if data.startswith(b"\x89PNG\r\n\x1a\n"):
            return "image/png", "png"
        if data.startswith(b"\xff\xd8\xff"):
            return "image/jpeg", "jpg"
        if data.startswith((b"GIF87a", b"GIF89a")):
            return "image/gif", "gif"
        if data.startswith(b"RIFF") and data[8:12] == b"WEBP":
            return "image/webp", "webp"
        return None

    @staticmethod
    async def get_upload_shot(
        db: AsyncSession,
        *,
        shot_id: str,
        revision: int,
    ) -> Shot:
        shot = (await db.execute(
            select(Shot).where(Shot.id == shot_id, Shot.deleted_at.is_(None))
        )).scalar_one_or_none()
        if shot is None:
            raise NotFoundError("镜头不存在")
        if shot.revision != revision:
            raise ShotRevisionConflict(shot.revision, revision)
        return shot

    @staticmethod
    async def save_panel_image(
        db: AsyncSession,
        *,
        shot: Shot,
        data: bytes,
        filename: str,
        mime_type: str,
        extension: str,
        user_id: str,
        media_root: Path,
        panel: Panel | None = None,
    ) -> dict[str, str | int]:
        shot_id = shot.id
        panel = panel or (await db.execute(
            select(Panel).where(Panel.shot_id == shot_id, Panel.deleted_at.is_(None))
            .order_by(Panel.sort_index, Panel.id).limit(1)
        )).scalar_one_or_none()
        if panel is None:
            panel = Panel(shot_id=shot_id, display_number="A", sort_index=1000.0)
            db.add(panel)

        asset_id = str(uuid.uuid4())
        storage_key = f"{asset_id}.{extension}"
        media_root.mkdir(parents=True, exist_ok=True)
        target = media_root / storage_key
        temporary = media_root / f".{asset_id}.tmp"
        try:
            temporary.write_bytes(data)
            temporary.replace(target)
            asset = Asset(
                id=asset_id,
                production_id=shot.production_id,
                filename=Path(filename or "panel-image").name[:255],
                display_name=f"镜头 {shot.display_number} 分镜画面",
                asset_type="storyboard",
                source_type="internal",
                storage_key=storage_key,
                mime_type=mime_type,
                file_size=len(data),
                hash_sha256=hashlib.sha256(data).hexdigest(),
                created_by=user_id,
            )
            db.add(asset)
            if getattr(panel, 'asset_id', None):
                await db.execute(delete(ShotAssetLink).where(
                    ShotAssetLink.shot_id == shot_id,
                    ShotAssetLink.role == "storyboard",
                    ShotAssetLink.asset_id == panel.asset_id,
                ))
            db.add(ShotAssetLink(shot_id=shot_id, asset_id=asset_id, role="storyboard"))
            panel.asset_id = asset_id
            shot.revision += 1
            shot.updated_at = datetime.now(timezone.utc)
            db.add(AuditLog(
                user_id=user_id,
                action="shot.panel_image",
                entity_type="shot",
                entity_id=shot_id,
                metadata_json={"asset_id": asset_id, "revision": shot.revision},
            ))
            db.info.setdefault("created_media_files", []).append(target)
            await db.flush()
        except Exception:
            temporary.unlink(missing_ok=True)
            target.unlink(missing_ok=True)
            raise
        return {"asset_id": asset_id, "revision": shot.revision}
