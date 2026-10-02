"""One upload owner shared by the asset library and storyboard panels."""
from pathlib import Path
import uuid
from starlette.concurrency import run_in_threadpool
from app.models.asset import Asset, AssetVersion
from app.services.image_storage import prepare_image, store_image


async def create_image_asset(db, *, production_id: str, data: bytes, filename: str, user_id: str,
    media_root: Path, display_name: str | None = None, asset_type="image") -> Asset:
    image = await run_in_threadpool(prepare_image, data)
    identity = str(uuid.uuid4())
    storage_key, proxy_key, paths = await run_in_threadpool(store_image, media_root, identity, data, image)
    db.info.setdefault("created_media_files", []).extend(paths)
    safe_name = Path(filename.replace("\\", "/")).name[:255] or f"image.{image.extension}"
    asset = Asset(id=identity, production_id=production_id, filename=safe_name,
        display_name=display_name or safe_name, asset_type=asset_type, source_type="internal",
        storage_key=storage_key, proxy_storage_key=proxy_key, mime_type=image.mime_type,
        width=image.width, height=image.height, file_size=len(data), hash_sha256=image.digest, created_by=user_id)
    try:
        db.add(asset)
        await db.flush()
        db.add(AssetVersion(asset_id=identity, version_number=1, storage_key=storage_key,
            mime_type=image.mime_type, file_size=len(data), hash_sha256=image.digest,
            metadata_json={"width": image.width, "height": image.height}, created_by=user_id))
        await db.flush()
    except BaseException:
        for path in paths:
            path.unlink(missing_ok=True)
        raise
    return asset
