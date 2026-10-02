"""Versioned asset crop commands and authenticated immutable-source reads."""
from pathlib import Path
from datetime import datetime, timezone
import uuid
from sqlalchemy import func, select
from starlette.concurrency import run_in_threadpool
from app.core.exceptions import NotFoundError
from app.models.asset import AssetVersion
from app.services.asset_mutation_service import AssetMutationService
from app.services.asset_service import AssetService
from app.services.image_framing import render_crop
from app.services.image_storage import prepare_image, store_image


def media_path(media_root, storage_key):
    root = Path(media_root).resolve()
    path = (root / storage_key).resolve()
    if not path.is_relative_to(root) or not path.is_file():
        raise NotFoundError("图片文件不存在")
    return path


class ImageCropService:
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
        version = await ImageCropService.version(db, asset_id, req.source_version_id)
        original = media_path(media_root, version.storage_key)
        source_data = await run_in_threadpool(original.read_bytes)
        rendered = await run_in_threadpool(render_crop, source_data, req)
        prepared = await run_in_threadpool(prepare_image, rendered)
        identity = str(uuid.uuid4())
        storage_key, proxy_key, paths = await run_in_threadpool(store_image, Path(media_root), identity, rendered, prepared)
        db.info.setdefault("created_media_files", []).extend(paths)
        try:
            number = (await db.scalar(select(func.coalesce(func.max(AssetVersion.version_number), 0))
                .where(AssetVersion.asset_id == asset.id))) + 1
            row = AssetVersion(asset_id=asset.id, version_number=number, storage_key=storage_key,
                mime_type=prepared.mime_type, file_size=len(rendered), hash_sha256=prepared.digest, created_by=user.id,
                metadata_json={"source_version_id": version.id, "crop": req.crop.model_dump(),
                    "rotation": req.rotation, "aspect_ratio": req.aspect_ratio, "width": prepared.width, "height": prepared.height})
            db.add(row)
            asset.storage_key, asset.proxy_storage_key = storage_key, proxy_key
            asset.mime_type, asset.file_size, asset.hash_sha256 = prepared.mime_type, len(rendered), prepared.digest
            asset.width, asset.height = prepared.width, prepared.height
            asset.revision += 1
            asset.updated_at = datetime.now(timezone.utc)
            AssetMutationService.event(db, asset, user, "asset.image.crop")
            await db.flush()
        except BaseException:
            for path in paths:
                path.unlink(missing_ok=True)
            raise
        return {"asset_id": asset.id, "revision": asset.revision, "version_id": row.id,
            "width": asset.width, "height": asset.height}
