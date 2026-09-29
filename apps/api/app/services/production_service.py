"""Production reads and writes behind the canonical API transaction."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.core.exceptions import NotFoundError
from app.models.asset import Asset, ShotAssetLink
from app.models.collaboration import AuditLog
from app.models.production import Production
from app.models.shot import Shot
from app.schemas.production import ProductionCreate, ProductionUpdate


class ProductionService:
    @staticmethod
    def _audit(db: AsyncSession, user_id: str, action: str, production_id: str, metadata: dict) -> None:
        db.add(AuditLog(
            user_id=user_id,
            action=action,
            entity_type="production",
            entity_id=production_id,
            metadata_json=metadata,
        ))

    @staticmethod
    def _cover_media_id_query(production_id):
        cover_shot = aliased(Shot)
        cover_link = aliased(ShotAssetLink)
        cover_asset = aliased(Asset)
        return (
            select(cover_link.asset_id)
            .join(cover_shot, cover_shot.id == cover_link.shot_id)
            .join(cover_asset, cover_asset.id == cover_link.asset_id)
            .where(
                cover_shot.production_id == production_id,
                cover_shot.deleted_at.is_(None),
                cover_asset.deleted_at.is_(None),
                cover_asset.mime_type.like("image/%"),
            )
            .order_by(
                cover_shot.sort_index.asc(),
                cover_asset.created_at.asc(),
                cover_asset.id.asc(),
            )
            .limit(1)
        )

    @staticmethod
    async def list_productions(db: AsyncSession):
        result = await db.execute(
            select(
                Production,
                func.count(Shot.id).filter(Shot.deleted_at.is_(None)),
                func.coalesce(func.sum(Shot.duration_frames).filter(Shot.deleted_at.is_(None)), 0),
                ProductionService._cover_media_id_query(Production.id)
                .correlate(Production).scalar_subquery(),
            )
            .outerjoin(Shot, Shot.production_id == Production.id)
            .where(Production.deleted_at.is_(None))
            .group_by(Production.id)
            .order_by(Production.updated_at.desc())
        )
        return result.all()

    @staticmethod
    async def create_production(db: AsyncSession, req: ProductionCreate, user_id: str) -> Production:
        production = Production(
            name=req.name,
            code=req.code or req.name[:6].upper(),
            template_type=req.template_type,
            fps_num=req.fps_num,
            fps_den=req.fps_den,
            drop_frame=req.drop_frame,
            start_timecode_frames=req.start_timecode_frames,
            target_duration_frames=req.target_duration_frames,
            aspect_ratio=req.aspect_ratio,
            width=req.width,
            height=req.height,
            status="development",
            created_by=user_id,
        )
        db.add(production)
        await db.flush()
        ProductionService._audit(db, user_id, "production.create", production.id, {"name": production.name})
        return production

    @staticmethod
    async def _active_production(db: AsyncSession, production_id: str) -> Production:
        production = (await db.execute(
            select(Production).where(Production.id == production_id, Production.deleted_at.is_(None))
        )).scalar_one_or_none()
        if production is None:
            raise NotFoundError("项目不存在")
        return production

    @staticmethod
    async def get_production(db: AsyncSession, production_id: str):
        production = await ProductionService._active_production(db, production_id)
        count, duration = (await db.execute(
            select(func.count(Shot.id), func.coalesce(func.sum(Shot.duration_frames), 0))
            .where(Shot.production_id == production_id, Shot.deleted_at.is_(None))
        )).one()
        cover_media_id = (await db.execute(
            ProductionService._cover_media_id_query(production_id)
        )).scalar_one_or_none()
        return production, count, duration, cover_media_id

    @staticmethod
    async def update_production(db: AsyncSession, production_id: str, req: ProductionUpdate, user_id: str):
        production = await ProductionService._active_production(db, production_id)
        changes = {
            field: value for field, value in req.model_dump(exclude_unset=True).items()
            if getattr(production, field) != value
        }
        if changes:
            for field, value in changes.items():
                setattr(production, field, value)
            production.updated_at = datetime.now(timezone.utc)
            ProductionService._audit(
                db, user_id, "production.update", production.id, {"changed_fields": sorted(changes)}
            )
            await db.flush()
        cover_media_id = (await db.execute(
            ProductionService._cover_media_id_query(production_id)
        )).scalar_one_or_none()
        return production, cover_media_id

    @staticmethod
    async def delete_production(db: AsyncSession, production_id: str, user_id: str) -> None:
        production = (await db.execute(
            select(Production).where(Production.id == production_id, Production.deleted_at.is_(None))
        )).scalar_one_or_none()
        if production is not None:
            production.deleted_at = datetime.now(timezone.utc)
            ProductionService._audit(db, user_id, "production.delete", production.id, {})
            await db.flush()
