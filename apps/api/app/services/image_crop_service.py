"""Non-destructive presentation commands and authenticated source/history reads."""
from pathlib import Path
import uuid
from sqlalchemy import select
from starlette.concurrency import run_in_threadpool
from app.core.exceptions import ConflictError, DomainError, NotFoundError
from app.models.asset import AssetVersion
from app.models.collaboration import AuditLog
from app.models.command import OutboxEvent
from app.models.media import MediaPresentation
from app.models.shot import Panel, Shot
from app.schemas.image_crop import MediaTransform
from app.services.asset_mutation_service import AssetMutationService
from app.services.asset_service import AssetService
from app.services.image_framing import render_crop


def media_path(media_root, storage_key):
    root = Path(media_root).resolve()
    path = (root / storage_key).resolve()
    if not path.is_relative_to(root) or not path.is_file():
        raise NotFoundError("图片文件不存在")
    return path


class ImageCropService:
    @staticmethod
    async def owner(db, production_id, asset_id, owner_type="asset", owner_id=None):
        owner_id = owner_id or (asset_id if owner_type == "asset" else production_id if owner_type == "production" else "")
        valid = owner_type == "asset" and owner_id == asset_id or owner_type == "production" and owner_id == production_id
        if owner_type == "panel":
            valid = await db.scalar(select(Panel.id).join(Shot, Panel.shot_id == Shot.id).where(
                Panel.id == owner_id, Panel.asset_id == asset_id, Panel.deleted_at.is_(None),
                Shot.production_id == production_id, Shot.deleted_at.is_(None))) is not None
        if not valid:
            raise DomainError("图片使用位置不属于当前项目或素材", code="INVALID_MEDIA_OWNER")
        return owner_id

    @staticmethod
    async def current(db, production_id, owner_type, owner_id, revision=None):
        query = select(MediaPresentation).where(MediaPresentation.production_id == production_id,
            MediaPresentation.owner_type == owner_type, MediaPresentation.owner_id == owner_id)
        if revision is not None:
            query = query.where(MediaPresentation.revision == revision)
        return (await db.execute(query.order_by(MediaPresentation.revision.desc()).limit(1))).scalar_one_or_none()

    @staticmethod
    async def presentation(db, production_id, asset_id, user, owner_type="asset", owner_id=None):
        AssetService.permission(user)
        asset = await AssetService.asset(db, production_id, asset_id)
        owner_id = await ImageCropService.owner(db, production_id, asset.id, owner_type, owner_id)
        row = await ImageCropService.current(db, production_id, owner_type, owner_id)
        if row and row.asset_id == asset_id:
            return {"revision": row.revision, "source_version_id": row.source_version_id, "transform": row.transform}
        source = (await db.execute(select(AssetVersion).where(AssetVersion.asset_id == asset.id,
            AssetVersion.storage_key == asset.storage_key).order_by(AssetVersion.version_number.desc()).limit(1))).scalar_one_or_none()
        if source is None:
            raise NotFoundError("原图版本不存在")
        return {"revision": row.revision if row else 0, "source_version_id": source.id,
            "transform": MediaTransform(crop={"x": 0, "y": 0, "width": 1, "height": 1}).model_dump()}

    @staticmethod
    async def version(db, asset_id, version_id):
        row = (await db.execute(select(AssetVersion).where(AssetVersion.id == version_id,
            AssetVersion.asset_id == asset_id))).scalar_one_or_none()
        if row is None:
            raise NotFoundError("图片版本不存在")
        return row

    @staticmethod
    async def versions(db, production_id, asset_id, user):
        AssetService.permission(user)
        asset = await AssetService.asset(db, production_id, asset_id)
        rows = (await db.execute(select(AssetVersion).where(AssetVersion.asset_id == asset_id)
            .order_by(AssetVersion.version_number))).scalars()
        return [{"id": row.id, "version_number": row.version_number,
            "width": row.metadata_json.get("width"), "height": row.metadata_json.get("height"),
            "rotation": row.metadata_json.get("rotation", 0), "aspect_ratio": row.metadata_json.get("aspect_ratio"),
            "crop": row.metadata_json.get("crop"), "current": row.storage_key == asset.storage_key} for row in rows]

    @staticmethod
    async def source(db, production_id, asset_id, version_id, user, media_root):
        AssetService.permission(user)
        await AssetService.asset(db, production_id, asset_id)
        version = await ImageCropService.version(db, asset_id, version_id)
        return media_path(media_root, version.storage_key), version.mime_type, version.hash_sha256

    @staticmethod
    async def crop(db, production_id, asset_id, req, user, media_root):
        AssetService.permission(user, write=True)
        asset = await AssetService.asset(db, production_id, asset_id, lock=True)
        AssetMutationService.check(asset, req.revision)
        owner_id = await ImageCropService.owner(db, production_id, asset.id, req.owner_type, req.owner_id)
        current = await ImageCropService.current(db, production_id, req.owner_type, owner_id)
        revision = current.revision if current else 0
        if revision != req.presentation_revision:
            error = ConflictError("图片构图已变化，请保留草稿并读取最新版本。", details={"server_revision": revision})
            error.code = "PRESENTATION_REVISION_CONFLICT"
            raise error
        version = await ImageCropService.version(db, asset_id, req.source_version_id)
        original = media_path(media_root, version.storage_key)
        transform = MediaTransform.model_validate(req.model_dump(include=set(MediaTransform.model_fields))).model_dump()
        if current and current.source_version_id == version.id and current.transform == transform:
            return {"asset_id": asset.id, "revision": asset.revision, "version_id": version.id,
                "presentation_revision": revision, "changed": False}
        source_data = await run_in_threadpool(original.read_bytes)
        # Validate the actual rendering before acknowledging any state. Derivatives
        # are reproducible responses; they never become another source AssetVersion.
        await run_in_threadpool(render_crop, source_data, MediaTransform.model_validate(transform))
        row = MediaPresentation(production_id=production_id, asset_id=asset.id, source_version_id=version.id,
            owner_type=req.owner_type, owner_id=owner_id, revision=revision+1, transform=transform, created_by=user.id)
        db.add(row)
        await db.flush()
        identity = {"asset_id": asset.id, "presentation_id": row.id, "owner_type": req.owner_type,
            "owner_id": owner_id, "presentation_revision": row.revision}
        db.add(AuditLog(user_id=user.id, action="media.presentation.edit", entity_type="media_presentation",
            entity_id=row.id, metadata_json=identity))
        db.add(OutboxEvent(production_id=production_id, command_id=str(uuid.uuid4()),
            event_type="media.presentation.edit", revision=row.revision, entity_ids=identity))
        await db.flush()
        return {"asset_id": asset.id, "revision": asset.revision, "version_id": version.id,
            "presentation_revision": row.revision, "changed": True}

    @staticmethod
    async def rendered(db, asset, media_root, *, owner_type="asset", owner_id=None, revision=None, thumbnail=False):
        owner_id = await ImageCropService.owner(db, asset.production_id, asset.id, owner_type, owner_id)
        row = await ImageCropService.current(db, asset.production_id, owner_type, owner_id, revision)
        if revision not in (None, 0) and row is None:
            raise NotFoundError("构图版本不存在")
        if revision is None and row and row.asset_id != asset.id:
            row = None  # Replacing a Panel's source starts with the new original.
        if row is None and owner_type == "panel" and revision is None:
            row = await ImageCropService.current(db, asset.production_id, "asset", asset.id)
        if row is None:
            return media_path(media_root, asset.proxy_storage_key if thumbnail and asset.proxy_storage_key else asset.storage_key), \
                "image/webp" if thumbnail and asset.proxy_storage_key else asset.mime_type, asset.hash_sha256
        version = await ImageCropService.version(db, row.asset_id, row.source_version_id)
        source = await run_in_threadpool(media_path(media_root, version.storage_key).read_bytes)
        transform = MediaTransform.model_validate(row.transform)
        if thumbnail:
            transform.output_width = 384
        data = await run_in_threadpool(render_crop, source, transform)
        return data, "image/webp", f"{version.hash_sha256}:{row.id}:{row.revision}:{transform.output_width}"
