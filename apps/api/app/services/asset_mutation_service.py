"""Revision-bound asset metadata and recoverable deletion commands."""
from datetime import datetime, timezone
import uuid
from app.core.exceptions import ConflictError, DomainError
from app.models.collaboration import AuditLog
from app.models.command import OutboxEvent
from app.models.production import Production
from sqlalchemy import select
from app.services.asset_service import AssetService
from app.services.image_asset_service import create_image_asset


class AssetMutationService:
    @staticmethod
    def check(asset, revision):
        if asset.revision != revision:
            raise ConflictError("素材已被修改，请刷新后重试", details={"server_revision": asset.revision})

    @staticmethod
    def event(db, asset, user, action, fields=()):
        db.add(AuditLog(user_id=user.id, action=action, entity_type="asset", entity_id=asset.id,
            metadata_json={"production_id": asset.production_id, "revision": asset.revision, "fields": list(fields)}))
        db.add(OutboxEvent(production_id=asset.production_id, command_id=str(uuid.uuid4()), event_type=action,
            revision=asset.revision, entity_ids={"asset_id": asset.id}))

    @staticmethod
    async def upload(db, production_id, data, filename, user, media_root):
        AssetService.permission(user, write=True)
        from app.core.exceptions import NotFoundError
        if (await db.execute(select(Production).where(Production.id == production_id,
            Production.deleted_at.is_(None)).with_for_update())).scalar_one_or_none() is None:
            raise NotFoundError("项目不存在")
        asset = await create_image_asset(db, production_id=production_id, data=data, filename=filename,
            user_id=user.id, media_root=media_root)
        AssetMutationService.event(db, asset, user, "asset.image.upload")
        await db.flush()
        return {"asset_id": asset.id, "revision": asset.revision, "width": asset.width, "height": asset.height,
            "has_thumbnail": True}

    @staticmethod
    async def update(db, production_id, asset_id, req, user):
        AssetService.permission(user, write=True)
        asset = await AssetService.asset(db, production_id, asset_id, lock=True)
        AssetMutationService.check(asset, req.revision)
        changed = []
        for field in ("display_name", "category"):
            value = getattr(req, field)
            if value is not None and value != getattr(asset, field):
                setattr(asset, field, value)
                changed.append(field)
        if changed:
            asset.revision += 1
            asset.updated_at = datetime.now(timezone.utc)
            AssetMutationService.event(db, asset, user, "asset.metadata.update", changed)
            await db.flush()
        return {"asset_id": asset.id, "revision": asset.revision, "changed": bool(changed)}

    @staticmethod
    async def delete_or_restore(db, production_id, asset_id, revision, user, *, restore=False):
        AssetService.permission(user, write=True)
        asset = await AssetService.asset(db, production_id, asset_id, lock=True, include_deleted=True)
        AssetMutationService.check(asset, revision)
        changed = (asset.deleted_at is not None) if restore else (asset.deleted_at is None)
        if changed:
            if not restore:
                references = await AssetService.references(db, production_id, asset_id)
                if references["reference_shot_count"] or references["reference_board_count"]:
                    raise DomainError("素材仍被镜头或画板历史使用，请先处理引用后删除", code="ASSET_IN_USE")
            asset.deleted_at = None if restore else datetime.now(timezone.utc)
            asset.revision += 1
            asset.updated_at = datetime.now(timezone.utc)
            AssetMutationService.event(db, asset, user, "asset.restore" if restore else "asset.delete")
            await db.flush()
        return {"asset_id": asset.id, "revision": asset.revision, "changed": changed, "deleted": asset.deleted_at is not None}
