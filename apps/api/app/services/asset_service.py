"""Read-only production-scoped asset queries."""
from __future__ import annotations

from sqlalchemy import func, select, union
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.asset import Asset, ShotAssetLink
from app.models.production import Production
from app.models.shot import Panel, Shot


class AssetService:
    @staticmethod
    async def list_production_assets(db: AsyncSession, production_id: str) -> list[dict]:
        exists = await db.scalar(
            select(Production.id).where(
                Production.id == production_id,
                Production.deleted_at.is_(None),
            )
        )
        if exists is None:
            raise NotFoundError("项目不存在")

        linked_shots = union(
            select(ShotAssetLink.asset_id.label("asset_id"), Shot.id.label("shot_id"))
            .join(Shot, Shot.id == ShotAssetLink.shot_id)
            .where(
                Shot.production_id == production_id,
                Shot.deleted_at.is_(None),
            ),
            select(Panel.asset_id.label("asset_id"), Shot.id.label("shot_id"))
            .join(Shot, Shot.id == Panel.shot_id)
            .where(
                Panel.asset_id.is_not(None),
                Panel.deleted_at.is_(None),
                Shot.production_id == production_id,
                Shot.deleted_at.is_(None),
            ),
        ).subquery()
        reference_counts = (
            select(
                linked_shots.c.asset_id,
                func.count(func.distinct(linked_shots.c.shot_id)).label("reference_shot_count"),
            )
            .group_by(linked_shots.c.asset_id)
            .subquery()
        )
        rows = await db.execute(
            select(
                Asset,
                func.coalesce(reference_counts.c.reference_shot_count, 0).label("reference_shot_count"),
            )
            .outerjoin(reference_counts, reference_counts.c.asset_id == Asset.id)
            .where(
                Asset.production_id == production_id,
                Asset.deleted_at.is_(None),
            )
            .order_by(Asset.created_at.desc(), Asset.id)
        )
        return [
            {
                "id": asset.id,
                "production_id": asset.production_id,
                "filename": asset.filename,
                "display_name": asset.display_name,
                "asset_type": asset.asset_type,
                "source_type": asset.source_type,
                "mime_type": asset.mime_type,
                "width": asset.width,
                "height": asset.height,
                "file_size": asset.file_size,
                "hash_sha256": asset.hash_sha256,
                "rights_status": asset.rights_status,
                "created_at": asset.created_at,
                "reference_shot_count": reference_count,
            }
            for asset, reference_count in rows.all()
        ]
