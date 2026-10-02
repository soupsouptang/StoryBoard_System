"""Panel image storage and Shot/Asset persistence commands."""
from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError
from app.models.asset import ShotAssetLink
from app.models.collaboration import AuditLog
from app.models.shot import Panel, Shot
from app.models.production import Production
from app.services.image_asset_service import create_image_asset


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
    async def get_upload_shot(
        db: AsyncSession,
        *,
        shot_id: str,
        revision: int,
    ) -> Shot:
        scope = (await db.execute(select(Shot.production_id).where(Shot.id == shot_id, Shot.deleted_at.is_(None)))).scalar_one_or_none()
        if scope is None:
            raise NotFoundError("镜头不存在")
        if (await db.execute(select(Production.id).where(Production.id == scope,
            Production.deleted_at.is_(None)).with_for_update())).scalar_one_or_none() is None:
            raise NotFoundError("项目不存在")
        shot = (await db.execute(
            select(Shot).where(Shot.id == shot_id, Shot.deleted_at.is_(None))
            .with_for_update().execution_options(populate_existing=True)
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

        asset = await create_image_asset(db, production_id=shot.production_id, data=data, filename=filename,
            user_id=user_id, media_root=media_root, display_name=f"镜头 {shot.display_number} 分镜画面", asset_type="storyboard")
        asset_id = asset.id
        try:
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
            await db.flush()
        except BaseException:
            for key in (asset.storage_key, asset.proxy_storage_key):
                if key:
                    (media_root / key).unlink(missing_ok=True)
            raise
        return {"asset_id": asset_id, "revision": shot.revision}
